'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import AccountShell from "@/components/store/account/AccountShell";
import ProductImage from "@/components/store/common/ProductImage";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import VendorOrdersPanel from "@/components/store/marketplace/VendorOrdersPanel";
import { getMyOrders, type StoreOrder, type VendorOrder } from "@/services/store-orders.service";

const TABS = ["All", "Processing", "Out for delivery", "Delivered", "Cancelled"];

const TONE: Record<string, Tone> = {
  Delivered: "success",
  "Out for delivery": "info",
  Processing: "warning",
  Cancelled: "danger",
};

/** Storefront-facing wording for the order status. */
const STATUS_LABEL: Record<string, string> = {
  PENDING: "Processing",
  PROCESSING: "Processing",
  SHIPPED: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Cancelled",
};

type OrderCard = {
  number: string;
  placed: string;
  items: number;
  total: string;
  status: string;
  vendorOrders: VendorOrder[];
  lines: {
    id: string;
    productId: string;
    name: string;
    detail: string;
    quantity: number;
    price: string;
    image?: string;
  }[];
};

const toCard = (o: StoreOrder): OrderCard => ({
  number: o.orderNumber,
  placed: new Date(o.createdAt).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }),
  items: o.items.length,
  total: `$${Number(o.total).toFixed(2)}`,
  status: STATUS_LABEL[o.status] ?? o.status,
  vendorOrders: o.vendorOrders ?? [],
  lines: o.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.productName ?? item.product?.name ?? "Item",
    detail: item.sku ?? item.product?.sku ?? "",
    quantity: item.quantity,
    price: `$${Number(item.total).toFixed(2)}`,
    image: item.imageUrl ?? item.product?.images?.[0]?.url,
  })),
});

export default function MyOrdersPage() {
  const [tab, setTab] = useState("All");
  const [all, setAll] = useState<OrderCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getMyOrders(1, 20)
      .then((res) => {
        setAll((res?.data ?? []).map(toCard));
        setFailed(false);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  const orders = all.filter((o) => tab === "All" || o.status === tab);

  return (
    <AccountShell title="My Orders" subtitle="Every order placed with the maison.">
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)]">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 pb-3 font-body text-[12px] font-semibold transition ${
              tab === t
                ? "border-b-2 border-[var(--gold)] text-[var(--ink)]"
                : "border-b-2 border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading your orders…
        </p>
      ) : failed ? (
        <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          We couldn&apos;t load your orders. Please refresh the page to try again.
        </p>
      ) : all.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <p className="font-body text-[12.5px] text-[var(--ink-muted)]">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/products"
            className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)]"
          >
            Start shopping →
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          No orders in this state.
        </p>
      ) : (
        orders.map((o) => (
          <div key={o.number} className="flex flex-col border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex flex-col gap-3 border-b border-[var(--border)] bg-[var(--admin-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[13px] font-semibold text-[var(--ink)]">
                  #{o.number}
                </span>
                <span className="font-body text-[11px] text-[var(--ink-muted)]">
                  Placed {o.placed} · {o.items} {o.items === 1 ? "item" : "items"} · {o.total}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={TONE[o.status] ?? "neutral"}>{o.status}</StatusBadge>
                <Link
                  href={`/track/${o.number}`}
                  className="rounded-[2px] border border-[var(--border-strong)] px-3 py-1.5 font-body text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
                >
                  Track
                </Link>
              </div>
            </div>

            <div className="flex flex-col gap-4 p-5">
              {o.lines.map((line) => (
                <div key={line.id} className="flex items-center gap-3">
                  <ProductImage
                    src={line.image}
                    alt={line.name}
                    className="h-[56px] w-[56px] bg-[var(--cream-2)]"
                  />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <Link
                      href={`/products/${line.productId}`}
                      className="font-body text-[12.5px] font-semibold text-[var(--ink)] transition hover:text-[var(--gold-deep)]"
                    >
                      {line.name}
                    </Link>
                    <span className="font-body text-[11px] text-[var(--ink-muted)]">
                      {line.detail} · ×{line.quantity}
                    </span>
                  </div>
                  <span className="font-body text-[12.5px] text-[var(--ink)]">
                    {line.price}
                  </span>
                </div>
              ))}
            </div>

            {o.vendorOrders.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-[var(--border)] px-5 py-4">
                <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
                  {o.vendorOrders.length > 1 ? `FROM ${o.vendorOrders.length} SHOPS` : "SHOP"}
                </span>
                <VendorOrdersPanel vendorOrders={o.vendorOrders} compact />
              </div>
            )}

            <div className="flex flex-wrap gap-4 border-t border-[var(--border)] px-5 py-3">
              {["Download invoice", "Buy again", "Return an item", "Contact concierge"].map((a) => (
                <button
                  key={a}
                  type="button"
                  className="font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--gold-deep)]"
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </AccountShell>
  );
}
