"use client";

import { Minus, Plus } from "lucide-react";

type QuantitySelectorProps = {
  quantity: number;
  onChange: (quantity: number) => void;
  max?: number;
  min?: number;
};

export default function QuantitySelector({ quantity, onChange, max = 99, min = 1 }: QuantitySelectorProps) {
  return (
    <div className="flex items-center rounded-[2px] border border-[var(--border-strong)]">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, quantity - 1))}
        disabled={quantity <= min}
        className="flex h-9 w-9 items-center justify-center rounded-[2px] text-[var(--ink-muted)] transition hover:bg-[var(--cream-2)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Decrease quantity"
      >
        <Minus size={14} />
      </button>
      <span className="w-10 text-center font-body text-[13px] font-semibold text-[var(--ink)]">{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, quantity + 1))}
        disabled={quantity >= max}
        className="flex h-9 w-9 items-center justify-center rounded-[2px] text-[var(--ink-muted)] transition hover:bg-[var(--cream-2)] disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}
