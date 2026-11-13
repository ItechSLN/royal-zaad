import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCategoriesDto {
  @IsString()
  @IsNotEmpty({ message: 'Category name is required' })
  name!: string;

  @IsString()
  @IsNotEmpty({ message: 'Category slug is required' })
  slug!: string;

  @IsOptional()
  @IsString()
  description?: string;

  /**
   * Category artwork. Either paste a URL here, or upload a file to
   * `POST /categories/:id/image` and this is filled in for you.
   */
  @IsOptional()
  @IsString()
  imageUrl?: string;

  /** Null or omitted keeps the category at the top level. */
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  showInNav?: boolean;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isFeatured?: boolean;
}

export class UpdateCategoriesDto extends PartialType(CreateCategoriesDto) {}

/** `scope` accepts `top`, `sub`, or a parent id. */
export class CategoriesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  scope?: string;

  /** `true` restricts the list to categories shown on the storefront. */
  @IsOptional()
  @IsString()
  visible?: string;
}
