import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PurchaseOrderStatus } from '@prisma/client';

/** One product line on the PO; receiving the PO books these units into stock. */
export class PurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Product is required' })
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Unit cost cannot be negative' })
  unitCost!: number;
}

export class CreatePurchaseOrdersDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsString()
  @IsNotEmpty({ message: 'Purchase order supplier id is required' })
  supplierId!: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsDateString()
  expectedAt?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;

  /** When lines are given, units and total are derived from them. */
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1, { message: 'Add at least one line item' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items?: PurchaseOrderItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Units cannot be negative' })
  units?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Total cannot be negative' })
  total?: number;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdatePurchaseOrdersDto extends PartialType(
  CreatePurchaseOrdersDto,
) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class PurchaseOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PurchaseOrderStatus)
  status?: PurchaseOrderStatus;

  @IsOptional()
  @IsString()
  supplierId?: string;
}
