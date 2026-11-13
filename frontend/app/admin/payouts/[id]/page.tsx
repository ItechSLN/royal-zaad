'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { ModalButton } from "@/components/admin/form/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { money, shortDate } from "@/lib/admin-adapters";
import { getPayout, type PayoutDetail } from "@/services/marketplace-admin.service";
import {
  Detail,
  ORDER_TONE,
  PAYOUT_TONE,
  PanelState,
  label,
  personName,
} from "@/app/admin/marketplace/_components/bits";
import PayoutDialog from "@/app/admin/marketplace/_components/PayoutDialog";

export default function PayoutDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [payout, setPayout] = useState<PayoutDetail | null>(null);
  const [error, setError] = useState<any>(null);
  const [mode, setMode] = useState<"PAID" | "CANCELLED" | null>(null);
  const [nonce, setNonce] = useState(0);

  const load = useCallback(() => {
    setError(null);
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getPayout(id).then(
      (data) => {
        if (cancelled) return;
        setPayout(data);
        setError(null);
      },
      (err) => !cancelled && setError(err)
    );
    return () => {
      cancelled = true;
    };
  }, [id, nonce]);

  const back = (
    <Link
      href="/admin/payouts"
      className="inline-flex w-fit items-center gap-1.5 font-body text-[11.5px] font-semibold text-[var(--gold-deep)] hover:text-[var(--ink)]"
    >
      <ArrowLeft size={13} /> Back to payouts
    </Link>
  );

  if (!payout) {
    return (
      <div className="flex flex-col gap-[18px]">
        {back}
        <Card>
          <PanelState loading={!error} error={error} noun="this payout" onRetry={load} />
        </Card>
      </div>
    );
  }

  const shopName = payout.vendor.shop?.name ?? payout.vendor.user?.email ?? "Vendor";
  const sums = payout.subOrders.reduce(
    (a, s) => ({ total: a.total + s.total, commission: a.commission + s.commissionAmount, net: a.net + s.vendorNet }),
    { total: 0, commission: 0, net: 0 }
  );

  return (
    <div className="flex flex-col gap-[18px]">
      {back}

      <div className="flex flex-col gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-[24px] font-semibold leading-tight text-[var(--ink)]">
              {money(payout.amount)} <span className="font-mono text-[12px] text-[var(--ink-muted)]">{payout.currency}</span>
            </h2>
            <StatusBadge tone={PAYOUT_TONE[payout.status]}>{label(payout.status)}</StatusBadge>
          </div>
          <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
            Payout to{" "}
            <Link href={`/admin/vendors/${payout.vendorId}`} className="font-semibold text-[var(--ink)] hover:text-[var(--gold-deep)]">
              {shopName}
            </Link>{" "}
            · created {shortDate(payout.createdAt)}
          </p>
        </div>
        {payout.status === "PENDING" && (
          <div className="flex flex-wrap gap-2">
            <ModalButton variant="danger" onClick={() => setMode("CANCELLED")}>Cancel payout</ModalButton>
            <ModalButton variant="dark" onClick={() => setMode("PAID")}>Mark paid</ModalButton>
          </div>
        )}
      </div>

      <Card>
        <PanelHeading title="Details" />
        <dl className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2 xl:grid-cols-4">
          <Detail term="Vendor">
            <span className="flex flex-col">
              <span>{personName(payout.vendor.user)}</span>
              <span className="text-[11px] text-[var(--ink-muted)]">{payout.vendor.user?.email ?? "—"}</span>
            </span>
          </Detail>
          <Detail term="Reference">
            <span className="font-mono">{payout.reference ?? "—"}</span>
          </Detail>
          <Detail term="Paid">{shortDate(payout.paidAt)}</Detail>
          <Detail term="Note">{payout.note || "—"}</Detail>
        </dl>
      </Card>

      <Card>
        <PanelHeading title="Sub-orders" subtitle={`${payout.subOrders.length} sub-order(s) in this payout`} />
        <Table>
          <THead>
            <tr>
              <TH>Order</TH>
              <TH>Status</TH>
              <TH>Placed</TH>
              <TH align="right">Total</TH>
              <TH align="right">Commission</TH>
              <TH align="right">Vendor net</TH>
            </tr>
          </THead>
          <TBody>
            {payout.subOrders.length === 0 ? (
              <EmptyRow colSpan={6}>
                {payout.status === "CANCELLED"
                  ? "This payout was cancelled — its sub-orders were released."
                  : "No sub-orders in this payout."}
              </EmptyRow>
            ) : (
              <>
                {payout.subOrders.map((s) => (
                  <TR key={s.id}>
                    <TD strong mono>
                      <Link href={`/admin/orders/${s.orderId}`} className="hover:text-[var(--gold-deep)]">
                        {s.orderNumber}
                      </Link>
                    </TD>
                    <TD>
                      <StatusBadge tone={ORDER_TONE[s.status] ?? "neutral"}>{label(s.status)}</StatusBadge>
                    </TD>
                    <TD>{shortDate(s.createdAt)}</TD>
                    <TD align="right" mono>{money(s.total)}</TD>
                    <TD align="right" mono>
                      {money(s.commissionAmount)} <span className="text-[10px]">({s.commissionRate}%)</span>
                    </TD>
                    <TD align="right" strong>{money(s.vendorNet)}</TD>
                  </TR>
                ))}
                <TR highlight>
                  <TD strong>Total</TD>
                  <TD>{""}</TD>
                  <TD>{""}</TD>
                  <TD align="right" strong>{money(sums.total)}</TD>
                  <TD align="right" strong>{money(sums.commission)}</TD>
                  <TD align="right" strong>{money(sums.net)}</TD>
                </TR>
              </>
            )}
          </TBody>
        </Table>
      </Card>

      <PayoutDialog
        payout={mode ? payout : null}
        mode={mode ?? "PAID"}
        onClose={() => setMode(null)}
        onDone={(updated) => setPayout(updated)}
      />
    </div>
  );
}
