import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { CouponsEntity } from './entities/coupons.entity';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

@Injectable()
export class CouponsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page: number, limit: number): Promise<{ data: CouponsEntity[]; total: number }> {
    const [data, total] = await Promise.all([
      this.prisma.coupon.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count(),
    ]);

    return { data, total };
  }

  findById(id: string): Promise<CouponsEntity | null> {
    return this.prisma.coupon.findUnique({ where: { id } });
  }

  findByCode(code: string, client: PrismaClientOrTx = this.prisma): Promise<CouponsEntity | null> {
    return client.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
  }

  async create(data: Prisma.CouponUncheckedCreateInput): Promise<CouponsEntity> {
    const existing = await this.prisma.coupon.findUnique({ where: { code: data.code } });
    if (existing) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { code: 'Coupon code must be unique' },
      });
    }

    return this.prisma.coupon.create({ data });
  }

  update(id: string, data: Prisma.CouponUncheckedUpdateInput): Promise<CouponsEntity> {
    return this.prisma.coupon.update({ where: { id }, data });
  }

  countOrders(id: string): Promise<number> {
    return this.prisma.order.count({ where: { couponId: id } });
  }

  remove(id: string): Promise<CouponsEntity> {
    return this.prisma.coupon.delete({ where: { id } });
  }

  /**
   * Claims one redemption. The limit is re-checked in the same UPDATE so two
   * checkouts racing for the last redemption cannot both succeed.
   */
  async incrementUsage(id: string, client: PrismaClientOrTx = this.prisma): Promise<CouponsEntity> {
    const claimed = await client.$executeRaw`
      UPDATE "Coupon"
      SET "usageCount" = "usageCount" + 1, "updatedAt" = now()
      WHERE id = ${id} AND ("usageLimit" IS NULL OR "usageCount" < "usageLimit")`;

    if (!claimed) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { couponCode: 'Coupon usage limit has been reached' },
      });
    }

    return client.coupon.findUniqueOrThrow({ where: { id } });
  }

  async decrementUsage(id: string, client: PrismaClientOrTx = this.prisma): Promise<void> {
    await client.coupon.updateMany({
      where: { id, usageCount: { gt: 0 } },
      data: { usageCount: { decrement: 1 } },
    });
  }
}
