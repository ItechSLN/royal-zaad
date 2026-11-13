"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, MapPin, Minus } from "lucide-react";
import Pagination from "@/components/store/common/Pagination";
import ProductCard from "@/components/store/product/ProductCard";
import { useKeyedRequest } from "@/components/store/marketplace/useKeyedRequest";
import { useCustomerLocation } from "@/context/LocationContext";
import {
  searchProducts,
  type FulfillmentFilter,
  type SearchProductsParams,
  type SearchSort,
} from "@/services/store-marketplace.service";
import type { Category } from "@/services/category.service";

/* -------------------------------------------------------------------------- */
/* Filters live in the URL (shareable); the location never does.              */
/* -------------------------------------------------------------------------- */

export const SORT_OPTIONS: { value: SearchSort; label: string; needsLocation?: boolean }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "nearest", label: "Nearest", needsLocation: true },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

export const RADIUS_OPTIONS = [5, 10, 25, 50, 100];
const RATING_OPTIONS = [4, 3, 2];

export type SearchFilters = {
  q: string;
  categoryId: string;
  sort: SearchSort;
  minPrice: string;
  maxPrice: string;
  minRating: string;
  fulfillment: FulfillmentFilter | "";
  radiusKm: string;
  includeOutOfStock: boolean;
  page: number;
};

const SORTS = new Set<string>(SORT_OPTIONS.map((o) => o.value));
const positive = (v: string | null) => (v && Number(v) > 0 ? String(Number(v)) : "");

export function useSearchFilters(basePath: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters: SearchFilters = useMemo(() => {
    const sort = searchParams.get("sort") ?? "";
    const fulfillment = searchParams.get("fulfillment") ?? "";
    return {
      // `search` is the pre-marketplace name used by older links.
      q: (searchParams.get("q") ?? searchParams.get("search") ?? "").trim(),
      categoryId: searchParams.get("categoryId") ?? "",
      sort: (SORTS.has(sort) ? sort : "relevance") as SearchSort,
      minPrice: positive(searchParams.get("minPrice")),
      maxPrice: positive(searchParams.get("maxPrice")),
      minRating: positive(searchParams.get("minRating")),
      fulfillment: fulfillment === "delivery" || fulfillment === "pickup" ? fulfillment : "",
      radiusKm: positive(searchParams.get("radiusKm")),
      includeOutOfStock: searchParams.get("oos") === "1",
      page: Math.max(1, Math.floor(Number(searchParams.get("page") ?? "1")) || 1),
    };
  }, [searchParams]);

  const update = (updates: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    if ("q" in updates) params.delete("search");
    Object.entries(updates).forEach(([key, value]) => {
      if (value) params.set(key, value);
      else params.delete(key);
    });
    if (!("page" in updates)) params.delete("page");
    const qs = params.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  };

  return { filters, update };
}

/** Runs GET /search/products for the current filters and chosen location. */
export function useProductSearch(
  filters: SearchFilters,
  opts: { limit?: number; enabled?: boolean; shopId?: string } = {}
) {
  const { location, ready } = useCustomerLocation();
  const params: SearchProductsParams = {
    q: filters.q || undefined,
    categoryId: filters.categoryId || undefined,
    shopId: opts.shopId,
    sort: filters.sort,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    minRating: filters.minRating ? Number(filters.minRating) : undefined,
    fulfillment: filters.fulfillment || undefined,
    includeOutOfStock: filters.includeOutOfStock,
    page: filters.page,
    limit: opts.limit ?? 12,
    ...(location
      ? { lat: location.lat, lng: location.lng, radiusKm: filters.radiusKm ? Number(filters.radiusKm) : undefined }
      : {}),
  };
  // Wait until the saved location is known so the first request already uses it.
  const key = opts.enabled === false || !ready ? null : JSON.stringify(params);
  const result = useKeyedRequest(key, () => searchProducts(params));
  return {
    ...result,
    loading: result.loading || (opts.enabled !== false && !ready),
    hasLocation: !!location,
    location,
  };
}

/* -------------------------------------------------------------------------- */

export function SortRadiusBar({
  filters,
  update,
}: {
  filters: SearchFilters;
  update: (u: Record<string, string | undefined>) => void;
}) {
  const { location } = useCustomerLocation();
  const effectiveSort = !location && filters.sort === "nearest" ? "relevance" : filters.sort;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label
        className={`flex items-center gap-[10px] rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-[9px] ${
          location ? "" : "opacity-60"
        }`}
        title={location ? undefined : "Set your location in the header to filter by distance"}
      >
        <MapPin size={13} className="text-[var(--ink-muted)]" />
        <span className="font-body text-[11.5px] text-[var(--ink-muted)]">Within:</span>
        <select
          aria-label="Distance"
          value={location ? filters.radiusKm : ""}
          disabled={!location}
          onChange={(e) => update({ radiusKm: e.target.value || undefined })}
          className="bg-transparent font-body text-[11.5px] font-semibold text-[var(--ink)] outline-none disabled:cursor-not-allowed"
        >
          <option value="">Any distance</option>
          {RADIUS_OPTIONS.map((r) => (
            <option key={r} value={String(r)}>
              {r} km
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-[10px] rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-[9px]">
        <span className="font-body text-[11.5px] text-[var(--ink-muted)]">Sort by:</span>
        <select
          aria-label="Sort by"
          value={effectiveSort}
          onChange={(e) => update({ sort: e.target.value === "relevance" ? undefined : e.target.value })}
          className="bg-transparent font-body text-[11.5px] font-semibold text-[var(--ink)] outline-none"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} disabled={option.needsLocation && !location}>
              {option.label}
              {option.needsLocation && !location ? " (set a location)" : ""}
            </option>
          ))}
        </select>
        <ChevronDown size={13} className="text-[var(--ink-muted)]" />
      </label>
    </div>
  );
}

function GroupHeading({ title }: { title: string }) {
  return (
    <div className="flex w-full items-center justify-between">
      <span className="font-body text-[11px] font-bold tracking-[1.4px] text-[var(--ink)]">{title}</span>
      <Minus size={13} className="text-[var(--ink-muted)]" />
    </div>
  );
}

function FilterOption({
  label,
  checked,
  onToggle,
  radio = false,
}: {
  label: string;
  checked: boolean;
  onToggle?: () => void;
  radio?: boolean;
}) {
  return (
    <button
      type="button"
      role={radio ? "radio" : "checkbox"}
      aria-checked={checked}
      onClick={onToggle}
      className="flex w-full items-center gap-[10px] text-left"
    >
      <span
        className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center border ${radio ? "rounded-full" : "rounded-[1px]"} ${
          checked ? "border-[var(--gold)] bg-[var(--gold)]" : "border-[var(--border-strong)] bg-[var(--surface)]"
        }`}
      >
        {checked && <Check size={10} className="text-[var(--noir)]" />}
      </span>
      <span className="flex-1 font-body text-[12.5px] text-[var(--ink)]">{label}</span>
    </button>
  );
}

export function RefineRail({
  filters,
  update,
  categories,
  priceDraft,
  setPriceDraft,
}: {
  filters: SearchFilters;
  update: (u: Record<string, string | undefined>) => void;
  categories: Category[];
  priceDraft: { min: string; max: string };
  setPriceDraft: (fn: (p: { min: string; max: string }) => { min: string; max: string }) => void;
}) {
  return (
    <div className="flex flex-col gap-7 pb-2">
      <p className="font-body text-[11px] font-bold tracking-[1.8px] text-[var(--ink-muted)]">REFINE</p>

      {categories.length > 0 && (
        <div className="flex flex-col gap-4">
          <GroupHeading title="CATEGORY" />
          <div className="flex flex-col gap-3">
            {categories.map((c) => (
              <FilterOption
                key={c.id}
                label={c.name}
                checked={filters.categoryId === c.id}
                onToggle={() => update({ categoryId: filters.categoryId === c.id ? undefined : c.id })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <GroupHeading title="GET IT BY" />
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Delivery or pickup">
          {[
            { value: "", label: "Any" },
            { value: "delivery", label: "Delivery" },
            { value: "pickup", label: "Pickup" },
          ].map((o) => (
            <FilterOption
              key={o.value || "any"}
              radio
              label={o.label}
              checked={filters.fulfillment === o.value}
              onToggle={() => update({ fulfillment: o.value || undefined })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <GroupHeading title="RATING" />
        <div className="flex flex-col gap-3" role="radiogroup" aria-label="Minimum rating">
          <FilterOption radio label="Any rating" checked={!filters.minRating} onToggle={() => update({ minRating: undefined })} />
          {RATING_OPTIONS.map((r) => (
            <FilterOption
              key={r}
              radio
              label={`${r}★ & up`}
              checked={filters.minRating === String(r)}
              onToggle={() => update({ minRating: String(r) })}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <GroupHeading title="AVAILABILITY" />
        <FilterOption
          label="Include out of stock"
          checked={filters.includeOutOfStock}
          onToggle={() => update({ oos: filters.includeOutOfStock ? undefined : "1" })}
        />
      </div>

      <form
        className="flex flex-col gap-[14px]"
        onSubmit={(e) => {
          e.preventDefault();
          update({
            minPrice: priceDraft.min.replace(/[^\d.]/g, "") || undefined,
            maxPrice: priceDraft.max.replace(/[^\d.]/g, "") || undefined,
          });
        }}
      >
        <span className="font-body text-[11px] font-bold tracking-[1.4px] text-[var(--ink)]">PRICE</span>
        <div className="flex items-center gap-[10px]">
          <input
            aria-label="Minimum price"
            inputMode="decimal"
            value={priceDraft.min}
            onChange={(e) => setPriceDraft((p) => ({ ...p, min: e.target.value }))}
            placeholder="Min $"
            className="w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[11px] py-[9px] font-body text-[12px] text-[var(--ink)] outline-none focus:border-[var(--gold)]"
          />
          <input
            aria-label="Maximum price"
            inputMode="decimal"
            value={priceDraft.max}
            onChange={(e) => setPriceDraft((p) => ({ ...p, max: e.target.value }))}
            placeholder="Max $"
            className="w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[11px] py-[9px] font-body text-[12px] text-[var(--ink)] outline-none focus:border-[var(--gold)]"
          />
        </div>
        <button
          type="submit"
          className="rounded-[2px] bg-[var(--ink)] py-[10px] font-body text-[11px] font-semibold tracking-[1.4px] text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
        >
          APPLY
        </button>
      </form>
    </div>
  );
}

/** Active-filter chips with one-click removal. */
export function FilterChips({
  filters,
  update,
  categoryName,
  onClear,
}: {
  filters: SearchFilters;
  update: (u: Record<string, string | undefined>) => void;
  categoryName?: string;
  onClear: () => void;
}) {
  const { location } = useCustomerLocation();
  const chips: { label: string; clear: Record<string, undefined> }[] = [
    ...(filters.categoryId ? [{ label: categoryName ?? "Category", clear: { categoryId: undefined } }] : []),
    ...(filters.minPrice ? [{ label: `From $${filters.minPrice}`, clear: { minPrice: undefined } }] : []),
    ...(filters.maxPrice ? [{ label: `Up to $${filters.maxPrice}`, clear: { maxPrice: undefined } }] : []),
    ...(filters.minRating ? [{ label: `${filters.minRating}★ & up`, clear: { minRating: undefined } }] : []),
    ...(filters.fulfillment
      ? [{ label: filters.fulfillment === "delivery" ? "Delivery" : "Pickup", clear: { fulfillment: undefined } }]
      : []),
    ...(filters.radiusKm && location ? [{ label: `Within ${filters.radiusKm} km`, clear: { radiusKm: undefined } }] : []),
    ...(filters.includeOutOfStock ? [{ label: "Incl. out of stock", clear: { oos: undefined } }] : []),
  ];
  if (chips.length === 0) return null;
  return (
    <>
      {chips.map((chip) => (
        <button
          key={chip.label}
          type="button"
          onClick={() => update(chip.clear)}
          aria-label={`Remove filter ${chip.label}`}
          className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[11px] py-[6px] font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
        >
          {chip.label} ✕
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="font-body text-[11px] text-[var(--gold-deep)] underline-offset-2 hover:underline"
      >
        Clear all
      </button>
    </>
  );
}

/** Results grid with loading / error / empty states and pagination. */
export function SearchResults({
  search,
  filters,
  update,
  emptyText,
}: {
  search: ReturnType<typeof useProductSearch>;
  filters: SearchFilters;
  update: (u: Record<string, string | undefined>) => void;
  emptyText: string;
}) {
  const products = search.data?.data ?? [];
  const meta = search.data?.meta;
  const errorMessage =
    search.error && typeof search.error === "object"
      ? Object.values((search.error as { errors?: Record<string, string> }).errors ?? {})[0]
      : undefined;

  if (search.loading) {
    return (
      <p role="status" className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
        Searching the marketplace…
      </p>
    );
  }
  if (search.error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="font-body text-[12.5px] text-[var(--ink-muted)]">
          {errorMessage || "We couldn't load products right now. Please try again shortly."}
        </p>
        <button
          type="button"
          onClick={search.reload}
          className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)]"
        >
          Try again
        </button>
      </div>
    );
  }
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-center">
        <p className="font-body text-[12.5px] text-[var(--ink-muted)]">{emptyText}</p>
        {search.hasLocation && filters.radiusKm && (
          <button
            type="button"
            onClick={() => update({ radiusKm: undefined })}
            className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)]"
          >
            Search any distance
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      {meta && meta.totalPages > 1 && (
        <Pagination
          currentPage={meta.page}
          totalPages={meta.totalPages}
          onPageChange={(newPage) => update({ page: String(newPage) })}
        />
      )}
      {meta?.capped && (
        <p className="text-center font-body text-[11px] text-[var(--ink-muted)]">
          Showing the most relevant matches — refine your search to see more.
        </p>
      )}
    </div>
  );
}
