'use client';

import Link from "next/link";

export default function LinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-[2px] border border-[var(--ink)] bg-[var(--ink)] px-[22px] py-[11px] font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
    >
      {label}
    </Link>
  );
}
