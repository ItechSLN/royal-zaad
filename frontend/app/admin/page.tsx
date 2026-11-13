'use client';
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Boxes,
  RotateCw,
  ShoppingCart,
  Users,
} from "lucide-react";
import { getDashboardSummary, DashboardSummary } from "@/services/dashboard.service";
import { getReportsSummary, ReportsSummary } from "@/services/report.service";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import KpiCard from "@/components/admin/common/KpiCard";
import Donut from "@/components/admin/common/Donut";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
const STATUS_TONE: Record<string, Tone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "info",
};
const MONTH_LABELS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const monthLabel = (key: string) => MONTH_LABELS[Number(key.split("-")[1]) - 1] ?? key;
/** Pipeline stages, one per OrderStatus the API returns. */
const PIPELINE: { label: string; status: string }[] = [
  { label: "New", status: "PENDING" },
  { label: "Processing", status: "PROCESSING" },
  { label: "Shipped", status: "SHIPPED" },
  { label: "Delivered", status: "DELIVERED" },
  { label: "Cancelled", status: "CANCELLED" },
  { label: "Returned", status: "REFUNDED" },
];
export default function AdminHomePage() {
  // Live figures only — nothing renders until the API answers.
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [reports, setReports] = useState<ReportsSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(() => {
    setFailed(false);
    Promise.all([getDashboardSummary(), getReportsSummary()])
      .then(([dashboard, report]) => {
        setSummary(dashboard);
        setReports(report);
      })
      .catch(() => setFailed(true));
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  if (!summary || !reports) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        {failed ? (
          <>
            <span className="text-[var(--danger)]">Couldn&apos;t load the dashboard.</span>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 font-semibold text-[var(--ink)] hover:underline"
            >
              <RotateCw size={12} /> Retry
            </button>
          </>
        ) : (
          "Loading dashboard…"
        )}
      </div>
    );
  }
  const currency = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  const lastMonth = summary.revenueByMonth[summary.revenueByMonth.length - 1];
  const prevMonth = summary.revenueByMonth[summary.revenueByMonth.length - 2];
  const revenueDelta =
    prevMonth && prevMonth.total > 0 && lastMonth
      ? ((lastMonth.total - prevMonth.total) / prevMonth.total) * 100
      : null;
  const maxMonthlyRevenue = Math.max(1, ...summary.revenueByMonth.map((m) => m.total));
  const statusCount = (status: string) =>
    reports.ordersByStatus.find((s) => s.status === status)?.count ?? 0;
  const categorySplit = reports.revenueByCategory
    .slice()
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
    .map((c) => ({ label: c.category, value: c.revenue }));
  const lowStock = summary.topSellingProducts.filter((p) => p.stock > 0 && p.stock <= 20);
  return (
    <div className="flex flex-col gap-[18px]">
      {/* Filter bar */}
      <ActionBar
        title="Store Overview"
        subtitle="Performance across the maison — updated as orders settle."
        actions={[{ label: "Refresh", icon: RotateCw, onClick: load }]}
      />
      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total revenue"
          value={currency(summary.totalRevenue)}
          icon={Banknote}
          delta={
            revenueDelta !== null
              ? `${revenueDelta >= 0 ? "▲" : "▼"} ${Math.abs(revenueDelta).toFixed(1)}%`
              : undefined
          }
          deltaTone={revenueDelta !== null && revenueDelta < 0 ? "danger" : "success"}
          note={revenueDelta !== null ? "this month vs last · total is all time" : "all time · excl. cancelled & refunded"}
        />
        <KpiCard
          label="Total orders"
          value={summary.totalOrders.toLocaleString()}
          icon={ShoppingCart}
          note="excluding cancelled"
        />
        <KpiCard
          label="Total customers"
          value={summary.totalCustomers.toLocaleString()}
          icon={Users}
          note="registered accounts"
        />
        <KpiCard
          label="Catalogue size"
          value={summary.totalProducts.toLocaleString()}
          icon={Boxes}
          delta={
            summary.outOfStockProducts.length
              ? `${summary.outOfStockProducts.length} out of stock`
              : undefined
          }
          deltaTone="danger"
          note={summary.outOfStockProducts.length ? "needs restock" : "all in stock"}
        />
      </div>
      {/* Row 1 — revenue + category split */}
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.35fr)_1fr]">
        <Card>
          <PanelHeading title="Revenue over time" subtitle="Monthly order revenue · last 6 months" />
          <div className="px-5 pb-5">
            <div className="flex h-[280px] items-end gap-2 border border-[var(--border)] bg-[var(--admin-bg)] p-4">
              {summary.revenueByMonth.map((entry) => (
                <div
                  key={entry.month}
                  className="flex h-full flex-1 flex-col justify-end gap-2"
                  title={currency(entry.total)}
                >
                  <div
                    className="w-full bg-[var(--ink)]"
                    style={{ height: `${Math.max(4, (entry.total / maxMonthlyRevenue) * 220)}px` }}
                  />
                  <span className="text-center font-body text-[9.5px] tracking-[1px] text-[var(--ink-muted)]">
                    {monthLabel(entry.month)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <PanelHeading title="Sales by category" subtitle="Share of item revenue" />
          <div className="px-5 pb-6">
            {categorySplit.length === 0 ? (
              <p className="py-10 text-center font-body text-[12px] text-[var(--ink-muted)]">
                No category revenue recorded yet.
              </p>
            ) : (
              <Donut data={categorySplit} />
            )}
          </div>
        </Card>
      </div>
      {/* Row 2 — order pipeline */}
      <Card>
        <PanelHeading
          title="Order pipeline"
          subtitle="Live status across all channels"
          action={
            <Link
              href="/admin/orders"
              className="font-body text-[10px] font-bold tracking-[1.6px] text-[var(--gold-deep)]"
            >
              GO TO ORDERS →
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-3 xl:grid-cols-6">
          {PIPELINE.map((stage) => (
            <div
              key={stage.label}
              className="flex flex-col items-center gap-1 bg-[var(--surface)] px-3 py-5"
            >
              <span className="font-display text-[26px] font-semibold leading-none text-[var(--ink)]">
                {statusCount(stage.status)}
              </span>
              <span className="font-body text-[10.5px] text-[var(--ink-muted)]">{stage.label}</span>
            </div>
          ))}
        </div>
      </Card>
      {/* Row 3 — recent orders + stock alerts */}
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.4fr)_1fr]">
        <Card>
          <PanelHeading
            title="Recent orders"
            subtitle="The latest to reach the maison"
            action={
              <Link
                href="/admin/orders"
                className="font-body text-[10px] font-bold tracking-[1.6px] text-[var(--gold-deep)]"
              >
                VIEW ALL →
              </Link>
            }
          />
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Customer</TH>
                <TH>Status</TH>
                <TH align="right">Total</TH>
              </tr>
            </THead>
            <TBody>
              {summary.recentOrders.length === 0 ? (
                <EmptyRow colSpan={4}>No orders yet.</EmptyRow>
              ) : (
                summary.recentOrders.map((order) => (
                  <TR key={order.id}>
                    <TD strong mono>
                      {order.orderNumber}
                    </TD>
                    <TD>{order.customerName}</TD>
                    <TD>
                      <StatusBadge tone={STATUS_TONE[order.status] ?? "neutral"}>
                        {order.status}
                      </StatusBadge>
                    </TD>
                    <TD align="right" strong>
                      ${order.total.toFixed(2)}
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
        <Card>
          <PanelHeading title="Stock alerts" subtitle="Replenish before the next drop" />
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH align="right">On hand</TH>
              </tr>
            </THead>
            <TBody>
              {summary.outOfStockProducts.length === 0 && lowStock.length === 0 ? (
                <EmptyRow colSpan={2}>Every product is in stock.</EmptyRow>
              ) : (
                <>
                  {summary.outOfStockProducts.map((p) => (
                    <TR key={p.productId}>
                      <TD strong>
                        {p.name}
                        <span className="ml-2 font-mono text-[10px] text-[var(--ink-muted)]">
                          {p.sku}
                        </span>
                      </TD>
                      <TD align="right">
                        <StatusBadge tone="danger">Out of stock</StatusBadge>
                      </TD>
                    </TR>
                  ))}
                  {lowStock.map((p) => (
                    <TR key={p.productId}>
                      <TD strong>{p.name}</TD>
                      <TD align="right">
                        <StatusBadge tone="warning">{p.stock} left</StatusBadge>
                      </TD>
                    </TR>
                  ))}
                </>
              )}
            </TBody>
          </Table>
        </Card>
      </div>
      {/* Top sellers */}
      <Card>
        <PanelHeading
          title="Top selling products"
          subtitle="Most units sold · excl. cancelled & refunded"
          action={
            <Link
              href="/admin/products"
              className="font-body text-[10px] font-bold tracking-[1.6px] text-[var(--gold-deep)]"
            >
              VIEW CATALOGUE →
            </Link>
          }
        />
        <Table>
          <THead>
            <tr>
              <TH>#</TH>
              <TH>Product</TH>
              <TH>Category</TH>
              <TH>Stock</TH>
              <TH align="right">Sold</TH>
              <TH align="right">Revenue</TH>
            </tr>
          </THead>
          <TBody>
            {summary.topSellingProducts.length === 0 ? (
              <EmptyRow colSpan={6}>No sales recorded yet.</EmptyRow>
            ) : (
              summary.topSellingProducts.map((product, index) => (
                <TR key={product.productId} highlight={index === 0}>
                  <TD mono>{String(index + 1).padStart(2, "0")}</TD>
                  <TD strong>{product.name}</TD>
                  <TD>{product.category}</TD>
                  <TD>
                    <StatusBadge tone={product.stock <= 0 ? "danger" : "success"}>
                      {product.stock <= 0 ? "Out of stock" : `${product.stock} in stock`}
                    </StatusBadge>
                  </TD>
                  <TD align="right" mono>
                    {product.quantitySold}
                  </TD>
                  <TD align="right" strong>
                    {currency(product.revenue)}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
    </div>
  );
}
