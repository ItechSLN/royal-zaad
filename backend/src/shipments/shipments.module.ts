import { Module } from '@nestjs/common';
import { ShipmentsController } from './shipments.controller';
import { ShipmentsRepository } from './shipments.repository';
import { ShipmentsService } from './shipments.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [OrdersModule],
  controllers: [ShipmentsController],
  providers: [ShipmentsService, ShipmentsRepository],
  exports: [ShipmentsService, ShipmentsRepository],
})
export class ShipmentsModule {}
