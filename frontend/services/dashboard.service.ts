import { api } from "@/lib/api";

export type DashboardSummary = {
  totalCustomers: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  revenueByMonth: { month: string; total: number }[];
  topSellingProducts: {
    productId: string;
    name: string;
    category: string;
    stock: number;
    quantitySold: number;
    revenue: number;
  }[];
  outOfStockProducts: { productId: string; name: string; sku: string }[];
  recentOrders: { id: string; orderNumber: string; customerName: string; total: number; status: string }[];
};

export const getDashboardSummary = async () => {
  try {
    const response = await api.get("/dashboard");
    return response.data as DashboardSummary;
  } catch (error) {
    throw error;
  }
};
