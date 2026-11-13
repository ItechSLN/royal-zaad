'use client';
import { useState } from "react";

import { Banknote, ClipboardList, Handshake, Pencil, Plus, Timer, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge } from "@/components/ui/Badge";
import RowMenu from "@/components/admin/common/RowMenu";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import ListStateRow, { errorText, listState } from "@/components/admin/common/ListStateRow";
import { useAdminResource } from "@/hooks/useAdminResource";
import { suppliersApi } from "@/services/admin-resource.service";
import { compactMoney, fromSupplier, toSupplier } from "@/lib/admin-adapters";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { SUPPLIER_FIELDS } from "@/lib/admin-forms";

type Supplier = ReturnType<typeof fromSupplier>;

export default function SuppliersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  const suppliers = useAdminResource({
    resource: suppliersApi,
    fallback: [],
    adapt: fromSupplier,
    params: { limit: 100 },
  });

  const state = listState({ loading: suppliers.loading, live: suppliers.live, count: suppliers.rows.length });
  const kpi = (v: string) => (suppliers.live ? v : "—");

  const active = suppliers.rows.filter((s) => s.statusValue === "ACTIVE").length;
  const flagged = suppliers.rows.filter((s) => s.statusValue === "ON_HOLD").length;
  const countries = new Set(suppliers.rows.map((s) => s.country).filter((c) => c !== "—")).size;
  const leadTimes = suppliers.rows.map((s) => s.leadTimeDays).filter((n) => n > 0);
  const avgLead = leadTimes.length
    ? Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length)
    : 0;
  const totalSpend = compactMoney(suppliers.rows.reduce((a, s) => a + s.ytdSpend, 0));

  const run = async (action: () => Promise<unknown>, done?: string) => {
    let ok = true;
    try {
      await action();
      if (done) toast.success(done);
    } catch (error) {
      ok = false;
      toast.error(errorText(error, "Unable to save the supplier."));
    }
    await suppliers.refresh();
    return ok;
  };

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = toSupplier(values);
    const target = editing;
    return run(
      () => (target ? suppliersApi.update(target.id, payload) : suppliersApi.create(payload)),
      target ? `${target.name} updated.` : "Supplier added."
    );
  };

  const remove = (s: Supplier) => {
    if (window.confirm(`Delete ${s.name}?`)) void run(() => suppliersApi.remove(s.id), `${s.name} deleted.`);
  };

  const open = (s?: Supplier) => {
    setEditing(s ?? null);
    setFormOpen(true);
  };

  const initial: EntityValues | undefined = editing
    ? {
        name: editing.name,
        category: editing.category === "—" ? "" : editing.category.toLowerCase(),
        country: editing.country === "—" ? "" : editing.country,
        leadTime: editing.leadTimeDays ? String(editing.leadTimeDays) : "",
        contact: editing.contact,
        email: editing.email,
        terms: editing.terms,
        status: editing.statusValue.toLowerCase(),
        notes: editing.notes,
      }
    : undefined;

  return (
    <AdminScreen
      title="Suppliers"
      subtitle="Partners, lead times and scorecards across the peninsula."
      actions={[{ label: "Add supplier", icon: Plus, emphasis: true, onClick: () => open() }]}
      kpis={[
        { label: "YTD supplier spend", value: kpi(totalSpend), icon: Banknote, note: "received purchase orders" },
        { label: "Active suppliers", value: kpi(String(active)), icon: Handshake, delta: `${countries} countries`, deltaTone: "info", note: `${suppliers.meta.total} on file` },
        { label: "Avg. lead time", value: kpi(`${avgLead} days`), icon: Timer, delta: "order to receipt", deltaTone: "muted", note: "across partners" },
        { label: "On hold", value: kpi(String(flagged)), icon: TriangleAlert, delta: flagged ? "needs review" : "all clear", deltaTone: flagged ? "danger" : "muted", note: "quality or delay flags" },
      ]}
    >
      <Card>
        <PanelHeading title="Supplier directory" subtitle="Partners on file · newest first" />
        <Table>
          <THead>
            <tr>
              <TH>Supplier</TH>
              <TH>Category</TH>
              <TH>Country</TH>
              <TH>Lead time</TH>
              <TH>On-time</TH>
              <TH align="right">Open POs</TH>
              <TH align="right">YTD spend</TH>
              <TH align="right">Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={9}
                state={state}
                noun="suppliers"
                onRetry={() => suppliers.refresh()}
                empty="No suppliers yet."
              />
            ) : suppliers.rows.map((s) => (
              <TR key={s.id}>
                <TD strong>
                  {s.name}
                  <span className="ml-2 font-mono text-[10px] text-[var(--gold-deep)]">★ {s.rating}</span>
                </TD>
                <TD>{s.category}</TD>
                <TD>{s.country}</TD>
                <TD mono>{s.leadTime}</TD>
                <TD mono>{s.onTime}</TD>
                <TD align="right" mono>{s.openPos}</TD>
                <TD align="right" strong>{s.ytd}</TD>
                <TD align="right">
                  <StatusBadge tone={s.status === "Active" ? "success" : "warning"}>
                    {s.status}
                  </StatusBadge>
                </TD>
                <TD>
                  <RowMenu
                    actions={[
                      { label: "Edit supplier", icon: Pencil, onSelect: () => open(s) },
                      { label: "Raise PO", icon: ClipboardList, href: "/admin/purchase-orders" },
                      { label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(s) },
                    ]}
                  />
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </Card>
      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="supplier"
        size="md"
        fields={SUPPLIER_FIELDS}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />
    </AdminScreen>
  );
}
