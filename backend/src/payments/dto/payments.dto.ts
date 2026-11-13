import type { PaymentStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';

const PAYMENT_STATUSES: PaymentStatus[] = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'];

export class CreatePaymentsDto {
  @IsString()
  @IsNotEmpty({ message: 'Order is required' })
  orderId!: string;

  @IsString()
  @IsNotEmpty({ message: 'Provider is required' })
  provider!: string;

  @IsOptional()
  @IsString()
  transactionId?: string;

  @Type(() => Number)
  @IsNumber({}, { message: 'Amount must be a number' })
  @IsPositive({ message: 'Amount must be greater than 0' })
  amount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsIn(PAYMENT_STATUSES, { message: 'Invalid payment status' })
  status?: PaymentStatus;
}

/**
 * Payments are only ever created automatically from a confirmed Order (see
 * OrdersService.create), so amount/currency/orderId are never client-writable here —
 * only the status/transactionId of an existing payment can change.
 */
export class UpdatePaymentsDto {
  @IsOptional()
  @IsIn(PAYMENT_STATUSES, { message: 'Invalid payment status' })
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  transactionId?: string;
}
