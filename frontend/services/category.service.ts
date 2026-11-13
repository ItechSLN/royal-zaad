import { api } from "@/lib/api";

export type Category = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
  parentId?: string | null;
  _count?: { products: number; children: number };
};

export type CategoryFormData = {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
};

export type CategoriesResponse = {
  data: Category[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getCategories = async (page?: number, limit?: number) => {
  try {
    const response = await api.get("/categories", { params: { page, limit } });
    return response.data as CategoriesResponse;
  } catch (error) {
    throw error;
  }
}

/**
 * Storefront navigation — only categories flagged visible.
 * `scope: "top"` returns the houses (top-level) rather than every sub-category.
 */
export const getStoreCategories = async (limit = 100, scope?: "top" | "sub") => {
  const response = await api.get("/categories", {
    params: { limit, visible: "true", ...(scope ? { scope } : {}) },
  });
  return response.data as CategoriesResponse;
}

export const createCategory = async (data: CategoryFormData) => {
  try {
    const response = await api.post("/categories", data);
    return response.data as Category;
  } catch (error) {
    throw error;
  }
};

export const updateCategory = async (id: string, data: CategoryFormData) => {
  try {
    const response = await api.patch(`/categories/${id}`, data);
    return response.data as Category;
  } catch (error) {
    throw error;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const response = await api.delete(`/categories/${id}`);
    return response.data as Category;
  } catch (error) {
    throw error;
  }
};
