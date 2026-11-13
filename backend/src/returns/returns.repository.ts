import { Injectable } from '@nestjs/common';
import type { Prisma, ReturnStage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateReturnsDto, UpdateReturnsDto } from './dto/returns.dto';
import type { ReturnsEntity } from './entities/returns.entity';

type Tx = Prisma.TransactionClient;

/** The list and detail screens show the customer, order and returned item. */
const RETURN_INCLUDE = {
  customer: true,
  order: {
    include: {
      items: { include: { product: { select: { id: true, name: true } } } },
      payment: true,
    },
  },
} satisfies Prisma.ReturnRequestInclude;

@Injectable()
export class ReturnsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.ReturnRequestWhereInput = {},
  ): Promise<{ data: ReturnsEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: RETURN_INCLUDE,
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string) {
    return this.prisma.returnRequest.findUnique({
      where: { id },
      include: RETURN_INCLUDE,
    });
  }

  findOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true, payment: true },
    });
  }

  /** Value already committed to other, non-rejected returns on the order. */
  async committedRefunds(orderId: string, excludeId?: string): Promise<number> {
    const result = await this.prisma.returnRequest.aggregate({
      where: {
        orderId,
        stage: { not: 'REJECTED' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      _sum: { refundAmount: true },
    });
    return Number(result._sum.refundAmount ?? 0);
  }

  create(
    data: CreateReturnsDto & { customerId: string; rmaNumber: string },
  ): Promise<ReturnsEntity> {
    return this.prisma.returnRequest.create({
      data: data as unknown as Prisma.ReturnRequestUncheckedCreateInput,
      include: RETURN_INCLUDE,
    });
  }

  /**
   * Applies an update, guarded on the stage the caller read so two concurrent
   * decisions cannot both apply their side effects. `effects` runs inside the
   * same transaction once the guard passed. Returns false if the row moved on.
   */
  async updateGuarded(
    id: string,
    expectedStage: ReturnStage,
    data: UpdateReturnsDto & { resolvedAt?: Date },
    effects?: (tx: Tx) => Promise<void>,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.updateMany({
        where: { id, stage: expectedStage },
        data,
      });
      if (updated.count === 0) return false;
      if (effects) await effects(tx);
      return true;
    });
  }

  /** Puts returned units back into sellable stock and records the movement. */
  async restock(
    tx: Tx,
    productId: string,
    quantity: number,
    note: string,
  ): Promise<void> {
    const inventory = await tx.inventory.upsert({
      where: { productId },
      create: { productId, quantity },
      update: { quantity: { increment: quantity } },
    });

    await tx.inventoryAdjustment.create({
      data: {
        inventoryId: inventory.id,
        reason: 'RETURN',
        quantity: inventory.quantity,
        reserved: inventory.reserved,
        reorderAt: inventory.reorderAt,
        delta: quantity,
        note,
      },
    });
  }

  /** Sum refunded to the customer across settled returns on the order. */
  async refundedTotal(tx: Tx, orderId: string): Promise<number> {
    const result = await tx.returnRequest.aggregate({
      where: { orderId, stage: 'REFUNDED' },
      _sum: { refundAmount: true },
    });
    return Number(result._sum.refundAmount ?? 0);
  }

  remove(id: string): Promise<ReturnsEntity> {
    return this.prisma.returnRequest.delete({ where: { id } });
  }

  /** Highest RMA number issued in the year, e.g. RMA-2026-0188. */
  async latestNumberForYear(year: number): Promise<string | null> {
    const latest = await this.prisma.returnRequest.findFirst({
      where: { rmaNumber: { startsWith: `RMA-${year}-` } },
      orderBy: { rmaNumber: 'desc' },
      select: { rmaNumber: true },
    });
    return latest?.rmaNumber ?? null;
  }
}
