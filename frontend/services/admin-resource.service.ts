import { api } from "@/lib/api";

export type ListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  [key: string]: unknown;
};

export type ListResponse<T> = { data: T[]; meta: ListMeta };

export type ListParams = Record<string, string | number | undefined>;

/**
 * Thin CRUD wrapper around one admin endpoint. Every admin module exposes the
 * same shape, so the pages share a single client instead of one file each.
 */
export function adminResource<T, C = Partial<T>>(path: string) {
  return {
    path,
    list: async (params: ListParams = {}) => {
      const response = await api.get(path, { params });
      return response.data as ListResponse<T>;
    },
    get: async (id: string) => {
      const response = await api.get(`${path}/${id}`);
      return response.data as T;
    },
    create: async (data: C) => {
      const response = await api.post(path, data);
      return response.data as T;
    },
    update: async (id: string, data: Partial<C>) => {
      const response = await api.patch(`${path}/${id}`, data);
      return response.data as T;
    },
    remove: async (id: string) => {
      const response = await api.delete(`${path}/${id}`);
      return response.data as T;
    },
  };
}

export type AdminResource<T, C = Partial<T>> = ReturnType<
  typeof adminResource<T, C>
>;

/* One client per admin module. */
export const warehousesApi = adminResource<any>("/warehouses");
export const transfersApi = adminResource<any>("/warehouses/transfers");
export const suppliersApi = adminResource<any>("/suppliers");
export const purchaseOrdersApi = adminResource<any>("/purchase-orders");
export const shipmentsApi = adminResource<any>("/shipments");
export const returnsApi = adminResource<any>("/returns");
export const invoicesApi = adminResource<any>("/invoices");
export const taxRatesApi = adminResource<any>("/tax/rates");
export const taxFilingsApi = adminResource<any>("/tax/filings");
export const campaignsApi = adminResource<any>("/campaigns");
export const cmsApi = adminResource<any>("/cms");
export const auditLogApi = adminResource<any>("/audit-log");
export const notificationsApi = adminResource<any>("/notifications");
export const alertRulesApi = adminResource<any>("/notifications/rules");
export const categoriesApi = adminResource<any>("/categories");

/** Endpoints that fall outside plain CRUD. */
export const adjustInventory = async (id: string, payload: unknown) =>
  (await api.post(`/inventory/${id}/adjust`, payload)).data;

export const getCategoryTree = async () =>
  (await api.get("/categories/tree")).data as any[];

export const markAllNotificationsRead = async () =>
  (await api.patch("/notifications/read-all")).data as { count: number };

export const markNotificationRead = async (id: string) =>
  (await api.patch(`/notifications/${id}/read`)).data;

export const fileTaxReturn = async (id: string) =>
  (await api.post(`/tax/filings/${id}/file`)).data;

/** Uploads category artwork; the API stores it and returns the updated row. */
export const uploadCategoryImage = async (id: string, file: File) => {
  const form = new FormData();
  form.append("image", file);
  const response = await api.post(`/categories/${id}/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data as { id: string; imageUrl: string | null };
};

export const clearCategoryImage = async (id: string) =>
  (await api.delete(`/categories/${id}/image`)).data;
