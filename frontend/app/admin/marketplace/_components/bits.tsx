'use client';

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import Modal, { ModalButton } from "@/components/admin/form/Modal";
import { FieldShell } from "@/components/admin/form/Fields";
import type { Tone } from "@/components/ui/Badge";

/* Shared building blocks for the marketplace administration screens. */

/**
 * Loads `fetcher` whenever `key` changes (or `reload()` is called) and keeps
 * the last good answer on screen while the same view reloads. `live` is false
 * until the current view has answered, and after it fails.
 */
export function useRemote<T>(fetcher: () => Promise<T>, key: string) {
  const [nonce, setNonce] = useState(0);
  const [result, setResult] = useState<{ key: string; nonce: number; data?: T; error?: unknown } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetcher().then(
      (data) => !cancelled && setResult({ key, nonce, data }),
      (error) => !cancelled && setResult((prev) => ({ key, nonce, error, data: prev?.key === key ? prev.data : undefined }))
    );
    return () => {
      cancelled = true;
    };
    // `fetcher` is recreated every render; `key` captures its inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const current = result?.key === key;
  return {
    data: current ? result?.data : undefined,
    error: current ? result?.error : undefined,
    loading: !current || result?.nonce !== nonce,
    live: current && !result?.error && result?.data !== undefined,
    reload,
  };
}

export const VENDOR_TONE: Record<string, Tone> = {
  PENDING: "warning",
  ACTIVE: "success",
  SUSPENDED: "danger",
  REJECTED: "neutral",
};

export const MODERATION_TONE: Record<string, Tone> = {
  PENDING_REVIEW: "warning",
  APPROVED: "success",
  REJECTED: "neutral",
  REMOVED: "danger",
};

export const REPORT_TONE: Record<string, Tone> = {
  OPEN: "warning",
  RESOLVED: "success",
  DISMISSED: "neutral",
};

export const PAYOUT_TONE: Record<string, Tone> = {
  PENDING: "warning",
  PAID: "success",
  CANCELLED: "neutral",
};

export const ORDER_TONE: Record<string, Tone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SHIPPED: "warning",
  DELIVERED: "success",
  CANCELLED: "danger",
  REFUNDED: "info",
};

/** "PENDING_REVIEW" → "Pending review". */
export const label = (value?: string | null) =>
  value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ") : "—";

export const personName = (u?: { firstName?: string | null; lastName?: string | null } | null) =>
  [u?.firstName, u?.lastName].filter(Boolean).join(" ") || "—";

/** The API's message plus every field error, as separate lines. */
export const errorLines = (error: any, fallback = "Something went wrong."): string[] => {
  const fields = error?.errors ? Object.values(error.errors as Record<string, string>) : [];
  const message = error?.message ?? fallback;
  return fields.length ? [message, ...fields] : [message];
};

/** Inline API error box — keeps the details on screen after the toast fades. */
export function ErrorBox({ error, title }: { error: any; title?: string }) {
  if (!error) return null;
  const [head, ...rest] = errorLines(error);
  return (
    <div
      role="alert"
      className="rounded-[2px] border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 font-body text-[11.5px] text-[var(--danger)]"
    >
      <p className="font-semibold">{title ?? head}</p>
      {title && <p className="mt-1">{head}</p>}
      {rest.length > 0 && (
        <ul className="mt-1 list-disc pl-4">
          {rest.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Loading / error-with-retry block for panels that aren't tables. */
export function PanelState({
  loading,
  error,
  noun,
  onRetry,
}: {
  loading: boolean;
  error: any;
  noun: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-16 text-center font-body text-[12px] text-[var(--ink-muted)]">
      {loading ? (
        <span>Loading {noun}…</span>
      ) : (
        <>
          <span className="text-[var(--danger)]">
            Couldn&apos;t load {noun}
            {error?.message ? ` — ${error.message}` : "."}
          </span>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1 font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
          >
            <RotateCw size={12} /> Retry
          </button>
        </>
      )}
    </div>
  );
}

/** Label / value pair in a detail grid. */
export function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-body text-[9.5px] font-bold uppercase tracking-[1.4px] text-[var(--ink-muted)]">
        {term}
      </dt>
      <dd className="font-body text-[12.5px] text-[var(--ink)]">{children}</dd>
    </div>
  );
}

const INPUT =
  "w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[11px] font-body text-[12.5px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--gold)]";

export const inputClass = INPUT;

/** Small search box used in action rows. */
export function SearchBox({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-3 py-2 font-body text-[11.5px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--gold)] sm:w-[260px]"
    />
  );
}

export function SmallButton({
  children,
  onClick,
  variant = "soft",
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  variant?: "soft" | "dark" | "danger";
  disabled?: boolean;
}) {
  const styles =
    variant === "dark"
      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--cream)] hover:bg-[var(--charcoal)]"
      : variant === "danger"
        ? "border-[var(--danger)] bg-[var(--surface)] text-[var(--danger)] hover:bg-[var(--danger-bg)]"
        : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[var(--cream-2)]";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 rounded-[2px] border px-3 py-1.5 font-body text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  );
}

/**
 * A short form in a dialog: an optional choice plus a text box. `onSubmit`
 * returns true to close, false to stay open (the caller reports the error,
 * and `error` keeps the API's details visible inside the dialog).
 */
export function ReasonDialog({
  open,
  title,
  subtitle,
  fieldLabel,
  placeholder,
  required = true,
  multiline = true,
  choice,
  submitLabel,
  variant = "dark",
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  fieldLabel: string;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
  choice?: {
    label: string;
    options: { value: string; label: string }[];
    help?: string;
  };
  submitLabel: string;
  variant?: "dark" | "danger";
  error?: any;
  onClose: () => void;
  onSubmit: (text: string, choice: string) => Promise<boolean>;
}) {
  const [text, setText] = useState("");
  const [picked, setPicked] = useState("");
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Reset whenever the dialog is reopened.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setText("");
      setPicked("");
      setMissing(false);
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (required && !text.trim()) {
      setMissing(true);
      return;
    }
    setBusy(true);
    try {
      if (await onSubmit(text.trim(), picked)) onClose();
    } finally {
      setBusy(false);
    }
  };

  const formId = `reason-${title.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <Modal
      open={open}
      title={title}
      subtitle={subtitle}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant={variant} type="submit" form={formId} disabled={busy}>
            {busy ? "Saving…" : submitLabel}
          </ModalButton>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="flex flex-col gap-4">
        {choice && (
          <FieldShell label={choice.label} help={choice.help}>
            <select value={picked} onChange={(e) => setPicked(e.target.value)} className={INPUT}>
              {choice.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </FieldShell>
        )}
        <FieldShell
          label={fieldLabel}
          help={required ? undefined : "Optional"}
          error={missing ? "This field is required" : undefined}
        >
          {multiline ? (
            <textarea
              rows={4}
              value={text}
              autoFocus
              placeholder={placeholder}
              onChange={(e) => setText(e.target.value)}
              className={`${INPUT} resize-y leading-[1.6]`}
            />
          ) : (
            <input
              value={text}
              autoFocus
              placeholder={placeholder}
              onChange={(e) => setText(e.target.value)}
              className={INPUT}
            />
          )}
        </FieldShell>
        <ErrorBox error={error} />
      </form>
    </Modal>
  );
}
