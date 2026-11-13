import { api } from "@/lib/api";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type Coupon = {
  id: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: string;
  minimumPurchase: string | null;
  usageLimit: number | null;
  usageCount: number;
  startsAt: string;
  expiresAt: string | null;
  isActive: boolean;
};

export type CouponFormData = {
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  minimumPurchase: string;
  usageLimit: string;
  startsAt: string;
  /** `null` clears the expiry on update. */
  expiresAt: string | null;
  isActive: boolean;
};

export type CouponsResponse = {
  data: Coupon[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getCoupons = async (page: number, limit: number) => {
  try {
    const response = await api.get(`/coupons?page=${page}&limit=${limit}`);
    return response.data as CouponsResponse;
  } catch (error) {
    throw error;
  }
};

const toPayload = (data: CouponFormData) => ({
  code: data.code,
  description: data.description || undefined,
  discountType: data.discountType,
  discountValue: data.discountValue,
  minimumPurchase: data.minimumPurchase || undefined,
  usageLimit: data.usageLimit || undefined,
  startsAt: data.startsAt,
  expiresAt: data.expiresAt === null ? null : data.expiresAt || undefined,
  isActive: data.isActive,
});

export const createCoupon = async (data: CouponFormData) => {
  try {
    const response = await api.post("/coupons", toPayload(data));
    return response.data as Coupon;
  } catch (error) {
    throw error;
  }
};

export const updateCoupon = async (id: string, data: CouponFormData) => {
  try {
    const response = await api.patch(`/coupons/${id}`, toPayload(data));
    return response.data as Coupon;
  } catch (error) {
    throw error;
  }
};

export const deleteCoupon = async (id: string) => {
  try {
    const response = await api.delete(`/coupons/${id}`);
    return response.data as Coupon;
  } catch (error) {
    throw error;
  }
};
