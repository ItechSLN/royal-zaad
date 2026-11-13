import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateBrandsDto, UpdateBrandsDto } from './dto/brands.dto';
import type { BrandsEntity } from './entities/brands.entity';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    page: number,
    limit: number,
  ): Promise<{ data: BrandsEntity[]; total: number }> {
    const [brands, total] = await Promise.all([
      this.prisma.brand.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.brand.count(),
    ]);

    return { data: brands, total };
  }

  findById(id: string): Promise<BrandsEntity | null> {
    return this.prisma.brand.findUnique({ where: { id } });
  }

  create(data: CreateBrandsDto): Promise<BrandsEntity> {
    return this.prisma.brand.create({
      data: data as Prisma.BrandUncheckedCreateInput,
    });
  }

  update(id: string, data: UpdateBrandsDto): Promise<BrandsEntity> {
    return this.prisma.brand.update({
      where: { id },
      data: data as Prisma.BrandUncheckedUpdateInput,
    });
  }

  remove(id: string): Promise<BrandsEntity> {
    return this.prisma.brand.delete({ where: { id } });
  }

  countProducts(id: string): Promise<number> {
    return this.prisma.product.count({ where: { brandId: id } });
  }
}
