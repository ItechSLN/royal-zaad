import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AdjustmentReason } from '@prisma/client';

export class CreateInventoryDto {
  @IsString()
  @IsNotEmpty({ message: 'Product is required' })
  productId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reserved?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderAt?: number;

  /** Which facility holds the stock. Optional for single-site setups. */
  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class UpdateInventoryDto extends PartialType(CreateInventoryDto) {}

/** Posting an adjustment records the movement as well as the new counts. */
export class AdjustInventoryDto {
  @IsEnum(AdjustmentReason)
  @IsNotEmpty({ message: 'Adjustment reason is required' })
  reason!: AdjustmentReason;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reserved?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  reorderAt?: number;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  createdById?: string;
}

/** `state` accepts `in`, `low` or `out`, mirroring the AD-07 tabs. */
export class InventoryQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
