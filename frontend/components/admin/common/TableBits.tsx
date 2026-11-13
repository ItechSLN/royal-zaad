'use client';

import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

/** Square gold checkbox used in admin tables. */
export function RowCheckbox({
  checked,
  onChange,
  label = "Select row",
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`flex h-[13px] w-[13px] items-center justify-center rounded-[2px] border transition ${
        checked
          ? "border-[var(--ink)] bg-[var(--ink)]"
          : "border-[var(--border-strong)] bg-[var(--surface)] hover:border-[var(--ink-muted)]"
      }`}
    >
      {checked && <Check size={9} className="text-[var(--gold)]" />}
    </button>
  );
}

/** Status tab strip with counts. */
export function StatusTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { label: string; count?: number | string }[];
  active: string;
  onChange: (label: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)]">
      {tabs.map((t) => (
        <button
          key={t.label}
          type="button"
          onClick={() => onChange(t.label)}
          className={`flex items-center gap-2 px-4 pb-3 font-body text-[12px] font-semibold transition ${
            active === t.label
              ? "border-b-2 border-[var(--gold)] text-[var(--ink)]"
              : "border-b-2 border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)]"
          }`}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className={`rounded-[2px] px-1.5 py-0.5 font-mono text-[9.5px] ${
                active === t.label
                  ? "bg-[var(--ink)] text-[var(--gold)]"
                  : "bg-[var(--cream-2)] text-[var(--ink-muted)]"
              }`}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/** Secondary filter strip beneath the action sheet. */
export function FilterBar({
  filters,
  trailing,
}: {
  filters: { label: string; value: string }[];
  trailing?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      {filters.map((f) => (
        <button
          key={f.label}
          type="button"
          className="flex items-center gap-2 rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-[11px] py-2 transition hover:bg-[var(--cream-2)]"
        >
          <span className="font-body text-[11px] text-[var(--ink-muted)]">{f.label}</span>
          <span className="font-body text-[11px] font-semibold text-[var(--ink)]">{f.value}</span>
          <ChevronDown size={12} className="text-[var(--ink-muted)]" />
        </button>
      ))}
      <div className="ml-auto flex items-center gap-3">{trailing}</div>
    </div>
  );
}

/** Selection bar shown when rows are ticked. */
export function BulkBar({
  count,
  total,
  actions,
  onClear,
}: {
  count: number;
  total: number;
  actions: string[];
  onClear: () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 border border-[var(--gold)] bg-[var(--warning-bg)] px-4 py-3">
      <span className="font-body text-[11.5px] font-semibold text-[var(--ink)]">
        {count} selected
      </span>
      <span className="font-body text-[11px] text-[var(--ink-muted)]">
        Select all {total.toLocaleString()} matching this filter
      </span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <button
            key={a}
            type="button"
            className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 font-body text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
          >
            {a}
          </button>
        ))}
        <button
          type="button"
          onClick={onClear}
          className="font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

/** On-hand quantity with a capacity meter. */
export function StockMeter({
  onHand,
  capacity,
  tone = "success",
}: {
  onHand: number;
  capacity: number;
  tone?: "success" | "warning" | "danger";
}) {
  const pct = capacity > 0 ? Math.min(100, (onHand / capacity) * 100) : 0;
  const bar =
    tone === "danger"
      ? "bg-[var(--danger)]"
      : tone === "warning"
        ? "bg-[var(--warning)]"
        : "bg-[var(--success)]";
  return (
    <div className="flex w-full flex-col gap-[5px]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] font-semibold text-[var(--ink)]">
          {onHand.toLocaleString()} units
        </span>
        <span className="font-mono text-[9.5px] text-[var(--ink-muted)]">
          / {capacity.toLocaleString()}
        </span>
      </div>
      <div className="h-[4px] w-full rounded-[2px] bg-[var(--cream-2)]">
        <div className={`h-full rounded-[2px] ${bar}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Design pagination footer. */
export function TablePagination({
  page,
  pageSize,
  total,
  onPageChange,
  noun = "records",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  noun?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const pages: (number | "…")[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p <= 3 || p === totalPages || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-[var(--border)] px-5 py-4 sm:flex-row">
      <p className="font-body text-[11px] text-[var(--ink-muted)]">
        Showing {from}–{to} of {total.toLocaleString()} {noun}
      </p>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-[2px] border border-[var(--border)] px-3 py-1.5 font-body text-[11px] text-[var(--ink)] transition hover:bg-[var(--admin-bg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          ‹ Prev
        </button>

        {pages.map((p, i) =>
          p === "…" ? (
            <span key={`gap-${i}`} className="px-1 font-body text-[11px] text-[var(--ink-muted)]">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`h-8 min-w-8 rounded-[2px] px-2 font-body text-[11px] font-semibold transition ${
                p === page
                  ? "border border-[var(--ink)] bg-[var(--ink)] text-[var(--gold)]"
                  : "border border-[var(--border)] text-[var(--ink-muted)] hover:bg-[var(--admin-bg)]"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-[2px] border border-[var(--border)] px-3 py-1.5 font-body text-[11px] text-[var(--ink)] transition hover:bg-[var(--admin-bg)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next ›
        </button>
      </div>
    </div>
  );
}
