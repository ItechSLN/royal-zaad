'use client';

import { ChevronDown, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type ActionFilter = {
  label: string;
  value: string;
  emphasis?: boolean;
  onClick?: () => void;
};

export type ActionButton = {
  label: string;
  icon?: LucideIcon;
  emphasis?: boolean;
  href?: string;
  onClick?: () => void;
};

/**
 * The admin action sheet — the toolbar that heads every admin screen.
 * Display-serif title with a caption on the left, filter chips and actions on the right.
 */
export default function ActionBar({
  title,
  subtitle,
  filters = [],
  actions = [],
  children,
}: {
  title: string;
  subtitle?: string;
  filters?: ActionFilter[];
  actions?: ActionButton[];
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[14px] xl:flex-row xl:items-center xl:justify-between">
      <div className="flex flex-col gap-[3px]">
        <h2 className="font-display text-[20px] font-semibold leading-tight text-[var(--ink)]">
          {title}
        </h2>
        {subtitle && (
          <p className="font-body text-[11px] text-[var(--ink-muted)]">{subtitle}</p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-[9px]">
        {filters.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={f.onClick}
            className={`flex items-center gap-2 rounded-[2px] border px-[11px] py-2 transition ${
              f.emphasis
                ? 'border-[var(--ink)] bg-[var(--ink)]'
                : 'border-[var(--border)] bg-[var(--admin-bg)] hover:bg-[var(--cream-2)]'
            }`}
          >
            <span
              className={`font-body text-[11px] ${
                f.emphasis ? 'text-[var(--text-muted-dark)]' : 'text-[var(--ink-muted)]'
              }`}
            >
              {f.label}
            </span>
            <span
              className={`font-body text-[11px] font-semibold ${
                f.emphasis ? 'text-[var(--gold)]' : 'text-[var(--ink)]'
              }`}
            >
              {f.value}
            </span>
            <ChevronDown
              size={12}
              className={f.emphasis ? 'text-[var(--text-muted-dark)]' : 'text-[var(--ink-muted)]'}
            />
          </button>
        ))}

        {actions.map((a) => {
          const cls = `flex items-center gap-[7px] rounded-[2px] border px-3 py-2 transition ${
            a.emphasis
              ? 'border-[var(--ink)] bg-[var(--ink)] hover:bg-[var(--charcoal)]'
              : 'border-[var(--border)] bg-[var(--admin-bg)] hover:bg-[var(--cream-2)]'
          }`;
          const inner = (
            <>
              {a.icon && (
                <a.icon
                  size={12}
                  className={a.emphasis ? 'text-[var(--gold)]' : 'text-[var(--ink-muted)]'}
                />
              )}
              <span
                className={`font-body text-[11.5px] font-semibold ${
                  a.emphasis ? 'text-[var(--cream)]' : 'text-[var(--ink)]'
                }`}
              >
                {a.label}
              </span>
            </>
          );

          return a.href ? (
            <a key={a.label} href={a.href} className={cls}>
              {inner}
            </a>
          ) : (
            <button key={a.label} type="button" onClick={a.onClick} className={cls}>
              {inner}
            </button>
          );
        })}

        {children}
      </div>
    </div>
  );
}
