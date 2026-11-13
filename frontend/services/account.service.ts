import { api } from "@/lib/api";
import type { Product } from "@/services/product.service";

export type AccountProfile = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  customerId: string | null;
  memberSince: string | null;
};

export type AccountSummary = {
  orders: number;
  wishlist: number;
  addresses: number;
  totalSpend: string;
  memberSince?: string;
};

export type WishlistEntry = {
  id: string;
  productId: string;
  createdAt: string;
  product: Product;
};

export const getProfile = async () =>
  (await api.get("/account/profile")).data as AccountProfile;

export const updateProfile = async (data: {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}) => (await api.patch("/account/profile", data)).data as AccountProfile;

export const changePassword = async (data: {
  currentPassword: string;
  newPassword: string;
}) => (await api.post("/account/password", data)).data as { status: string };

export const getAccountSummary = async () =>
  (await api.get("/account/summary")).data as AccountSummary;

export const getWishlist = async () =>
  (await api.get("/account/wishlist")).data as WishlistEntry[];

export const addToWishlist = async (productId: string) =>
  (await api.post("/account/wishlist", { productId })).data;

export const removeFromWishlist = async (productId: string) =>
  (await api.delete(`/account/wishlist/${productId}`)).data;
