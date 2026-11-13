import { api } from "@/lib/api";

export type ProductImage = {
  id: string;
  url: string;
  publicId: string;
  sortOrder: number;
  isPrimary: boolean;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  categoryId: string;
  category?: { id: string; name: string };
  brandId: string | null;
  isActive: boolean;
  isFeatured: boolean;
  images: ProductImage[];
  costPrice?: string | null;
  barcode?: string | null;
  inventory?: { quantity: number; reserved: number; reorderAt: number } | null;
  variants?: {
    id: string;
    name: string;
    sku: string;
    price: string;
    costPrice: string | null;
    quantity: number;
    isActive: boolean;
    warehouse?: { id: string; code: string; name: string } | null;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type ProductFormData = {
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  price: string;
  compareAtPrice: string;
  costPrice?: string;
  barcode?: string;
  categoryId: string;
  brandId?: string;
  isActive: boolean;
  isFeatured: boolean;
};

export type ProductsResponse = {
  data: Product[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

const buildProductFormData = (data: ProductFormData, images: File[]) => {
  const form = new FormData();

  form.append("name", data.name);
  form.append("slug", data.slug);
  form.append("sku", data.sku);
  form.append("categoryId", data.categoryId);
  form.append("price", data.price);
  form.append("isActive", String(data.isActive));
  form.append("isFeatured", String(data.isFeatured));

  // Optional fields are always sent: an empty value clears them on the server.
  form.append("shortDescription", data.shortDescription ?? "");
  form.append("description", data.description ?? "");
  form.append("compareAtPrice", data.compareAtPrice ?? "");
  form.append("costPrice", data.costPrice ?? "");
  form.append("barcode", data.barcode ?? "");
  form.append("brandId", data.brandId ?? "");

  images.forEach((file) => form.append("images", file));

  return form;
};

export const getProducts = async (page: number, limit: number) => {
  try {
    const response = await api.get(`/products?page=${page}&limit=${limit}`);
    return response.data as ProductsResponse;
  } catch (error) {
    throw error;
  }
};

export const getProductById = async (id: string) => {
  try {
    const response = await api.get(`/products/${id}`);
    return response.data as Product;
  } catch (error) {
    throw error;
  }
};

export const createProduct = async (data: ProductFormData, images: File[]) => {
  try {
    const response = await api.post("/products", buildProductFormData(data, images), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as Product;
  } catch (error) {
    throw error;
  }
};

export const updateProduct = async (id: string, data: ProductFormData, images: File[]) => {
  try {
    const response = await api.patch(`/products/${id}`, buildProductFormData(data, images), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data as Product;
  } catch (error) {
    throw error;
  }
};

export const deleteProduct = async (id: string) => {
  try {
    const response = await api.delete(`/products/${id}`);
    return response.data as Product;
  } catch (error) {
    throw error;
  }
};
