import Link from "next/link";
import type { Category } from "@/services/category.service";

/** Editorial category tile — full-bleed imagery with the name set over a scrim. */
export default function CategoryCard({
  category,
  count,
  image,
}: {
  category: Category;
  count?: number;
  image?: string | null;
}) {
  return (
    <Link
      href={`/products?categoryId=${category.id}`}
      className="group relative flex h-[320px] flex-col justify-end overflow-hidden border border-[var(--border-strong)] p-5"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={image}
          alt={category.name}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-[var(--cream-2)]" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[var(--noir)]/85 via-[var(--noir)]/20 to-transparent" />

      <div className="relative flex flex-col gap-1">
        <span className="font-display text-[26px] font-medium text-[var(--cream)]">
          {category.name}
        </span>
        {count !== undefined && (
          <span className="font-body text-[11px] tracking-[0.6px] text-[var(--champagne)]">
            {count} products
          </span>
        )}
      </div>
    </Link>
  );
}
