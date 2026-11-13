import { api } from "@/lib/api";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  description?: string;
};

export type BrandFormData = {
  name: string;
  slug: string;
  description?: string;
};

export type BrandsResponse = {
  data: Brand[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getBrands = async (page?: number, limit?: number) => {
  try {
    const response = await api.get("/brands", { params: { page, limit } });
    return response.data as BrandsResponse;
  } catch (error) {
    throw error;
  }
};

export const createBrand = async (data: BrandFormData) => {
  try {
    const response = await api.post("/brands", data);
    return response.data as Brand;
  } catch (error) {
    throw error;
  }
};

export const updateBrand = async (id: string, data: BrandFormData) => {
  try {
    const response = await api.patch(`/brands/${id}`, data);
    return response.data as Brand;
  } catch (error) {
    throw error;
  }
};

export const deleteBrand = async (id: string) => {
  try {
    const response = await api.delete(`/brands/${id}`);
    return response.data as Brand;
  } catch (error) {
    throw error;
  }
};
