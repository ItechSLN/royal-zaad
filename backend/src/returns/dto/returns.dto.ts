import { PartialType } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/pagination-query.data';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RefundMethod, RestockDecision, ReturnStage } from '@prisma/client';

export class CreateReturnsDto {
  @IsOptional()
  @IsString()
  rmaNumber?: string;

  @IsString()
  @IsNotEmpty({ message: 'Return order id is required' })
  orderId!: string;

  /** Derived from the order when omitted; must match it when given. */
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  orderItemId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Return reason is required' })
  reason!: string;

  @IsOptional()
  @IsEnum(ReturnStage)
  stage?: ReturnStage;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'Refund amount cannot be negative' })
  refundAmount?: number;

  @IsOptional()
  @IsEnum(RefundMethod)
  refundMethod?: RefundMethod;

  @IsOptional()
  @IsEnum(RestockDecision)
  restock?: RestockDecision;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateReturnsDto extends PartialType(CreateReturnsDto) {}

/** Query filters backing the list screen's tabs and filter bar. */
export class ReturnsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(ReturnStage)
  stage?: ReturnStage;

  @IsOptional()
  @IsString()
  customerId?: string;
}
