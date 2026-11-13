import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AdjustInventoryDto,
  CreateInventoryDto,
  UpdateInventoryDto,
} from './dto/inventory.dto';
import type { InventoryEntity } from './entities/inventory.entity';
import { InventoryRepository } from './inventory.repository';
import type { InventoryQueryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  /**
   * `state` mirrors the AD-07 tabs. "Low" and "out" are expressed against
   * available stock (quantity minus reserved) rather than raw quantity.
   */
  async findAll(
    query: InventoryQueryDto,
    warehouseId?: string,
    state?: string,
  ): Promise<{ data: InventoryEntity[]; meta: any }> {
    const { page, limit } = query;

    const where: Prisma.InventoryWhereInput = {
      ...(warehouseId ? { warehouseId } : {}),
      ...(state === 'out' ? { quantity: { lte: 0 } } : {}),
    };

    const { data, total } = await this.inventoryRepository.findAll(
      page,
      limit,
      where,
    );

    // Reorder thresholds vary per row, so "low" is filtered in memory.
    const rows =
      state === 'low'
        ? data.filter((i) => {
            const available = i.quantity - i.reserved;
            return available > 0 && available <= i.reorderAt;
          })
        : state === 'in'
          ? data.filter((i) => i.quantity - i.reserved > i.reorderAt)
          : data;

    return {
      data: rows,
      meta: {
        page,
        limit,
        total: state === 'low' || state === 'in' ? rows.length : total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  async findOne(id: string): Promise<InventoryEntity> {
    const inventory = await this.inventoryRepository.findById(id);

    if (!inventory) {
      throw new NotFoundException(`Inventory ${id} was not found.`);
    }

    return inventory;
  }

  create(data: CreateInventoryDto): Promise<InventoryEntity> {
    return this.inventoryRepository.create(data);
  }

  async update(id: string, data: UpdateInventoryDto): Promise<InventoryEntity> {
    await this.findOne(id);
    return this.inventoryRepository.update(id, data);
  }

  async remove(id: string): Promise<InventoryEntity> {
    await this.findOne(id);
    return this.inventoryRepository.remove(id);
  }

  /**
   * Posts a stock adjustment: writes the new counts and records the movement
   * so the change is traceable back to a reason and an operator.
   */
  async adjust(id: string, data: AdjustInventoryDto): Promise<InventoryEntity> {
    const current = await this.findOne(id);

    const counts = {
      quantity: data.quantity,
      reserved: data.reserved ?? current.reserved,
      reorderAt: data.reorderAt ?? current.reorderAt,
      ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
    };

    return this.inventoryRepository.adjust(id, counts, {
      reason: data.reason,
      quantity: counts.quantity,
      reserved: counts.reserved,
      reorderAt: counts.reorderAt,
      delta: data.quantity - current.quantity,
      note: data.note,
      createdById: data.createdById,
    });
  }

  async findAdjustments(id: string) {
    await this.findOne(id);
    return this.inventoryRepository.findAdjustments(id);
  }
}
