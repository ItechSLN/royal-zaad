import type { FulfillmentMethod, OrderChannel, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'Product is required' })
  productId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

/** Delivery or pickup for one shop in the basket. */
export class FulfillmentChoiceDto {
  @IsString()
  @IsNotEmpty({ message: 'Shop is required' })
  shopId!: string;

  @IsIn(['DELIVERY', 'PICKUP'], { message: 'Fulfilment must be DELIVERY or PICKUP' })
  method!: FulfillmentMethod;
}

export class CreateOrdersDto {
  // Optional here: an authenticated storefront checkout derives the customer
  // from the JWT session. Only the admin "create order manually" flow (no
  // token) needs to supply this explicitly — enforced in OrdersService.create.
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  // "card" is collected through Stripe (the webhook settles it); "cod" is
  // settled by the courier and reconciled by staff. Omitted on admin-raised
  // orders, which record a "manual" payment.
  @IsOptional()
  @IsIn(['card', 'cod'], { message: 'Invalid payment method' })
  paymentMethod?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FulfillmentChoiceDto)
  fulfillment?: FulfillmentChoiceDto[];

  /**
   * A fresh random value per checkout attempt (e.g. crypto.randomUUID()).
   * Resubmitting with the same key returns the original order — no duplicate
   * order, stock reservation or charge.
   */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;

  // Where the order originated. Admin-raised orders default to POS.
  @IsOptional()
  @IsIn(['WEB', 'APP', 'POS', 'MARKETPLACE'], { message: 'Invalid channel' })
  channel?: OrderChannel;
}

/** A basket to price for the checkout summary — nothing is reserved. */
export class QuoteOrderDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @IsOptional()
  @IsString()
  couponCode?: string;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FulfillmentChoiceDto)
  fulfillment?: FulfillmentChoiceDto[];
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
];

export class UpdateOrdersDto {
  @IsOptional()
  @IsIn(ORDER_STATUSES, { message: 'Invalid order status' })
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  shippingAddressId?: string;

  @IsOptional()
  @IsIn(['WEB', 'APP', 'POS', 'MARKETPLACE'], { message: 'Invalid channel' })
  channel?: OrderChannel;
}
