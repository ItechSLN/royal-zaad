'use client';

import { useState } from "react";
import { toast } from "sonner";
import Modal, { ModalButton } from "@/components/admin/form/Modal";
import { FieldShell } from "@/components/admin/form/Fields";
import { money } from "@/lib/admin-adapters";
import { updatePayout, type Payout, type PayoutDetail } from "@/services/marketplace-admin.service";
import { ErrorBox, errorLines, inputClass } from "./bits";

/** Mark a PENDING payout paid (needs the transfer reference) or cancel it. */
export default function PayoutDialog({
  payout,
  mode,
  onClose,
  onDone,
}: {
  payout: Payout | null;
  mode: "PAID" | "CANCELLED";
  onClose: () => void;
  onDone: (updated: PayoutDetail) => void | Promise<void>;
}) {
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const openKey = payout ? `${payout.id}:${mode}` : null;
  const [lastKey, setLastKey] = useState(openKey);
  if (openKey !== lastKey) {
    setLastKey(openKey);
    if (openKey) {
      setReference("");
      setNote(payout?.note ?? "");
      setMissing(false);
      setError(null);
    }
  }

  if (!payout) return null;

  const shopName = payout.vendor.shop?.name ?? payout.vendor.user?.email ?? "vendor";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (mode === "PAID" && !reference.trim()) {
      setMissing(true);
      return;
    }
    setBusy(true);
    try {
      const trimmedNote = note.trim();
      const updated = await updatePayout(
        payout.id,
        mode === "PAID"
          ? { status: "PAID", reference: reference.trim(), ...(trimmedNote ? { note: trimmedNote } : {}) }
          : { status: "CANCELLED", ...(trimmedNote ? { note: trimmedNote } : {}) }
      );
      toast.success(
        mode === "PAID"
          ? `Payout of ${money(updated.amount)} to ${shopName} marked paid.`
          : `Payout cancelled — its sub-orders are payable again.`
      );
      await onDone(updated);
      onClose();
    } catch (err: any) {
      setError(err);
      toast.error(errorLines(err, "Unable to update the payout.")[0]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      title={mode === "PAID" ? "Mark payout paid" : "Cancel payout"}
      subtitle={`${shopName} · ${money(payout.amount)} ${payout.currency} · ${payout.subOrderCount} sub-order(s)`}
      size="sm"
      onClose={onClose}
      footer={
        <>
          <ModalButton onClick={onClose}>Close</ModalButton>
          <ModalButton variant={mode === "PAID" ? "dark" : "danger"} type="submit" form="payout-form" disabled={busy}>
            {busy ? "Saving…" : mode === "PAID" ? "Mark paid" : "Cancel payout"}
          </ModalButton>
        </>
      }
    >
      <form id="payout-form" onSubmit={submit} className="flex flex-col gap-4">
        {mode === "PAID" ? (
          <FieldShell
            label="PAYMENT REFERENCE"
            help="The bank transfer or payment provider reference."
            error={missing ? "A payment reference is required" : undefined}
          >
            <input
              value={reference}
              autoFocus
              onChange={(e) => setReference(e.target.value)}
              placeholder="e.g. TRX-2026-00042"
              className={inputClass}
            />
          </FieldShell>
        ) : (
          <p className="font-body text-[12px] leading-relaxed text-[var(--ink-muted)]">
            The payout is cancelled and its sub-orders are released, so they show as payable again.
          </p>
        )}
        <FieldShell label="NOTE" help="Optional">
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${inputClass} resize-y`}
          />
        </FieldShell>
        <ErrorBox error={error} />
      </form>
    </Modal>
  );
}
