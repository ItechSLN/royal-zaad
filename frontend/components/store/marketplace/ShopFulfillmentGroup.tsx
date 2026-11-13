"use client";

import { Package, Store, Truck } from "lucide-react";
import { formatDistance } from "@/components/store/marketplace/geo";
import type { FulfillmentMethod, QuoteGroup } from "@/services/store-orders.service";

export type DisplayGroup = {
  key: string;
  shopId: string | null;
  shopName: string;
  /** The method shown as selected (the customer's choice, else the server's default). */
  method: FulfillmentMethod | null;
  /** From the server's quote; null when not priced yet. */
  availableMethods: FulfillmentMethod[] | null;
  /** The server's figures for this shop — only when the current quote succeeded. */
  priced: QuoteGroup | null;
  lines: { key: string; name: string; quantity: number; total: number | null }[];
};

const METHODS: { value: FulfillmentMethod; label: string; icon: typeof Truck; hint: string }[] = [
  { value: "DELIVERY", label: "Delivery", icon: Truck, hint: "To your address" },
  { value: "PICKUP", label: "Pickup", icon: Package, hint: "Collect from the shop · free" },
];

/** One shop's part of the checkout: its lines, delivery/pickup choice and server totals. */
export default function ShopFulfillmentGroup({
  group,
  error,
  stale,
  onChoose,
  money,
}: {
  group: DisplayGroup;
  error: string | null;
  stale: boolean;
  onChoose: (shopId: string, method: FulfillmentMethod) => void;
  money: (n: number) => string;
}) {
  const priced = group.priced;
  const distance = formatDistance(priced?.distanceKm ?? null);
  const radioName = `fulfillment-${group.key}`;

  return (
    <div
      className={`rounded-[2px] border p-4 ${error ? "border-[var(--danger)]" : "border-[var(--border)]"}`}
      data-testid="shop-group"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 font-body text-[13px] font-semibold text-[var(--ink)]">
          <Store size={14} className="text-[var(--gold-deep)]" />
          {group.shopName}
        </span>
        {distance && (
          <span className="font-body text-[11px] text-[var(--ink-muted)]">{distance.replace(" away", "")} from your address</span>
        )}
      </div>

      <ul className="mt-3 space-y-1.5">
        {group.lines.map((l) => (
          <li key={l.key} className="flex items-center justify-between text-sm">
            <span className="text-[var(--ink-muted)]">
              {l.name} <span>× {l.quantity}</span>
            </span>
            <span className="font-medium text-[var(--ink)]">{l.total !== null ? money(l.total) : "—"}</span>
          </li>
        ))}
      </ul>

      {group.shopId ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Delivery or pickup for ${group.shopName}`}>
          {METHODS.map((m) => {
            const known = group.availableMethods !== null;
            const offered = !known || group.availableMethods!.includes(m.value);
            const selected = group.method === m.value;
            return (
              <label
                key={m.value}
                className={`flex items-center gap-3 rounded-[2px] border p-3 ${
                  offered ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                } ${selected ? "border-[var(--gold)] bg-[var(--cream-2)]" : "border-[var(--border)]"}`}
              >
                <input
                  type="radio"
                  name={radioName}
                  value={m.value}
                  checked={selected}
                  disabled={!offered}
                  onChange={() => onChoose(group.shopId!, m.value)}
                />
                <m.icon size={16} className="text-[var(--ink-muted)]" />
                <span className="text-sm">
                  <span className="block font-medium text-[var(--ink)]">{m.label}</span>
                  <span className="text-xs text-[var(--ink-muted)]">{offered ? m.hint : "Not offered by this shop"}</span>
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        <p className="mt-3 text-xs text-[var(--ink-muted)]">These items will be grouped by their shop once priced.</p>
      )}

      {error && (
        <div role="alert" className="mt-3 flex flex-col gap-2 rounded-[2px] bg-[var(--danger-bg)] p-3">
          <p className="text-xs text-[var(--danger)]">{error}</p>
          {group.shopId && group.method !== "PICKUP" && (group.availableMethods?.includes("PICKUP") ?? true) && (
            <button
              type="button"
              onClick={() => onChoose(group.shopId!, "PICKUP")}
              className="self-start text-xs font-semibold text-[var(--ink)] underline underline-offset-2"
            >
              Switch to pickup for {group.shopName}
            </button>
          )}
        </div>
      )}

      {priced && !stale && (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-[var(--border)] pt-3 text-xs sm:grid-cols-4">
          <div>
            <dt className="text-[var(--ink-muted)]">Subtotal</dt>
            <dd className="font-medium text-[var(--ink)]">{money(priced.subtotal)}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">{priced.fulfillmentMethod === "PICKUP" ? "Pickup" : "Shipping"}</dt>
            <dd className="font-medium text-[var(--ink)]">{priced.shippingTotal > 0 ? money(priced.shippingTotal) : "Free"}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">Tax</dt>
            <dd className="font-medium text-[var(--ink)]">{money(priced.taxTotal)}</dd>
          </div>
          <div>
            <dt className="text-[var(--ink-muted)]">Shop total</dt>
            <dd className="font-semibold text-[var(--ink)]">{money(priced.total)}</dd>
          </div>
          {priced.discountTotal > 0 && (
            <div className="col-span-2 sm:col-span-4">
              <dt className="sr-only">Discount</dt>
              <dd className="text-[var(--success)]">Includes −{money(priced.discountTotal)} discount</dd>
            </div>
          )}
        </dl>
      )}
    </div>
  );
}
