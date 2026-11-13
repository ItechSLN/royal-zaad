import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PLATFORM_SHOP_ID,
  publicShop,
} from '../marketplace/marketplace.constants';
import type {
  CreateProductDto,
  ProductsQueryDto,
  UpdateProductDto,
} from './dto/products.dto';
import type { ProductsEntity } from './entities/products.entity';
import { ProductsRepository } from './products.repository';
import { PromotionsService } from '../promotions/promotions.service';

/**
 * The storefront view of a product: cost prices are back-office data and must
 * never reach an anonymous or customer caller.
 */
const toPublic = <T extends ProductsEntity>(product: T): T => {
  const { costPrice: _cost, ...rest } = product;
  const variants = (product as { variants?: { costPrice?: unknown }[] })
    .variants;

  return {
    ...rest,
    ...(variants
      ? {
          variants: variants.map(({ costPrice: _vCost, ...v }) => v),
        }
      : {}),
  } as T;
};

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly promotionsService: PromotionsService,
  ) {}

  /**
   * The shopper-facing product: cost data stripped, and any live promotion
   * applied — `price` becomes what checkout will charge (same maths as
   * OrderPricingService) and the catalogue price moves to `compareAtPrice`
   * so the storefront shows it struck through.
   */
  private async forShopper<T extends ProductsEntity>(product: T): Promise<T> {
    const view = { ...toPublic(product), shop: publicShop(product.shop) };
    const listPrice = Number(product.price);
    const discount = await this.promotionsService.bestDiscountForProduct(
      product.id,
      listPrice,
      new Date(),
    );
    if (discount <= 0) return view;

    const promoted = Math.max(0, Math.round((listPrice - discount) * 100) / 100);
    const was = Math.max(listPrice, Number(product.compareAtPrice ?? 0));
    return { ...view, price: promoted, compareAtPrice: was } as unknown as T;
  }

  /**
   * Staff see the whole catalogue; everyone else only sees published products,
   * without cost data.
   */
  async findAll(
    query: ProductsQueryDto,
    isStaff = false,
  ): Promise<{ data: ProductsEntity[]; meta: any }> {
    // The public sees sellable products only (published, approved, from an
    // active shop with an approved vendor); a shop id narrows to one storefront.
    const scope = isStaff
      ? { shopId: query.shopId }
      : { sellableOnly: true, shopId: query.shopId };

    const { page, limit } = query;
    const { data, total } = await this.productsRepository.findAll(query, scope);

    // The catalogue table shows 30-day sales alongside stock.
    const sales = await this.productsRepository.recentSales(
      data.map((product) => product.id),
    );

    return {
      data: await Promise.all(
        data.map(async (product) => ({
          ...(isStaff ? product : await this.forShopper(product)),
          sales30d: sales[product.id] ?? 0,
        })),
      ),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findBestSelling(limit: number): Promise<ProductsEntity[]> {
    const products = await this.productsRepository.findBestSelling(limit);
    return Promise.all(products.map((product) => this.forShopper(product)));
  }

  async findOne(id: string): Promise<ProductsEntity> {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    return product;
  }

  /** Storefront lookup: drafts are indistinguishable from missing products. */
  async findOneForViewer(id: string, isStaff: boolean): Promise<ProductsEntity> {
    const product = await this.findOne(id);

    if (isStaff) return product;
    if (!(await this.productsRepository.isSellable(id))) {
      throw new NotFoundException(`Product ${id} was not found.`);
    }

    return this.forShopper(product);
  }

  /** Staff create into any shop (the platform shop by default), pre-approved. */
  async create(
    data: CreateProductDto,
    files: Express.Multer.File[],
  ): Promise<ProductsEntity> {
    const { shopId = PLATFORM_SHOP_ID, ...fields } = data;
    if (!(await this.productsRepository.shopExists(shopId))) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: { shopId: 'Shop not found' },
      });
    }

    return this.productsRepository.create(fields, files, {
      shopId,
      moderationStatus: 'APPROVED',
    });
  }

  async update(
    id: string,
    data: UpdateProductDto,
    files: Express.Multer.File[],
  ): Promise<ProductsEntity> {
    await this.findOne(id);
    return this.productsRepository.update(id, data, files);
  }

  async remove(id: string): Promise<ProductsEntity> {
    await this.findOne(id);
    return this.productsRepository.remove(id);
  }
}
