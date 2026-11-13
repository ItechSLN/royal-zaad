import { api } from "@/lib/api";

export type Address = {
  id: string;
  label?: string;
  recipientName: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
};

export type Customer = {
  id: string;
  userId: string | null;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  tier?: "STANDARD" | "GOLD" | "PLATINUM";
  notes?: string | null;
  addresses: Address[];
  /** List rows only. */
  orderCount?: number;
  totalSpend?: string;
  createdAt: string;
  updatedAt: string;
};

export type CustomerFormData = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  tier?: "STANDARD" | "GOLD" | "PLATINUM";
  notes?: string;
};

export type CustomersResponse = {
  data: Customer[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getCustomers = async (page: number, limit: number) => {
  try {
    const response = await api.get(`/customers?page=${page}&limit=${limit}`);
    return response.data as CustomersResponse;
  } catch (error) {
    throw error;
  }
};

export const getCustomerById = async (id: string) => {
  try {
    const response = await api.get(`/customers/${id}`);
    return response.data as Customer;
  } catch (error) {
    throw error;
  }
};

export const createCustomer = async (data: CustomerFormData) => {
  try {
    const response = await api.post("/customers", data);
    return response.data as Customer;
  } catch (error) {
    throw error;
  }
};

export const updateCustomer = async (id: string, data: CustomerFormData) => {
  try {
    const response = await api.patch(`/customers/${id}`, data);
    return response.data as Customer;
  } catch (error) {
    throw error;
  }
};

export const deleteCustomer = async (id: string) => {
  try {
    const response = await api.delete(`/customers/${id}`);
    return response.data as Customer;
  } catch (error) {
    throw error;
  }
};
