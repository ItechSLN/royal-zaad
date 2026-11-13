import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ReportsSummary = {
  ordersByStatus: { status: string; count: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  salesOverTime: { date: string; revenue: number; orders: number }[];
};

const DAYS_OF_HISTORY = 30;

/** Cancelled and refunded orders carry no revenue. */
const NOT_REVENUE = ['CANCELLED', 'REFUNDED'] as const;

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<ReportsSummary> {
    const since = new Date();
    since.setDate(since.getDate() - (DAYS_OF_HISTORY - 1));
    since.setHours(0, 0, 0, 0);

    const [statusGroups, orderItems, recentOrders] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      this.prisma.orderItem.findMany({
        where: { order: { status: { notIn: [...NOT_REVENUE] } } },
        select: {
          total: true,
          product: { select: { category: { select: { name: true } } } },
        },
      }),
      this.prisma.order.findMany({
        where: { status: { notIn: [...NOT_REVENUE] }, createdAt: { gte: since } },
        select: { createdAt: true, total: true },
      }),
    ]);

    const revenueByCategoryMap = new Map<string, number>();
    for (const item of orderItems) {
      const category = item.product.category?.name ?? 'Uncategorized';
      revenueByCategoryMap.set(category, (revenueByCategoryMap.get(category) ?? 0) + Number(item.total));
    }

    const salesOverTime = this.bucketByDay(recentOrders, since);

    return {
      ordersByStatus: statusGroups.map((group) => ({
        status: group.status,
        count: group._count.status,
      })),
      revenueByCategory: Array.from(revenueByCategoryMap.entries()).map(([category, revenue]) => ({
        category,
        revenue: Math.round(revenue * 100) / 100,
      })),
      salesOverTime,
    };
  }

  private bucketByDay(
    orders: { createdAt: Date; total: Prisma.Decimal }[],
    since: Date,
  ): { date: string; revenue: number; orders: number }[] {
    const buckets = new Map<string, { revenue: number; orders: number }>();

    for (let i = 0; i < DAYS_OF_HISTORY; i++) {
      const date = new Date(since);
      date.setDate(since.getDate() + i);
      buckets.set(this.dayKey(date), { revenue: 0, orders: 0 });
    }

    for (const order of orders) {
      const bucket = buckets.get(this.dayKey(order.createdAt));
      if (!bucket) continue;
      bucket.revenue += Number(order.total);
      bucket.orders += 1;
    }

    return Array.from(buckets.entries()).map(([date, { revenue, orders }]) => ({
      date,
      revenue: Math.round(revenue * 100) / 100,
      orders,
    }));
  }

  /** Local calendar day, matching how `since` and the buckets are built. */
  private dayKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
