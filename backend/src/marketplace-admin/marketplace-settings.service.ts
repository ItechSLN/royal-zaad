import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import {
  COMMISSION_RATE_KEY,
  DEFAULT_COMMISSION_RATE,
  REQUIRE_PRODUCT_APPROVAL_KEY,
} from '../marketplace/marketplace.constants';
import type { UpdateMarketplaceSettingsDto } from './dto/marketplace-admin.dto';
import { MarketplaceAuditService } from './marketplace-admin.support';

export type MarketplaceSettings = { commissionRate: number; requireProductApproval: boolean };

@Injectable()
export class MarketplaceSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: MarketplaceAuditService,
  ) {}

  async get(): Promise<MarketplaceSettings> {
    const rows = await this.prisma.setting.findMany({
      where: { key: { in: [COMMISSION_RATE_KEY, REQUIRE_PRODUCT_APPROVAL_KEY] } },
    });
    const raw = (key: string) => rows.find((r) => r.key === key)?.value;
    const rate = Number(raw(COMMISSION_RATE_KEY));
    return {
      // Same fallback the checkout pricing uses.
      commissionRate:
        raw(COMMISSION_RATE_KEY) !== undefined && Number.isFinite(rate) && rate >= 0
          ? Math.min(100, rate)
          : DEFAULT_COMMISSION_RATE,
      requireProductApproval: raw(REQUIRE_PRODUCT_APPROVAL_KEY) === 'true',
    };
  }

  async update(dto: UpdateMarketplaceSettingsDto, actor: AuthenticatedUser): Promise<MarketplaceSettings> {
    const before = await this.get();
    const writes: [string, string][] = [];
    if (dto.commissionRate !== undefined) writes.push([COMMISSION_RATE_KEY, String(dto.commissionRate)]);
    if (dto.requireProductApproval !== undefined) {
      writes.push([REQUIRE_PRODUCT_APPROVAL_KEY, String(dto.requireProductApproval)]);
    }
    if (!writes.length) return before;

    await this.prisma.$transaction(
      writes.map(([key, value]) =>
        this.prisma.setting.upsert({ where: { key }, create: { key, value }, update: { value } }),
      ),
    );
    const after = await this.get();
    await this.audit.record(actor.email, 'marketplace.settings', 'Setting', 'marketplace', { before, after });
    return after;
  }
}
