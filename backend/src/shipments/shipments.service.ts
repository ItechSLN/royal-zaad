import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ShipmentStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import type {
  CreateShipmentsDto,
  UpdateShipmentsDto,
} from './dto/shipments.dto';
import type { ShipmentsEntity } from './entities/shipments.entity';
import { ShipmentsRepository } from './shipments.repository';
import type { ShipmentsQueryDto } from './dto/shipments.dto';

/** Carrier progress only moves forward; a failed attempt can be re-attempted. */
const ALLOWED_TRANSITIONS: Record<ShipmentStatus, ShipmentStatus[]> = {
  AWAITING_DISPATCH: ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  DISPATCHED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  FAILED: ['IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'],
  DELIVERED: [],
};

/** Statuses meaning the parcel has left the warehouse. */
const ON_THE_ROAD: ShipmentStatus[] = ['DISPATCHED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED'];

/** Only paid-up orders in fulfilment can be handed to a carrier. */
const SHIPPABLE_ORDER = ['PROCESSING', 'SHIPPED'];

const invalid = (errors: Record<string, string>) =>
  new BadRequestException({ message: 'Validation failed', errors });

@Injectable()
export class ShipmentsService {
  constructor(
    private readonly shipmentsRepository: ShipmentsRepository,
    private readonly ordersService: OrdersService,
  ) {}

  async findAll(
    query: ShipmentsQueryDto,
  ): Promise<{ data: ShipmentsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.shipmentsRepository.findAll(
      page,
      limit,
      this.buildWhere(query),
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /** Only the filters the list screen actually sends are applied. */
  private buildWhere(q: ShipmentsQueryDto): Prisma.ShipmentWhereInput {
    const where: Prisma.ShipmentWhereInput[] = [];
    if (q.status) where.push({ status: q.status });
    if (q.carrier) where.push({ carrier: q.carrier });
    if (q.orderId) where.push({ orderId: q.orderId });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string): Promise<ShipmentsEntity> {
    const record = await this.shipmentsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Shipment ${id} was not found.`);
    }
    return record;
  }

  /**
   * Books a consignment for an order in fulfilment. The destination defaults
   * to the order's shipping city, and the order follows the parcel's status.
   */
  async create(data: CreateShipmentsDto): Promise<ShipmentsEntity> {
    const order = await this.shipmentsRepository.findOrder(data.orderId);
    if (!order) throw invalid({ orderId: 'Order was not found' });
    if (!SHIPPABLE_ORDER.includes(order.status)) {
      throw invalid({
        orderId: `Only orders in fulfilment can be shipped (order is ${order.status})`,
      });
    }

    const status = data.status ?? 'AWAITING_DISPATCH';
    const now = new Date().toISOString();
    const shipment = await this.shipmentsRepository.create({
      ...data,
      city: data.city ?? order.shippingAddress?.city ?? undefined,
      dispatchedAt:
        data.dispatchedAt ?? (ON_THE_ROAD.includes(status) ? now : undefined),
      deliveredAt: data.deliveredAt ?? (status === 'DELIVERED' ? now : undefined),
    });

    await this.syncOrder(order.id, status);
    return this.findOne(shipment.id);
  }

  /**
   * Status changes stamp dispatch/delivery times, count failed attempts and
   * move the order along (PROCESSING -> SHIPPED -> DELIVERED).
   */
  async update(id: string, data: UpdateShipmentsDto): Promise<ShipmentsEntity> {
    const existing = await this.findOne(id);

    if (data.orderId && data.orderId !== existing.orderId) {
      throw invalid({ orderId: 'A shipment cannot be moved to another order' });
    }

    const next = data.status ?? existing.status;
    const moving = next !== existing.status;
    if (moving && !ALLOWED_TRANSITIONS[existing.status].includes(next)) {
      throw invalid({
        status: `Cannot move a shipment from ${existing.status} to ${next}`,
      });
    }

    const now = new Date().toISOString();
    await this.shipmentsRepository.update(id, {
      ...data,
      ...(moving && ON_THE_ROAD.includes(next) && !existing.dispatchedAt && !data.dispatchedAt
        ? { dispatchedAt: now }
        : {}),
      ...(moving && next === 'DELIVERED' && !data.deliveredAt ? { deliveredAt: now } : {}),
      ...(moving && next === 'FAILED' && data.attempts === undefined
        ? { attempts: { increment: 1 } }
        : {}),
    });

    if (moving) await this.syncOrder(existing.orderId, next);
    return this.findOne(id);
  }

  async remove(id: string): Promise<ShipmentsEntity> {
    const existing = await this.findOne(id);
    if (existing.status === 'DELIVERED') {
      throw new BadRequestException(
        'A delivered shipment is part of the order history and cannot be deleted.',
      );
    }
    return this.shipmentsRepository.remove(id);
  }

  /** Advances the order through the orders module so its rules and emails apply. */
  private async syncOrder(orderId: string, status: ShipmentStatus) {
    if (!ON_THE_ROAD.includes(status) || status === 'FAILED') return;

    const order = await this.ordersService.findOne(orderId);
    if (order.status === 'PROCESSING') {
      await this.ordersService.update(orderId, { status: 'SHIPPED' });
    }
    if (status === 'DELIVERED' && ['PROCESSING', 'SHIPPED'].includes(order.status)) {
      await this.ordersService.update(orderId, { status: 'DELIVERED' });
    }
  }
}
