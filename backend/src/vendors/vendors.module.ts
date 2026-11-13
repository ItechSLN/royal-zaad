import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductsModule } from '../products/products.module';
import { InventoryModule } from '../inventory/inventory.module';
import { OrdersModule } from '../orders/orders.module';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { VendorGuard } from './vendor.guard';
import { VendorOnboardingController, VendorsController } from './vendors.controller';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { VendorShopService } from './vendor-shop.service';
import { VendorProductsService } from './vendor-products.service';
import { VendorOrdersService } from './vendor-orders.service';
import { VendorInsightsService } from './vendor-insights.service';

@Module({
  imports: [AuthModule, ProductsModule, InventoryModule, OrdersModule, CloudinaryModule],
  controllers: [VendorOnboardingController, VendorsController],
  providers: [
    VendorGuard,
    VendorOnboardingService,
    VendorShopService,
    VendorProductsService,
    VendorOrdersService,
    VendorInsightsService,
  ],
  exports: [VendorGuard],
})
export class VendorsModule {}
