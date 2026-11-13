'use client';

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Eye, EyeOff, Mail } from "lucide-react";
import AuthSplit, {
  AuthButton,
  AuthDivider,
  AuthField,
} from "@/components/store/auth/AuthSplit";
import { useAuth } from "@/context/AuthContext";

const VISUAL =
  "https://images.unsplash.com/photo-1567982047162-0e64527b364c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

/** lucide dropped brand marks in v1, so these are inline paths. */
const SOCIAL: { label: string; path: string }[] = [
  {
    label: "Google",
    path: "M21.6 12.2c0-.7-.06-1.4-.18-2.05H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.35Zm-9.6 9.8c2.7 0 4.96-.9 6.6-2.43l-3.2-2.5c-.9.6-2.05.95-3.4.95-2.6 0-4.8-1.75-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22Zm-5.6-5.98a6 6 0 0 1 0-3.84V9.6H3.1a10 10 0 0 0 0 8.98l3.3-2.56ZM12 5.98c1.47 0 2.8.5 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6c.8-2.36 3-4.12 5.6-4.12Z",
  },
  {
    label: "Facebook",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z",
  },
];

const INPUT =
  "w-full bg-transparent font-body text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push(redirect);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to log in. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplit
      image={VISUAL}
      quote="“The harvest waits for no one — but your account remembers everything.”"
      attribution="THE ZAAD LETTER"
    >
      <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">
        Welcome back
      </h1>
      <p className="font-body text-[13px] leading-[1.7] text-[var(--ink-muted)]">
        Sign in to track orders, manage returns and spend your Zaad points.
      </p>

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
            className={INPUT}
          />
        </AuthField>

        <AuthField
          label="PASSWORD"
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

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            role="checkbox"
            aria-checked={remember}
            onClick={() => setRemember((v) => !v)}
            className="flex items-center gap-[9px]"
          >
            <span
              className={`flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[1px] transition ${
                remember
                  ? "bg-[var(--gold)]"
                  : "border border-[var(--border-strong)] bg-[var(--surface)]"
              }`}
            >
              {remember && <Check size={10} className="text-[var(--noir)]" />}
            </span>
            <span className="font-body text-[12px] text-[var(--ink)]">
              Keep me signed in
            </span>
          </button>

          <Link
            href="/auth/forgot-password"
            className="font-body text-[12px] font-semibold text-[var(--gold-deep)] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {error && (
          <p className="font-body text-[12px] text-[var(--danger)]">{error}</p>
        )}

        <AuthButton disabled={submitting}>
          {submitting ? "SIGNING IN…" : "SIGN IN"}
        </AuthButton>
      </form>

      <AuthDivider />

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
        {SOCIAL.map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => toast.info(`${s.label} sign-in is not connected yet.`)}
            className="flex flex-1 items-center justify-center gap-2 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] py-3 transition hover:bg-[var(--cream-2)]"
          >
            <svg viewBox="0 0 24 24" className="h-[15px] w-[15px] fill-[var(--ink)]">
              <path d={s.path} />
            </svg>
            <span className="font-body text-[12px] font-semibold text-[var(--ink)]">
              {s.label}
            </span>
          </button>
        ))}
      </div>

      <div className="flex items-center justify-center gap-1.5">
        <span className="font-body text-[12px] text-[var(--ink-muted)]">
          New to the maison?
        </span>
        <Link
          href={`/auth/register${
            redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""
          }`}
          className="font-body text-[12px] font-bold text-[var(--gold-deep)] hover:underline"
        >
          Create an account
        </Link>
      </div>
    </AuthSplit>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
