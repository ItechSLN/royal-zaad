'use client';
import { useState } from "react";

import { ArrowLeftRight, Boxes, PackageCheck, Pencil, Plus, Target, Trash2, Truck, Warehouse } from "lucide-react";
import { toast } from "sonner";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge } from "@/components/ui/Badge";
import RowMenu, { type RowAction } from "@/components/admin/common/RowMenu";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import ListStateRow, { errorText, listState } from "@/components/admin/common/ListStateRow";
import { useAdminResource } from "@/hooks/useAdminResource";
import { transfersApi, warehousesApi } from "@/services/admin-resource.service";
import { fromTransfer, fromWarehouse, toTransfer, toWarehouse } from "@/lib/admin-adapters";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { TRANSFER_FIELDS, WAREHOUSE_FIELDS } from "@/lib/admin-forms";

type Facility = ReturnType<typeof fromWarehouse>;
type Transfer = ReturnType<typeof fromTransfer>;

export default function WarehousesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Facility | null>(null);
  const [transferFrom, setTransferFrom] = useState<string | null>(null);

  const facilities = useAdminResource({
    resource: warehousesApi,
    fallback: [],
    adapt: fromWarehouse,
    params: { limit: 100 },
  });

  const transfers = useAdminResource({
    resource: transfersApi,
    fallback: [],
    adapt: fromTransfer,
    params: { limit: 100 },
  });

  const siteState = listState({ loading: facilities.loading, live: facilities.live, count: facilities.rows.length });
  const transferState = listState({ loading: transfers.loading, live: transfers.live, count: transfers.rows.length });
  const kpi = (live: boolean, v: string) => (live ? v : "—");

  const totals = facilities.rows.reduce(
    (a, w) => ({ units: a.units + w.units, capacity: a.capacity + w.capacity }),
    { units: 0, capacity: 0 }
  );
  const networkUtilisation =
    totals.capacity > 0 ? Math.round((totals.units / totals.capacity) * 100) : 0;
  const operational = facilities.rows.filter((w) => w.statusValue === "operational").length;
  const inTransit = transfers.rows.filter((t) => t.statusValue === "IN_TRANSIT").length;
  const late = transfers.rows.filter((t) => t.statusValue === "LATE").length;
  const movingUnits = transfers.rows
    .filter((t) => t.statusValue === "IN_TRANSIT" || t.statusValue === "LATE")
    .reduce((a, t) => a + t.units, 0);

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

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = toWarehouse(values);
    const target = editing;
    return run(
      () => (target ? warehousesApi.update(target.id, payload) : warehousesApi.create(payload)),
      () => facilities.refresh(),
      target ? `${target.name} updated.` : "Warehouse added."
    );
  };

  const submitTransfer = async (values: Record<string, string | boolean>) => {
    const ok = await run(() => transfersApi.create(toTransfer(values)), () => transfers.refresh(), "Transfer drafted.");
    if (ok) await facilities.refresh();
    return ok;
  };

  const moveTransfer = (t: Transfer, status: string, done: string) =>
    void run(() => transfersApi.update(t.id, { status }), () => transfers.refresh(), `${t.reference} ${done}.`);

  const transferActions = (t: Transfer): RowAction[] => {
    const actions: RowAction[] = [];
    if (t.statusValue === "DRAFT") {
      actions.push(
        { label: "Dispatch", icon: Truck, onSelect: () => moveTransfer(t, "IN_TRANSIT", "dispatched") },
        {
          label: "Delete",
          icon: Trash2,
          danger: true,
          onSelect: () => {
            if (window.confirm(`Delete ${t.reference}?`)) void run(() => transfersApi.remove(t.id), () => transfers.refresh(), `${t.reference} deleted.`);
          },
        }
      );
    }
    if (t.statusValue === "IN_TRANSIT" || t.statusValue === "LATE") {
      actions.push({ label: "Mark received", icon: PackageCheck, onSelect: () => moveTransfer(t, "RECEIVED", "received") });
    }
    if (t.statusValue === "IN_TRANSIT") {
      actions.push({ label: "Flag late", icon: Truck, onSelect: () => moveTransfer(t, "LATE", "flagged late") });
    }
    return actions;
  };

  const removeSite = (w: Facility) => {
    if (window.confirm(`Delete ${w.name}?`)) void run(() => warehousesApi.remove(w.id), () => facilities.refresh(), `${w.name} deleted.`);
  };

  const open = (w?: Facility) => {
    setEditing(w ?? null);
    setFormOpen(true);
  };

  const initial: EntityValues | undefined = editing
    ? {
        name: editing.name,
        code: editing.code,
        city: editing.city,
        capacity: String(editing.capacity),
        manager: editing.manager,
        status: editing.statusValue,
        address: editing.address,
        isDefault: editing.isDefault,
      }
    : undefined;

  const siteOptions = facilities.rows.map((w) => ({ value: w.id, label: `${w.name} · ${w.units.toLocaleString()} units` }));
  const transferFields = TRANSFER_FIELDS.map((f) =>
    f.name === "fromId" || f.name === "toId" ? { ...f, options: siteOptions } : f
  );

  return (
    <AdminScreen
      title="Warehouses"
      subtitle={`Capacity and stock movement across ${facilities.meta.total} facilities.`}
      actions={[
        { label: "New transfer", icon: ArrowLeftRight, onClick: () => setTransferFrom("") },
        { label: "Add warehouse", icon: Plus, emphasis: true, onClick: () => open() },
      ]}
      kpis={[
        { label: "Network utilisation", value: kpi(facilities.live, `${networkUtilisation}%`), icon: Warehouse, delta: `${totals.capacity.toLocaleString()} units`, deltaTone: "info", note: "of total capacity" },
        { label: "Units stored", value: kpi(facilities.live, totals.units.toLocaleString()), icon: Boxes, delta: `${facilities.rows.length} sites`, deltaTone: "info", note: "across the network" },
        { label: "Transfers in transit", value: kpi(transfers.live, String(inTransit)), icon: Truck, delta: `${late} late`, deltaTone: late ? "warning" : "muted", note: `${movingUnits.toLocaleString()} units moving` },
        { label: "Operational sites", value: kpi(facilities.live, String(operational)), icon: Target, delta: `${facilities.rows.length - operational} other`, deltaTone: "muted", note: "status across facilities" },
      ]}
    >
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.4fr)_1fr]">
        <Card>
          <PanelHeading title="Facilities" subtitle="Utilisation against available capacity" />
          <Table>
            <THead>
              <tr>
                <TH>Facility</TH>
                <TH>Units / capacity</TH>
                <TH>Utilisation</TH>
                <TH align="right">Status</TH>
                <TH className="w-[40px]" />
              </tr>
            </THead>
            <TBody>
              {siteState ? (
                <ListStateRow colSpan={5} state={siteState} noun="warehouses" onRetry={() => facilities.refresh()} empty="No warehouses yet." />
              ) : (
                facilities.rows.map((w) => (
                  <TR key={w.id}>
                    <TD strong>
                      {w.name}
                      <span className="ml-2 font-mono text-[10px] text-[var(--ink-muted)]">{w.code}</span>
                      {w.isDefault && <span className="ml-2 font-mono text-[10px] text-[var(--gold-deep)]">DEFAULT</span>}
                    </TD>
                    <TD mono>
                      {w.units.toLocaleString()} / {w.capacity.toLocaleString()}
                    </TD>
                    <TD>
                      <div className="flex items-center gap-2">
                        <div className="h-[6px] w-[90px] bg-[var(--cream-2)]">
                          <div className="h-full bg-[var(--gold)]" style={{ width: `${Math.min(100, w.utilisation)}%` }} />
                        </div>
                        <span className="font-mono text-[11px]">{w.utilisation}%</span>
                      </div>
                    </TD>
                    <TD align="right">
                      <StatusBadge tone={w.statusValue === "operational" ? "success" : "warning"}>
                        {w.status}
                      </StatusBadge>
                    </TD>
                    <TD>
                      <RowMenu
                        actions={[
                          { label: "Edit facility", icon: Pencil, onSelect: () => open(w) },
                          { label: "New transfer", icon: ArrowLeftRight, onSelect: () => setTransferFrom(w.id) },
                          { label: "View stock", icon: Boxes, href: "/admin/inventory" },
                          { label: "Delete", icon: Trash2, danger: true, onSelect: () => removeSite(w) },
                        ]}
                      />
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>

        <Card>
          <PanelHeading title="Stock transfers" subtitle="Movement between facilities" />
          <Table>
            <THead>
              <tr>
                <TH>Transfer</TH>
                <TH>Route</TH>
                <TH align="right">Units</TH>
                <TH align="right">Status</TH>
                <TH className="w-[40px]" />
              </tr>
            </THead>
            <TBody>
              {transferState ? (
                <ListStateRow colSpan={5} state={transferState} noun="transfers" onRetry={() => transfers.refresh()} empty="No transfers yet." />
              ) : (
                transfers.rows.map((t) => (
                  <TR key={t.id}>
                    <TD strong mono>{t.reference}</TD>
                    <TD>{t.from} → {t.to}</TD>
                    <TD align="right" mono>{t.units}</TD>
                    <TD align="right">
                      <StatusBadge tone={t.statusValue === "RECEIVED" ? "success" : t.statusValue === "LATE" ? "danger" : t.statusValue === "DRAFT" ? "neutral" : "info"}>
                        {t.status}
                      </StatusBadge>
                    </TD>
                    <TD>{transferActions(t).length > 0 && <RowMenu actions={transferActions(t)} />}</TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Card>
      </div>
      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="warehouse"
        size="md"
        fields={WAREHOUSE_FIELDS}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />
      <EntityFormModal
        open={transferFrom !== null}
        mode="create"
        entity="transfer"
        subtitle="Units cannot exceed what the source site holds"
        size="md"
        fields={transferFields}
        initial={transferFrom ? { fromId: transferFrom } : undefined}
        onSubmit={submitTransfer}
        onClose={() => setTransferFrom(null)}
      />
    </AdminScreen>
  );
}
