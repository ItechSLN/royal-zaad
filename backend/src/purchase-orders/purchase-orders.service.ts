import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, PurchaseOrderStatus } from '@prisma/client';
import type {
  CreatePurchaseOrdersDto,
  UpdatePurchaseOrdersDto,
} from './dto/purchase-orders.dto';
import type { PurchaseOrdersEntity } from './entities/purchase-orders.entity';
import { PurchaseOrdersRepository } from './purchase-orders.repository';
import type { PurchaseOrdersQueryDto } from './dto/purchase-orders.dto';

const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  DRAFT: ['AWAITING_APPROVAL', 'APPROVED', 'CANCELLED'],
  AWAITING_APPROVAL: ['DRAFT', 'APPROVED', 'CANCELLED'],
  APPROVED: ['OVERDUE', 'RECEIVED', 'CANCELLED'],
  OVERDUE: ['APPROVED', 'RECEIVED', 'CANCELLED'],
  RECEIVED: [],
  CANCELLED: [],
};

/** A PO that has not been sent to the supplier (or was called off) can go. */
const DELETABLE: PurchaseOrderStatus[] = ['DRAFT', 'AWAITING_APPROVAL', 'CANCELLED'];

const invalid = (errors: Record<string, string>) =>
  new BadRequestException({ message: 'Validation failed', errors });

@Injectable()
export class PurchaseOrdersService {
  constructor(
    private readonly purchaseOrdersRepository: PurchaseOrdersRepository,
  ) {}

  async findAll(
    query: PurchaseOrdersQueryDto,
  ): Promise<{ data: PurchaseOrdersEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.purchaseOrdersRepository.findAll(
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
  private buildWhere(
    q: PurchaseOrdersQueryDto,
  ): Prisma.PurchaseOrderWhereInput {
    const where: Prisma.PurchaseOrderWhereInput[] = [];
    if (q.status) where.push({ status: q.status });
    if (q.supplierId) where.push({ supplierId: q.supplierId });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string) {
    const record = await this.purchaseOrdersRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Purchase order ${id} was not found.`);
    }
    return record;
  }

  /** The PO number is system-assigned when the caller does not supply one. */
  async create(data: CreatePurchaseOrdersDto): Promise<PurchaseOrdersEntity> {
    if (data.status && !['DRAFT', 'AWAITING_APPROVAL', 'APPROVED'].includes(data.status)) {
      throw invalid({ status: 'A new purchase order starts as draft, awaiting approval or approved' });
    }
    const payload = await this.withLineTotals(data);

    if (payload.number) return this.purchaseOrdersRepository.create(payload);

    const latest = await this.purchaseOrdersRepository.latestNumber();
    const previous = Number(latest?.number?.replace(/\D/g, '')) || 2400;

    return this.purchaseOrdersRepository.create({
      ...payload,
      number: `PO-${previous + 1}`,
    });
  }

  /**
   * Edits and status moves. Moving to RECEIVED books every line into stock
   * exactly once; received and cancelled POs are closed.
   */
  async update(
    id: string,
    data: UpdatePurchaseOrdersDto,
  ): Promise<PurchaseOrdersEntity> {
    const existing = await this.findOne(id);

    if (existing.status === 'RECEIVED' || existing.status === 'CANCELLED') {
      throw invalid({
        status: `Purchase order is ${existing.status.toLowerCase()} and can no longer be changed`,
      });
    }

    const next = data.status ?? existing.status;
    if (next !== existing.status && !ALLOWED_TRANSITIONS[existing.status].includes(next)) {
      throw invalid({
        status: `Cannot move a purchase order from ${existing.status} to ${next}`,
      });
    }

    if (next === 'RECEIVED') {
      const { status: _status, receivedAt: _receivedAt, ...rest } = data;
      if (Object.keys(rest).length) {
        await this.purchaseOrdersRepository.update(id, await this.withLineTotals(rest));
      }
      const lines = rest.items ?? existing.items;
      if (!lines.length) {
        throw invalid({
          items: 'Add the product lines before receiving — there is nothing to book into stock',
        });
      }
      const received = await this.purchaseOrdersRepository.receive(
        id,
        existing.status,
        data,
      );
      if (!received) {
        throw new ConflictException('This purchase order was already received or changed.');
      }
      return this.findOne(id);
    }

    await this.purchaseOrdersRepository.update(id, await this.withLineTotals(data));
    return this.findOne(id);
  }

  async remove(id: string): Promise<PurchaseOrdersEntity> {
    const existing = await this.findOne(id);
    if (!DELETABLE.includes(existing.status)) {
      throw new BadRequestException(
        `A ${existing.status.toLowerCase().replace('_', ' ')} purchase order cannot be deleted — cancel it instead.`,
      );
    }
    return this.purchaseOrdersRepository.remove(id);
  }

  /** Lines are the source of truth for units and total when present. */
  private async withLineTotals<T extends UpdatePurchaseOrdersDto>(data: T): Promise<T> {
    if (!data.items) return data;

    const ids = [...new Set(data.items.map((i) => i.productId))];
    if ((await this.purchaseOrdersRepository.countProducts(ids)) !== ids.length) {
      throw invalid({ items: 'One or more products were not found' });
    }

    return {
      ...data,
      units: data.items.reduce((a, i) => a + i.quantity, 0),
      total:
        Math.round(data.items.reduce((a, i) => a + i.quantity * i.unitCost, 0) * 100) / 100,
    };
  }
}
