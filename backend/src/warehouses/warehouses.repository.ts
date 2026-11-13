import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateStockTransferDto,
  CreateWarehousesDto,
  UpdateStockTransferDto,
  UpdateWarehousesDto,
} from './dto/warehouses.dto';
import type { WarehousesEntity } from './entities/warehouses.entity';

@Injectable()
export class WarehousesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.WarehouseWhereInput = {},
  ): Promise<{ data: WarehousesEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.warehouse.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.warehouse.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<WarehousesEntity | null> {
    return this.prisma.warehouse.findUnique({ where: { id } });
  }

  /** Making a site the default clears the flag on every other site. */
  create(data: CreateWarehousesDto): Promise<WarehousesEntity> {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.warehouse.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
      }
      return tx.warehouse.create({ data });
    });
  }

  update(id: string, data: UpdateWarehousesDto): Promise<WarehousesEntity> {
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.warehouse.updateMany({
          where: { isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }
      return tx.warehouse.update({ where: { id }, data });
    });
  }

  remove(id: string): Promise<WarehousesEntity> {
    return this.prisma.warehouse.delete({ where: { id } });
  }

  /** Units currently stored per warehouse, used to derive utilisation. */
  async storedUnits(): Promise<Record<string, number>> {
    const rows = await this.prisma.inventory.groupBy({
      by: ['warehouseId'],
      _sum: { quantity: true },
    });

    return rows.reduce<Record<string, number>>((acc, row) => {
      if (row.warehouseId) acc[row.warehouseId] = row._sum.quantity ?? 0;
      return acc;
    }, {});
  }

  /* ── stock transfers ── */

  async findAllTransfers(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.stockTransfer.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { from: true, to: true },
      }),
      this.prisma.stockTransfer.count(),
    ]);

    return { data, total };
  }

  findTransferById(id: string) {
    return this.prisma.stockTransfer.findUnique({
      where: { id },
      include: { from: true, to: true },
    });
  }

  createTransfer(data: CreateStockTransferDto) {
    return this.prisma.stockTransfer.create({
      data: data as unknown as Prisma.StockTransferUncheckedCreateInput,
    });
  }

  /** Units promised to transfers that have not been received yet. */
  async committedOutbound(fromId: string, excludeId?: string): Promise<number> {
    const result = await this.prisma.stockTransfer.aggregate({
      where: {
        fromId,
        status: { not: 'RECEIVED' },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      _sum: { units: true },
    });
    return result._sum.units ?? 0;
  }

  updateTransfer(id: string, data: UpdateStockTransferDto & { receivedAt?: Date }) {
    return this.prisma.stockTransfer.update({
      where: { id },
      data: data,
    });
  }

  removeTransfer(id: string) {
    return this.prisma.stockTransfer.delete({ where: { id } });
  }

  countTransfersFor(warehouseId: string): Promise<number> {
    return this.prisma.stockTransfer.count({
      where: { OR: [{ fromId: warehouseId }, { toId: warehouseId }] },
    });
  }

  countInventoryFor(warehouseId: string): Promise<number> {
    return this.prisma.inventory.count({ where: { warehouseId } });
  }
}
