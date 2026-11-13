import { api } from "@/lib/api";

/**
 * The shop-owner workspace. Every /vendor/* call is scoped to the signed-in
 * vendor's own shop on the server — the UI never sends a shop id.
 */

export type Paginated<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

/* ── Session / onboarding ─────────────────────────────────────────── */

export type VendorMe = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleKind: "CUSTOMER" | "VENDOR" | "STAFF";
  emailVerified: boolean;
  customerId: string | null;
};

export type VendorSession = {
  status?: string;
  token: string;
  user: { id: string; email: string; firstName: string; lastName: string };
};

export type RegisterVendorInput = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  shopName: string;
  phone?: string;
  description?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type RegisterVendorResult = VendorSession & {
  vendorStatus: "PENDING";
  shopSlug: string;
  verifyUrl?: string;
};

/** Same storage the rest of the app uses, so lib/api.ts picks the token up. */
export const storeVendorToken = (token: string) => localStorage.setItem("authToken", token);
export const clearVendorToken = () => localStorage.removeItem("authToken");

export const registerVendor = async (data: RegisterVendorInput) =>
  (await api.post("/auth/register-vendor", data)).data as RegisterVendorResult;

export const vendorSignIn = async (email: string, password: string) =>
  (await api.post("/auth/vendor/signin", { email, password })).data as VendorSession;

export const verifyEmail = async (token: string) =>
  (await api.post("/auth/verify-email", { token })).data as { message: string };

export const resendVerification = async () =>
  (await api.post("/auth/resend-verification")).data as { message: string; verifyUrl?: string };

export const getVendorMe = async () => (await api.get("/auth/me")).data as VendorMe;

/* ── Shop ────────────────────────────────────────────────────────── */

export type VendorStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type OpeningHours = Partial<Record<Weekday, { open: string; close: string }[]>>;

export type VendorShop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  locationVerifiedAt: string | null;
  openingHours: OpeningHours | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  deliveryRadiusKm: number | null;
  shippingFlatFee: string | null;
  freeShippingOver: string | null;
  isActive: boolean;
  vendor?: {
    status: VendorStatus;
    statusReason: string | null;
    approvedAt: string | null;
    commissionRate: string | null;
    user: { email: string; emailVerifiedAt: string | null } | null;
  };
  /** Only on a PATCH that changed the address. */
  locationMessage?: string;
};

export type UpdateShopInput = Partial<{
  name: string;
  description: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  openingHours: OpeningHours | null;
  offersDelivery: boolean;
  offersPickup: boolean;
  deliveryRadiusKm: number | null;
  shippingFlatFee: number | null;
  freeShippingOver: number | null;
}>;

export const getVendorShop = async () => (await api.get("/vendor/shop")).data as VendorShop;

export const updateVendorShop = async (data: UpdateShopInput) =>
  (await api.patch("/vendor/shop", data)).data as VendorShop;

export const uploadShopLogo = async (file: File) => {
  const form = new FormData();
  form.append("logo", file);
  return (
    await api.post("/vendor/shop/logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    })
  ).data as VendorShop;
};

/* ── Products ───────────────────────────────────────────────────── */

export type ModerationStatus = "APPROVED" | "PENDING_REVIEW" | "REJECTED" | "REMOVED";
export type ProductStatusFilter =
  | "all"
  | "published"
  | "draft"
  | "archived"
  | "pending"
  | "rejected"
  | "removed";

export type VendorProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  costPrice: string | null;
  barcode: string | null;
  categoryId: string;
  brandId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  moderationStatus: ModerationStatus;
  /** The marketplace's reason when REJECTED or REMOVED; null otherwise. */
  moderationReason?: string | null;
  archivedAt: string | null;
  images: { id: string; url: string; isPrimary?: boolean; sortOrder?: number }[];
  category?: { id: string; name: string } | null;
  brand?: { id: string; name: string } | null;
  inventory?: { quantity: number; reserved: number; reorderAt: number } | null;
  createdAt: string;
  updatedAt: string;
};

export type VendorProductInput = {
  name: string;
  slug: string;
  sku: string;
  price: string;
  categoryId: string;
  compareAtPrice?: string;
  costPrice?: string;
  barcode?: string;
  brandId?: string;
  shortDescription?: string;
  description?: string;
  isActive: boolean;
};

/** Optional fields an empty value clears on the server (required ones never go blank). */
const CLEARABLE = new Set(["compareAtPrice", "costPrice", "barcode", "brandId", "shortDescription", "description"]);

const productForm = (data: Partial<VendorProductInput>, images: File[]) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined || value === null) continue;
    if (typeof value === "boolean") form.append(key, String(value));
    else if (String(value).trim() !== "") form.append(key, String(value).trim());
    else if (CLEARABLE.has(key)) form.append(key, "");
  }
  for (const file of images) form.append("images", file);
  return form;
};

const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } };

export const getVendorProducts = async (params: {
  status?: ProductStatusFilter;
  q?: string;
  page?: number;
  limit?: number;
}) =>
  (await api.get("/vendor/products", { params: { ...params, q: params.q || undefined } }))
    .data as Paginated<VendorProduct>;

export const getVendorProduct = async (id: string) =>
  (await api.get(`/vendor/products/${id}`)).data as VendorProduct;

export const createVendorProduct = async (data: VendorProductInput, images: File[]) =>
  (await api.post("/vendor/products", productForm(data, images), MULTIPART)).data as VendorProduct;

export const updateVendorProduct = async (
  id: string,
  data: Partial<VendorProductInput>,
  images: File[]
) =>
  (await api.patch(`/vendor/products/${id}`, productForm(data, images), MULTIPART))
    .data as VendorProduct;

export const archiveVendorProduct = async (id: string, archived: boolean) =>
  (await api.post(`/vendor/products/${id}/${archived ? "archive" : "unarchive"}`))
    .data as VendorProduct;

export const deleteVendorProduct = async (id: string) =>
  (await api.delete(`/vendor/products/${id}`)).data as VendorProduct;

/* ── Inventory ──────────────────────────────────────────────────── */

export type VendorInventoryRow = {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  reorderAt: number;
  available: number;
  updatedAt: string;
  product: { id: string; name: string; sku: string; isActive: boolean; archivedAt: string | null };
};

export type AdjustReason = "COUNT" | "DAMAGE" | "RECEIPT" | "TRANSFER" | "RETURN";

export const getVendorInventory = async () =>
  (await api.get("/vendor/inventory")).data as VendorInventoryRow[];

export const adjustVendorStock = async (
  productId: string,
  data: { reason: AdjustReason; quantity: number; reserved?: number; reorderAt?: number; note?: string }
) => (await api.post(`/vendor/inventory/${productId}/adjust`, data)).data;

/* ── Orders ─────────────────────────────────────────────────────── */

export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

export type VendorOrder = {
  id: string;
  status: OrderStatus;
  fulfillmentMethod: "DELIVERY" | "PICKUP";
  subtotal: string;
  discountTotal: string;
  shippingTotal: string;
  taxTotal: string;
  total: string;
  commissionRate: string;
  commissionAmount: string;
  vendorNet: string;
  createdAt: string;
  items: {
    id: string;
    productId: string | null;
    productName: string;
    sku: string;
    imageUrl: string | null;
    quantity: number;
    unitPrice: string;
    total: string;
  }[];
  shipments: {
    id: string;
    awb: string;
    carrier: string;
    status: string;
    dispatchedAt: string | null;
    deliveredAt: string | null;
    createdAt: string;
  }[];
  order: {
    id: string;
    orderNumber: string;
    createdAt: string;
    customer: { firstName: string; lastName: string } | null;
    shippingAddress: {
      recipientName: string | null;
      line1: string;
      line2: string | null;
      city: string;
      state: string | null;
      postalCode: string | null;
      country: string;
      phone: string | null;
    } | null;
    payment: { status: string; provider: string } | null;
  };
};

export const getVendorOrders = async (params: { status?: OrderStatus; page?: number; limit?: number }) =>
  (await api.get("/vendor/orders", { params })).data as Paginated<VendorOrder>;

export const getVendorOrder = async (id: string) =>
  (await api.get(`/vendor/orders/${id}`)).data as VendorOrder;

export const updateVendorOrder = async (
  id: string,
  data: { status: "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"; carrier?: string; trackingNumber?: string }
) => (await api.patch(`/vendor/orders/${id}`, data)).data as VendorOrder;

/* ── Insights ───────────────────────────────────────────────────── */

export type VendorAnalytics = {
  periodDays: number;
  orders: { total: number; byStatus: Partial<Record<OrderStatus, number>> };
  grossSales: number;
  commission: number;
  netEarnings: number;
  averageOrderValue: number;
  daily: { date: string; orders: number; sales: number }[];
  topProducts: { productId: string | null; name: string; units: number; revenue: number }[];
  lowStock: { productId: string; name: string; available: number; reorderAt: number }[];
  products: { published: number; draft: number; pendingReview: number; rejectedOrRemoved: number };
};

export const getVendorAnalytics = async (days: number) =>
  (await api.get("/vendor/analytics", { params: { days } })).data as VendorAnalytics;

export type VendorPayouts = {
  balance: number;
  payableOrders: number;
  pendingClearance: number;
  payouts: {
    id: string;
    amount: string;
    currency: string;
    status: "PENDING" | "PAID" | "CANCELLED";
    reference: string | null;
    paidAt: string | null;
    createdAt: string;
    _count: { vendorOrders: number };
  }[];
};

export const getVendorPayouts = async () => (await api.get("/vendor/payouts")).data as VendorPayouts;

/**
 * The emailed / dev confirmation link points at the storefront's
 * /auth/verify-email. Inside the seller centre, keep the owner here.
 */
export const vendorVerifyHref = (verifyUrl: string) => {
  try {
    const token = new URL(verifyUrl).searchParams.get("token");
    return token ? `/vendor/verify-email?token=${encodeURIComponent(token)}` : verifyUrl;
  } catch {
    return verifyUrl;
  }
};
