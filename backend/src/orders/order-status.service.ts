import { BadRequestException, Injectable } from '@nestjs/common';
import type { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryRepository } from '../inventory/inventory.repository';
import { CouponsService } from '../coupons/coupons.service';
import { OrderEmailsService } from '../mail/order-emails.service';

type Tx = Prisma.TransactionClient;

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

const STOCK_RESTORABLE_FROM: OrderStatus[] = ['PENDING', 'PROCESSING'];
const TERMINAL: OrderStatus[] = ['CANCELLED', 'REFUNDED'];
const PROGRESS: OrderStatus[] = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

/**
 * A checkout's status, derived from its shops' sub-orders: the least advanced
 * live sub-order (so "shipped" means everything has shipped); refunded or
 * cancelled once nothing is live.
 */
export function deriveOrderStatus(statuses: OrderStatus[]): OrderStatus {
  const live = statuses.filter((s) => !TERMINAL.includes(s));
  if (live.length === 0) {
    return statuses.includes('REFUNDED') ? 'REFUNDED' : statuses.length ? 'CANCELLED' : 'PENDING';
  }
  return live.reduce((least, s) => (PROGRESS.indexOf(s) < PROGRESS.indexOf(least) ? s : least));
}

const round = (n: number) => Math.round(n * 100) / 100;

/**
 * Every order status change goes through here, so a checkout's sub-orders,
 * its derived status, stock, coupon and payment always agree.
 */
@Injectable()
export class OrderStatusService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly couponsService: CouponsService,
    private readonly orderEmails: OrderEmailsService,
  ) {}

  /** Moves one shop's sub-order. Cancelling restocks just its items. */
  async setVendorOrderStatus(vendorOrderId: string, target: OrderStatus, tx?: Tx) {
    const run = async (client: Tx) => {
      const vendorOrder = await client.vendorOrder.findUnique({
        where: { id: vendorOrderId },
        include: { items: true },
      });
      if (!vendorOrder) {
        throw new BadRequestException({ message: `Sub-order ${vendorOrderId} was not found` });
      }
      if (vendorOrder.status === target) return vendorOrder.orderId;

      if (!ALLOWED_TRANSITIONS[vendorOrder.status].includes(target)) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { status: `Cannot transition order from ${vendorOrder.status} to ${target}` },
        });
      }

      // Atomic claim: a concurrent update of the same sub-order loses here,
      // so stock is restored once.
      const claimed = await client.vendorOrder.updateMany({
        where: { id: vendorOrderId, status: vendorOrder.status },
        data: { status: target },
      });
      if (claimed.count === 0) {
        throw new BadRequestException({ message: 'This order changed meanwhile — reload and retry' });
      }

      if (target === 'CANCELLED' && STOCK_RESTORABLE_FROM.includes(vendorOrder.status)) {
        for (const item of vendorOrder.items) {
          await this.inventoryRepository.restoreStock(item.productId, item.quantity, client);
        }
        await this.recordRefund(vendorOrder.orderId, Number(vendorOrder.total), client);
      }
      if (target === 'REFUNDED') {
        await this.recordRefund(vendorOrder.orderId, Number(vendorOrder.total), client);
      }

      await this.recompute(vendorOrder.orderId, client);
      return vendorOrder.orderId;
    };

    const orderId = tx ? await run(tx) : await this.prisma.$transaction(run);
    if (target === 'SHIPPED') void this.orderEmails.orderShipped(orderId).catch(() => undefined);
    return orderId;
  }

  /**
   * Moves a whole checkout (the admin's order screen, payment refunds, shipments):
   * every live sub-order that can make the move does; finished ones are left alone.
   */
  async setOrderStatus(orderId: string, target: OrderStatus, tx?: Tx) {
    const run = async (client: Tx) => {
      const order = await client.order.findUnique({
        where: { id: orderId },
        include: { vendorOrders: true },
      });
      if (!order) throw new BadRequestException({ message: `Order ${orderId} was not found` });

      if (order.status !== target && !ALLOWED_TRANSITIONS[order.status].includes(target)) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { status: `Cannot transition order from ${order.status} to ${target}` },
        });
      }

      for (const vo of order.vendorOrders) {
        if (vo.status !== target && ALLOWED_TRANSITIONS[vo.status].includes(target)) {
          await this.setVendorOrderStatus(vo.id, target, client);
        }
      }
      await this.recompute(orderId, client);
    };

    if (tx) await run(tx);
    else await this.prisma.$transaction(run);
  }

  /** Payment settled: every pending sub-order is released into fulfilment. */
  async markPaid(orderId: string, tx: Tx) {
    await tx.vendorOrder.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'PROCESSING' },
    });
    return this.recompute(orderId, tx);
  }

  /**
   * The whole payment was refunded. Unshipped sub-orders are cancelled
   * (restocking); shipped or delivered ones are marked refunded.
   */
  async markRefunded(orderId: string, tx: Tx) {
    const vendorOrders = await tx.vendorOrder.findMany({ where: { orderId } });
    for (const vo of vendorOrders) {
      if (STOCK_RESTORABLE_FROM.includes(vo.status)) {
        await this.setVendorOrderStatus(vo.id, 'CANCELLED', tx);
      } else if (vo.status === 'SHIPPED' || vo.status === 'DELIVERED') {
        await tx.vendorOrder.update({ where: { id: vo.id }, data: { status: 'REFUNDED' } });
      }
    }
    await tx.payment.updateMany({
      where: { orderId, status: { in: ['PAID', 'PENDING'] } },
      data: { status: 'REFUNDED' },
    });
    await tx.$executeRaw`UPDATE "Payment" SET "refundedAmount" = "amount" WHERE "orderId" = ${orderId} AND "status" = 'REFUNDED'`;
    return this.recompute(orderId, tx);
  }

  /** Re-derives the checkout's status; releases its coupon once it is fully cancelled. */
  async recompute(orderId: string, tx: Tx): Promise<OrderStatus> {
    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { vendorOrders: { select: { status: true } } },
    });
    const next = deriveOrderStatus(order.vendorOrders.map((v) => v.status));

    if (next !== order.status) {
      await tx.order.update({ where: { id: orderId }, data: { status: next } });
      if (next === 'CANCELLED' && order.couponId) {
        await this.couponsService.release(order.couponId, tx);
      }
      if (next === 'DELIVERED') await this.settleCashOnDelivery(orderId, tx);
    }
    return next;
  }

  /**
   * Cash on delivery is collected by the courier: once every live part of the
   * checkout is delivered, the payment is settled for what was actually
   * handed over (cancelled shops' share was never collected). That is what
   * makes the shops' earnings payable.
   */
  private async settleCashOnDelivery(orderId: string, tx: Tx) {
    const payment = await tx.payment.findUnique({ where: { orderId } });
    if (!payment || payment.provider !== 'cod' || payment.status !== 'PENDING') return;

    const delivered = await tx.vendorOrder.aggregate({
      where: { orderId, status: 'DELIVERED' },
      _sum: { total: true },
    });
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        amount: round(Number(delivered._sum.total ?? payment.amount)),
      },
    });
  }

  /**
   * A paid checkout lost part of its value (a shop cancelled or refunded its
   * share): record it against the payment and flag the refund to staff.
   * Unpaid checkouts have nothing to refund.
   */
  private async recordRefund(orderId: string, amount: number, tx: Tx) {
    const payment = await tx.payment.findUnique({ where: { orderId } });
    if (!payment || payment.status !== 'PAID' || amount <= 0) return;

    const refunded = round(Math.min(Number(payment.amount), Number(payment.refundedAmount) + amount));
    const fully = refunded >= Number(payment.amount);
    await tx.payment.update({
      where: { id: payment.id },
      data: { refundedAmount: refunded, ...(fully ? { status: 'REFUNDED' } : {}) },
    });

    const order = await tx.order.findUnique({ where: { id: orderId }, select: { orderNumber: true } });
    await tx.notification.create({
      data: {
        title: `Refund due: $${amount.toFixed(2)} on ${order?.orderNumber ?? orderId}`,
        body: `Part of a paid order was cancelled or refunded. Issue $${amount.toFixed(2)} back to the customer through the payment provider (${payment.provider}).`,
        severity: 'WARNING',
        meta: 'Payments',
      },
    });
  }
}
