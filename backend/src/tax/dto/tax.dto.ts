import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { FilingStatus } from '@prisma/client';

export class CreateTaxRateDto {
  @IsString()
  @IsNotEmpty({ message: 'Jurisdiction is required' })
  jurisdiction!: string;

  /** ISO 3166-1 alpha-2 country the rate applies to at checkout. */
  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'Country must be a 2-letter code, e.g. SA' })
  countryCode?: string;

  @IsOptional()
  @IsString()
  registration?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Rate cannot be negative' })
  @Max(100, { message: 'Rate is a percentage (0–100)' })
  @IsNotEmpty({ message: 'Rate is required' })
  rate!: number;

  @IsOptional()
  @IsString()
  appliesTo?: string;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTaxRateDto extends PartialType(CreateTaxRateDto) {}

export class CreateTaxFilingDto {
  @IsString()
  @IsNotEmpty({ message: 'Period is required' })
  period!: string;

  @IsString()
  @IsNotEmpty({ message: 'Jurisdiction is required' })
  jurisdiction!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Output tax cannot be negative' })
  outputTax?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Input tax cannot be negative' })
  inputTax?: number;

  /** Always derived as output tax minus input tax; any value sent is ignored. */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  netPayable?: number;

  @IsDateString()
  @IsNotEmpty({ message: 'Due date is required' })
  dueAt!: string;

  @IsOptional()
  @IsEnum(FilingStatus)
  status?: FilingStatus;
}

export class UpdateTaxFilingDto extends PartialType(CreateTaxFilingDto) {}

export class TaxFilingsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  jurisdiction?: string;
}
