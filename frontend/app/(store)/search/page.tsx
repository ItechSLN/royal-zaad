'use client';

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Search as SearchIcon } from "lucide-react";
import {
  RefineRail,
  SearchResults,
  SortRadiusBar,
  useProductSearch,
  useSearchFilters,
} from "@/components/store/marketplace/ProductSearch";
import { getStoreCategories, type Category } from "@/services/category.service";

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const query = searchParams.get("q") ?? "";
  const { filters, update } = useSearchFilters("/search");
  // Nothing to search for until a term is entered.
  const search = useProductSearch(filters, { enabled: !!query.trim() });

  const [draft, setDraft] = useState(query);
  const [lastQuery, setLastQuery] = useState(query);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceDraft, setPriceDraft] = useState({ min: filters.minPrice, max: filters.maxPrice });
  const [tab, setTab] = useState<"products" | "categories" | "journal" | "faq">("products");

  // Keep the input in step with back/forward navigation.
  if (lastQuery !== query) {
    setLastQuery(query);
    setDraft(query);
  }

  useEffect(() => {
    getStoreCategories(100)
      .then((res) => setCategories(res.data ?? []))
      .catch(() => setCategories([]));
  }, []);

  const resultTotal = query && search.data ? search.data.meta.total : 0;

  const categoryMatches = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, query]);

  /** Suggested searches come from the real top-level categories. */
  const popular = useMemo(
    () => categories.filter((c) => !c.parentId).slice(0, 6).map((c) => c.name),
    [categories]
  );

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ q: draft.trim() || undefined });
  };

  const TABS = [
    { key: "products" as const, label: `Products (${search.loading ? "…" : resultTotal})` },
    { key: "categories" as const, label: `Categories (${categoryMatches.length})` },
    { key: "journal" as const, label: "Journal (0)" },
    { key: "faq" as const, label: "FAQ (0)" },
  ];

  return (
    <div className="flex flex-col">
      {/* Search band */}
      <section className="flex flex-col gap-6 bg-[var(--ink)] px-6 py-12 lg:px-12">
        <form
          onSubmit={submit}
          className="flex items-center gap-3 border-b border-[var(--hairline)] pb-4"
        >
          <SearchIcon size={20} className="shrink-0 text-[var(--gold)]" />
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search the maison…"
            className="w-full bg-transparent font-display text-[32px] text-[var(--cream)] outline-none placeholder:text-[var(--text-muted-dark)]"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                router.push("/search");
              }}
              className="shrink-0 font-body text-[16px] text-[var(--text-muted-dark)] transition hover:text-[var(--cream)]"
            >
              ✕
            </button>
          )}
        </form>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-[12.5px] text-[var(--text-muted-dark)]">
            {query ? (
              <>
                {search.loading ? "Searching for" : `Showing ${resultTotal} results for`}{" "}
                <span className="text-[var(--cream)]">“{query}”</span>
                {search.location ? ` near ${search.location.label}` : ""}
              </>
            ) : (
              "Start typing to search the collection"
            )}
          </p>
          {query && <SortRadiusBar filters={filters} update={update} />}
        </div>

        {popular.length > 0 && (
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-body text-[10px] font-bold tracking-[2px] text-[var(--gold)]">
              POPULAR
            </span>
            {popular.map((term) => (
              <Link
                key={term}
                href={`/search?q=${encodeURIComponent(term)}`}
                className="rounded-[2px] border border-[var(--hairline)] px-[11px] py-[6px] font-body text-[11px] text-[var(--text-on-dark)] transition hover:border-[var(--gold)] hover:text-[var(--gold)]"
              >
                {term}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Result tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] bg-[var(--cream)] px-6 pt-5 lg:px-12">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-4 pb-3 font-body text-[12px] font-semibold transition ${
              tab === t.key
                ? "border-b-2 border-[var(--gold)] text-[var(--ink)]"
                : "border-b-2 border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-10 bg-[var(--cream)] px-6 py-10 lg:flex-row lg:px-12">
        <aside className="flex w-full shrink-0 flex-col gap-7 lg:w-[260px]">
          <div className="flex flex-col gap-3">
            <p className="font-body text-[11px] font-bold tracking-[1.4px] text-[var(--ink)]">
              CATEGORY MATCHES
            </p>
            {categoryMatches.length === 0 ? (
              <p className="font-body text-[12.5px] text-[var(--ink-muted)]">
                {query ? "No matching categories." : "Search to see matching categories."}
              </p>
            ) : (
              categoryMatches.map((c) => (
                <Link
                  key={c.id}
                  href={`/products?categoryId=${c.id}`}
                  className="flex items-center justify-between font-body text-[12.5px] text-[var(--ink-muted)] transition hover:text-[var(--gold-deep)]"
                >
                  <span>{c.name}</span>
                  {c._count?.products !== undefined && (
                    <span className="font-mono text-[10.5px]">({c._count.products})</span>
                  )}
                </Link>
              ))
            )}
          </div>

          {query && tab === "products" && (
            <RefineRail
              filters={filters}
              update={update}
              categories={categories.filter((c) => !c.parentId)}
              priceDraft={priceDraft}
              setPriceDraft={setPriceDraft}
            />
          )}

          <div className="flex flex-col gap-2 border border-[var(--border-strong)] bg-[var(--surface)] p-5">
            <p className="font-display text-[19px] text-[var(--ink)]">Can&apos;t find it?</p>
            <p className="font-body text-[11.5px] leading-[1.7] text-[var(--ink-muted)]">
              Tell our concierge what you are looking for and we will source it.
            </p>
            <span className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)]">
              Contact concierge →
            </span>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {tab === "products" ? (
            query ? (
              <SearchResults
                search={search}
                filters={filters}
                update={update}
                emptyText={`No products found for “${query}”.`}
              />
            ) : (
              <p className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
                Enter a search term above.
              </p>
            )
          ) : tab === "categories" ? (
            categoryMatches.length === 0 ? (
              <p className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
                {query ? `No categories match “${query}”.` : "Enter a search term above."}
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {categoryMatches.map((c) => (
                  <Link
                    key={c.id}
                    href={`/products?categoryId=${c.id}`}
                    className="group relative flex h-[220px] flex-col justify-end overflow-hidden border border-[var(--border-strong)] p-5"
                  >
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[var(--cream-2)]" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--noir)]/85 to-transparent" />
                    <span className="relative font-display text-[24px] text-[var(--cream)]">
                      {c.name}
                    </span>
                  </Link>
                ))}
              </div>
            )
          ) : (
            <p className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
              Nothing here yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <p className="py-20 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading…
        </p>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
