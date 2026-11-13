'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { Leaf, ShieldCheck, Star, Truck, Zap } from "lucide-react";
import ProductCard from "@/components/store/product/ProductCard";
import CategoryCard from "@/components/store/common/CategoryCard";
import SectionHeading from "@/components/store/common/SectionHeading";
import Newsletter from "@/components/store/common/Newsletter";
import Testimonials from "@/components/store/common/Testimonials";
import ShopsNearYou from "@/components/store/marketplace/ShopsNearYou";
import Button from "@/components/ui/Button";
import { GoldBadge } from "@/components/ui/Badge";
import { getStoreProducts, getBestSellingProducts } from "@/services/store-products.service";
import { getStoreCategories, Category } from "@/services/category.service";
import { getPromotions, Promotion } from "@/services/promotion.service";
import { getProductReviews } from "@/services/store-reviews.service";
import type { Product } from "@/services/product.service";
import { HERO_IMAGE, INGREDIENT_PILLARS, SOCIAL_TILES } from "@/lib/showcase";

const TRUST = [
  { icon: Truck, label: "Tracked delivery on every order" },
  { icon: ShieldCheck, label: "Authenticity guaranteed" },
  { icon: Leaf, label: "100% natural · no additives" },
];

/** Time left on a promotion, split for the countdown tiles. */
const timeLeft = (endsAt: string, now: number) => {
  const ms = Math.max(0, new Date(endsAt).getTime() - now);
  const pad = (n: number) => String(n).padStart(2, "0");
  return [
    [pad(Math.floor(ms / 3_600_000)), "HRS"],
    [pad(Math.floor(ms / 60_000) % 60), "MIN"],
    [pad(Math.floor(ms / 1000) % 60), "SEC"],
  ];
};

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bestSellers, setBestSellers] = useState<Product[]>([]);
  const [newArrivals, setNewArrivals] = useState<Product[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [spotlight, setSpotlight] = useState<Product | null>(null);
  const [spotlightRating, setSpotlightRating] = useState<{ avg: number; total: number } | null>(
    null
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // Each rail loads independently so one failing call doesn't blank the page.
    getStoreCategories(6, "top")
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]));

    getStoreProducts({ sort: "newest", limit: 4 })
      .then((res) => setNewArrivals(res.data ?? []))
      .catch(() => setNewArrivals([]));

    Promise.all([getBestSellingProducts(4), getStoreProducts({ limit: 20 })])
      .then(([bestRes, allRes]) => {
        // Best sellers rank on units sold. Early in a catalogue's life there is
        // barely any sales history, so the rail is topped up with featured
        // products rather than rendering a near-empty row.
        const ranked = [...(bestRes ?? [])];
        const all = allRes.data ?? [];
        if (ranked.length < 4) {
          const filler = all.filter((p) => p.isFeatured && !ranked.some((b) => b.id === p.id));
          ranked.push(...filler.slice(0, 4 - ranked.length));
        }
        setBestSellers(ranked);
        setSpotlight(all.find((p) => p.isFeatured) ?? ranked[0] ?? null);
      })
      .catch(() => {
        setBestSellers([]);
        setSpotlight(null);
      });

    getPromotions(1, 10)
      .then((res) => {
        const current = Date.now();
        setPromotions(
          (res.data ?? []).filter(
            (promo) =>
              promo.isActive &&
              new Date(promo.startsAt).getTime() <= current &&
              new Date(promo.endsAt).getTime() >= current
          )
        );
      })
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    if (!spotlight) return;
    getProductReviews(spotlight.id, 1, 1)
      .then((res) => setSpotlightRating({ avg: res.averageRating ?? 0, total: res.meta?.total ?? 0 }))
      .catch(() => setSpotlightRating(null));
  }, [spotlight]);

  const activePromotion = promotions[0] ?? null;

  useEffect(() => {
    if (!activePromotion) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [activePromotion]);

  const promoLabel = (promo: Promotion) =>
    promo.discountType === "PERCENTAGE"
      ? `${Number(promo.discountValue)}% OFF`
      : `$${Number(promo.discountValue)} OFF`;
  const promoHref = (promo: Promotion) =>
    promo.products?.length === 1 ? `/products/${promo.products[0].id}` : "/products";

  const spotlightImage =
    spotlight?.images?.find((i) => i.isPrimary)?.url ?? spotlight?.images?.[0]?.url ?? null;
  const spotlightCompare = spotlight?.compareAtPrice ? Number(spotlight.compareAtPrice) : null;
  const spotlightOnSale =
    spotlight !== null && spotlightCompare !== null && spotlightCompare > Number(spotlight.price);

  return (
    <div className="flex flex-col">
      {/* Hero */}
      <section className="relative flex min-h-[760px] flex-col justify-between overflow-hidden bg-[var(--noir)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--noir)]/95 via-[var(--noir)]/70 to-[var(--noir)]/20" />

        <div className="relative flex flex-col gap-6 px-6 pt-[130px] lg:px-[72px]">
          <p className="font-body text-[11px] font-semibold tracking-[3.2px] text-[var(--gold)]">
            {activePromotion ? activePromotion.name.toUpperCase() : "THE WINTER HARVEST · 2026"}
          </p>

          <h1 className="max-w-[720px] whitespace-pre-line font-display text-[52px] font-light leading-[1.05] text-[var(--cream)] sm:text-[82px]">
            {"Golden by Nature,\nRoyal by Craft."}
          </h1>

          <p className="max-w-[520px] font-body text-[15px] leading-[1.8] text-[var(--text-on-dark)]">
            Sidr honey rested in cedar, Khawlani beans roasted to order, and hand-loomed
            linen — a zaad built on rare harvests and slow craft.
          </p>

          <div className="flex flex-wrap gap-4 pt-[14px]">
            <Button href="/products" variant="primary">
              SHOP THE COLLECTION
            </Button>
            <Link
              href="/categories"
              className="inline-flex items-center justify-center rounded-[2px] border border-[var(--cream)]/40 px-[34px] py-[15px] font-body text-[12px] font-semibold tracking-[1.8px] text-[var(--cream)] transition hover:bg-[var(--cream)]/10"
            >
              DISCOVER THE ZAAD
            </Link>
          </div>
        </div>

        <div className="relative mt-16 flex flex-col gap-4 border-t border-[var(--hairline)] bg-[var(--noir)]/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between lg:px-[72px]">
          {TRUST.map((t) => (
            <div key={t.label} className="flex items-center gap-[9px]">
              <t.icon size={15} className="text-[var(--gold)]" />
              <span className="font-body text-[11.5px] text-[var(--text-on-dark)]">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Shops near the chosen location — only once the customer has set one */}
      <ShopsNearYou />

      {/* Featured categories */}
      <section className="flex flex-col gap-[34px] bg-[var(--cream)] px-6 pb-[72px] pt-20 lg:px-12">
        <div className="flex justify-center">
          <SectionHeading eyebrow="Explore the zaad" title="Every House, One Standard" />
        </div>
        {categories.length === 0 ? (
          <p className="py-10 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
            No categories to show yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                image={category.imageUrl ?? null}
                count={category._count?.products}
              />
            ))}
          </div>
        )}
      </section>

      {/* Promotion band — only while a real promotion is running */}
      {activePromotion && (
        <section className="flex flex-col items-center justify-between gap-8 bg-[var(--ink)] px-6 py-9 lg:flex-row lg:px-[72px]">
          <div className="flex items-center gap-[18px]">
            <Zap size={26} className="shrink-0 text-[var(--gold)]" />
            <div className="flex flex-col gap-[5px]">
              <p className="font-display text-[30px] font-medium text-[var(--cream)]">
                {activePromotion.name}
              </p>
              <p className="font-body text-[12.5px] text-[var(--text-muted-dark)]">
                {`${
                  activePromotion.discountType === "PERCENTAGE"
                    ? `Up to ${Number(activePromotion.discountValue)}% off`
                    : `$${Number(activePromotion.discountValue)} off`
                } selected pieces · while stock lasts`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-[10px]">
            {timeLeft(activePromotion.endsAt, now).map(([v, l]) => (
              <div
                key={l}
                className="flex w-[70px] flex-col items-center gap-[2px] rounded-[2px] border border-[var(--gold)] py-[10px]"
              >
                <span className="font-mono text-[24px] font-semibold text-[var(--gold)]">{v}</span>
                <span className="font-body text-[8px] tracking-[1.6px] text-[var(--text-muted-dark)]">
                  {l}
                </span>
              </div>
            ))}
          </div>

          <Button href={promoHref(activePromotion)} variant="primary">
            SHOP THE OFFER
          </Button>
        </section>
      )}

      {/* Best sellers */}
      {bestSellers.length > 0 && (
        <section className="flex flex-col gap-[34px] bg-[var(--cream)] px-6 py-20 lg:px-12">
          <div className="flex justify-center">
            <SectionHeading eyebrow="Most coveted" title="The Best Sellers" />
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Offers band — driven by the promotions currently running */}
      {promotions.length > 0 && (
        <section className="flex flex-col gap-[34px] bg-[var(--cream-2)] px-6 py-20 lg:px-12">
          <div className="flex flex-col items-center gap-5">
            <SectionHeading eyebrow="Limited time" title="Current Offers" />
            <Button href="/products" variant="ghost">
              ALL PRODUCTS
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {promotions.slice(0, 3).map((promo) => (
              <Link
                key={promo.id}
                href={promoHref(promo)}
                className="group relative flex h-[300px] flex-col justify-end overflow-hidden border border-[var(--border-strong)] bg-[var(--ink)] p-6"
              >
                <div className="relative flex flex-col gap-3">
                  <GoldBadge className="w-fit bg-[#0A0A0BE6]">{promoLabel(promo)}</GoldBadge>
                  <p className="font-display text-[28px] text-[var(--cream)]">{promo.name}</p>
                  <p className="font-body text-[12px] leading-[1.7] text-[var(--text-muted-dark)]">
                    {promo.description ||
                      `Ends ${new Date(promo.endsAt).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}`}
                  </p>
                  <span className="font-body text-[11px] font-bold tracking-[1.8px] text-[var(--gold)]">
                    SHOP NOW
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* New arrivals */}
      {newArrivals.length > 0 && (
        <section className="flex flex-col gap-[34px] bg-[var(--cream)] px-6 py-20 lg:px-12">
          <div className="flex justify-center">
            <SectionHeading eyebrow="Just landed" title="New Arrivals" />
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-[34px] bg-[var(--noir)] px-6 py-20 lg:px-12">
        <div className="flex justify-center">
          <SectionHeading
            eyebrow="Natural · traceable · uncompromising"
            title="Nothing Added. Nothing Hidden."
            onDark
          />
        </div>
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {INGREDIENT_PILLARS.map((item) => (
            <div key={item.title} className="flex flex-col gap-3">
              <span className="font-display text-[24px] text-[var(--cream)]">{item.title}</span>
              <span className="font-body text-[11.5px] leading-[1.8] text-[var(--text-muted-dark)]">
                {item.note}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Featured spotlight — a real featured product */}
      {spotlight && (
        <section className="grid grid-cols-1 items-center gap-12 bg-[var(--cream-2)] px-6 py-20 lg:grid-cols-2 lg:px-12">
          <div className="flex flex-col gap-5">
            <SectionHeading eyebrow="Product of the season" title={spotlight.name} align="left" />

            {spotlightRating && spotlightRating.total > 0 && (
              <div className="flex items-center gap-2">
                <Star size={14} className="fill-[var(--amber)] text-[var(--amber)]" />
                <span className="font-body text-[11.5px] text-[var(--ink-muted)]">
                  {spotlightRating.avg.toFixed(1)}&nbsp;&nbsp;·&nbsp;&nbsp;{spotlightRating.total}{" "}
                  {spotlightRating.total === 1 ? "review" : "reviews"}
                </span>
              </div>
            )}

            {(spotlight.description || spotlight.shortDescription) && (
              <p className="font-body text-[13.5px] leading-[1.9] text-[var(--ink-muted)]">
                {spotlight.description || spotlight.shortDescription}
              </p>
            )}

            <div className="grid grid-cols-2 gap-5 border-y border-[var(--border-strong)] py-5 sm:grid-cols-4">
              {[
                { label: "SKU", value: spotlight.sku },
                ...(spotlight.category ? [{ label: "CATEGORY", value: spotlight.category.name }] : []),
              ].map((s) => (
                <div key={s.label} className="flex flex-col gap-1">
                  <span className="font-body text-[9px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
                    {s.label}
                  </span>
                  <span className="font-body text-[12.5px] font-semibold text-[var(--ink)]">
                    {s.value}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="font-body text-[22px] font-semibold text-[var(--ink)]">
                ${Number(spotlight.price).toFixed(2)}
              </span>
              {spotlightOnSale && (
                <span className="font-body text-[15px] text-[var(--ink-muted)] line-through">
                  ${spotlightCompare!.toFixed(2)}
                </span>
              )}
            </div>

            <Button href={`/products/${spotlight.id}`} variant="primary" className="w-fit">
              VIEW PRODUCT
            </Button>
          </div>

          {spotlightImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spotlightImage}
              alt={spotlight.name}
              className="h-[520px] w-full border border-[var(--border-strong)] object-cover"
            />
          ) : (
            <div className="h-[520px] w-full border border-[var(--border-strong)] bg-[var(--cream)]" />
          )}
        </section>
      )}

      {/* Reviews */}
      <div className="bg-[var(--cream)] px-6 py-20 lg:px-12">
        <Testimonials />
      </div>

      {/* Social */}
      <section className="flex flex-col gap-[34px] bg-[var(--cream-2)] px-6 py-20 lg:px-12">
        <div className="flex justify-center">
          <SectionHeading eyebrow="@royalzaad" title="From the Zaad Journal" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {SOCIAL_TILES.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              src={src}
              alt=""
              className="aspect-square w-full border border-[var(--border-strong)] object-cover transition hover:opacity-90"
            />
          ))}
        </div>
      </section>

      <Newsletter />
    </div>
  );
}
