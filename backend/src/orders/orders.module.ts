import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { OrderPricingService } from './order-pricing.service';
import { OrderStatusService } from './order-status.service';
import { CouponsModule } from '../coupons/coupons.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [CouponsModule, PromotionsModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersRepository, OrderPricingService, OrderStatusService],
  exports: [OrdersService, OrderStatusService, OrderPricingService],
})
export class OrdersModule {}
