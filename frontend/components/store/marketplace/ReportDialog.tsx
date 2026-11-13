"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flag, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { REPORT_REASONS, submitReport, type ReportReason } from "@/services/store-marketplace.service";

type Target = { type: "PRODUCT"; productId: string; name: string } | { type: "SHOP"; shopId: string; name: string };

/**
 * "Report this product / shop" link and its dialog. Reporting needs a signed-in
 * customer; anyone else is asked to sign in first.
 */
export default function ReportLink({ target, className = "" }: { target: Target; className?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noun = target.type === "PRODUCT" ? "product" : "shop";

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const openDialog = () => {
    setReason("");
    setDetails("");
    setError(null);
    setDone(false);
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      setError("Choose a reason.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitReport(
        target.type === "PRODUCT"
          ? { targetType: "PRODUCT", productId: target.productId, reason, details }
          : { targetType: "SHOP", shopId: target.shopId, reason, details }
      );
      setDone(true);
      toast.success("Thanks — our team will review your report.");
    } catch (err) {
      const api = err as { status?: number; message?: string; errors?: Record<string, string> };
      if (api?.status === 404 && /cannot post/i.test(api.message ?? "")) {
        setError("Reporting isn't available just yet. Please contact us instead.");
      } else if (api?.status === 401) {
        setError("Your session has ended. Please sign in again to send a report.");
      } else {
        setError(
          (api?.errors && Object.values(api.errors)[0]) || api?.message || "We couldn't send your report. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        className={`inline-flex items-center gap-1.5 font-body text-[11px] text-[var(--ink-muted)] underline-offset-2 transition hover:text-[var(--danger)] hover:underline ${className}`}
      >
        <Flag size={11} />
        Report this {noun}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={(e) => {
          // Clicking the backdrop closes the dialog.
          if (e.target === dialogRef.current) setOpen(false);
        }}
        className="m-auto w-[440px] max-w-[calc(100vw-32px)] rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-0 text-[var(--ink)] backdrop:bg-[var(--noir)]/60"
      >
        {open && (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1">
                <h2 id={titleId} className="font-display text-[24px] leading-tight">
                  Report this {noun}
                </h2>
                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">{target.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
              >
                <X size={16} />
              </button>
            </div>

            {!user ? (
              <div className="flex flex-col gap-4">
                <p className="font-body text-[12.5px] leading-[1.7] text-[var(--ink-muted)]">
                  Please sign in to report a {noun}. Reports are reviewed by our team and tied to your account so we
                  can follow up.
                </p>
                <Link
                  href={`/auth/login?redirect=${encodeURIComponent(pathname || "/")}`}
                  className="self-start rounded-[2px] bg-[var(--ink)] px-5 py-[11px] font-body text-[11.5px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
                >
                  Sign in to report
                </Link>
              </div>
            ) : done ? (
              <div className="flex flex-col gap-4">
                <p className="font-body text-[12.5px] leading-[1.7] text-[var(--ink-muted)]">
                  Thank you. Your report has been sent to our marketplace team for review.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="self-start rounded-[2px] bg-[var(--ink)] px-5 py-[11px] font-body text-[11.5px] font-semibold text-[var(--cream)]"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-4">
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-2 font-body text-[11px] font-bold tracking-[1.2px] text-[var(--ink)]">
                    WHAT&apos;S WRONG?
                  </legend>
                  {REPORT_REASONS.map((r) => (
                    <label key={r.value} className="flex cursor-pointer items-center gap-2.5 font-body text-[12.5px]">
                      <input
                        type="radio"
                        name="report-reason"
                        value={r.value}
                        checked={reason === r.value}
                        onChange={() => setReason(r.value)}
                      />
                      {r.label}
                    </label>
                  ))}
                </fieldset>

                <label className="flex flex-col gap-1.5">
                  <span className="font-body text-[11px] font-bold tracking-[1.2px] text-[var(--ink)]">
                    DETAILS <span className="font-normal tracking-normal text-[var(--ink-muted)]">(optional)</span>
                  </span>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    maxLength={2000}
                    rows={4}
                    className="w-full rounded-[2px] border border-[var(--border-strong)] px-3 py-2 font-body text-[12.5px] outline-none focus:border-[var(--gold)]"
                  />
                </label>

                {error && (
                  <p role="alert" className="font-body text-[11.5px] text-[var(--danger)]">
                    {error}
                  </p>
                )}

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-[2px] bg-[var(--ink)] px-5 py-[11px] font-body text-[11.5px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:opacity-60"
                  >
                    {submitting ? "Sending…" : "Send report"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="font-body text-[11.5px] text-[var(--ink-muted)] hover:text-[var(--ink)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
