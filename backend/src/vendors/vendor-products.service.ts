import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, ProductModeration } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsRepository, PRODUCT_INCLUDE } from '../products/products.repository';
import { InventoryService } from '../inventory/inventory.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { REQUIRE_PRODUCT_APPROVAL_KEY } from '../marketplace/marketplace.constants';
import type { UpdateProductDto, VendorCreateProductDto } from '../products/dto/products.dto';
import type { VendorAdjustStockDto, VendorProductsQueryDto } from './dto/vendor.dto';
import type { VendorContext } from './vendor.guard';

const STATUS_FILTERS: Record<string, Prisma.ProductWhereInput> = {
  all: {},
  published: { isActive: true, archivedAt: null, moderationStatus: 'APPROVED' },
  draft: { isActive: false, archivedAt: null },
  archived: { archivedAt: { not: null } },
  pending: { moderationStatus: 'PENDING_REVIEW' },
  rejected: { moderationStatus: 'REJECTED' },
  removed: { moderationStatus: 'REMOVED' },
};

/**
 * A vendor's catalogue. Every query is scoped to ctx.shopId; another shop's
 * product answers 404 (not 403) so ids can't be probed for existence.
 */
@Injectable()
export class VendorProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly products: ProductsRepository,
    private readonly inventory: InventoryService,
    private readonly cloudinary: CloudinaryService,
  ) {}

  async list(ctx: VendorContext, query: VendorProductsQueryDto) {
    const { page, limit, q, status = 'all' } = query;
    const where: Prisma.ProductWhereInput = {
      ...STATUS_FILTERS[status],
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { sku: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      shopId: ctx.shopId,
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async get(ctx: VendorContext, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, shopId: ctx.shopId },
      include: PRODUCT_INCLUDE,
    });
    if (!product) throw new NotFoundException(`Product ${id} was not found.`);
    return product;
  }

  async create(ctx: VendorContext, data: VendorCreateProductDto, files: Express.Multer.File[]) {
    await this.assertReferences(data);
    return this.products.create(data, files, {
      shopId: ctx.shopId,
      moderationStatus: await this.initialModeration(),
    });
  }

  async update(ctx: VendorContext, id: string, data: UpdateProductDto, files: Express.Multer.File[]) {
    const current = await this.get(ctx, id);
    if (current.moderationStatus === 'REMOVED') {
      throw new ForbiddenException('This product was removed by the marketplace and can no longer be edited');
    }
    await this.assertReferences(data);

    const updated = await this.products.update(id, data, files);

    // A rejected product goes back for review once the vendor has changed it.
    if (current.moderationStatus === 'REJECTED') {
      await this.prisma.product.update({
        where: { id },
        data: { moderationStatus: await this.initialModeration(), moderationReason: null },
      });
      return this.get(ctx, id);
    }
    return updated;
  }

  async archive(ctx: VendorContext, id: string, archived: boolean) {
    await this.get(ctx, id);
    await this.prisma.product.update({
      where: { id },
      data: archived ? { archivedAt: new Date(), isActive: false } : { archivedAt: null },
    });
    return this.get(ctx, id);
  }

  /** Only never-ordered products can be deleted; anything with history is archived. */
  async remove(ctx: VendorContext, id: string) {
    const product = await this.get(ctx, id);
    const ordered = await this.prisma.orderItem.count({ where: { productId: id } });
    if (ordered > 0) {
      throw new BadRequestException({
        message: 'This product has orders — archive it instead so order history stays intact',
      });
    }
    await this.products.remove(id);
    return product;
  }

  async listInventory(ctx: VendorContext) {
    const rows = await this.prisma.inventory.findMany({
      where: { product: { shopId: ctx.shopId } },
      include: { product: { select: { id: true, name: true, sku: true, isActive: true, archivedAt: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => ({ ...row, available: row.quantity - row.reserved }));
  }

  async adjustStock(ctx: VendorContext, productId: string, data: VendorAdjustStockDto) {
    await this.get(ctx, productId);
    const record = await this.prisma.inventory.findUnique({ where: { productId } });
    if (!record) throw new NotFoundException('No stock record for this product');
    if ((data.reserved ?? record.reserved) > data.quantity) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { reserved: 'Reserved units cannot exceed units on hand' },
      });
    }
    return this.inventory.adjust(record.id, { ...data, createdById: ctx.userId });
  }

  private async initialModeration(): Promise<ProductModeration> {
    const setting = await this.prisma.setting.findUnique({ where: { key: REQUIRE_PRODUCT_APPROVAL_KEY } });
    return setting?.value === 'true' ? 'PENDING_REVIEW' : 'APPROVED';
  }

  private async assertReferences(data: { categoryId?: string; brandId?: string | null }) {
    if (data.categoryId && !(await this.prisma.category.count({ where: { id: data.categoryId } }))) {
      throw new BadRequestException({ message: 'Validation failed', errors: { categoryId: 'Category not found' } });
    }
    if (data.brandId && !(await this.prisma.brand.count({ where: { id: data.brandId } }))) {
      throw new BadRequestException({ message: 'Validation failed', errors: { brandId: 'Brand not found' } });
    }
  }
}
