'use client';

import { Suspense, useEffect, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  FilterChips,
  RefineRail,
  SearchResults,
  SortRadiusBar,
  useProductSearch,
  useSearchFilters,
} from "@/components/store/marketplace/ProductSearch";
import { getStoreCategories, Category } from "@/services/category.service";
import { HERO_IMAGE } from "@/lib/showcase";

function ProductsPageContent() {
  const { filters, update } = useSearchFilters("/products");
  const search = useProductSearch(filters);

  const [categories, setCategories] = useState<Category[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [priceDraft, setPriceDraft] = useState({ min: filters.minPrice, max: filters.maxPrice });

  useEffect(() => {
    // Only the top-level houses belong in the refine panel — listing all 36
    // sub-categories made it unusable.
    getStoreCategories(100, "top")
      .then((res) => setCategories(res.data))
      .catch(() => setCategories([]));
  }, []);

  const shownTotal = search.loading || search.error ? null : search.data?.meta.total ?? 0;
  const activeCategory = categories.find((c) => c.id === filters.categoryId);
  const heroImage = activeCategory?.imageUrl || HERO_IMAGE;
  const query = filters.q;

  return (
    <div className="flex flex-col">
      {/* Category hero */}
      <section className="relative flex min-h-[300px] flex-col justify-end overflow-hidden bg-[var(--noir)] px-6 py-12 lg:px-12">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--noir)]/95 via-[var(--noir)]/70 to-[var(--noir)]/30" />

        <div className="relative flex flex-col gap-3">
          <p className="font-body text-[11px] text-[var(--champagne)]">
            Home&nbsp;&nbsp;›&nbsp;&nbsp;Shop
            {activeCategory ? `  ›  ${activeCategory.name}` : ""}
          </p>
          <h1 className="font-display text-[46px] leading-tight text-[var(--cream)]">
            {query
              ? `Results for “${query}”`
              : activeCategory
                ? `The ${activeCategory.name} House`
                : "The Full Collection"}
          </h1>
          <p className="max-w-[620px] font-body text-[13px] leading-[1.8] text-[var(--text-muted-dark)]">
            Single-origin harvests and hand-finished pieces — every batch traceable to its
            valley, its farm and its harvest week.
          </p>
        </div>
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-[var(--border)] bg-[var(--cream)] px-6 py-4 lg:flex-row lg:items-center lg:justify-between lg:px-12">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-body text-[12px] font-semibold text-[var(--ink)]">
            {shownTotal === null ? "…" : `${shownTotal} ${shownTotal === 1 ? "product" : "products"}`}
          </span>
          {search.location && (
            <span className="font-body text-[11px] text-[var(--ink-muted)]">near {search.location.label}</span>
          )}
          <FilterChips
            filters={filters}
            update={update}
            categoryName={activeCategory?.name}
            onClear={() => {
              setPriceDraft({ min: "", max: "" });
              update({
                categoryId: undefined,
                minPrice: undefined,
                maxPrice: undefined,
                minRating: undefined,
                fulfillment: undefined,
                radiusKm: undefined,
                oos: undefined,
              });
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-2 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-[9px] font-body text-[11.5px] text-[var(--ink)] lg:hidden"
          >
            {filtersOpen ? <X size={13} /> : <SlidersHorizontal size={13} />} Refine
          </button>
          <SortRadiusBar filters={filters} update={update} />
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col gap-10 bg-[var(--cream)] px-6 py-10 lg:flex-row lg:px-12">
        {/* Refine rail */}
        {/*
          Sticks below the sticky header once scrolled to. `self-start` is
          required — a flex row stretches its children by default, which would
          leave the rail no room to travel. It scrolls internally when the
          filters are taller than the viewport.
        */}
        <aside
          className={`${
            filtersOpen ? "block" : "hidden"
          } w-full shrink-0 lg:block lg:w-[260px] lg:self-start lg:sticky lg:top-[calc(var(--header-height)_+_24px)] lg:max-h-[calc(100vh_-_var(--header-height)_-_48px)] lg:overflow-y-auto lg:pr-1`}
        >
          <RefineRail
            filters={filters}
            update={update}
            categories={categories}
            priceDraft={priceDraft}
            setPriceDraft={setPriceDraft}
          />
        </aside>

        {/* Grid */}
        <div className="flex min-w-0 flex-1 flex-col gap-10">
          <SearchResults
            search={search}
            filters={filters}
            update={update}
            emptyText={filters.q ? `No products found for “${filters.q}”.` : "No products match these filters."}
          />
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <p className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading…
        </p>
      }
    >
      <ProductsPageContent />
    </Suspense>
  );
}
