import { api } from "@/lib/api";

export type StorefrontUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  customerId: string | null;
};

export type AuthSession = {
  status: string;
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isActive: boolean;
  };
};

export const login = async (email: string, password: string) => {
  const response = await api.post("/auth/login", { email, password });
  return response.data as AuthSession;
};

export const register = async (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) => {
  const response = await api.post("/auth/register", data);
  return response.data as AuthSession;
};

export const getMe = async () => {
  const response = await api.get("/auth/me");
  return response.data as StorefrontUser;
};

export const forgotPassword = async (email: string) => {
  const response = await api.post("/auth/forgot-password", { email });
  return response.data as { message: string; resetToken?: string; resetUrl?: string };
};

export const resetPassword = async (token: string, password: string) => {
  const response = await api.post("/auth/reset-password", { token, password });
  return response.data as { message: string };
};
