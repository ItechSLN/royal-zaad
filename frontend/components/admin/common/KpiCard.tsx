import type { LucideIcon } from 'lucide-react';

export type DeltaTone = 'success' | 'danger' | 'warning' | 'info' | 'muted';

const DELTA_TONES: Record<DeltaTone, string> = {
  success: 'text-[var(--success)]',
  danger: 'text-[var(--danger)]',
  warning: 'text-[var(--warning)]',
  info: 'text-[var(--info)]',
  muted: 'text-[var(--ink-muted)]',
};

/** Mirrors C/KPI Card — label + ink icon tile, display-serif value, delta and note. */
export default function KpiCard({
  label,
  value,
  icon: Icon,
  delta,
  deltaTone = 'success',
  note,
  className = '',
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: string;
  deltaTone?: DeltaTone;
  note?: string;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col gap-3 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-5 ${className}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-body text-[11.5px] font-semibold tracking-[0.4px] text-[var(--ink-muted)]">
          {label}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] bg-[var(--ink)]">
          <Icon size={14} className="text-[var(--gold)]" />
        </span>
      </div>

      <p className="font-display text-[34px] font-semibold leading-none text-[var(--ink)]">
        {value}
      </p>

      {(delta || note) && (
        <div className="flex items-center gap-[7px]">
          {delta && (
            <span className={`font-body text-[11px] font-semibold ${DELTA_TONES[deltaTone]}`}>
              {delta}
            </span>
          )}
          {note && (
            <span className="font-body text-[11px] text-[var(--ink-muted)]">{note}</span>
          )}
        </div>
      )}
    </div>
  );
}
