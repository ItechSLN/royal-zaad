'use client';

import { Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, ExternalLink, Mail, MapPin, Package, Phone, Star, Truck } from "lucide-react";
import Breadcrumbs from "@/components/store/common/Breadcrumbs";
import { ShopLogo } from "@/components/store/marketplace/SellerCard";
import ReportLink from "@/components/store/marketplace/ReportDialog";
import {
  SearchResults,
  SortRadiusBar,
  useProductSearch,
  useSearchFilters,
} from "@/components/store/marketplace/ProductSearch";
import { statusOf, useKeyedRequest } from "@/components/store/marketplace/useKeyedRequest";
import { distanceToShop, formatDistance, osmLink } from "@/components/store/marketplace/geo";
import { useCustomerLocation } from "@/context/LocationContext";
import { getShopBySlug, type OpeningHours, type PublicShop } from "@/services/store-marketplace.service";

const DAYS: { key: keyof OpeningHours; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function OpeningHoursTable({ hours }: { hours: OpeningHours | null }) {
  if (!hours || typeof hours !== "object") {
    return <p className="font-body text-[12px] text-[var(--ink-muted)]">Opening hours not provided.</p>;
  }
  return (
    <dl className="flex flex-col">
      {DAYS.map((d) => {
        const slots = Array.isArray(hours[d.key]) ? hours[d.key]! : [];
        return (
          <div key={d.key} className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-b-0">
            <dt className="font-body text-[12px] text-[var(--ink-muted)]">{d.label}</dt>
            <dd className="font-mono text-[11.5px] text-[var(--ink)]">
              {slots.length === 0 ? "Closed" : slots.map((s) => `${s.open}–${s.close}`).join(", ")}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function ShopProducts({ shop }: { shop: PublicShop }) {
  const { filters, update } = useSearchFilters(`/shops/${shop.slug}`);
  const search = useProductSearch(filters, { shopId: shop.id });
  const total = search.data?.meta.total;

  return (
    <section className="flex flex-col gap-6" aria-labelledby="shop-products">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="shop-products" className="font-display text-[28px] text-[var(--ink)]">
            Products
          </h2>
          <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
            {search.loading || total === undefined ? "Loading…" : `${total} ${total === 1 ? "product" : "products"}`}
          </p>
        </div>
        <SortRadiusBar filters={filters} update={update} />
      </div>
      <SearchResults search={search} filters={filters} update={update} emptyText="This shop has no products listed right now." />
    </section>
  );
}

function ShopPageContent() {
  const params = useParams();
  const slug = String(params.slug ?? "");
  const { location } = useCustomerLocation();
  const { loading, data: shop, error, reload } = useKeyedRequest(slug || null, () => getShopBySlug(slug));

  if (loading) {
    return (
      <p role="status" className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        Loading shop…
      </p>
    );
  }

  if (error || !shop) {
    const notFound = statusOf(error) === 404;
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-6 py-24 text-center">
        <h1 className="font-display text-[32px] text-[var(--ink)]">{notFound ? "Shop not found" : "Couldn't load this shop"}</h1>
        <p className="font-body text-[12.5px] text-[var(--ink-muted)]">
          {notFound
            ? "This shop doesn't exist or isn't open on Royal Zaad right now."
            : "Please check your connection and try again."}
        </p>
        <div className="flex gap-4">
          {!notFound && (
            <button type="button" onClick={reload} className="font-body text-[12px] font-semibold text-[var(--gold-deep)]">
              Try again
            </button>
          )}
          <Link href="/products" className="font-body text-[12px] font-semibold text-[var(--gold-deep)]">
            Browse all products →
          </Link>
        </div>
      </div>
    );
  }

  const located = shop.latitude != null && shop.longitude != null;
  const distance = formatDistance(distanceToShop(location, shop));
  const place = [shop.city, shop.state, shop.country].filter(Boolean).join(", ");

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-8 lg:px-12">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shops" }, { label: shop.name }]} />
      </div>

      {/* Shop header */}
      <section className="mx-auto mt-6 w-full max-w-[1440px] px-6 lg:px-12">
        <div className="flex flex-col gap-6 bg-[var(--noir)] p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <ShopLogo name={shop.name} logoUrl={shop.logoUrl} size={72} />
            <div className="flex flex-col gap-1.5">
              <p className="font-body text-[10px] font-bold tracking-[2.4px] text-[var(--gold)]">SHOP</p>
              <h1 className="font-display text-[40px] leading-tight text-[var(--cream)]">{shop.name}</h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-body text-[11.5px] text-[var(--text-muted-dark)]">
                {place && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin size={12} className="text-[var(--gold)]" />
                    {place}
                    {distance ? ` · ${distance}` : ""}
                  </span>
                )}
                {shop.rating != null && shop.reviewCount > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <Star size={12} className="fill-[var(--amber)] text-[var(--amber)]" />
                    {shop.rating.toFixed(1)} ({shop.reviewCount} {shop.reviewCount === 1 ? "review" : "reviews"})
                  </span>
                ) : (
                  <span>No reviews yet</span>
                )}
                <span>
                  {shop.productCount} {shop.productCount === 1 ? "product" : "products"}
                </span>
              </div>
            </div>
          </div>
          {located && (
            <a
              href={osmLink(shop.latitude!, shop.longitude!)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 self-start rounded-[2px] border border-[var(--gold)] px-5 py-[11px] font-body text-[11.5px] font-semibold tracking-[1px] text-[var(--gold)] transition hover:bg-[var(--gold)]/10 lg:self-center"
            >
              View on map <ExternalLink size={13} />
            </a>
          )}
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-[1440px] gap-10 px-6 py-10 lg:grid-cols-[320px_1fr] lg:px-12">
        {/* About */}
        <aside className="flex flex-col gap-6">
          {shop.description && (
            <div className="flex flex-col gap-2">
              <h2 className="font-body text-[11px] font-bold tracking-[1.4px] text-[var(--ink)]">ABOUT</h2>
              <p className="whitespace-pre-line font-body text-[12.5px] leading-[1.8] text-[var(--ink-muted)]">
                {shop.description}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="font-body text-[11px] font-bold tracking-[1.4px] text-[var(--ink)]">GETTING YOUR ORDER</h2>
            <p className="inline-flex items-start gap-2 font-body text-[12px] text-[var(--ink)]">
              <Truck size={14} className="mt-0.5 shrink-0 text-[var(--gold-deep)]" />
              {shop.offersDelivery
                ? shop.deliveryRadiusKm != null
                  ? `Delivers within ${shop.deliveryRadiusKm} km of the shop`
                  : "Delivers — no distance limit"
                : "No delivery"}
            </p>
            <p className="inline-flex items-start gap-2 font-body text-[12px] text-[var(--ink)]">
              <Package size={14} className="mt-0.5 shrink-0 text-[var(--gold-deep)]" />
              {shop.offersPickup ? "Pickup from the shop available" : "No pickup"}
            </p>
            {!location && (
              <p className="font-body text-[11px] text-[var(--ink-muted)]">
                Set your location in the header to see how far away this shop is.
              </p>
            )}
            {location && !located && (
              <p className="font-body text-[11px] text-[var(--ink-muted)]">This shop&apos;s location hasn&apos;t been verified yet.</p>
            )}
          </div>

          <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="inline-flex items-center gap-2 font-body text-[11px] font-bold tracking-[1.4px] text-[var(--ink)]">
              <Clock size={13} className="text-[var(--gold-deep)]" /> OPENING HOURS
            </h2>
            <OpeningHoursTable hours={shop.openingHours} />
          </div>

          {(shop.phone || shop.email) && (
            <div className="flex flex-col gap-2 border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="font-body text-[11px] font-bold tracking-[1.4px] text-[var(--ink)]">CONTACT</h2>
              {shop.phone && (
                <a href={`tel:${shop.phone}`} className="inline-flex items-center gap-2 font-body text-[12px] text-[var(--ink)] hover:text-[var(--gold-deep)]">
                  <Phone size={13} /> {shop.phone}
                </a>
              )}
              {shop.email && (
                <a href={`mailto:${shop.email}`} className="inline-flex items-center gap-2 break-all font-body text-[12px] text-[var(--ink)] hover:text-[var(--gold-deep)]">
                  <Mail size={13} /> {shop.email}
                </a>
              )}
            </div>
          )}

          <ReportLink target={{ type: "SHOP", shopId: shop.id, name: shop.name }} className="self-start" />
        </aside>

        <ShopProducts shop={shop} />
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense
      fallback={
        <p className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">Loading shop…</p>
      }
    >
      <ShopPageContent />
    </Suspense>
  );
}
