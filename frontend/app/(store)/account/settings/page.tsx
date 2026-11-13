'use client';

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import AccountShell from "@/components/store/account/AccountShell";
import {
  changePassword,
  getProfile,
  updateProfile,
  type AccountProfile,
} from "@/services/account.service";

const LABEL = "font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]";
const INPUT =
  "w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)]";

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  error,
  trailing,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  error?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className={LABEL}>{label}</span>
      <div
        className={`flex items-center gap-2 rounded-[2px] border bg-[var(--surface)] px-[14px] transition focus-within:border-[var(--gold)] ${
          error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
        }`}
      >
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-transparent py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none"
        />
        {trailing}
      </div>
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5 border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-[22px] text-[var(--ink)]">{title}</h3>
        <p className="font-body text-[11.5px] leading-[1.7] text-[var(--ink-muted)]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

export default function AccountSettingsPage() {
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [details, setDetails] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [savingDetails, setSavingDetails] = useState(false);

  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [savingPw, setSavingPw] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await getProfile();
      setProfile(p);
      setDetails({
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        email: p.email ?? "",
        phone: p.phone ?? "",
      });
    } catch {
      /* the shell redirects when there is no session */
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setDetailErrors({});
    setSavingDetails(true);
    try {
      const emailChanged = !!profile && details.email !== profile.email;
      const updated = await updateProfile(details);
      setProfile(updated);
      toast.success(
        emailChanged
          ? "Your details have been updated. Use your new email the next time you sign in."
          : "Your details have been updated."
      );
    } catch (error) {
      const api = error as { errors?: Record<string, string>; message?: string };
      setDetailErrors(api?.errors ?? {});
      toast.error(api?.message ?? "Unable to save your details.");
    } finally {
      setSavingDetails(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwErrors({});

    if (pw.newPassword !== pw.confirm) {
      setPwErrors({ confirm: "The two passwords do not match" });
      return;
    }

    setSavingPw(true);
    try {
      await changePassword({
        currentPassword: pw.currentPassword,
        newPassword: pw.newPassword,
      });
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
      toast.success("Password changed.");
    } catch (error) {
      const api = error as { errors?: Record<string, string>; message?: string };
      setPwErrors(api?.errors ?? {});
      toast.error(api?.message ?? "Unable to change your password.");
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <AccountShell
      title="Account settings"
      subtitle="Your details and sign-in credentials."
    >
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel
          title="Your details"
          subtitle="Used on orders, invoices and delivery notes."
        >
          <form onSubmit={saveDetails} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="FIRST NAME"
                value={details.firstName}
                error={detailErrors.firstName}
                onChange={(v) => setDetails((p) => ({ ...p, firstName: v }))}
              />
              <Field
                label="LAST NAME"
                value={details.lastName}
                error={detailErrors.lastName}
                onChange={(v) => setDetails((p) => ({ ...p, lastName: v }))}
              />
            </div>
            <Field
              label="EMAIL"
              type="email"
              value={details.email}
              error={detailErrors.email}
              onChange={(v) => setDetails((p) => ({ ...p, email: v }))}
            />
            <Field
              label="PHONE"
              value={details.phone}
              error={detailErrors.phone}
              placeholder="+966 55 214 8890"
              onChange={(v) => setDetails((p) => ({ ...p, phone: v }))}
            />
            <button
              type="submit"
              disabled={savingDetails}
              className="self-start rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:opacity-50"
            >
              {savingDetails ? "Saving…" : "Save changes"}
            </button>
          </form>
        </Panel>

        <Panel
          title="Password"
          subtitle="Changing this signs you out of nothing else — your current session stays active."
        >
          <form onSubmit={savePassword} className="flex flex-col gap-4">
            <Field
              label="CURRENT PASSWORD"
              type={showPw ? "text" : "password"}
              value={pw.currentPassword}
              error={pwErrors.currentPassword}
              onChange={(v) => setPw((p) => ({ ...p, currentPassword: v }))}
              trailing={
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide passwords" : "Show passwords"}
                  className="shrink-0 text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <Field
              label="NEW PASSWORD"
              type={showPw ? "text" : "password"}
              value={pw.newPassword}
              error={pwErrors.newPassword}
              placeholder="At least 6 characters"
              onChange={(v) => setPw((p) => ({ ...p, newPassword: v }))}
            />
            <Field
              label="CONFIRM NEW PASSWORD"
              type={showPw ? "text" : "password"}
              value={pw.confirm}
              error={pwErrors.confirm}
              onChange={(v) => setPw((p) => ({ ...p, confirm: v }))}
            />
            <button
              type="submit"
              disabled={savingPw}
              className="self-start rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:opacity-50"
            >
              {savingPw ? "Changing…" : "Change password"}
            </button>
          </form>
        </Panel>
      </div>

      {profile?.memberSince && (
        <p className="font-body text-[11px] text-[var(--ink-muted)]">
          Member since{" "}
          {new Date(profile.memberSince).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
          .
        </p>
      )}
    </AccountShell>
  );
}
