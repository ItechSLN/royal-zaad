import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PostStatus } from '@prisma/client';

export class CreateCmsDto {
  @IsString()
  @IsNotEmpty({ message: 'Post title is required' })
  title!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  author?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  excerpt?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  shoppable?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  views?: number;

  @IsOptional()
  @IsEnum(PostStatus)
  status?: PostStatus;

  @IsOptional()
  @IsDateString()
  publishAt?: string;
}

export class UpdateCmsDto extends PartialType(CreateCmsDto) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class CmsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PostStatus, { message: 'Unknown status' })
  status?: PostStatus;

  @IsOptional()
  @IsString()
  category?: string;
}
