'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, ImageOff, PackageCheck, Truck, XCircle } from "lucide-react";
import Card from "@/components/admin/common/Card";
import Modal, { ModalButton } from "@/components/admin/form/Modal";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { getVendorOrder, updateVendorOrder, type VendorOrder } from "@/services/vendor.service";
import { Btn, OrderStatusBadge, Panel, Row, StateBlock, TextField, errorText, fmtDate, money } from "./ui";

type Action = "accept" | "ship" | "deliver" | "cancel";

/** Only the transitions the API allows from the current state. */
const nextActions = (o: VendorOrder): Action[] => {
  const out: Action[] = [];
  if (o.status === "PENDING" && o.order.payment?.provider === "cod") out.push("accept");
  if (o.status === "PROCESSING") out.push("ship");
  if (o.status === "SHIPPED") out.push("deliver");
  if (o.status === "PENDING" || o.status === "PROCESSING") out.push("cancel");
  return out;
};

export default function VendorOrderDetail({ id }: { id: string }) {
  const [order, setOrder] = useState<VendorOrder | null>(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState<Action | null>(null);
  const [actionError, setActionError] = useState("");
  const [dialog, setDialog] = useState<"ship" | "cancel" | null>(null);
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [shipErrors, setShipErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoadError("");
    try {
      setOrder(await getVendorOrder(id));
    } catch (e) {
      setLoadError(errorText(e, "Couldn't load this order."));
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  if (!order) {
    return (
      <Card>
        <StateBlock state={loadError ? "error" : "loading"} noun="this order" error={loadError} onRetry={load} />
        <div className="pb-6 text-center">
          <Link href="/vendor/orders" className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)] underline">
            Back to orders
          </Link>
        </div>
      </Card>
    );
  }

  const pickup = order.fulfillmentMethod === "PICKUP";

  const run = async (action: Action, extra: { carrier?: string; trackingNumber?: string } = {}) => {
    const status = { accept: "PROCESSING", ship: "SHIPPED", deliver: "DELIVERED", cancel: "CANCELLED" }[action] as
      | "PROCESSING"
      | "SHIPPED"
      | "DELIVERED"
      | "CANCELLED";
    setBusy(action);
    setActionError("");
    try {
      const updated = await updateVendorOrder(order.id, { status, ...extra });
      setOrder(updated);
      setDialog(null);
      toast.success(
        {
          accept: "Order accepted.",
          ship: pickup ? "Marked ready for collection." : "Marked as shipped.",
          deliver: pickup ? "Marked as collected." : "Marked as delivered.",
          cancel: "Order cancelled and items restocked.",
        }[action]
      );
      return true;
    } catch (e) {
      const api = e as { errors?: Record<string, string> };
      if (action === "ship" && api.errors) setShipErrors(api.errors);
      setActionError(errorText(e, "Couldn't update the order."));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const submitShip = () => {
    const errs: Record<string, string> = {};
    if (tracking.trim() && tracking.trim().length < 3) errs.trackingNumber = "At least 3 characters";
    setShipErrors(errs);
    if (Object.keys(errs).length) return;
    void run("ship", {
      ...(carrier.trim() ? { carrier: carrier.trim() } : {}),
      ...(tracking.trim() ? { trackingNumber: tracking.trim() } : {}),
    });
  };

  const actions = nextActions(order);
  const addr = order.order.shippingAddress;
  const customer = order.order.customer;
  const payment = order.order.payment;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[14px] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/vendor/orders" aria-label="Back to orders" className="mt-1 text-[var(--ink-muted)] hover:text-[var(--ink)]">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-mono text-[18px] font-semibold text-[var(--ink)]">{order.order.orderNumber}</h2>
              <OrderStatusBadge status={order.status} method={order.fulfillmentMethod} />
            </div>
            <p className="font-body text-[11px] text-[var(--ink-muted)]">
              Placed {fmtDate(order.createdAt, true)} · {pickup ? "Customer collects from your shop" : "Delivery to the customer"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {actions.includes("accept") && (
            <Btn variant="dark" disabled={!!busy} onClick={() => void run("accept")}>
              <CheckCircle2 size={13} /> {busy === "accept" ? "Accepting…" : "Accept order"}
            </Btn>
          )}
          {actions.includes("ship") &&
            (pickup ? (
              <Btn variant="dark" disabled={!!busy} onClick={() => void run("ship")}>
                <PackageCheck size={13} /> {busy === "ship" ? "Saving…" : "Ready for collection"}
              </Btn>
            ) : (
              <Btn variant="dark" disabled={!!busy} onClick={() => setDialog("ship")}>
                <Truck size={13} /> Mark shipped
              </Btn>
            ))}
          {actions.includes("deliver") && (
            <Btn variant="dark" disabled={!!busy} onClick={() => void run("deliver")}>
              <CheckCircle2 size={13} /> {busy === "deliver" ? "Saving…" : pickup ? "Mark collected" : "Mark delivered"}
            </Btn>
          )}
          {actions.includes("cancel") && (
            <Btn variant="danger" disabled={!!busy} onClick={() => setDialog("cancel")}>
              <XCircle size={13} /> Cancel order
            </Btn>
          )}
        </div>
      </div>

      {order.status === "PENDING" && payment?.provider !== "cod" && (
        <p className="rounded-[2px] border border-[var(--border)] bg-[var(--info-bg)] px-4 py-3 font-body text-[12px] text-[var(--ink)]">
          Waiting for the customer&apos;s card payment. The order moves to processing automatically once it&apos;s paid.
        </p>
      )}
      {actionError && !dialog && (
        <p role="alert" className="rounded-[2px] border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 font-body text-[12px] text-[var(--danger)]">
          {actionError}
        </p>
      )}

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.7fr)_1fr]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Card>
            <div className="px-5 pb-3 pt-5">
              <h3 className="font-display text-[19px] font-semibold text-[var(--ink)]">Items</h3>
            </div>
            <Table>
              <THead>
                <tr>
                  <TH>Product</TH>
                  <TH>SKU</TH>
                  <TH align="right">Qty</TH>
                  <TH align="right">Unit price</TH>
                  <TH align="right">Total</TH>
                </tr>
              </THead>
              <TBody>
                {order.items.map((item) => (
                  <TR key={item.id}>
                    <TD>
                      <span className="flex items-center gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)]">
                          {item.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <ImageOff size={14} className="text-[var(--ink-muted)]" />
                          )}
                        </span>
                        <span className="font-semibold text-[var(--ink)]">{item.productName}</span>
                      </span>
                    </TD>
                    <TD mono>{item.sku}</TD>
                    <TD align="right" mono>{item.quantity}</TD>
                    <TD align="right" mono>{money(item.unitPrice)}</TD>
                    <TD align="right" mono strong>{money(item.total)}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </Card>

          <Panel title="Shipments" subtitle={pickup ? "Pickup orders have no shipment." : undefined}>
            {order.shipments.length === 0 ? (
              <p className="font-body text-[12px] text-[var(--ink-muted)]">
                {pickup ? "The customer collects this order from your shop." : "Not shipped yet."}
              </p>
            ) : (
              order.shipments.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[2px] border border-[var(--border)] px-4 py-3">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-body text-[12px] font-semibold text-[var(--ink)]">{s.carrier}</span>
                    <span className="font-mono text-[11px] text-[var(--ink-muted)]">Tracking {s.awb}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge tone={s.status === "DELIVERED" ? "success" : "warning"}>
                      {s.status.replace(/_/g, " ").toLowerCase()}
                    </StatusBadge>
                    <span className="font-body text-[10.5px] text-[var(--ink-muted)]">
                      {s.deliveredAt ? `Delivered ${fmtDate(s.deliveredAt, true)}` : `Dispatched ${fmtDate(s.dispatchedAt, true)}`}
                    </span>
                  </div>
                </div>
              ))
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Panel title="Customer">
            <div>
              <Row label="Name">{customer ? `${customer.firstName} ${customer.lastName}` : "—"}</Row>
              <Row label="Fulfilment">{pickup ? "Pickup from your shop" : "Delivery"}</Row>
            </div>
            {!pickup && addr && (
              <div className="rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-4 py-3 font-body text-[12px] leading-[1.7] text-[var(--ink)]">
                <span className="mb-1 block font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">DELIVER TO</span>
                {addr.recipientName && <div className="font-semibold">{addr.recipientName}</div>}
                <div>{addr.line1}</div>
                {addr.line2 && <div>{addr.line2}</div>}
                <div>{[addr.city, addr.state, addr.postalCode].filter(Boolean).join(", ")}</div>
                <div>{addr.country}</div>
                {addr.phone && (
                  <a href={`tel:${addr.phone}`} className="mt-1 block font-semibold text-[var(--gold-deep)]">
                    {addr.phone}
                  </a>
                )}
              </div>
            )}
          </Panel>

          <Panel title="Payment">
            <div>
              <Row label="Method">{payment ? (payment.provider === "cod" ? "Cash on delivery" : payment.provider === "card" ? "Card" : payment.provider) : "—"}</Row>
              <Row label="Status">{payment?.status ? payment.status.charAt(0) + payment.status.slice(1).toLowerCase() : "—"}</Row>
            </div>
          </Panel>

          <Panel title="Totals">
            <div>
              <Row label="Subtotal">{money(order.subtotal)}</Row>
              {Number(order.discountTotal) > 0 && <Row label="Discount">−{money(order.discountTotal)}</Row>}
              <Row label={pickup ? "Shipping (pickup)" : "Shipping"}>{money(order.shippingTotal)}</Row>
              <Row label="Tax">{money(order.taxTotal)}</Row>
              <Row label="Order total">{money(order.total)}</Row>
              <Row label={`Commission (${Number(order.commissionRate)}%)`}>−{money(order.commissionAmount)}</Row>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--border-strong)] pt-3">
              <span className="font-body text-[12px] font-semibold text-[var(--ink)]">Your net</span>
              <span className="font-display text-[24px] font-semibold text-[var(--ink)]">{money(order.vendorNet)}</span>
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={dialog === "ship"}
        size="sm"
        title="Mark as shipped"
        subtitle="Add tracking if you have it — both fields are optional."
        onClose={() => setDialog(null)}
        footer={
          <>
            <ModalButton onClick={() => setDialog(null)}>Back</ModalButton>
            <ModalButton variant="dark" onClick={submitShip} disabled={!!busy}>
              {busy === "ship" ? "Saving…" : "Mark shipped"}
            </ModalButton>
          </>
        }
      >
        <TextField label="CARRIER" value={carrier} error={shipErrors.carrier} placeholder="e.g. Aramex, SMSA, own driver" onChange={setCarrier} />
        <TextField label="TRACKING NUMBER" value={tracking} error={shipErrors.trackingNumber} onChange={setTracking} />
        {actionError && <p role="alert" className="font-body text-[11.5px] text-[var(--danger)]">{actionError}</p>}
      </Modal>

      <Modal
        open={dialog === "cancel"}
        size="sm"
        title="Cancel this order?"
        onClose={() => setDialog(null)}
        footer={
          <>
            <ModalButton onClick={() => setDialog(null)}>Keep order</ModalButton>
            <ModalButton variant="danger" onClick={() => void run("cancel")} disabled={!!busy}>
              {busy === "cancel" ? "Cancelling…" : "Cancel order"}
            </ModalButton>
          </>
        }
      >
        <p className="font-body text-[12.5px] leading-[1.7] text-[var(--ink-muted)]">
          The customer&apos;s items from your shop will be cancelled and returned to your stock. This can&apos;t be undone.
        </p>
        {actionError && <p role="alert" className="font-body text-[11.5px] text-[var(--danger)]">{actionError}</p>}
      </Modal>
    </div>
  );
}
