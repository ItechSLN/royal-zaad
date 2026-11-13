import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  CreateOrdersDto,
  QuoteOrderDto,
  UpdateOrdersDto,
} from './dto/orders.dto';
import type { OrdersEntity } from './entities/orders.entity';
import { OrdersRepository } from './orders.repository';
import { OrderPricingService } from './order-pricing.service';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { InventoryRepository } from '../inventory/inventory.repository';
import { OrderEmailsService } from '../mail/order-emails.service';
import { OrderStatusService } from './order-status.service';
import { isStaffUser } from '../auth/roles.constants';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';


@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
    private readonly inventoryRepository: InventoryRepository,
    private readonly pricing: OrderPricingService,
    private readonly orderEmails: OrderEmailsService,
    private readonly orderStatus: OrderStatusService,
  ) {}

  async findAll(
    query: PaginationQueryDto,
  ): Promise<{ data: OrdersEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.ordersRepository.findAll(page, limit);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<OrdersEntity> {
    const order = await this.ordersRepository.findById(id);

    if (!order) {
      throw new NotFoundException(`Order ${id} was not found.`);
    }

    return order;
  }

  async findAllForCustomer(
    currentUser: AuthenticatedUser,
    query: PaginationQueryDto,
  ): Promise<{ data: OrdersEntity[]; meta: any }> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: currentUser.id },
    });
    if (!customer) {
      throw new BadRequestException({
        message: 'No customer profile is linked to this account',
      });
    }

    const { page, limit } = query;
    const { data, total } = await this.ordersRepository.findAllByCustomer(
      customer.id,
      page,
      limit,
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOneForCustomer(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<OrdersEntity> {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: currentUser.id },
    });
    const order = await this.findOne(id);

    if (!customer || order.customerId !== customer.id) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async create(
    data: CreateOrdersDto,
    currentUser?: AuthenticatedUser | null,
  ): Promise<OrdersEntity> {
    // Customers order for themselves; staff raise orders for the customer they
    // pick. Anonymous callers can't place orders at all.
    if (!currentUser) {
      throw new UnauthorizedException({ message: 'Sign in to place an order' });
    }
    const raisedByStaff = isStaffUser(currentUser);

    // A retried submission (double click, network retry) returns the order
    // the first attempt created instead of charging twice.
    if (data.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(data, currentUser, raisedByStaff);
      if (existing) return existing;
    }

    let orderId: string;
    try {
      orderId = await this.prisma.$transaction(async (tx) => {
        const customer = raisedByStaff
          ? data.customerId
            ? await tx.customer.findUnique({ where: { id: data.customerId } })
            : null
          : await tx.customer.findUnique({ where: { userId: currentUser.id } });

        if (!customer) {
          throw new BadRequestException({
            message: 'Validation failed',
            errors: {
              customerId: raisedByStaff
                ? 'Customer not found'
                : 'No customer profile is linked to this account',
            },
          });
        }

        // A storefront order ships somewhere, and the destination sets the tax.
        if (!raisedByStaff && !data.shippingAddressId) {
          throw new BadRequestException({
            message: 'Validation failed',
            errors: { shippingAddressId: 'A shipping address is required' },
          });
        }

        const address = data.shippingAddressId
          ? await this.addressFor(data.shippingAddressId, customer.id, tx)
          : null;

        const pricing = await this.pricing.price(
          {
            items: data.items,
            couponCode: data.couponCode,
            address,
            fulfillment: data.fulfillment,
          },
          tx,
        );

        for (const line of pricing.lines) {
          const stockReserved = await this.inventoryRepository.decrementStock(
            line.productId,
            line.quantity,
            tx,
          );
          if (!stockReserved) {
            throw new BadRequestException({
              message: 'Validation failed',
              errors: { items: `Insufficient stock for ${line.name}` },
            });
          }
        }

        const { couponId, subtotal, discountTotal, taxTotal, shippingTotal, total } =
          pricing;

        const order = await this.ordersRepository.create(
          {
            orderNumber: this.generateOrderNumber(),
            customerId: customer.id,
            couponId,
            shippingAddressId: data.shippingAddressId,
            channel: data.channel ?? (raisedByStaff ? 'POS' : 'WEB'),
            idempotencyKey: data.idempotencyKey,
            subtotal,
            discountTotal,
            taxTotal,
            shippingTotal,
            total,
          },
          tx,
        );

        // One sub-order per shop, each with an immutable snapshot of what was bought.
        for (const group of pricing.groups) {
          await tx.vendorOrder.create({
            data: {
              orderId: order.id,
              shopId: group.shopId,
              fulfillmentMethod: group.fulfillmentMethod,
              subtotal: group.subtotal,
              discountTotal: group.discountTotal,
              shippingTotal: group.shippingTotal,
              taxTotal: group.taxTotal,
              total: group.total,
              commissionRate: group.commissionRate,
              commissionAmount: group.commissionAmount,
              vendorNet: group.vendorNet,
              items: {
                create: group.lines.map((line) => ({
                  orderId: order.id,
                  shopId: line.shopId,
                  productId: line.productId,
                  productName: line.name,
                  sku: line.sku,
                  imageUrl: line.imageUrl,
                  quantity: line.quantity,
                  unitPrice: line.unitPrice,
                  total: line.total,
                })),
              },
            },
          });
        }

        if (couponId) {
          await this.couponsService.redeem(couponId, tx);
        }

        // Nothing to collect on a fully discounted order — it is settled as placed.
        const nothingDue = total <= 0;

        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: data.paymentMethod ?? 'manual',
            amount: total,
            currency: 'USD',
            status: nothingDue ? 'PAID' : 'PENDING',
            paidAt: nothingDue ? new Date() : undefined,
          },
        });

        if (nothingDue) {
          await this.orderStatus.markPaid(order.id, tx);
        }

        return order.id;
      });
    } catch (error) {
      // Two identical submissions raced: the loser returns the winner's order.
      if (
        data.idempotencyKey &&
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByIdempotencyKey(data, currentUser, raisedByStaff);
        if (existing) return existing;
      }
      throw error;
    }

    void this.orderEmails.orderPlaced(orderId).catch(() => undefined);

    return this.findOne(orderId);
  }

  /**
   * Prices a basket exactly as `create` would — the checkout summary shows
   * this, so the customer sees the same figures they will be charged.
   * Doesn't reserve stock.
   */
  async quote(data: QuoteOrderDto, currentUser: AuthenticatedUser) {
    const customer = await this.prisma.customer.findUnique({
      where: { userId: currentUser.id },
    });
    if (!customer) {
      throw new BadRequestException({
        message: 'No customer profile is linked to this account',
      });
    }

    const address = data.shippingAddressId
      ? await this.addressFor(data.shippingAddressId, customer.id, this.prisma)
      : null;

    const { couponId: _couponId, ...pricing } = await this.pricing.price({
      items: data.items,
      couponCode: data.couponCode,
      address,
      fulfillment: data.fulfillment,
    });

    return { ...pricing, taxCalculated: !!address };
  }

  private async addressFor(
    addressId: string,
    customerId: string,
    client: Prisma.TransactionClient | PrismaService,
  ) {
    const address = await client.address.findUnique({ where: { id: addressId } });
    if (!address || address.customerId !== customerId) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: {
          shippingAddressId:
            'This address does not belong to the ordering customer',
        },
      });
    }
    return address;
  }

  private async findByIdempotencyKey(
    data: CreateOrdersDto,
    currentUser: AuthenticatedUser,
    raisedByStaff: boolean,
  ): Promise<OrdersEntity | null> {
    const customer = raisedByStaff
      ? data.customerId
        ? await this.prisma.customer.findUnique({ where: { id: data.customerId } })
        : null
      : await this.prisma.customer.findUnique({ where: { userId: currentUser.id } });
    if (!customer || !data.idempotencyKey) return null;

    const order = await this.prisma.order.findUnique({
      where: {
        customerId_idempotencyKey: {
          customerId: customer.id,
          idempotencyKey: data.idempotencyKey,
        },
      },
      select: { id: true },
    });
    return order ? this.findOne(order.id) : null;
  }

  /**
   * Public tracking lookup. Keyed by the human-readable order number rather
   * than the id, so a customer can track from the number on their receipt.
   * Anyone holding the number can call it, so it returns delivery progress
   * only — no customer identity, street address or phone.
   */
  async findByOrderNumber(orderNumber: string) {
    const order = await this.ordersRepository.findByOrderNumber(orderNumber);

    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} was not found.`);
    }

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt,
      subtotal: order.subtotal,
      discountTotal: order.discountTotal,
      taxTotal: order.taxTotal,
      shippingTotal: order.shippingTotal,
      total: order.total,
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        product: item.product,
      })),
      payment: order.payment
        ? { status: order.payment.status, amount: order.payment.amount }
        : null,
      shippingAddress: order.shippingAddress
        ? {
            city: order.shippingAddress.city,
            country: order.shippingAddress.country,
          }
        : null,
      // Each shop's part: status and tracking only — no customer data.
      vendorOrders: order.vendorOrders.map((vo) => ({
        id: vo.id,
        status: vo.status,
        fulfillmentMethod: vo.fulfillmentMethod,
        shop: { name: vo.shop.name, slug: vo.shop.slug, logoUrl: vo.shop.logoUrl, city: vo.shop.city },
        shipments: vo.shipments.map((sh) => ({
          awb: sh.awb,
          carrier: sh.carrier,
          status: sh.status,
          eta: sh.eta,
          dispatchedAt: sh.dispatchedAt,
          deliveredAt: sh.deliveredAt,
        })),
      })),
      shipments: order.shipments.map((shipment) => ({
        id: shipment.id,
        awb: shipment.awb,
        carrier: shipment.carrier,
        service: shipment.service,
        city: shipment.city,
        status: shipment.status,
        eta: shipment.eta,
        dispatchedAt: shipment.dispatchedAt,
        deliveredAt: shipment.deliveredAt,
      })),
    };
  }

  async update(id: string, data: UpdateOrdersDto): Promise<OrdersEntity> {
    const existing = await this.findOne(id);

    // Applied first so a request that also changes the status doesn't drop it.
    // The address must belong to the order's own customer.
    if (data.shippingAddressId && data.shippingAddressId !== existing.shippingAddressId) {
      await this.addressFor(data.shippingAddressId, existing.customerId, this.prisma);
      await this.ordersRepository.updateShippingAddress(id, data.shippingAddressId);
    }

    if (data.status && data.status !== existing.status) {
      // Moves every shop's sub-order that can make the move; the checkout's own
      // status is derived from them.
      await this.orderStatus.setOrderStatus(id, data.status);
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<OrdersEntity> {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(id);
    return order;
  }

  private generateOrderNumber(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }
}
