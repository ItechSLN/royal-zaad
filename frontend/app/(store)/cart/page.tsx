'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Store } from "lucide-react";
import { toast } from "sonner";
import ProductImage from "@/components/store/common/ProductImage";
import QuantitySelector from "@/components/store/common/QuantitySelector";
import CheckoutSteps from "@/components/store/common/CheckoutSteps";
import Button from "@/components/ui/Button";
import { useCart } from "@/context/CartContext";
import { validateCoupon } from "@/services/store-orders.service";

export default function CartPage() {
  const { items, groups, removeItem, updateQuantity, subtotal } = useCart();
  const router = useRouter();

  const [couponCode, setCouponCode] = useState("");
  const [applying, setApplying] = useState(false);
  const [coupon, setCoupon] = useState<{ code: string; discount: number; total: number } | null>(
    null
  );
  const [couponError, setCouponError] = useState("");

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplying(true);
    setCouponError("");

    try {
      const result = await validateCoupon(couponCode.trim(), subtotal);
      setCoupon(result);
      toast.success(`Coupon “${result.code}” applied.`);
    } catch (err: any) {
      setCoupon(null);
      setCouponError(err?.errors?.couponCode || err?.message || "Unable to apply this coupon.");
    } finally {
      setApplying(false);
    }
  };

  const discount = coupon?.discount ?? 0;
  // Shipping, tax and the final total come from the server's quote at checkout
  // (per shop). The bag shows the goods at the prices seen while browsing, or the
  // coupon check's server total once a code is applied.
  const total = coupon ? coupon.total : subtotal;

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center px-6 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cream-2)] text-[var(--ink-muted)]">
          <ShoppingBag size={28} />
        </div>
        <h1 className="mt-6 font-display text-[36px] text-[var(--ink)]">Your bag is empty</h1>
        <p className="mt-2 font-body text-[13px] text-[var(--ink-muted)]">
          Nothing reserved yet — the next harvest is waiting.
        </p>
        <Button href="/products" variant="primary" className="mt-8">
          START SHOPPING
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:px-12">
      {/* Head */}
      <div className="flex flex-col gap-6 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-[40px] leading-tight text-[var(--ink)]">Shopping Bag</h1>
          <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
            {items.length} {items.length === 1 ? "item" : "items"}
          </p>
        </div>
        <CheckoutSteps current={1} />
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Items */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Line items, grouped by the shop that sells them */}
          {groups.map((group) => (
            <div key={group.shopId ?? "other"} className="border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-strong)] bg-[var(--admin-bg)] px-5 py-3">
                <span className="inline-flex items-center gap-2 font-body text-[11px] font-bold tracking-[1.2px] text-[var(--ink)]">
                  <Store size={13} className="text-[var(--gold-deep)]" />
                  {group.shopSlug ? (
                    <Link href={`/shops/${group.shopSlug}`} className="transition hover:text-[var(--gold-deep)]">
                      {group.shopName.toUpperCase()}
                    </Link>
                  ) : (
                    group.shopName.toUpperCase()
                  )}
                </span>
                <span className="font-body text-[10.5px] text-[var(--ink-muted)]">
                  {group.shopId
                    ? "Delivery or pickup chosen at checkout"
                    : "Seller confirmed at checkout"}
                </span>
              </div>

              {group.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex flex-col gap-4 border-b border-[var(--border)] p-5 last:border-b-0 sm:flex-row"
                >
                  <Link href={`/products/${item.productId}`} className="shrink-0">
                    <ProductImage
                      src={item.image}
                      alt={item.name}
                      className="h-[120px] w-[120px] bg-[var(--cream-2)]"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      href={`/products/${item.productId}`}
                      className="font-display text-[21px] text-[var(--ink)] transition hover:text-[var(--gold-deep)]"
                    >
                      {item.name}
                    </Link>
                    <p className="font-mono text-[10px] text-[var(--ink-muted)]">
                      SKU {item.productId.toUpperCase()}
                    </p>
                    <p className="font-body text-[11px] text-[var(--success)]">
                      {item.stock > 6 ? "In stock" : `Only ${item.stock} left`}
                    </p>

                    <div className="mt-auto flex flex-wrap items-center gap-4 pt-3">
                      <button
                        type="button"
                        className="font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
                      >
                        Move to wishlist
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(item.productId)}
                        className="font-body text-[11px] text-[var(--danger)] transition hover:opacity-80"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end justify-between gap-4">
                    <QuantitySelector
                      quantity={item.quantity}
                      max={item.stock}
                      onChange={(q) => updateQuantity(item.productId, q)}
                    />
                    <span className="font-body text-[16px] font-semibold text-[var(--ink)]">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Summary */}
        <aside className="w-full shrink-0 lg:w-[380px]">
          <div className="sticky top-28 flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[24px] text-[var(--ink)]">Order Summary</h2>

            <div className="flex items-center gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Enter coupon or gift card code"
                className="w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-[10px] font-body text-[11.5px] text-[var(--ink)] outline-none focus:border-[var(--gold)]"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={applying}
                className="shrink-0 rounded-[2px] bg-[var(--ink)] px-4 py-[10px] font-body text-[10.5px] font-bold tracking-[1.4px] text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:opacity-50"
              >
                {applying ? "…" : "APPLY"}
              </button>
            </div>

            {couponError && (
              <p className="font-body text-[11px] text-[var(--danger)]">{couponError}</p>
            )}

            {coupon && (
              <div className="flex items-center justify-between border border-[var(--success)] bg-[var(--success-bg)] px-3 py-2">
                <div className="flex flex-col">
                  <span className="font-body text-[11px] font-semibold text-[var(--success)]">
                    {coupon.code} applied
                  </span>
                  <span className="font-body text-[10px] text-[var(--ink-muted)]">
                    −${coupon.discount.toFixed(2)} off this order
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setCoupon(null)}
                  className="font-body text-[12px] text-[var(--ink-muted)]"
                >
                  ✕
                </button>
              </div>
            )}

            <div className="h-px w-full bg-[var(--border)]" />

            <div className="flex flex-col gap-2.5">
              {[
                ["Subtotal", `$${subtotal.toFixed(2)}`],
                ...(discount ? [["Coupon discount", `−$${discount.toFixed(2)}`]] : []),
                ["Shipping & tax", "Calculated at checkout"],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="font-body text-[12px] text-[var(--ink-muted)]">{label}</span>
                  <span className="font-body text-[12px] text-[var(--ink)]">{value}</span>
                </div>
              ))}
            </div>

            <div className="h-px w-full bg-[var(--border)]" />

            <div className="flex items-center justify-between">
              <span className="font-display text-[20px] text-[var(--ink)]">Estimated total</span>
              <span className="font-display text-[26px] font-semibold text-[var(--ink)]">
                ${total.toFixed(2)}
              </span>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(coupon ? `/checkout?coupon=${encodeURIComponent(coupon.code)}` : "/checkout")
              }
              className="w-full rounded-[2px] bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] px-6 py-[15px] font-body text-[12px] font-bold tracking-[1.8px] text-[var(--noir)] transition hover:brightness-[1.06]"
            >
              PROCEED TO CHECKOUT
            </button>

            <Link
              href="/products"
              className="w-full rounded-[2px] border border-[var(--border-strong)] px-6 py-[13px] text-center font-body text-[11.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
            >
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
