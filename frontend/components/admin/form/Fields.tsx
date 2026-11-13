'use client';

import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

export type FieldDef = {
  name: string;
  label: string;
  type?:
    | "text"
    | "number"
    | "date"
    | "textarea"
    | "select"
    | "toggle"
    | "money"
    | "image";
  placeholder?: string;
  options?: { value: string; label: string }[];
  help?: string;
  /** Column span inside a two-column grid. */
  full?: boolean;
  suffix?: string;
};

export function FieldShell({
  label,
  help,
  error,
  children,
}: {
  label: string;
  help?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
        {label}
      </span>
      {children}
      {help && !error && (
        <span className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">{help}</span>
      )}
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

const INPUT =
  "w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--gold)]";

/**
 * Image picker used by the schema-driven forms. Holds a URL as its value, so a
 * pasted link works with no upload configured, while a chosen file is handed to
 * `onFile` for the page to upload once the record exists.
 */
export function ImageField({
  label,
  value,
  help,
  error,
  onChange,
  onFile,
}: {
  label: string;
  value: string;
  help?: string;
  error?: string;
  onChange: (next: string) => void;
  onFile?: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const shown = preview ?? (value || null);

  const pick = (file: File | null) => {
    onFile?.(file);
    if (!file) {
      setPreview(null);
      return;
    }
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className="flex w-full flex-col gap-2">
      <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
        {label}
      </span>

      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-dashed border-[var(--border-strong)] bg-[var(--admin-bg)] transition hover:border-[var(--gold)]"
          aria-label="Choose an image"
        >
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus size={18} className="text-[var(--ink-muted)]" />
          )}
        </button>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setPreview(null);
            }}
            placeholder="Paste an image URL, or choose a file"
            className={INPUT}
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="font-body text-[11px] font-semibold text-[var(--gold-deep)]"
            >
              Upload image
            </button>
            {shown && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  pick(null);
                }}
                className="flex items-center gap-1 font-body text-[11px] text-[var(--danger)]"
              >
                <Trash2 size={11} /> Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] ?? null)}
      />

      {help && !error && (
        <span className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">
          {help}
        </span>
      )}
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </div>
  );
}

/** Renders one field from a schema definition. */
export function SchemaField({
  field,
  value,
  error,
  onChange,
  onFile,
}: {
  field: FieldDef;
  value: string | boolean;
  error?: string;
  onChange: (next: string | boolean) => void;
  onFile?: (name: string, file: File | null) => void;
}) {
  if (field.type === "image") {
    return (
      <ImageField
        label={field.label}
        value={String(value ?? "")}
        help={field.help}
        error={error}
        onChange={onChange}
        onFile={(file) => onFile?.(field.name, file)}
      />
    );
  }

  if (field.type === "toggle") {
    const checked = Boolean(value);
    return (
      <div className="flex items-center justify-between gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-4 py-3">
        <div className="flex flex-col">
          <span className="font-body text-[12px] font-semibold text-[var(--ink)]">
            {field.label}
          </span>
          {field.help && (
            <span className="font-body text-[10.5px] text-[var(--ink-muted)]">{field.help}</span>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={field.label}
          onClick={() => onChange(!checked)}
          className={`flex h-[20px] w-[36px] shrink-0 items-center rounded-full p-[3px] transition ${
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

  if (field.type === "select") {
    return (
      <FieldShell label={field.label} help={field.help} error={error}>
        <select
          value={String(value)}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT}
        >
          <option value="">{field.placeholder ?? "Select…"}</option>
          {(field.options ?? []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </FieldShell>
    );
  }

  if (field.type === "textarea") {
    return (
      <FieldShell label={field.label} help={field.help} error={error}>
        <textarea
          rows={5}
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT} resize-y leading-[1.7]`}
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell label={field.label} help={field.help} error={error}>
      <div className="flex items-center rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] transition focus-within:border-[var(--gold)]">
        {field.type === "money" && (
          <span className="shrink-0 pr-2 font-body text-[12px] text-[var(--ink-muted)]">$</span>
        )}
        <input
          type={field.type === "number" || field.type === "money" ? "number" : field.type ?? "text"}
          value={String(value)}
          placeholder={field.placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
        />
        {field.suffix && (
          <span className="shrink-0 pl-2 font-body text-[11px] text-[var(--ink-muted)]">
            {field.suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}
