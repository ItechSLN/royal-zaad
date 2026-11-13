'use client';

import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ImagePlus, MapPin, Plus, Save, X } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import { StatusBadge } from "@/components/ui/Badge";
import { useVendorSession } from "@/components/vendor/VendorSessionContext";
import { Btn, Panel, Row, TextField, Toggle, errorText, fmtDate } from "@/components/vendor/ui";
import {
  WEEKDAYS,
  updateVendorShop,
  uploadShopLogo,
  type OpeningHours,
  type UpdateShopInput,
  type VendorShop,
  type Weekday,
} from "@/services/vendor.service";

const DAY_NAMES: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

type Slot = { open: string; close: string };
type Hours = Record<Weekday, Slot[]>;

const TEXT_FIELDS = [
  "name",
  "description",
  "email",
  "phone",
  "addressLine1",
  "addressLine2",
  "city",
  "state",
  "postalCode",
  "country",
] as const;
type TextKey = (typeof TEXT_FIELDS)[number];

type Form = Record<TextKey, string> & {
  offersDelivery: boolean;
  offersPickup: boolean;
  deliversAnywhere: boolean;
  deliveryRadiusKm: string;
  shippingFlatFee: string;
  freeShippingOver: string;
  hoursEnabled: boolean;
  hours: Hours;
};

const toHours = (h: OpeningHours | null): Hours =>
  Object.fromEntries(WEEKDAYS.map((d) => [d, h?.[d]?.map((s) => ({ ...s })) ?? []])) as Hours;

const fromShop = (s: VendorShop): Form => ({
  ...(Object.fromEntries(TEXT_FIELDS.map((k) => [k, (s[k] as string | null) ?? ""])) as Record<TextKey, string>),
  offersDelivery: s.offersDelivery,
  offersPickup: s.offersPickup,
  deliversAnywhere: s.deliveryRadiusKm === null,
  deliveryRadiusKm: s.deliveryRadiusKm === null ? "" : String(s.deliveryRadiusKm),
  shippingFlatFee: s.shippingFlatFee ?? "",
  freeShippingOver: s.freeShippingOver ?? "",
  hoursEnabled: s.openingHours !== null,
  hours: toHours(s.openingHours),
});

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

export default function VendorShopPage() {
  const { shop, mergeShop } = useVendorSession();
  const [form, setForm] = useState<Form>(() => fromShop(shop));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [locationMessage, setLocationMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  const baseline = useMemo(() => fromShop(shop), [shop]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key as string]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const setSlot = (day: Weekday, i: number, patch: Partial<Slot>) =>
    set("hours", {
      ...form.hours,
      [day]: form.hours[day].map((s, n) => (n === i ? { ...s, ...patch } : s)),
    });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Shop name is required";
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email";
    if (form.country.trim() && !/^[A-Z]{2}$/.test(form.country.trim())) next.country = "2-letter code, e.g. SA";
    if (!form.offersDelivery && !form.offersPickup) next.offersDelivery = "Offer delivery, pickup, or both";
    if (form.offersDelivery && !form.deliversAnywhere) {
      const r = Number(form.deliveryRadiusKm);
      if (form.deliveryRadiusKm.trim() === "" || Number.isNaN(r) || r < 0.5 || r > 500)
        next.deliveryRadiusKm = "Between 0.5 and 500 km";
    }
    for (const key of ["shippingFlatFee", "freeShippingOver"] as const) {
      const v = form[key].trim();
      if (v && (Number.isNaN(Number(v)) || Number(v) < 0)) next[key] = "Enter an amount, or leave blank";
    }
    if (form.hoursEnabled) {
      for (const day of WEEKDAYS) {
        if (form.hours[day].some((s) => !s.open || !s.close || s.open >= s.close)) {
          next.openingHours = `${DAY_NAMES[day]}: opening time must be before closing time`;
          break;
        }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  /** Only send what changed — an unchanged address shouldn't re-geocode. */
  const buildPatch = (): UpdateShopInput => {
    const patch: UpdateShopInput = {};
    for (const key of TEXT_FIELDS) {
      const v = form[key].trim();
      if (v === baseline[key].trim()) continue;
      // The API validates these formats, so a cleared value can't be sent.
      if ((key === "email" || key === "country" || key === "name") && v === "") continue;
      (patch as Record<string, string>)[key] = v;
    }
    if (form.offersDelivery !== baseline.offersDelivery) patch.offersDelivery = form.offersDelivery;
    if (form.offersPickup !== baseline.offersPickup) patch.offersPickup = form.offersPickup;

    const radius = form.deliversAnywhere ? null : numOrNull(form.deliveryRadiusKm);
    if (radius !== shop.deliveryRadiusKm && form.offersDelivery) patch.deliveryRadiusKm = radius;

    const fee = numOrNull(form.shippingFlatFee);
    if (fee !== numOrNull(baseline.shippingFlatFee)) patch.shippingFlatFee = fee;
    const free = numOrNull(form.freeShippingOver);
    if (free !== numOrNull(baseline.freeShippingOver)) patch.freeShippingOver = free;

    const hours: OpeningHours | null = form.hoursEnabled ? { ...form.hours } : null;
    if (JSON.stringify(hours) !== JSON.stringify(baseline.hoursEnabled ? baseline.hours : null))
      patch.openingHours = hours;
    return patch;
  };

  const save = async () => {
    setMessage("");
    setLocationMessage("");
    if (!validate()) {
      setMessage("Check the highlighted fields.");
      return;
    }
    const patch = buildPatch();
    if (Object.keys(patch).length === 0) {
      toast.info("Nothing to save.");
      return;
    }
    setSaving(true);
    try {
      const updated = await updateVendorShop(patch);
      if (updated.locationMessage) setLocationMessage(updated.locationMessage);
      const { locationMessage: _drop, ...rest } = updated;
      void _drop;
      mergeShop(rest);
      setForm(fromShop({ ...shop, ...rest }));
      toast.success("Shop settings saved.");
    } catch (e) {
      const api = e as { errors?: Record<string, string> };
      setErrors(api.errors ?? {});
      setMessage(errorText(e, "Couldn't save your settings."));
    } finally {
      setSaving(false);
    }
  };

  const pickLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      const updated = await uploadShopLogo(file);
      mergeShop({ logoUrl: updated.logoUrl });
      toast.success("Logo updated.");
    } catch (e) {
      toast.error(errorText(e, "Couldn't upload the logo."));
    } finally {
      setUploading(false);
    }
  };

  const verified = !!shop.locationVerifiedAt;
  console.log(shop);
  console.log(verified);

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar title="Shop settings" subtitle="How your shop appears to customers, where it is, and how you deliver.">
        <Btn variant="dark" onClick={save} disabled={saving}>
          <Save size={13} /> {saving ? "Saving…" : "Save changes"}
        </Btn>
      </ActionBar>

      {message && (
        <p role="alert" className="rounded-[2px] border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 font-body text-[12px] text-[var(--danger)]">
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.6fr)_1fr]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Panel title="Profile">
            <div className="flex items-center gap-4">
              <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-dashed border-[var(--border-strong)] bg-[var(--admin-bg)]">
                {shop.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shop.logoUrl} alt="Shop logo" className="h-full w-full object-cover" />
                ) : (
                  <ImagePlus size={18} className="text-[var(--ink-muted)]" />
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Btn onClick={() => logoInput.current?.click()} disabled={uploading}>
                  {uploading ? "Uploading…" : shop.logoUrl ? "Change logo" : "Upload logo"}
                </Btn>
                <span className="font-body text-[10.5px] text-[var(--ink-muted)]">JPG, PNG, WEBP or GIF up to 5 MB. Uploads immediately.</span>
              </div>
              <input
                ref={logoInput}
                type="file"
                name="logo"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  void pickLogo(file);
                }}
              />
            </div>
            <TextField label="SHOP NAME" name="name" value={form.name} error={errors.name} onChange={(v) => set("name", v)} />
            <TextField label="ABOUT YOUR SHOP" name="description" textarea rows={4} value={form.description} error={errors.description} onChange={(v) => set("description", v)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="CONTACT EMAIL" name="email" type="email" value={form.email} error={errors.email} onChange={(v) => set("email", v)} />
              <TextField label="PHONE" name="phone" type="tel" value={form.phone} error={errors.phone} onChange={(v) => set("phone", v)} />
            </div>
          </Panel>

          <Panel
            title="Address"
            subtitle="Customers see your distance from them once the address is located. Changing it re-checks the location."
            action={
              verified ? (
                <StatusBadge tone="success">Location verified</StatusBadge>
              ) : (
                <StatusBadge tone="warning">Not located</StatusBadge>
              )
            }
          >
            {locationMessage && (
              <p
                role="status"
                className={`flex items-start gap-2 rounded-[2px] border px-4 py-3 font-body text-[12px] ${
                  verified ? "border-[var(--border)] bg-[var(--success-bg)]" : "border-[var(--gold)] bg-[var(--warning-bg)]"
                } text-[var(--ink)]`}
              >
                {verified ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[var(--success)]" /> : <MapPin size={14} className="mt-0.5 shrink-0" />}
                {locationMessage}
              </p>
            )}
            <TextField label="ADDRESS LINE 1" name="addressLine1" value={form.addressLine1} error={errors.addressLine1} onChange={(v) => set("addressLine1", v)} />
            <TextField label="ADDRESS LINE 2" name="addressLine2" value={form.addressLine2} error={errors.addressLine2} onChange={(v) => set("addressLine2", v)} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="CITY" name="city" value={form.city} error={errors.city} onChange={(v) => set("city", v)} />
              <TextField label="STATE / REGION" name="state" value={form.state} error={errors.state} onChange={(v) => set("state", v)} />
              <TextField label="POSTAL CODE" name="postalCode" value={form.postalCode} error={errors.postalCode} onChange={(v) => set("postalCode", v)} />
              <TextField label="COUNTRY" name="country" value={form.country} error={errors.country} help="2-letter code, e.g. SA" onChange={(v) => set("country", v.toUpperCase().slice(0, 2))} />
            </div>
            <div className="font-body text-[11px] text-[var(--ink-muted)]">
              {verified
                ? `Located ${fmtDate(shop.locationVerifiedAt)}${shop.latitude !== null ? ` · ${shop.latitude?.toFixed(4)}, ${shop.longitude?.toFixed(4)}` : ""}`
                : "We couldn't locate this address yet, so customers won't see your distance or nearby ranking."}
            </div>
          </Panel>

          <Panel title="Opening hours" subtitle="Shown to customers who collect from your shop.">
            <Toggle
              name="Publish opening hours"
              note="Off means no hours are shown"
              checked={form.hoursEnabled}
              onChange={(v) => set("hoursEnabled", v)}
            />
            {form.hoursEnabled && (
              <div className="flex flex-col divide-y divide-[var(--border)] rounded-[2px] border border-[var(--border)]">
                {WEEKDAYS.map((day) => {
                  const slots = form.hours[day];
                  const open = slots.length > 0;
                  return (
                    <div key={day} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start">
                      <label className="flex w-[130px] shrink-0 items-center gap-2 pt-1.5 font-body text-[12px] font-semibold text-[var(--ink)]">
                        <input
                          type="checkbox"
                          checked={open}
                          aria-label={`Open on ${DAY_NAMES[day]}`}
                          className="accent-[var(--ink)]"
                          onChange={(e) =>
                            set("hours", { ...form.hours, [day]: e.target.checked ? [{ open: "09:00", close: "17:00" }] : [] })
                          }
                        />
                        {DAY_NAMES[day]}
                      </label>
                      {open ? (
                        <div className="flex flex-1 flex-col gap-2">
                          {slots.map((s, i) => (
                            <div key={i} className="flex flex-wrap items-center gap-2">
                              <input
                                type="time"
                                value={s.open}
                                aria-label={`${DAY_NAMES[day]} opens`}
                                onChange={(e) => setSlot(day, i, { open: e.target.value })}
                                className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 font-mono text-[12px] text-[var(--ink)] outline-none focus:border-[var(--gold)]"
                              />
                              <span className="font-body text-[11px] text-[var(--ink-muted)]">to</span>
                              <input
                                type="time"
                                value={s.close}
                                aria-label={`${DAY_NAMES[day]} closes`}
                                onChange={(e) => setSlot(day, i, { close: e.target.value })}
                                className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-2 py-1.5 font-mono text-[12px] text-[var(--ink)] outline-none focus:border-[var(--gold)]"
                              />
                              {slots.length > 1 && (
                                <button
                                  type="button"
                                  aria-label="Remove time range"
                                  onClick={() => set("hours", { ...form.hours, [day]: slots.filter((_, n) => n !== i) })}
                                  className="text-[var(--ink-muted)] hover:text-[var(--danger)]"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          {slots.length < 3 && (
                            <button
                              type="button"
                              onClick={() =>
                                set("hours", { ...form.hours, [day]: [...slots, { open: "18:00", close: "21:00" }] })
                              }
                              className="inline-flex w-fit items-center gap-1 font-body text-[11px] font-semibold text-[var(--gold-deep)]"
                            >
                              <Plus size={11} /> Add hours
                            </button>
                          )}
                        </div>
                      ) : (
                        <span className="pt-1.5 font-body text-[12px] text-[var(--ink-muted)]">Closed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {errors.openingHours && <span className="font-body text-[10.5px] text-[var(--danger)]">{errors.openingHours}</span>}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Panel title="Delivery & pickup" subtitle="Offer at least one.">
            <Toggle name="Delivery" note="You deliver orders to customers" checked={form.offersDelivery} onChange={(v) => set("offersDelivery", v)} />
            <Toggle name="Pickup" note="Customers collect from your shop" checked={form.offersPickup} onChange={(v) => set("offersPickup", v)} />
            {errors.offersDelivery && <span className="font-body text-[10.5px] text-[var(--danger)]">{errors.offersDelivery}</span>}
            {form.offersDelivery && (
              <div className="flex flex-col gap-3 rounded-[2px] border border-[var(--border)] px-4 py-3">
                <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">DELIVERY AREA</span>
                <label className="flex items-center gap-2 font-body text-[12px] text-[var(--ink)]">
                  <input type="radio" name="area" checked={form.deliversAnywhere} onChange={() => set("deliversAnywhere", true)} className="accent-[var(--ink)]" />
                  Deliver anywhere
                </label>
                <label className="flex items-center gap-2 font-body text-[12px] text-[var(--ink)]">
                  <input type="radio" name="area" checked={!form.deliversAnywhere} onChange={() => set("deliversAnywhere", false)} className="accent-[var(--ink)]" />
                  Within a radius of my shop
                </label>
                {!form.deliversAnywhere && (
                  <TextField
                    label="DELIVERY RADIUS"
                    name="deliveryRadiusKm"
                    type="number"
                    suffix="km"
                    value={form.deliveryRadiusKm}
                    error={errors.deliveryRadiusKm}
                    help={verified ? "0.5 – 500 km" : "Needs a located address to take effect."}
                    onChange={(v) => set("deliveryRadiusKm", v)}
                  />
                )}
              </div>
            )}
          </Panel>

          <Panel title="Shipping fees" subtitle="Leave blank to use the marketplace default.">
            <TextField
              label="FLAT DELIVERY FEE"
              name="shippingFlatFee"
              type="number"
              prefix="$"
              value={form.shippingFlatFee}
              error={errors.shippingFlatFee}
              placeholder="Platform default"
              onChange={(v) => set("shippingFlatFee", v)}
            />
            <TextField
              label="FREE DELIVERY OVER"
              name="freeShippingOver"
              type="number"
              prefix="$"
              value={form.freeShippingOver}
              error={errors.freeShippingOver}
              placeholder="Platform default"
              onChange={(v) => set("freeShippingOver", v)}
            />
            <p className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">Pickup orders are always free.</p>
          </Panel>

          <Panel title="Account">
            <div>
              <Row label="Status">{shop.vendor?.status ?? "—"}</Row>
              <Row label="Shop address">/{shop.slug}</Row>
              <Row label="Commission">{shop.vendor?.commissionRate ? `${Number(shop.vendor.commissionRate)}%` : "Marketplace default"}</Row>
              <Row label="Approved">{fmtDate(shop.vendor?.approvedAt)}</Row>
              <Row label="Login email">
                {shop.vendor?.user?.email ?? "—"}
                {shop.vendor?.user && !shop.vendor.user.emailVerifiedAt && (
                  <span className="ml-1 font-normal text-[var(--warning)]">(unconfirmed)</span>
                )}
              </Row>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
