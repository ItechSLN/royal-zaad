'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { FieldShell } from "@/components/admin/form/Fields";
import { getCustomers, type Customer } from "@/services/customer.service";
import { getProducts, type Product } from "@/services/product.service";
import { createOrder } from "@/services/order.service";

type Line = { key: number; productId: string; quantity: number };

const money = (n: number) =>
  n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type CustomerOption = Pick<Customer, "id" | "firstName" | "lastName" | "email">;
type ProductOption = { id: string; name: string; sku: string; price: number; available: number };

/** Walks every page of a paginated staff endpoint. */
const FETCH_LIMIT = 100;
async function fetchAll<T>(
  load: (page: number, limit: number) => Promise<{ data: T[]; meta: { totalPages: number } }>
) {
  const all: T[] = [];
  for (let page = 1; ; page++) {
    const res = await load(page, FETCH_LIMIT);
    all.push(...(res?.data ?? []));
    if (!res?.meta || page >= res.meta.totalPages) break;
  }
  return all;
}

/** Only live products with sellable stock can be ordered. */
const toProductOptions = (products: Product[]): ProductOption[] =>
  products
    .filter((p) => p.isActive)
    .map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      price: Number(p.price),
      available: (p.inventory?.quantity ?? 0) - (p.inventory?.reserved ?? 0),
    }))
    .filter((p) => p.available > 0);

const inputClass =
  "w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)]";

export default function CreateOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ key: 0, productId: "", quantity: 1 }]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Loading starts true; retry() re-arms it so the effect never sets state synchronously.
  const loadOptions = useCallback(
    () =>
      Promise.all([fetchAll<Customer>(getCustomers), fetchAll<Product>(getProducts)])
        .then(([customerRows, productRows]) => {
          setCustomers(customerRows);
          setProducts(toProductOptions(productRows));
          setLoadError(null);
        })
        .catch((error: { message?: string }) => {
          // Never offer sample customers or products — an order must reference real records.
          setCustomers([]);
          setProducts([]);
          setLoadError(error?.message ?? "Unable to load customers and products.");
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    loadOptions();
  };

  const priceOf = (id: string) => products.find((p) => p.id === id)?.price ?? 0;

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + priceOf(l.productId) * (l.quantity || 0), 0),
    [lines, products]
  );

  const update = (key: number, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!customerId) next.customerId = "Select a customer";
    if (!lines.some((l) => l.productId)) next.items = "Add at least one product";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await createOrder({
        customerId,
        items: lines
          .filter((l) => l.productId)
          .map((l) => ({ productId: l.productId, quantity: l.quantity })),
        couponCode: couponCode || undefined,
      });
      toast.success("Order created.");
      router.push("/admin/orders");
    } catch (err) {
      const error = err as { message?: string; errors?: Record<string, string> };
      const apiErrors = error?.errors ?? {};
      if (Object.keys(apiErrors).length) setErrors(apiErrors);
      toast.error(apiErrors.items ?? error?.message ?? "Unable to create the order.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <ActionBar
        title="Create order"
        subtitle="Raise an order on behalf of a customer — phone, concierge or retail."
        actions={[
          { label: "Back to orders", icon: ArrowLeft, href: "/admin/orders" },
        ]}
      />

      {loadError && (
        <div className="flex items-center justify-between gap-4 rounded-[2px] border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3">
          <span className="font-body text-[12px] text-[var(--danger)]">{loadError}</span>
          <button
            type="button"
            onClick={retry}
            className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)] underline"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.6fr)_1fr]">
        <div className="flex flex-col gap-[18px]">
          <Card>
            <PanelHeading title="Customer" subtitle="Who the order is placed for" />
            <div className="grid grid-cols-1 gap-4 px-5 pb-6 sm:grid-cols-2">
              <FieldShell
                label="CUSTOMER"
                error={errors.customerId}
                help={!loading && !loadError && customers.length === 0 ? "No customers yet." : undefined}
              >
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  disabled={loading || !!loadError}
                  className={inputClass}
                >
                  <option value="">{loading ? "Loading customers…" : "Select customer…"}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} · {c.email}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="COUPON CODE" help="Optional">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="WELCOME20"
                  className={inputClass}
                />
              </FieldShell>
            </div>
          </Card>

          <Card>
            <PanelHeading title="Line items" subtitle="Products, quantities and line totals" />
            <div className="flex flex-col gap-3 px-5 pb-6">
              {lines.map((l) => (
                <div key={l.key} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <FieldShell
                      label="PRODUCT"
                      help={
                        !loading && !loadError && products.length === 0
                          ? "No active products with stock available."
                          : undefined
                      }
                    >
                      <select
                        value={l.productId}
                        onChange={(e) => update(l.key, { productId: e.target.value })}
                        disabled={loading || !!loadError}
                        className={inputClass}
                      >
                        <option value="">{loading ? "Loading products…" : "Select product…"}</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.sku} · ${money(p.price)} · {p.available} available
                          </option>
                        ))}
                      </select>
                    </FieldShell>
                  </div>

                  <div className="w-full sm:w-[110px]">
                    <FieldShell label="QTY">
                      <input
                        type="number"
                        min={1}
                        max={products.find((p) => p.id === l.productId)?.available}
                        value={l.quantity}
                        onChange={(e) => update(l.key, { quantity: Number(e.target.value) })}
                        className={inputClass}
                      />
                    </FieldShell>
                  </div>

                  <div className="w-full sm:w-[120px]">
                    <FieldShell label="LINE TOTAL">
                      <div className={`${inputClass} font-mono`}>
                        ${money(priceOf(l.productId) * (l.quantity || 0))}
                      </div>
                    </FieldShell>
                  </div>

                  <button
                    type="button"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((x) => x.key !== l.key))}
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[2px] border border-[var(--border-strong)] text-[var(--danger)] transition hover:bg-[var(--danger-bg)] disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {errors.items && (
                <span className="font-body text-[10.5px] text-[var(--danger)]">{errors.items}</span>
              )}

              <button
                type="button"
                onClick={() => setLines((prev) => [...prev, { key: Date.now(), productId: "", quantity: 1 }])}
                className="flex w-fit items-center gap-2 font-body text-[11.5px] font-semibold text-[var(--gold-deep)]"
              >
                <Plus size={13} /> Add line item
              </button>
            </div>
          </Card>

          <Card>
            <PanelHeading title="Internal note" subtitle="Visible to staff only" />
            <div className="px-5 pb-6">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Concierge order placed by phone…"
                className={`${inputClass} resize-y`}
              />
            </div>
          </Card>
        </div>

        <Card>
          <PanelHeading title="Summary" subtitle="Totals update as you edit lines" />
          <div className="flex flex-col gap-3 px-5 pb-5">
            <div className="flex items-center justify-between">
              <span className="font-body text-[11.5px] text-[var(--ink-muted)]">Subtotal</span>
              <span className="font-mono text-[12px] text-[var(--ink)]">${money(subtotal)}</span>
            </div>
            {[
              ["Shipping", "Calculated on create"],
              ["Tax", "Applied by destination"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between">
                <span className="font-body text-[11.5px] text-[var(--ink-muted)]">{label}</span>
                <span className="font-body text-[11px] text-[var(--ink-muted)]">{value}</span>
              </div>
            ))}

            <div className="mt-1 flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="font-body text-[12px] font-semibold text-[var(--ink)]">Total</span>
              <span className="font-display text-[24px] font-semibold text-[var(--ink)]">
                ${money(subtotal)}
              </span>
            </div>
            <p className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">
              Estimate at list price. Promotions, coupon, shipping and tax are applied by the
              server when the order is created.
            </p>
          </div>

          <div className="flex flex-col gap-2 border-t border-[var(--border)] px-5 py-4">
            <button
              type="submit"
              disabled={submitting || loading || !!loadError}
              className="w-full rounded-[2px] bg-[var(--ink)] px-4 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create order"}
            </button>
            <Link
              href="/admin/orders"
              className="w-full rounded-[2px] border border-[var(--border-strong)] px-4 py-3 text-center font-body text-[12px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
            >
              Cancel
            </Link>
          </div>
        </Card>
      </div>
    </form>
  );
}
