import type { ReactNode } from "react";
import BrandMark from "@/components/brand/BrandMark";

/** Split card for the seller sign-in / sign-up / confirm screens. */
export default function VendorAuthCard({
  eyebrow,
  title,
  subtitle,
  children,
  wide = false,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div
        className={`grid w-full overflow-hidden rounded-[2px] border border-[var(--border)] bg-[var(--surface)] ${
          wide ? "max-w-6xl lg:grid-cols-[0.8fr_1.2fr]" : "max-w-5xl lg:grid-cols-[1fr_1fr]"
        }`}
      >
        <div className="relative hidden flex-col justify-between gap-10 bg-[var(--noir)] p-10 text-[var(--cream)] lg:flex">
          <div className="flex items-center gap-3">
            <BrandMark size={36} className="text-[var(--gold)]" />
            <div className="flex flex-col gap-1">
              <span className="font-display text-[20px] tracking-[4px]">ROYAL ZAAD</span>
              <span className="font-body text-[8px] tracking-[2px] text-[var(--gold)]">SELLER CENTRE</span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <p className="font-display text-[38px] font-semibold leading-[1.1]">
              Sell your goods to customers nearby.
            </p>
            <p className="font-body text-[12.5px] leading-[1.8] text-[var(--text-muted-dark)]">
              List your products, manage stock, fulfil delivery and pickup orders, and track your
              earnings — all from one place.
            </p>
          </div>
          <div className="h-px w-16 bg-[var(--gold)]" />
        </div>

        <div className="flex flex-col gap-7 p-6 sm:p-10">
          <div className="flex items-center gap-3 lg:hidden">
            <BrandMark size={28} variant="compact" className="text-[var(--ink)]" />
            <span className="font-display text-[18px] tracking-[3px] text-[var(--ink)]">ROYAL ZAAD</span>
          </div>
          <div className="flex flex-col gap-2">
            <p className="font-body text-[10px] font-bold uppercase tracking-[3px] text-[var(--gold-deep)]">
              {eyebrow}
            </p>
            <h1 className="font-display text-[30px] font-semibold leading-tight text-[var(--ink)]">{title}</h1>
            {subtitle && <p className="font-body text-[12px] text-[var(--ink-muted)]">{subtitle}</p>}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
