import type { Prisma } from '@prisma/client';

/**
 * The platform's own vendor and shop — home of the original single-shop
 * catalogue (created by the marketplace_foundation migration).
 */
export const PLATFORM_VENDOR_ID = 'vendor_platform';
export const PLATFORM_SHOP_ID = 'shop_platform';

/** Settings key for the platform commission (percent) when a vendor has none. */
export const COMMISSION_RATE_KEY = 'marketplace_commission_rate';
export const DEFAULT_COMMISSION_RATE = 10;

/** Settings key: when "true", vendor products wait for admin approval. */
export const REQUIRE_PRODUCT_APPROVAL_KEY = 'marketplace_require_product_approval';

/** A shop customers can buy from: active, and its vendor approved. */
export const SELLING_SHOP_WHERE = {
  isActive: true,
  vendor: { status: 'ACTIVE' },
} satisfies Prisma.ShopWhereInput;

/**
 * A product customers can see and buy. Every storefront query, the checkout
 * and search apply this — a vendor's drafts, archived or moderated products,
 * and anything from a suspended or unapproved shop never reach customers.
 */
export const SELLABLE_PRODUCT_WHERE = {
  isActive: true,
  archivedAt: null,
  moderationStatus: 'APPROVED',
  shop: SELLING_SHOP_WHERE,
} satisfies Prisma.ProductWhereInput;

/** Public shop fields shown alongside products. Coordinates only once verified. */
export const SHOP_SUMMARY_SELECT = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
  city: true,
  country: true,
  latitude: true,
  longitude: true,
  locationVerifiedAt: true,
  offersDelivery: true,
  offersPickup: true,
} satisfies Prisma.ShopSelect;

type ShopSummaryRow = Prisma.ShopGetPayload<{ select: typeof SHOP_SUMMARY_SELECT }>;

/** Drops coordinates that haven't been verified, so nothing measures from them. */
export const publicShop = (shop: ShopSummaryRow) => {
  const { locationVerifiedAt, latitude, longitude, ...rest } = shop;
  const located = !!locationVerifiedAt && latitude !== null && longitude !== null;
  return {
    ...rest,
    latitude: located ? latitude : null,
    longitude: located ? longitude : null,
  };
};
