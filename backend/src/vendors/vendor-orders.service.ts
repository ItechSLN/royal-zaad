import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { randomBytes } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatusService } from '../orders/order-status.service';
import type { UpdateVendorOrderDto, VendorOrdersQueryDto } from './dto/vendor.dto';
import type { VendorContext } from './vendor.guard';

/**
 * What a shop sees of a checkout: its own sub-order and lines, and only the
 * customer details needed to fulfil it — name, and the delivery address and
 * phone for delivery orders. No email, other shops' items, or totals.
 */
const VENDOR_ORDER_INCLUDE = {
  items: {
    select: {
      id: true,
      productId: true,
      productName: true,
      sku: true,
      imageUrl: true,
      quantity: true,
      unitPrice: true,
      total: true,
    },
  },
  shipments: { orderBy: { createdAt: 'desc' } },
  order: {
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      customer: { select: { firstName: true, lastName: true } },
      shippingAddress: {
        select: {
          recipientName: true,
          line1: true,
          line2: true,
          city: true,
          state: true,
          postalCode: true,
          country: true,
          phone: true,
        },
      },
      payment: { select: { status: true, provider: true } },
    },
  },
} satisfies Prisma.VendorOrderInclude;

@Injectable()
export class VendorOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderStatus: OrderStatusService,
  ) {}

  async list(ctx: VendorContext, query: VendorOrdersQueryDto) {
    const { page, limit, status } = query;
    const where: Prisma.VendorOrderWhereInput = {
      shopId: ctx.shopId,
      ...(status ? { status: status as Prisma.EnumOrderStatusFilter['equals'] } : {}),
    };
    const [rows, total] = await Promise.all([
      this.prisma.vendorOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: VENDOR_ORDER_INCLUDE,
      }),
      this.prisma.vendorOrder.count({ where }),
    ]);
    return {
      data: rows.map((row) => this.present(row)),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async get(ctx: VendorContext, id: string) {
    const row = await this.prisma.vendorOrder.findFirst({
      where: { id, shopId: ctx.shopId },
      include: VENDOR_ORDER_INCLUDE,
    });
    if (!row) throw new NotFoundException(`Order ${id} was not found.`);
    return this.present(row);
  }

  /**
   * Fulfilment by the shop. Card orders move to PROCESSING when payment
   * clears; a shop accepts cash-on-delivery orders itself. For pickup,
   * SHIPPED means "ready for collection".
   */
  async update(ctx: VendorContext, id: string, data: UpdateVendorOrderDto) {
    const current = await this.get(ctx, id);

    if (data.status === 'PROCESSING' && current.status === 'PENDING' && current.order.payment?.provider !== 'cod') {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { status: 'This order starts processing automatically once payment is received' },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await this.orderStatus.setVendorOrderStatus(id, data.status, tx);

      if (data.status === 'SHIPPED' && current.fulfillmentMethod === 'DELIVERY') {
        await tx.shipment.create({
          data: {
            awb: data.trackingNumber ?? `RZ-${randomBytes(5).toString('hex').toUpperCase()}`,
            orderId: current.order.id,
            vendorOrderId: id,
            carrier: data.carrier ?? 'Shop delivery',
            city: current.order.shippingAddress?.city,
            status: 'IN_TRANSIT',
            dispatchedAt: new Date(),
          },
        });
      }
      if (data.status === 'DELIVERED') {
        await tx.shipment.updateMany({
          where: { vendorOrderId: id, status: { not: 'DELIVERED' } },
          data: { status: 'DELIVERED', deliveredAt: new Date() },
        });
      }
    });

    return this.get(ctx, id);
  }

  private present<T extends { fulfillmentMethod: string; order: { shippingAddress: unknown } }>(row: T) {
    // Pickup orders have no business carrying the customer's home address.
    return row.fulfillmentMethod === 'PICKUP'
      ? { ...row, order: { ...row.order, shippingAddress: null } }
      : row;
  }
}
