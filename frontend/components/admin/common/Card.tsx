import type { ReactNode } from "react";

/** Admin panel surface — hairline border, 2px radius, white. */
export default function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2px] border border-[var(--border)] bg-[var(--surface)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PanelHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-[3px]">
        <h3 className="font-display text-[19px] font-semibold leading-tight text-[var(--ink)]">
          {title}
        </h3>
        {subtitle && (
          <p className="font-body text-[11px] text-[var(--ink-muted)]">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
