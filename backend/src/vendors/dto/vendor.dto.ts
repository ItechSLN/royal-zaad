import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { NormalizeEmail } from '../../common/normalize-email';
import { PaginationQueryDto } from '../../common/pagination-query.data';

/** Shop-owner sign-up: the account, and the shop it will run. */
export class RegisterVendorDto {
  @NormalizeEmail()
  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  firstName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  lastName!: string;

  @IsString()
  @IsNotEmpty({ message: 'Shop name is required' })
  @MaxLength(80)
  shopName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter code, e.g. SA' })
  country?: string;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type OpeningHours = Partial<Record<(typeof DAYS)[number], { open: string; close: string }[]>>;

/** Validates { mon: [{open:"09:00", close:"17:00"}], … }. Returns an error or null. */
export function openingHoursError(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return 'Opening hours must be an object keyed by day';
  for (const [day, slots] of Object.entries(value as Record<string, unknown>)) {
    if (!DAYS.includes(day as (typeof DAYS)[number])) return `Unknown day "${day}"`;
    if (!Array.isArray(slots)) return `${day}: expected a list of {open, close}`;
    for (const slot of slots as { open?: unknown; close?: unknown }[]) {
      const ok = (t: unknown) => typeof t === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
      if (!ok(slot?.open) || !ok(slot?.close)) return `${day}: times must be HH:MM`;
      if ((slot.open as string) >= (slot.close as string)) return `${day}: opening must be before closing`;
    }
  }
  return null;
}

export class UpdateShopDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(80) name?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;

  @IsOptional()
  @NormalizeEmail()
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() addressLine1?: string;
  @IsOptional() @IsString() addressLine2?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() state?: string;
  @IsOptional() @IsString() postalCode?: string;

  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter code, e.g. SA' })
  country?: string;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsObject()
  openingHours?: OpeningHours | null;

  @IsOptional() @IsBoolean() offersDelivery?: boolean;
  @IsOptional() @IsBoolean() offersPickup?: boolean;

  /** null = delivers anywhere. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber({}, { message: 'Delivery radius must be a number' })
  @Min(0.5)
  @Max(500)
  deliveryRadiusKm?: number | null;

  /** null = the platform default. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shippingFlatFee?: number | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freeShippingOver?: number | null;
}

export class VendorProductsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['all', 'published', 'draft', 'archived', 'pending', 'rejected', 'removed'])
  status?: string;

  @IsOptional() @IsString() q?: string;
}

export class VendorAdjustStockDto {
  @IsIn(['COUNT', 'DAMAGE', 'RECEIPT', 'TRANSFER', 'RETURN'], { message: 'Invalid adjustment reason' })
  reason!: 'COUNT' | 'DAMAGE' | 'RECEIPT' | 'TRANSFER' | 'RETURN';

  @Type(() => Number) @IsInt() @Min(0) quantity!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) reserved?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) reorderAt?: number;
  @IsOptional() @IsString() @MaxLength(500) note?: string;
}

export class VendorOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'])
  status?: string;
}

/** What a shop may do to its own sub-order. */
export class UpdateVendorOrderDto {
  @IsIn(['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'], { message: 'Invalid status' })
  status!: 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

  /** Optional tracking when marking a delivery order shipped. */
  @IsOptional() @IsString() @Length(1, 60) carrier?: string;
  @IsOptional() @IsString() @Length(3, 60) trackingNumber?: string;
}

export class VendorAnalyticsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  days?: number;
}
