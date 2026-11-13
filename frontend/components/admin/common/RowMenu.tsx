'use client';

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { EllipsisVertical, type LucideIcon } from "lucide-react";

export type RowAction = {
  label: string;
  icon?: LucideIcon;
  danger?: boolean;
  /** Navigates instead of firing a handler. */
  href?: string;
  onSelect?: () => void;
};

/** Three-dot row action menu — replaces inline Edit/Delete links. */
export default function RowMenu({ actions }: { actions: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="relative flex justify-center" ref={ref}>
      <button
        type="button"
        aria-label="Row actions"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-[2px] text-[var(--ink-muted)] transition hover:bg-[var(--cream-2)] hover:text-[var(--ink)]"
      >
        <EllipsisVertical size={14} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-50 w-[190px] overflow-hidden rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] py-1 shadow-[0_12px_32px_rgba(22,20,15,0.12)]"
        >
          {actions.map((a) => {
            const itemClass = `flex w-full items-center gap-[10px] px-4 py-2.5 text-left font-body text-[12px] transition hover:bg-[var(--admin-bg)] ${
              a.danger ? "text-[var(--danger)]" : "text-[var(--ink)]"
            }`;
            const body = (
              <>
                {a.icon && (
                  <a.icon
                    size={13}
                    className={a.danger ? "text-[var(--danger)]" : "text-[var(--ink-muted)]"}
                  />
                )}
                {a.label}
              </>
            );

            return a.href ? (
              <Link
                key={a.label}
                href={a.href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={itemClass}
              >
                {body}
              </Link>
            ) : (
              <button
                key={a.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  a.onSelect?.();
                }}
                className={itemClass}
              >
                {body}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
