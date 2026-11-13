'use client';

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { CheckCircle2, CreditCard, Lock, Truck } from "lucide-react";
import ShopFulfillmentGroup from "@/components/store/marketplace/ShopFulfillmentGroup";
import CheckoutNav from "@/components/store/layout/CheckoutNav";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getMyAddresses, createAddress, Address, AddressFormData } from "@/services/store-addresses.service";
import {
  checkout,
  quoteOrder,
  type FulfillmentChoice,
  type FulfillmentMethod,
  type OrderQuote,
} from "@/services/store-orders.service";

const EMPTY_ADDRESS_FORM: AddressFormData = {
  recipientName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  phone: "",
  isDefault: false,
};

type PaymentMethod = "card" | "cod";

/**
 * One key per checkout attempt: the server returns the existing order when the
 * same key is resubmitted, so a double-click or a network retry can't create a
 * second order.
 */
const newIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/** Which shop a fulfilment error is about — the server names the shop first. */
const shopForError = (message: string, shops: { shopId: string | null; shopName: string }[]) =>
  shops
    .filter((s) => s.shopId && message.startsWith(s.shopName))
    .sort((a, b) => b.shopName.length - a.shopName.length)[0]?.shopId ?? null;

function CheckoutContent() {
  const { user, loading: authLoading } = useAuth();
  const { items, groups: cartGroups, clearCart } = useCart();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialCoupon = searchParams.get("coupon") ?? "";

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormData>(EMPTY_ADDRESS_FORM);
  const [addressErrors, setAddressErrors] = useState<Record<string, string>>({});
  const [savingAddress, setSavingAddress] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");

  const [couponCode, setCouponCode] = useState(initialCoupon);
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  // The last good quote keeps each shop's options on screen while a choice is rejected.
  const [lastQuote, setLastQuote] = useState<OrderQuote | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [fulfillmentError, setFulfillmentError] = useState<{ shopId: string | null; message: string } | null>(null);
  const [fulfillment, setFulfillment] = useState<FulfillmentChoice[]>([]);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!user) return;
    getMyAddresses()
      .then((data) => {
        setAddresses(data);
        const preferred = data.find((a) => a.isDefault) ?? data[0];
        if (preferred) setSelectedAddressId(preferred.id);
        else setShowAddressForm(true);
      })
      .catch(() => setShowAddressForm(true));
  }, [user]);

  // The summary shows the server's quote — promotions, coupon, each shop's
  // shipping, the destination's tax and the chosen delivery/pickup — so the
  // totals match what the order will charge.
  const basketKey = items.map((i) => `${i.productId}:${i.quantity}`).join(",");
  const fulfillmentKey = fulfillment.map((f) => `${f.shopId}:${f.method}`).join(",");
  useEffect(() => {
    if (!user || items.length === 0) return;
    let cancelled = false;

    quoteOrder({
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      couponCode: couponCode || undefined,
      shippingAddressId: selectedAddressId || undefined,
      fulfillment,
    })
      .then((result) => {
        if (cancelled) return;
        setQuote(result);
        setLastQuote(result);
        setQuoteError(null);
        setFulfillmentError(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        if (couponCode && err?.errors?.couponCode !== undefined) {
          toast.error(err.errors.couponCode || "That coupon can't be applied.");
          setCouponCode("");
          return;
        }
        setQuote(null);
        const fulfillmentMessage: string | undefined = err?.errors?.fulfillment;
        if (fulfillmentMessage) {
          const shops = lastQuote?.groups?.length
            ? lastQuote.groups.map((g) => ({ shopId: g.shopId, shopName: g.shopName }))
            : cartGroups;
          setFulfillmentError({ shopId: shopForError(fulfillmentMessage, shops), message: fulfillmentMessage });
          setQuoteError(null);
          return;
        }
        setFulfillmentError(null);
        setQuoteError(
          (err?.errors && (err.errors.items || Object.values(err.errors)[0])) ||
            err?.message ||
            "Unable to price your basket."
        );
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, basketKey, couponCode, selectedAddressId, fulfillmentKey]);

  const chooseMethod = (shopId: string, method: FulfillmentMethod) => {
    setFulfillment((prev) => [...prev.filter((f) => f.shopId !== shopId), { shopId, method }]);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAddress(true);
    setAddressErrors({});

    try {
      const created = await createAddress(addressForm);
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      setAddressForm(EMPTY_ADDRESS_FORM);
      toast.success("Address saved.");
    } catch (err: any) {
      setAddressErrors(err.errors || {});
      toast.error(err?.message || "Unable to save this address.");
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePlaceOrder = async () => {
    // A second click while the first is in flight must not send another request.
    if (submittingRef.current) return;
    if (!selectedAddressId) {
      toast.error("Please select or add a shipping address.");
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!quote) {
      toast.error("Please resolve the issues with your basket first.");
      return;
    }

    submittingRef.current = true;
    setPlacingOrder(true);
    try {
      const order = await checkout({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: couponCode || undefined,
        shippingAddressId: selectedAddressId,
        paymentMethod,
        // Exactly what the customer saw quoted for each shop.
        fulfillment: (quote.groups ?? []).map((g) => ({ shopId: g.shopId, method: g.fulfillmentMethod })),
        idempotencyKey,
      });
      // The next checkout is a new attempt.
      setIdempotencyKey(newIdempotencyKey());
      clearCart();

      // Cash on delivery has nothing to authorise, so it skips the payment step.
      if (paymentMethod === "cod") {
        toast.success("Order placed — payment on delivery.");
        router.push(`/checkout/confirmation/${order.id}`);
        return;
      }

      toast.success("Order created — complete payment to confirm.");
      router.push(`/checkout/payment?orderId=${order.id}`);
    } catch (err: any) {
      // The key is kept, so retrying returns the order if it was in fact created.
      if (err?.errors?.fulfillment) {
        const shops = (quote.groups ?? []).map((g) => ({ shopId: g.shopId, shopName: g.shopName }));
        setFulfillmentError({ shopId: shopForError(err.errors.fulfillment, shops), message: err.errors.fulfillment });
      }
      toast.error(
        (err?.errors && (err.errors.items || err.errors.fulfillment || Object.values(err.errors)[0])) ||
          err?.message ||
          "Unable to place your order."
      );
    } finally {
      submittingRef.current = false;
      setPlacingOrder(false);
    }
  };

  if (authLoading) {
    return <div className="py-24 text-center text-sm text-[var(--ink-muted)]">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--cream-2)] text-[var(--gold-deep)]">
          <Lock size={26} />
        </div>
        <h1 className="mt-6 font-display text-[30px] text-[var(--ink)]">Log in to check out</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          Please sign in or create an account to complete your purchase.
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/auth/login?redirect=/checkout" className="rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]">
            Log In
          </Link>
          <Link href="/auth/register?redirect=/checkout" className="rounded-[2px] border border-[var(--border-strong)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]">
            Create Account
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="font-display text-[30px] text-[var(--ink)]">Your cart is empty</h1>
        <Link href="/products" className="mt-6 rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]">
          Start Shopping
        </Link>
      </div>
    );
  }

  const money = (n: number) => `$${Number(n).toFixed(2)}`;

  // Shops to show: the server's groups when priced, else the last priced
  // groups (while a choice is being corrected), else the cart's own grouping.
  const sourceGroups = quote?.groups ?? lastQuote?.groups ?? null;
  const displayGroups = sourceGroups
    ? sourceGroups.map((g) => ({
        key: g.shopId,
        shopId: g.shopId,
        shopName: g.shopName,
        method: fulfillment.find((f) => f.shopId === g.shopId)?.method ?? g.fulfillmentMethod,
        availableMethods: g.availableMethods,
        priced: quote ? g : null,
        lines: g.lines.map((l) => ({ key: l.productId, name: l.name, quantity: l.quantity, total: quote ? l.total : null })),
      }))
    : cartGroups.map((g) => ({
        key: g.shopId ?? "other",
        shopId: g.shopId,
        shopName: g.shopName,
        method: (g.shopId && fulfillment.find((f) => f.shopId === g.shopId)?.method) || null,
        availableMethods: null,
        priced: null,
        lines: g.items.map((i) => ({ key: i.productId, name: i.name, quantity: i.quantity, total: null })),
      }));

  return (
    <div className="flex flex-col">
      <CheckoutNav current={2} />

      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-10 lg:grid-cols-3 lg:px-12">
        <div className="space-y-8 lg:col-span-2">
          {/* Shipping information */}
          <section className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[20px] font-semibold text-[var(--ink)]">Shipping Information</h2>

            {addresses.length > 0 && (
              <div className="mt-4 space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-[2px] border p-4 transition ${
                      selectedAddressId === address.id ? "border-[var(--gold)] bg-[var(--cream-2)]" :"border-[var(--border)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      checked={selectedAddressId === address.id}
                      onChange={() => setSelectedAddressId(address.id)}
                      className="mt-1"
                    />
                    <div className="text-sm">
                      <p className="font-semibold text-[var(--ink)]">{address.recipientName}</p>
                      <p className="text-[var(--ink-muted)]">
                        {address.line1}{address.line2 ? `, ${address.line2}` :""}, {address.city}
                        {address.state ? `, ${address.state}` :""} {address.postalCode}, {address.country}
                      </p>
                      {address.phone && <p className="text-[var(--ink-muted)]">{address.phone}</p>}
                    </div>
                  </label>
                ))}
              </div>
            )}

            {!showAddressForm ? (
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className="mt-4 text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--gold-deep)]"
              >
                + Add a new address
              </button>
            ) : (
              <form onSubmit={handleSaveAddress} className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full Name" error={addressErrors.recipientName}>
                    <input value={addressForm.recipientName} onChange={(e) => setAddressForm({ ...addressForm, recipientName: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Phone" error={addressErrors.phone}>
                    <input value={addressForm.phone} onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })} className={inputClass} />
                  </Field>
                </div>
                <Field label="Address Line 1" error={addressErrors.line1}>
                  <input value={addressForm.line1} onChange={(e) => setAddressForm({ ...addressForm, line1: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Address Line 2 (optional)" error={addressErrors.line2}>
                  <input value={addressForm.line2} onChange={(e) => setAddressForm({ ...addressForm, line2: e.target.value })} className={inputClass} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="City" error={addressErrors.city}>
                    <input value={addressForm.city} onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="State" error={addressErrors.state}>
                    <input value={addressForm.state} onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })} className={inputClass} />
                  </Field>
                  <Field label="Postal Code" error={addressErrors.postalCode}>
                    <input value={addressForm.postalCode} onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })} className={inputClass} />
                  </Field>
                </div>
                <Field label="Country Code (e.g. US)" error={addressErrors.country}>
                  <input value={addressForm.country} maxLength={2} onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value.toUpperCase() })} className={inputClass} />
                </Field>

                <div className="flex gap-3 pt-2">
                  <button type="submit" disabled={savingAddress} className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-semibold text-[var(--cream)] transition hover:bg-[var(--ink)] disabled:opacity-60">
                    {savingAddress ? "Saving..." :"Save Address"}
                  </button>
                  {addresses.length > 0 && (
                    <button type="button" onClick={() => setShowAddressForm(false)} className="rounded-full border border-[var(--border-strong)] px-5 py-2.5 text-sm font-medium text-[var(--ink)]">
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            )}
          </section>

          {/* Each shop ships (or hands over) its own part of the order */}
          <section className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[20px] font-semibold text-[var(--ink)]">
              {displayGroups.length > 1 ? `Your ${displayGroups.length} shops` : "Delivery or pickup"}
            </h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Each shop prepares its part of your order separately. Choose delivery or pickup for each.
            </p>
            {fulfillmentError && !fulfillmentError.shopId && (
              <p role="alert" className="mt-3 text-xs text-[var(--danger)]">
                {fulfillmentError.message}
              </p>
            )}
            <div className="mt-4 space-y-4">
              {displayGroups.map((group) => (
                <ShopFulfillmentGroup
                  key={group.key}
                  group={group}
                  stale={!quote}
                  error={fulfillmentError?.shopId && fulfillmentError.shopId === group.shopId ? fulfillmentError.message : null}
                  onChoose={chooseMethod}
                  money={money}
                />
              ))}
            </div>
          </section>

          {/* Payment method */}
          <section className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[20px] font-semibold text-[var(--ink)]">Payment Method</h2>
            <p className="mt-1 text-xs text-[var(--ink-muted)]">
              Card payments are taken securely by Stripe on the next step — we never see your card details.
            </p>
            <div className="mt-4 space-y-3">
              {[
                { value: "card" as const, label: "Credit / Debit Card", icon: CreditCard },
                { value: "cod" as const, label: "Cash on Delivery", icon: Truck },
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex cursor-pointer items-center gap-3 rounded-[2px] border p-4 ${
                    paymentMethod === option.value ? "border-[var(--gold)] bg-[var(--cream-2)]" :"border-[var(--border)]"
                  }`}
                >
                  <input type="radio" name="payment" checked={paymentMethod === option.value} onChange={() => setPaymentMethod(option.value)} />
                  <option.icon size={18} className="text-[var(--ink-muted)]" />
                  <span className="text-sm font-medium text-[var(--ink)]">{option.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-5 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[20px] font-semibold text-[var(--ink)]">Order Summary</h2>

            <div className="max-h-64 space-y-3 overflow-y-auto">
              {(quote?.groups ?? []).map((g) => (
                <div key={g.shopId} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--ink-muted)]">
                    {g.shopName}{" "}
                    <span className="text-[var(--ink-muted)]">
                      · {g.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"}
                    </span>
                  </span>
                  <span className="font-medium text-[var(--ink)]">{money(g.total)}</span>
                </div>
              ))}
              {!quote && (
                <p className="text-xs text-[var(--ink-muted)]">
                  {quoteError || fulfillmentError ? "Prices will appear once the issue above is resolved." : "Pricing your basket…"}
                </p>
              )}
            </div>

            <div className="space-y-2 border-t border-[var(--border)] pt-4 text-sm">
              {quoteError && (
                <p className="text-xs text-[var(--danger)]">{quoteError}</p>
              )}
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>Subtotal</span>
                <span>{quote ? money(quote.subtotal) : "—"}</span>
              </div>
              {quote && quote.discountTotal > 0 && (
                <div className="flex justify-between text-[var(--success)]">
                  <span>Discount ({couponCode})</span>
                  <span>-{money(quote.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>Shipping</span>
                <span>{quote ? (quote.shippingTotal > 0 ? money(quote.shippingTotal) : "Free") : "—"}</span>
              </div>
              <div className="flex justify-between text-[var(--ink-muted)]">
                <span>{quote?.taxCalculated ? `Tax (${quote.taxRate}%)` : "Tax"}</span>
                <span>{quote?.taxCalculated ? money(quote.taxTotal) : "Add an address"}</span>
              </div>
              <div className="flex justify-between border-t border-[var(--border)] pt-3 text-base font-semibold text-[var(--ink)]">
                <span>Total</span>
                <span>{quote ? money(quote.total) : "—"}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePlaceOrder}
              disabled={placingOrder || !quote?.taxCalculated}
              className="flex w-full items-center justify-center gap-2 rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {placingOrder
                ? "Placing Order..."
                : paymentMethod === "card"
                  ? "Continue to Payment"
                  : "Place Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-[2px] border border-[var(--border)] px-3 py-2 text-sm outline-none focus:border-[var(--gold)]";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-[var(--ink-muted)]">{label}</span>
      {children}
      {error && <span className="block text-xs text-[var(--danger)]">{error}</span>}
    </label>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="py-24 text-center text-sm text-[var(--ink-muted)]">Loading...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
