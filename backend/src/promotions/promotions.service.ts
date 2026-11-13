import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  CreatePromotionsDto,
  UpdatePromotionsDto,
} from './dto/promotions.dto';
import type { PromotionsEntity } from './entities/promotions.entity';
import { PromotionsRepository } from './promotions.repository';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { PrismaService } from '../prisma/prisma.service';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

/** The admin form sends yyyy-mm-dd; an end date covers that whole day (UTC). */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const toDate = (value: string, endOfDay = false) =>
  new Date(DATE_ONLY.test(value) && endOfDay ? `${value}T23:59:59.999Z` : value);

@Injectable()
export class PromotionsService {
  constructor(private readonly promotionsRepository: PromotionsRepository) {}

  async findAll(
    query: PaginationQueryDto,
    isStaff = false,
  ): Promise<{ data: PromotionsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.promotionsRepository.findAll(
      page,
      limit,
      isStaff ? undefined : new Date(),
    );

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<PromotionsEntity> {
    const promotion = await this.promotionsRepository.findById(id);

    if (!promotion) {
      throw new NotFoundException(`Promotion ${id} was not found.`);
    }

    return promotion;
  }

  async create(data: CreatePromotionsDto): Promise<PromotionsEntity> {
    this.assertDiscountValueIsSane(data.discountType, data.discountValue);

    const startsAt = toDate(data.startsAt);
    const endsAt = toDate(data.endsAt, true);
    this.assertWindowIsSane(startsAt, endsAt);
    await this.assertProductsExist(data.productIds);

    return this.promotionsRepository.create({ ...data, startsAt, endsAt });
  }

  async update(
    id: string,
    data: UpdatePromotionsDto,
  ): Promise<PromotionsEntity> {
    const existing = await this.findOne(id);

    if (data.discountValue !== undefined || data.discountType !== undefined) {
      this.assertDiscountValueIsSane(
        data.discountType ?? existing.discountType,
        data.discountValue ?? Number(existing.discountValue),
      );
    }

    const startsAt = data.startsAt ? toDate(data.startsAt) : undefined;
    const endsAt = data.endsAt ? toDate(data.endsAt, true) : undefined;
    this.assertWindowIsSane(startsAt ?? existing.startsAt, endsAt ?? existing.endsAt);
    await this.assertProductsExist(data.productIds);

    return this.promotionsRepository.update(id, { ...data, startsAt, endsAt });
  }

  async remove(id: string): Promise<PromotionsEntity> {
    await this.findOne(id);
    return this.promotionsRepository.remove(id);
  }

  /**
   * Best (largest) per-unit discount from any active promotion covering this product,
   * applied against unitPrice. Returns 0 when no promotion applies.
   */
  async bestDiscountForProduct(
    productId: string,
    unitPrice: number,
    at: Date,
    client?: PrismaClientOrTx,
  ): Promise<number> {
    const promotions = await this.promotionsRepository.findActiveForProduct(productId, at, client);

    return promotions.reduce((best, promo) => {
      const discount =
        promo.discountType === 'PERCENTAGE'
          ? Math.round(unitPrice * (Number(promo.discountValue) / 100) * 100) / 100
          : Math.min(Number(promo.discountValue), unitPrice);

      return Math.max(best, discount);
    }, 0);
  }

  private assertWindowIsSane(startsAt: Date, endsAt: Date): void {
    if (endsAt <= startsAt) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { endsAt: 'End date must be after the start date' },
      });
    }
  }

  private async assertProductsExist(productIds?: string[]): Promise<void> {
    if (!productIds?.length) return;

    const found = await this.promotionsRepository.countProducts(productIds);
    if (found !== productIds.length) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { productIds: 'One or more selected products no longer exist' },
      });
    }
  }

  private assertDiscountValueIsSane(discountType: string, discountValue: number): void {
    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { discountValue: 'Percentage discount cannot exceed 100' },
      });
    }
  }
}
