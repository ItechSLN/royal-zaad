"use client";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1
  );

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="rounded-[2px] border border-[var(--border-strong)] px-4 py-2 font-body text-[11px] font-semibold tracking-[0.6px] text-[var(--ink)] transition hover:bg-[var(--cream-2)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        PREV
      </button>

      {pages.map((page, i) => (
        <span key={page} className="flex items-center gap-2">
          {i > 0 && pages[i - 1] !== page - 1 && (
            <span className="px-1 font-body text-[11px] text-[var(--ink-muted)]">…</span>
          )}
          <button
            type="button"
            onClick={() => onPageChange(page)}
            className={`h-9 w-9 rounded-[2px] font-body text-[11px] font-semibold transition ${
              page === currentPage
                ? "border border-[var(--ink)] bg-[var(--ink)] text-[var(--gold)]"
                : "border border-[var(--border-strong)] text-[var(--ink-muted)] hover:bg-[var(--cream-2)]"
            }`}
          >
            {page}
          </button>
        </span>
      ))}

      <button
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="rounded-[2px] border border-[var(--border-strong)] px-4 py-2 font-body text-[11px] font-semibold tracking-[0.6px] text-[var(--ink)] transition hover:bg-[var(--cream-2)] disabled:cursor-not-allowed disabled:opacity-40"
      >
        NEXT
      </button>
    </div>
  );
}
