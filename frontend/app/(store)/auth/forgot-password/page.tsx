'use client';

import { useState } from "react";
import Link from "next/link";
import { CircleCheck, Mail } from "lucide-react";
import AuthSplit, {
  AuthButton,
  AuthField,
} from "@/components/store/auth/AuthSplit";
import { forgotPassword } from "@/services/storefront-auth.service";

const VISUAL =
  "https://images.unsplash.com/photo-1700295278820-f898b9d12f47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

const STEPS = [
  "Enter your registered email address",
  "Open the secure link we send (valid 30 min)",
  "Choose a new password and sign back in",
];

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ message: string; resetUrl?: string } | null>(
    null
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      setResult(await forgotPassword(email));
    } catch {
      // Never reveal whether an address is registered.
      setResult({
        message: "If that email is registered, a reset link has been generated.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /** Masks the address the way the design shows it back. */
  const masked = email.replace(/^(.).*(@.*)$/, "$1•••$2");

  return (
    <AuthSplit
      image={VISUAL}
      quote="“Some things are worth the wait. A reset link is not one of them.”"
      attribution="WE REPLY IN 60 SECONDS"
    >
      <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">
        Reset your password
      </h1>
      <p className="font-body text-[13px] leading-[1.7] text-[var(--ink-muted)]">
        Enter the email linked to your account and we will send a secure reset link,
        valid for 30 minutes.
      </p>

      {result ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-[2px] border border-[var(--gold)] bg-[var(--warning-bg)] px-4 py-4">
            <CircleCheck size={16} className="mt-0.5 shrink-0 text-[var(--gold-deep)]" />
            <div className="flex flex-col gap-1">
              <span className="font-body text-[12.5px] font-semibold text-[var(--ink)]">
                Link sent — check your inbox
              </span>
              <span className="font-body text-[11.5px] leading-[1.6] text-[var(--ink-muted)]">
                We sent a reset link to {masked || "your inbox"}. Didn&apos;t arrive?
                Check your spam folder, or request another below.
              </span>
            </div>
          </div>

          {result.resetUrl && (
            <div className="flex flex-col gap-2 rounded-[2px] border border-dashed border-[var(--border-strong)] bg-[var(--admin-bg)] p-4">
              <span className="font-body text-[11.5px] font-semibold text-[var(--ink)]">
                No email service is configured in this environment.
              </span>
              <Link
                href={result.resetUrl}
                className="break-all font-body text-[11.5px] font-semibold text-[var(--gold-deep)] hover:underline"
              >
                {result.resetUrl}
              </Link>
            </div>
          )}

          <AuthButton type="button" onClick={() => setResult(null)}>
            SEND ANOTHER LINK
          </AuthButton>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <AuthField
            label="EMAIL ADDRESS"
            trailing={<Mail size={15} className="shrink-0 text-[var(--ink-muted)]" />}
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="noor@example.com"
              className="w-full bg-transparent font-body text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
          </AuthField>

          <AuthButton disabled={submitting}>
            {submitting ? "SENDING…" : "SEND RESET LINK"}
          </AuthButton>
        </form>
      )}

      <ol className="flex flex-col gap-3 border-t border-[var(--border)] pt-5">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3">
            <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] font-mono text-[10px] text-[var(--ink-muted)]">
              {i + 1}
            </span>
            <span className="font-body text-[12px] text-[var(--ink-muted)]">{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex items-center justify-center gap-1.5">
        <span className="font-body text-[12px] text-[var(--ink-muted)]">
          Remembered it?
        </span>
        <Link
          href="/auth/login"
          className="font-body text-[12px] font-bold text-[var(--gold-deep)] hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    </AuthSplit>
  );
}
