import { api } from "@/lib/api";

export type Review = {
  id: string;
  productId: string;
  rating: number;
  title: string | null;
  content: string | null;
  createdAt: string;
  customer: { id: string; firstName: string; lastName: string };
  product?: { id: string; name: string };
};

export type ReviewsResponse = {
  data: Review[];
  meta: { page: number; limit: number; total: number; totalPages: number };
  averageRating: number;
};

export const getProductReviews = async (productId: string, page = 1, limit = 10) => {
  const response = await api.get("/reviews", { params: { productId, page, limit } });
  return response.data as ReviewsResponse;
};

export const getFeaturedReviews = async (limit = 6) => {
  const response = await api.get("/reviews/featured", { params: { limit } });
  return response.data as Review[];
};

export const createReview = async (data: { productId: string; rating: number; title?: string; content?: string }) => {
  const response = await api.post("/reviews", data);
  return response.data as Review;
};
