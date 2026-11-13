'use client';

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import Breadcrumbs from "@/components/store/common/Breadcrumbs";
import CategoryCard from "@/components/store/common/CategoryCard";
import SectionHeading from "@/components/store/common/SectionHeading";
import { getStoreCategories, Category } from "@/services/category.service";
import { getStoreProducts } from "@/services/store-products.service";
import type { Product } from "@/services/product.service";

type SortOption = "name_asc" | "name_desc";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("name_asc");

  useEffect(() => {
    getStoreCategories(100)
      .then((res) => {
        setCategories(res.data ?? []);
        setFailed(false);
      })
      .catch(() => {
        setCategories([]);
        setFailed(true);
      })
      .finally(() => setLoading(false));

    // Only used to borrow a product shot for categories without stored artwork.
    getStoreProducts({ limit: 100 })
      .then((res) => setProducts(res.data ?? []))
      .catch(() => setProducts([]));
  }, []);

  const visibleCategories = useMemo(() => {
    const filtered = categories.filter((c) =>
      c.name.toLowerCase().includes(search.trim().toLowerCase())
    );
    return filtered.sort((a, b) =>
      sort === "name_asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
    );
  }, [categories, search, sort]);

  /** Stored artwork wins; otherwise borrow a product shot from the category. */
  const imageFor = (categoryId: string) => {
    const stored = categories.find((c) => c.id === categoryId)?.imageUrl;
    if (stored) return stored;

    const match = products.find((p) => p.category?.id === categoryId);
    return match?.images?.find((i) => i.isPrimary)?.url ?? match?.images?.[0]?.url ?? null;
  };

  const countFor = (categoryId: string) => {
    const stored = categories.find((c) => c.id === categoryId)?._count?.products;
    if (stored !== undefined) return stored;

    return products.filter((p) => p.category?.id === categoryId).length;
  };

  return (
    <div className="mx-auto max-w-[1440px] px-6 py-10 lg:px-12">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "The Maison" }]} />

      <div className="mt-8 flex flex-col items-center">
        <SectionHeading eyebrow="Explore the maison" title="Every House, One Standard" />
      </div>

      <div className="mt-8 flex flex-col gap-3 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-center sm:justify-end">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ink-muted)]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search houses…"
            className="w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] py-2 pl-9 pr-4 font-body text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)] sm:w-64"
          />
        </div>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 font-body text-[12.5px] text-[var(--ink)] outline-none focus:border-[var(--gold)]"
        >
          <option value="name_asc">Name (A–Z)</option>
          <option value="name_desc">Name (Z–A)</option>
        </select>
      </div>

      <div className="mt-10">
        {loading ? (
          <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
            Loading the maison…
          </p>
        ) : failed ? (
          <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
            We couldn&apos;t load categories right now. Please try again shortly.
          </p>
        ) : visibleCategories.length === 0 ? (
          <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
            No houses found.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleCategories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
                image={imageFor(category.id)}
                count={countFor(category.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
