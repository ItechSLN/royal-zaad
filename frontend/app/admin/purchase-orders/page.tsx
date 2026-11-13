'use client';

import { useEffect, useState } from "react";
import { Ban, ClipboardList, Clock, FileText, PackageCheck, Pencil, Plus, Send, Stamp, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import RowMenu, { type RowAction } from "@/components/admin/common/RowMenu";
import ListStateRow, { errorText, listState } from "@/components/admin/common/ListStateRow";
import { useAdminResource } from "@/hooks/useAdminResource";
import {
  purchaseOrdersApi,
  suppliersApi,
  warehousesApi,
} from "@/services/admin-resource.service";
import { getProducts } from "@/services/product.service";
import {
  fromPurchaseOrder,
  fromSupplier,
  fromWarehouse,
  money,
  toPurchaseOrder,
} from "@/lib/admin-adapters";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { PURCHASE_ORDER_FIELDS } from "@/lib/admin-forms";

type PurchaseOrder = ReturnType<typeof fromPurchaseOrder>;

const TABS = ["All", "Draft", "Awaiting approval", "Approved", "Overdue", "Received", "Cancelled"];

const TONE: Record<string, Tone> = {
  Draft: "neutral",
  "Awaiting approval": "warning",
  Approved: "info",
  Overdue: "danger",
  Received: "success",
  Cancelled: "neutral",
};

export default function PurchaseOrdersPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [tab, setTab] = useState("All");
  const [products, setProducts] = useState<{ value: string; label: string }[]>([]);

  const orders = useAdminResource({
    resource: purchaseOrdersApi,
    fallback: [],
    adapt: fromPurchaseOrder,
    params: { limit: 100 },
  });

  // The PO form needs live suppliers, warehouses and products to pick from.
  const suppliers = useAdminResource({
    resource: suppliersApi,
    fallback: [],
    adapt: fromSupplier,
    params: { limit: 100 },
  });

  const warehouses = useAdminResource({
    resource: warehousesApi,
    fallback: [],
    adapt: fromWarehouse,
    params: { limit: 100 },
  });

  useEffect(() => {
    if (!formOpen) return;
    getProducts(1, 100)
      .then((res) => setProducts(res.data.map((p) => ({ value: p.id, label: `${p.name} · ${p.sku}` }))))
      .catch(() => setProducts([]));
  }, [formOpen]);

  const rows = orders.rows.filter((p) => tab === "All" || p.status === tab);
  const state = listState({ loading: orders.loading, live: orders.live, count: rows.length });
  const kpi = (v: string) => (orders.live ? v : "—");

  const openRows = orders.rows.filter((p) => !["RECEIVED", "CANCELLED"].includes(p.statusValue));
  const openCommitment = money(openRows.reduce((a, p) => a + p.totalValue, 0));
  const awaiting = orders.rows.filter((p) => p.statusValue === "AWAITING_APPROVAL").length;
  const overdue = orders.rows.filter((p) => p.statusValue === "OVERDUE").length;
  const received = orders.rows.filter((p) => p.statusValue === "RECEIVED").length;

  const run = async (action: () => Promise<unknown>, done?: string) => {
    let ok = true;
    try {
      await action();
      if (done) toast.success(done);
    } catch (error) {
      ok = false;
      toast.error(errorText(error, "Unable to update the purchase order."));
    }
    await orders.refresh();
    return ok;
  };

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = toPurchaseOrder(values);
    const target = editing;
    return run(
      () => (target ? purchaseOrdersApi.update(target.id, payload) : purchaseOrdersApi.create(payload)),
      target ? `${target.po} updated.` : "Purchase order raised."
    );
  };

  const move = (p: PurchaseOrder, status: string, done: string) =>
    void run(() => purchaseOrdersApi.update(p.id, { status }), `${p.po} ${done}.`);

  const actionsFor = (p: PurchaseOrder): RowAction[] => {
    const s = p.statusValue;
    const actions: RowAction[] = [];
    if (s === "RECEIVED" || s === "CANCELLED") {
      actions.push({ label: "View supplier", icon: ClipboardList, href: "/admin/suppliers" });
    } else {
      actions.push({ label: "Edit PO", icon: Pencil, onSelect: () => open(p) });
      if (s === "DRAFT") actions.push({ label: "Send for approval", icon: Send, onSelect: () => move(p, "AWAITING_APPROVAL", "sent for approval") });
      if (s === "DRAFT" || s === "AWAITING_APPROVAL") actions.push({ label: "Approve", icon: Stamp, onSelect: () => move(p, "APPROVED", "approved") });
      if (s === "APPROVED" || s === "OVERDUE") {
        actions.push({
          label: p.lines ? `Receive ${p.units} unit(s) into stock` : "Receive stock (add a product line first)",
          icon: PackageCheck,
          onSelect: () => {
            if (window.confirm(`Receive ${p.po}? Its lines are booked into inventory once.`)) move(p, "RECEIVED", "received into stock");
          },
        });
      }
      actions.push({ label: "Cancel PO", icon: Ban, onSelect: () => move(p, "CANCELLED", "cancelled") });
    }
    if (["DRAFT", "AWAITING_APPROVAL", "CANCELLED"].includes(s)) {
      actions.push({
        label: "Delete",
        icon: Trash2,
        danger: true,
        onSelect: () => {
          if (window.confirm(`Delete ${p.po}?`)) void run(() => purchaseOrdersApi.remove(p.id), `${p.po} deleted.`);
        },
      });
    }
    return actions;
  };

  // Swap the schema's empty options for what actually exists.
  const fields = PURCHASE_ORDER_FIELDS.map((f) =>
    f.name === "supplier"
      ? { ...f, options: suppliers.rows.map((s) => ({ value: s.id, label: s.name })) }
      : f.name === "warehouse"
        ? { ...f, options: warehouses.rows.map((w) => ({ value: w.id, label: w.name })) }
        : f.name === "product"
          ? { ...f, options: products }
          : f
  );

  const open = (p?: PurchaseOrder) => {
    setEditing(p ?? null);
    setFormOpen(true);
  };

  const initial: EntityValues | undefined = editing
    ? {
        supplier: editing.supplierId,
        warehouse: editing.warehouseId,
        product: editing.product,
        units: String(editing.units),
        unitCost: editing.unitCost,
        total: editing.product ? "" : String(editing.totalValue),
        expected: editing.expectedAt,
        reference: editing.reference,
        notes: editing.notes,
      }
    : undefined;

  return (
    <AdminScreen
      title="Purchase Orders"
      subtitle="Supplier commitments, approvals and expected receipts."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      actions={[{ label: "Raise PO", icon: Plus, emphasis: true, onClick: () => open() }]}
      kpis={[
        { label: "Open commitment", value: kpi(openCommitment), icon: FileText, delta: `${openRows.length} POs`, deltaTone: "info", note: "not yet received" },
        { label: "Awaiting approval", value: kpi(String(awaiting)), icon: Stamp, delta: awaiting ? "needs sign-off" : "all clear", deltaTone: awaiting ? "warning" : "muted", note: "raised this period" },
        { label: "Overdue deliveries", value: kpi(String(overdue)), icon: Clock, delta: overdue ? "past due" : "on track", deltaTone: overdue ? "danger" : "muted", note: "past expected date" },
        { label: "Received", value: kpi(String(received)), icon: Truck, delta: `${orders.meta.total} total`, deltaTone: "muted", note: "booked into stock" },
      ]}
    >
      <Card>
        <PanelHeading title="Purchase orders" subtitle="All commitments across suppliers" />
        <Table>
          <THead>
            <tr>
              <TH>PO #</TH>
              <TH>Supplier</TH>
              <TH>Expected</TH>
              <TH align="right">Units</TH>
              <TH align="right">Total</TH>
              <TH align="right">Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={7}
                state={state}
                noun="purchase orders"
                onRetry={() => orders.refresh()}
                empty={tab === "All" ? "No purchase orders yet." : "No purchase orders in this state."}
              />
            ) : (
              rows.map((p) => (
                <TR key={p.id}>
                  <TD strong mono>{p.po}</TD>
                  <TD>{p.supplier}</TD>
                  <TD>{p.expected}</TD>
                  <TD align="right" mono>{p.units.toLocaleString()}</TD>
                  <TD align="right" strong>{p.total}</TD>
                  <TD align="right">
                    <StatusBadge tone={TONE[p.status] ?? "neutral"}>{p.status}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu actions={actionsFor(p)} />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>
      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="purchase order"
        size="md"
        fields={fields}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />
    </AdminScreen>
  );
}
