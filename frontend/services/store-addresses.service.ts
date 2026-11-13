import { api } from "@/lib/api";

export type Address = {
  id: string;
  label: string | null;
  recipientName: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string | null;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
  /** Geocoded on save; null when the address couldn't be located. */
  latitude?: number | null;
  longitude?: number | null;
};

export type AddressFormData = {
  recipientName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
};

export const getMyAddresses = async () => {
  const response = await api.get("/addresses");
  return response.data as Address[];
};

export const createAddress = async (data: AddressFormData) => {
  const response = await api.post("/addresses", data);
  return response.data as Address;
};

export const deleteAddress = async (id: string) => {
  const response = await api.delete(`/addresses/${id}`);
  return response.data as Address;
};
