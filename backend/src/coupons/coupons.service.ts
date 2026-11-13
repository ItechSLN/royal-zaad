import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { CreateCouponsDto, UpdateCouponsDto } from './dto/coupons.dto';
import type { CouponsEntity } from './entities/coupons.entity';
import { CouponsRepository } from './coupons.repository';
import { PaginationQueryDto } from '../common/pagination-query.data';
import { PrismaService } from '../prisma/prisma.service';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

/** The admin form sends yyyy-mm-dd; an expiry date covers that whole day (UTC). */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const toDate = (value: string, endOfDay = false) =>
  new Date(DATE_ONLY.test(value) && endOfDay ? `${value}T23:59:59.999Z` : value);

@Injectable()
export class CouponsService {
  constructor(private readonly couponsRepository: CouponsRepository) {}

  async findAll(query: PaginationQueryDto): Promise<{ data: CouponsEntity[]; meta: any }> {
    const { page, limit } = query;
    const { data, total } = await this.couponsRepository.findAll(page, limit);

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

  async findOne(id: string): Promise<CouponsEntity> {
    const coupon = await this.couponsRepository.findById(id);

    if (!coupon) {
      throw new NotFoundException(`Coupon ${id} was not found.`);
    }

    return coupon;
  }

  create(data: CreateCouponsDto): Promise<CouponsEntity> {
    this.assertDiscountValueIsSane(data.discountType, data.discountValue);

    const startsAt = toDate(data.startsAt);
    const expiresAt = data.expiresAt ? toDate(data.expiresAt, true) : null;
    this.assertWindowIsSane(startsAt, expiresAt);

    return this.couponsRepository.create({ ...data, startsAt, expiresAt });
  }

  async update(id: string, data: UpdateCouponsDto): Promise<CouponsEntity> {
    const existing = await this.findOne(id);

    if (data.discountValue !== undefined || data.discountType !== undefined) {
      this.assertDiscountValueIsSane(
        data.discountType ?? existing.discountType,
        data.discountValue ?? Number(existing.discountValue),
      );
    }

    // `expiresAt: null` clears the expiry; undefined leaves it as it is.
    const startsAt = data.startsAt ? toDate(data.startsAt) : undefined;
    const expiresAt =
      data.expiresAt === undefined
        ? undefined
        : data.expiresAt
          ? toDate(data.expiresAt, true)
          : null;
    this.assertWindowIsSane(
      startsAt ?? existing.startsAt,
      expiresAt === undefined ? existing.expiresAt : expiresAt,
    );

    return this.couponsRepository.update(id, { ...data, startsAt, expiresAt });
  }

  async remove(id: string): Promise<CouponsEntity> {
    await this.findOne(id);

    // Deleting would silently unlink the coupon from the orders it discounted.
    const orders = await this.couponsRepository.countOrders(id);
    if (orders > 0) {
      throw new BadRequestException(
        `Coupon has been used on ${orders} order(s) — deactivate it instead of deleting it.`,
      );
    }

    return this.couponsRepository.remove(id);
  }

  /**
   * Validates a coupon code against order-time constraints (active window, usage limit,
   * minimum purchase). Throws BadRequestException with a specific reason on failure.
   * Accepts an optional transaction client so callers can validate inside a $transaction.
   */
  async validateForOrder(
    code: string,
    subtotal: number,
    client?: PrismaClientOrTx,
  ): Promise<CouponsEntity> {
    const coupon = await this.couponsRepository.findByCode(code, client);

    if (!coupon) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { couponCode: 'Coupon not found' },
      });
    }

    if (!coupon.isActive) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { couponCode: 'Coupon is not active' },
      });
    }

    const now = new Date();
    if (coupon.startsAt > now) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { couponCode: 'Coupon is not yet active' },
      });
    }

    if (coupon.expiresAt && coupon.expiresAt < now) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { couponCode: 'Coupon has expired' },
      });
    }

    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { couponCode: 'Coupon usage limit has been reached' },
      });
    }

    if (coupon.minimumPurchase && subtotal < Number(coupon.minimumPurchase)) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { couponCode: `Order must be at least ${coupon.minimumPurchase} to use this coupon` },
      });
    }

    return coupon;
  }

  /** Read-only preview for the cart page — validates without redeeming. */
  async preview(code: string, subtotal: number): Promise<{ code: string; discount: number; total: number }> {
    const coupon = await this.validateForOrder(code, subtotal);
    const discount = this.calculateDiscount(coupon, subtotal);

    return {
      code: coupon.code,
      discount,
      total: Math.max(0, Math.round((subtotal - discount) * 100) / 100),
    };
  }

  calculateDiscount(coupon: CouponsEntity, subtotal: number): number {
    if (coupon.discountType === 'PERCENTAGE') {
      return Math.round(subtotal * (Number(coupon.discountValue) / 100) * 100) / 100;
    }

    return Math.min(Number(coupon.discountValue), subtotal);
  }

  redeem(id: string, client?: PrismaClientOrTx): Promise<CouponsEntity> {
    return this.couponsRepository.incrementUsage(id, client);
  }

  release(id: string, client?: PrismaClientOrTx): Promise<void> {
    return this.couponsRepository.decrementUsage(id, client);
  }

  private assertWindowIsSane(startsAt: Date, expiresAt: Date | null): void {
    if (expiresAt && expiresAt <= startsAt) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { expiresAt: 'Expiry date must be after the start date' },
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
