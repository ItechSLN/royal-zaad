import Link from "next/link";
import { Lock } from "lucide-react";
import CheckoutSteps from "@/components/store/common/CheckoutSteps";
import BrandMark from "@/components/brand/BrandMark";

/** Stripped checkout chrome from SF-06 / SF-07 — wordmark, TLS note, step rail. */
export default function CheckoutNav({ current }: { current: number }) {
  return (
    <div className="bg-[var(--noir)]">
      <div className="flex items-center justify-between px-6 py-6 lg:px-12">
        <Link href="/" className="flex items-center gap-[10px]">
          <BrandMark size={30} className="shrink-0 text-[var(--gold)]" />
          <span className="flex flex-col gap-[2px]">
          <span className="font-display text-[22px] leading-none tracking-[5px] text-[var(--cream)]">
            ROYAL ZAAD
          </span>
          <span className="font-body text-[7px] tracking-[2.6px] text-[var(--gold)]">
            SECURE CHECKOUT
          </span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Lock size={13} className="text-[var(--gold)]" />
          <span className="font-body text-[11px] text-[var(--text-muted-dark)]">
            256-bit TLS · PCI DSS Level 1
          </span>
        </div>
      </div>

      <div className="h-px w-full bg-[var(--hairline)]" />

      <div className="px-6 py-5 lg:px-12">
        <CheckoutSteps current={current} onDark />
      </div>
    </div>
  );
}
