'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Store, Truck } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import ListStateRow from "@/components/admin/common/ListStateRow";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { OrderStatusBadge, fmtDate, money } from "@/components/vendor/ui";
import { getVendorOrders, type OrderStatus, type Paginated, type VendorOrder } from "@/services/vendor.service";

const TABS: { label: string; value?: OrderStatus }[] = [
  { label: "All" },
  { label: "New", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Shipped / ready", value: "SHIPPED" },
  { label: "Delivered", value: "DELIVERED" },
  { label: "Cancelled", value: "CANCELLED" },
  { label: "Refunded", value: "REFUNDED" },
];
const LIMIT = 10;

export default function VendorOrdersPage() {
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<VendorOrder> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const status = TABS.find((t) => t.label === tab)?.value;

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setResult(await getVendorOrders({ status, page, limit: LIMIT }));
    } catch {
      setResult(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when filters change
    void load();
  }, [load]);

  const rows = result?.data ?? [];
  const state = loading && !result ? "loading" : failed ? "error" : rows.length === 0 ? "empty" : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Orders"
        subtitle="Your part of each customer checkout. Open an order to accept, ship or hand it over."
      />
      <Card>
        <div className="px-5 pt-4">
          <StatusTabs
            tabs={TABS.map((t) => ({ label: t.label }))}
            active={tab}
            onChange={(label) => {
              setTab(label);
              setPage(1);
            }}
          />
        </div>
        <div className={`mt-2 ${loading && result ? "opacity-60" : ""}`}>
          <Table>
            <THead>
              <tr>
                <TH>Order</TH>
                <TH>Placed</TH>
                <TH>Customer</TH>
                <TH>Fulfilment</TH>
                <TH align="right">Items</TH>
                <TH align="right">Total</TH>
                <TH align="right">Your net</TH>
                <TH>Payment</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <TBody>
              {state ? (
                <ListStateRow
                  colSpan={9}
                  state={state}
                  onRetry={load}
                  noun="orders"
                  empty={status ? "No orders with this status." : "No orders yet — they'll appear here when customers buy your products."}
                />
              ) : (
                rows.map((o) => (
                  <TR key={o.id} highlight={o.status === "PENDING"}>
                    <TD strong>
                      <Link href={`/vendor/orders/${o.id}`} className="font-mono hover:underline">
                        {o.order.orderNumber}
                      </Link>
                    </TD>
                    <TD>{fmtDate(o.createdAt, true)}</TD>
                    <TD>{o.order.customer ? `${o.order.customer.firstName} ${o.order.customer.lastName}` : "—"}</TD>
                    <TD>
                      <span className="inline-flex items-center gap-1.5">
                        {o.fulfillmentMethod === "PICKUP" ? <Store size={12} /> : <Truck size={12} />}
                        {o.fulfillmentMethod === "PICKUP" ? "Pickup" : "Delivery"}
                      </span>
                    </TD>
                    <TD align="right" mono>{o.items.reduce((s, i) => s + i.quantity, 0)}</TD>
                    <TD align="right" mono>{money(o.total)}</TD>
                    <TD align="right" mono strong>{money(o.vendorNet)}</TD>
                    <TD>
                      {o.order.payment
                        ? `${o.order.payment.provider === "cod" ? "Cash" : "Card"} · ${o.order.payment.status.toLowerCase()}`
                        : "—"}
                    </TD>
                    <TD><OrderStatusBadge status={o.status} method={o.fulfillmentMethod} /></TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </div>
        {result && result.meta.total > LIMIT && (
          <TablePagination page={page} pageSize={LIMIT} total={result.meta.total} onPageChange={setPage} noun="orders" />
        )}
      </Card>
    </div>
  );
}
