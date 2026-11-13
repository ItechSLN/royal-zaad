'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  Download,
  Eye,
  FileText,
  Plus,
  Printer,
  Truck,
  Upload,
} from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import {
  BulkBar,
  FilterBar,
  RowCheckbox,
  StatusTabs,
  TablePagination,
} from "@/components/admin/common/TableBits";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { getOrders, type Order, type OrderStatus, type PaymentStatus } from "@/services/order.service";
import { dayMonth, money } from "@/lib/admin-adapters";

const STATUS_TONE: Record<string, Tone> = {
  Pending: "neutral",
  Processing: "info",
  "Ready to ship": "warning",
  Shipped: "warning",
  Delivered: "success",
  Cancelled: "danger",
  Refunded: "info",
};

const PAYMENT_TONE: Record<string, Tone> = {
  Paid: "success",
  Pending: "warning",
  Refunded: "info",
  Failed: "danger",
};

const PAGE_SIZE = 10;

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Pending",
  PAID: "Paid",
  FAILED: "Failed",
  REFUNDED: "Refunded",
};

const CHANNEL_LABEL: Record<string, string> = {
  WEB: "Web",
  APP: "App",
  POS: "POS",
  MARKETPLACE: "Marketplace",
};

const SHIPMENT_LABEL: Record<string, string> = {
  AWAITING_DISPATCH: "awaiting dispatch",
  DISPATCHED: "dispatched",
  IN_TRANSIT: "in transit",
  OUT_FOR_DELIVERY: "out for delivery",
  DELIVERED: "delivered",
  FAILED: "failed",
};

/** Tab labels only — counts are computed from the loaded orders. */
const ORDER_TABS = ["All orders", ...Object.values(STATUS_LABEL)];

/** GET /orders includes channel and shipments, which the shared Order type omits. */
type ApiOrder = Order & {
  channel?: string;
  shipments?: { carrier: string; status: string }[];
};

const toRow = (o: ApiOrder) => {
  const name = `${o.customer?.firstName ?? ""} ${o.customer?.lastName ?? ""}`.trim() || "—";
  const shipment = o.shipments?.[0];
  return {
    id: o.id,
    number: o.orderNumber,
    placed: dayMonth(o.createdAt),
    placedTime: new Date(o.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    customer: name,
    email: o.customer?.email ?? "",
    initials: name
      .split(/\s+/)
      .map((part) => part[0] ?? "")
      .slice(0, 2)
      .join("")
      .toUpperCase(),
    channel: o.channel ? (CHANNEL_LABEL[o.channel] ?? o.channel) : "—",
    items: o.items.reduce((sum, i) => sum + i.quantity, 0),
    payment: o.payment?.provider ?? "—",
    paymentState: o.payment ? PAYMENT_LABEL[o.payment.status] : "No payment",
    total: money(o.total),
    fulfilment: shipment
      ? `${shipment.carrier} · ${SHIPMENT_LABEL[shipment.status] ?? shipment.status}`
      : "—",
    status: STATUS_LABEL[o.status] ?? o.status,
  };
};

type OrderRow = ReturnType<typeof toRow>;

/** Walk every page so tab counts reflect all orders, not just the first page. */
const FETCH_LIMIT = 100;
const fetchAllOrders = async () => {
  const all: ApiOrder[] = [];
  for (let page = 1; ; page++) {
    const res = await getOrders(page, FETCH_LIMIT);
    all.push(...((res?.data ?? []) as ApiOrder[]));
    if (!res?.meta || page >= res.meta.totalPages) break;
  }
  return all;
};

export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState("All orders");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Loading starts true; retry() re-arms it so the effect never sets state synchronously.
  const refresh = useCallback(
    () =>
      fetchAllOrders()
        .then((data) => {
          setOrders(data.map(toRow));
          setLoadError(null);
        })
        .catch((error: { message?: string }) => {
          setOrders([]);
          setLoadError(error?.message ?? "Unable to load orders.");
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    refresh();
  };

  const filtered = useMemo(
    () => orders.filter((o) => tab === "All orders" || o.status === tab),
    [orders, tab]
  );

  const tabs = ORDER_TABS.map((label) => ({
    label,
    count: loading || loadError
      ? undefined
      : label === "All orders"
        ? orders.length
        : orders.filter((o) => o.status === label).length,
  }));

  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Orders"
        subtitle="Every order across web, app, marketplace and retail POS."
        actions={[
          { label: "Import", icon: Upload },
          { label: "Export CSV", icon: Download },
          { label: "Create order", icon: Plus, emphasis: true, href: "/admin/orders/create" },
        ]}
      />

      <StatusTabs
        tabs={tabs}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
          setSelected([]);
        }}
      />

      <FilterBar
        filters={[
          { label: "Date range:", value: "All time" },
          { label: "Channel:", value: "All channels" },
          { label: "Payment:", value: "Any status" },
          { label: "Warehouse:", value: "All warehouses" },
          { label: "Courier:", value: "All couriers" },
          { label: "Tag:", value: "Any tag" },
        ]}
        trailing={
          <>
            <button type="button" className="font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]">
              Saved views
            </button>
            <button type="button" className="font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]">
              More filters
            </button>
            <button type="button" className="font-body text-[11px] font-semibold text-[var(--gold-deep)]">
              Reset
            </button>
          </>
        }
      />

      <BulkBar
        count={selected.length}
        total={filtered.length}
        actions={["Print invoices", "Print labels", "Mark as shipped", "Assign courier", "Cancel"]}
        onClear={() => setSelected([])}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH className="w-[36px]">
                <RowCheckbox
                  checked={allOnPageSelected}
                  label="Select all rows"
                  onChange={(next) =>
                    setSelected(next ? rows.map((r) => r.id) : [])
                  }
                />
              </TH>
              <TH>Order</TH>
              <TH>Placed</TH>
              <TH>Customer</TH>
              <TH>Channel</TH>
              <TH align="right">Items</TH>
              <TH>Payment</TH>
              <TH align="right">Total</TH>
              <TH>Fulfilment</TH>
              <TH>Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>

          <TBody>
            {loading && orders.length === 0 ? (
              <EmptyRow colSpan={11}>Loading orders…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={11}>
                {loadError}{" "}
                <button type="button" onClick={retry} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : orders.length === 0 ? (
              <EmptyRow colSpan={11}>No orders yet.</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={11}>No orders in this state.</EmptyRow>
            ) : (
              rows.map((o) => (
                <TR key={o.id} highlight={selected.includes(o.id)}>
                  <TD>
                    <RowCheckbox
                      checked={selected.includes(o.id)}
                      label={`Select ${o.number}`}
                      onChange={() => toggle(o.id)}
                    />
                  </TD>

                  <TD strong mono>
                    #{o.number}
                  </TD>

                  <TD>
                    {o.placed}
                    <span className="block font-mono text-[9.5px] text-[var(--ink-muted)]">
                      {o.placedTime}
                    </span>
                  </TD>

                  <TD>
                    <div className="flex items-center gap-[9px]">
                      <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[var(--cream-2)] font-body text-[9.5px] font-bold text-[var(--ink-muted)]">
                        {o.initials}
                      </span>
                      <div className="flex min-w-0 flex-col">
                        <span className="font-body text-[11.5px] font-semibold text-[var(--ink)]">
                          {o.customer}
                        </span>
                        <span className="font-mono text-[9px] text-[var(--ink-muted)]">
                          {o.email}
                        </span>
                      </div>
                    </div>
                  </TD>

                  <TD>{o.channel}</TD>
                  <TD align="right" mono>{o.items}</TD>

                  <TD>
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-[10.5px] text-[var(--ink)]">{o.payment}</span>
                      <StatusBadge tone={PAYMENT_TONE[o.paymentState] ?? "neutral"} showDot={false}>
                        {o.paymentState}
                      </StatusBadge>
                    </div>
                  </TD>

                  <TD align="right" strong>{o.total}</TD>
                  <TD>{o.fulfilment}</TD>

                  <TD>
                    <StatusBadge tone={STATUS_TONE[o.status] ?? "neutral"}>{o.status}</StatusBadge>
                  </TD>

                  <TD>
                    <RowMenu
                      actions={[
                        { label: "View order", icon: Eye, onSelect: () => router.push(`/admin/orders/${o.id}`) },
                        { label: "Print invoice", icon: FileText },
                        { label: "Print label", icon: Printer },
                        { label: "Mark as shipped", icon: Truck },
                        { label: "Cancel order", icon: Ban, danger: true },
                      ]}
                    />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
          noun="orders"
        />
      </Card>
    </div>
  );
}
