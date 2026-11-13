import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateInventoryDto,
  UpdateInventoryDto,
} from './dto/inventory.dto';
import type { InventoryEntity } from './entities/inventory.entity';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

const INVENTORY_INCLUDE = {
  product: { select: { id: true, name: true, sku: true } },
  warehouse: { select: { id: true, code: true, name: true, city: true } },
} as const;

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.InventoryWhereInput = {},
  ): Promise<{ data: InventoryEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: INVENTORY_INCLUDE,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return { data, total };
  }

  findByProductId(productId: string): Promise<InventoryEntity | null> {
    return this.prisma.inventory.findUnique({
      where: { productId },
      include: INVENTORY_INCLUDE,
    });
  }

  /** Applies the new counts and appends the movement to the audit trail. */
  adjust(
    id: string,
    counts: Prisma.InventoryUncheckedUpdateInput,
    movement: Omit<Prisma.InventoryAdjustmentUncheckedCreateInput, 'inventoryId'>,
  ): Promise<InventoryEntity> {
    return this.prisma.inventory.update({
      where: { id },
      data: { ...counts, adjustments: { create: movement } },
      include: INVENTORY_INCLUDE,
    });
  }

  findAdjustments(inventoryId: string) {
    return this.prisma.inventoryAdjustment.findMany({
      where: { inventoryId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  findById(id: string): Promise<InventoryEntity | null> {
    return this.prisma.inventory.findUnique({
      where: { id },
      include: INVENTORY_INCLUDE,
    });
  }

  async create(data: CreateInventoryDto): Promise<InventoryEntity> {
    const existing = await this.prisma.inventory.findUnique({ where: { productId: data.productId } });
    if (existing) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { productId: 'This product already has an inventory record' },
      });
    }

    return this.prisma.inventory.create({
      data: data as Prisma.InventoryUncheckedCreateInput,
      include: INVENTORY_INCLUDE,
    });
  }

  update(id: string, data: UpdateInventoryDto): Promise<InventoryEntity> {
    return this.prisma.inventory.update({
      where: { id },
      data: data as Prisma.InventoryUncheckedUpdateInput,
      include: INVENTORY_INCLUDE,
    });
  }

  remove(id: string): Promise<InventoryEntity> {
    return this.prisma.inventory.delete({
      where: { id },
      include: INVENTORY_INCLUDE,
    });
  }

  /**
   * Atomically decrements stock only if enough is available — on-hand minus
   * reserved, the same figure the inventory screens report. Returns false if
   * insufficient.
   */
  async decrementStock(
    productId: string,
    quantity: number,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<boolean> {
    const updated = await client.$executeRaw`
      UPDATE "Inventory"
      SET "quantity" = "quantity" - ${quantity}, "updatedAt" = now()
      WHERE "productId" = ${productId}
        AND "quantity" - "reserved" >= ${quantity}`;

    return updated > 0;
  }

  async restoreStock(
    productId: string,
    quantity: number,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<void> {
    await client.inventory.updateMany({
      where: { productId },
      data: { quantity: { increment: quantity } },
    });
  }
}
