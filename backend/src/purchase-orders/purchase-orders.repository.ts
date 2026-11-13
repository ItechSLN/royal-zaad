import { Injectable } from '@nestjs/common';
import type { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreatePurchaseOrdersDto,
  PurchaseOrderItemDto,
  UpdatePurchaseOrdersDto,
} from './dto/purchase-orders.dto';
import type { PurchaseOrdersEntity } from './entities/purchase-orders.entity';

const PO_INCLUDE = {
  supplier: true,
  warehouse: true,
  items: { include: { product: { select: { id: true, name: true, sku: true } } } },
} satisfies Prisma.PurchaseOrderInclude;

const lineRows = (items: PurchaseOrderItemDto[]) =>
  items.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    unitCost: item.unitCost,
    total: Math.round(item.quantity * item.unitCost * 100) / 100,
  }));

@Injectable()
export class PurchaseOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.PurchaseOrderWhereInput = {},
  ): Promise<{ data: PurchaseOrdersEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PO_INCLUDE,
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string) {
    return this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: PO_INCLUDE,
    });
  }

  countProducts(ids: string[]): Promise<number> {
    return this.prisma.product.count({ where: { id: { in: ids } } });
  }

  create(data: CreatePurchaseOrdersDto): Promise<PurchaseOrdersEntity> {
    const { items, ...po } = data;
    return this.prisma.purchaseOrder.create({
      data: {
        ...(po as unknown as Prisma.PurchaseOrderUncheckedCreateInput),
        ...(items ? { items: { create: lineRows(items) } } : {}),
      },
      include: PO_INCLUDE,
    });
  }

  /** Replaces the lines when given; the header update is applied either way. */
  update(
    id: string,
    data: UpdatePurchaseOrdersDto,
  ): Promise<PurchaseOrdersEntity> {
    const { items, ...po } = data;
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        ...po,
        ...(items ? { items: { deleteMany: {}, create: lineRows(items) } } : {}),
      },
    });
  }

  /**
   * Books the PO into stock. The status flip is guarded on the status the
   * caller read, inside the same transaction as the stock movement, so a PO
   * can only ever be received once even under concurrent requests.
   */
  async receive(
    id: string,
    from: PurchaseOrderStatus,
    data: UpdatePurchaseOrdersDto,
  ): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const flipped = await tx.purchaseOrder.updateMany({
        where: { id, status: from },
        data: { status: 'RECEIVED', receivedAt: data.receivedAt ?? new Date() },
      });
      if (flipped.count === 0) return false;

      const po = await tx.purchaseOrder.findUniqueOrThrow({
        where: { id },
        include: { items: true },
      });

      for (const item of po.items) {
        const inventory = await tx.inventory.upsert({
          where: { productId: item.productId },
          create: {
            productId: item.productId,
            quantity: item.quantity,
            warehouseId: po.warehouseId,
          },
          update: { quantity: { increment: item.quantity } },
        });

        await tx.inventoryAdjustment.create({
          data: {
            inventoryId: inventory.id,
            reason: 'RECEIPT',
            quantity: inventory.quantity,
            reserved: inventory.reserved,
            reorderAt: inventory.reorderAt,
            delta: item.quantity,
            note: `Purchase order ${po.number}`,
          },
        });
      }

      await tx.supplier.update({
        where: { id: po.supplierId },
        data: { ytdSpend: { increment: po.total } },
      });

      return true;
    });
  }

  remove(id: string): Promise<PurchaseOrdersEntity> {
    return this.prisma.purchaseOrder.delete({ where: { id } });
  }

  /** Highest existing PO number, used to derive the next one. */
  latestNumber(): Promise<{ number: string } | null> {
    return this.prisma.purchaseOrder.findFirst({
      orderBy: { number: 'desc' },
      select: { number: true },
    });
  }
}
