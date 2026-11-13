import { api } from "@/lib/api";

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type Promotion = {
  id: string;
  name: string;
  description?: string;
  discountType: DiscountType;
  discountValue: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  products: { id: string; name: string; sku: string }[];
};

export type PromotionFormData = {
  name: string;
  description: string;
  discountType: DiscountType;
  discountValue: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  productIds: string[];
};

export type PromotionsResponse = {
  data: Promotion[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getPromotions = async (page: number, limit: number) => {
  try {
    const response = await api.get(`/promotions?page=${page}&limit=${limit}`);
    return response.data as PromotionsResponse;
  } catch (error) {
    throw error;
  }
};

const toPayload = (data: PromotionFormData) => ({
  name: data.name,
  description: data.description || undefined,
  discountType: data.discountType,
  discountValue: data.discountValue,
  startsAt: data.startsAt,
  endsAt: data.endsAt,
  isActive: data.isActive,
  productIds: data.productIds,
});

export const createPromotion = async (data: PromotionFormData) => {
  try {
    const response = await api.post("/promotions", toPayload(data));
    return response.data as Promotion;
  } catch (error) {
    throw error;
  }
};

export const updatePromotion = async (id: string, data: PromotionFormData) => {
  try {
    const response = await api.patch(`/promotions/${id}`, toPayload(data));
    return response.data as Promotion;
  } catch (error) {
    throw error;
  }
};

export const deletePromotion = async (id: string) => {
  try {
    const response = await api.delete(`/promotions/${id}`);
    return response.data as Promotion;
  } catch (error) {
    throw error;
  }
};
