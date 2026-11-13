'use client';

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck } from "lucide-react";
import AuthSplit from "@/components/store/auth/AuthSplit";
import { statusOf, useKeyedRequest } from "@/components/store/marketplace/useKeyedRequest";
import { verifyEmail } from "@/services/store-marketplace.service";

const SHELL = {
  image:
    "https://images.unsplash.com/photo-1700295278820-f898b9d12f47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
  quote: "“A good name is the first thing a house protects.”",
  attribution: "ROYAL ZAAD",
};

/**
 * A token can be used once. The request is shared per token so React's
 * development double-mount (or a re-render) can't spend it twice and then
 * report the second, failed attempt.
 */
const inflight = new Map<string, Promise<unknown>>();
const verifyOnce = (token: string) => {
  let pending = inflight.get(token);
  if (!pending) {
    pending = verifyEmail(token);
    inflight.set(token, pending);
  }
  return pending;
};

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const { loading, error } = useKeyedRequest(token || null, () => verifyOnce(token));

  if (!token) {
    return (
      <AuthSplit {...SHELL}>
        <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">Link incomplete</h1>
        <p className="font-body text-[13px] leading-[1.7] text-[var(--ink-muted)]">
          This confirmation link is missing its token. Open the link from your email again, or request a new one from
          your account.
        </p>
        <Link href="/" className="font-body text-[12px] font-bold text-[var(--gold-deep)] hover:underline">
          Back to Royal Zaad
        </Link>
      </AuthSplit>
    );
  }

  if (loading) {
    return (
      <AuthSplit {...SHELL}>
        <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">Confirming your email…</h1>
        <p role="status" className="font-body text-[13px] text-[var(--ink-muted)]">
          One moment while we check your link.
        </p>
      </AuthSplit>
    );
  }

  if (error) {
    const status = statusOf(error);
    const linkProblem = status === 400 || status === 404 || status === 410;
    return (
      <AuthSplit {...SHELL}>
        <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">
          {linkProblem ? "Link invalid or expired" : "We couldn't confirm your email"}
        </h1>
        <div className="flex items-start gap-3 rounded-[2px] border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-4">
          <CircleAlert size={16} className="mt-0.5 shrink-0 text-[var(--danger)]" />
          <span className="font-body text-[12px] leading-[1.6] text-[var(--ink)]">
            {linkProblem
              ? "This confirmation link is invalid, has already been used, or has expired. Sign in and request a new link from your account."
              : status === 429
                ? "Too many attempts. Please wait a minute and open the link again."
                : "Something went wrong on our side. Please open the link again in a moment."}
          </span>
        </div>
        <Link href="/auth/login" className="font-body text-[12px] font-bold text-[var(--gold-deep)] hover:underline">
          Sign in
        </Link>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit {...SHELL}>
      <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">Email confirmed</h1>
      <div className="flex items-start gap-3 rounded-[2px] border border-[var(--gold)] bg-[var(--warning-bg)] px-4 py-4">
        <CircleCheck size={16} className="mt-0.5 shrink-0 text-[var(--gold-deep)]" />
        <span className="font-body text-[12px] leading-[1.6] text-[var(--ink)]">
          Thank you — your email address is confirmed.
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <Link
          href="/"
          className="rounded-[2px] bg-[linear-gradient(180deg,#E7CFA3_0%,#D4AF37_45%,#B08D22_100%)] px-[34px] py-[15px] font-body text-[12px] font-bold tracking-[1.8px] text-[var(--noir)] transition hover:brightness-[1.06]"
        >
          CONTINUE TO ROYAL ZAAD
        </Link>
        <Link href="/vendor" className="font-body text-[12px] font-semibold text-[var(--gold-deep)] hover:underline">
          Selling with us? Go to your shop →
        </Link>
      </div>
    </AuthSplit>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={<p className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">Loading…</p>}
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
