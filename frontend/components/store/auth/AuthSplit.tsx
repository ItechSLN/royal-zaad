import type { ReactNode } from "react";
import BrandMark from "@/components/brand/BrandMark";
import Link from "next/link";

/**
 * The SF-10/11/12 auth shell: a full-height editorial panel on the left with
 * the brand mark and a pull quote, and the form centred on the right.
 * The visual collapses away below `lg`, where the form takes the full width.
 */
export default function AuthSplit({
  image,
  quote,
  attribution,
  children,
}: {
  image: string;
  quote: string;
  attribution: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[var(--cream)]">
      {/* Visual — 640px in the design, fixed so the form keeps its measure. */}
      <aside className="relative hidden w-[640px] shrink-0 flex-col justify-between overflow-hidden p-12 lg:flex">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--noir)]/45 via-[var(--noir)]/20 to-[var(--noir)]/75" />

        <Link href="/" className="relative flex items-center gap-3">
          <BrandMark size={44} className="shrink-0 text-[var(--gold)]" />
          <span className="flex flex-col gap-[3px]">
            <span className="font-display text-[26px] leading-none tracking-[6px] text-[var(--cream)]">
              ROYAL ZAAD
            </span>
            <span lang="ar" dir="rtl" className="font-arabic text-[20px] leading-none text-[var(--cream)]">
              الزاد الملكي
            </span>
            <span className="font-body text-[7.5px] tracking-[2.6px] text-[var(--gold)]">
              ZAAD OF NATURAL LUXURY
            </span>
          </span>
        </Link>

        <blockquote className="relative flex flex-col gap-[14px]">
          <p className="font-display text-[30px] font-light leading-[1.45] text-[var(--cream)]">
            {quote}
          </p>
          <cite className="font-body text-[11.5px] not-italic tracking-[1.2px] text-[var(--gold)]">
            {attribution}
          </cite>
        </blockquote>
      </aside>

      <main className="flex min-w-0 flex-1 items-center justify-center px-6 py-16 sm:px-12 lg:px-[120px]">
        <div className="flex w-full max-w-[560px] flex-col gap-5">{children}</div>
      </main>
    </div>
  );
}

/** Boxed field with the label above and an icon pinned inside, per the design. */
export function AuthField({
  label,
  hint,
  trailing,
  children,
}: {
  label: string;
  hint?: ReactNode;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-[7px]">
      <span className="font-body text-[10.5px] font-bold tracking-[1px] text-[var(--ink-muted)]">
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[14px] transition focus-within:border-[var(--gold)]">
        {children}
        {trailing}
      </div>
      {hint}
    </label>
  );
}

/** Gold gradient CTA — the C/Button Primary component. */
export function AuthButton({
  children,
  disabled,
  type = "submit",
  onClick,
}: {
  children: ReactNode;
  disabled?: boolean;
  type?: "submit" | "button";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full rounded-[2px] bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] px-[34px] py-[15px] font-body text-[12px] font-bold tracking-[1.8px] text-[var(--noir)] transition hover:brightness-[1.06] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function AuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="flex w-full items-center gap-[14px]">
      <span className="h-px flex-1 bg-[var(--border)]" />
      <span className="font-body text-[10px] tracking-[1.4px] text-[var(--ink-muted)]">
        {label}
      </span>
      <span className="h-px flex-1 bg-[var(--border)]" />
    </div>
  );
}
