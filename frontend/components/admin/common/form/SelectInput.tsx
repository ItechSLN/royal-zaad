'use client';

type Option = {
  value: string | number;
  label: string;
};

type SelectProps = {
  label: string;
  name: string;
  value: string | number;
  options: Option[];
  placeholder?: string;
  error?: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
};

export default function SelectInput({
  label,
  name,
  value,
  options,
  placeholder = "Select an option",
  error,
  onChange,
}: SelectProps) {
  return (
    <label className="block w-full">
      <span className="font-body text-[12px] font-semibold tracking-[0.3px] text-[var(--ink-muted)]">
        {label}
      </span>

      <select
        name={name}
        value={value}
        onChange={onChange}
        className={`mt-[8px] w-full rounded-[2px] border bg-[var(--surface)] px-[14px] py-[13px] font-body text-[13px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)] ${
          error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
        }`}
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      {error && (
        <p className="mt-1.5 font-body text-[12px] text-[var(--danger)]">{error}</p>
      )}
    </label>
  );
}
