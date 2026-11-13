'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import AccountShell from "@/components/store/account/AccountShell";
import ProductImage from "@/components/store/common/ProductImage";
import { useCart } from "@/context/CartContext";
import {
  getWishlist,
  removeFromWishlist,
  type WishlistEntry,
} from "@/services/account.service";

export default function WishlistPage() {
  const { addItem } = useCart();
  const [items, setItems] = useState<WishlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setItems(await getWishlist());
      setLoadError(null);
    } catch (error) {
      setLoadError((error as { message?: string })?.message ?? "We couldn't load your wishlist.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (productId: string, name: string) => {
    try {
      await removeFromWishlist(productId);
      await load();
      toast.success(`${name} removed from your wishlist.`);
    } catch (error) {
      const api = error as { message?: string };
      toast.error(api?.message ?? "Unable to remove that item.");
    }
  };

  const moveToBag = async (entry: WishlistEntry) => {
    const p = entry.product;
    // The wishlist row carries the selling shop when the API includes it.
    const shop = (p as { shop?: { id: string; name: string; slug: string } | null }).shop ?? null;
    const available = (p.inventory?.quantity ?? 0) - (p.inventory?.reserved ?? 0);

    if (available <= 0) {
      toast.error(`${p.name} is out of stock.`);
      return;
    }

    addItem(
      {
        productId: p.id,
        name: p.name,
        price: Number(p.price),
        image: p.images?.[0]?.url ?? null,
        stock: available,
        shopId: shop?.id ?? null,
        shopName: shop?.name ?? null,
        shopSlug: shop?.slug ?? null,
      },
      1
    );
    toast.success(`${p.name} added to your bag.`);
  };

  return (
    <AccountShell
      title="Wishlist"
      subtitle="Pieces you have saved. Nothing here is reserved — move it to your bag to hold it."
    >
      {loading ? (
        <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading…
        </p>
      ) : loadError ? (
        <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          {loadError}{" "}
          <button type="button" onClick={load} className="font-semibold text-[var(--gold-deep)] underline">
            Try again
          </button>
        </p>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cream-2)]">
            <Heart size={20} className="text-[var(--gold-deep)]" />
          </span>
          <h2 className="font-display text-[24px] text-[var(--ink)]">
            Your wishlist is empty
          </h2>
          <p className="max-w-[420px] font-body text-[12.5px] leading-[1.8] text-[var(--ink-muted)]">
            Tap the heart on any product to save it here — useful for watching a limited
            harvest before it returns.
          </p>
          <Link
            href="/products"
            className="mt-1 rounded-[2px] bg-[var(--ink)] px-5 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
          >
            Browse the shop
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {items.map((entry) => {
            const p = entry.product;
            const available = (p.inventory?.quantity ?? 0) - (p.inventory?.reserved ?? 0);

            return (
              <div
                key={entry.id}
                className="flex gap-4 border border-[var(--border)] bg-[var(--surface)] p-4"
              >
                <Link href={`/products/${p.id}`} className="shrink-0">
                  <ProductImage
                    src={p.images?.[0]?.url}
                    alt={p.name}
                    className="h-[96px] w-[96px] bg-[var(--cream-2)]"
                  />
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="font-body text-[9.5px] font-bold tracking-[1.4px] text-[var(--gold-deep)]">
                    {p.category?.name?.toUpperCase() ?? ""}
                  </span>
                  <Link
                    href={`/products/${p.id}`}
                    className="font-display text-[18px] leading-tight text-[var(--ink)] transition hover:text-[var(--gold-deep)]"
                  >
                    {p.name}
                  </Link>
                  <span className="font-body text-[11px] text-[var(--ink-muted)]">
                    {p.shortDescription}
                  </span>

                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    <span className="font-display text-[18px] font-semibold text-[var(--ink)]">
                      ${Number(p.price).toFixed(2)}
                    </span>
                    <span
                      className={`font-body text-[10.5px] ${
                        available > 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                      }`}
                    >
                      {available > 0 ? "In stock" : "Sold out"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => moveToBag(entry)}
                      disabled={available <= 0}
                      className="flex items-center gap-2 rounded-[2px] bg-[var(--ink)] px-3 py-2 font-body text-[11px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ShoppingBag size={12} /> Move to bag
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(p.id, p.name)}
                      className="flex items-center gap-1.5 font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--danger)]"
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AccountShell>
  );
}
