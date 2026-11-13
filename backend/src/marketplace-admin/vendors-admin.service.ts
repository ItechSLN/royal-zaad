import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma, Shop, VendorStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GeocoderService } from '../geo/geocoder.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type {
  UpdateShopLocationDto,
  UpdateVendorCommissionDto,
  UpdateVendorStatusDto,
  VendorQueryDto,
  VendorTargetStatus,
} from './dto/marketplace-admin.dto';
import {
  MarketplaceAuditService,
  VendorMailService,
  pageMeta,
  round2,
  toNumber,
} from './marketplace-admin.support';

/** Which status changes an admin may make. Platform vendor: none. */
const VENDOR_TRANSITIONS: Record<VendorStatus, VendorTargetStatus[]> = {
  PENDING: ['ACTIVE', 'REJECTED'],
  ACTIVE: ['SUSPENDED'],
  SUSPENDED: ['ACTIVE'],
  REJECTED: ['ACTIVE'],
};

/** Sub-orders still being worked on — left alone when a vendor is suspended. */
const OPEN_SUB_ORDER_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED'] as const;

const VENDOR_LIST_INCLUDE = {
  user: {
    select: { id: true, email: true, firstName: true, lastName: true, emailVerifiedAt: true },
  },
  shop: {
    select: {
      id: true,
      name: true,
      slug: true,
      city: true,
      country: true,
      locationVerifiedAt: true,
      isActive: true,
      _count: { select: { products: true } },
    },
  },
} satisfies Prisma.VendorInclude;

type VendorListRow = Prisma.VendorGetPayload<{ include: typeof VENDOR_LIST_INCLUDE }>;
type VendorStats = { productCount: number; orderCount: number; grossSales: number };

/** Every shop column, with money as numbers. */
export const adminShop = (shop: Shop) => ({
  ...shop,
  shippingFlatFee: toNumber(shop.shippingFlatFee),
  freeShippingOver: toNumber(shop.freeShippingOver),
});

@Injectable()
export class VendorsAdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geocoder: GeocoderService,
    private readonly audit: MarketplaceAuditService,
    private readonly vendorMail: VendorMailService,
  ) {}

  async findAll(query: VendorQueryDto) {
    const { page, limit, status, q } = query;
    const and: Prisma.VendorWhereInput[] = [];
    if (status) and.push({ status });
    if (q) {
      const contains = { contains: q, mode: 'insensitive' as const };
      and.push({
        OR: [
          { user: { email: contains } },
          { user: { firstName: contains } },
          { user: { lastName: contains } },
          { shop: { name: contains } },
        ],
      });
    }
    const where: Prisma.VendorWhereInput = and.length ? { AND: and } : {};

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        where,
        include: VENDOR_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.vendor.count({ where }),
    ]);

    const stats = await this.statsFor(rows.map((v) => v.shop?.id).filter((id): id is string => !!id));
    return {
      data: rows.map((v) => this.toListItem(v, stats)),
      meta: pageMeta(page, limit, total),
    };
  }

  async findOne(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        user: VENDOR_LIST_INCLUDE.user,
        shop: { include: { _count: { select: { products: true } } } },
      },
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} was not found.`);

    const shop = vendor.shop;
    const stats = await this.statsFor(shop ? [shop.id] : []);
    const recent = shop
      ? await this.prisma.vendorOrder.findMany({
          where: { shopId: shop.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { order: { select: { orderNumber: true } } },
        })
      : [];

    const shopFields = (): Shop => {
      const { _count: _ignored, ...fields } = shop!;
      return fields;
    };
    return {
      ...this.vendorFields(vendor),
      user: vendor.user,
      shop: shop ? adminShop(shopFields()) : null,
      stats: this.statsOf(shop?.id, stats, shop?._count.products ?? 0),
      recentSubOrders: recent.map((vo) => ({
        id: vo.id,
        orderId: vo.orderId,
        orderNumber: vo.order.orderNumber,
        status: vo.status,
        fulfillmentMethod: vo.fulfillmentMethod,
        total: Number(vo.total),
        commissionAmount: Number(vo.commissionAmount),
        vendorNet: Number(vo.vendorNet),
        payoutId: vo.payoutId,
        createdAt: vo.createdAt,
      })),
    };
  }

  /**
   * Approve / reject / suspend / reactivate. Approval needs a verified email,
   * a complete shop address and a verified location (geocoded here if needed).
   * Suspension hides the shop's products via SELLABLE_PRODUCT_WHERE; open
   * sub-orders are left for admins to handle.
   */
  async changeStatus(id: string, dto: UpdateVendorStatusDto, actor: AuthenticatedUser) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { user: true, shop: true },
    });
    if (!vendor) throw new NotFoundException(`Vendor ${id} was not found.`);
    if (vendor.isPlatform) {
      throw new BadRequestException({ message: "The platform's own vendor can't be approved, suspended or rejected" });
    }

    const from = vendor.status;
    const to = dto.status;
    if (!VENDOR_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { status: from === to ? `Vendor is already ${from}` : `Cannot change a vendor from ${from} to ${to}` },
      });
    }

    let location: { latitude: number; longitude: number } | null = null;
    if (to === 'ACTIVE') location = await this.assertApprovable(vendor);

    const shopId = vendor.shop?.id;
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.vendor.updateMany({
        where: { id, status: from },
        data: {
          status: to,
          statusReason: to === 'ACTIVE' ? null : dto.reason,
          ...(to === 'ACTIVE' && !vendor.approvedAt ? { approvedAt: new Date() } : {}),
        },
      });
      if (claimed.count === 0) {
        throw new ConflictException({ message: 'This vendor changed meanwhile — reload and retry' });
      }
      if (location && shopId) {
        await tx.shop.update({
          where: { id: shopId },
          data: { ...location, locationVerifiedAt: new Date() },
        });
      }
    });

    const action =
      to === 'SUSPENDED' ? 'vendor.suspend'
      : to === 'REJECTED' ? 'vendor.reject'
      : from === 'SUSPENDED' ? 'vendor.reactivate'
      : 'vendor.approve';
    await this.audit.record(actor.email, action, 'Vendor', id, {
      from,
      to,
      reason: dto.reason ?? null,
      ...(location ? { geocoded: location } : {}),
    });

    this.emailStatusChange(vendor.user?.email, vendor.shop?.name ?? 'your shop', action, dto.reason);

    let message = `Vendor ${to === 'ACTIVE' ? (from === 'SUSPENDED' ? 'reactivated' : 'approved') : to.toLowerCase()}`;
    let openSubOrders: number | undefined;
    if (to === 'SUSPENDED') {
      openSubOrders = shopId
        ? await this.prisma.vendorOrder.count({
            where: { shopId, status: { in: [...OPEN_SUB_ORDER_STATUSES] } },
          })
        : 0;
      message += `. Their products are hidden from the storefront.${
        openSubOrders
          ? ` ${openSubOrders} open sub-order(s) were left as they are and need admin handling.`
          : ''
      }`;
    }

    return { message, ...(openSubOrders !== undefined ? { openSubOrders } : {}), vendor: await this.findOne(id) };
  }

  async updateCommission(id: string, dto: UpdateVendorCommissionDto, actor: AuthenticatedUser) {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new NotFoundException(`Vendor ${id} was not found.`);
    if (vendor.isPlatform) {
      throw new BadRequestException({ message: "The platform's own shop pays no commission" });
    }
    await this.prisma.vendor.update({
      where: { id },
      data: { commissionRate: dto.commissionRate },
    });
    await this.audit.record(actor.email, 'vendor.commission', 'Vendor', id, {
      from: toNumber(vendor.commissionRate),
      to: dto.commissionRate,
    });
    return this.findOne(id);
  }

  /** Manual location verification by an admin. */
  async updateShopLocation(shopId: string, dto: UpdateShopLocationDto, actor: AuthenticatedUser) {
    const shop = await this.prisma.shop.findUnique({ where: { id: shopId } });
    if (!shop) throw new NotFoundException(`Shop ${shopId} was not found.`);
    const updated = await this.prisma.shop.update({
      where: { id: shopId },
      data: { latitude: dto.latitude, longitude: dto.longitude, locationVerifiedAt: new Date() },
    });
    await this.audit.record(actor.email, 'shop.location', 'Shop', shopId, {
      from: { latitude: shop.latitude, longitude: shop.longitude },
      to: { latitude: dto.latitude, longitude: dto.longitude },
    });
    return adminShop(updated);
  }

  /** Throws a 400 listing everything that blocks approval; returns new coordinates if geocoded. */
  private async assertApprovable(
    vendor: Prisma.VendorGetPayload<{ include: { user: true; shop: true } }>,
  ): Promise<{ latitude: number; longitude: number } | null> {
    const errors: Record<string, string> = {};
    if (!vendor.user?.emailVerifiedAt) {
      errors.email = 'The vendor has not verified their email address';
    }
    const shop = vendor.shop;
    if (!shop) {
      errors.shop = 'The vendor has not set up a shop';
    } else {
      const missing = (
        [
          ['name', 'name'],
          ['addressLine1', 'address line 1'],
          ['city', 'city'],
          ['postalCode', 'postal code'],
          ['country', 'country'],
        ] as const
      )
        .filter(([key]) => !shop[key]?.toString().trim())
        .map(([, label]) => label);
      if (missing.length) errors.shop = `The shop is missing: ${missing.join(', ')}`;
    }
    if (Object.keys(errors).length) {
      throw new BadRequestException({ message: "This vendor can't be approved yet", errors });
    }

    if (shop!.locationVerifiedAt) return null;
    const hit = await this.geocoder.geocode({
      line1: shop!.addressLine1,
      city: shop!.city,
      state: shop!.state,
      postalCode: shop!.postalCode,
      country: shop!.country,
    });
    if (!hit) {
      throw new BadRequestException({
        message: "This vendor can't be approved yet",
        errors: {
          location: `The shop address couldn't be located. Set the shop's coordinates manually (PATCH /admin/shops/${shop!.id}/location), then approve again.`,
        },
      });
    }
    return { latitude: hit.latitude, longitude: hit.longitude };
  }

  private emailStatusChange(to: string | undefined, shopName: string, action: string, reason?: string) {
    switch (action) {
      case 'vendor.approve':
        return this.vendorMail.send(
          to,
          `${shopName} is approved`,
          [`Good news — ${shopName} has been approved and your published products are now visible to customers.`],
          { label: 'Open your shop dashboard', path: '/vendor' },
        );
      case 'vendor.reactivate':
        return this.vendorMail.send(
          to,
          `${shopName} has been reactivated`,
          [`${shopName} has been reactivated. Your published products are visible to customers again.`],
          { label: 'Open your shop dashboard', path: '/vendor' },
        );
      case 'vendor.reject':
        return this.vendorMail.send(to, `Your application for ${shopName} was not approved`, [
          `We reviewed your application for ${shopName} and couldn't approve it at this time.`,
          `Reason: ${reason ?? '—'}`,
          'You can update your shop details and contact us to have it reviewed again.',
        ]);
      case 'vendor.suspend':
        return this.vendorMail.send(to, `${shopName} has been suspended`, [
          `${shopName} has been suspended and its products are no longer visible to customers.`,
          `Reason: ${reason ?? '—'}`,
          'Please contact us if you have questions about this decision.',
        ]);
    }
  }

  private async statsFor(shopIds: string[]): Promise<Map<string, { orderCount: number; grossSales: number }>> {
    const out = new Map<string, { orderCount: number; grossSales: number }>();
    if (!shopIds.length) return out;
    const [counts, sales] = await Promise.all([
      this.prisma.vendorOrder.groupBy({
        by: ['shopId'],
        where: { shopId: { in: shopIds } },
        _count: { _all: true },
      }),
      this.prisma.vendorOrder.groupBy({
        by: ['shopId'],
        where: { shopId: { in: shopIds }, status: { not: 'CANCELLED' } },
        _sum: { total: true },
      }),
    ]);
    for (const c of counts) out.set(c.shopId, { orderCount: c._count._all, grossSales: 0 });
    for (const s of sales) {
      const entry = out.get(s.shopId) ?? { orderCount: 0, grossSales: 0 };
      entry.grossSales = round2(Number(s._sum.total ?? 0));
      out.set(s.shopId, entry);
    }
    return out;
  }

  private statsOf(
    shopId: string | undefined,
    stats: Map<string, { orderCount: number; grossSales: number }>,
    productCount: number,
  ): VendorStats {
    const s = shopId ? stats.get(shopId) : undefined;
    return { productCount, orderCount: s?.orderCount ?? 0, grossSales: s?.grossSales ?? 0 };
  }

  private vendorFields(v: {
    id: string;
    status: VendorStatus;
    statusReason: string | null;
    commissionRate: Prisma.Decimal | null;
    isPlatform: boolean;
    approvedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: v.id,
      status: v.status,
      statusReason: v.statusReason,
      commissionRate: toNumber(v.commissionRate),
      isPlatform: v.isPlatform,
      approvedAt: v.approvedAt,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt,
    };
  }

  private toListItem(v: VendorListRow, stats: Map<string, { orderCount: number; grossSales: number }>) {
    const shop = v.shop;
    return {
      ...this.vendorFields(v),
      user: v.user,
      shop: shop
        ? {
            id: shop.id,
            name: shop.name,
            slug: shop.slug,
            city: shop.city,
            country: shop.country,
            locationVerifiedAt: shop.locationVerifiedAt,
            isActive: shop.isActive,
          }
        : null,
      stats: this.statsOf(shop?.id, stats, shop?._count.products ?? 0),
    };
  }
}
