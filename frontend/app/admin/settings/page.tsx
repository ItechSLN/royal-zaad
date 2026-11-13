'use client';

import { useEffect, useState } from "react";
import { Save, Store, Truck, Wallet } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { SchemaField, type FieldDef } from "@/components/admin/form/Fields";
import { getSettings, upsertSetting, type Setting } from "@/services/setting.service";

type Section = { title: string; subtitle: string; icon: typeof Store; fields: FieldDef[] };

const SECTIONS: Section[] = [
  {
    title: "Storefront",
    subtitle: "Identity shown to customers",
    icon: Store,
    fields: [
      { name: "store_name", label: "STORE NAME", placeholder: "Royal Zaad" },
      { name: "support_email", label: "SUPPORT EMAIL", placeholder: "care@royalzaad.com" },
      { name: "support_phone", label: "SUPPORT PHONE", placeholder: "+966 11 480 2200", help: "Optional" },
      { name: "store_tagline", label: "TAGLINE", placeholder: "Provisions of the Arabian peninsula", help: "Optional" },
    ],
  },
  {
    title: "Commerce",
    subtitle: "Prices are charged in USD · tax rates per country live under Tax",
    icon: Wallet,
    fields: [
      { name: "low_stock_alert_threshold", label: "LOW STOCK ALERT AT", type: "number", placeholder: "20" },
    ],
  },
  {
    title: "Fulfilment",
    subtitle: "Shipping defaults applied at checkout",
    icon: Truck,
    fields: [
      { name: "free_shipping_threshold", label: "FREE SHIPPING OVER", type: "money", placeholder: "250.00", help: "Order value after discounts; 0 turns free shipping off" },
      { name: "flat_shipping_rate", label: "FLAT RATE", type: "money", placeholder: "25.00", help: "Charged below the threshold; 0 makes shipping always free" },
      { name: "default_warehouse", label: "DEFAULT WAREHOUSE", type: "select", help: "Optional", options: [
        { value: "WH-A", label: "Riyadh · Warehouse A" },
        { value: "WH-B", label: "Jeddah · Warehouse B" },
        { value: "WH-C", label: "Dammam · Warehouse C" },
      ]},
      { name: "dispatch_cutoff", label: "DISPATCH CUT-OFF", placeholder: "14:00", help: "Optional" },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap((s) => s.fields);

/**
 * What checkout charges while a key has never been saved (mirrors the API's
 * order pricing defaults), so the form shows the values actually in force.
 */
const DEFAULTS: Record<string, string | boolean> = {
  free_shipping_threshold: "250",
  flat_shipping_rate: "25",
};

const isOptional = (f: FieldDef) => /optional/i.test(f.help ?? "");

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [values, setValues] = useState<Record<string, string | boolean>>(DEFAULTS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSettings = async () => {
    try {
      const data = (await getSettings()) ?? [];
      setSettings(data);
      setValues(() => {
        const next = { ...DEFAULTS };
        ALL_FIELDS.forEach((f) => {
          const hit = data.find((s) => s.key === f.name);
          if (hit) next[f.name] = f.type === "toggle" ? hit.value === "true" : hit.value;
        });
        return next;
      });
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loadError) return;

    const missing: Record<string, string> = {};
    for (const f of ALL_FIELDS) {
      if (!isOptional(f) && !String(values[f.name] ?? "").trim()) missing[f.name] = "This field is required";
    }
    setErrors(missing);
    if (Object.keys(missing).length) {
      toast.error("Fill in the required settings.");
      return;
    }

    setSubmitting(true);
    const failed: Record<string, string> = {};
    for (const f of ALL_FIELDS) {
      const value = String(values[f.name] ?? "").trim();
      const saved = settings.find((s) => s.key === f.name);
      // Blank optional fields are simply not stored; unchanged ones are skipped.
      if (!value || saved?.value === value) continue;
      try {
        await upsertSetting(settings, f.name, value);
      } catch (error: any) {
        failed[f.name] = error?.errors?.value ?? error?.message ?? "Could not be saved";
      }
    }
    setErrors(failed);
    if (Object.keys(failed).length) {
      toast.error("Some settings were not saved.");
    } else {
      toast.success("Settings saved.");
    }
    await fetchSettings();
    setSubmitting(false);
  };

  return (
    <form id="settings-form" onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
      <ActionBar
        title="Settings"
        subtitle="Store-wide configuration applied across the storefront and checkout."
        actions={[
          {
            label: submitting ? "Saving…" : "Save changes",
            icon: Save,
            emphasis: true,
            // ActionBar renders plain buttons, so submit the form explicitly.
            onClick: () => (document.getElementById("settings-form") as HTMLFormElement | null)?.requestSubmit(),
          },
        ]}
      />

      {loadError && (
        <div className="flex items-center justify-between gap-3 border border-[var(--danger)] bg-[var(--surface)] px-5 py-3 font-body text-[12px] text-[var(--danger)]">
          <span>{loadError} Settings can&apos;t be saved until they load.</span>
          <button type="button" onClick={fetchSettings} className="font-semibold underline">
            Retry
          </button>
        </div>
      )}
      {loading && !loadError && (
        <p className="font-body text-[12px] text-[var(--ink-muted)]">Loading settings…</p>
      )}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <PanelHeading title={section.title} subtitle={section.subtitle} />
            <div className="grid grid-cols-1 gap-4 px-5 pb-6 sm:grid-cols-2">
              {section.fields.map((f) => (
                <div key={f.name} className={f.full ? "sm:col-span-2" : ""}>
                  <SchemaField
                    field={f}
                    value={values[f.name] ?? (f.type === "toggle" ? false : "")}
                    error={errors[f.name]}
                    onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting || loading || !!loadError}
          className="rounded-[2px] bg-[var(--ink)] px-6 py-3 font-body text-[12px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)] disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
