import Link from "next/link";
import { Package, Store, Truck } from "lucide-react";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import type { StoreOrderItem, VendorOrder } from "@/services/store-orders.service";

const TONE: Record<string, Tone> = {
  PENDING: "warning",
  PROCESSING: "warning",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "danger",
};

/** Customer-facing wording; for pickup, SHIPPED means ready for collection. */
export const vendorStatusLabel = (vo: Pick<VendorOrder, "status" | "fulfillmentMethod">) => {
  const pickup = vo.fulfillmentMethod === "PICKUP";
  switch (vo.status) {
    case "PENDING":
      return "Awaiting confirmation";
    case "PROCESSING":
      return "Preparing";
    case "SHIPPED":
      return pickup ? "Ready for collection" : "On its way";
    case "DELIVERED":
      return pickup ? "Collected" : "Delivered";
    case "CANCELLED":
      return "Cancelled";
    case "REFUNDED":
      return "Refunded";
    default:
      return vo.status;
  }
};

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : null;

/**
 * Each shop's part of an order — its own status, delivery or pickup, and
 * tracking. Items are matched to a shop by the order line's sub-order id.
 */
export default function VendorOrdersPanel({
  vendorOrders,
  items,
  compact = false,
}: {
  vendorOrders: VendorOrder[] | undefined;
  items?: StoreOrderItem[];
  compact?: boolean;
}) {
  if (!vendorOrders || vendorOrders.length === 0) return null;

  return (
    <div className="flex flex-col gap-3" data-testid="vendor-orders">
      {vendorOrders.map((vo) => {
        const lines = (items ?? []).filter((i) => i.vendorOrderId === vo.id);
        const pickup = vo.fulfillmentMethod === "PICKUP";
        return (
          <div key={vo.id} className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="inline-flex items-center gap-2 font-body text-[12.5px] font-semibold text-[var(--ink)]">
                <Store size={13} className="text-[var(--gold-deep)]" />
                {vo.shop?.slug ? (
                  <Link href={`/shops/${vo.shop.slug}`} className="transition hover:text-[var(--gold-deep)]">
                    {vo.shop.name}
                  </Link>
                ) : (
                  vo.shop?.name ?? "Shop"
                )}
                {vo.shop?.city && (
                  <span className="font-normal text-[var(--ink-muted)]">· {vo.shop.city}</span>
                )}
              </span>
              <StatusBadge tone={TONE[vo.status] ?? "neutral"}>{vendorStatusLabel(vo)}</StatusBadge>
            </div>

            <span className="inline-flex items-center gap-1.5 font-body text-[11px] text-[var(--ink-muted)]">
              {pickup ? <Package size={12} /> : <Truck size={12} />}
              {pickup ? "Pickup from the shop" : "Delivery"}
              {vo.total !== undefined && !compact ? ` · $${Number(vo.total).toFixed(2)}` : ""}
              {pickup && vo.shop?.phone ? ` · ${vo.shop.phone}` : ""}
            </span>

            {!compact && lines.length > 0 && (
              <ul className="flex flex-col gap-0.5">
                {lines.map((l) => (
                  <li key={l.id} className="font-body text-[11px] text-[var(--ink-muted)]">
                    {l.productName ?? l.product?.name ?? "Item"} × {l.quantity}
                  </li>
                ))}
              </ul>
            )}

            {vo.shipments?.length > 0 ? (
              <ul className="flex flex-col gap-1">
                {vo.shipments.map((sh, i) => (
                  <li key={sh.id ?? `${sh.awb}-${i}`} className="font-mono text-[10.5px] text-[var(--ink)]">
                    {sh.carrier} · AWB {sh.awb} · {sh.status}
                    {sh.eta ? ` · ETA ${fmtDate(sh.eta)}` : ""}
                    {sh.deliveredAt ? ` · delivered ${fmtDate(sh.deliveredAt)}` : ""}
                  </li>
                ))}
              </ul>
            ) : (
              !pickup &&
              !compact && (
                <span className="font-body text-[10.5px] text-[var(--ink-muted)]">
                  Tracking appears here once this shop dispatches.
                </span>
              )
            )}
          </div>
        );
      })}
    </div>
  );
}
