'use client';

import { useCallback, useEffect, useState } from "react";
import { Banknote, Receipt, RotateCw, ShoppingBag, TrendingUp } from "lucide-react";
import { getReportsSummary, ReportsSummary } from "@/services/report.service";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import KpiCard from "@/components/admin/common/KpiCard";
import { StatusBadge, type Tone } from "@/components/ui/Badge";

const STATUS_TONE: Record<string, Tone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "info",
};

export default function ReportsPage() {
  // Live figures only — nothing renders until the API answers.
  const [summary, setSummary] = useState<ReportsSummary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(() => {
    setFailed(false);
    getReportsSummary()
      .then(setSummary)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!summary) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        {failed ? (
          <>
            <span className="text-[var(--danger)]">Couldn&apos;t load reports.</span>
            <button
              type="button"
              onClick={load}
              className="inline-flex items-center gap-1 font-semibold text-[var(--ink)] hover:underline"
            >
              <RotateCw size={12} /> Retry
            </button>
          </>
        ) : (
          "Loading reports…"
        )}
      </div>
    );
  }

  const last14Days = summary.salesOverTime.slice(-14);
  const maxDailyRevenue = Math.max(1, ...summary.salesOverTime.map((d) => d.revenue));

  const periodRevenue = summary.salesOverTime.reduce((a, d) => a + d.revenue, 0);
  const periodOrders = summary.salesOverTime.reduce((a, d) => a + d.orders, 0);
  const avgOrderValue = periodOrders > 0 ? periodRevenue / periodOrders : 0;
  const totalOrders = summary.ordersByStatus.reduce((a, s) => a + s.count, 0);

  const maxCategoryRevenue = Math.max(1, ...summary.revenueByCategory.map((c) => c.revenue));
  const sortedCategories = [...summary.revenueByCategory].sort((a, b) => b.revenue - a.revenue);
  const maxStatusCount = Math.max(1, ...summary.ordersByStatus.map((s) => s.count));

  const currency = (n: number) =>
    `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Reports & Analytics"
        subtitle="Sales performance across the last 30 days · revenue excludes cancelled and refunded orders."
        actions={[{ label: "Refresh", icon: RotateCw, onClick: load }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Revenue (30 days)"
          value={currency(periodRevenue)}
          icon={Banknote}
          note="net of cancellations & refunds"
        />
        <KpiCard
          label="Orders (30 days)"
          value={periodOrders.toLocaleString()}
          icon={ShoppingBag}
          note="excl. cancelled & refunded"
        />
        <KpiCard
          label="Average order value"
          value={currency(avgOrderValue)}
          icon={Receipt}
          note="revenue ÷ orders"
        />
        <KpiCard
          label="Orders all time"
          value={totalOrders.toLocaleString()}
          icon={TrendingUp}
          note="across every status"
        />
      </div>

      {/* Revenue chart */}
      <Card>
        <PanelHeading
          title="Revenue — last 14 days"
          subtitle="Daily order revenue"
        />
        <div className="px-5 pb-5">
          <div className="flex h-[260px] items-end gap-2 border border-[var(--border)] bg-[var(--admin-bg)] p-4">
            {last14Days.map((day) => (
              <div
                key={day.date}
                className="flex h-full flex-1 flex-col justify-end gap-2"
                title={`${currency(day.revenue)} · ${day.orders} orders`}
              >
                <div
                  className="w-full bg-[var(--ink)]"
                  style={{
                    height: `${Math.max(3, (day.revenue / maxDailyRevenue) * 200)}px`,
                  }}
                />
                <span className="text-center font-mono text-[9px] text-[var(--ink-muted)]">
                  {day.date.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        {/* Orders by status */}
        <Card>
          <PanelHeading title="Orders by status" subtitle="Distribution across the order book" />
          <div className="flex flex-col gap-4 px-5 pb-6">
            {summary.ordersByStatus.length === 0 ? (
              <p className="py-6 text-center font-body text-[12px] text-[var(--ink-muted)]">
                No orders yet.
              </p>
            ) : (
              summary.ordersByStatus.map((entry) => (
                <div key={entry.status} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <StatusBadge tone={STATUS_TONE[entry.status] ?? "neutral"}>
                      {entry.status}
                    </StatusBadge>
                    <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">
                      {entry.count}
                    </span>
                  </div>
                  <div className="h-[6px] w-full bg-[var(--cream-2)]">
                    <div
                      className="h-full bg-[var(--gold)]"
                      style={{ width: `${(entry.count / maxStatusCount) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Revenue by category */}
        <Card>
          <PanelHeading
            title="Revenue by category"
            subtitle="Which houses are carrying the season"
          />
          <div className="flex flex-col gap-4 px-5 pb-6">
            {sortedCategories.length === 0 ? (
              <p className="py-6 text-center font-body text-[12px] text-[var(--ink-muted)]">
                No revenue recorded yet.
              </p>
            ) : (
              sortedCategories.map((entry) => (
                <div key={entry.category} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-body text-[12px] text-[var(--ink)]">
                      {entry.category}
                    </span>
                    <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">
                      {currency(entry.revenue)}
                    </span>
                  </div>
                  <div className="h-[6px] w-full bg-[var(--cream-2)]">
                    <div
                      className="h-full bg-[var(--ink)]"
                      style={{ width: `${(entry.revenue / maxCategoryRevenue) * 100}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
