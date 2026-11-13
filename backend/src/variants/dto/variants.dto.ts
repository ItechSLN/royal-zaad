import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateVariantsDto {
  @IsString()
  @IsNotEmpty({ message: 'Variant name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Variant SKU is required' })
  sku!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  // An empty value must fail, not silently become 0 (a free variant).
  @Transform(({ value }) => (value === '' || value === null ? Number.NaN : Number(value)))
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0)
  price!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  compareAtPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  costPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;
}

export class UpdateVariantsDto extends PartialType(CreateVariantsDto) {}
