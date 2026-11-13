"use client";

import Link from "next/link";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useCustomerLocation } from "@/context/LocationContext";
import { useKeyedRequest } from "@/components/store/marketplace/useKeyedRequest";
import { DeliveryTag } from "@/components/store/marketplace/SellerLine";
import { formatDistance, money } from "@/components/store/marketplace/geo";
import { searchProducts, type SearchProduct } from "@/services/store-marketplace.service";

/**
 * Other shops selling the same product, matched on barcode. Search matches
 * names and descriptions, so the barcode is tried first and the product name
 * is the fallback; either way only exact barcode matches are shown.
 */
async function findOtherSellers(
  product: { id: string; name: string; barcode: string },
  location: { lat: number; lng: number } | null
): Promise<SearchProduct[]> {
  const base = {
    includeOutOfStock: true,
    limit: 50,
    sort: location ? ("nearest" as const) : ("price_asc" as const),
    ...(location ? { lat: location.lat, lng: location.lng } : {}),
  };
  const sameBarcode = (rows: SearchProduct[]) => rows.filter((r) => r.barcode === product.barcode);

  let matches = sameBarcode((await searchProducts({ ...base, q: product.barcode })).data ?? []);
  if (matches.length === 0) {
    matches = sameBarcode((await searchProducts({ ...base, q: product.name })).data ?? []);
  }
  return matches.filter((r) => r.id !== product.id);
}

export default function AlsoSoldBy({ product }: { product: { id: string; name: string; barcode: string | null | undefined } }) {
  const { addItem } = useCart();
  const { location, ready } = useCustomerLocation();
  const barcode = product.barcode?.trim();

  const key =
    barcode && ready ? JSON.stringify([product.id, barcode, location?.lat, location?.lng]) : null;
  const { loading, data, error, reload } = useKeyedRequest(key, () =>
    findOtherSellers({ id: product.id, name: product.name, barcode: barcode! }, location)
  );

  if (!barcode) return null;

  const add = (row: SearchProduct) => {
    if (row.available <= 0) {
      toast.error("This seller is out of stock.");
      return;
    }
    addItem(
      {
        productId: row.id,
        name: row.name,
        price: Number(row.price),
        image: row.images?.[0]?.url ?? null,
        stock: row.available,
        shopId: row.shop?.id ?? null,
        shopName: row.shop?.name ?? null,
        shopSlug: row.shop?.slug ?? null,
      },
      1
    );
    toast.success(`Added from ${row.shop?.name ?? "this seller"}`);
  };

  return (
    <section className="mx-auto w-full max-w-[1440px] px-6 pb-12 lg:px-12" aria-labelledby="also-sold-by">
      <div className="border border-[var(--border)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border-strong)] bg-[var(--admin-bg)] px-5 py-3">
          <h2 id="also-sold-by" className="font-display text-[22px] text-[var(--ink)]">
            Also sold by
          </h2>
          {location && (
            <span className="font-body text-[11px] text-[var(--ink-muted)]">Nearest first · {location.label}</span>
          )}
        </div>

        {loading || (!ready && !data) ? (
          <p role="status" className="px-5 py-8 text-center font-body text-[12px] text-[var(--ink-muted)]">
            Looking for other sellers…
          </p>
        ) : error ? (
          <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
            <p className="font-body text-[12px] text-[var(--ink-muted)]">We couldn&apos;t check other sellers right now.</p>
            <button type="button" onClick={reload} className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)]">
              Try again
            </button>
          </div>
        ) : !data || data.length === 0 ? (
          <p className="px-5 py-8 text-center font-body text-[12px] text-[var(--ink-muted)]">
            No other shops sell this product right now.
          </p>
        ) : (
          <ul>
            {data.map((row) => {
              const compare = row.compareAtPrice != null ? Number(row.compareAtPrice) : null;
              const onSale = compare !== null && compare > Number(row.price);
              const distance = formatDistance(row.distanceKm);
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 last:border-b-0 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    {row.shop ? (
                      <Link
                        href={`/shops/${row.shop.slug}`}
                        className="font-body text-[13px] font-semibold text-[var(--ink)] transition hover:text-[var(--gold-deep)]"
                      >
                        {row.shop.name}
                      </Link>
                    ) : (
                      <span className="font-body text-[13px] font-semibold text-[var(--ink)]">Seller</span>
                    )}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-[11px] text-[var(--ink-muted)]">
                      {(distance || row.shop?.city) && <span>{distance ?? row.shop?.city}</span>}
                      <span className={row.available > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                        {row.available > 0 ? `${row.available} in stock` : "Out of stock"}
                      </span>
                      <DeliveryTag
                        deliversToYou={row.deliversToYou}
                        offersDelivery={row.shop?.offersDelivery}
                        offersPickup={row.shop?.offersPickup}
                      />
                      <Link href={`/products/${row.id}`} className="underline-offset-2 hover:underline">
                        View listing
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-body text-[15px] font-semibold text-[var(--ink)]">{money(row.price)}</span>
                      {onSale && (
                        <span className="font-body text-[12px] text-[var(--ink-muted)] line-through">{money(compare)}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => add(row)}
                      disabled={row.available <= 0}
                      aria-label={`Add to cart from ${row.shop?.name ?? "this seller"}`}
                      className="inline-flex items-center gap-2 rounded-[2px] bg-[var(--ink)] px-4 py-[9px] font-body text-[11px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <ShoppingBag size={13} />
                      Add to cart
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
