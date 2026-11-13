import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import type {
  CreateProductDto,
  ProductsQueryDto,
  UpdateProductDto,
} from './dto/products.dto';
import type { ProductsEntity } from './entities/products.entity';
import {
  SELLABLE_PRODUCT_WHERE,
  SHOP_SUMMARY_SELECT,
} from '../marketplace/marketplace.constants';

/** Who is asking: the public sees sellable products only; staff can scope to a shop. */
export type ProductScope = { sellableOnly?: boolean; shopId?: string };

export const PRODUCT_INCLUDE = {
  images: true,
  category: true,
  brand: { select: { id: true, name: true, slug: true } },
  shop: { select: SHOP_SUMMARY_SELECT },
  inventory: { select: { quantity: true, reserved: true, reorderAt: true } },
  variants: {
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: { warehouse: { select: { id: true, code: true, name: true } } },
  },
} satisfies Prisma.ProductInclude;

const SORT_MAP: Record<string, Prisma.ProductOrderByWithRelationInput> = {
  newest: { createdAt: 'desc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  name_asc: { name: 'asc' },
  name_desc: { name: 'desc' },
};

@Injectable()
export class ProductsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async findAll(
    query: ProductsQueryDto,
    scope: ProductScope = {},
  ): Promise<{ data: ProductsEntity[]; total: number }> {
    const {
      page,
      limit,
      search,
      categoryId,
      isActive,
      isFeatured,
      minPrice,
      maxPrice,
      sort,
    } = query;

    const where: Prisma.ProductWhereInput = {
      ...(scope.shopId ? { shopId: scope.shopId } : {}),
      // Filtering by a top-level category includes everything in its
      // sub-categories, since products are mapped to the leaves.
      ...(categoryId
        ? {
            OR: [{ categoryId }, { category: { parentId: categoryId } }],
          }
        : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(isFeatured !== undefined ? { isFeatured } : {}),
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      ...(minPrice !== undefined || maxPrice !== undefined
        ? {
            price: {
              ...(minPrice !== undefined ? { gte: minPrice } : {}),
              ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
            },
          }
        : {}),

      // Last, so no query filter (e.g. isActive=false) can widen it.
      ...(scope.sellableOnly ? SELLABLE_PRODUCT_WHERE : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: SORT_MAP[sort ?? 'newest'],
        include: PRODUCT_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total };
  }

  /** Units sold per product over the trailing 30 days, for the catalogue table. */
  async recentSales(productIds: string[]): Promise<Record<string, number>> {
    if (!productIds.length) return {};

    const since = new Date(Date.now() - 30 * 86_400_000);
    const rows = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
        order: { status: { not: 'CANCELLED' }, createdAt: { gte: since } },
      },
      _sum: { quantity: true },
    });

    return rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.productId] = row._sum.quantity ?? 0;
      return acc;
    }, {});
  }

  /** Whether customers may see and buy this product right now. */
  async isSellable(id: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id, ...SELLABLE_PRODUCT_WHERE },
    });
    return count > 0;
  }

  async shopExists(id: string): Promise<boolean> {
    return (await this.prisma.shop.count({ where: { id } })) > 0;
  }

  findById(id: string): Promise<ProductsEntity | null> {
    return this.prisma.product.findUnique({
      where: { id },
      include: PRODUCT_INCLUDE,
    });
  }

  /** Active products ranked by units actually sold (non-cancelled orders). */
  async findBestSelling(limit: number): Promise<ProductsEntity[]> {
    const topSelling = await this.prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: { status: { not: 'CANCELLED' } },
        product: SELLABLE_PRODUCT_WHERE,
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: limit,
    });

    if (topSelling.length === 0) {
      return [];
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: topSelling.map((row) => row.productId) } },
      include: PRODUCT_INCLUDE,
    });

    const order = new Map(
      topSelling.map((row, index) => [row.productId, index]),
    );
    return products.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  }

  async create(
    data: Omit<CreateProductDto, 'shopId'>,
    files: Express.Multer.File[],
    owner: {
      shopId: string;
      moderationStatus?: Prisma.ProductCreateInput['moderationStatus'];
    },
  ): Promise<ProductsEntity> {
    const product = await this.prisma.product.create({
      data: {
        ...data,
        shopId: owner.shopId,
        ...(owner.moderationStatus ? { moderationStatus: owner.moderationStatus } : {}),
      },
    });

    await this.prisma.inventory.create({
      data: { productId: product.id, quantity: 0 },
    });

    if (files.length > 0) {
      try {
        await this.addImages(product.id, files, 0);
      } catch (error) {
        await this.prisma.product.delete({ where: { id: product.id } });
        throw error;
      }
    }

    return this.findById(product.id) as Promise<ProductsEntity>;
  }

  async update(
    id: string,
    data: UpdateProductDto,
    files: Express.Multer.File[],
  ): Promise<ProductsEntity> {
    await this.prisma.product.update({
      where: { id },
      data: data,
    });

    if (files.length > 0) {
      const existingCount = await this.prisma.productImage.count({
        where: { productId: id },
      });
      await this.addImages(id, files, existingCount);
    }

    return this.findById(id) as Promise<ProductsEntity>;
  }

  async remove(id: string): Promise<ProductsEntity> {
    const product = await this.findById(id);

    if (product) {
      await Promise.allSettled(
        product.images.map((image) =>
          this.cloudinaryService.remove(image.publicId),
        ),
      );
    }

    await this.prisma.product.delete({ where: { id } });

    return product as ProductsEntity;
  }

  private async addImages(
    productId: string,
    files: Express.Multer.File[],
    startingSortOrder: number,
  ): Promise<void> {
    const uploads = await Promise.all(
      files.map((file) => this.cloudinaryService.upload(file)),
    );

    await this.prisma.productImage.createMany({
      data: uploads.map((image, index) => ({
        productId,
        url: image.secure_url,
        publicId: image.public_id,
        sortOrder: startingSortOrder + index,
        isPrimary: startingSortOrder === 0 && index === 0,
      })),
    });
  }
}
