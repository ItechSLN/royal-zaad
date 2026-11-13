import Link from "next/link";
import { MapPin, Store, Truck } from "lucide-react";
import { formatDistance } from "@/components/store/marketplace/geo";

/**
 * Whether the shop delivers to the customer, as decided by the server:
 * true = within its delivery radius, false = pickup only for you, null = unknown
 * (no location chosen, or the shop's location isn't verified).
 */
export function DeliveryTag({
  deliversToYou,
  offersDelivery,
  offersPickup,
}: {
  deliversToYou: boolean | null | undefined;
  offersDelivery?: boolean;
  offersPickup?: boolean;
}) {
  let label: string | null = null;
  let tone = "text-[var(--ink-muted)]";
  if (deliversToYou === true) {
    label = "Delivers to you";
    tone = "text-[var(--success)]";
  } else if (deliversToYou === false) {
    label = offersPickup ? "Pickup only" : "Doesn't deliver to you";
    tone = offersPickup ? "text-[var(--warning)]" : "text-[var(--danger)]";
  } else if (offersDelivery === false && offersPickup) {
    label = "Pickup only";
    tone = "text-[var(--warning)]";
  } else if (offersDelivery && offersPickup) {
    label = "Delivery or pickup";
  } else if (offersDelivery) {
    label = "Delivery";
  }
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 font-body text-[10.5px] font-medium ${tone}`}>
      <Truck size={11} className="shrink-0" />
      {label}
    </span>
  );
}

/** Seller name (→ shop page), city and distance, shown under a product. */
export default function SellerLine({
  shop,
  distanceKm,
  className = "",
}: {
  shop: { name: string; slug: string; city?: string | null } | null | undefined;
  distanceKm?: number | null;
  className?: string;
}) {
  if (!shop) return null;
  const distance = formatDistance(distanceKm);
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <Link
        href={`/shops/${shop.slug}`}
        className="inline-flex items-center gap-1 font-body text-[11px] font-semibold text-[var(--ink)] underline-offset-2 transition hover:text-[var(--gold-deep)] hover:underline"
      >
        <Store size={11} className="shrink-0 text-[var(--gold-deep)]" />
        {shop.name}
      </Link>
      {(distance || shop.city) && (
        <span className="inline-flex items-center gap-1 font-body text-[10.5px] text-[var(--ink-muted)]">
          <MapPin size={11} className="shrink-0" />
          {distance ?? shop.city}
        </span>
      )}
    </div>
  );
}
