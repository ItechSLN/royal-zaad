'use client';

type CheckboxProps = {
  label: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

export default function Checkbox({
  label,
  name,
  checked,
  onChange,
  disabled = false,
}: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="h-4 w-4 rounded-[2px] border-[var(--border-strong)] accent-[var(--gold)] disabled:cursor-not-allowed disabled:opacity-50"
      />

      <span className="font-body text-[13px] text-[var(--ink)]">{label}</span>
    </label>
  );
}
