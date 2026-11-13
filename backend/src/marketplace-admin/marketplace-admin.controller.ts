import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles, Staff } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { ADMIN_ROLE_NAME } from '../roles/roles.constants';
import {
  CreatePayoutDto,
  CreateReportDto,
  ModerateProductDto,
  ModerationQueryDto,
  PayoutQueryDto,
  ReportQueryDto,
  ResolveReportDto,
  UpdateMarketplaceSettingsDto,
  UpdatePayoutDto,
  UpdateShopLocationDto,
  UpdateVendorCommissionDto,
  UpdateVendorStatusDto,
  VendorQueryDto,
} from './dto/marketplace-admin.dto';
import { VendorsAdminService } from './vendors-admin.service';
import { ModerationService } from './moderation.service';
import { MarketplaceReportsService } from './marketplace-reports.service';
import { PayoutsAdminService } from './payouts-admin.service';
import { MarketplaceSettingsService } from './marketplace-settings.service';
import { PublicShopsService } from './public-shops.service';

/** Reports per user/IP per 10 minutes — strict in production, relaxed for dev/tests. */
const REPORT_RATE_LIMIT = Number(
  process.env.REPORT_RATE_LIMIT ??
    (process.env.NODE_ENV === 'production' ? 5 : 1000),
);

/* --------------------------------- Vendors -------------------------------- */

@Controller('admin/vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorsAdminController {
  constructor(private readonly vendors: VendorsAdminService) {}

  @Staff()
  @Get()
  @Version('1')
  findAll(@Query() query: VendorQueryDto) {
    return this.vendors.findAll(query);
  }

  @Staff()
  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.vendors.findOne(id);
  }

  @Roles(ADMIN_ROLE_NAME)
  @Patch(':id/status')
  @Version('1')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateVendorStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendors.changeStatus(id, dto, user);
  }

  @Roles(ADMIN_ROLE_NAME)
  @Patch(':id/commission')
  @Version('1')
  updateCommission(
    @Param('id') id: string,
    @Body() dto: UpdateVendorCommissionDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendors.updateCommission(id, dto, user);
  }
}

/* ---------------------------------- Shops --------------------------------- */

@Controller('admin/shops')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShopsAdminController {
  constructor(private readonly vendors: VendorsAdminService) {}

  @Roles(ADMIN_ROLE_NAME)
  @Patch(':id/location')
  @Version('1')
  updateLocation(
    @Param('id') id: string,
    @Body() dto: UpdateShopLocationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.vendors.updateShopLocation(id, dto, user);
  }
}

/* -------------------------------- Moderation ------------------------------ */

@Controller('admin/moderation/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class ModerationController {
  constructor(private readonly moderation: ModerationService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: ModerationQueryDto) {
    return this.moderation.findAll(query);
  }

  @Patch(':id')
  @Version('1')
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.moderation.moderate(id, dto, user);
  }
}

/* --------------------------------- Reports -------------------------------- */

/** Any signed-in user can flag a product or shop. */
@Controller('reports')
export class PublicReportsController {
  constructor(private readonly reports: MarketplaceReportsService) {}

  @Throttle({ default: { limit: REPORT_RATE_LIMIT, ttl: 10 * 60_000 } })
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @Post()
  @Version('1')
  create(@Body() dto: CreateReportDto, @CurrentUser() user: AuthenticatedUser) {
    return this.reports.create(user, dto);
  }
}

@Controller('admin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Staff()
export class ReportsAdminController {
  constructor(private readonly reports: MarketplaceReportsService) {}

  @Get()
  @Version('1')
  findAll(@Query() query: ReportQueryDto) {
    return this.reports.findAll(query);
  }

  @Patch(':id')
  @Version('1')
  resolve(
    @Param('id') id: string,
    @Body() dto: ResolveReportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reports.resolve(id, dto, user);
  }
}

/* --------------------------------- Payouts -------------------------------- */

@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PayoutsAdminController {
  constructor(private readonly payouts: PayoutsAdminService) {}

  @Staff()
  @Get()
  @Version('1')
  findAll(@Query() query: PayoutQueryDto) {
    return this.payouts.findAll(query);
  }

  // Declared before ':id' so it isn't swallowed as an id param.
  @Staff()
  @Get('balances')
  @Version('1')
  balances() {
    return this.payouts.balances();
  }

  @Staff()
  @Get(':id')
  @Version('1')
  findOne(@Param('id') id: string) {
    return this.payouts.findOne(id);
  }

  @Roles(ADMIN_ROLE_NAME)
  @Post()
  @Version('1')
  create(@Body() dto: CreatePayoutDto, @CurrentUser() user: AuthenticatedUser) {
    return this.payouts.create(dto, user);
  }

  @Roles(ADMIN_ROLE_NAME)
  @Patch(':id')
  @Version('1')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePayoutDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.payouts.update(id, dto, user);
  }
}

/* --------------------------------- Settings ------------------------------- */

@Controller('admin/marketplace/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MarketplaceSettingsController {
  constructor(private readonly settings: MarketplaceSettingsService) {}

  @Staff()
  @Get()
  @Version('1')
  get() {
    return this.settings.get();
  }

  @Roles(ADMIN_ROLE_NAME)
  @Patch()
  @Version('1')
  update(@Body() dto: UpdateMarketplaceSettingsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.settings.update(dto, user);
  }
}

/* ------------------------------ Public shop pages ------------------------- */

@Controller('shops')
export class PublicShopsController {
  constructor(private readonly shops: PublicShopsService) {}

  @Get(':slug')
  @Version('1')
  findOne(@Param('slug') slug: string) {
    return this.shops.findBySlug(slug);
  }
}
