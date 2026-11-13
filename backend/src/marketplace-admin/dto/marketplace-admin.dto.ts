import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  PayoutStatus,
  ProductModeration,
  ReportStatus,
  ReportTarget,
  VendorStatus,
} from '@prisma/client';
import { PaginationQueryDto } from '../../common/pagination-query.data';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/* ------------------------------- Vendors -------------------------------- */

export class VendorQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(VendorStatus, { message: 'Unknown vendor status' })
  status?: VendorStatus;

  /** Vendor's email, first/last name, or shop name. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(trim)
  q?: string;
}

export const VENDOR_TARGET_STATUSES = ['ACTIVE', 'SUSPENDED', 'REJECTED'] as const;
export type VendorTargetStatus = (typeof VENDOR_TARGET_STATUSES)[number];

export class UpdateVendorStatusDto {
  @IsIn(VENDOR_TARGET_STATUSES, { message: 'Status must be ACTIVE, SUSPENDED or REJECTED' })
  status!: VendorTargetStatus;

  @ValidateIf((o: UpdateVendorStatusDto) => o.status === 'SUSPENDED' || o.status === 'REJECTED' || o.reason !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'A reason is required when suspending or rejecting a vendor' })
  @MaxLength(1000)
  reason?: string;
}

export class UpdateVendorCommissionDto {
  /** Percent, 0–100 (2 decimals). null = use the platform default. */
  @ValidateIf((o: UpdateVendorCommissionDto) => o.commissionRate !== null)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Commission rate must be a number (or null for the platform default)' })
  @Min(0, { message: 'Commission rate must be between 0 and 100' })
  @Max(100, { message: 'Commission rate must be between 0 and 100' })
  commissionRate!: number | null;
}

/* --------------------------------- Shops -------------------------------- */

export class UpdateShopLocationDto {
  @IsNumber({}, { message: 'Latitude must be a number' })
  @Min(-90, { message: 'Latitude must be between -90 and 90' })
  @Max(90, { message: 'Latitude must be between -90 and 90' })
  latitude!: number;

  @IsNumber({}, { message: 'Longitude must be a number' })
  @Min(-180, { message: 'Longitude must be between -180 and 180' })
  @Max(180, { message: 'Longitude must be between -180 and 180' })
  longitude!: number;
}

/* ------------------------------ Moderation ------------------------------ */

export class ModerationQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ProductModeration, { message: 'Unknown moderation status' })
  moderationStatus: ProductModeration = 'PENDING_REVIEW';

  @IsOptional()
  @IsString()
  shopId?: string;
}

export const MODERATION_DECISIONS = ['APPROVED', 'REJECTED', 'REMOVED'] as const;
export type ModerationDecision = (typeof MODERATION_DECISIONS)[number];

export class ModerateProductDto {
  @IsIn(MODERATION_DECISIONS, { message: 'Moderation status must be APPROVED, REJECTED or REMOVED' })
  moderationStatus!: ModerationDecision;

  @ValidateIf((o: ModerateProductDto) => o.moderationStatus !== 'APPROVED' || o.reason !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'A reason is required when rejecting or removing a product' })
  @MaxLength(1000)
  reason?: string;
}

/* -------------------------------- Reports ------------------------------- */

export const REPORT_REASONS = [
  'COUNTERFEIT',
  'PROHIBITED',
  'MISLEADING',
  'OFFENSIVE',
  'FRAUD',
  'OTHER',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export class CreateReportDto {
  @IsEnum(ReportTarget, { message: 'Target type must be PRODUCT or SHOP' })
  targetType!: ReportTarget;

  @ValidateIf((o: CreateReportDto) => o.targetType === 'PRODUCT' || o.productId !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'productId is required when reporting a product' })
  productId?: string;

  @ValidateIf((o: CreateReportDto) => o.targetType === 'SHOP' || o.shopId !== undefined)
  @IsString()
  @IsNotEmpty({ message: 'shopId is required when reporting a shop' })
  shopId?: string;

  @IsIn(REPORT_REASONS, { message: `Reason must be one of ${REPORT_REASONS.join(', ')}` })
  reason!: ReportReason;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  details?: string;
}

export class ReportQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus, { message: 'Unknown report status' })
  status?: ReportStatus;

  @IsOptional()
  @IsEnum(ReportTarget, { message: 'Unknown target type' })
  targetType?: ReportTarget;
}

export const REPORT_ACTIONS = ['REMOVE_PRODUCT', 'SUSPEND_VENDOR'] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

export class ResolveReportDto {
  @IsIn(['RESOLVED', 'DISMISSED'], { message: 'Status must be RESOLVED or DISMISSED' })
  status!: 'RESOLVED' | 'DISMISSED';

  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'A resolution note is required' })
  @MaxLength(2000)
  resolution!: string;

  @IsOptional()
  @IsIn(REPORT_ACTIONS, { message: 'Action must be REMOVE_PRODUCT or SUSPEND_VENDOR' })
  action?: ReportAction;
}

/* -------------------------------- Payouts ------------------------------- */

export class PayoutQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsEnum(PayoutStatus, { message: 'Unknown payout status' })
  status?: PayoutStatus;
}

export class CreatePayoutDto {
  @IsString()
  @IsNotEmpty({ message: 'vendorId is required' })
  vendorId!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdatePayoutDto {
  @IsIn(['PAID', 'CANCELLED'], { message: 'Status must be PAID or CANCELLED' })
  status!: 'PAID' | 'CANCELLED';

  @ValidateIf((o: UpdatePayoutDto) => o.status === 'PAID' || o.reference !== undefined)
  @Transform(trim)
  @IsString()
  @IsNotEmpty({ message: 'A payment reference is required when marking a payout paid' })
  @MaxLength(200)
  reference?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;
}

/* ------------------------------- Settings ------------------------------- */

export class UpdateMarketplaceSettingsDto {
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Commission rate must be a number' })
  @Min(0, { message: 'Commission rate must be between 0 and 100' })
  @Max(100, { message: 'Commission rate must be between 0 and 100' })
  commissionRate?: number;

  @IsOptional()
  @IsBoolean({ message: 'requireProductApproval must be true or false' })
  requireProductApproval?: boolean;
}
