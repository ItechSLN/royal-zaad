import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Version,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { IsNotEmpty, IsString } from 'class-validator';
import { StripeService } from './stripe.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/strategies/jwt.strategy';

class OrderPaymentDto {
  @IsString()
  @IsNotEmpty({ message: 'Order is required' })
  orderId!: string;
}

/** Customer-facing card payment endpoints, plus Stripe's webhook. */
@Controller('payments/stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('intent')
  @Version('1')
  @UseGuards(JwtAuthGuard)
  createIntent(
    @Body() data: OrderPaymentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.stripeService.createIntent(data.orderId, user);
  }

  @Post('sync')
  @Version('1')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  sync(@Body() data: OrderPaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.stripeService.syncPayment(data.orderId, user);
  }

  /** Authenticated by Stripe's signature over the raw body, not a JWT. */
  @Post('webhook')
  @Version('1')
  @HttpCode(200)
  webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature?: string,
  ) {
    return this.stripeService.handleWebhook(req.rawBody, signature);
  }
}
