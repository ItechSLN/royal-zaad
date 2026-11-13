import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import type {
  ModerateProductDto,
  ModerationDecision,
  ModerationQueryDto,
} from './dto/marketplace-admin.dto';
import { MarketplaceAuditService, VendorMailService, pageMeta } from './marketplace-admin.support';

const MODERATION_SELECT = {
  id: true,
  name: true,
  slug: true,
  sku: true,
  price: true,
  isActive: true,
  archivedAt: true,
  moderationStatus: true,
  moderationReason: true,
  createdAt: true,
  updatedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
    take: 1,
  },
  shop: {
    select: {
      id: true,
      name: true,
      slug: true,
      vendor: { select: { id: true, status: true, isPlatform: true } },
    },
  },
} satisfies Prisma.ProductSelect;

type ModerationRow = Prisma.ProductGetPayload<{ select: typeof MODERATION_SELECT }>;

const toItem = ({ images, price, ...p }: ModerationRow) => ({
  ...p,
  price: Number(price),
  image: images[0] ?? null,
});

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
    private readonly vendorMail: VendorMailService,
  ) {}

  async findAll(query: ModerationQueryDto) {
    const { page, limit, moderationStatus, shopId } = query;
    const where: Prisma.ProductWhereInput = {
      moderationStatus,
      ...(shopId ? { shopId } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        select: MODERATION_SELECT,
        // The review queue is first-in, first-out.
        orderBy: { updatedAt: moderationStatus === 'PENDING_REVIEW' ? 'asc' : 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data: rows.map(toItem), meta: pageMeta(page, limit, total) };
  }

  async moderate(id: string, dto: ModerateProductDto, actor: AuthenticatedUser) {
    return this.setStatus(id, dto.moderationStatus, dto.reason, actor);
  }

  /** Also used by report resolution (REMOVE_PRODUCT). */
  async setStatus(
    id: string,
    status: ModerationDecision,
    reason: string | undefined,
    actor: AuthenticatedUser,
    meta: Record<string, unknown> = {},
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        moderationStatus: true,
        shop: { select: { name: true, vendor: { select: { user: { select: { email: true } } } } } },
      },
    });
    if (!product) throw new NotFoundException(`Product ${id} was not found.`);

    if (product.moderationStatus !== status) {
      await this.prisma.product.update({
        where: { id },
        // The reason is shown to the vendor; approval clears it.
        data: { moderationStatus: status, moderationReason: status === 'APPROVED' ? null : (reason ?? null) },
      });
      await this.audit.record(actor.email, `product.moderate.${status.toLowerCase()}`, 'Product', id, {
        from: product.moderationStatus,
        to: status,
        reason: reason ?? null,
        ...meta,
      });

      const to = product.shop.vendor.user?.email;
      if (status === 'REJECTED') {
        this.vendorMail.send(
          to,
          `"${product.name}" was not approved`,
          [
            `Your product "${product.name}" in ${product.shop.name} was reviewed and not approved, so it isn't visible to customers.`,
            `Reason: ${reason ?? '—'}`,
            'You can edit the product and submit it again.',
          ],
          { label: 'Open your products', path: '/vendor/products' },
        );
      } else if (status === 'REMOVED') {
        this.vendorMail.send(to, `"${product.name}" was removed from the marketplace`, [
          `Your product "${product.name}" in ${product.shop.name} has been removed from the marketplace and is no longer visible to customers.`,
          `Reason: ${reason ?? '—'}`,
          'Please contact us if you have questions about this decision.',
        ]);
      }
    }

    const updated = await this.prisma.product.findUniqueOrThrow({
      where: { id },
      select: MODERATION_SELECT,
    });
    return toItem(updated);
  }
}
