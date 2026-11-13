import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { StripeController } from './stripe.controller';
import { StripeService } from './stripe.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController, StripeController],
  providers: [PaymentsService, PaymentsRepository, StripeService],
})
export class PaymentsModule {}
