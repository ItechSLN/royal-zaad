'use client';

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import Breadcrumbs from "@/components/store/common/Breadcrumbs";
import ProductImage from "@/components/store/common/ProductImage";
import StarRating from "@/components/store/common/StarRating";
import QuantitySelector from "@/components/store/common/QuantitySelector";
import ProductCard from "@/components/store/product/ProductCard";
import ReviewForm from "@/components/store/product/ReviewForm";
import SectionHeading from "@/components/store/common/SectionHeading";
import { GoldBadge } from "@/components/ui/Badge";
import { getStoreProductById, getStoreProducts } from "@/services/store-products.service";
import { getProductReviews, ReviewsResponse } from "@/services/store-reviews.service";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/services/product.service";
import type { ShopSummary } from "@/services/store-marketplace.service";
import SellerCard from "@/components/store/marketplace/SellerCard";
import AlsoSoldBy from "@/components/store/marketplace/AlsoSoldBy";
import ReportLink from "@/components/store/marketplace/ReportDialog";

/** GET /products/:id now includes the selling shop (public fields only). */
type MarketplaceProduct = Product & { shop?: ShopSummary | null };

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.id as string;
  const { user } = useAuth();
  const { addItem } = useCart();

  const [product, setProduct] = useState<MarketplaceProduct | null>(null);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState("Description");
  const [showReviewForm, setShowReviewForm] = useState(false);

  const fetchReviews = (id: string) => {
    getProductReviews(id, 1, 10)
      .then(setReviews)
      .catch(() => setReviews(null));
  };

  useEffect(() => {
    if (!productId) return;

    setLoading(true);
    getStoreProductById(productId)
      .then((data) => {
        setProduct(data);
        setActiveImage(0);
        setQuantity(1);
        setTab("Description");
        // Related products are a nice-to-have; a failure here must not hide the product.
        getStoreProducts({ categoryId: data.categoryId, limit: 5 })
          .then((relatedRes) =>
            setRelated((relatedRes.data ?? []).filter((p) => p.id !== productId).slice(0, 4))
          )
          .catch(() => setRelated([]));
      })
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));

    fetchReviews(productId);
  }, [productId]);

  const available = useMemo(
    () => (product?.inventory?.quantity ?? 0) - (product?.inventory?.reserved ?? 0),
    [product]
  );

  if (loading) {
    return (
      <p className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        Loading…
      </p>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-6 py-24 text-center">
        <h1 className="font-display text-[32px] text-[var(--ink)]">Product not found</h1>
        <Link
          href="/products"
          className="mt-6 rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)]"
        >
          Back to shop
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [];
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const onSale = compare !== null && compare > Number(product.price);
  const savePct = onSale ? Math.round(((compare! - Number(product.price)) / compare!) * 100) : 0;
  const reviewList = reviews?.data ?? [];
  const reviewCount = reviews?.meta?.total ?? reviewList.length;
  const avgRating = reviews?.averageRating ?? 0;
  const specs: [string, string][] = [
    ["SKU", product.sku],
    ...(product.category ? [["Category", product.category.name] as [string, string]] : []),
    ...(product.barcode ? [["Barcode", product.barcode] as [string, string]] : []),
    ["Availability", available > 0 ? "In stock" : "Out of stock"],
  ];

  const handleAdd = () => {
    if (available <= 0) {
      toast.error("This product is out of stock.");
      return;
    }
    addItem(
      {
        productId: product.id,
        name: product.name,
        price: Number(product.price),
        image: images[0]?.url ?? null,
        stock: available,
        shopId: product.shop?.id ?? null,
        shopName: product.shop?.name ?? null,
        shopSlug: product.shop?.slug ?? null,
      },
      quantity
    );
    toast.success(`${product.name} added to your bag`);
  };

  return (
    <div className="flex flex-col">
      <div className="mx-auto w-full max-w-[1440px] px-6 pt-8 lg:px-12">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/products" },
            ...(product.category ? [{ label: product.category.name, href: `/products?categoryId=${product.category.id}` }] : []),
            { label: product.name },
          ]}
        />
      </div>

      {/* Main */}
      <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-6 py-10 lg:grid-cols-2 lg:px-12">
        {/* Gallery */}
        <div className="flex flex-col gap-4">
          <div className="relative aspect-square w-full overflow-hidden bg-[var(--cream-2)]">
            <ProductImage
              src={images[activeImage]?.url}
              alt={product.name}
              className="h-full w-full"
            />
            {onSale && (
              <span className="absolute left-4 top-4">
                <GoldBadge className="bg-[#0A0A0BE6]">ON SALE</GoldBadge>
              </span>
            )}
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {images.slice(0, 5).map((img, i) => (
                <button
                  key={img.id ?? i}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`aspect-square overflow-hidden border transition ${
                    i === activeImage ? "border-[var(--gold)]" : "border-[var(--border)]"
                  }`}
                >
                  <ProductImage src={img.url} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <p className="font-body text-[9px] font-semibold tracking-[2.4px] text-[var(--gold-deep)]">
              {(product.category?.name ?? "MAISON").toUpperCase()}
            </p>
            <p className="font-mono text-[10px] text-[var(--ink-muted)]">SKU {product.sku}</p>
          </div>

          <h1 className="font-display text-[46px] leading-tight text-[var(--ink)]">
            {product.name}
          </h1>

          <div className="flex items-center gap-3">
            {reviewCount > 0 ? (
              <>
                <StarRating rating={avgRating} showCount={false} />
                <span className="font-body text-[12px] font-semibold text-[var(--ink)]">
                  {avgRating.toFixed(1)}
                </span>
                <span className="font-body text-[11.5px] text-[var(--ink-muted)]">
                  {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                </span>
              </>
            ) : (
              <span className="font-body text-[11.5px] text-[var(--ink-muted)]">No reviews yet</span>
            )}
          </div>

          <div className="flex items-end gap-3">
            <span className="font-display text-[34px] font-semibold text-[var(--ink)]">
              ${Number(product.price).toFixed(2)}
            </span>
            {onSale && (
              <>
                <span className="pb-1 font-body text-[16px] text-[var(--ink-muted)] line-through">
                  ${compare!.toFixed(2)}
                </span>
                <span className="mb-1.5 rounded-[2px] bg-[var(--danger-bg)] px-2 py-1 font-body text-[10px] font-bold text-[var(--danger)]">
                  SAVE {savePct}%
                </span>
              </>
            )}
          </div>

          <p className="font-body text-[11px] text-[var(--ink-muted)]">
            Shipping & tax calculated at checkout
          </p>

          {product.shortDescription && (
            <p className="font-body text-[13px] leading-[1.9] text-[var(--ink-muted)]">
              {product.shortDescription}
            </p>
          )}

          <p className="font-body text-[11.5px] text-[var(--success)]">
            {available > 0 ? `In stock — ${available} available` : "Currently out of stock"}
          </p>

          <div className="flex flex-wrap items-center gap-4">
            <QuantitySelector quantity={quantity} max={Math.max(1, available)} onChange={setQuantity} />
            <button
              type="button"
              onClick={handleAdd}
              disabled={available <= 0}
              className="flex-1 rounded-[2px] bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] px-8 py-[15px] font-body text-[12px] font-bold tracking-[1.8px] text-[var(--noir)] transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              ADD TO CART
            </button>
          </div>

          {product.shop && <SellerCard shop={product.shop} />}

          <ReportLink
            target={{ type: "PRODUCT", productId: product.id, name: product.name }}
            className="self-start"
          />
        </div>
      </div>

      <AlsoSoldBy product={{ id: product.id, name: product.name, barcode: product.barcode }} />

      {/* Tabs */}
      <div className="border-y border-[var(--border)] bg-[var(--cream)]">
        <div className="mx-auto flex max-w-[1440px] flex-wrap gap-2 px-6 lg:px-12">
          {["Description", "Reviews"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-4 py-4 font-body text-[12px] font-semibold transition ${
                tab === t
                  ? "border-b-2 border-[var(--gold)] text-[var(--ink)]"
                  : "border-b-2 border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
              }`}
            >
              {t === "Reviews" ? `Reviews (${reviewCount})` : t}
            </button>
          ))}
        </div>
      </div>

      {/* Panel */}
      <div className="mx-auto grid w-full max-w-[1440px] gap-12 px-6 py-12 lg:grid-cols-2 lg:px-12">
        {tab === "Reviews" ? (
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-[26px] text-[var(--ink)]">Client Reviews</h2>
              {user && (
                <button
                  type="button"
                  onClick={() => setShowReviewForm((v) => !v)}
                  className="rounded-[2px] border border-[var(--border-strong)] px-4 py-2 font-body text-[11.5px] font-semibold text-[var(--ink)]"
                >
                  {showReviewForm ? "Cancel" : "Write a review"}
                </button>
              )}
            </div>

            {showReviewForm && (
              <div className="mb-8">
                <ReviewForm
                  productId={product.id}
                  onSuccess={() => {
                    setShowReviewForm(false);
                    fetchReviews(product.id);
                  }}
                />
              </div>
            )}

            {reviewList.length === 0 ? (
              <p className="py-10 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
                No reviews yet.
              </p>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {reviewList.map((r) => (
                  <figure
                    key={r.id}
                    className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--surface)] p-6"
                  >
                    <StarRating rating={r.rating} showCount={false} size={13} />
                    {r.title && (
                      <p className="font-body text-[12.5px] font-semibold text-[var(--ink)]">{r.title}</p>
                    )}
                    <blockquote className="font-body text-[13px] leading-[1.8] text-[var(--ink-muted)]">
                      {r.content}
                    </blockquote>
                    <figcaption className="font-body text-[12px] font-semibold text-[var(--ink)]">
                      {r.customer.firstName} {r.customer.lastName.charAt(0)}.
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              <h2 className="font-display text-[26px] text-[var(--ink)]">{tab}</h2>
              <p className="font-body text-[13px] leading-[1.9] text-[var(--ink-muted)]">
                {product.description || product.shortDescription || "No description available."}
              </p>
            </div>

            <div className="flex flex-col gap-8">
              <div className="flex flex-col">
                {specs.map(([k, v]) => (
                  <div
                    key={k}
                    className="flex items-center justify-between border-b border-[var(--border)] py-3"
                  >
                    <span className="font-body text-[11.5px] text-[var(--ink-muted)]">{k}</span>
                    <span className="font-body text-[12px] font-semibold text-[var(--ink)]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="flex flex-col gap-[34px] bg-[var(--cream-2)] px-6 py-20 lg:px-12">
          <div className="flex justify-center">
            <SectionHeading eyebrow="Pairs beautifully" title="You May Also Like" />
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
