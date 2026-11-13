import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/pagination-query.data';

export class ProductReviewsQueryDto extends PaginationQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'productId query parameter is required' })
  productId!: string;
}

/** Admin moderation listing — unlike the storefront query this is not scoped to
 * a single product and can return reviews awaiting approval. */
export class AdminReviewsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return undefined;
  })
  @IsBoolean()
  isApproved?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating?: number;
}

export class ReviewApprovalDto {
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'isApproved must be a boolean' })
  isApproved!: boolean;
}

export class CreateReviewsDto {
  @IsString()
  @IsNotEmpty({ message: 'Product is required' })
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating!: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}

/** Reviews can only have their rating/title/content edited — never productId/customerId/isApproved. */
export class UpdateReviewsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Rating must be between 1 and 5' })
  @Max(5, { message: 'Rating must be between 1 and 5' })
  rating?: number;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
