import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString, Max, MaxLength, Min, ValidateIf } from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.data';

const toBool = ({ value }: { value: unknown }) => (typeof value === 'string' ? value === 'true' : value);

export class SearchProductsQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() @MaxLength(120) q?: string;

  /** The customer's point — from the browser, a looked-up postcode, or a saved address. */
  @ValidateIf((o: SearchProductsQueryDto) => o.lng !== undefined || o.lat !== undefined)
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90)
  lat?: number;

  @ValidateIf((o: SearchProductsQueryDto) => o.lng !== undefined || o.lat !== undefined)
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180)
  lng?: number;

  /** Only shops within this distance. Needs lat/lng. */
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(1000)
  radiusKm?: number;

  @IsOptional()
  @IsIn(['relevance', 'nearest', 'price_asc', 'price_desc'], { message: 'Invalid sort option' })
  sort?: 'relevance' | 'nearest' | 'price_asc' | 'price_desc';

  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() brandId?: string;
  @IsOptional() @IsString() shopId?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) minPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxPrice?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(5) minRating?: number;

  @IsOptional() @IsIn(['delivery', 'pickup']) fulfillment?: 'delivery' | 'pickup';

  /** Out-of-stock products are hidden unless asked for. */
  @IsOptional() @Transform(toBool) @IsBoolean() includeOutOfStock?: boolean;
}

export class NearbyShopsQueryDto {
  @Type(() => Number) @IsNumber() @Min(-90) @Max(90) lat!: number;
  @Type(() => Number) @IsNumber() @Min(-180) @Max(180) lng!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0.5) @Max(1000) radiusKm?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(50) limit?: number;
}

export class GeoLookupQueryDto {
  @IsString() @MaxLength(120) q!: string;
  @IsOptional() @IsString() @MaxLength(2) country?: string;
}
