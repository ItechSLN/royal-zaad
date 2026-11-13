import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ADMIN_ROLE_NAME } from '../roles/roles.constants';
import { SELLABLE_PRODUCT_WHERE, SELLING_SHOP_WHERE } from '../marketplace/marketplace.constants';
import type { CreateReportDto, ReportQueryDto, ResolveReportDto } from './dto/marketplace-admin.dto';
import { MarketplaceAuditService, pageMeta } from './marketplace-admin.support';
import { ModerationService } from './moderation.service';
import { VendorsAdminService } from './vendors-admin.service';

const REPORT_INCLUDE = {
  reporter: { select: { id: true, email: true } },
  product: { select: { id: true, name: true, slug: true, moderationStatus: true } },
  shop: {
    select: {
      id: true,
      name: true,
      slug: true,
      vendor: { select: { id: true, status: true, isPlatform: true } },
    },
  },
} satisfies Prisma.ReportInclude;

@Injectable()
export class MarketplaceReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
    private readonly moderation: ModerationService,
    private readonly vendors: VendorsAdminService,
  ) {}

  /** A signed-in user flags a product or shop they can see. */
  async create(user: AuthenticatedUser, dto: CreateReportDto) {
    let productId: string | null = null;
    let shopId: string;

    if (dto.targetType === 'PRODUCT') {
      if (dto.shopId !== undefined) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { shopId: 'Send only productId when reporting a product' },
        });
      }
      const product = await this.prisma.product.findFirst({
        where: { id: dto.productId, ...SELLABLE_PRODUCT_WHERE },
        select: { id: true, shopId: true },
      });
      if (!product) throw new NotFoundException('Product not found');
      productId = product.id;
      // Kept alongside the product so admins see which shop it came from.
      shopId = product.shopId;
    } else {
      if (dto.productId !== undefined) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { productId: 'Send only shopId when reporting a shop' },
        });
      }
      const shop = await this.prisma.shop.findFirst({
        where: { id: dto.shopId, ...SELLING_SHOP_WHERE },
        select: { id: true },
      });
      if (!shop) throw new NotFoundException('Shop not found');
      shopId = shop.id;
    }

    const report = await this.prisma.report.create({
      data: {
        reporterId: user.id,
        targetType: dto.targetType,
        productId,
        shopId,
        reason: dto.reason,
        details: dto.details || null,
      },
    });
    return {
      id: report.id,
      targetType: report.targetType,
      reason: report.reason,
      status: report.status,
      createdAt: report.createdAt,
      message: 'Thanks — our team will review your report.',
    };
  }

  async findAll(query: ReportQueryDto) {
    const { page, limit, status, targetType } = query;
    const where: Prisma.ReportWhereInput = {
      ...(status ? { status } : {}),
      ...(targetType ? { targetType } : {}),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.report.findMany({
        where,
        include: REPORT_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.report.count({ where }),
    ]);
    return { data, meta: pageMeta(page, limit, total) };
  }

  async resolve(id: string, dto: ResolveReportDto, actor: AuthenticatedUser) {
    const report = await this.prisma.report.findUnique({
      where: { id },
      include: { product: { select: { shopId: true } } },
    });
    if (!report) throw new NotFoundException(`Report ${id} was not found.`);
    if (report.status !== 'OPEN') {
      throw new BadRequestException({ message: `This report is already ${report.status.toLowerCase()}` });
    }
    if (dto.action && dto.status !== 'RESOLVED') {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { action: 'An action can only be taken when resolving a report' },
      });
    }

    let actionResult: string | undefined;
    if (dto.action === 'REMOVE_PRODUCT') {
      if (report.targetType !== 'PRODUCT' || !report.productId) {
        throw new BadRequestException({
          message: 'Validation failed',
          errors: { action: 'REMOVE_PRODUCT only applies to product reports' },
        });
      }
      await this.moderation.setStatus(report.productId, 'REMOVED', dto.resolution, actor, { reportId: id });
      actionResult = 'Product removed from the marketplace';
    } else if (dto.action === 'SUSPEND_VENDOR') {
      if (actor.roleName !== ADMIN_ROLE_NAME) {
        throw new ForbiddenException('Only an Admin can suspend a vendor');
      }
      const shopId = report.shopId ?? report.product?.shopId;
      const shop = shopId
        ? await this.prisma.shop.findUnique({ where: { id: shopId }, select: { vendorId: true } })
        : null;
      if (!shop) throw new BadRequestException({ message: 'The reported shop no longer exists' });
      const result = await this.vendors.changeStatus(
        shop.vendorId,
        { status: 'SUSPENDED', reason: dto.resolution },
        actor,
      );
      actionResult = result.message;
    }

    const claimed = await this.prisma.report.updateMany({
      where: { id, status: 'OPEN' },
      data: { status: dto.status, resolution: dto.resolution, resolvedAt: new Date() },
    });
    if (claimed.count === 0) {
      throw new ConflictException({ message: 'This report was handled meanwhile — reload' });
    }
    await this.audit.record(
      actor.email,
      dto.status === 'RESOLVED' ? 'report.resolve' : 'report.dismiss',
      'Report',
      id,
      { resolution: dto.resolution, action: dto.action ?? null },
    );

    const updated = await this.prisma.report.findUniqueOrThrow({ where: { id }, include: REPORT_INCLUDE });
    return { ...updated, ...(actionResult ? { actionResult } : {}) };
  }
}
