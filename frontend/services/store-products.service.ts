import { api } from "@/lib/api";
import type { Product, ProductsResponse } from "@/services/product.service";

export type ProductSort = "newest" | "price_asc" | "price_desc" | "name_asc" | "name_desc";

export type ProductQueryParams = {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  isFeatured?: boolean;
  minPrice?: number;
  maxPrice?: number;
  sort?: ProductSort;
};

export const getStoreProducts = async (params: ProductQueryParams = {}) => {
  const response = await api.get("/products", {
    params: { isActive: true, page: 1, limit: 12, ...params },
  });
  return response.data as ProductsResponse;
};

export const getStoreProductById = async (id: string) => {
  const response = await api.get(`/products/${id}`);
  return response.data as Product;
};

export const getBestSellingProducts = async (limit = 8) => {
  const response = await api.get("/products/best-selling", { params: { limit } });
  return response.data as Product[];
};
