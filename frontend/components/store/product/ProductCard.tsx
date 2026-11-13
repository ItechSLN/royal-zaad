"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Star } from "lucide-react";
import { toast } from "sonner";
import ProductImage from "@/components/store/common/ProductImage";
import SellerLine, { DeliveryTag } from "@/components/store/marketplace/SellerLine";
import type { Product } from "@/services/product.service";
import type { SearchProduct, ShopSummary } from "@/services/store-marketplace.service";
import { useAuth } from "@/context/AuthContext";
import { addToWishlist } from "@/services/account.service";

/**
 * A catalogue product (GET /products) or a marketplace search result
 * (GET /search/products). Search results carry the seller, distance and
 * delivery eligibility computed by the server; catalogue rows may carry the shop.
 */
export type CardProduct =
  | (Product & { shop?: ShopSummary | null })
  | SearchProduct;

const isSearchResult = (p: CardProduct): p is SearchProduct => "available" in p && "relevance" in p;

export default function ProductCard({ product }: { product: CardProduct }) {
  const { user } = useAuth();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const search = isSearchResult(product) ? product : null;
  const images = product.images as { url: string; isPrimary?: boolean }[] | undefined;
  const primaryImage = images?.find((img) => img.isPrimary) ?? images?.[0];
  const available = search
    ? search.available
    : ((product as Product).inventory?.quantity ?? 0) - ((product as Product).inventory?.reserved ?? 0);
  const price = Number(product.price);
  const compare = product.compareAtPrice != null ? Number(product.compareAtPrice) : null;
  const onSale = compare !== null && compare > price;
  const shop = product.shop ?? null;

  const handleSaveToWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Saving is per-customer, so it needs a session.
    if (!user) {
      toast.info("Sign in to save pieces to your wishlist.");
      router.push(`/auth/login?redirect=${encodeURIComponent("/account/wishlist")}`);
      return;
    }

    setSaving(true);
    try {
      await addToWishlist(product.id);
      setSaved(true);
      toast.success(`${product.name} saved to your wishlist.`);
    } catch (error) {
      const api = error as { message?: string };
      toast.error(api?.message ?? "Unable to save that piece.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="group flex w-full flex-col">
      <Link href={`/products/${product.id}`} className="flex w-full flex-col">
        {/* Media */}
        <div className="relative flex h-[360px] w-full items-start justify-between overflow-hidden bg-[var(--cream-2)] p-[14px]">
          <ProductImage
            src={primaryImage?.url}
            alt={product.name}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />

          <span className="relative z-10 inline-flex rounded-[2px] border border-[var(--gold)] bg-[#0A0A0BE6] px-[12px] py-[6px]">
            <span className="font-body text-[10px] font-bold tracking-[1.6px] text-[var(--gold)]">
              {available <= 0 ? "SOLD OUT" : onSale ? "SPECIAL" : search ? "IN STOCK" : "BEST SELLER"}
            </span>
          </span>

          <button
            type="button"
            onClick={handleSaveToWishlist}
            disabled={saving}
            aria-label={saved ? `${product.name} saved to wishlist` : "Save to wishlist"}
            aria-pressed={saved}
            className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[#FFFFFFE6] transition hover:bg-[var(--gold)] disabled:opacity-60"
          >
            <Heart
              size={14}
              className={saved ? "fill-[var(--gold-deep)] text-[var(--gold-deep)]" : "text-[var(--ink)]"}
            />
          </button>
        </div>

        {/* Info */}
        <div className="flex flex-col gap-[6px] pt-4">
          {product.category && (
            <p className="font-body text-[9px] font-semibold tracking-[1.8px] text-[var(--gold-deep)]">
              {product.category.name.toUpperCase()}
            </p>
          )}

          <h3 className="font-display text-[21px] font-medium leading-tight text-[var(--ink)]">
            {product.name}
          </h3>

          {product.shortDescription && (
            <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
              {product.shortDescription}
            </p>
          )}

          <div className="flex items-center justify-between pt-[6px]">
            <div className="flex items-center gap-[9px]">
              <span className="font-body text-[15px] font-semibold text-[var(--ink)]">
                ${price.toFixed(2)}
              </span>
              {onSale && (
                <span className="font-body text-[12.5px] text-[var(--ink-muted)] line-through">
                  ${compare!.toFixed(2)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Star size={12} className="fill-[var(--amber)] text-[var(--amber)]" />
              <span className="font-body text-[11px] text-[var(--ink-muted)]">
                {search && search.rating != null && search.reviewCount > 0
                  ? `${search.rating.toFixed(1)} (${search.reviewCount})`
                  : available > 0
                    ? "In stock"
                    : "Sold out"}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* Seller — outside the product link so the shop link isn't nested in it. */}
      {shop && (
        <div className="flex flex-col gap-1 pt-2">
          <SellerLine shop={shop} distanceKm={search?.distanceKm ?? null} />
          <DeliveryTag
            deliversToYou={search ? search.deliversToYou : null}
            offersDelivery={shop.offersDelivery}
            offersPickup={shop.offersPickup}
          />
        </div>
      )}
    </div>
  );
}
