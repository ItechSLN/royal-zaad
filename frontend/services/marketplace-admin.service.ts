import { api } from "@/lib/api";
import type { ListMeta } from "@/services/admin-resource.service";

/* Marketplace administration — vendors, shops, moderation, reports, payouts, settings. */

export type Paged<T> = { data: T[]; meta: ListMeta };

/* --------------------------------- Vendors -------------------------------- */

export type VendorStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";
export type VendorTargetStatus = Exclude<VendorStatus, "PENDING">;

export const VENDOR_STATUSES: VendorStatus[] = ["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"];

/** Which status changes an admin may make (mirrors the API). */
export const VENDOR_TRANSITIONS: Record<VendorStatus, VendorTargetStatus[]> = {
  PENDING: ["ACTIVE", "REJECTED"],
  ACTIVE: ["SUSPENDED"],
  SUSPENDED: ["ACTIVE"],
  REJECTED: ["ACTIVE"],
};

export type VendorUser = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerifiedAt: string | null;
};

export type VendorStats = { productCount: number; orderCount: number; grossSales: number };

export type AdminVendor = {
  id: string;
  status: VendorStatus;
  statusReason: string | null;
  commissionRate: number | null;
  isPlatform: boolean;
  approvedAt: string | null;
  createdAt: string;
  user: VendorUser | null;
  shop: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    country: string | null;
    locationVerifiedAt: string | null;
    isActive: boolean;
  } | null;
  stats: VendorStats;
};

export type AdminShop = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  locationVerifiedAt: string | null;
  openingHours: unknown;
  offersDelivery: boolean;
  offersPickup: boolean;
  deliveryRadiusKm: number | null;
  shippingFlatFee: number | null;
  freeShippingOver: number | null;
  isActive: boolean;
};

export type VendorSubOrder = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  fulfillmentMethod: string | null;
  total: number;
  commissionAmount: number;
  vendorNet: number;
  payoutId: string | null;
  createdAt: string;
};

export type AdminVendorDetail = Omit<AdminVendor, "shop"> & {
  shop: AdminShop | null;
  recentSubOrders: VendorSubOrder[];
};

export const getVendors = async (params: {
  status?: VendorStatus;
  q?: string;
  page?: number;
  limit?: number;
}) => (await api.get("/admin/vendors", { params })).data as Paged<AdminVendor>;

export const getVendor = async (id: string) =>
  (await api.get(`/admin/vendors/${id}`)).data as AdminVendorDetail;

export const changeVendorStatus = async (
  id: string,
  body: { status: VendorTargetStatus; reason?: string }
) =>
  (await api.patch(`/admin/vendors/${id}/status`, body)).data as {
    message: string;
    openSubOrders?: number;
    vendor: AdminVendorDetail;
  };

export const updateVendorCommission = async (id: string, commissionRate: number | null) =>
  (await api.patch(`/admin/vendors/${id}/commission`, { commissionRate }))
    .data as AdminVendorDetail;

export const updateShopLocation = async (
  shopId: string,
  body: { latitude: number; longitude: number }
) => (await api.patch(`/admin/shops/${shopId}/location`, body)).data as AdminShop;

export const osmLink = (lat: number, lng: number) =>
  `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`;

/* -------------------------------- Moderation ------------------------------ */

export type ModerationStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "REMOVED";
export type ModerationDecision = Exclude<ModerationStatus, "PENDING_REVIEW">;

export type ModerationProduct = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number | string;
  isActive: boolean;
  archivedAt: string | null;
  moderationStatus: ModerationStatus;
  createdAt: string;
  updatedAt: string;
  category: { id: string; name: string; slug: string } | null;
  image: { id: string; url: string } | null;
  shop: {
    id: string;
    name: string;
    slug: string;
    vendor: { id: string; status: VendorStatus; isPlatform: boolean };
  } | null;
};

export const getModerationQueue = async (params: {
  moderationStatus?: ModerationStatus;
  shopId?: string;
  page?: number;
  limit?: number;
}) => (await api.get("/admin/moderation/products", { params })).data as Paged<ModerationProduct>;

export const moderateProduct = async (
  id: string,
  body: { moderationStatus: ModerationDecision; reason?: string }
) => (await api.patch(`/admin/moderation/products/${id}`, body)).data;

/* --------------------------------- Reports -------------------------------- */

export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";
export type ReportTarget = "PRODUCT" | "SHOP";
export type ReportAction = "REMOVE_PRODUCT" | "SUSPEND_VENDOR";

export type MarketplaceReport = {
  id: string;
  targetType: ReportTarget;
  reason: string;
  details: string | null;
  status: ReportStatus;
  resolution: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { id: string; email: string } | null;
  product: { id: string; name: string; slug: string; moderationStatus: ModerationStatus } | null;
  shop: {
    id: string;
    name: string;
    slug: string;
    vendor: { id: string; status: VendorStatus; isPlatform: boolean };
  } | null;
};

export const getReports = async (params: {
  status?: ReportStatus;
  targetType?: ReportTarget;
  page?: number;
  limit?: number;
}) => (await api.get("/admin/reports", { params })).data as Paged<MarketplaceReport>;

export const resolveReport = async (
  id: string,
  body: { status: "RESOLVED" | "DISMISSED"; resolution: string; action?: ReportAction }
) =>
  (await api.patch(`/admin/reports/${id}`, body)).data as MarketplaceReport & {
    actionResult?: string;
  };

/* --------------------------------- Payouts -------------------------------- */

export type PayoutStatus = "PENDING" | "PAID" | "CANCELLED";

export type Payout = {
  id: string;
  vendorId: string;
  amount: number;
  currency: string;
  status: PayoutStatus;
  reference: string | null;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
  subOrderCount: number;
  vendor: {
    id: string;
    status: VendorStatus;
    user: { email: string; firstName: string | null; lastName: string | null } | null;
    shop: { id: string; name: string; slug: string } | null;
  };
};

export type PayoutDetail = Payout & {
  subOrders: {
    id: string;
    orderId: string;
    orderNumber: string;
    status: string;
    total: number;
    commissionRate: number;
    commissionAmount: number;
    vendorNet: number;
    createdAt: string;
  }[];
};

export type VendorBalance = {
  vendorId: string;
  vendorStatus: VendorStatus;
  email: string | null;
  shop: { id: string; name: string; slug: string };
  payableAmount: number;
  payableSubOrders: number;
  pendingAmount: number;
  pendingSubOrders: number;
};

export const getPayouts = async (params: {
  vendorId?: string;
  status?: PayoutStatus;
  page?: number;
  limit?: number;
}) => (await api.get("/admin/payouts", { params })).data as Paged<Payout>;

export const getPayout = async (id: string) =>
  (await api.get(`/admin/payouts/${id}`)).data as PayoutDetail;

export const getBalances = async () =>
  (await api.get("/admin/payouts/balances")).data as { data: VendorBalance[] };

export const createPayout = async (body: { vendorId: string; note?: string }) =>
  (await api.post("/admin/payouts", body)).data as PayoutDetail;

export const updatePayout = async (
  id: string,
  body: { status: "PAID"; reference: string; note?: string } | { status: "CANCELLED"; note?: string }
) => (await api.patch(`/admin/payouts/${id}`, body)).data as PayoutDetail;

/* --------------------------------- Settings ------------------------------- */

export type MarketplaceSettings = { commissionRate: number; requireProductApproval: boolean };

export const getMarketplaceSettings = async () =>
  (await api.get("/admin/marketplace/settings")).data as MarketplaceSettings;

export const updateMarketplaceSettings = async (body: Partial<MarketplaceSettings>) =>
  (await api.patch("/admin/marketplace/settings", body)).data as MarketplaceSettings;

/* ------------------------- Order breakdown (per shop) --------------------- */

export type OrderVendorBreakdown = {
  id: string;
  shopId: string;
  status: string;
  fulfillmentMethod: string | null;
  subtotal: number | string;
  shippingTotal: number | string;
  taxTotal: number | string;
  total: number | string;
  commissionRate: number | string;
  commissionAmount: number | string;
  vendorNet: number | string;
  shop: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    city: string | null;
    phone: string | null;
  } | null;
  shipments?: unknown[];
};
