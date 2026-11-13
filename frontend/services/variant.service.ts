import { api } from "@/lib/api";

export type ProductVariant = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  barcode: string | null;
  price: string;
  compareAtPrice: string | null;
  costPrice: string | null;
  quantity: number;
  warehouseId: string | null;
  warehouse?: { id: string; code: string; name: string } | null;
  isActive: boolean;
  sortOrder: number;
};

export type VariantFormData = {
  name: string;
  sku: string;
  price: number;
  costPrice?: number;
  compareAtPrice?: number;
  quantity?: number;
  warehouseId?: string;
  isActive?: boolean;
};

export const getVariants = async (productId: string) =>
  (await api.get(`/products/${productId}/variants`)).data as ProductVariant[];

export const createVariant = async (productId: string, data: VariantFormData) =>
  (await api.post(`/products/${productId}/variants`, data)).data as ProductVariant;

export const updateVariant = async (id: string, data: Partial<VariantFormData>) =>
  (await api.patch(`/variants/${id}`, data)).data as ProductVariant;

export const deleteVariant = async (id: string) =>
  (await api.delete(`/variants/${id}`)).data as ProductVariant;
