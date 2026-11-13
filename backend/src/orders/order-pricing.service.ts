import { BadRequestException, Injectable } from '@nestjs/common';
import type { FulfillmentMethod, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CouponsService } from '../coupons/coupons.service';
import { PromotionsService } from '../promotions/promotions.service';
import {
  COMMISSION_RATE_KEY,
  DEFAULT_COMMISSION_RATE,
  SELLABLE_PRODUCT_WHERE,
} from '../marketplace/marketplace.constants';
import { distanceKm, isValidCoordinate } from '../geo/distance';

type PrismaClientOrTx = PrismaService | Prisma.TransactionClient;

/** Settings keys edited on the admin Settings screen (Fulfilment section). */
export const SHIPPING_FLAT_FEE_KEY = 'flat_shipping_rate';
export const SHIPPING_FREE_OVER_KEY = 'free_shipping_threshold';

// Must match the defaults the Settings screen shows before anything is saved.
const DEFAULT_FLAT_FEE = 25;
const DEFAULT_FREE_OVER = 250;

const round = (n: number) => Math.round(n * 100) / 100;

const invalid = (field: string, message: string) =>
  new BadRequestException({ message: 'Validation failed', errors: { [field]: message } });

export type PricedLine = {
  productId: string;
  shopId: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

/** One shop's share of the basket — becomes a VendorOrder. */
export type ShopGroup = {
  shopId: string;
  shopName: string;
  fulfillmentMethod: FulfillmentMethod;
  availableMethods: FulfillmentMethod[];
  /** Distance from the shop to the delivery address, when both are located. */
  distanceKm: number | null;
  lines: PricedLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
  commissionRate: number;
  commissionAmount: number;
  vendorNet: number;
};

export type OrderPricing = {
  groups: ShopGroup[];
  /** Every line across shops — kept for single-list consumers. */
  lines: PricedLine[];
  subtotal: number;
  couponId?: string;
  discountTotal: number;
  shippingTotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
};

export type PricingInput = {
  items: { productId: string; quantity: number }[];
  couponCode?: string;
  /** The delivery address: its country sets tax, its point the delivery radius. */
  address?: {
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  /** Chosen method per shop; defaults to delivery where offered, else pickup. */
  fulfillment?: { shopId: string; method: FulfillmentMethod }[];
};

/**
 * The single source of truth for what a checkout costs. Used both to quote the
 * checkout summary and to create the order, so the customer is charged exactly
 * what they were shown.
 *
 * - Only sellable products (published, approved, from an active shop of an
 *   approved vendor) can be priced. Unit prices come from the catalogue, less
 *   the best live promotion.
 * - Lines are grouped by shop. Each group is fulfilled separately:
 *   - shipping: the shop's flat fee (or the platform default), waived over the
 *     shop's free-shipping threshold (or the platform default); pickup is free;
 *   - delivery is refused outside the shop's delivery radius.
 * - A coupon applies to the whole basket and is shared between shops in
 *   proportion to their goods.
 * - Tax: the active TaxRate for the shipping country, on each group's goods
 *   after discount plus shipping. Prices are tax-exclusive.
 * - Commission: the vendor's rate (or the platform default) on goods after
 *   discount; the platform's own shop pays none. vendorNet = total − commission.
 */
@Injectable()
export class OrderPricingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly couponsService: CouponsService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async price(
    input: PricingInput,
    client: PrismaClientOrTx = this.prisma,
  ): Promise<OrderPricing> {
    const now = new Date();
    const settings = await this.readSettings(client);
    const groups = new Map<string, ShopGroup & { shop: ShopForPricing }>();

    for (const item of input.items) {
      const product = await client.product.findFirst({
        where: { id: item.productId },
        include: {
          images: { orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }], take: 1 },
          shop: { include: { vendor: true } },
        },
      });
      if (!product) throw invalid('items', `Product ${item.productId} was not found`);

      const sellable = await client.product.count({
        where: { id: product.id, ...SELLABLE_PRODUCT_WHERE },
      });
      if (!sellable) throw invalid('items', `${product.name} is not currently available`);

      const discountPerUnit = await this.promotionsService.bestDiscountForProduct(
        product.id,
        Number(product.price),
        now,
        client,
      );
      const unitPrice = Math.max(0, round(Number(product.price) - discountPerUnit));

      const group =
        groups.get(product.shopId) ?? this.newGroup(product.shop, settings);
      group.lines.push({
        productId: product.id,
        shopId: product.shopId,
        name: product.name,
        sku: product.sku,
        imageUrl: product.images[0]?.url ?? null,
        quantity: item.quantity,
        unitPrice,
        total: round(unitPrice * item.quantity),
      });
      groups.set(product.shopId, group);
    }

    const all = [...groups.values()];
    for (const group of all) {
      group.subtotal = round(group.lines.reduce((sum, line) => sum + line.total, 0));
    }
    const subtotal = round(all.reduce((sum, g) => sum + g.subtotal, 0));

    // Coupon: validated against the whole basket, shared out by goods value.
    let couponId: string | undefined;
    let discountTotal = 0;
    if (input.couponCode) {
      const coupon = await this.couponsService.validateForOrder(input.couponCode, subtotal, client);
      discountTotal = Math.min(subtotal, this.couponsService.calculateDiscount(coupon, subtotal));
      couponId = coupon.id;
    }
    this.allocate(all, discountTotal);

    const taxRate = await this.taxRateFor(input.address?.country, client);
    const chosen = new Map((input.fulfillment ?? []).map((f) => [f.shopId, f.method]));
    for (const shopId of chosen.keys()) {
      if (!groups.has(shopId)) throw invalid('fulfillment', 'Fulfilment chosen for a shop not in the basket');
    }

    for (const group of all) {
      const method = chosen.get(group.shopId) ?? group.availableMethods[0];
      if (!method || !group.availableMethods.includes(method)) {
        throw invalid(
          'fulfillment',
          `${group.shopName} doesn't offer ${method === 'PICKUP' ? 'pickup' : 'delivery'}`,
        );
      }
      group.fulfillmentMethod = method;
      group.distanceKm = this.distanceFrom(group.shop, input.address);

      if (method === 'DELIVERY' && group.shop.deliveryRadiusKm !== null) {
        if (group.distanceKm === null) {
          throw invalid(
            'fulfillment',
            `${group.shopName} only delivers within ${group.shop.deliveryRadiusKm} km and this address couldn't be located — choose pickup or another address`,
          );
        }
        if (group.distanceKm > group.shop.deliveryRadiusKm) {
          throw invalid(
            'fulfillment',
            `${group.shopName} only delivers within ${group.shop.deliveryRadiusKm} km (this address is ${group.distanceKm.toFixed(1)} km away)`,
          );
        }
      }

      const goods = round(group.subtotal - group.discountTotal);
      group.shippingTotal = method === 'PICKUP' ? 0 : this.shippingFor(goods, group.shop, settings);
      group.taxTotal = round((goods + group.shippingTotal) * (taxRate / 100));
      group.total = round(goods + group.shippingTotal + group.taxTotal);
      group.commissionAmount = round(goods * (group.commissionRate / 100));
      group.vendorNet = round(group.total - group.commissionAmount);
    }

    const sum = (pick: (g: ShopGroup) => number) => round(all.reduce((acc, g) => acc + pick(g), 0));
    const publicGroups: ShopGroup[] = all.map(({ shop: _shop, ...g }) => g);

    return {
      groups: publicGroups,
      lines: publicGroups.flatMap((g) => g.lines),
      subtotal,
      couponId,
      discountTotal,
      shippingTotal: sum((g) => g.shippingTotal),
      taxRate,
      taxTotal: sum((g) => g.taxTotal),
      total: sum((g) => g.total),
    };
  }

  private newGroup(shop: ShopForPricing, settings: PricingSettings): ShopGroup & { shop: ShopForPricing } {
    const availableMethods: FulfillmentMethod[] = [
      ...(shop.offersDelivery ? (['DELIVERY'] as const) : []),
      ...(shop.offersPickup ? (['PICKUP'] as const) : []),
    ];
    const commissionRate = shop.vendor.isPlatform
      ? 0
      : Number(shop.vendor.commissionRate ?? settings.commissionRate);

    return {
      shop,
      shopId: shop.id,
      shopName: shop.name,
      fulfillmentMethod: availableMethods[0] ?? 'DELIVERY',
      availableMethods,
      distanceKm: null,
      lines: [],
      subtotal: 0,
      discountTotal: 0,
      shippingTotal: 0,
      taxTotal: 0,
      total: 0,
      commissionRate,
      commissionAmount: 0,
      vendorNet: 0,
    };
  }

  /** Splits a discount across groups by goods value; rounding remainder to the last. */
  private allocate(groups: ShopGroup[], discount: number) {
    const subtotal = groups.reduce((sum, g) => sum + g.subtotal, 0);
    let remaining = discount;
    groups.forEach((group, index) => {
      const share =
        index === groups.length - 1
          ? remaining
          : subtotal > 0
            ? round((discount * group.subtotal) / subtotal)
            : 0;
      group.discountTotal = Math.min(group.subtotal, round(share));
      remaining = round(remaining - group.discountTotal);
    });
  }

  private distanceFrom(shop: ShopForPricing, address: PricingInput['address']): number | null {
    if (
      !shop.locationVerifiedAt ||
      !isValidCoordinate(shop.latitude, shop.longitude) ||
      !isValidCoordinate(address?.latitude, address?.longitude)
    ) {
      return null;
    }
    return round(
      distanceKm(
        { latitude: shop.latitude!, longitude: shop.longitude! },
        { latitude: address!.latitude!, longitude: address!.longitude! },
      ),
    );
  }

  private shippingFor(goods: number, shop: ShopForPricing, settings: PricingSettings) {
    if (goods <= 0) return 0;
    const flatFee = shop.shippingFlatFee !== null ? Number(shop.shippingFlatFee) : settings.flatFee;
    const freeOver = shop.freeShippingOver !== null ? Number(shop.freeShippingOver) : settings.freeOver;
    return freeOver > 0 && goods >= freeOver ? 0 : round(flatFee);
  }

  private async readSettings(client: PrismaClientOrTx): Promise<PricingSettings> {
    const rows = await client.setting.findMany({
      where: { key: { in: [SHIPPING_FLAT_FEE_KEY, SHIPPING_FREE_OVER_KEY, COMMISSION_RATE_KEY] } },
    });
    const read = (key: string, fallback: number) => {
      const raw = rows.find((s) => s.key === key)?.value;
      const value = raw === undefined ? NaN : Number(raw);
      return Number.isFinite(value) && value >= 0 ? value : fallback;
    };
    return {
      flatFee: read(SHIPPING_FLAT_FEE_KEY, DEFAULT_FLAT_FEE),
      freeOver: read(SHIPPING_FREE_OVER_KEY, DEFAULT_FREE_OVER),
      commissionRate: Math.min(100, read(COMMISSION_RATE_KEY, DEFAULT_COMMISSION_RATE)),
    };
  }

  private async taxRateFor(country: string | null | undefined, client: PrismaClientOrTx) {
    if (!country) return 0;
    const rate = await client.taxRate.findFirst({
      where: { countryCode: country.toUpperCase(), isActive: true },
      orderBy: { createdAt: 'asc' },
    });
    return rate ? Number(rate.rate) : 0;
  }
}

type PricingSettings = { flatFee: number; freeOver: number; commissionRate: number };
type ShopForPricing = Prisma.ShopGetPayload<{ include: { vendor: true } }>;
