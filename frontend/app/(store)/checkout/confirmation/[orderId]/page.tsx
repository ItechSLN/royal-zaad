'use client';

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Check, Mail } from "lucide-react";
import ProductCard from "@/components/store/product/ProductCard";
import ProductImage from "@/components/store/common/ProductImage";
import SectionHeading from "@/components/store/common/SectionHeading";
import VendorOrdersPanel from "@/components/store/marketplace/VendorOrdersPanel";
import GoldRule from "@/components/ui/GoldRule";
import Button from "@/components/ui/Button";
import { getMyOrderById, StoreOrder } from "@/services/store-orders.service";
import { getBestSellingProducts, getStoreProducts } from "@/services/store-products.service";
import type { Product } from "@/services/product.service";

type ProgressStep = { title: string; when: string; done: boolean; active?: boolean };

const FLOW = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"];

/** The real order's progress, so the page never claims a payment that hasn't settled. */
function buildProgress(order: StoreOrder): ProgressStep[] {
  const placed = new Date(order.createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const paid = order.payment?.status === "PAID";
  const reached = FLOW.indexOf(order.status);

  if (order.status === "CANCELLED" || order.status === "REFUNDED") {
    return [
      { title: "Order placed", when: placed, done: true },
      { title: order.status === "CANCELLED" ? "Cancelled" : "Refunded", when: "", done: true },
    ];
  }

  return [
    { title: "Order placed", when: placed, done: true },
    {
      title: paid ? "Payment confirmed" : "Awaiting payment confirmation",
      when: paid ? "Confirmed" : "Pending",
      done: paid,
      active: !paid,
    },
    { title: "Processing", when: "", done: reached >= 1, active: paid && reached === 1 },
    { title: "Shipped", when: "", done: reached >= 2, active: reached === 2 },
    { title: "Delivered", when: "", done: reached >= 3 },
  ];
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [recommended, setRecommended] = useState<Product[]>([]);

  useEffect(() => {
    if (!orderId) return;
    getMyOrderById(orderId)
      .then((data) => {
        setOrder(data);
        setFailed(false);
      })
      .catch(() => {
        setOrder(null);
        setFailed(true);
      })
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    getBestSellingProducts(4)
      .then((data) => (data?.length ? data : getStoreProducts({ limit: 4 }).then((r) => r.data)))
      .then((data) => setRecommended((data ?? []).slice(0, 4)))
      .catch(() => setRecommended([]));
  }, []);

  if (loading) {
    return (
      <p className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        Loading your order…
      </p>
    );
  }

  if (failed || !order) {
    return (
      <section className="flex flex-col items-center gap-5 bg-[var(--cream)] px-6 py-24 text-center lg:px-12">
        <h1 className="font-display text-[34px] leading-tight text-[var(--ink)]">
          We couldn&apos;t load this order
        </h1>
        <GoldRule />
        <p className="max-w-[480px] font-body text-[13px] leading-[1.8] text-[var(--ink-muted)]">
          Please check your order history — every order you have placed is listed there.
        </p>
        <Button href="/account/orders" variant="primary">
          VIEW MY ORDERS
        </Button>
      </section>
    );
  }

  const orderNumber = order.orderNumber;
  const lines = (order.items ?? []).map((i) => ({
    id: i.id,
    name: i.productName ?? i.product?.name ?? "Item",
    note: `×${i.quantity}`,
    price: Number(i.total),
    image: i.imageUrl ?? i.product?.images?.[0]?.url ?? null,
  }));

  const subtotal = Number(order.subtotal ?? 0);
  const discount = Number(order.discountTotal ?? 0);
  const tax = Number(order.taxTotal ?? 0);
  const shipping = Number(order.shippingTotal ?? 0);
  const total = Number(order.total ?? 0);
  const money = (n: number) => `$${n.toFixed(2)}`;

  const progress = buildProgress(order);
  const firstName = order.customer?.firstName?.trim();
  const placedAt = new Date(order.createdAt).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const address = order.shippingAddress;
  const addressText = address
    ? [
        address.recipientName,
        address.line1,
        address.line2,
        [address.city, address.state, address.postalCode].filter(Boolean).join(" "),
        address.country,
        address.phone,
      ]
        .filter(Boolean)
        .join("\n")
    : "No shipping address on file";

  const paymentStatus = order.payment?.status
    ? order.payment.status.charAt(0) + order.payment.status.slice(1).toLowerCase()
    : "Pending";
  const statusLabel = order.status.charAt(0) + order.status.slice(1).toLowerCase();

  return (
    <div className="flex flex-col">
      {/* Success hero */}
      <section className="flex flex-col items-center gap-5 bg-[var(--cream)] px-6 py-16 text-center lg:px-12">
        <span className="flex h-[62px] w-[62px] items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--surface)]">
          <Check size={26} className="text-[var(--gold)]" />
        </span>

        <h1 className="font-display text-[46px] leading-tight text-[var(--ink)]">
          {firstName ? `Thank you, ${firstName}.` : "Thank you."}
        </h1>
        <GoldRule />
        <p className="max-w-[560px] font-body text-[13px] leading-[1.8] text-[var(--ink-muted)]">
          We&apos;ve received your order. We&apos;ll keep you updated as it moves through each stage.
        </p>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-10 border-y border-[var(--border)] px-6 py-5">
          {[
            ["ORDER NUMBER", `#${orderNumber}`],
            ["PLACED", placedAt],
            ["STATUS", statusLabel],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-body text-[9px] font-bold tracking-[1.8px] text-[var(--ink-muted)]">
                {label}
              </span>
              <span className="font-body text-[13px] font-semibold text-[var(--ink)]">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          <Button href={`/track/${orderNumber}`} variant="primary">
            TRACK THIS ORDER
          </Button>
          <Button href="/account/orders" variant="soft">
            View my orders
          </Button>
          <Button href="/products" variant="ghost">
            CONTINUE SHOPPING
          </Button>
        </div>
      </section>

      {/* Email note */}
      <div className="flex items-center justify-center gap-3 bg-[var(--ink)] px-6 py-4 text-center">
        <Mail size={14} className="shrink-0 text-[var(--gold)]" />
        <p className="font-body text-[11.5px] text-[var(--text-muted-dark)]">
          {order.customer?.email
            ? `A confirmation has been sent to ${order.customer.email}`
            : "A confirmation will be sent to the email on your account"}
        </p>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-8 bg-[var(--cream)] px-6 py-12 lg:flex-row lg:px-12">
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Progress */}
          <div className="flex flex-col gap-5 border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[22px] text-[var(--ink)]">Order Progress</h2>
            <div className="flex flex-col">
              {progress.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-full ${
                        step.done
                          ? "bg-[var(--ink)]"
                          : step.active
                            ? "bg-[var(--gold)]"
                            : "border border-[var(--border-strong)] bg-[var(--surface)]"
                      }`}
                    >
                      {step.done && <Check size={9} className="text-[var(--gold)]" />}
                    </span>
                    {i < progress.length - 1 && <span className="w-px flex-1 bg-[var(--border)]" />}
                  </div>
                  <div className="flex flex-1 flex-col gap-0.5 pb-5">
                    <span
                      className={`font-body text-[12.5px] ${
                        step.done || step.active
                          ? "font-semibold text-[var(--ink)]"
                          : "text-[var(--ink-muted)]"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      {step.when}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Each shop's part of the order */}
          {(order.vendorOrders?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="font-display text-[22px] text-[var(--ink)]">
                {order.vendorOrders!.length > 1 ? `From ${order.vendorOrders!.length} shops` : "Your shop"}
              </h2>
              <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
                Each shop prepares and sends its part separately — statuses update independently.
              </p>
              <VendorOrdersPanel vendorOrders={order.vendorOrders} items={order.items} />
            </div>
          )}

          {/* Details */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                head: "SHIPPING ADDRESS",
                body: addressText,
              },
              {
                head: "ORDER DETAILS",
                body: `Order #${orderNumber}\nPlaced ${placedAt}\nStatus: ${statusLabel}`,
              },
              {
                head: "PAYMENT & DELIVERY",
                body: [
                  `Payment: ${paymentStatus}`,
                  order.payment ? `Amount ${money(Number(order.payment.amount))}` : null,
                  `Shipping: ${shipping > 0 ? money(shipping) : "Free"}`,
                ]
                  .filter(Boolean)
                  .join("\n"),
              },
            ].map((d) => (
              <div
                key={d.head}
                className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-5"
              >
                <span className="font-body text-[9px] font-bold tracking-[1.8px] text-[var(--ink-muted)]">
                  {d.head}
                </span>
                <p className="whitespace-pre-line font-body text-[11.5px] leading-[1.8] text-[var(--ink-muted)]">
                  {d.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <aside className="w-full shrink-0 lg:w-[380px]">
          <div className="sticky top-28 flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[20px] text-[var(--ink)]">Order #{orderNumber}</h2>

            {lines.map((l) => (
              <div key={l.id} className="flex items-center gap-3">
                <ProductImage
                  src={l.image}
                  alt={l.name}
                  className="h-[52px] w-[52px] bg-[var(--cream-2)]"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="font-body text-[12px] font-semibold text-[var(--ink)]">
                    {l.name}
                  </span>
                  <span className="font-body text-[10.5px] text-[var(--ink-muted)]">{l.note}</span>
                </div>
                <span className="font-body text-[12px] text-[var(--ink)]">{money(l.price)}</span>
              </div>
            ))}

            <div className="h-px w-full bg-[var(--border)]" />

            <div className="flex flex-col gap-2.5">
              {[
                ["Subtotal", money(subtotal)],
                ...(discount
                  ? [[order.coupon?.code ? `Discount — ${order.coupon.code}` : "Discount", `−${money(discount)}`]]
                  : []),
                ["Tax", money(tax)],
                ["Shipping", shipping > 0 ? money(shipping) : "FREE"],
              ].map(([label, value]) => (
                <div key={label as string} className="flex items-center justify-between">
                  <span className="font-body text-[12px] text-[var(--ink-muted)]">{label}</span>
                  <span className="font-body text-[12px] text-[var(--ink)]">{value}</span>
                </div>
              ))}
            </div>

            <div className="h-px w-full bg-[var(--border)]" />

            <div className="flex items-center justify-between">
              <span className="font-display text-[20px] text-[var(--ink)]">Total</span>
              <span className="font-display text-[26px] font-semibold text-[var(--ink)]">
                {money(total)}
              </span>
            </div>
          </div>
        </aside>
      </div>

      {/* Recommended */}
      {recommended.length > 0 && (
        <section className="flex flex-col gap-[34px] bg-[var(--cream-2)] px-6 py-20 lg:px-12">
          <div className="flex justify-center">
            <SectionHeading eyebrow="Pairs beautifully" title="Complete the ritual" />
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {recommended.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
