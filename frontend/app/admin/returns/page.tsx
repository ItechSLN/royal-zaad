'use client';

import { useEffect, useState } from "react";
import { Banknote, Gavel, PackageSearch, Plus, Timer, Trash2, Undo2, Wallet } from "lucide-react";
import { toast } from "sonner";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import RowMenu, { type RowAction } from "@/components/admin/common/RowMenu";
import ListStateRow, { errorText, listState } from "@/components/admin/common/ListStateRow";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { RETURN_DECISION_FIELDS, RETURN_FIELDS } from "@/lib/admin-forms";
import { useAdminResource } from "@/hooks/useAdminResource";
import { returnsApi } from "@/services/admin-resource.service";
import { getOrders, type Order } from "@/services/order.service";
import { fromReturn, money, toReturn, toReturnDecision } from "@/lib/admin-adapters";

type ReturnRow = ReturnType<typeof fromReturn>;

const TABS = ["All", "Awaiting inspection", "Approved", "Refunded", "Rejected"];
const TONE: Record<string, Tone> = {
  "Awaiting inspection": "warning",
  Approved: "info",
  Refunded: "success",
  Rejected: "danger",
};

export default function ReturnsPage() {
  const [tab, setTab] = useState("All");
  const [deciding, setDeciding] = useState<ReturnRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);

  const returns = useAdminResource({
    resource: returnsApi,
    fallback: [],
    adapt: fromReturn,
  });

  // Only delivered orders can be returned.
  useEffect(() => {
    if (!creating) return;
    getOrders(1, 100)
      .then((res) => setOrders(res.data.filter((o) => o.status === "DELIVERED")))
      .catch(() => setOrders([]));
  }, [creating]);

  const rows = returns.rows.filter((r) => tab === "All" || r.stage === tab);
  const state = listState({ loading: returns.loading, live: returns.live, count: rows.length });
  const kpi = (v: string) => (returns.live ? v : "—");

  const awaiting = returns.rows.filter((r) => r.stageValue === "AWAITING_INSPECTION").length;
  const rejected = returns.rows.filter((r) => r.stageValue === "REJECTED").length;
  const open = returns.rows.filter((r) => r.stageValue === "AWAITING_INSPECTION" || r.stageValue === "APPROVED").length;
  const refundedRows = returns.rows.filter((r) => r.stageValue === "REFUNDED");
  const refunded = money(refundedRows.reduce((a, r) => a + r.refundValue, 0));

  /** Calls the API directly so a refused decision explains itself. */
  const run = async (action: () => Promise<unknown>, done: string) => {
    let ok = true;
    try {
      await action();
      toast.success(done);
    } catch (error) {
      ok = false;
      toast.error(errorText(error, "Unable to update the return."));
    }
    await returns.refresh(returns.meta.page);
    return ok;
  };

  const recordDecision = async (values: Record<string, string | boolean>) => {
    if (!deciding) return false;
    const target = deciding;
    return run(() => returnsApi.update(target.id, toReturnDecision(values)), `${target.rma} updated.`);
  };

  const createReturn = async (values: Record<string, string | boolean>) => {
    return run(() => returnsApi.create(toReturn(values)), "Return opened.");
  };

  const settle = (r: ReturnRow) =>
    run(() => returnsApi.update(r.id, { stage: "REFUNDED" }), `${r.rma} refunded.`);

  const remove = (r: ReturnRow) => {
    if (!window.confirm(`Delete ${r.rma}? This cannot be undone.`)) return;
    void run(() => returnsApi.remove(r.id), `${r.rma} deleted.`);
  };

  const actionsFor = (r: ReturnRow): RowAction[] => {
    const actions: RowAction[] = [];
    if (r.stageValue === "AWAITING_INSPECTION") {
      actions.push({ label: "Record decision", icon: Gavel, onSelect: () => setDeciding(r) });
    }
    if (r.stageValue === "APPROVED" && r.refundValue > 0 && r.refundMethod && r.refundMethod !== "NONE") {
      actions.push({ label: `Issue refund · ${r.refund}`, icon: Wallet, onSelect: () => void settle(r) });
    }
    actions.push({ label: "Open order", icon: PackageSearch, href: "/admin/orders" });
    if (r.stageValue === "AWAITING_INSPECTION" || r.stageValue === "REJECTED") {
      actions.push({ label: "Delete", icon: Trash2, danger: true, onSelect: () => remove(r) });
    }
    return actions;
  };

  const initial: EntityValues | undefined = deciding
    ? {
        decision: "approve",
        refundMethod: "original",
        refundAmount: deciding.refundValue ? String(deciding.refundValue) : "",
        restock: "quarantine",
        note: "",
      }
    : undefined;

  const createFields = RETURN_FIELDS.map((f) =>
    f.name === "orderId"
      ? {
          ...f,
          options: orders.map((o) => ({
            value: o.id,
            label: `${o.orderNumber} · ${o.customer.firstName} ${o.customer.lastName} · ${money(o.total)}`,
          })),
          help: orders.length ? undefined : "No delivered orders to return",
        }
      : f
  );

  return (
    <AdminScreen
      title="Returns"
      subtitle="RMAs, inspection and refund settlement."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      actions={[{ label: "New return", icon: Plus, emphasis: true, onClick: () => setCreating(true) }]}
      kpis={[
        { label: "Open RMAs", value: kpi(String(open)), icon: Undo2, delta: `${returns.meta.total} total`, deltaTone: "info", note: "awaiting resolution" },
        { label: "Refunded value", value: kpi(refunded), icon: Banknote, delta: `${refundedRows.length} settled`, deltaTone: "muted", note: "returned to customers" },
        { label: "Awaiting inspection", value: kpi(String(awaiting)), icon: PackageSearch, delta: awaiting ? "at the warehouse" : "none", deltaTone: awaiting ? "warning" : "muted", note: "goods received back" },
        { label: "Rejected", value: kpi(String(rejected)), icon: Timer, delta: "outside policy", deltaTone: "muted", note: "claims declined" },
      ]}
    >
      <Card>
        <PanelHeading title="Return requests" subtitle="Open and settled RMAs" />
        <Table>
          <THead>
            <tr>
              <TH>RMA</TH>
              <TH>Customer · order</TH>
              <TH>Item</TH>
              <TH>Reason</TH>
              <TH align="right">Refund</TH>
              <TH align="right">Stage</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={7}
                state={state}
                noun="returns"
                onRetry={() => returns.refresh()}
                empty={tab === "All" ? "No returns yet." : "No returns in this state."}
              />
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD strong mono>{r.rma}</TD>
                  <TD>
                    {r.customer}
                    <span className="ml-2 font-mono text-[10px] text-[var(--ink-muted)]">{r.order}</span>
                  </TD>
                  <TD>{r.item}</TD>
                  <TD>{r.reason}</TD>
                  <TD align="right" strong>{r.refund}</TD>
                  <TD align="right">
                    <StatusBadge tone={TONE[r.stage] ?? "neutral"}>{r.stage}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu actions={actionsFor(r)} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <EntityFormModal
        open={Boolean(deciding)}
        mode="edit"
        entity="return"
        subtitle={deciding ? `${deciding.rma} · ${deciding.item}` : undefined}
        submitLabel="Record decision"
        fields={RETURN_DECISION_FIELDS}
        initial={initial}
        onSubmit={recordDecision}
        onClose={() => setDeciding(null)}
      />

      <EntityFormModal
        open={creating}
        mode="create"
        entity="return"
        subtitle="Opens an RMA awaiting inspection"
        fields={createFields}
        onSubmit={createReturn}
        onClose={() => setCreating(false)}
      />
    </AdminScreen>
  );
}
