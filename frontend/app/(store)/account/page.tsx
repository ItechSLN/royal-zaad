'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, MapPin, Package, Settings } from "lucide-react";
import AccountShell from "@/components/store/account/AccountShell";
import ProductImage from "@/components/store/common/ProductImage";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { getMyOrders, type StoreOrder } from "@/services/store-orders.service";
import { getWishlist, type WishlistEntry } from "@/services/account.service";
import { getMyAddresses, type Address } from "@/services/store-addresses.service";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Processing",
  PROCESSING: "Processing",
  SHIPPED: "Out for delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const TONE: Record<string, Tone> = {
  Delivered: "success",
  "Out for delivery": "info",
  Processing: "warning",
  Cancelled: "danger",
  Refunded: "info",
};

const SHORTCUTS = [
  { label: "My orders", note: "Track and review past orders", href: "/account/orders", icon: Package },
  { label: "Wishlist", note: "Pieces you have saved", href: "/account/wishlist", icon: Heart },
  { label: "Addresses", note: "Where we deliver", href: "/account/addresses", icon: MapPin },
  { label: "Account settings", note: "Details and password", href: "/account/settings", icon: Settings },
];

export default function AccountOverviewPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    const [o, w, a] = await Promise.allSettled([
      getMyOrders(1, 3),
      getWishlist(),
      getMyAddresses(),
    ]);
    if (o.status === "fulfilled") setOrders(o.value.data ?? []);
    if (w.status === "fulfilled") setWishlist(w.value);
    if (a.status === "fulfilled") setAddresses(a.value);
    setFailed([o, w, a].some((r) => r.status === "rejected"));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  return (
    <AccountShell
      title="Overview"
      subtitle="Everything on your account at a glance."
    >
      {failed && (
        <p className="border border-[var(--border)] bg-[var(--surface)] px-5 py-3 font-body text-[12px] text-[var(--ink-muted)]">
          Some of your account details couldn&apos;t be loaded.{" "}
          <button type="button" onClick={load} className="font-semibold text-[var(--gold-deep)] underline">
            Try again
          </button>
        </p>
      )}

      {/* Shortcuts */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--gold)]"
          >
            <s.icon size={17} className="text-[var(--gold-deep)]" />
            <span className="font-body text-[13px] font-semibold text-[var(--ink)]">{s.label}</span>
            <span className="font-body text-[11px] leading-[1.6] text-[var(--ink-muted)]">
              {s.note}
            </span>
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-[24px] text-[var(--ink)]">Recent orders</h2>
          {orders.length > 0 && (
            <Link
              href="/account/orders"
              className="flex items-center gap-1.5 font-body text-[11.5px] font-bold text-[var(--gold-deep)] hover:underline"
            >
              View all <ArrowRight size={12} />
            </Link>
          )}
        </div>

        {loading ? (
          <p className="py-10 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
            Loading…
          </p>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-start gap-3 border border-[var(--border)] bg-[var(--surface)] p-6">
            <p className="font-body text-[12.5px] text-[var(--ink-muted)]">
              You have not placed an order yet.
            </p>
            <Link
              href="/products"
              className="rounded-[2px] bg-[var(--ink)] px-5 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
            >
              Browse the shop
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((o) => {
              const label = STATUS_LABEL[o.status] ?? o.status;
              return (
                <div
                  key={o.id}
                  className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-[12.5px] font-semibold text-[var(--ink)]">
                      #{o.orderNumber}
                    </span>
                    <span className="font-body text-[11px] text-[var(--ink-muted)]">
                      {new Date(o.createdAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}{" "}
                      · {o.items.length} {o.items.length === 1 ? "item" : "items"} · $
                      {Number(o.total).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge tone={TONE[label] ?? "neutral"}>{label}</StatusBadge>
                    <Link
                      href={`/track/${o.orderNumber}`}
                      className="rounded-[2px] border border-[var(--border-strong)] px-3 py-1.5 font-body text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
                    >
                      Track
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Wishlist preview */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[24px] text-[var(--ink)]">Wishlist</h2>
            {wishlist.length > 0 && (
              <Link
                href="/account/wishlist"
                className="font-body text-[11.5px] font-bold text-[var(--gold-deep)] hover:underline"
              >
                View all
              </Link>
            )}
          </div>

          {wishlist.length === 0 ? (
            <p className="border border-[var(--border)] bg-[var(--surface)] p-5 font-body text-[12px] text-[var(--ink-muted)]">
              Nothing saved yet — tap the heart on any product.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {wishlist.slice(0, 3).map((w) => (
                <Link
                  key={w.id}
                  href={`/products/${w.product.id}`}
                  className="flex items-center gap-3 border border-[var(--border)] bg-[var(--surface)] p-3 transition hover:border-[var(--gold)]"
                >
                  <ProductImage
                    src={w.product.images?.[0]?.url}
                    alt={w.product.name}
                    className="h-[48px] w-[48px] bg-[var(--cream-2)]"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-body text-[12.5px] font-semibold text-[var(--ink)]">
                      {w.product.name}
                    </span>
                    <span className="font-body text-[11px] text-[var(--ink-muted)]">
                      ${Number(w.product.price).toFixed(2)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Default address */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-[24px] text-[var(--ink)]">Default address</h2>
            <Link
              href="/account/addresses"
              className="font-body text-[11.5px] font-bold text-[var(--gold-deep)] hover:underline"
            >
              Manage
            </Link>
          </div>

          {defaultAddress ? (
            <div className="border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="font-body text-[12.5px] font-semibold text-[var(--ink)]">
                {defaultAddress.recipientName}
              </p>
              <p className="mt-1 font-body text-[11.5px] leading-[1.7] text-[var(--ink-muted)]">
                {defaultAddress.line1}
                {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}
                <br />
                {defaultAddress.city} {defaultAddress.postalCode}
                <br />
                {defaultAddress.country}
                {defaultAddress.phone ? ` · ${defaultAddress.phone}` : ""}
              </p>
            </div>
          ) : (
            <p className="border border-[var(--border)] bg-[var(--surface)] p-5 font-body text-[12px] text-[var(--ink-muted)]">
              No address saved yet — add one to speed up checkout.
            </p>
          )}
        </section>
      </div>
    </AccountShell>
  );
}
