'use client';

import type { ReactNode } from "react";
import { RotateCw } from "lucide-react";
import Card from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import type { ModerationStatus, OrderStatus, VendorProduct } from "@/services/vendor.service";

export { errorText } from "@/components/admin/common/ListStateRow";

/* ── formatting ── */

export const money = (value: unknown) => {
  const n = Number(value ?? 0);
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const fmtDate = (value?: string | null, withTime = false) =>
  value
    ? new Date(value).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "—";

export const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* ── status badges ── */

const ORDER_TONE: Record<OrderStatus, Tone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "info",
};

/** Pickup orders reuse SHIPPED/DELIVERED for "ready" and "collected". */
export const orderStatusLabel = (status: OrderStatus, method?: "DELIVERY" | "PICKUP") => {
  if (method === "PICKUP" && status === "SHIPPED") return "Ready for collection";
  if (method === "PICKUP" && status === "DELIVERED") return "Collected";
  return status.charAt(0) + status.slice(1).toLowerCase();
};

export function OrderStatusBadge({
  status,
  method,
}: {
  status: OrderStatus;
  method?: "DELIVERY" | "PICKUP";
}) {
  return <StatusBadge tone={ORDER_TONE[status] ?? "neutral"}>{orderStatusLabel(status, method)}</StatusBadge>;
}

const MODERATION: Record<ModerationStatus, { tone: Tone; label: string }> = {
  APPROVED: { tone: "success", label: "Approved" },
  PENDING_REVIEW: { tone: "warning", label: "In review" },
  REJECTED: { tone: "danger", label: "Rejected" },
  REMOVED: { tone: "danger", label: "Removed" },
};

export const MODERATION_HELP: Record<ModerationStatus, string> = {
  APPROVED: "Approved by the marketplace.",
  PENDING_REVIEW:
    "Waiting for the marketplace team to review it. It stays hidden from customers until approved.",
  REJECTED:
    "The marketplace didn't approve this listing. Edit and save it to send it back for review.",
  REMOVED:
    "The marketplace removed this listing. It can no longer be edited or sold — contact support if you think this is a mistake.",
};

export function ModerationBadge({ status }: { status: ModerationStatus }) {
  const m = MODERATION[status] ?? { tone: "neutral" as Tone, label: status };
  return <StatusBadge tone={m.tone}>{m.label}</StatusBadge>;
}

/** Published / Draft / Archived — the vendor's own visibility choice. */
export function ListingBadge({ product }: { product: Pick<VendorProduct, "isActive" | "archivedAt"> }) {
  if (product.archivedAt) return <StatusBadge tone="neutral">Archived</StatusBadge>;
  return product.isActive ? (
    <StatusBadge tone="success">Published</StatusBadge>
  ) : (
    <StatusBadge tone="neutral">Draft</StatusBadge>
  );
}

/* ── layout bits ── */

export function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="flex flex-col gap-[3px]">
          <h3 className="font-display text-[19px] font-semibold text-[var(--ink)]">{title}</h3>
          {subtitle && (
            <p className="font-body text-[11px] leading-[1.6] text-[var(--ink-muted)]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-4 px-5 pb-5">{children}</div>
    </Card>
  );
}

/** Full-block loading / error-with-retry / empty state for non-table content. */
export function StateBlock({
  state,
  noun,
  onRetry,
  empty,
  error,
}: {
  state: "loading" | "error" | "empty";
  noun: string;
  onRetry?: () => void;
  empty?: ReactNode;
  error?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
      {state === "loading" && <span>Loading {noun}…</span>}
      {state === "empty" && <span>{empty ?? `No ${noun} yet.`}</span>}
      {state === "error" && (
        <>
          <span className="text-[var(--danger)]">{error ?? `Couldn't load ${noun}.`}</span>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 font-semibold text-[var(--ink)] hover:underline"
            >
              <RotateCw size={12} /> Retry
            </button>
          )}
        </>
      )}
    </div>
  );
}

/* ── form controls ── */

const LABEL = "font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]";

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  error,
  help,
  type = "text",
  prefix,
  suffix,
  textarea = false,
  rows = 5,
  disabled,
  name,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  error?: string;
  help?: string;
  type?: string;
  prefix?: string;
  suffix?: string;
  textarea?: boolean;
  rows?: number;
  disabled?: boolean;
  name?: string;
  autoComplete?: string;
}) {
  const border = error ? "border-[var(--danger)]" : "border-[var(--border-strong)]";
  return (
    <label className="flex w-full flex-col gap-2">
      <span className={LABEL}>{label}</span>
      {textarea ? (
        <textarea
          name={name}
          value={value}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full resize-y rounded-[2px] border ${border} bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] leading-[1.7] text-[var(--ink)] outline-none transition focus:border-[var(--gold)] disabled:opacity-60`}
        />
      ) : (
        <div
          className={`flex items-center rounded-[2px] border ${border} bg-[var(--surface)] px-[14px] transition focus-within:border-[var(--gold)]`}
        >
          {prefix && (
            <span className="shrink-0 pr-2 font-body text-[12px] text-[var(--ink-muted)]">{prefix}</span>
          )}
          <input
            name={name}
            type={type}
            value={value}
            disabled={disabled}
            autoComplete={autoComplete}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] disabled:opacity-60"
          />
          {suffix && (
            <span className="shrink-0 pl-2 font-body text-[11px] text-[var(--ink-muted)]">{suffix}</span>
          )}
        </div>
      )}
      {help && !error && (
        <span className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">{help}</span>
      )}
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  error,
  help,
  name,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
  help?: string;
  name?: string;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className={LABEL}>{label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[2px] border bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)] ${
          error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && !error && (
        <span className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">{help}</span>
      )}
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

export function Toggle({
  name,
  note,
  checked,
  onChange,
  disabled,
}: {
  name: string;
  note?: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-4 py-3">
      <div className="flex flex-col">
        <span className="font-body text-[12px] font-semibold text-[var(--ink)]">{name}</span>
        {note && <span className="font-body text-[10.5px] text-[var(--ink-muted)]">{note}</span>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={name}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`flex h-[20px] w-[36px] shrink-0 items-center rounded-full p-[3px] transition disabled:opacity-50 ${
          checked ? "justify-end bg-[var(--ink)]" : "justify-start bg-[var(--cream-2)]"
        }`}
      >
        <span
          className={`h-[14px] w-[14px] rounded-full ${
            checked ? "bg-[var(--gold)]" : "bg-[var(--border-strong)]"
          }`}
        />
      </button>
    </div>
  );
}

export function Btn({
  children,
  variant = "soft",
  onClick,
  type = "button",
  disabled,
  className = "",
}: {
  children: ReactNode;
  variant?: "soft" | "dark" | "danger" | "gold";
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    dark: "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)] hover:bg-[var(--charcoal)]",
    danger: "border-[var(--danger)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--danger-bg)]",
    gold: "border-transparent bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] text-[var(--noir)] tracking-[1.4px] hover:brightness-[1.06]",
    soft: "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--cream-2)]",
  }[variant];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-[2px] border px-4 py-2.5 font-body text-[11.5px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}
    >
      {children}
    </button>
  );
}

/** Label / value row used in detail panels. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border)] py-2.5 last:border-b-0">
      <span className="font-body text-[11.5px] text-[var(--ink-muted)]">{label}</span>
      <span className="text-right font-body text-[12px] font-semibold text-[var(--ink)]">{children}</span>
    </div>
  );
}
