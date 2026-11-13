'use client';

import { useEffect, useState } from "react";
import { Ban, Banknote, CircleCheck, ClockAlert, FileText, Pencil, Plus, Timer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import RowMenu, { type RowAction } from "@/components/admin/common/RowMenu";
import ListStateRow, { errorText, listState } from "@/components/admin/common/ListStateRow";
import { useAdminResource } from "@/hooks/useAdminResource";
import { invoicesApi } from "@/services/admin-resource.service";
import { fromInvoice, money, toInvoice } from "@/lib/admin-adapters";
import { getCustomers } from "@/services/customer.service";
import { getOrders, type Order } from "@/services/order.service";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { INVOICE_FIELDS } from "@/lib/admin-forms";

type Invoice = ReturnType<typeof fromInvoice>;

const TABS = ["All", "Open", "Paid", "Overdue", "Void"];
const TONE: Record<string, Tone> = { Paid: "success", Open: "info", Overdue: "danger", Void: "neutral" };

export default function InvoicesPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Invoice | null>(null);
  const [tab, setTab] = useState("All");
  const [customers, setCustomers] = useState<{ value: string; label: string }[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const invoices = useAdminResource({
    resource: invoicesApi,
    fallback: [],
    adapt: fromInvoice,
    params: { limit: 100 },
  });

  // Invoices are raised against a customer (and optionally one of their orders).
  useEffect(() => {
    if (!formOpen) return;
    getCustomers(1, 100)
      .then((res) =>
        setCustomers(
          (res?.data ?? []).map((c) => ({ value: c.id, label: `${c.firstName} ${c.lastName} · ${c.email}` }))
        )
      )
      .catch(() => setCustomers([]));
    getOrders(1, 100)
      .then((res) => setOrders(res.data.filter((o) => o.status !== "CANCELLED")))
      .catch(() => setOrders([]));
  }, [formOpen]);

  const rows = invoices.rows.filter((i) => tab === "All" || i.status === tab);
  const state = listState({ loading: invoices.loading, live: invoices.live, count: rows.length });
  const kpi = (v: string) => (invoices.live ? v : "—");

  const openInvoices = invoices.rows.filter((i) => i.statusValue === "OPEN" || i.statusValue === "OVERDUE");
  const outstanding = money(openInvoices.reduce((a, i) => a + i.balanceValue, 0));
  const paid = invoices.rows.filter((i) => i.statusValue === "PAID");
  const collected = money(
    invoices.rows
      .filter((i) => i.statusValue !== "VOID")
      .reduce((a, i) => a + (i.amountValue - i.balanceValue), 0)
  );
  const overdueRows = invoices.rows.filter((i) => i.statusValue === "OVERDUE");
  const overdueValue = money(overdueRows.reduce((a, i) => a + i.balanceValue, 0));

  const run = async (action: () => Promise<unknown>, done?: string) => {
    let ok = true;
    try {
      await action();
      if (done) toast.success(done);
    } catch (error) {
      ok = false;
      toast.error(errorText(error, "Unable to save the invoice."));
    }
    await invoices.refresh();
    return ok;
  };

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = toInvoice(values);
    const target = editing;
    return run(
      () => (target ? invoicesApi.update(target.id, payload) : invoicesApi.create(payload)),
      target ? `${target.number} updated.` : "Invoice created."
    );
  };

  const open = (inv?: Invoice) => {
    setEditing(inv ?? null);
    setFormOpen(true);
  };

  const actionsFor = (inv: Invoice): RowAction[] => {
    const actions: RowAction[] = [];
    if (inv.statusValue !== "PAID" && inv.statusValue !== "VOID") {
      actions.push(
        { label: "Edit invoice", icon: Pencil, onSelect: () => open(inv) },
        { label: "Mark paid", icon: CircleCheck, onSelect: () => void run(() => invoicesApi.update(inv.id, { status: "PAID" }), `${inv.number} marked paid.`) },
        { label: "Void", icon: Ban, onSelect: () => void run(() => invoicesApi.update(inv.id, { status: "VOID" }), `${inv.number} voided.`) }
      );
    }
    actions.push({
      label: "Delete",
      icon: Trash2,
      danger: true,
      onSelect: () => {
        if (window.confirm(`Delete ${inv.number}?`)) void run(() => invoicesApi.remove(inv.id), `${inv.number} deleted.`);
      },
    });
    return actions;
  };

  const selectedCustomer = editing?.customerId;
  const fields = INVOICE_FIELDS.map((f) => {
    if (f.name === "customerId") return { ...f, options: customers };
    if (f.name === "orderId") {
      return {
        ...f,
        options: orders
          .filter((o) => !selectedCustomer || o.customerId === selectedCustomer)
          .map((o) => ({
            value: o.id,
            label: `${o.orderNumber} · ${o.customer.firstName} ${o.customer.lastName} · ${money(o.total)}`,
          })),
      };
    }
    return f;
  });

  const initial: EntityValues | undefined = editing
    ? {
        customerId: editing.customerId,
        orderId: editing.orderId,
        issued: editing.issuedAt,
        due: editing.dueAt,
        amount: String(editing.amountValue),
        terms: editing.terms,
        notes: editing.notes,
      }
    : undefined;

  return (
    <AdminScreen
      title="Invoices"
      subtitle="Receivables, settlement and ageing."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      actions={[{ label: "New invoice", icon: Plus, emphasis: true, onClick: () => open() }]}
      kpis={[
        { label: "Outstanding balance", value: kpi(outstanding), icon: FileText, delta: `${openInvoices.length} invoices`, deltaTone: openInvoices.length ? "warning" : "muted", note: "not yet settled" },
        { label: "Collected", value: kpi(collected), icon: Banknote, delta: `${paid.length} paid in full`, deltaTone: "info", note: "received against invoices" },
        { label: "Overdue", value: kpi(overdueValue), icon: ClockAlert, delta: `${overdueRows.length} invoice(s)`, deltaTone: overdueRows.length ? "danger" : "muted", note: "past due date" },
        { label: "Invoices raised", value: kpi(String(invoices.meta.total)), icon: Timer, note: "across all customers" },
      ]}
    >
      <Card>
        <PanelHeading title="Invoices" subtitle="Issued to customers" />
        <Table>
          <THead>
            <tr>
              <TH>Invoice</TH>
              <TH>Customer</TH>
              <TH>Issued</TH>
              <TH>Due</TH>
              <TH align="right">Amount</TH>
              <TH align="right">Balance</TH>
              <TH align="right">Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={8}
                state={state}
                noun="invoices"
                onRetry={() => invoices.refresh()}
                empty={tab === "All" ? "No invoices yet." : "No invoices in this state."}
              />
            ) : (
              rows.map((inv) => (
                <TR key={inv.id}>
                  <TD strong mono>{inv.number}</TD>
                  <TD>{inv.customer}</TD>
                  <TD>{inv.issued}</TD>
                  <TD>{inv.due}</TD>
                  <TD align="right" mono>{inv.amount}</TD>
                  <TD align="right" strong>{inv.balance}</TD>
                  <TD align="right">
                    <StatusBadge tone={TONE[inv.status] ?? "neutral"}>{inv.status}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu actions={actionsFor(inv)} />
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
        entity="invoice"
        size="md"
        fields={fields}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />
    </AdminScreen>
  );
}
