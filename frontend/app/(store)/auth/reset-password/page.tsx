'use client';

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CircleCheck, Eye, EyeOff } from "lucide-react";
import AuthSplit, {
  AuthButton,
  AuthField,
} from "@/components/store/auth/AuthSplit";
import { resetPassword } from "@/services/storefront-auth.service";

/** Shares SF-12's visual — this screen is the second half of that flow. */
const VISUAL =
  "https://images.unsplash.com/photo-1700295278820-f898b9d12f47?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

const INPUT =
  "w-full bg-transparent font-body text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]";

const SHELL = {
  image: VISUAL,
  quote: "“Some things are worth the wait. A reset link is not one of them.”",
  attribution: "WE REPLY IN 60 SECONDS",
};

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setSuccess(true);
      toast.success("Password reset successfully.");
    } catch (err) {
      const api = err as { errors?: { token?: string }; message?: string };
      setError(api?.errors?.token || api?.message || "Unable to reset your password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <AuthSplit {...SHELL}>
        <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">
          Link incomplete
        </h1>
        <p className="font-body text-[13px] leading-[1.7] text-[var(--ink-muted)]">
          This reset link is missing its token. Request a fresh one and we will send it
          straight over.
        </p>
        <Link
          href="/auth/forgot-password"
          className="font-body text-[12px] font-bold text-[var(--gold-deep)] hover:underline"
        >
          Request a new link
        </Link>
      </AuthSplit>
    );
  }

  if (success) {
    return (
      <AuthSplit {...SHELL}>
        <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">
          Password updated
        </h1>
        <div className="flex items-start gap-3 rounded-[2px] border border-[var(--gold)] bg-[var(--warning-bg)] px-4 py-4">
          <CircleCheck size={16} className="mt-0.5 shrink-0 text-[var(--gold-deep)]" />
          <span className="font-body text-[12px] leading-[1.6] text-[var(--ink)]">
            Your password has been changed. Sign in with it to pick up where you left
            off.
          </span>
        </div>
        <AuthButton type="button" onClick={() => router.push("/auth/login")}>
          SIGN IN
        </AuthButton>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit {...SHELL}>
      <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">
        Choose a new password
      </h1>
      <p className="font-body text-[13px] leading-[1.7] text-[var(--ink-muted)]">
        Pick something you have not used before — 12+ characters, mixed case and one
        symbol keeps the account safest.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField
          label="NEW PASSWORD"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="shrink-0 text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          }
        >
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className={INPUT}
          />
        </AuthField>

        <AuthField label="CONFIRM PASSWORD">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••••••"
            className={INPUT}
          />
        </AuthField>

        {error && (
          <p className="font-body text-[12px] text-[var(--danger)]">{error}</p>
        )}

        <AuthButton disabled={submitting}>
          {submitting ? "UPDATING…" : "UPDATE PASSWORD"}
        </AuthButton>
      </form>

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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
