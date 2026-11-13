import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateVariantsDto, UpdateVariantsDto } from './dto/variants.dto';
import type { VariantsEntity } from './entities/variants.entity';

const VARIANT_INCLUDE = {
  warehouse: { select: { id: true, code: true, name: true } },
} as const;

@Injectable()
export class VariantsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findForProduct(productId: string): Promise<VariantsEntity[]> {
    return this.prisma.productVariant.findMany({
      where: { productId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: VARIANT_INCLUDE,
    });
  }

  findById(id: string): Promise<VariantsEntity | null> {
    return this.prisma.productVariant.findUnique({
      where: { id },
      include: VARIANT_INCLUDE,
    });
  }

  create(productId: string, data: CreateVariantsDto): Promise<VariantsEntity> {
    return this.prisma.productVariant.create({
      data: {
        ...(data as unknown as Prisma.ProductVariantUncheckedCreateInput),
        productId,
      },
      include: VARIANT_INCLUDE,
    });
  }

  update(id: string, data: UpdateVariantsDto): Promise<VariantsEntity> {
    return this.prisma.productVariant.update({
      where: { id },
      data: data,
      include: VARIANT_INCLUDE,
    });
  }

  remove(id: string): Promise<VariantsEntity> {
    return this.prisma.productVariant.delete({ where: { id } });
  }

  productExists(productId: string, publishedOnly = false): Promise<number> {
    return this.prisma.product.count({
      where: { id: productId, ...(publishedOnly ? { isActive: true } : {}) },
    });
  }
}
