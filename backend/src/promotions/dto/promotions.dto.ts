import type { DiscountType } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

export class CreatePromotionsDto {
  @IsString()
  @IsNotEmpty({ message: 'Promotion name is required' })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsIn(['PERCENTAGE', 'FIXED_AMOUNT'], { message: 'Discount type must be PERCENTAGE or FIXED_AMOUNT' })
  discountType!: DiscountType;

  @Type(() => Number)
  @IsNumber({}, { message: 'Discount value must be a number' })
  @IsPositive({ message: 'Discount value must be greater than 0' })
  discountValue!: number;

  @IsDateString()
  @IsNotEmpty({ message: 'Start date is required' })
  startsAt!: string;

  @IsDateString()
  @IsNotEmpty({ message: 'End date is required' })
  endsAt!: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  productIds?: string[];
}

export class UpdatePromotionsDto extends PartialType(CreatePromotionsDto) {}
