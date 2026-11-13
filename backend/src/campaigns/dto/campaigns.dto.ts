import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { CampaignChannel, CampaignStatus } from '@prisma/client';

export class CreateCampaignsDto {
  @IsString()
  @IsNotEmpty({ message: 'Campaign name is required' })
  name!: string;

  @IsOptional()
  @IsEnum(CampaignChannel)
  channel?: CampaignChannel;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  preview?: string;

  @IsOptional()
  @IsDateString()
  sendAt?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  alwaysOn?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  openRate?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  revenue?: number;

  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;
}

export class UpdateCampaignsDto extends PartialType(CreateCampaignsDto) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class CampaignsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CampaignChannel, { message: 'Unknown channel' })
  channel?: CampaignChannel;

  @IsOptional()
  @IsEnum(CampaignStatus, { message: 'Unknown status' })
  status?: CampaignStatus;
}
