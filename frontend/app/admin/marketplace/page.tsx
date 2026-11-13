'use client';

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { ModalButton } from "@/components/admin/form/Modal";
import { FieldShell, SchemaField } from "@/components/admin/form/Fields";
import {
  getMarketplaceSettings,
  updateMarketplaceSettings,
  type MarketplaceSettings,
} from "@/services/marketplace-admin.service";
import { ErrorBox, PanelState, errorLines, inputClass } from "@/app/admin/marketplace/_components/bits";

export default function MarketplaceSettingsPage() {
  const [saved, setSaved] = useState<MarketplaceSettings | null>(null);
  const [rate, setRate] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const [loadError, setLoadError] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<any>(null);

  const apply = (s: MarketplaceSettings) => {
    setSaved(s);
    setRate(String(s.commissionRate));
    setRequireApproval(s.requireProductApproval);
  };

  const [nonce, setNonce] = useState(0);
  const load = useCallback(() => {
    setLoadError(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getMarketplaceSettings().then(
      (data) => {
        if (cancelled) return;
        apply(data);
        setLoadError(null);
      },
      (error) => !cancelled && setLoadError(error)
    );
    return () => {
      cancelled = true;
    };
  }, [nonce]);

  const rateN = Number(rate);
  const rateValid = rate.trim() !== "" && Number.isFinite(rateN) && rateN >= 0 && rateN <= 100;
  const dirty =
    !!saved && (rateN !== saved.commissionRate || requireApproval !== saved.requireProductApproval);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saved || saving) return;
    if (!rateValid) {
      setSaveError({ message: "Commission must be a percentage between 0 and 100." });
      return;
    }
    const body: Partial<MarketplaceSettings> = {};
    if (rateN !== saved.commissionRate) body.commissionRate = rateN;
    if (requireApproval !== saved.requireProductApproval) body.requireProductApproval = requireApproval;
    setSaving(true);
    try {
      apply(await updateMarketplaceSettings(body));
      setSaveError(null);
      toast.success("Marketplace settings saved.");
    } catch (error: any) {
      setSaveError(error);
      toast.error(errorLines(error, "Unable to save the settings.")[0]);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar title="Marketplace settings" subtitle="Platform-wide rules for every vendor on Royal Zaad." />

      <Card className="max-w-[720px]">
        {!saved ? (
          <PanelState loading={!loadError} error={loadError} noun="marketplace settings" onRetry={load} />
        ) : (
          <form onSubmit={save}>
            <PanelHeading title="Commission & listings" subtitle="Changes apply to new orders and new submissions" />
            <div className="flex flex-col gap-5 px-5 pb-5">
              <FieldShell
                label="DEFAULT COMMISSION (%)"
                help="Taken from each vendor's sub-order unless the vendor has a custom rate."
                error={rate.trim() !== "" && !rateValid ? "Enter a percentage between 0 and 100" : undefined}
              >
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  className={`${inputClass} max-w-[200px]`}
                />
              </FieldShell>

              <SchemaField
                field={{
                  name: "requireProductApproval",
                  label: "Require product approval",
                  type: "toggle",
                  help: "New vendor products, and rejected ones a vendor resubmits, wait in the moderation queue before going live.",
                }}
                value={requireApproval}
                onChange={(v) => setRequireApproval(Boolean(v))}
              />

              <ErrorBox error={saveError} />

              <div className="flex justify-end gap-3 border-t border-[var(--border)] pt-4">
                <ModalButton
                  onClick={() => {
                    apply(saved);
                    setSaveError(null);
                  }}
                  disabled={!dirty || saving}
                >
                  Reset
                </ModalButton>
                <ModalButton variant="dark" type="submit" disabled={!dirty || saving}>
                  {saving ? "Saving…" : "Save settings"}
                </ModalButton>
              </div>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
