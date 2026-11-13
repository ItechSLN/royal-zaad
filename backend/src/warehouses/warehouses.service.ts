import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, TransferStatus } from '@prisma/client';
import type {
  CreateStockTransferDto,
  CreateWarehousesDto,
  UpdateStockTransferDto,
  UpdateWarehousesDto,
} from './dto/warehouses.dto';
import type { WarehousesEntity } from './entities/warehouses.entity';
import { WarehousesRepository } from './warehouses.repository';
import type { WarehousesQueryDto } from './dto/warehouses.dto';
import { PaginationQueryDto } from '../common/pagination-query.data';

const TRANSFER_TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  DRAFT: ['IN_TRANSIT'],
  IN_TRANSIT: ['LATE', 'RECEIVED'],
  LATE: ['IN_TRANSIT', 'RECEIVED'],
  RECEIVED: [],
};

const invalid = (errors: Record<string, string>) =>
  new BadRequestException({ message: 'Validation failed', errors });

@Injectable()
export class WarehousesService {
  constructor(private readonly warehousesRepository: WarehousesRepository) {}

  async findAll(
    query: WarehousesQueryDto,
  ): Promise<{ data: WarehousesEntity[]; meta: any }> {
    const { page, limit } = query;
    const where = this.buildWhere(query);
    const [{ data, total }, stored] = await Promise.all([
      this.warehousesRepository.findAll(page, limit, where),
      this.warehousesRepository.storedUnits(),
    ]);

    // Utilisation is derived from live inventory rather than stored on the row.
    const enriched = data.map((warehouse) => {
      const units = stored[warehouse.id] ?? 0;
      return {
        ...warehouse,
        units,
        utilisation:
          warehouse.capacity > 0
            ? Math.round((units / warehouse.capacity) * 100)
            : 0,
      };
    });

    return {
      data: enriched,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  /** Only the filters the list screen actually sends are applied. */
  private buildWhere(q: WarehousesQueryDto): Prisma.WarehouseWhereInput {
    const where: Prisma.WarehouseWhereInput[] = [];
    if (q.status) where.push({ status: q.status });
    if (q.city) where.push({ city: { contains: q.city, mode: 'insensitive' } });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string): Promise<WarehousesEntity> {
    const record = await this.warehousesRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Warehouse ${id} was not found.`);
    }
    return record;
  }

  /** Only one site can be the default fulfilment warehouse. */
  create(data: CreateWarehousesDto): Promise<WarehousesEntity> {
    return this.warehousesRepository.create(data);
  }

  async update(
    id: string,
    data: UpdateWarehousesDto,
  ): Promise<WarehousesEntity> {
    await this.findOne(id);
    return this.warehousesRepository.update(id, data);
  }

  async remove(id: string): Promise<WarehousesEntity> {
    await this.findOne(id);

    const [stockRows, transfers] = await Promise.all([
      this.warehousesRepository.countInventoryFor(id),
      this.warehousesRepository.countTransfersFor(id),
    ]);

    if (stockRows > 0) {
      throw new BadRequestException(
        `Warehouse cannot be deleted while ${stockRows} stock record(s) are held there.`,
      );
    }

    if (transfers > 0) {
      throw new BadRequestException(
        `Warehouse cannot be deleted while ${transfers} transfer(s) reference it.`,
      );
    }

    return this.warehousesRepository.remove(id);
  }

  /* ── stock transfers ── */

  async findAllTransfers(query: PaginationQueryDto) {
    const { page, limit } = query;
    const { data, total } = await this.warehousesRepository.findAllTransfers(
      page,
      limit,
    );

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  }

  async findTransfer(id: string) {
    const transfer = await this.warehousesRepository.findTransferById(id);
    if (!transfer) {
      throw new NotFoundException(`Stock transfer ${id} was not found.`);
    }
    return transfer;
  }

  async createTransfer(data: CreateStockTransferDto) {
    if (data.status && data.status !== 'DRAFT' && data.status !== 'IN_TRANSIT') {
      throw invalid({ status: 'A new transfer starts as a draft or in transit' });
    }
    await this.assertRoute(data.fromId, data.toId, data.units);

    return this.warehousesRepository.createTransfer({
      ...data,
      reference: data.reference ?? `TR-${Date.now().toString().slice(-6)}`,
    });
  }

  /**
   * Status moves forward only (DRAFT -> IN_TRANSIT -> RECEIVED, with LATE in
   * between). A received transfer is closed; receiving stamps the time.
   */
  async updateTransfer(id: string, data: UpdateStockTransferDto) {
    const existing = await this.findTransfer(id);

    if (existing.status === 'RECEIVED') {
      throw invalid({ status: 'Transfer has been received and is closed' });
    }

    const next = data.status ?? existing.status;
    if (next !== existing.status && !TRANSFER_TRANSITIONS[existing.status].includes(next)) {
      throw invalid({
        status: `Cannot move a transfer from ${existing.status} to ${next}`,
      });
    }

    const rerouted =
      (data.fromId && data.fromId !== existing.fromId) ||
      (data.toId && data.toId !== existing.toId) ||
      (data.units !== undefined && data.units !== existing.units);
    if (rerouted) {
      if (existing.status !== 'DRAFT') {
        throw invalid({ units: 'Route and units are fixed once the transfer has left' });
      }
      await this.assertRoute(
        data.fromId ?? existing.fromId,
        data.toId ?? existing.toId,
        data.units ?? existing.units,
        id,
      );
    }

    return this.warehousesRepository.updateTransfer(id, {
      ...data,
      ...(next === 'RECEIVED' ? { receivedAt: new Date() } : {}),
    });
  }

  async removeTransfer(id: string) {
    const existing = await this.findTransfer(id);
    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft transfers can be deleted — stock is already on the move.',
      );
    }
    return this.warehousesRepository.removeTransfer(id);
  }

  /**
   * Two different, existing sites, and never more units than the source holds
   * after what it has already committed to other open transfers.
   */
  private async assertRoute(
    fromId: string,
    toId: string,
    units: number,
    excludeId?: string,
  ) {
    if (fromId === toId) {
      throw invalid({ toId: 'A transfer must move stock between two different warehouses' });
    }

    const [from, to] = await Promise.all([
      this.warehousesRepository.findById(fromId),
      this.warehousesRepository.findById(toId),
    ]);
    if (!from) throw invalid({ fromId: 'Source warehouse was not found' });
    if (!to) throw invalid({ toId: 'Destination warehouse was not found' });

    const [stored, committed] = await Promise.all([
      this.warehousesRepository.storedUnits(),
      this.warehousesRepository.committedOutbound(fromId, excludeId),
    ]);
    const available = (stored[fromId] ?? 0) - committed;
    if (units > available) {
      throw invalid({
        units: `${from.name} has only ${Math.max(0, available)} unit(s) available to transfer`,
      });
    }
  }
}
