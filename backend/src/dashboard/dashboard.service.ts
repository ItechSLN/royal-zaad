import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type DashboardSummary = {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  revenueByMonth: { month: string; total: number }[];
  topSellingProducts: {
    productId: string;
    name: string;
    category: string;
    stock: number;
    quantitySold: number;
    revenue: number;
  }[];
  outOfStockProducts: { productId: string; name: string; sku: string }[];
  recentOrders: { id: string; orderNumber: string; customerName: string; total: number; status: string }[];
};

const MONTHS_OF_HISTORY = 6;

/** Cancelled and refunded orders carry no revenue and sold nothing. */
const NOT_REVENUE = ['CANCELLED', 'REFUNDED'] as const;

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<DashboardSummary> {
    const monthsAgo = new Date();
    monthsAgo.setMonth(monthsAgo.getMonth() - (MONTHS_OF_HISTORY - 1));
    monthsAgo.setDate(1);
    monthsAgo.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalProducts,
      revenueOrders,
      topSellingGroups,
      outOfStockInventory,
      recentOrders,
      totalOrdersAllTime,
      totalRevenueAllTime,
    ] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.product.count(),
      this.prisma.order.findMany({
        where: { status: { notIn: [...NOT_REVENUE] }, createdAt: { gte: monthsAgo } },
        select: { createdAt: true, total: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { status: { notIn: [...NOT_REVENUE] } } },
        _sum: { quantity: true, total: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
      this.prisma.inventory.findMany({
        where: { quantity: { lte: 0 } },
        include: { product: { select: { id: true, name: true, sku: true } } },
        take: 10,
      }),
      this.prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { customer: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.order.count({ where: { status: { not: 'CANCELLED' } } }),
      this.prisma.order.aggregate({
        where: { status: { notIn: [...NOT_REVENUE] } },
        _sum: { total: true },
      }),
    ]);

    const revenueByMonth = this.bucketByMonth(revenueOrders, monthsAgo);

    const topProductIds = topSellingGroups.map((group) => group.productId);
    const topProducts = topProductIds.length
      ? await this.prisma.product.findMany({
          where: { id: { in: topProductIds } },
          select: {
            id: true,
            name: true,
            category: { select: { name: true } },
            inventory: { select: { quantity: true } },
          },
        })
      : [];

    const topSellingProducts = topSellingGroups.map((group) => {
      const product = topProducts.find((p) => p.id === group.productId);
      return {
        productId: group.productId,
        name: product?.name ?? 'Unknown product',
        category: product?.category?.name ?? 'Uncategorized',
        stock: product?.inventory?.quantity ?? 0,
        quantitySold: group._sum.quantity ?? 0,
        revenue: Number(group._sum.total ?? 0),
      };
    });

    return {
      totalCustomers,
      totalOrders: totalOrdersAllTime,
      totalRevenue: Number(totalRevenueAllTime._sum.total ?? 0),
      totalProducts,
      revenueByMonth,
      topSellingProducts,
      outOfStockProducts: outOfStockInventory.map((inv) => ({
        productId: inv.product.id,
        name: inv.product.name,
        sku: inv.product.sku,
      })),
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: `${order.customer.firstName} ${order.customer.lastName}`,
        total: Number(order.total),
        status: order.status,
      })),
    };
  }

  private bucketByMonth(
    orders: { createdAt: Date; total: Prisma.Decimal }[],
    since: Date,
  ): { month: string; total: number }[] {
    const buckets = new Map<string, number>();

    for (let i = 0; i < MONTHS_OF_HISTORY; i++) {
      const date = new Date(since.getFullYear(), since.getMonth() + i, 1);
      buckets.set(this.monthKey(date), 0);
    }

    for (const order of orders) {
      const key = this.monthKey(order.createdAt);
      buckets.set(key, (buckets.get(key) ?? 0) + Number(order.total));
    }

    return Array.from(buckets.entries()).map(([month, total]) => ({
      month,
      total: Math.round(total * 100) / 100,
    }));
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}
