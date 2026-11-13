'use client';

type TextInputProps = {
  label: string;
  name: string;
  value: string;
  placeholder?: string;
  error?: string;
  type?: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function TextInput({
  label,
  name,
  value,
  placeholder,
  error,
  type = "text",
  onChange,
}: TextInputProps) {
  return (
    <label className="block w-full">
      <span className="font-body text-[12px] font-semibold tracking-[0.3px] text-[var(--ink-muted)]">
        {label}
      </span>

      <input
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        className={`mt-[8px] w-full rounded-[2px] border bg-[var(--surface)] px-[14px] py-[13px] font-body text-[13px] text-[var(--ink)] outline-none transition placeholder:text-[var(--ink-muted)] focus:border-[var(--gold)] ${
          error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
        }`}
      />

      {error && (
        <p className="mt-1.5 font-body text-[12px] text-[var(--danger)]">{error}</p>
      )}
    </label>
  );
}
