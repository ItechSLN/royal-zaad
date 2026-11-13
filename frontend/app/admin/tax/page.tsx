'use client';

import { useState } from "react";
import { CalendarClock, FilePlus, Landmark, Pencil, Plus, Power, Receipt, ReceiptText, Send, Trash2 } from "lucide-react";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import RowMenu, { type RowAction } from "@/components/admin/common/RowMenu";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import ListStateRow, { errorText, listState } from "@/components/admin/common/ListStateRow";
import { useAdminResource } from "@/hooks/useAdminResource";
import { taxFilingsApi, taxRatesApi, fileTaxReturn } from "@/services/admin-resource.service";
import { fromTaxFiling, fromTaxRate, money, toTaxFiling, toTaxRate } from "@/lib/admin-adapters";
import { toast } from "sonner";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { TAX_FILING_FIELDS, TAX_RATE_FIELDS } from "@/lib/admin-forms";

const TONE: Record<string, Tone> = { Draft: "warning", Filed: "success" };

type Filing = ReturnType<typeof fromTaxFiling>;
type Rate = ReturnType<typeof fromTaxRate>;

export default function TaxPage() {
  const [rateForm, setRateForm] = useState<{ editing: Rate | null } | null>(null);
  const [filingForm, setFilingForm] = useState<{ editing: Filing | null } | null>(null);
  const [tab, setTab] = useState("All");

  const filings = useAdminResource({
    resource: taxFilingsApi,
    fallback: [],
    adapt: fromTaxFiling,
    params: { limit: 100 },
  });

  const rates = useAdminResource({
    resource: taxRatesApi,
    fallback: [],
    adapt: fromTaxRate,
    params: { limit: 100 },
  });

  // Tabs come from the jurisdictions actually on file.
  const tabs = ["All", ...Array.from(new Set(filings.rows.map((f) => f.jurisdiction)))];
  const rows = filings.rows.filter((f) => tab === "All" || f.jurisdiction === tab);
  const filingState = listState({ loading: filings.loading, live: filings.live, count: rows.length });
  const kpi = (live: boolean, v: string) => (live ? v : "—");

  const sum = (key: "outputValue" | "inputValue" | "netValue") =>
    money(rows.reduce((a, f) => a + f[key], 0));
  const drafts = rows.filter((f) => f.status === "Draft");
  const filed = rows.filter((f) => f.status === "Filed").length;
  const activeRates = rates.rows.filter((r) => r.isActive).length;

  const run = async (action: () => Promise<unknown>, refresh: () => Promise<void>, done?: string) => {
    let ok = true;
    try {
      await action();
      if (done) toast.success(done);
    } catch (error) {
      ok = false;
      toast.error(errorText(error, "Unable to save."));
    }
    await refresh();
    return ok;
  };

  const submitRate = async (values: Record<string, string | boolean>) => {
    const target = rateForm?.editing;
    const payload = toTaxRate(values);
    return run(
      () => (target ? taxRatesApi.update(target.id, payload) : taxRatesApi.create(payload)),
      () => rates.refresh(),
      target ? "Tax rate updated." : "Tax rate added."
    );
  };

  const submitFiling = async (values: Record<string, string | boolean>) => {
    const target = filingForm?.editing;
    const payload = toTaxFiling(values);
    return run(
      () => (target ? taxFilingsApi.update(target.id, payload) : taxFilingsApi.create(payload)),
      () => filings.refresh(),
      target ? "Filing updated." : "Filing created."
    );
  };

  const file = (f: Filing) => {
    if (!window.confirm(`File ${f.period} · ${f.jurisdiction}? A filed return is locked.`)) return;
    void run(() => fileTaxReturn(f.id), () => filings.refresh(), `${f.period} · ${f.jurisdiction} filed.`);
  };

  // The header action files the draft that falls due first.
  const fileNextDue = () => {
    const next = [...drafts].sort(
      (a, b) => new Date(a.dueAt ?? 0).getTime() - new Date(b.dueAt ?? 0).getTime()
    )[0];
    if (!next) {
      toast.info("No draft return is ready to file.");
      return;
    }
    file(next);
  };

  const filingActions = (f: Filing): RowAction[] =>
    f.status === "Draft"
      ? [
          { label: "Edit figures", icon: Pencil, onSelect: () => setFilingForm({ editing: f }) },
          { label: "File return", icon: Send, onSelect: () => file(f) },
          {
            label: "Delete",
            icon: Trash2,
            danger: true,
            onSelect: () => {
              if (window.confirm(`Delete ${f.period} · ${f.jurisdiction}?`)) void run(() => taxFilingsApi.remove(f.id), () => filings.refresh(), "Filing deleted.");
            },
          },
        ]
      : [];

  const rateActions = (r: Rate): RowAction[] => [
    { label: "Edit rate", icon: Pencil, onSelect: () => setRateForm({ editing: r }) },
    {
      label: r.isActive ? "Deactivate" : "Activate",
      icon: Power,
      onSelect: () => void run(() => taxRatesApi.update(r.id, { isActive: !r.isActive }), () => rates.refresh(), `${r.authority} ${r.isActive ? "deactivated" : "activated"}.`),
    },
    {
      label: "Delete",
      icon: Trash2,
      danger: true,
      onSelect: () => {
        if (window.confirm(`Delete ${r.authority}? Checkout stops charging this rate.`)) void run(() => taxRatesApi.remove(r.id), () => rates.refresh(), "Rate deleted.");
      },
    },
  ];

  const rateInitial: EntityValues | undefined = rateForm?.editing
    ? {
        jurisdiction: rateForm.editing.jurisdiction,
        countryCode: rateForm.editing.countryCode,
        registration: rateForm.editing.registration,
        rate: rateForm.editing.rate,
        appliesTo: rateForm.editing.appliesTo,
      }
    : undefined;

  const filingInitial: EntityValues | undefined = filingForm?.editing
    ? {
        period: filingForm.editing.period,
        jurisdiction: filingForm.editing.jurisdiction,
        outputTax: String(filingForm.editing.outputValue),
        inputTax: String(filingForm.editing.inputValue),
        due: filingForm.editing.dueAt ? filingForm.editing.dueAt.slice(0, 10) : "",
      }
    : undefined;

  return (
    <AdminScreen
      title="Tax & VAT"
      subtitle={`${activeRates} active rate(s) · applied at checkout by ship-to country.`}
      tabs={tabs}
      activeTab={tab}
      onTabChange={setTab}
      actions={[
        { label: "Add rate", icon: Plus, onClick: () => setRateForm({ editing: null }) },
        { label: "New filing", icon: FilePlus, onClick: () => setFilingForm({ editing: null }) },
        { label: "File next return", icon: Send, emphasis: true, onClick: fileNextDue },
      ]}
      kpis={[
        { label: "Output tax", value: kpi(filings.live, sum("outputValue")), icon: Receipt, delta: "collected on sales", deltaTone: "muted", note: `${rows.length} filing periods` },
        { label: "Input tax", value: kpi(filings.live, sum("inputValue")), icon: ReceiptText, delta: "reclaimable", deltaTone: "muted", note: "on purchases" },
        { label: "Net payable", value: kpi(filings.live, sum("netValue")), icon: Landmark, delta: `${drafts.length} draft`, deltaTone: "info", note: "output less input" },
        { label: "Tax rates", value: kpi(rates.live, String(rates.rows.length)), icon: CalendarClock, delta: `${filed} filed`, deltaTone: "muted", note: `${activeRates} active at checkout` },
      ]}
    >
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.5fr)_1fr]">
        <Card>
          <PanelHeading title="Filing periods" subtitle="Net payable = output tax − input tax" />
          <Table>
            <THead>
              <tr>
                <TH>Period</TH>
                <TH>Jurisdiction</TH>
                <TH align="right">Output</TH>
                <TH align="right">Input</TH>
                <TH align="right">Net payable</TH>
                <TH>Due</TH>
                <TH align="right">Status</TH>
                <TH className="w-[40px]" />
              </tr>
            </THead>
            <TBody>
              {filingState ? (
                <ListStateRow
                  colSpan={8}
                  state={filingState}
                  noun="filings"
                  onRetry={() => filings.refresh()}
                  empty={tab === "All" ? "No tax filings yet." : "No filings for this jurisdiction."}
                />
              ) : (
                rows.map((f) => (
                  <TR key={f.id}>
                    <TD strong>{f.period}</TD>
                    <TD>{f.jurisdiction}</TD>
                    <TD align="right" mono>{f.output}</TD>
                    <TD align="right" mono>{f.input}</TD>
                    <TD align="right" strong>{f.net}</TD>
                    <TD>{f.due}</TD>
                    <TD align="right">
                      <StatusBadge tone={TONE[f.status] ?? "neutral"}>{f.status}</StatusBadge>
                    </TD>
                    <TD>{f.status === "Draft" && <RowMenu actions={filingActions(f)} />}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>

        <Card>
          <PanelHeading title="Tax rates" subtitle="Charged at checkout by ship-to country" />
          <div className="flex flex-col gap-2 px-5 pb-6">
            {rates.live && rates.rows.length > 0 ? (
              rates.rows.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border border-[var(--border)] bg-[var(--admin-bg)] p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-body text-[11.5px] font-semibold text-[var(--ink)]">
                      {r.authority}
                    </span>
                    <span className="font-mono text-[9.5px] text-[var(--ink-muted)]">{r.number}</span>
                  </div>
                  <StatusBadge tone={r.tone}>{r.state}</StatusBadge>
                  <RowMenu actions={rateActions(r)} />
                </div>
              ))
            ) : (
              <table className="w-full">
                <tbody>
                  {rates.live ? (
                    <EmptyRow colSpan={1}>No tax rates yet — checkout charges no tax.</EmptyRow>
                  ) : (
                    <ListStateRow
                      colSpan={1}
                      state={rates.loading ? "loading" : "error"}
                      noun="tax rates"
                      onRetry={() => rates.refresh()}
                      empty=""
                    />
                  )}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>
      <EntityFormModal
        open={rateForm !== null}
        mode={rateForm?.editing ? "edit" : "create"}
        entity="tax rate"
        size="md"
        fields={TAX_RATE_FIELDS}
        initial={rateInitial}
        onSubmit={submitRate}
        onClose={() => setRateForm(null)}
      />
      <EntityFormModal
        open={filingForm !== null}
        mode={filingForm?.editing ? "edit" : "create"}
        entity="tax filing"
        subtitle="Net payable is calculated as output tax less input tax"
        size="md"
        fields={TAX_FILING_FIELDS}
        initial={filingInitial}
        onSubmit={submitFiling}
        onClose={() => setFilingForm(null)}
      />
    </AdminScreen>
  );
}
