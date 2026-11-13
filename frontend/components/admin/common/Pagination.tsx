'use client';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
};

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col items-center justify-between gap-4 border-t border-[var(--border)] px-5 py-4 sm:flex-row">
      <p className="font-body text-[11px] text-[var(--ink-muted)]">
        {totalItems !== undefined && pageSize !== undefined && (
          <>
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, totalItems)} of {totalItems}
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-[2px] border border-[var(--border)] px-3 py-1.5 font-body text-[11px] text-[var(--ink)] transition hover:bg-[var(--admin-bg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        {pages.map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            className={`h-8 w-8 rounded-[2px] font-body text-[11px] font-semibold transition ${
              page === currentPage
                ? 'border border-[var(--ink)] bg-[var(--ink)] text-[var(--gold)]'
                : 'border border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--admin-bg)]'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-[2px] border border-[var(--border)] px-3 py-1.5 font-body text-[11px] text-[var(--ink)] transition hover:bg-[var(--admin-bg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
