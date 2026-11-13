'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import VendorAuthCard from "@/components/vendor/VendorAuthCard";
import { Btn, TextField } from "@/components/vendor/ui";
import { storeVendorToken, vendorSignIn } from "@/services/vendor.service";

export default function VendorLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});
    setMessage("");
    try {
      const session = await vendorSignIn(email.trim(), password);
      storeVendorToken(session.token);
      router.replace("/vendor");
    } catch (error) {
      const api = error as { message?: string; errors?: Record<string, string> };
      setErrors(api.errors ?? {});
      setMessage(api.message ?? "Couldn't sign you in.");
      setSubmitting(false);
    }
  };

  return (
    <VendorAuthCard
      eyebrow="Seller sign in"
      title="Welcome back"
      subtitle="Sign in to manage your shop on Royal Zaad."
    >
      <form className="flex flex-col gap-5" onSubmit={submit} noValidate>
        <TextField
          label="EMAIL"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          error={errors.email}
          onChange={setEmail}
          placeholder="you@yourshop.com"
        />
        <TextField
          label="PASSWORD"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          error={errors.password}
          onChange={setPassword}
        />
        {message && !Object.keys(errors).length && (
          <p role="alert" className="font-body text-[12px] text-[var(--danger)]">
            {message}
          </p>
        )}
        <Btn type="submit" variant="gold" disabled={submitting} className="py-[14px]">
          {submitting ? "SIGNING IN…" : "SIGN IN"}
        </Btn>
        <div className="flex flex-wrap items-center justify-between gap-2 font-body text-[11.5px] text-[var(--ink-muted)]">
          <span>
            New to Royal Zaad?{" "}
            <Link href="/vendor/register" className="font-semibold text-[var(--gold-deep)] underline">
              Open a shop
            </Link>
          </span>
          <Link href="/auth/forgot-password" className="hover:text-[var(--ink)]">
            Forgot password?
          </Link>
        </div>
      </form>
    </VendorAuthCard>
  );
}
