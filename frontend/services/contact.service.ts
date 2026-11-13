import { api } from "@/lib/api";

export type ContactTopic =
  | "ORDER"
  | "PRODUCT"
  | "RETURNS"
  | "WHOLESALE"
  | "PRESS"
  | "OTHER";

export type ContactStatus = "NEW" | "IN_PROGRESS" | "RESOLVED" | "ARCHIVED";

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  topic: ContactTopic;
  orderNumber: string | null;
  subject: string | null;
  message: string;
  status: ContactStatus;
  internalNote: string | null;
  respondedAt: string | null;
  createdAt: string;
};

export type ContactFormData = {
  name: string;
  email: string;
  phone?: string;
  topic: ContactTopic;
  orderNumber?: string;
  subject?: string;
  message: string;
};

/** Public — posted by the storefront contact form. */
export const sendContactMessage = async (data: ContactFormData) => {
  const response = await api.post("/contact", data);
  return response.data as ContactMessage;
};

export type ContactInboxResponse = {
  data: ContactMessage[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    newCount: number;
    byStatus: Record<string, number>;
  };
};

export const getContactMessages = async (
  params: { page?: number; limit?: number; status?: string } = {}
) => {
  const response = await api.get("/contact", {
    params: { limit: 50, ...params },
  });
  return response.data as ContactInboxResponse;
};

export const updateContactMessage = async (
  id: string,
  data: { status?: ContactStatus; internalNote?: string }
) => {
  const response = await api.patch(`/contact/${id}`, data);
  return response.data as ContactMessage;
};

export const deleteContactMessage = async (id: string) => {
  const response = await api.delete(`/contact/${id}`);
  return response.data as ContactMessage;
};
