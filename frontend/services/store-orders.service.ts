import { api } from "@/lib/api";

export type StoreOrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";

export type StoreOrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  product: { id: string; name: string; sku: string; images?: { url: string }[] };
  /** Snapshots taken when the order was placed (marketplace orders). */
  shopId?: string | null;
  vendorOrderId?: string | null;
  productName?: string | null;
  sku?: string | null;
  imageUrl?: string | null;
};

export type FulfillmentMethod = "DELIVERY" | "PICKUP";
export type FulfillmentChoice = { shopId: string; method: FulfillmentMethod };

export type VendorOrderShipment = {
  id?: string;
  awb: string;
  carrier: string;
  status: string;
  city?: string | null;
  eta: string | null;
  dispatchedAt?: string | null;
  deliveredAt?: string | null;
};

/** One shop's part of an order — it moves through its own statuses. */
export type VendorOrder = {
  id: string;
  shopId?: string;
  status: StoreOrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  subtotal?: string | number;
  discountTotal?: string | number;
  shippingTotal?: string | number;
  taxTotal?: string | number;
  total?: string | number;
  shop: { id?: string; name: string; slug: string; logoUrl: string | null; city: string | null; phone?: string | null };
  shipments: VendorOrderShipment[];
};

export type StoreOrder = {
  id: string;
  orderNumber: string;
  status: StoreOrderStatus;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  shippingTotal: string;
  total: string;
  items: StoreOrderItem[];
  customer?: { id: string; firstName: string; lastName: string; email: string };
  coupon: { id: string; code: string } | null;
  payment: { id: string; status: string; amount: string; provider: string } | null;
  shippingAddress: {
    recipientName: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    postalCode: string;
    country: string;
    phone: string | null;
  } | null;
  vendorOrders?: VendorOrder[];
  createdAt: string;
};

export type CheckoutInput = {
  items: { productId: string; quantity: number }[];
  couponCode?: string;
  shippingAddressId?: string;
  paymentMethod?: "card" | "cod";
  /** Per-shop delivery or pickup choice. */
  fulfillment?: FulfillmentChoice[];
  /** Reused on retry so a resubmission returns the same order instead of a new one. */
  idempotencyKey?: string;
};

export const checkout = async (data: CheckoutInput) => {
  const payload = {
    items: data.items,
    ...(data.couponCode ? { couponCode: data.couponCode } : {}),
    ...(data.shippingAddressId ? { shippingAddressId: data.shippingAddressId } : {}),
    ...(data.paymentMethod ? { paymentMethod: data.paymentMethod } : {}),
    ...(data.fulfillment?.length ? { fulfillment: data.fulfillment } : {}),
    ...(data.idempotencyKey ? { idempotencyKey: data.idempotencyKey } : {}),
  };
  const response = await api.post("/orders", payload);
  return response.data as StoreOrder;
};

export type QuoteLine = {
  productId: string;
  shopId?: string;
  name: string;
  sku?: string;
  imageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
};

/** One shop's slice of the basket, priced by the server. */
export type QuoteGroup = {
  shopId: string;
  shopName: string;
  fulfillmentMethod: FulfillmentMethod;
  availableMethods: FulfillmentMethod[];
  distanceKm: number | null;
  lines: QuoteLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxTotal: number;
  total: number;
};

export type OrderQuote = {
  groups?: QuoteGroup[];
  lines: QuoteLine[];
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  taxRate: number;
  taxTotal: number;
  total: number;
  /** False until a shipping address is chosen — tax depends on the destination. */
  taxCalculated: boolean;
};

/** Server-computed pricing for the checkout summary — the same maths the order uses. */
export const quoteOrder = async (data: Omit<CheckoutInput, "paymentMethod" | "idempotencyKey">) => {
  const response = await api.post("/orders/quote", {
    items: data.items,
    ...(data.couponCode ? { couponCode: data.couponCode } : {}),
    ...(data.shippingAddressId ? { shippingAddressId: data.shippingAddressId } : {}),
    ...(data.fulfillment?.length ? { fulfillment: data.fulfillment } : {}),
  });
  return response.data as OrderQuote;
};

/** Client secret for the order's Stripe PaymentIntent. */
export const createCardPayment = async (orderId: string) => {
  const response = await api.post("/payments/stripe/intent", { orderId });
  return response.data as { clientSecret: string; publishableKey: string | null };
};

/** Asks the server to re-check the payment with Stripe and settle it if it succeeded. */
export const syncCardPayment = async (orderId: string) => {
  const response = await api.post("/payments/stripe/sync", { orderId });
  return response.data as { status: "PENDING" | "PAID" | "FAILED" | "REFUNDED" };
};

export const getMyOrders = async (page = 1, limit = 10) => {
  const response = await api.get("/orders/me", { params: { page, limit } });
  return response.data as { data: StoreOrder[]; meta: { page: number; limit: number; total: number; totalPages: number } };
};

export const getMyOrderById = async (id: string) => {
  const response = await api.get(`/orders/me/${id}`);
  return response.data as StoreOrder;
};

export const validateCoupon = async (code: string, subtotal: number) => {
  const response = await api.get("/coupons/validate", { params: { code, subtotal } });
  return response.data as { code: string; discount: number; total: number };
};

/** Public tracking lookup — keyed by the number printed on the receipt. */
export const trackOrder = async (orderNumber: string) => {
  const response = await api.get(`/orders/track/${orderNumber}`);
  return response.data as Omit<StoreOrder, "shippingAddress" | "coupon"> & {
    shippingAddress: { city: string; country: string } | null;
    shipments?: {
      id: string;
      awb: string;
      carrier: string;
      city: string | null;
      status: string;
      eta: string | null;
    }[];
  };
};
