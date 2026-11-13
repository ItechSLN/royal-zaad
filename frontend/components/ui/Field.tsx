'use client';

import type { LucideIcon } from "lucide-react";

type FieldProps = {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  error?: string;
  type?: string;
  icon?: LucideIcon;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

/** C/Field — 12px semibold label over a hairline input with optional trailing icon. */
export default function Field({
  label,
  name,
  value,
  placeholder,
  error,
  type = "text",
  icon: Icon,
  disabled,
  onChange,
}: FieldProps) {
  return (
    <label className="block w-full">
      <span className="font-body text-[12px] font-semibold tracking-[0.3px] text-[var(--ink-muted)]">
        {label}
      </span>

      <div
        className={`mt-[8px] flex items-center justify-between rounded-[2px] border bg-[var(--surface)] px-[14px] py-[13px] transition focus-within:border-[var(--gold)] ${
          error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
        }`}
      >
        <input
          name={name}
          type={type}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          onChange={onChange}
          className="w-full bg-transparent font-body text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)] disabled:cursor-not-allowed disabled:opacity-60"
        />
        {Icon && <Icon size={15} className="ml-2 shrink-0 text-[var(--ink-muted)]" />}
      </div>

      {error && (
        <p className="mt-1.5 font-body text-[12px] text-[var(--danger)]">{error}</p>
      )}
    </label>
  );
}

export function SelectField({
  label,
  name,
  value,
  options,
  error,
  placeholder = "Select an option",
  onChange,
}: {
  label: string;
  name: string;
  value: string | number;
  options: { value: string | number; label: string }[];
  error?: string;
  placeholder?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <label className="block w-full">
      <span className="font-body text-[12px] font-semibold tracking-[0.3px] text-[var(--ink-muted)]">
        {label}
      </span>

      <div
        className={`mt-[8px] rounded-[2px] border bg-[var(--surface)] px-[14px] py-[13px] transition focus-within:border-[var(--gold)] ${
          error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
        }`}
      >
        <select
          name={name}
          value={value}
          onChange={onChange}
          className="w-full bg-transparent font-body text-[13px] text-[var(--ink)] outline-none"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="mt-1.5 font-body text-[12px] text-[var(--danger)]">{error}</p>
      )}
    </label>
  );
}

export function CheckboxField({
  label,
  name,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  name: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="h-4 w-4 rounded-[2px] border-[var(--border-strong)] accent-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50"
      />
      <span className="font-body text-[13px] text-[var(--ink)]">{label}</span>
    </label>
  );
}
