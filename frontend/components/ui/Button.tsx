import Link from "next/link";
import type { ReactNode } from "react";

type Variant = "primary" | "ghost" | "dark" | "soft";

const VARIANTS: Record<Variant, string> = {
  // C/Button Primary — vertical champagne → gold → deep gold gradient
  primary:
    "bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] text-[var(--noir)] font-bold tracking-[1.8px] text-[12px] px-[34px] py-[15px] gap-[10px] hover:brightness-[1.06]",
  // C/Button Ghost — gold hairline outline
  ghost:
    "border border-[var(--gold)] text-[var(--gold)] font-semibold tracking-[1.8px] text-[12px] px-[34px] py-[15px] gap-[10px] hover:bg-[var(--gold)]/10",
  // C/Button Dark — solid ink
  dark:
    "bg-[var(--ink)] text-[var(--cream)] font-semibold text-[13px] px-[26px] py-[13px] gap-[8px] hover:bg-[var(--charcoal)]",
  // C/Button Soft — white with strong hairline
  soft:
    "bg-[var(--surface)] border border-[var(--border-strong)] text-[var(--ink)] font-semibold text-[13px] px-[22px] py-[13px] gap-[8px] hover:bg-[var(--cream-2)]",
};

const BASE =
  "inline-flex items-center justify-center rounded-[2px] font-body transition disabled:cursor-not-allowed disabled:opacity-50";

type CommonProps = {
  variant?: Variant;
  className?: string;
  children: ReactNode;
};

type ButtonProps = CommonProps & {
  href?: undefined;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

type AnchorProps = CommonProps & {
  href: string;
};

export default function Button(props: ButtonProps | AnchorProps) {
  const { variant = "primary", className = "", children } = props;
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  if ("href" in props && props.href) {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { variant: _v, className: _c, children: _ch, ...rest } = props as ButtonProps;
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}
