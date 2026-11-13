import { api } from '@/lib/api';

export const adminLogin = async (email: string, password: string) => {
  try {
    const response = await api.post('/auth/admin/signin', { email, password });
    return response.data;
  } catch (error) {
    console.error('Error during admin login:', error);
    throw error;
  }
};
export type AdminSession = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  roleKind: "CUSTOMER" | "VENDOR" | "STAFF";
  customerId: string | null;
};

/** Resolves the signed-in user from the token so the shell can gate on role. */
export const getAdminSession = async () => {
  const response = await api.get('/auth/me');
  return response.data as AdminSession;
};
