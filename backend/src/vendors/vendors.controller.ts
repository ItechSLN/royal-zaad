import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  Version,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpdateProductDto, VendorCreateProductDto } from '../products/dto/products.dto';
import { CurrentVendor, VendorGuard, type VendorContext } from './vendor.guard';
import {
  RegisterVendorDto,
  UpdateShopDto,
  UpdateVendorOrderDto,
  VendorAdjustStockDto,
  VendorAnalyticsQueryDto,
  VendorOrdersQueryDto,
  VendorProductsQueryDto,
} from './dto/vendor.dto';
import { VendorOnboardingService } from './vendor-onboarding.service';
import { VendorShopService } from './vendor-shop.service';
import { VendorProductsService } from './vendor-products.service';
import { VendorOrdersService } from './vendor-orders.service';
import { VendorInsightsService } from './vendor-insights.service';

const imagePipe = (required: boolean) =>
  new ParseFilePipe({
    validators: [
      new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp|gif)$/ }),
      new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
    ],
    fileIsRequired: required,
  });

/** Public shop-owner sign-up (rate limited with the other auth endpoints). */
@Controller('auth')
@UseGuards(ThrottlerGuard)
export class VendorOnboardingController {
  constructor(private readonly onboarding: VendorOnboardingService) {}

  @Post('register-vendor')
  @Version('1')
  register(@Body() data: RegisterVendorDto) {
    return this.onboarding.register(data);
  }
}

/** The vendor workspace. Every route is scoped to the caller's own shop. */
@Controller('vendor')
@UseGuards(JwtAuthGuard, VendorGuard)
export class VendorsController {
  constructor(
    private readonly shop: VendorShopService,
    private readonly products: VendorProductsService,
    private readonly orders: VendorOrdersService,
    private readonly insights: VendorInsightsService,
  ) {}

  // --- Shop profile ---------------------------------------------------------
  @Get('shop')
  @Version('1')
  getShop(@CurrentVendor() ctx: VendorContext) {
    return this.shop.get(ctx);
  }

  @Patch('shop')
  @Version('1')
  updateShop(@CurrentVendor() ctx: VendorContext, @Body() data: UpdateShopDto) {
    return this.shop.update(ctx, data);
  }

  @Post('shop/logo')
  @Version('1')
  @UseInterceptors(FileInterceptor('logo'))
  uploadLogo(
    @CurrentVendor() ctx: VendorContext,
    @UploadedFile(imagePipe(true)) file: Express.Multer.File,
  ) {
    return this.shop.uploadLogo(ctx, file);
  }

  // --- Products ---------------------------------------------------------------
  @Get('products')
  @Version('1')
  listProducts(@CurrentVendor() ctx: VendorContext, @Query() query: VendorProductsQueryDto) {
    return this.products.list(ctx, query);
  }

  @Get('products/:id')
  @Version('1')
  getProduct(@CurrentVendor() ctx: VendorContext, @Param('id') id: string) {
    return this.products.get(ctx, id);
  }

  @Post('products')
  @Version('1')
  @UseInterceptors(FilesInterceptor('images', 10))
  createProduct(
    @CurrentVendor() ctx: VendorContext,
    @Body() data: VendorCreateProductDto,
    @UploadedFiles(imagePipe(false)) files: Express.Multer.File[] = [],
  ) {
    return this.products.create(ctx, data, files);
  }

  @Patch('products/:id')
  @Version('1')
  @UseInterceptors(FilesInterceptor('images', 10))
  updateProduct(
    @CurrentVendor() ctx: VendorContext,
    @Param('id') id: string,
    @Body() data: UpdateProductDto,
    @UploadedFiles(imagePipe(false)) files: Express.Multer.File[] = [],
  ) {
    return this.products.update(ctx, id, data, files);
  }

  @Post('products/:id/archive')
  @Version('1')
  archiveProduct(@CurrentVendor() ctx: VendorContext, @Param('id') id: string) {
    return this.products.archive(ctx, id, true);
  }

  @Post('products/:id/unarchive')
  @Version('1')
  unarchiveProduct(@CurrentVendor() ctx: VendorContext, @Param('id') id: string) {
    return this.products.archive(ctx, id, false);
  }

  @Delete('products/:id')
  @Version('1')
  removeProduct(@CurrentVendor() ctx: VendorContext, @Param('id') id: string) {
    return this.products.remove(ctx, id);
  }

  // --- Inventory --------------------------------------------------------------
  @Get('inventory')
  @Version('1')
  listInventory(@CurrentVendor() ctx: VendorContext) {
    return this.products.listInventory(ctx);
  }

  @Post('inventory/:productId/adjust')
  @Version('1')
  adjustStock(
    @CurrentVendor() ctx: VendorContext,
    @Param('productId') productId: string,
    @Body() data: VendorAdjustStockDto,
  ) {
    return this.products.adjustStock(ctx, productId, data);
  }

  // --- Orders -------------------------------------------------------------------
  @Get('orders')
  @Version('1')
  listOrders(@CurrentVendor() ctx: VendorContext, @Query() query: VendorOrdersQueryDto) {
    return this.orders.list(ctx, query);
  }

  @Get('orders/:id')
  @Version('1')
  getOrder(@CurrentVendor() ctx: VendorContext, @Param('id') id: string) {
    return this.orders.get(ctx, id);
  }

  @Patch('orders/:id')
  @Version('1')
  updateOrder(
    @CurrentVendor() ctx: VendorContext,
    @Param('id') id: string,
    @Body() data: UpdateVendorOrderDto,
  ) {
    return this.orders.update(ctx, id, data);
  }

  // --- Insights -------------------------------------------------------------
  @Get('analytics')
  @Version('1')
  analytics(@CurrentVendor() ctx: VendorContext, @Query() query: VendorAnalyticsQueryDto) {
    return this.insights.analytics(ctx, query.days ?? 30);
  }

  @Get('payouts')
  @Version('1')
  payouts(@CurrentVendor() ctx: VendorContext) {
    return this.insights.payouts(ctx);
  }
}
