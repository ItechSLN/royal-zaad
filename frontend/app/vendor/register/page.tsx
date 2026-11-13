'use client';

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleCheck } from "lucide-react";
import VendorAuthCard from "@/components/vendor/VendorAuthCard";
import { Btn, TextField } from "@/components/vendor/ui";
import {
  registerVendor,
  storeVendorToken,
  vendorVerifyHref,
  type RegisterVendorInput,
} from "@/services/vendor.service";

type Form = Required<Omit<RegisterVendorInput, "description" | "addressLine2" | "state">> & {
  description: string;
  addressLine2: string;
  state: string;
};

const EMPTY: Form = {
  firstName: "",
  lastName: "",
  email: "",
  password: "",
  shopName: "",
  phone: "",
  description: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4">
      <legend className="mb-3 font-body text-[10px] font-bold tracking-[2px] text-[var(--gold-deep)]">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

export default function VendorRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const set = (key: keyof Form) => (value: string) => {
    setForm((prev) => ({ ...prev, [key]: key === "country" ? value.toUpperCase().slice(0, 2) : value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.firstName.trim()) next.firstName = "First name is required";
    if (!form.lastName.trim()) next.lastName = "Last name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email";
    if (form.password.length < 8) next.password = "Password must be at least 8 characters";
    if (!form.shopName.trim()) next.shopName = "Shop name is required";
    if (form.country && !/^[A-Z]{2}$/.test(form.country)) next.country = "Use a 2-letter code, e.g. SA";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    if (!validate()) return;
    setSubmitting(true);

    // Only send what was filled in; the API treats the address as optional.
    const payload = Object.fromEntries(
      Object.entries(form)
        .map(([k, v]) => [k, k === "password" ? v : v.trim()])
        .filter(([, v]) => v !== "")
    ) as unknown as RegisterVendorInput;

    try {
      const result = await registerVendor(payload);
      storeVendorToken(result.token);
      if (result.verifyUrl) {
        // Development has no inbox: show the confirmation link before moving on.
        setVerifyUrl(result.verifyUrl);
        setSubmitting(false);
      } else {
        router.replace("/vendor");
      }
    } catch (error) {
      const api = error as { message?: string; errors?: Record<string, string> };
      setErrors(api.errors ?? {});
      setMessage(
        api.errors && Object.keys(api.errors).length
          ? "Please correct the highlighted fields."
          : (api.message ?? "Couldn't create your shop.")
      );
      setSubmitting(false);
    }
  };

  if (verifyUrl) {
    return (
      <VendorAuthCard eyebrow="Shop created" title="Your shop is ready to set up">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-3 rounded-[2px] border border-[var(--border)] bg-[var(--success-bg)] px-4 py-3">
            <CircleCheck size={18} className="mt-0.5 shrink-0 text-[var(--success)]" />
            <p className="font-body text-[12px] leading-[1.7] text-[var(--ink)]">
              We&apos;ve created <strong>{form.shopName}</strong>. It stays pending until the marketplace
              team approves it — you can add products and complete your shop settings now.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-[2px] border border-[var(--gold)] bg-[var(--warning-bg)] px-4 py-3">
            <p className="font-body text-[12px] text-[var(--ink)]">
              Confirm your email address. (Development mode: no email is sent, so use this link.)
            </p>
            <a
              href={vendorVerifyHref(verifyUrl)}
              className="font-body text-[12px] font-semibold text-[var(--gold-deep)] underline"
            >
              Confirm your email
            </a>
          </div>
          <Btn variant="dark" onClick={() => router.replace("/vendor")} className="py-[13px]">
            Go to your dashboard
          </Btn>
        </div>
      </VendorAuthCard>
    );
  }

  return (
    <VendorAuthCard
      wide
      eyebrow="Open a shop"
      title="Sell on Royal Zaad"
      subtitle="Create your seller account. The marketplace team reviews every new shop before it goes live."
    >
      <form className="flex flex-col gap-7" onSubmit={submit} noValidate>
        <Section title="YOUR ACCOUNT">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="FIRST NAME" name="firstName" autoComplete="given-name" value={form.firstName} error={errors.firstName} onChange={set("firstName")} />
            <TextField label="LAST NAME" name="lastName" autoComplete="family-name" value={form.lastName} error={errors.lastName} onChange={set("lastName")} />
            <TextField label="EMAIL" name="email" type="email" autoComplete="email" value={form.email} error={errors.email} onChange={set("email")} />
            <TextField label="PASSWORD" name="password" type="password" autoComplete="new-password" value={form.password} error={errors.password} help="At least 8 characters" onChange={set("password")} />
          </div>
        </Section>

        <Section title="YOUR SHOP">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="SHOP NAME" name="shopName" value={form.shopName} error={errors.shopName} onChange={set("shopName")} placeholder="Al Noor Honey" />
            <TextField label="PHONE" name="phone" type="tel" autoComplete="tel" value={form.phone} error={errors.phone} onChange={set("phone")} placeholder="+966 5x xxx xxxx" />
          </div>
          <TextField label="ABOUT YOUR SHOP (OPTIONAL)" name="description" textarea rows={3} value={form.description} error={errors.description} onChange={set("description")} />
        </Section>

        <Section title="SHOP ADDRESS">
          <p className="-mt-2 font-body text-[11px] leading-[1.6] text-[var(--ink-muted)]">
            Used to show customers how far away you are and to offer pickup. You can change it later.
          </p>
          <TextField label="ADDRESS LINE 1" name="addressLine1" autoComplete="address-line1" value={form.addressLine1} error={errors.addressLine1} onChange={set("addressLine1")} />
          <TextField label="ADDRESS LINE 2 (OPTIONAL)" name="addressLine2" autoComplete="address-line2" value={form.addressLine2} error={errors.addressLine2} onChange={set("addressLine2")} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <TextField label="CITY" name="city" autoComplete="address-level2" value={form.city} error={errors.city} onChange={set("city")} />
            <TextField label="POSTAL CODE" name="postalCode" autoComplete="postal-code" value={form.postalCode} error={errors.postalCode} onChange={set("postalCode")} />
            <TextField label="COUNTRY" name="country" autoComplete="country" value={form.country} error={errors.country} help="2-letter code, e.g. SA" onChange={set("country")} placeholder="SA" />
          </div>
        </Section>

        {message && (
          <p role="alert" className="font-body text-[12px] text-[var(--danger)]">
            {message}
          </p>
        )}

        <Btn type="submit" variant="gold" disabled={submitting} className="py-[14px]">
          {submitting ? "CREATING YOUR SHOP…" : "CREATE MY SHOP"}
        </Btn>
        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
          Already selling with us?{" "}
          <Link href="/vendor/login" className="font-semibold text-[var(--gold-deep)] underline">
            Sign in
          </Link>
        </p>
      </form>
    </VendorAuthCard>
  );
}
