import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type {
  CreatePromotionsDto,
  UpdatePromotionsDto,
} from './dto/promotions.dto';

/** DTO payloads with their date strings already parsed by the service. */
type PromotionWrite<T> = Omit<T, 'startsAt' | 'endsAt'> & {
  startsAt?: Date;
  endsAt?: Date;
};
import type { PromotionsEntity } from './entities/promotions.entity';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

const PROMOTION_INCLUDE = {
  products: { select: { id: true, name: true, sku: true } },
} as const;

@Injectable()
export class PromotionsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** With `runningAt`, only promotions live at that moment are listed. */
  async findAll(
    page: number,
    limit: number,
    runningAt?: Date,
  ): Promise<{ data: PromotionsEntity[]; total: number }> {
    const where: Prisma.PromotionWhereInput = runningAt
      ? { isActive: true, startsAt: { lte: runningAt }, endsAt: { gte: runningAt } }
      : {};

    const [data, total] = await Promise.all([
      this.prisma.promotion.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: PROMOTION_INCLUDE,
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<PromotionsEntity | null> {
    return this.prisma.promotion.findUnique({
      where: { id },
      include: PROMOTION_INCLUDE,
    });
  }

  create(data: PromotionWrite<CreatePromotionsDto>): Promise<PromotionsEntity> {
    const { productIds, ...rest } = data;

    return this.prisma.promotion.create({
      data: {
        ...(rest as Prisma.PromotionUncheckedCreateInput),
        products: productIds ? { connect: productIds.map((id) => ({ id })) } : undefined,
      },
      include: PROMOTION_INCLUDE,
    });
  }

  update(id: string, data: PromotionWrite<UpdatePromotionsDto>): Promise<PromotionsEntity> {
    const { productIds, ...rest } = data;

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...(rest as Prisma.PromotionUncheckedUpdateInput),
        products: productIds ? { set: productIds.map((id) => ({ id })) } : undefined,
      },
      include: PROMOTION_INCLUDE,
    });
  }

  remove(id: string): Promise<PromotionsEntity> {
    return this.prisma.promotion.delete({
      where: { id },
      include: PROMOTION_INCLUDE,
    });
  }

  countProducts(ids: string[]): Promise<number> {
    return this.prisma.product.count({ where: { id: { in: ids } } });
  }

  /** Active, in-window promotions covering the given product — used at order time. */
  findActiveForProduct(productId: string, at: Date, client: PrismaClientOrTx = this.prisma): Promise<PromotionsEntity[]> {
    return client.promotion.findMany({
      where: {
        isActive: true,
        startsAt: { lte: at },
        endsAt: { gte: at },
        products: { some: { id: productId } },
      },
      include: PROMOTION_INCLUDE,
    });
  }
}
