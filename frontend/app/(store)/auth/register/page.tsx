'use client';

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Check, Eye, EyeOff, Mail, User } from "lucide-react";
import AuthSplit, {
  AuthButton,
  AuthField,
} from "@/components/store/auth/AuthSplit";
import { useAuth } from "@/context/AuthContext";

const VISUAL =
  "https://images.unsplash.com/photo-1700459075241-668708cf71db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080";

const INPUT =
  "w-full bg-transparent font-body text-[13px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]";

/**
 * A styled checkbox. The label sits beside the control (not inside it) so it
 * can contain links, and is tied to it with aria-labelledby.
 */
function Consent({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: React.ReactNode;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-[9px]">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        onClick={onToggle}
        className={`mt-[2px] flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-[1px] transition ${
          checked
            ? "bg-[var(--gold)]"
            : "border border-[var(--border-strong)] bg-[var(--surface)]"
        }`}
      >
        {checked && <Check size={10} className="text-[var(--noir)]" />}
      </button>
      <span id={`${id}-label`} className="font-body text-[12px] leading-[1.5] text-[var(--ink)]">
        {label}
      </span>
    </div>
  );
}

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!acceptedTerms) {
      setError("Please accept the Terms & Conditions to continue.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    // The API takes first and last name separately.
    const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
    if (!firstName) {
      setError("Please enter your name.");
      return;
    }

    setSubmitting(true);
    try {
      await register({
        firstName,
        lastName: rest.join(" ") || firstName,
        email: form.email,
        password: form.password,
      });
      toast.success("Welcome to the maison.");
      router.push(redirect);
    } catch (err) {
      const api = err as { errors?: { email?: string }; message?: string };
      setError(api?.errors?.email || api?.message || "Unable to create your account.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthSplit
      image={VISUAL}
      quote="“Every account begins with a jar, and ends with a ritual.”"
      attribution="EST. 1974 · RIYADH"
    >
      <h1 className="font-display text-[42px] leading-tight text-[var(--ink)]">
        Create your account
      </h1>
      <p className="font-body text-[13px] leading-[1.7] text-[var(--ink-muted)]">
        Join 41,000 members for early access to limited harvests and 10% off your first
        order.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <AuthField
          label="FULL NAME"
          trailing={<User size={15} className="shrink-0 text-[var(--ink-muted)]" />}
        >
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
            placeholder="Full name"
            className={INPUT}
          />
        </AuthField>

        <AuthField
          label="EMAIL ADDRESS"
          trailing={<Mail size={15} className="shrink-0 text-[var(--ink-muted)]" />}
        >
          <input
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="you@example.com"
            className={INPUT}
          />
        </AuthField>


        <AuthField
          label="PASSWORD"
          hint={
            <span className="font-body text-[10.5px] text-[var(--ink-muted)]">
              Strong password · 12+ characters, mixed case, one symbol
            </span>
          }
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
            value={form.password}
            onChange={(e) => set("password", e.target.value)}
            placeholder="••••••••••••"
            className={INPUT}
          />
        </AuthField>

        <Consent
          id="terms"
          checked={acceptedTerms}
          onToggle={() => setAcceptedTerms((v) => !v)}
          label={
            <>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="text-[var(--gold-deep)] underline underline-offset-2">
                Terms &amp; Conditions
              </Link>{" "}
              and{" "}
              <Link href="/privacy" target="_blank" className="text-[var(--gold-deep)] underline underline-offset-2">
                Privacy Policy
              </Link>
            </>
          }
        />

        {error && (
          <p className="font-body text-[12px] text-[var(--danger)]">{error}</p>
        )}

        <AuthButton disabled={submitting}>
          {submitting ? "CREATING ACCOUNT…" : "CREATE ACCOUNT"}
        </AuthButton>
      </form>

      <div className="flex items-center justify-center gap-1.5">
        <span className="font-body text-[12px] text-[var(--ink-muted)]">
          Already a member?
        </span>
        <Link
          href={`/auth/login${
            redirect !== "/" ? `?redirect=${encodeURIComponent(redirect)}` : ""
          }`}
          className="font-body text-[12px] font-bold text-[var(--gold-deep)] hover:underline"
        >
          Sign in
        </Link>
      </div>
    </AuthSplit>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          Loading…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
