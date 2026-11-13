'use client';

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleCheck, CircleX } from "lucide-react";
import VendorAuthCard from "@/components/vendor/VendorAuthCard";
import { errorText } from "@/components/vendor/ui";
import { verifyEmail } from "@/services/vendor.service";

type Result = { state: "working" } | { state: "done"; message: string } | { state: "failed"; message: string };

function VerifyEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [result, setResult] = useState<Result>(
    token ? { state: "working" } : { state: "failed", message: "This confirmation link is missing its token." }
  );
  // Tokens are single-use: never post twice (React dev mode mounts effects twice).
  const sent = useRef(false);

  useEffect(() => {
    if (!token || sent.current) return;
    sent.current = true;
    verifyEmail(token)
      .then((r) => setResult({ state: "done", message: r.message || "Email confirmed." }))
      .catch((e) => setResult({ state: "failed", message: errorText(e, "We couldn't confirm your email.") }));
  }, [token]);

  return (
    <VendorAuthCard eyebrow="Email confirmation" title="Confirm your email">
      {result.state === "working" && (
        <p className="font-body text-[12.5px] text-[var(--ink-muted)]">Confirming your email…</p>
      )}
      {result.state === "done" && (
        <div className="flex items-start gap-3 rounded-[2px] border border-[var(--border)] bg-[var(--success-bg)] px-4 py-3">
          <CircleCheck size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
          <p className="font-body text-[12.5px] text-[var(--ink)]">{result.message} Thanks — you&apos;re all set.</p>
        </div>
      )}
      {result.state === "failed" && (
        <div className="flex flex-col gap-2 rounded-[2px] border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3">
          <span className="flex items-center gap-2 font-body text-[12.5px] font-semibold text-[var(--ink)]">
            <CircleX size={16} className="text-[var(--danger)]" /> {result.message}
          </span>
          <span className="font-body text-[11.5px] text-[var(--ink-muted)]">
            Sign in to your seller centre and use “Resend email” to get a new link.
          </span>
        </div>
      )}
      {result.state !== "working" && (
        <Link
          href="/vendor"
          className="inline-flex items-center justify-center rounded-[2px] border border-[var(--ink)] bg-[var(--ink)] px-4 py-[13px] font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
        >
          Go to your seller centre
        </Link>
      )}
    </VendorAuthCard>
  );
}

export default function VendorVerifyEmailPage() {
  return (
    <Suspense
      fallback={<p className="p-10 text-center font-body text-[12.5px] text-[var(--ink-muted)]">Loading…</p>}
    >
      <VerifyEmail />
    </Suspense>
  );
}
