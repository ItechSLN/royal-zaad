import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, ReturnStage } from '@prisma/client';
import type { CreateReturnsDto, UpdateReturnsDto } from './dto/returns.dto';
import type { ReturnsEntity } from './entities/returns.entity';
import { ReturnsRepository } from './returns.repository';
import type { ReturnsQueryDto } from './dto/returns.dto';

/** Inspection either approves or rejects; only an approved return is refunded. */
const ALLOWED_TRANSITIONS: Record<ReturnStage, ReturnStage[]> = {
  AWAITING_INSPECTION: ['APPROVED', 'REJECTED'],
  APPROVED: ['REFUNDED'],
  REJECTED: [],
  REFUNDED: [],
};

/** Once stock or money has moved the RMA is part of the audit trail. */
const DELETABLE: ReturnStage[] = ['AWAITING_INSPECTION', 'REJECTED'];

const invalid = (errors: Record<string, string>) =>
  new BadRequestException({ message: 'Validation failed', errors });

const round2 = (n: number) => Math.round(n * 100) / 100;

@Injectable()
export class ReturnsService {
  constructor(private readonly returnsRepository: ReturnsRepository) {}

  async findAll(
    query: ReturnsQueryDto,
  ): Promise<{ data: ReturnsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.returnsRepository.findAll(
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
  private buildWhere(q: ReturnsQueryDto): Prisma.ReturnRequestWhereInput {
    const where: Prisma.ReturnRequestWhereInput[] = [];
    if (q.stage) where.push({ stage: q.stage });
    if (q.customerId) where.push({ customerId: q.customerId });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string) {
    const record = await this.returnsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Return ${id} was not found.`);
    }
    return record;
  }

  /**
   * Opens an RMA against a delivered order. The customer comes from the order,
   * and the refund cannot exceed what is still refundable on it. RMA numbers
   * run per calendar year, e.g. RMA-2026-0188.
   */
  async create(data: CreateReturnsDto): Promise<ReturnsEntity> {
    const order = await this.returnsRepository.findOrder(data.orderId);
    if (!order) throw invalid({ orderId: 'Order was not found' });

    if (order.status !== 'DELIVERED') {
      throw invalid({
        orderId: `Only delivered orders can be returned (order is ${order.status})`,
      });
    }
    if (data.customerId && data.customerId !== order.customerId) {
      throw invalid({ customerId: 'Customer does not match the order' });
    }
    if (
      data.orderItemId &&
      !order.items.some((item) => item.id === data.orderItemId)
    ) {
      throw invalid({ orderItemId: 'Item does not belong to the order' });
    }

    await this.assertRefundable(order.id, Number(order.total), data.refundAmount);

    let rmaNumber = data.rmaNumber;
    if (!rmaNumber) {
      const year = new Date().getFullYear();
      const latest = await this.returnsRepository.latestNumberForYear(year);
      const sequence = (Number(latest?.split('-')[2]) || 0) + 1;
      rmaNumber = `RMA-${year}-${String(sequence).padStart(4, '0')}`;
    }

    return this.returnsRepository.create({
      ...data,
      // Every RMA starts at inspection; decisions go through update().
      stage: undefined,
      customerId: order.customerId,
      rmaNumber,
    });
  }

  /**
   * Records a decision. Side effects happen exactly once, on the transition:
   * approving with a SELLABLE restock puts the units back on the shelf;
   * refunding settles the RMA and, once the order is refunded in full, marks
   * the order (and an original-method payment) REFUNDED — the same states the
   * orders and payments modules use.
   */
  async update(id: string, data: UpdateReturnsDto) {
    const existing = await this.findOne(id);

    for (const field of ['orderId', 'customerId', 'orderItemId', 'rmaNumber'] as const) {
      if (data[field] !== undefined && data[field] !== existing[field]) {
        throw invalid({ [field]: 'Cannot be changed once the return is opened' });
      }
    }

    const next = data.stage ?? existing.stage;
    const moving = next !== existing.stage;

    if (moving && !ALLOWED_TRANSITIONS[existing.stage].includes(next)) {
      throw invalid({
        stage: `Cannot move a return from ${existing.stage} to ${next}`,
      });
    }
    if (!moving && (existing.stage === 'REFUNDED' || existing.stage === 'REJECTED')) {
      throw invalid({ stage: `Return is already ${existing.stage} and is closed` });
    }

    const refundAmount = data.refundAmount ?? Number(existing.refundAmount);
    const refundMethod = data.refundMethod ?? existing.refundMethod;
    const restock = data.restock ?? existing.restock;
    const order = existing.order;

    if (data.refundAmount !== undefined) {
      await this.assertRefundable(order.id, Number(order.total), data.refundAmount, id);
    }

    if (next === 'REFUNDED' && moving) {
      if (!refundMethod || refundMethod === 'NONE' || refundAmount <= 0) {
        throw invalid({
          refundAmount: 'A refund needs an amount above zero and a refund method',
        });
      }
    }

    const payload: UpdateReturnsDto & { resolvedAt?: Date } = {
      reason: data.reason,
      note: data.note,
      stage: data.stage,
      refundAmount: data.refundAmount,
      refundMethod: data.refundMethod,
      restock: data.restock,
    };
    if (moving && (next === 'REFUNDED' || next === 'REJECTED')) {
      payload.resolvedAt = new Date();
    }

    const applied = await this.returnsRepository.updateGuarded(
      id,
      existing.stage,
      payload,
      moving
        ? async (tx) => {
            if (next === 'APPROVED' && restock === 'SELLABLE') {
              const items = existing.orderItemId
                ? order.items.filter((i) => i.id === existing.orderItemId)
                : order.items;
              for (const item of items) {
                await this.returnsRepository.restock(
                  tx,
                  item.productId,
                  item.quantity,
                  `Return ${existing.rmaNumber}`,
                );
              }
            }

            if (next === 'REFUNDED') {
              const refunded = await this.returnsRepository.refundedTotal(tx, order.id);
              if (round2(refunded) >= round2(Number(order.total))) {
                // Every shop's live sub-order is refunded, and with it the checkout.
                await tx.vendorOrder.updateMany({
                  where: { orderId: order.id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
                  data: { status: 'REFUNDED' },
                });
                await tx.order.updateMany({
                  where: { id: order.id, status: { notIn: ['CANCELLED', 'REFUNDED'] } },
                  data: { status: 'REFUNDED' },
                });
                if (refundMethod === 'ORIGINAL') {
                  const paid = await tx.payment.findUnique({ where: { orderId: order.id } });
                  if (paid?.status === 'PAID') {
                    await tx.payment.update({
                      where: { id: paid.id },
                      data: { status: 'REFUNDED', refundedAmount: paid.amount },
                    });
                  }
                }
              }
            }
          }
        : undefined,
    );

    if (!applied) {
      throw new ConflictException(
        'The return was updated by someone else — reload and try again.',
      );
    }

    return this.findOne(id);
  }

  async remove(id: string): Promise<ReturnsEntity> {
    const existing = await this.findOne(id);
    if (!DELETABLE.includes(existing.stage)) {
      throw new BadRequestException(
        `A ${existing.stage.toLowerCase()} return cannot be deleted — stock or money has already moved.`,
      );
    }
    return this.returnsRepository.remove(id);
  }

  /** Refunds across all open returns on an order cannot exceed its total. */
  private async assertRefundable(
    orderId: string,
    orderTotal: number,
    amount: number | undefined,
    excludeId?: string,
  ) {
    if (!amount) return;
    const committed = await this.returnsRepository.committedRefunds(orderId, excludeId);
    const available = round2(orderTotal - committed);
    if (round2(amount) > available) {
      throw invalid({
        refundAmount: `Refund cannot exceed ${available.toFixed(2)} still refundable on the order`,
      });
    }
  }
}
