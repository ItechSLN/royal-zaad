import type { ReactNode } from "react";

export type Tone = "success" | "warning" | "danger" | "info" | "neutral";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: "bg-[var(--success-bg)]", fg: "text-[var(--success)]" },
  warning: { bg: "bg-[var(--warning-bg)]", fg: "text-[var(--warning)]" },
  danger: { bg: "bg-[var(--danger-bg)]", fg: "text-[var(--danger)]" },
  info: { bg: "bg-[var(--info-bg)]", fg: "text-[var(--info)]" },
  neutral: { bg: "bg-[var(--cream-2)]", fg: "text-[var(--ink-muted)]" },
};

const DOTS: Record<Tone, string> = {
  success: "bg-[var(--success)]",
  warning: "bg-[var(--warning)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--ink-muted)]",
};

/** C/Status Badge — soft tint, 6px dot, 11px semibold label. */
export function StatusBadge({
  tone = "neutral",
  children,
  showDot = true,
  className = "",
}: {
  tone?: Tone;
  children: ReactNode;
  showDot?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-[6px] rounded-[2px] px-[12px] py-[6px] ${t.bg} ${className}`}
    >
      {showDot && <span className={`h-[6px] w-[6px] rounded-full ${DOTS[tone]}`} />}
      <span className={`font-body text-[11px] font-semibold tracking-[0.4px] ${t.fg}`}>
        {children}
      </span>
    </span>
  );
}

/** C/Gold Badge — gold hairline outline, uppercase micro-label. */
export function GoldBadge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-[2px] border border-[var(--gold)] px-[12px] py-[6px] ${className}`}
    >
      <span className="font-body text-[10px] font-bold tracking-[1.6px] text-[var(--gold)]">
        {children}
      </span>
    </span>
  );
}
