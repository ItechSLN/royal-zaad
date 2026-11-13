import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MailModule } from './mail/mail.module';
import { GeoModule } from './geo/geo.module';
import { VendorsModule } from './vendors/vendors.module';
import { SearchModule } from './search/search.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { AddressesModule } from './addresses/addresses.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';
import { CouponsModule } from './coupons/coupons.module';
import { CustomersModule } from './customers/customers.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { PromotionsModule } from './promotions/promotions.module';
import { ReportsModule } from './reports/reports.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { WarehousesModule } from './warehouses/warehouses.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PurchaseOrdersModule } from './purchase-orders/purchase-orders.module';
import { ShipmentsModule } from './shipments/shipments.module';
import { ReturnsModule } from './returns/returns.module';
import { InvoicesModule } from './invoices/invoices.module';
import { TaxModule } from './tax/tax.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { CmsModule } from './cms/cms.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ContactModule } from './contact/contact.module';
import { VariantsModule } from './variants/variants.module';
import { AccountModule } from './account/account.module';
import { MarketplaceAdminModule } from './marketplace-admin/marketplace-admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    GeoModule,
    VendorsModule,
    SearchModule,
    CloudinaryModule,
    AddressesModule,
    AuthModule,
    UsersModule,
    RolesModule,
    ProductsModule,
    CategoriesModule,
    BrandsModule,
    OrdersModule,
    PaymentsModule,
    InventoryModule,
    CustomersModule,
    CouponsModule,
    PromotionsModule,
    ReviewsModule,
    NotificationsModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    WarehousesModule,
    SuppliersModule,
    PurchaseOrdersModule,
    ShipmentsModule,
    ReturnsModule,
    InvoicesModule,
    TaxModule,
    CampaignsModule,
    CmsModule,
    AuditLogModule,
    ContactModule,
    VariantsModule,
    AccountModule,
    MarketplaceAdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
