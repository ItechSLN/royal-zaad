import { Module } from '@nestjs/common';
import { GeoModule } from '../geo/geo.module';
import {
  MarketplaceSettingsController,
  ModerationController,
  PayoutsAdminController,
  PublicReportsController,
  PublicShopsController,
  ReportsAdminController,
  ShopsAdminController,
  VendorsAdminController,
} from './marketplace-admin.controller';
import { MarketplaceAuditService, VendorMailService } from './marketplace-admin.support';
import { VendorsAdminService } from './vendors-admin.service';
import { ModerationService } from './moderation.service';
import { MarketplaceReportsService } from './marketplace-reports.service';
import { PayoutsAdminService } from './payouts-admin.service';
import { MarketplaceSettingsService } from './marketplace-settings.service';
import { PublicShopsService } from './public-shops.service';

/**
 * Marketplace administration: vendor approval, product moderation, reports,
 * payouts and platform settings — plus the public shop page and report form.
 */
@Module({
  // GeocoderService (GeoModule is global; importing it keeps this module self-contained).
  imports: [GeoModule],
  controllers: [
    VendorsAdminController,
    ShopsAdminController,
    ModerationController,
    PublicReportsController,
    ReportsAdminController,
    PayoutsAdminController,
    MarketplaceSettingsController,
    PublicShopsController,
  ],
  providers: [
    MarketplaceAuditService,
    VendorMailService,
    VendorsAdminService,
    ModerationService,
    MarketplaceReportsService,
    PayoutsAdminService,
    MarketplaceSettingsService,
    PublicShopsService,
  ],
  exports: [VendorsAdminService, MarketplaceSettingsService],
})
export class MarketplaceAdminModule {}
