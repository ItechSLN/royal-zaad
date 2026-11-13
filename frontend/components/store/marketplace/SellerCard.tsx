"use client";

import Link from "next/link";
import { MapPin, Package, Store, Truck } from "lucide-react";
import { useCustomerLocation } from "@/context/LocationContext";
import { distanceToShop, formatDistance } from "@/components/store/marketplace/geo";
import type { ShopSummary } from "@/services/store-marketplace.service";

export function ShopLogo({ name, logoUrl, size = 48 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={`${name} logo`}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] object-cover"
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className="flex shrink-0 items-center justify-center rounded-full border border-[var(--gold)] bg-[var(--noir)] font-display text-[18px] text-[var(--gold)]"
    >
      {name.trim().charAt(0).toUpperCase() || <Store size={16} />}
    </span>
  );
}

/** The product page's "Sold by" card. Distance only from the shop's verified coordinates. */
export default function SellerCard({ shop }: { shop: ShopSummary }) {
  const { location } = useCustomerLocation();
  const distance = formatDistance(distanceToShop(location, shop));
  const place = [shop.city, shop.country].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="font-body text-[9px] font-bold tracking-[1.8px] text-[var(--ink-muted)]">SOLD BY</p>
      <div className="flex items-center gap-3">
        <ShopLogo name={shop.name} logoUrl={shop.logoUrl} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <Link
            href={`/shops/${shop.slug}`}
            className="font-display text-[20px] leading-tight text-[var(--ink)] transition hover:text-[var(--gold-deep)]"
          >
            {shop.name}
          </Link>
          {(place || distance) && (
            <span className="inline-flex items-center gap-1 font-body text-[11px] text-[var(--ink-muted)]">
              <MapPin size={11} className="shrink-0" />
              {[place, distance].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
        <Link
          href={`/shops/${shop.slug}`}
          className="shrink-0 font-body text-[11px] font-semibold text-[var(--gold-deep)]"
        >
          Visit shop →
        </Link>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span
          className={`inline-flex items-center gap-1 font-body text-[11px] ${
            shop.offersDelivery ? "text-[var(--success)]" : "text-[var(--ink-muted)] line-through"
          }`}
        >
          <Truck size={11} /> Delivery
        </span>
        <span
          className={`inline-flex items-center gap-1 font-body text-[11px] ${
            shop.offersPickup ? "text-[var(--success)]" : "text-[var(--ink-muted)] line-through"
          }`}
        >
          <Package size={11} /> Pickup
        </span>
        {!location && (
          <span className="font-body text-[11px] text-[var(--ink-muted)]">
            Set your location to see the distance.
          </span>
        )}
      </div>
    </div>
  );
}
