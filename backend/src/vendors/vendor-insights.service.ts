import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { VendorContext } from './vendor.guard';

const round = (n: number) => Math.round(n * 100) / 100;
const LIVE: Prisma.VendorOrderWhereInput = { status: { notIn: ['CANCELLED', 'REFUNDED'] } };

/** Earnings a shop can be paid: delivered, from a paid (not refunded) checkout, not yet in a payout. */
export const payableWhere = (shopId: string): Prisma.VendorOrderWhereInput => ({
  shopId,
  status: 'DELIVERED',
  payoutId: null,
  order: { payment: { status: 'PAID' } },
});

@Injectable()
export class VendorInsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async analytics(ctx: VendorContext, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000);
    const inPeriod: Prisma.VendorOrderWhereInput = { shopId: ctx.shopId, createdAt: { gte: since } };

    const [byStatus, totals, recent, top, lowStock, productStates] = await Promise.all([
      this.prisma.vendorOrder.groupBy({ by: ['status'], where: inPeriod, _count: true }),
      this.prisma.vendorOrder.aggregate({
        where: { ...inPeriod, ...LIVE },
        _sum: { total: true, vendorNet: true, commissionAmount: true },
        _count: true,
      }),
      this.prisma.vendorOrder.findMany({
        where: { ...inPeriod, ...LIVE },
        select: { createdAt: true, total: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId', 'productName'],
        where: { shopId: ctx.shopId, vendorOrder: { ...LIVE, createdAt: { gte: since } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { total: 'desc' } },
        take: 5,
      }),
      this.prisma.$queryRaw<{ productId: string; name: string; available: number; reorderAt: number }[]>`
        SELECT i."productId", p."name", (i."quantity" - i."reserved")::int AS available, i."reorderAt"
        FROM "Inventory" i JOIN "Product" p ON p."id" = i."productId"
        WHERE p."shopId" = ${ctx.shopId} AND p."archivedAt" IS NULL
          AND (i."quantity" - i."reserved") <= i."reorderAt"
        ORDER BY available ASC LIMIT 10`,
      this.prisma.product.groupBy({
        by: ['isActive', 'moderationStatus'],
        where: { shopId: ctx.shopId, archivedAt: null },
        _count: true,
      }),
    ]);

    // Daily series, every day present (zero-filled) so charts don't skip.
    const daily = new Map<string, { date: string; orders: number; sales: number }>();
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(Date.now() - d * 86_400_000).toISOString().slice(0, 10);
      daily.set(date, { date, orders: 0, sales: 0 });
    }
    for (const row of recent) {
      const bucket = daily.get(row.createdAt.toISOString().slice(0, 10));
      if (bucket) {
        bucket.orders += 1;
        bucket.sales = round(bucket.sales + Number(row.total));
      }
    }

    const gross = Number(totals._sum.total ?? 0);
    const count = productStates.reduce(
      (acc, row) => {
        if (row.moderationStatus === 'PENDING_REVIEW') acc.pendingReview += row._count;
        else if (row.moderationStatus !== 'APPROVED') acc.rejectedOrRemoved += row._count;
        else if (row.isActive) acc.published += row._count;
        else acc.draft += row._count;
        return acc;
      },
      { published: 0, draft: 0, pendingReview: 0, rejectedOrRemoved: 0 },
    );

    return {
      periodDays: days,
      orders: {
        total: totals._count,
        byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count])),
      },
      grossSales: round(gross),
      commission: round(Number(totals._sum.commissionAmount ?? 0)),
      netEarnings: round(Number(totals._sum.vendorNet ?? 0)),
      averageOrderValue: totals._count ? round(gross / totals._count) : 0,
      daily: [...daily.values()],
      topProducts: top.map((row) => ({
        productId: row.productId,
        name: row.productName,
        units: row._sum.quantity ?? 0,
        revenue: round(Number(row._sum.total ?? 0)),
      })),
      lowStock,
      products: count,
    };
  }

  async payouts(ctx: VendorContext) {
    const [payable, pending, payouts] = await Promise.all([
      this.prisma.vendorOrder.aggregate({ where: payableWhere(ctx.shopId), _sum: { vendorNet: true }, _count: true }),
      this.prisma.vendorOrder.aggregate({
        where: {
          shopId: ctx.shopId,
          status: { in: ['PROCESSING', 'SHIPPED'] },
          order: { payment: { status: 'PAID' } },
        },
        _sum: { vendorNet: true },
      }),
      this.prisma.vendorPayout.findMany({
        where: { vendorId: ctx.vendorId },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { _count: { select: { vendorOrders: true } } },
      }),
    ]);

    return {
      balance: round(Number(payable._sum.vendorNet ?? 0)),
      payableOrders: payable._count,
      pendingClearance: round(Number(pending._sum.vendorNet ?? 0)),
      payouts,
    };
  }
}
