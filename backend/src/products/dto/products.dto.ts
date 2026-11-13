import { OmitType, PartialType } from '@nestjs/swagger';

import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.data';

/** Multipart forms can't send null: an empty value clears an optional field. */
const emptyToNull = ({ value }: { value: unknown }) => (value === '' ? null : value);
const optionalNumber = ({ value }: { value: unknown }) =>
  value === '' || value === null || value === undefined ? (value === undefined ? undefined : null) : Number(value);

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Slug is required' })
  slug!: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  shortDescription?: string | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  description?: string | null;

  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  sku!: string;

  // An empty value must fail, not silently become 0 (a free product).
  @Transform(({ value }) => (value === '' || value === null ? Number.NaN : Number(value)))
  @IsNumber({}, { message: 'Price must be a number' })
  @Min(0)
  price!: number;

  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber()
  @Min(0)
  compareAtPrice?: number | null;

  @IsOptional()
  @Transform(optionalNumber)
  @IsNumber()
  @Min(0)
  costPrice?: number | null;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  barcode?: string | null;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isFeatured?: boolean;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  categoryId!: string;

  /**
   * Staff only: the shop the product is created in (defaults to the platform
   * shop). Vendors never send it — their shop comes from the session.
   */
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @Transform(emptyToNull)
  @IsString()
  brandId?: string | null;
}

/** A product never changes shop once created. */
export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['shopId'] as const),
) {}

/** What a vendor may send — no shop id; theirs is resolved from the session. */
export class VendorCreateProductDto extends OmitType(CreateProductDto, ['shopId'] as const) {}

const SORT_OPTIONS = ['newest', 'price_asc', 'price_desc', 'name_asc', 'name_desc'] as const;

export class ProductsQueryDto extends PaginationQueryDto {
  /** Staff only: limit the catalogue to one shop. Ignored for the public. */
  @IsOptional()
  @IsString()
  shopId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value === 'true' : value))
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsIn(SORT_OPTIONS, { message: 'Invalid sort option' })
  sort?: (typeof SORT_OPTIONS)[number];
}
