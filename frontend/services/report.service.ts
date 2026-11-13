import { api } from "@/lib/api";

export type ReportsSummary = {
  ordersByStatus: { status: string; count: number }[];
  revenueByCategory: { category: string; revenue: number }[];
  salesOverTime: { date: string; revenue: number; orders: number }[];
};

export const getReportsSummary = async () => {
  try {
    const response = await api.get("/reports");
    return response.data as ReportsSummary;
  } catch (error) {
    throw error;
  }
};
