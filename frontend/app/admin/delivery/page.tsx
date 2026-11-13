'use client';

import { useEffect, useState } from "react";
import { CircleCheck, MapPin, Pencil, Plus, Timer, Trash2, TriangleAlert, Truck } from "lucide-react";
import { toast } from "sonner";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ListStateRow, { errorText, listState } from "@/components/admin/common/ListStateRow";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { SHIPMENT_FIELDS } from "@/lib/admin-forms";
import { useAdminResource } from "@/hooks/useAdminResource";
import { shipmentsApi } from "@/services/admin-resource.service";
import { getOrders, type Order } from "@/services/order.service";
import { fromShipment, toShipment } from "@/lib/admin-adapters";

type Shipment = ReturnType<typeof fromShipment>;

const TONE: Record<string, Tone> = {
  Delivered: "success",
  "Out for delivery": "warning",
  "In transit": "info",
  Dispatched: "info",
  Failed: "danger",
};

const BOARD: { stage: string; statuses: string[]; tone: Tone }[] = [
  { stage: "Awaiting dispatch", statuses: ["awaiting_dispatch"], tone: "neutral" },
  { stage: "In transit", statuses: ["dispatched", "in_transit"], tone: "info" },
  { stage: "Out for delivery", statuses: ["out_for_delivery"], tone: "warning" },
  { stage: "Delivered", statuses: ["delivered"], tone: "success" },
  { stage: "Failed", statuses: ["failed"], tone: "danger" },
];

const sameDay = (iso: string | null) =>
  !!iso && new Date(iso).toDateString() === new Date().toDateString();

export default function DeliveryPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Shipment | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const shipments = useAdminResource({
    resource: shipmentsApi,
    fallback: [],
    adapt: fromShipment,
    params: { limit: 100 },
  });

  // Only orders in fulfilment can be handed to a carrier.
  useEffect(() => {
    if (!formOpen || editing) return;
    getOrders(1, 100)
      .then((res) => setOrders(res.data.filter((o) => o.status === "PROCESSING" || o.status === "SHIPPED")))
      .catch(() => setOrders([]));
  }, [formOpen, editing]);

  const rows = shipments.rows;
  const state = listState({ loading: shipments.loading, live: shipments.live, count: rows.length });
  const kpi = (v: string) => (shipments.live ? v : "—");

  const count = (statuses: string[]) => rows.filter((s) => statuses.includes(s.statusValue)).length;
  const dispatchedToday = rows.filter((s) => sameDay(s.dispatchedAt)).length;
  const delivered = rows.filter((s) => s.deliveredAt);
  const avgDays = delivered.length
    ? delivered.reduce(
        (a, s) => a + (new Date(s.deliveredAt).getTime() - new Date(s.dispatchedAt ?? s.createdAt).getTime()),
        0
      ) / delivered.length / 864e5
    : null;
  const failed = count(["failed"]);

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = toShipment(values);
    const target = editing;
    let ok = true;
    try {
      if (target) {
        // The order is fixed once a consignment is booked.
        const { orderId: _orderId, ...changes } = payload;
        await shipmentsApi.update(target.id, changes);
        toast.success(`Shipment ${target.awb} updated.`);
      } else {
        await shipmentsApi.create(payload);
        toast.success("Shipment booked.");
      }
    } catch (error) {
      ok = false;
      toast.error(errorText(error, "Unable to save the shipment."));
    }
    await shipments.refresh();
    return ok;
  };

  const remove = async (s: Shipment) => {
    if (!window.confirm(`Delete shipment ${s.awb}?`)) return;
    try {
      await shipmentsApi.remove(s.id);
      toast.success("Shipment deleted.");
    } catch (error) {
      toast.error(errorText(error, "Unable to delete the shipment."));
    }
    await shipments.refresh();
  };

  const openForm = (s?: Shipment) => {
    setEditing(s ?? null);
    setFormOpen(true);
  };

  const initial: EntityValues | undefined = editing
    ? {
        orderId: editing.orderId,
        carrier: editing.carrier.toLowerCase(),
        service: editing.service,
        awb: editing.awb,
        status: editing.statusValue,
        eta: editing.etaValue,
        instructions: editing.instructions,
      }
    : undefined;

  const fields = SHIPMENT_FIELDS.map((f) =>
    f.name === "orderId"
      ? editing
        ? { ...f, type: "select" as const, options: [{ value: editing.orderId, label: editing.order }] }
        : {
            ...f,
            options: orders.map((o) => ({
              value: o.id,
              label: `${o.orderNumber} · ${o.customer.firstName} ${o.customer.lastName}`,
            })),
            help: orders.length ? undefined : "No orders are waiting for fulfilment",
          }
      : f
  );

  return (
    <AdminScreen
      title="Delivery"
      subtitle="Dispatch, carriers and delivery performance."
      actions={[{ label: "New shipment", icon: Plus, emphasis: true, onClick: () => openForm() }]}
      kpis={[
        { label: "Dispatched today", value: kpi(String(dispatchedToday)), icon: Truck, note: `${rows.length} shipments tracked` },
        { label: "Delivered", value: kpi(String(delivered.length)), icon: CircleCheck, note: "with a delivery time" },
        { label: "Avg. delivery time", value: kpi(avgDays === null ? "—" : `${avgDays.toFixed(1)} days`), icon: Timer, note: "dispatch to doorstep" },
        { label: "Failed attempts", value: kpi(String(failed)), icon: TriangleAlert, deltaTone: failed ? "danger" : "muted", delta: failed ? "needs re-attempt" : undefined, note: "awaiting re-delivery" },
      ]}
    >
      <Card>
        <PanelHeading title="Delivery board" subtitle="Live shipment stages" />
        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-5">
          {BOARD.map((b) => (
            <div key={b.stage} className="flex flex-col items-center gap-2 bg-[var(--surface)] px-3 py-6">
              <span className="font-display text-[28px] font-semibold leading-none text-[var(--ink)]">
                {shipments.live ? count(b.statuses).toLocaleString() : "—"}
              </span>
              <StatusBadge tone={b.tone}>{b.stage}</StatusBadge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <PanelHeading title="Shipments" subtitle="Tracked consignments in the network" />
        <Table>
          <THead>
            <tr>
              <TH>AWB</TH>
              <TH>Order</TH>
              <TH>Carrier</TH>
              <TH>Destination</TH>
              <TH>ETA</TH>
              <TH align="right">Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={7}
                state={state}
                noun="shipments"
                onRetry={() => shipments.refresh()}
                empty="No shipments yet."
              />
            ) : (
              rows.map((s) => (
                <TR key={s.id}>
                  <TD strong mono>{s.awb}</TD>
                  <TD mono>{s.order}</TD>
                  <TD>{s.carrier}</TD>
                  <TD>{s.city}</TD>
                  <TD>{s.eta}</TD>
                  <TD align="right">
                    <StatusBadge tone={TONE[s.status] ?? "neutral"}>{s.status}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        ...(s.statusValue !== "delivered"
                          ? [{ label: "Update shipment", icon: Pencil, onSelect: () => openForm(s) }]
                          : []),
                        { label: "Track parcel", icon: MapPin, href: `/track/${encodeURIComponent(s.order)}` },
                        { label: "Open order", icon: Truck, href: "/admin/orders" },
                        ...(s.statusValue !== "delivered"
                          ? [{ label: "Delete", icon: Trash2, danger: true, onSelect: () => void remove(s) }]
                          : []),
                      ]}
                    />
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
        entity="shipment"
        subtitle={editing ? `${editing.awb} · ${editing.order}` : undefined}
        fields={fields}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />
    </AdminScreen>
  );
}
