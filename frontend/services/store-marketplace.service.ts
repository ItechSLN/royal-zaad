import { api } from "@/lib/api";

/**
 * Storefront marketplace discovery: location-aware product search, shop
 * profiles, nearby shops, geocoding a typed place, reports and email
 * verification. All ranking, distances and eligibility are computed by the
 * server — the UI only displays what comes back.
 */

/** Public shop fields returned alongside products. Coordinates are null unless verified. */
export type ShopSummary = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  offersDelivery: boolean;
  offersPickup: boolean;
};

export type SearchProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  price: number | string;
  compareAtPrice: number | string | null;
  barcode: string | null;
  images: { url: string }[];
  category: { id: string; name: string } | null;
  brand: { id: string; name: string } | null;
  shop: ShopSummary | null;
  available: number;
  rating: number | null;
  reviewCount: number;
  distanceKm: number | null;
  /** true / false, or null when unknown (no location, or unlocated shop). */
  deliversToYou: boolean | null;
  relevance: number;
};

export type SearchSort = "relevance" | "nearest" | "price_asc" | "price_desc";
export type FulfillmentFilter = "delivery" | "pickup";

export type SearchProductsParams = {
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  sort?: SearchSort;
  categoryId?: string;
  brandId?: string;
  shopId?: string;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  fulfillment?: FulfillmentFilter;
  includeOutOfStock?: boolean;
  page?: number;
  limit?: number;
};

export type SearchProductsResponse = {
  data: SearchProduct[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sort?: SearchSort;
    location?: unknown;
    radiusKm?: number | null;
    capped?: boolean;
  };
};

/** Drops empty values so the server only sees the filters actually in use. */
const clean = (params: Record<string, unknown>) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "" && v !== false)
  );

export const searchProducts = async (params: SearchProductsParams) => {
  const hasLocation = params.lat !== undefined && params.lng !== undefined;
  const response = await api.get("/search/products", {
    params: clean({
      ...params,
      // The server rejects distance options without a location.
      radiusKm: hasLocation ? params.radiusKm : undefined,
      sort: !hasLocation && params.sort === "nearest" ? "relevance" : params.sort,
      includeOutOfStock: params.includeOutOfStock ? "true" : undefined,
    }),
  });
  return response.data as SearchProductsResponse;
};

export type NearbyShop = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  deliveryRadiusKm: number | null;
  distanceKm: number | null;
  productCount: number;
};

export const searchShops = async (params: { lat: number; lng: number; radiusKm?: number; limit?: number }) => {
  const response = await api.get("/search/shops", { params: clean(params) });
  return response.data as NearbyShop[];
};

export type OpeningHours = Partial<
  Record<"mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun", { open: string; close: string }[]>
>;

export type PublicShop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  city: string | null;
  state?: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  openingHours: OpeningHours | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  deliveryRadiusKm: number | null;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  reviewCount: number;
  productCount: number;
};

export const getShopBySlug = async (slug: string) => {
  const response = await api.get(`/shops/${encodeURIComponent(slug)}`);
  return response.data as PublicShop;
};

export type GeoLookupResult = { latitude: number; longitude: number; label: string };

/** Geocodes a typed postcode, city or area. 400 `{errors: {q}}` when nothing matches. */
export const lookupPlace = async (q: string, country?: string) => {
  const response = await api.get("/geo/lookup", { params: clean({ q, country }) });
  return response.data as GeoLookupResult;
};

export const REPORT_REASONS = [
  { value: "COUNTERFEIT", label: "Counterfeit or fake" },
  { value: "PROHIBITED", label: "Prohibited item" },
  { value: "MISLEADING", label: "Misleading listing" },
  { value: "OFFENSIVE", label: "Offensive content" },
  { value: "FRAUD", label: "Fraud or scam" },
  { value: "OTHER", label: "Something else" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export type ReportInput =
  | { targetType: "PRODUCT"; productId: string; reason: ReportReason; details?: string }
  | { targetType: "SHOP"; shopId: string; reason: ReportReason; details?: string };

export const submitReport = async (input: ReportInput) => {
  const response = await api.post("/reports", {
    ...input,
    ...(input.details?.trim() ? { details: input.details.trim() } : { details: undefined }),
  });
  return response.data as { id: string };
};

export const verifyEmail = async (token: string) => {
  const response = await api.post("/auth/verify-email", { token });
  return response.data as { message?: string };
};
