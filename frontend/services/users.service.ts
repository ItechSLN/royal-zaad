import { api } from "@/lib/api";
import { Role } from "@/services/role.service";

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  roleId: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type UsersResponse = {
  data: User[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export const getUsers = async (page: number, limit: number) => {
  try {
    const response = await api.get(`/users?page=${page}&limit=${limit}`);
    return response.data as UsersResponse;
  } catch (error) {
    throw error;
  }
};

export const getUserById = async (id: string) => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data as User;
  } catch (error) {
    throw error;
  }
};

export const createUser = async (userData: {
  firstName: string;
  lastName: string;
  email: string;
  passwordHash: string;
  roleId: string;
  isActive?: boolean;
}) => {
  try {
    const response = await api.post("/users", userData);
    return response.data as User;
  } catch (error) {
    throw error;
  }
};

export const updateUser = async (
  id: string,
  userData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    passwordHash?: string;
    roleId?: string;
    isActive?: boolean;
  }
) => {
  try {
    const response = await api.patch(`/users/${id}`, userData);
    return response.data as User;
  } catch (error) {
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const response = await api.delete(`/users/${id}`);
    return response.data as User;
  } catch (error) {
    throw error;
  }
};
