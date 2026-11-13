import type { DiscountType } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
} from 'class-validator';

export class CreateCouponsDto {
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  code!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'], { message: 'Discount type must be PERCENTAGE or FIXED_AMOUNT' })
  discountType!: DiscountType;

  @Type(() => Number)
  @IsNumber({}, { message: 'Discount value must be a number' })
  @IsPositive({ message: 'Discount value must be greater than 0' })
  discountValue!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minimumPurchase?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startsAt!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCouponsDto extends PartialType(CreateCouponsDto) {}

export class ValidateCouponDto {
  @IsString()
  @IsNotEmpty({ message: 'Coupon code is required' })
  code!: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Subtotal must be a number' })
  @Min(0)
  subtotal!: number;
}
