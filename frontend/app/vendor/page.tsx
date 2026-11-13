'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Banknote, Percent, Receipt, ShoppingCart, Wallet } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import KpiCard from "@/components/admin/common/KpiCard";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { StateBlock, errorText, money, orderStatusLabel } from "@/components/vendor/ui";
import SalesChart from "@/components/vendor/SalesChart";
import { getVendorAnalytics, type OrderStatus, type VendorAnalytics } from "@/services/vendor.service";

const PERIODS = [7, 30, 90] as const;
const STATUSES: OrderStatus[] = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"];

export default function VendorOverviewPage() {
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<VendorAnalytics | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (period: number) => {
    setLoading(true);
    setError("");
    try {
      setData(await getVendorAnalytics(period));
    } catch (e) {
      setError(errorText(e, "Couldn't load your analytics."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on period change
    void load(days);
  }, [days, load]);

  const periodPicker = (
    <div role="group" aria-label="Period" className="flex overflow-hidden rounded-[2px] border border-[var(--border)]">
      {PERIODS.map((p) => (
        <button
          key={p}
          type="button"
          aria-pressed={days === p}
          onClick={() => setDays(p)}
          className={`px-3 py-2 font-body text-[11.5px] font-semibold transition ${
            days === p ? "bg-[var(--ink)] text-[var(--gold)]" : "bg-[var(--admin-bg)] text-[var(--ink)] hover:bg-[var(--cream-2)]"
          }`}
        >
          {p} days
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar title="Shop overview" subtitle={`Sales and activity for the last ${days} days.`}>
        {periodPicker}
      </ActionBar>

      {!data ? (
        <Card>
          <StateBlock
            state={loading ? "loading" : "error"}
            noun="your analytics"
            error={error}
            onRetry={() => void load(days)}
          />
        </Card>
      ) : (
        <>
          {error && (
            <p className="font-body text-[12px] text-[var(--danger)]">
              {error}{" "}
              <button type="button" className="font-semibold underline" onClick={() => void load(days)}>
                Retry
              </button>
            </p>
          )}
          <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5 ${loading ? "opacity-60" : ""}`}>
            <KpiCard label="Gross sales" value={money(data.grossSales)} icon={Banknote} note="excl. cancelled & refunded" />
            <KpiCard label="Net earnings" value={money(data.netEarnings)} icon={Wallet} note="after commission" />
            <KpiCard label="Commission" value={money(data.commission)} icon={Percent} note="marketplace fee" />
            <KpiCard label="Orders" value={data.orders.total.toLocaleString()} icon={ShoppingCart} note={`last ${data.periodDays} days`} />
            <KpiCard label="Average order" value={money(data.averageOrderValue)} icon={Receipt} />
          </div>

          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.7fr)_1fr]">
            <Card>
              <PanelHeading title="Daily sales" subtitle={`Order value per day · last ${data.periodDays} days`} />
              <div className="px-5 pb-5">
                <SalesChart daily={data.daily} />
              </div>
            </Card>

            <Card>
              <PanelHeading title="Orders by status" subtitle="Sub-orders placed in this period" />
              <div className="flex flex-col px-5 pb-5">
                {STATUSES.map((s) => (
                  <div key={s} className="flex items-center justify-between border-b border-[var(--border)] py-2.5 last:border-b-0">
                    <span className="font-body text-[12px] text-[var(--ink-muted)]">{orderStatusLabel(s)}</span>
                    <span className="font-mono text-[12px] font-semibold text-[var(--ink)]">
                      {data.orders.byStatus[s] ?? 0}
                    </span>
                  </div>
                ))}
                <Link href="/vendor/orders" className="pt-3 font-body text-[11.5px] font-semibold text-[var(--gold-deep)] underline">
                  View orders
                </Link>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-3">
            <Card>
              <PanelHeading title="Top products" subtitle="By revenue in this period" />
              <Table>
                <THead>
                  <tr>
                    <TH>Product</TH>
                    <TH align="right">Units</TH>
                    <TH align="right">Revenue</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.topProducts.length === 0 ? (
                    <EmptyRow colSpan={3}>No sales in this period yet.</EmptyRow>
                  ) : (
                    data.topProducts.map((p) => (
                      <TR key={`${p.productId}-${p.name}`}>
                        <TD strong>{p.name}</TD>
                        <TD align="right" mono>{p.units}</TD>
                        <TD align="right" mono>{money(p.revenue)}</TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </Card>

            <Card>
              <PanelHeading
                title="Low stock"
                subtitle="Available at or below the reorder point"
                action={
                  <Link href="/vendor/inventory" className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)] underline">
                    Inventory
                  </Link>
                }
              />
              <Table>
                <THead>
                  <tr>
                    <TH>Product</TH>
                    <TH align="right">Available</TH>
                    <TH align="right">Reorder at</TH>
                  </tr>
                </THead>
                <TBody>
                  {data.lowStock.length === 0 ? (
                    <EmptyRow colSpan={3}>Nothing is running low.</EmptyRow>
                  ) : (
                    data.lowStock.map((p) => (
                      <TR key={p.productId} highlight>
                        <TD strong>{p.name}</TD>
                        <TD align="right" mono className={p.available <= 0 ? "!text-[var(--danger)]" : "!text-[var(--warning)]"}>
                          {p.available}
                        </TD>
                        <TD align="right" mono>{p.reorderAt}</TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </Card>

            <Card>
              <PanelHeading
                title="Products"
                subtitle="Your catalogue (excluding archived)"
                action={
                  <Link href="/vendor/products/new" className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)] underline">
                    Add product
                  </Link>
                }
              />
              <div className="grid grid-cols-2 gap-px border-t border-[var(--border)] bg-[var(--border)]">
                {[
                  { label: "Published", value: data.products.published, href: "/vendor/products?status=published" },
                  { label: "Drafts", value: data.products.draft, href: "/vendor/products?status=draft" },
                  { label: "In review", value: data.products.pendingReview, href: "/vendor/products?status=pending" },
                  { label: "Rejected / removed", value: data.products.rejectedOrRemoved, href: "/vendor/products?status=rejected" },
                ].map((c) => (
                  <Link key={c.label} href={c.href} className="flex flex-col gap-1 bg-[var(--surface)] px-5 py-4 transition hover:bg-[var(--admin-bg)]">
                    <span className="font-display text-[28px] font-semibold leading-none text-[var(--ink)]">{c.value}</span>
                    <span className="font-body text-[11px] text-[var(--ink-muted)]">{c.label}</span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
