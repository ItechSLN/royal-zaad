'use client';

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, Mail, ShieldAlert } from "lucide-react";
import { resendVerification, vendorVerifyHref } from "@/services/vendor.service";
import { useVendorSession } from "./VendorSessionContext";
import { errorText } from "./ui";

/**
 * Tells the owner where their shop stands with the marketplace, on every page:
 * pending approval (and unconfirmed email), rejected or suspended.
 */
export default function VendorStatusBanner() {
  const { shop } = useVendorSession();
  const vendor = shop.vendor;
  const [sending, setSending] = useState(false);
  const [resent, setResent] = useState<{ message: string; verifyUrl?: string } | null>(null);
  const [error, setError] = useState("");

  if (!vendor) return null;
  const unverified = vendor.user ? !vendor.user.emailVerifiedAt : false;

  const resend = async () => {
    setSending(true);
    setError("");
    try {
      setResent(await resendVerification());
    } catch (e) {
      setError(errorText(e, "Couldn't send the email."));
    } finally {
      setSending(false);
    }
  };

  const emailPrompt = unverified && (
    <div className="flex flex-col gap-2 border-t border-[var(--border)] pt-3 sm:flex-row sm:items-center sm:justify-between">
      <span className="flex items-center gap-2 font-body text-[12px] text-[var(--ink)]">
        <Mail size={14} className="shrink-0 text-[var(--gold-deep)]" />
        Confirm your email ({vendor.user?.email}) — we sent you a link when you signed up.
      </span>
      <div className="flex flex-wrap items-center gap-3">
        {resent?.verifyUrl && (
          <a
            href={vendorVerifyHref(resent.verifyUrl)}
            className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)] underline"
          >
            Confirm your email
          </a>
        )}
        {resent && !resent.verifyUrl && (
          <span className="font-body text-[11px] text-[var(--success)]">{resent.message}</span>
        )}
        {error && <span className="font-body text-[11px] text-[var(--danger)]">{error}</span>}
        <button
          type="button"
          onClick={resend}
          disabled={sending}
          className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 font-body text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)] disabled:opacity-50"
        >
          {sending ? "Sending…" : "Resend email"}
        </button>
      </div>
    </div>
  );

  if (vendor.status === "ACTIVE") {
    if (!unverified) return null;
    return (
      <div role="status" className="mb-[18px] rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-4 pb-3">
        {emailPrompt}
      </div>
    );
  }

  const config =
    vendor.status === "PENDING"
      ? {
          icon: Clock,
          tone: "border-[var(--gold)] bg-[var(--warning-bg)]",
          title: "Your shop is awaiting approval",
          body: "Your products are hidden until the marketplace team approves your shop. You can finish your shop settings and prepare products in the meantime.",
        }
      : vendor.status === "REJECTED"
        ? {
            icon: ShieldAlert,
            tone: "border-[var(--danger)] bg-[var(--danger-bg)]",
            title: "Your shop application was not approved",
            body: "Your products aren't visible to customers. Update your shop details and contact the marketplace team to apply again.",
          }
        : {
            icon: AlertTriangle,
            tone: "border-[var(--danger)] bg-[var(--danger-bg)]",
            title: "Your shop is suspended",
            body: "Your products are hidden and can't be bought while the shop is suspended. Contact the marketplace team to resolve this.",
          };

  return (
    <div role="status" className={`mb-[18px] flex flex-col gap-3 rounded-[2px] border px-4 py-3 ${config.tone}`}>
      <div className="flex items-start gap-3">
        <config.icon size={18} className="mt-0.5 shrink-0 text-[var(--ink)]" />
        <div className="flex flex-col gap-1">
          <span className="font-body text-[12.5px] font-semibold text-[var(--ink)]">{config.title}</span>
          <span className="font-body text-[11.5px] leading-[1.6] text-[var(--ink-muted)]">{config.body}</span>
          {vendor.statusReason && vendor.status !== "PENDING" && (
            <span className="font-body text-[11.5px] text-[var(--ink)]">
              <strong>Reason:</strong> {vendor.statusReason}
            </span>
          )}
          {vendor.status !== "PENDING" && (
            <Link href="/contact" className="font-body text-[11px] font-semibold text-[var(--gold-deep)] underline">
              Contact the marketplace team
            </Link>
          )}
        </div>
      </div>
      {emailPrompt}
    </div>
  );
}
