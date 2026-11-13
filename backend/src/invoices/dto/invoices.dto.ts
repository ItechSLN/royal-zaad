import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

export class CreateInvoicesDto {
  @IsOptional()
  @IsString()
  number?: string;

  @IsString()
  @IsNotEmpty({ message: 'Invoice customer id is required' })
  customerId!: string;

  @IsOptional()
  @IsString()
  orderId?: string;

  @IsOptional()
  @IsDateString()
  issuedAt?: string;

  @IsDateString()
  @IsNotEmpty({ message: 'Invoice due at is required' })
  dueAt!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Invoice amount cannot be negative' })
  @IsNotEmpty({ message: 'Invoice amount is required' })
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Balance cannot be negative' })
  balance?: number;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateInvoicesDto extends PartialType(CreateInvoicesDto) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class InvoicesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  customerId?: string;
}
