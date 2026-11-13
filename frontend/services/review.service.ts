import { api } from "@/lib/api";

export type AdminReview = {
  id: string;
  productId: string;
  customerId: string;
  rating: number;
  title: string | null;
  content: string | null;
  isApproved: boolean;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string; email: string };
  product: { id: string; name: string; sku: string };
};

export type AdminReviewsResponse = {
  data: AdminReview[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    pendingCount: number;
  };
};

export type AdminReviewFilters = {
  page?: number;
  limit?: number;
  productId?: string;
  isApproved?: boolean;
  rating?: number;
};

export const getAdminReviews = async (filters: AdminReviewFilters = {}) => {
  try {
    const response = await api.get("/reviews/admin", { params: filters });
    return response.data as AdminReviewsResponse;
  } catch (error) {
    throw error;
  }
};

export const setReviewApproval = async (id: string, isApproved: boolean) => {
  try {
    const response = await api.patch(`/reviews/admin/${id}/approval`, { isApproved });
    return response.data as AdminReview;
  } catch (error) {
    throw error;
  }
};

export const deleteReview = async (id: string) => {
  try {
    const response = await api.delete(`/reviews/admin/${id}`);
    return response.data as AdminReview;
  } catch (error) {
    throw error;
  }
};
