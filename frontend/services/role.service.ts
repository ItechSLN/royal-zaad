import { api } from "@/lib/api";

export type Role = {
  id: string;
  name: string;
  description?: string;
};

export const getRoles = async () => {
  try {
    const response = await api.get("/roles");
    return response.data as Role[];
  } catch (error) {
    throw error;
  }
};

export const createRole = async (roleData: { name: string; description: string }) => {
  try {
    const response = await api.post("/roles", roleData);
    return response.data as Role;
  } catch (error) { 
    throw error;
  }
};

export const updateRole = async (id: string, roleData: { name?: string; description?: string }) => {
  try {
    const response = await api.patch(`/roles/${id}`, roleData);
    return response.data as Role;
  } catch (error) {
    throw error;
  }
};

export const deleteRole = async (id: string) => {
  try {
    const response = await api.delete(`/roles/${id}`);
    return response.data as Role;
  } catch (error) {
    throw error;
  }
};