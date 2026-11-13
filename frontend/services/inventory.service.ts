import { api } from "@/lib/api";

export type InventoryItem = {
  id: string;
  productId: string;
  quantity: number;
  reserved: number;
  reorderAt: number;
  product: { id: string; name: string; sku: string };
  createdAt: string;
  updatedAt: string;
};

export type InventoryFormData = {
  quantity: number;
  reserved: number;
  reorderAt: number;
};

export type InventoryResponse = {
  data: InventoryItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getInventory = async (page: number, limit: number) => {
  try {
    const response = await api.get(`/inventory?page=${page}&limit=${limit}`);
    return response.data as InventoryResponse;
  } catch (error) {
    throw error;
  }
};

export const getInventoryById = async (id: string) => {
  try {
    const response = await api.get(`/inventory/${id}`);
    return response.data as InventoryItem;
  } catch (error) {
    throw error;
  }
};

export const updateInventory = async (id: string, data: InventoryFormData) => {
  try {
    const response = await api.patch(`/inventory/${id}`, data);
    return response.data as InventoryItem;
  } catch (error) {
    throw error;
  }
};
