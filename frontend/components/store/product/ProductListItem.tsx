"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import ProductImage from "@/components/store/common/ProductImage";
import PriceTag from "@/components/store/common/PriceTag";
import type { Product } from "@/services/product.service";
import { useCart } from "@/context/CartContext";

export default function ProductListItem({ product }: { product: Product }) {
  const { addItem } = useCart();
  const primaryImage = product.images?.find((img) => img.isPrimary) ?? product.images?.[0];
  const available = (product.inventory?.quantity ?? 0) - (product.inventory?.reserved ?? 0);
  const shop = (product as { shop?: { id: string; name: string; slug: string } | null }).shop ?? null;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    if (available <= 0) {
      toast.error("This product is out of stock.");
      return;
    }
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        image: primaryImage?.url ?? null,
        stock: available,
        shopId: shop?.id ?? null,
        shopName: shop?.name ?? null,
        shopSlug: shop?.slug ?? null,
      },
      1
    );
    toast.success(`${product.name} added to cart`);
  };

  return (
    <Link
      href={`/products/${product.id}`}
      className="flex gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-4 transition hover:border-[var(--gold)] hover:shadow-md"
    >
      <div className="h-28 w-28 shrink-0 overflow-hidden rounded-[2px] bg-[var(--cream-2)]">
        <ProductImage src={primaryImage?.url} alt={product.name} className="h-full w-full" />
      </div>

      <div className="flex flex-1 flex-col justify-between">
        <div>
          {product.category && (
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--gold-deep)]">
              {product.category.name}
            </span>
          )}
          <h3 className="mt-0.5 text-base font-semibold text-[var(--ink)]">{product.name}</h3>
          {product.shortDescription && (
            <p className="mt-1 line-clamp-2 text-sm text-[var(--ink-muted)]">{product.shortDescription}</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <PriceTag price={product.price} compareAtPrice={product.compareAtPrice} />
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={available <= 0}
            className="flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[var(--ink)] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <ShoppingCart size={14} />
            {available <= 0 ? "Out of Stock" :"Add to Cart"}
          </button>
        </div>
      </div>
    </Link>
  );
}
