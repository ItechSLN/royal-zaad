'use client';

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { MapPin, Plus, Trash2 } from "lucide-react";
import AccountShell from "@/components/store/account/AccountShell";
import {
  createAddress,
  deleteAddress,
  getMyAddresses,
  type Address,
  type AddressFormData,
} from "@/services/store-addresses.service";

const EMPTY: AddressFormData = {
  recipientName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "SA",
  phone: "",
  isDefault: false,
};

const LABEL = "font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]";
const INPUT =
  "w-full rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)]";

function Field({
  label,
  value,
  onChange,
  placeholder,
  error,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className={LABEL}>{label}</span>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} ${error ? "border-[var(--danger)]" : ""}`}
      />
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

export default function AddressesPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Address | null>(null);

  const load = useCallback(async () => {
    try {
      setAddresses(await getMyAddresses());
      setLoadError(null);
    } catch (error) {
      setLoadError((error as { message?: string })?.message ?? "We couldn't load your addresses.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key: keyof AddressFormData, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSaving(true);
    try {
      await createAddress(form);
      setForm(EMPTY);
      setOpen(false);
      await load();
      toast.success("Address saved.");
    } catch (error) {
      const api = error as { errors?: Record<string, string>; message?: string };
      setErrors(api?.errors ?? {});
      toast.error(api?.message ?? "Unable to save that address.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteAddress(pendingDelete.id);
      await load();
      toast.success("Address removed.");
    } catch (error) {
      const api = error as { message?: string };
      toast.error(api?.message ?? "Unable to remove that address.");
    }
    setPendingDelete(null);
  };

  return (
    <AccountShell
      title="Addresses"
      subtitle="Where we deliver. The default is preselected at checkout."
      action={
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2.5 font-body text-[11.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
        >
          <Plus size={13} /> {open ? "Cancel" : "Add address"}
        </button>
      }
    >
      {open && (
        <form
          onSubmit={submit}
          className="flex flex-col gap-4 border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <h3 className="font-display text-[20px] text-[var(--ink)]">New address</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="RECIPIENT NAME" required value={form.recipientName} error={errors.recipientName} placeholder="Noor Al Amin" onChange={(v) => set("recipientName", v)} />
            <Field label="PHONE" value={form.phone} error={errors.phone} placeholder="+966 55 214 8890" onChange={(v) => set("phone", v)} />
          </div>

          <Field label="ADDRESS LINE 1" required value={form.line1} error={errors.line1} placeholder="Villa 22, Al Nakheel District" onChange={(v) => set("line1", v)} />
          <Field label="ADDRESS LINE 2" value={form.line2} placeholder="King Fahd Road" onChange={(v) => set("line2", v)} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="CITY" required value={form.city} error={errors.city} placeholder="Riyadh" onChange={(v) => set("city", v)} />
            <Field label="REGION" value={form.state} placeholder="Riyadh Province" onChange={(v) => set("state", v)} />
            <Field label="POSTAL CODE" required value={form.postalCode} error={errors.postalCode} placeholder="12381" onChange={(v) => set("postalCode", v)} />
          </div>

          <label className="flex w-full flex-col gap-2 sm:max-w-[220px]">
            <span className={LABEL}>COUNTRY</span>
            <select
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
              className={INPUT}
            >
              {[
                { code: "SA", name: "Saudi Arabia" },
                { code: "AE", name: "United Arab Emirates" },
                { code: "QA", name: "Qatar" },
                { code: "KW", name: "Kuwait" },
                { code: "BH", name: "Bahrain" },
                { code: "OM", name: "Oman" },
              ].map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            role="checkbox"
            aria-checked={form.isDefault}
            onClick={() => set("isDefault", !form.isDefault)}
            className="flex items-center gap-[9px] self-start"
          >
            <span
              className={`flex h-[15px] w-[15px] items-center justify-center rounded-[1px] transition ${
                form.isDefault
                  ? "bg-[var(--gold)]"
                  : "border border-[var(--border-strong)] bg-[var(--surface)]"
              }`}
            />
            <span className="font-body text-[12px] text-[var(--ink)]">
              Use as my default delivery address
            </span>
          </button>

          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save address"}
          </button>
        </form>
      )}

      {loading ? (
        <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">Loading…</p>
      ) : loadError ? (
        <p className="py-16 text-center font-body text-[12.5px] text-[var(--ink-muted)]">
          {loadError}{" "}
          <button type="button" onClick={load} className="font-semibold text-[var(--gold-deep)] underline">
            Try again
          </button>
        </p>
      ) : addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--cream-2)]">
            <MapPin size={20} className="text-[var(--gold-deep)]" />
          </span>
          <h2 className="font-display text-[24px] text-[var(--ink)]">No addresses yet</h2>
          <p className="max-w-[420px] font-body text-[12.5px] leading-[1.8] text-[var(--ink-muted)]">
            Add one here, or at checkout — whichever suits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <div
              key={a.id}
              className={`flex flex-col gap-2 border bg-[var(--surface)] p-5 ${
                a.isDefault ? "border-[var(--gold)]" : "border-[var(--border)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <span className="font-body text-[13px] font-semibold text-[var(--ink)]">
                  {a.recipientName}
                </span>
                {a.isDefault && (
                  <span className="rounded-[2px] bg-[var(--warning-bg)] px-2 py-1 font-body text-[9px] font-bold tracking-[1.2px] text-[var(--gold-deep)]">
                    DEFAULT
                  </span>
                )}
              </div>

              <p className="font-body text-[11.5px] leading-[1.7] text-[var(--ink-muted)]">
                {a.line1}
                {a.line2 ? `, ${a.line2}` : ""}
                <br />
                {a.city}
                {a.state ? `, ${a.state}` : ""} {a.postalCode}
                <br />
                {a.country}
                {a.phone ? ` · ${a.phone}` : ""}
              </p>

              <button
                type="button"
                onClick={() => setPendingDelete(a)}
                className="mt-1 flex items-center gap-1.5 self-start font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--danger)]"
              >
                <Trash2 size={12} /> Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--noir)]/50 px-4">
          <div className="flex w-full max-w-[400px] flex-col gap-4 rounded-[2px] bg-[var(--surface)] p-6">
            <h3 className="font-display text-[22px] text-[var(--ink)]">Remove address</h3>
            <p className="font-body text-[12.5px] leading-[1.7] text-[var(--ink-muted)]">
              Remove the address for {pendingDelete.recipientName}? Orders already placed keep
              the address they were shipped to.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPendingDelete(null)}
                className="rounded-[2px] border border-[var(--border-strong)] px-4 py-2.5 font-body text-[12px] font-semibold text-[var(--ink)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                className="rounded-[2px] bg-[var(--danger)] px-4 py-2.5 font-body text-[12px] font-semibold text-white"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
}
