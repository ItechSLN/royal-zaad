import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreateSuppliersDto,
  UpdateSuppliersDto,
} from './dto/suppliers.dto';
import type { SuppliersEntity } from './entities/suppliers.entity';
import { SuppliersRepository } from './suppliers.repository';
import type { SuppliersQueryDto } from './dto/suppliers.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly suppliersRepository: SuppliersRepository) {}

  async findAll(
    query: SuppliersQueryDto,
  ): Promise<{ data: SuppliersEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.suppliersRepository.findAll(
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
  private buildWhere(q: SuppliersQueryDto): Prisma.SupplierWhereInput {
    const where: Prisma.SupplierWhereInput[] = [];
    if (q.status) where.push({ status: q.status });
    if (q.category) where.push({ category: q.category });
    if (q.search)
      where.push({ name: { contains: q.search, mode: 'insensitive' } });
    return where.length ? { AND: where } : {};
  }

  async findOne(id: string): Promise<SuppliersEntity> {
    const record = await this.suppliersRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Supplier ${id} was not found.`);
    }
    return record;
  }

  create(data: CreateSuppliersDto): Promise<SuppliersEntity> {
    return this.suppliersRepository.create(data);
  }

  async update(id: string, data: UpdateSuppliersDto): Promise<SuppliersEntity> {
    await this.findOne(id);
    return this.suppliersRepository.update(id, data);
  }

  async remove(id: string): Promise<SuppliersEntity> {
    await this.findOne(id);
    const orders = await this.suppliersRepository.countPurchaseOrders(id);
    if (orders > 0) {
      throw new BadRequestException(
        `Supplier cannot be deleted while ${orders} purchase order(s) reference it — set it inactive instead.`,
      );
    }
    return this.suppliersRepository.remove(id);
  }
}
