'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Lock, ShieldCheck, TriangleAlert, Undo2 } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import CheckoutNav from "@/components/store/layout/CheckoutNav";
import {
  createCardPayment,
  getMyOrderById,
  syncCardPayment,
  type StoreOrder,
} from "@/services/store-orders.service";

const ASSURANCES = [
  { icon: Lock, label: "Card details go straight to Stripe — never to our servers" },
  { icon: ShieldCheck, label: "3-D Secure verification where your bank requires it" },
  { icon: Undo2, label: "Full refund within 30 days" },
];

const money = (n: number) => `$${n.toFixed(2)}`;

/** Collects the card with Stripe's Payment Element and confirms the PaymentIntent. */
function CardForm({ order, onPaid }: { order: StoreOrder; onPaid: () => Promise<void> }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // Redirect-based methods (and some 3-D Secure flows) come back here.
        return_url: `${window.location.origin}/checkout/payment?orderId=${order.id}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Your payment could not be completed.");
      setProcessing(false);
      return;
    }

    if (paymentIntent && ["succeeded", "processing"].includes(paymentIntent.status)) {
      await onPaid();
      return;
    }

    setError("Your payment was not completed. Please try again.");
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <PaymentElement options={{ layout: "tabs" }} />

      {error && (
        <div className="flex items-start gap-3 border border-[var(--danger)] bg-[var(--danger-bg)] p-4">
          <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          <p className="font-body text-[12px] leading-[1.6] text-[var(--danger)]">
            {error} No charge was made.
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full rounded-[2px] bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] px-6 py-[15px] font-body text-[12px] font-bold tracking-[1.8px] text-[var(--noir)] transition hover:brightness-[1.06] disabled:opacity-60"
      >
        {processing ? "PROCESSING…" : `PAY ${money(Number(order.total))}`}
      </button>
    </form>
  );
}

function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  // Present when Stripe redirects back after a bank or wallet step.
  const returnedIntent = searchParams.get("payment_intent");

  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const goToConfirmation = () => router.replace(`/checkout/confirmation/${orderId}`);

  // The server re-checks the PaymentIntent with Stripe and settles the order.
  const finishPayment = async () => {
    if (!orderId) return;
    try {
      const { status } = await syncCardPayment(orderId);
      toast.success(
        status === "PAID" ? "Payment received." : "Payment submitted — we'll confirm shortly."
      );
    } catch {
      toast.success("Payment submitted — we'll confirm shortly.");
    }
    goToConfirmation();
  };

  useEffect(() => {
    if (!orderId) return;

    if (returnedIntent) {
      finishPayment();
      return;
    }

    getMyOrderById(orderId)
      .then(async (loaded) => {
        setOrder(loaded);

        if (loaded.payment?.status === "PAID" || loaded.payment?.provider !== "card") {
          return;
        }

        try {
          const intent = await createCardPayment(loaded.id);
          setClientSecret(intent.clientSecret);
          setPublishableKey(intent.publishableKey ?? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null);
        } catch (err: any) {
          setPaymentError(err?.message ?? "Card payments are unavailable right now.");
        }
      })
      .catch(() => setLoadError("We couldn't load this order."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, returnedIntent]);

  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  if (!orderId || loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <h1 className="font-display text-[30px] text-[var(--ink)]">
          {loadError ?? "No order to pay for"}
        </h1>
        <Link
          href="/account/orders"
          className="mt-6 rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)]"
        >
          View your orders
        </Link>
      </div>
    );
  }

  if (returnedIntent || !order) {
    return (
      <p className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        {returnedIntent ? "Confirming your payment…" : "Loading…"}
      </p>
    );
  }

  const paid = order.payment?.status === "PAID";
  const isCod = order.payment?.provider === "cod";

  return (
    <div className="flex flex-col">
      <CheckoutNav current={4} />

      <div className="flex flex-col gap-8 bg-[var(--cream)] px-6 py-10 lg:flex-row lg:px-12">
        {/* Left — payment panel */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <div className="flex flex-col gap-6 border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[24px] text-[var(--ink)]">Payment</h2>

            {paid ? (
              <div className="flex flex-col gap-4">
                <p className="font-body text-[12.5px] text-[var(--ink-muted)]">
                  This order is already paid.
                </p>
                <button
                  type="button"
                  onClick={goToConfirmation}
                  className="self-start rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)]"
                >
                  View confirmation
                </button>
              </div>
            ) : isCod ? (
              <div className="flex flex-col gap-4">
                <p className="font-body text-[12.5px] leading-[1.8] text-[var(--ink-muted)]">
                  You chose cash on delivery — pay the courier when your order arrives.
                </p>
                <button
                  type="button"
                  onClick={goToConfirmation}
                  className="self-start rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)]"
                >
                  View confirmation
                </button>
              </div>
            ) : paymentError ? (
              <div className="flex items-start gap-3 border border-[var(--danger)] bg-[var(--danger-bg)] p-5">
                <TriangleAlert size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
                <div className="flex flex-col gap-1">
                  <p className="font-body text-[12.5px] font-semibold text-[var(--danger)]">
                    {paymentError}
                  </p>
                  <p className="font-body text-[11.5px] leading-[1.7] text-[var(--ink-muted)]">
                    Your order is saved. Try again shortly, or contact us to arrange payment.
                  </p>
                </div>
              </div>
            ) : clientSecret && stripePromise ? (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret,
                  appearance: { theme: "stripe", variables: { borderRadius: "2px" } },
                }}
              >
                <CardForm order={order} onPaid={finishPayment} />
              </Elements>
            ) : (
              <p className="font-body text-[12px] text-[var(--ink-muted)]">Preparing secure payment…</p>
            )}
          </div>
        </div>

        {/* Summary */}
        <aside className="w-full shrink-0 lg:w-[380px]">
          <div className="sticky top-6 flex flex-col gap-5">
            <div className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="font-display text-[24px] text-[var(--ink)]">Order Summary</h2>
              <p className="-mt-2 font-mono text-[10.5px] text-[var(--ink-muted)]">
                {order.orderNumber}
              </p>

              <div className="flex flex-col gap-2.5">
                {[
                  [`Subtotal (${order.items.length} items)`, money(Number(order.subtotal))],
                  ...(Number(order.discountTotal) > 0
                    ? [
                        [
                          order.coupon ? `Coupon — ${order.coupon.code}` : "Discount",
                          `−${money(Number(order.discountTotal))}`,
                        ] as [string, string],
                      ]
                    : []),
                  [
                    "Delivery",
                    Number(order.shippingTotal) > 0 ? money(Number(order.shippingTotal)) : "FREE",
                  ],
                  ["Tax", money(Number(order.taxTotal))],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="font-body text-[12px] text-[var(--ink-muted)]">{label}</span>
                    <span className="font-body text-[12px] text-[var(--ink)]">{value}</span>
                  </div>
                ))}
              </div>

              <div className="h-px w-full bg-[var(--border)]" />

              <div className="flex items-center justify-between">
                <span className="font-display text-[20px] text-[var(--ink)]">Amount due</span>
                <span className="font-display text-[26px] font-semibold text-[var(--ink)]">
                  {money(paid ? 0 : Number(order.total))}
                </span>
              </div>

              <p className="font-body text-[10.5px] leading-[1.7] text-[var(--ink-muted)]">
                By placing this order you agree to our Terms &amp; Conditions, Privacy Policy and
                Return Policy.
              </p>
            </div>

            <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-5">
              {ASSURANCES.map((a) => (
                <div key={a.label} className="flex items-center gap-[9px]">
                  <a.icon size={13} className="shrink-0 text-[var(--gold-deep)]" />
                  <span className="font-body text-[11px] text-[var(--ink-muted)]">{a.label}</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <p className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading…
        </p>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
