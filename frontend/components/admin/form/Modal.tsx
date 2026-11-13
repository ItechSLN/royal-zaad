'use client';

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ReactNode } from "react";

export type ModalSize = "sm" | "md" | "lg";

const WIDTHS: Record<ModalSize, string> = {
  sm: "max-w-[420px]",
  md: "max-w-[620px]",
  lg: "max-w-[860px]",
};

/** Admin dialog shell — hairline panel, display-serif title, sticky footer. */
export default function Modal({
  open,
  title,
  subtitle,
  size = "md",
  onClose,
  footer,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  size?: ModalSize;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto bg-[var(--noir)]/55 p-4 py-10">
      <button
        type="button"
        aria-label="Close dialog"
        className="fixed inset-0 -z-10 cursor-default"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${WIDTHS[size]} rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)]`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
          <div className="flex flex-col gap-[3px]">
            <h2 className="font-display text-[24px] font-semibold leading-tight text-[var(--ink)]">
              {title}
            </h2>
            {subtitle && (
              <p className="font-body text-[11.5px] text-[var(--ink-muted)]">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-1 shrink-0 text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export function ModalButton({
  children,
  variant = "soft",
  onClick,
  type = "button",
  disabled,
  form,
}: {
  children: ReactNode;
  variant?: "soft" | "dark" | "danger";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  form?: string;
}) {
  const styles =
    variant === "dark"
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)] hover:bg-[var(--charcoal)]"
      : variant === "danger"
        ? "border-[var(--danger)] bg-[var(--danger)] text-[var(--cream)] hover:opacity-90"
        : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--cream-2)]";

  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[2px] border px-5 py-2.5 font-body text-[11.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}
