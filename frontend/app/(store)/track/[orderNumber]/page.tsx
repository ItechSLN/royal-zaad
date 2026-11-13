'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, MessageSquare, PackageSearch, RotateCcw, Undo2 } from "lucide-react";
import ProductImage from "@/components/store/common/ProductImage";
import { StatusBadge } from "@/components/ui/Badge";
import VendorOrdersPanel from "@/components/store/marketplace/VendorOrdersPanel";
import { trackOrder } from "@/services/store-orders.service";

const HELP = [
  { icon: PackageSearch, label: "Report a missing or damaged item" },
  { icon: Undo2, label: "Start a return or exchange" },
  { icon: RotateCcw, label: "Reschedule this delivery" },
  { icon: MessageSquare, label: "Message the concierge team" },
];

const MAP_IMAGE =
  "https://images.unsplash.com/photo-1524661135-423995f22d0b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1200";

type TrackedOrder = Awaited<ReturnType<typeof trackOrder>>;

/** Stage labels the storefront shows for each order status. */
const STATUS_COPY: Record<string, { badge: string; headline: string }> = {
  PENDING: { badge: "PAYMENT PENDING", headline: "Awaiting payment confirmation" },
  PROCESSING: { badge: "PROCESSING", headline: "Being picked and packed" },
  SHIPPED: { badge: "IN TRANSIT", headline: "On its way to you" },
  DELIVERED: { badge: "DELIVERED", headline: "Delivered — thank you" },
  CANCELLED: { badge: "CANCELLED", headline: "This order was cancelled" },
  REFUNDED: { badge: "REFUNDED", headline: "This order was refunded" },
};

/** The trail an order has actually reached, newest first. */
const buildTimeline = (order: TrackedOrder) => {
  const placed = new Date(order.createdAt);
  const when = (d: Date) =>
    d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const trail: { title: string; note: string; when: string; done: boolean }[] = [];
  const shipment = order.shipments?.[0];

  if (order.status === "DELIVERED") {
    trail.push({
      title: "Delivered",
      note: shipment?.city ? `Signed for in ${shipment.city}` : "Signed for",
      when: when(new Date(order.createdAt)),
      done: true,
    });
  }

  if (shipment) {
    trail.push({
      title: "Shipped",
      note: `${shipment.carrier} · AWB ${shipment.awb}`,
      when: when(placed),
      done: true,
    });
  }

  if (["PROCESSING", "SHIPPED", "DELIVERED"].includes(order.status)) {
    trail.push({
      title: "Processing",
      note: `${order.items.length} item(s) allocated to the warehouse`,
      when: when(placed),
      done: true,
    });
  }

  if (order.payment?.status === "PAID") {
    trail.push({
      title: "Payment confirmed",
      note: `${order.payment.status} · $${Number(order.payment.amount).toFixed(2)}`,
      when: when(placed),
      done: true,
    });
  }

  trail.push({
    title: "Order placed",
    note: `Placed online · ${order.orderNumber}`,
    when: when(placed),
    done: true,
  });

  return trail;
};

export default function OrderTrackingPage() {
  const params = useParams();
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!orderNumber) return;
    trackOrder(orderNumber)
      .then((data) => {
        setOrder(data);
        setNotFound(false);
      })
      .catch(() => setNotFound(true));
  }, [orderNumber]);

  const timeline = useMemo(() => (order ? buildTimeline(order) : []), [order]);

  if (notFound) {
    return (
      <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-4 px-6 py-24 text-center lg:px-12">
        <p className="font-body text-[10px] font-bold tracking-[3px] text-[var(--gold-deep)]">
          ORDER TRACKING
        </p>
        <h1 className="font-display text-[34px] leading-tight text-[var(--ink)]">Order not found</h1>
        <p className="max-w-[480px] font-body text-[12.5px] leading-[1.8] text-[var(--ink-muted)]">
          We could not find an order with the number #{orderNumber}. Please check the number on your
          confirmation email, or view your orders in your account.
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/account/orders"
            className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)]"
          >
            View my orders →
          </Link>
          <Link
            href="/products"
            className="font-body text-[11.5px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
          >
            ← Continue shopping
          </Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <p className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        Loading order…
      </p>
    );
  }

  const shipment = order.items.map((item) => ({
    id: item.id,
    name: item.productName ?? item.product?.name ?? "Item",
    shortDescription: item.sku ?? item.product?.sku ?? "",
    quantity: item.quantity,
    images: item.imageUrl ? [{ url: item.imageUrl }] : item.product?.images ?? [],
  }));

  const consignment = order.shipments?.[0];
  const status = STATUS_COPY[order.status] ?? STATUS_COPY.PENDING;
  const address = order.shippingAddress;

  return (
    <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-6 py-10 lg:px-12">
      {/* Head */}
      <div className="flex flex-col gap-6 border-b border-[var(--border)] pb-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-2">
          <p className="font-body text-[10px] font-bold tracking-[3px] text-[var(--gold-deep)]">
            ORDER TRACKING
          </p>
          <h1 className="font-display text-[40px] leading-tight text-[var(--ink)]">
            #{orderNumber}
          </h1>
          <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
            {`${order.items.length} item(s) · placed ${new Date(order.createdAt).toLocaleDateString(
              "en-GB",
              {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }
            )}${consignment ? ` · ${consignment.carrier} AWB ${consignment.awb}` : ""}`}
          </p>
        </div>

        <div className="flex flex-col gap-2 lg:items-end">
          <StatusBadge
            tone={
              order.status === "DELIVERED"
                ? "success"
                : order.status === "CANCELLED"
                  ? "danger"
                  : "info"
            }
          >
            {status.badge}
          </StatusBadge>
          <p className="font-body text-[13px] font-semibold text-[var(--ink)]">
            {status.headline}
          </p>
          <p className="font-body text-[11px] text-[var(--ink-muted)]">
            {`Order total $${Number(order.total).toFixed(2)}`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left */}
        <div className="flex min-w-0 flex-1 flex-col gap-6">
          {/* Live map */}
          <div className="relative h-[320px] overflow-hidden border border-[var(--border)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MAP_IMAGE} alt="Delivery map" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[var(--noir)]/25" />

            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 border border-[var(--hairline)] bg-[var(--noir)]/90 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--gold)] text-[var(--noir)]">
                <MapPin size={16} />
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="font-body text-[12.5px] font-semibold text-[var(--cream)]">
                  {consignment ? `${consignment.carrier} · AWB ${consignment.awb}` : status.headline}
                </span>
                <span className="font-body text-[11px] text-[var(--text-muted-dark)]">
                  {consignment
                    ? [
                        consignment.status,
                        consignment.city,
                        consignment.eta
                          ? `ETA ${new Date(consignment.eta).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                            })}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Carrier details will appear here once your order ships."}
                </span>
              </div>
            </div>
          </div>

          {/* Each shop's part — its own status and tracking */}
          {(order.vendorOrders?.length ?? 0) > 0 && (
            <div className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6">
              <h2 className="font-display text-[22px] text-[var(--ink)]">
                {order.vendorOrders!.length > 1 ? `From ${order.vendorOrders!.length} shops` : "Your shop"}
              </h2>
              <VendorOrdersPanel vendorOrders={order.vendorOrders} items={order.items} />
            </div>
          )}

          {/* Timeline */}
          <div className="flex flex-col gap-5 border border-[var(--border)] bg-[var(--surface)] p-6">
            <h2 className="font-display text-[22px] text-[var(--ink)]">Shipment History</h2>

            <div className="flex flex-col">
              {timeline.map((step, i) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 h-[9px] w-[9px] shrink-0 rounded-full ${
                        i === 0 ? "bg-[var(--gold)]" : "bg-[var(--border-strong)]"
                      }`}
                    />
                    {i < timeline.length - 1 && (
                      <span className="w-px flex-1 bg-[var(--border)]" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-0.5 pb-6">
                    <span
                      className={`font-body text-[12.5px] ${
                        i === 0
                          ? "font-semibold text-[var(--ink)]"
                          : "font-medium text-[var(--ink)]"
                      }`}
                    >
                      {step.title}
                    </span>
                    <span className="font-body text-[11px] text-[var(--ink-muted)]">
                      {step.note}
                    </span>
                    <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                      {step.when}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <aside className="flex w-full shrink-0 flex-col gap-6 lg:w-[360px]">
          <div className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="font-display text-[19px] text-[var(--ink)]">In this shipment</h3>
            {shipment.map((p) => (
              <div key={p.id} className="flex items-center gap-3">
                <ProductImage
                  src={p.images[0]?.url}
                  alt={p.name}
                  className="h-[56px] w-[56px] bg-[var(--cream-2)]"
                />
                <div className="flex min-w-0 flex-col">
                  <span className="font-body text-[12.5px] font-semibold text-[var(--ink)]">
                    {p.name}
                  </span>
                  <span className="font-body text-[11px] text-[var(--ink-muted)]">
                    {p.shortDescription} · ×{p.quantity}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-6">
            <div className="flex items-center gap-2">
              <MapPin size={13} className="text-[var(--gold-deep)]" />
              <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
                DELIVERING TO
              </span>
            </div>
            <p className="font-body text-[12.5px] font-semibold text-[var(--ink)]">
              {address ? `${address.city}, ${address.country}` : "—"}
            </p>
            <p className="font-body text-[11.5px] leading-[1.7] text-[var(--ink-muted)]">
              {/* Public lookup: the full address is only shown in the signed-in account. */}
              Full delivery address is shown in your account.
            </p>
            <button
              type="button"
              className="mt-1 text-left font-body text-[11.5px] font-semibold text-[var(--gold-deep)]"
            >
              Change delivery instructions →
            </button>
          </div>

          <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-6">
            <h3 className="font-display text-[19px] text-[var(--ink)]">Need help with this order?</h3>
            {HELP.map((h) => (
              <button
                key={h.label}
                type="button"
                className="flex items-center gap-[9px] text-left font-body text-[11.5px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
              >
                <h.icon size={13} className="shrink-0 text-[var(--gold-deep)]" />
                {h.label}
              </button>
            ))}
          </div>

          <Link
            href="/products"
            className="text-center font-body text-[11.5px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
          >
            ← Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
