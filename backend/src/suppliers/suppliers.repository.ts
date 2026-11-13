import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreateSuppliersDto,
  UpdateSuppliersDto,
} from './dto/suppliers.dto';
import type { SuppliersEntity } from './entities/suppliers.entity';

@Injectable()
export class SuppliersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
    where: Prisma.SupplierWhereInput = {},
  ): Promise<{ data: SuppliersEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              purchaseOrders: {
                where: { status: { notIn: ['RECEIVED', 'CANCELLED'] } },
              },
            },
          },
        },
      }),
      this.prisma.supplier.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<SuppliersEntity | null> {
    return this.prisma.supplier.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            purchaseOrders: {
              where: { status: { notIn: ['RECEIVED', 'CANCELLED'] } },
            },
          },
        },
      },
    });
  }

  create(data: CreateSuppliersDto): Promise<SuppliersEntity> {
    return this.prisma.supplier.create({
      data: data,
    });
  }

  update(id: string, data: UpdateSuppliersDto): Promise<SuppliersEntity> {
    return this.prisma.supplier.update({
      where: { id },
      data: data,
    });
  }

  countPurchaseOrders(supplierId: string): Promise<number> {
    return this.prisma.purchaseOrder.count({ where: { supplierId } });
  }

  remove(id: string): Promise<SuppliersEntity> {
    return this.prisma.supplier.delete({ where: { id } });
  }
}
