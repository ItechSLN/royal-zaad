import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type { CreatePayoutDto, PayoutQueryDto, UpdatePayoutDto } from './dto/marketplace-admin.dto';
import { MarketplaceAuditService, pageMeta, round2 } from './marketplace-admin.support';

/**
 * Sub-orders whose money the platform holds for the vendor: the checkout was
 * paid and not fully refunded, and the shop's part is not yet in a payout.
 */
const settledUnpaid = (prisma: PrismaService): Prisma.VendorOrderWhereInput => ({
  payoutId: null,
  shop: { vendor: { isPlatform: false } },
  order: {
    payment: {
      status: 'PAID',
      refundedAmount: { lt: prisma.payment.fields.amount },
    },
  },
});

/** Delivered — payable now. */
const payableWhere = (prisma: PrismaService): Prisma.VendorOrderWhereInput => ({
  ...settledUnpaid(prisma),
  status: 'DELIVERED',
});

/** Paid but still being fulfilled — payable once delivered. */
const pendingWhere = (prisma: PrismaService): Prisma.VendorOrderWhereInput => ({
  ...settledUnpaid(prisma),
  status: { in: ['PENDING', 'PROCESSING', 'SHIPPED'] },
});

const PAYOUT_INCLUDE = {
  vendor: {
    select: {
      id: true,
      status: true,
      user: { select: { email: true, firstName: true, lastName: true } },
      shop: { select: { id: true, name: true, slug: true } },
    },
  },
  _count: { select: { vendorOrders: true } },
} satisfies Prisma.VendorPayoutInclude;

type PayoutRow = Prisma.VendorPayoutGetPayload<{ include: typeof PAYOUT_INCLUDE }>;

const toPayout = ({ _count, amount, ...p }: PayoutRow) => ({
  ...p,
  amount: Number(amount),
  subOrderCount: _count.vendorOrders,
});

@Injectable()
export class PayoutsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
  ) {}

  async findAll(query: PayoutQueryDto) {
    const { page, limit, vendorId, status } = query;
    const where: Prisma.VendorPayoutWhereInput = {
      ...(vendorId ? { vendorId } : {}),
      ...(status ? { status } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vendorPayout.findMany({
        where,
        include: PAYOUT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendorPayout.count({ where }),
    ]);
    return { data: rows.map(toPayout), meta: pageMeta(page, limit, total) };
  }

  async findOne(id: string) {
    const payout = await this.prisma.vendorPayout.findUnique({
      where: { id },
      include: {
        ...PAYOUT_INCLUDE,
        vendorOrders: {
          orderBy: { createdAt: 'asc' },
          include: { order: { select: { orderNumber: true } } },
        },
      },
    });
    if (!payout) throw new NotFoundException(`Payout ${id} was not found.`);
    const { vendorOrders, ...rest } = payout;
    return {
      ...toPayout(rest),
      subOrders: vendorOrders.map((vo) => ({
        id: vo.id,
        orderId: vo.orderId,
        orderNumber: vo.order.orderNumber,
        status: vo.status,
        total: Number(vo.total),
        commissionRate: Number(vo.commissionRate),
        commissionAmount: Number(vo.commissionAmount),
        vendorNet: Number(vo.vendorNet),
        createdAt: vo.createdAt,
      })),
    };
  }

  /** What the platform owes each (non-platform) vendor right now. */
  async balances() {
    const [payable, pending] = await Promise.all([
      this.prisma.vendorOrder.groupBy({
        by: ['shopId'],
        where: payableWhere(this.prisma),
        _sum: { vendorNet: true },
        _count: { _all: true },
      }),
      this.prisma.vendorOrder.groupBy({
        by: ['shopId'],
        where: pendingWhere(this.prisma),
        _sum: { vendorNet: true },
        _count: { _all: true },
      }),
    ]);

    const shopIds = [...new Set([...payable, ...pending].map((g) => g.shopId))];
    const shops = await this.prisma.shop.findMany({
      where: { id: { in: shopIds } },
      select: {
        id: true,
        name: true,
        slug: true,
        vendor: { select: { id: true, status: true, user: { select: { email: true } } } },
      },
    });

    const data = shops.map((shop) => {
      const p = payable.find((g) => g.shopId === shop.id);
      const q = pending.find((g) => g.shopId === shop.id);
      return {
        vendorId: shop.vendor.id,
        vendorStatus: shop.vendor.status,
        email: shop.vendor.user?.email ?? null,
        shop: { id: shop.id, name: shop.name, slug: shop.slug },
        payableAmount: round2(Number(p?._sum.vendorNet ?? 0)),
        payableSubOrders: p?._count._all ?? 0,
        pendingAmount: round2(Number(q?._sum.vendorNet ?? 0)),
        pendingSubOrders: q?._count._all ?? 0,
      };
    });
    data.sort((a, b) => b.payableAmount - a.payableAmount || b.pendingAmount - a.pendingAmount);
    return { data };
  }

  /**
   * Claims every currently payable sub-order of the vendor into a new PENDING
   * payout. The claim is a single conditional UPDATE ("payoutId" IS NULL), so
   * a concurrent payout can never take the same sub-order: the second one
   * waits on the row lock, re-checks, and finds it taken.
   */
  async create(dto: CreatePayoutDto, actor: AuthenticatedUser) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: dto.vendorId },
      select: { id: true, isPlatform: true },
    });
    if (!vendor) {
      throw new BadRequestException({ message: 'Validation failed', errors: { vendorId: 'Vendor not found' } });
    }
    if (vendor.isPlatform) {
      throw new BadRequestException({ message: "The platform's own shop is not paid out" });
    }

    const id = await this.prisma.$transaction(async (tx) => {
      const payout = await tx.vendorPayout.create({
        data: { vendorId: vendor.id, amount: 0, note: dto.note || null },
      });
      // One statement, so Postgres re-checks "payoutId" IS NULL on each row
      // after waiting for a concurrent claim's lock (same rules as payableWhere).
      const claimed = await tx.$executeRaw`
        UPDATE "VendorOrder" AS vo
           SET "payoutId" = ${payout.id}, "updatedAt" = now()
          FROM "Shop" AS s, "Payment" AS p
         WHERE s."id" = vo."shopId"
           AND s."vendorId" = ${vendor.id}
           AND p."orderId" = vo."orderId"
           AND vo."payoutId" IS NULL
           AND vo."status" = 'DELIVERED'
           AND p."status" = 'PAID'
           AND p."refundedAmount" < p."amount"`;
      if (claimed === 0) {
        throw new BadRequestException({ message: 'Nothing is payable to this vendor right now' });
      }

      const claimedRows = await tx.vendorOrder.findMany({
        where: { payoutId: payout.id },
        select: {
          vendorNet: true,
          createdAt: true,
          order: { select: { payment: { select: { currency: true } } } },
        },
        orderBy: { createdAt: 'asc' },
      });
      const amount = round2(claimedRows.reduce((sum, vo) => sum + Number(vo.vendorNet), 0));
      await tx.vendorPayout.update({
        where: { id: payout.id },
        data: {
          amount,
          currency: claimedRows[0].order.payment?.currency ?? 'USD',
          periodStart: claimedRows[0].createdAt,
          periodEnd: claimedRows[claimedRows.length - 1].createdAt,
        },
      });
      return payout.id;
    });

    const result = await this.findOne(id);
    await this.audit.record(actor.email, 'payout.create', 'VendorPayout', id, {
      vendorId: vendor.id,
      amount: result.amount,
      subOrders: result.subOrders.length,
    });
    return result;
  }

  /** PENDING → PAID (with a reference) or PENDING → CANCELLED (releases its sub-orders). */
  async update(id: string, dto: UpdatePayoutDto, actor: AuthenticatedUser) {
    const payout = await this.prisma.vendorPayout.findUnique({ where: { id } });
    if (!payout) throw new NotFoundException(`Payout ${id} was not found.`);
    if (payout.status !== 'PENDING') {
      throw new BadRequestException({
        message: `This payout is ${payout.status.toLowerCase()} and can no longer be changed`,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.vendorPayout.updateMany({
        where: { id, status: 'PENDING' },
        data:
          dto.status === 'PAID'
            ? { status: 'PAID', paidAt: new Date(), reference: dto.reference, ...(dto.note !== undefined ? { note: dto.note } : {}) }
            : { status: 'CANCELLED', ...(dto.note !== undefined ? { note: dto.note } : {}) },
      });
      if (claimed.count === 0) {
        throw new ConflictException({ message: 'This payout changed meanwhile — reload and retry' });
      }
      if (dto.status === 'CANCELLED') {
        await tx.vendorOrder.updateMany({ where: { payoutId: id }, data: { payoutId: null } });
      }
    });

    await this.audit.record(
      actor.email,
      dto.status === 'PAID' ? 'payout.paid' : 'payout.cancel',
      'VendorPayout',
      id,
      { amount: Number(payout.amount), reference: dto.reference ?? null },
    );
    return this.findOne(id);
  }
}
