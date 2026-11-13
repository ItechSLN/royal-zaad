"use client";

import Link from "next/link";
import { MapPin, Package, Truck } from "lucide-react";
import SectionHeading from "@/components/store/common/SectionHeading";
import { ShopLogo } from "@/components/store/marketplace/SellerCard";
import { useKeyedRequest } from "@/components/store/marketplace/useKeyedRequest";
import { formatDistance } from "@/components/store/marketplace/geo";
import { useCustomerLocation } from "@/context/LocationContext";
import { searchShops } from "@/services/store-marketplace.service";

/** Home page rail of shops near the chosen location. Hidden until one is set. */
export default function ShopsNearYou({ radiusKm = 25, limit = 8 }: { radiusKm?: number; limit?: number }) {
  const { location } = useCustomerLocation();
  const key = location ? JSON.stringify([location.lat, location.lng, radiusKm, limit]) : null;
  const { loading, data, error, reload } = useKeyedRequest(key, () =>
    searchShops({ lat: location!.lat, lng: location!.lng, radiusKm, limit })
  );

  if (!location) return null;

  return (
    <section className="flex flex-col gap-[34px] bg-[var(--cream)] px-6 py-20 lg:px-12" aria-label="Shops near you">
      <div className="flex flex-col items-center gap-2">
        <SectionHeading eyebrow={`Within ${radiusKm} km of ${location.label}`} title="Shops Near You" />
      </div>

      {loading ? (
        <p role="status" className="text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Finding shops near you…
        </p>
      ) : error ? (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="font-body text-[12.5px] text-[var(--ink-muted)]">We couldn&apos;t load nearby shops.</p>
          <button type="button" onClick={reload} className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)]">
            Try again
          </button>
        </div>
      ) : !data || data.length === 0 ? (
        <p className="text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          No shops within {radiusKm} km yet — you can still order from shops that deliver further.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.map((shop) => (
            <Link
              key={shop.id}
              href={`/shops/${shop.slug}`}
              className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-5 transition hover:border-[var(--gold)]"
            >
              <div className="flex items-center gap-3">
                <ShopLogo name={shop.name} logoUrl={shop.logoUrl} size={44} />
                <div className="flex min-w-0 flex-col">
                  <span className="truncate font-display text-[20px] leading-tight text-[var(--ink)]">{shop.name}</span>
                  <span className="inline-flex items-center gap-1 font-body text-[11px] text-[var(--ink-muted)]">
                    <MapPin size={11} />
                    {[shop.city, formatDistance(shop.distanceKm)].filter(Boolean).join(" · ") || "Location unknown"}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-[11px] text-[var(--ink-muted)]">
                {shop.offersDelivery && (
                  <span className="inline-flex items-center gap-1">
                    <Truck size={11} /> Delivery
                    {shop.deliveryRadiusKm != null ? ` · ${shop.deliveryRadiusKm} km` : ""}
                  </span>
                )}
                {shop.offersPickup && (
                  <span className="inline-flex items-center gap-1">
                    <Package size={11} /> Pickup
                  </span>
                )}
                <span>
                  {shop.productCount} {shop.productCount === 1 ? "product" : "products"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
