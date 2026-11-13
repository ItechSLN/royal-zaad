'use client';

import { useCallback, useEffect, useState } from "react";
import { Clock, Landmark, Wallet } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import KpiCard from "@/components/admin/common/KpiCard";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { StateBlock, errorText, fmtDate, money } from "@/components/vendor/ui";
import { getVendorPayouts, type VendorPayouts } from "@/services/vendor.service";

const PAYOUT_TONE = { PENDING: "warning", PAID: "success", CANCELLED: "neutral" } as const;

export default function VendorPayoutsPage() {
  const [data, setData] = useState<VendorPayouts | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(await getVendorPayouts());
    } catch (e) {
      setError(errorText(e, "Couldn't load your payouts."));
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Payouts"
        subtitle="Your earnings after commission. Delivered, paid orders become payable; the marketplace pays them out to you."
      />

      {!data ? (
        <Card>
          <StateBlock state={error ? "error" : "loading"} noun="your payouts" error={error} onRetry={load} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiCard
              label="Available balance"
              value={money(data.balance)}
              icon={Wallet}
              note={`${data.payableOrders} delivered order${data.payableOrders === 1 ? "" : "s"} awaiting payout`}
            />
            <KpiCard label="Pending clearance" value={money(data.pendingClearance)} icon={Clock} note="paid orders not yet delivered" />
            <KpiCard
              label="Paid out to date"
              value={money(data.payouts.filter((p) => p.status === "PAID").reduce((s, p) => s + Number(p.amount), 0))}
              icon={Landmark}
              note="last 50 payouts"
            />
          </div>

          <Card>
            <PanelHeading title="Payout history" subtitle="Recorded by the marketplace when it pays you." />
            <Table>
              <THead>
                <tr>
                  <TH>Created</TH>
                  <TH>Reference</TH>
                  <TH align="right">Orders</TH>
                  <TH align="right">Amount</TH>
                  <TH>Status</TH>
                  <TH>Paid</TH>
                </tr>
              </THead>
              <TBody>
                {data.payouts.length === 0 ? (
                  <EmptyRow colSpan={6}>No payouts yet.</EmptyRow>
                ) : (
                  data.payouts.map((p) => (
                    <TR key={p.id}>
                      <TD>{fmtDate(p.createdAt)}</TD>
                      <TD mono>{p.reference ?? "—"}</TD>
                      <TD align="right" mono>{p._count.vendorOrders}</TD>
                      <TD align="right" mono strong>
                        {p.currency === "USD" ? money(p.amount) : `${Number(p.amount).toFixed(2)} ${p.currency}`}
                      </TD>
                      <TD>
                        <StatusBadge tone={PAYOUT_TONE[p.status] ?? "neutral"}>
                          {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                        </StatusBadge>
                      </TD>
                      <TD>{fmtDate(p.paidAt)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </>
      )}
    </div>
  );
}
