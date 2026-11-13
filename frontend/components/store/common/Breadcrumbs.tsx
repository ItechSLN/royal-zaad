import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-body text-[11px]">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} className="text-[var(--border-strong)]" />}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[var(--ink-muted)] transition hover:text-[var(--gold-deep)]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="font-semibold text-[var(--ink)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
