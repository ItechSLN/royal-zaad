import { api } from "@/lib/api";

export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type OrderItem = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: string;
  total: string;
  product: { id: string; name: string; sku: string };
};

export type Payment = {
  id: string;
  provider: string;
  transactionId: string | null;
  amount: string;
  currency: string;
  status: PaymentStatus;
  paidAt: string | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string;
  status: OrderStatus;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  shippingTotal: string;
  total: string;
  items: OrderItem[];
  customer: { id: string; firstName: string; lastName: string; email: string };
  coupon: { id: string; code: string } | null;
  payment: Payment | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderLineInput = {
  productId: string;
  quantity: number;
};

export type CreateOrderData = {
  customerId: string;
  items: OrderLineInput[];
  couponCode?: string;
};

export type OrdersResponse = {
  data: Order[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getOrders = async (page: number, limit: number) => {
  try {
    const response = await api.get(`/orders?page=${page}&limit=${limit}`);
    return response.data as OrdersResponse;
  } catch (error) {
    throw error;
  }
};

export const getOrderById = async (id: string) => {
  try {
    const response = await api.get(`/orders/${id}`);
    return response.data as Order;
  } catch (error) {
    throw error;
  }
};

export const createOrder = async (data: CreateOrderData) => {
  try {
    const payload = {
      customerId: data.customerId,
      items: data.items,
      ...(data.couponCode ? { couponCode: data.couponCode } : {}),
    };
    const response = await api.post("/orders", payload);
    return response.data as Order;
  } catch (error) {
    throw error;
  }
};

export const updateOrderStatus = async (id: string, status: OrderStatus) => {
  try {
    const response = await api.patch(`/orders/${id}`, { status });
    return response.data as Order;
  } catch (error) {
    throw error;
  }
};

export const markPaymentPaid = async (paymentId: string) => {
  try {
    const response = await api.patch(`/payments/${paymentId}`, { status: "PAID" });
    return response.data as Payment;
  } catch (error) {
    throw error;
  }
};
