'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { Banknote, CircleCheck, Hourglass, Wallet } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import KpiCard from "@/components/admin/common/KpiCard";
import ListStateRow, { listState } from "@/components/admin/common/ListStateRow";
import RowMenu from "@/components/admin/common/RowMenu";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { money, num, shortDate } from "@/lib/admin-adapters";
import {
  createPayout,
  getBalances,
  getPayouts,
  getVendors,
  type Payout,
  type PayoutStatus,
  type VendorBalance,
} from "@/services/marketplace-admin.service";
import {
  PAYOUT_TONE,
  ReasonDialog,
  SmallButton,
  VENDOR_TONE,
  errorLines,
  label,
  useRemote,
} from "@/app/admin/marketplace/_components/bits";
import PayoutDialog from "@/app/admin/marketplace/_components/PayoutDialog";

const PAGE_SIZE = 20;
const STATUSES: PayoutStatus[] = ["PENDING", "PAID", "CANCELLED"];
const TABS = ["All", ...STATUSES.map(label)];

export default function PayoutsPage() {
  const [creating, setCreating] = useState<VendorBalance | null>(null);
  const [createError, setCreateError] = useState<any>(null);
  const [tab, setTab] = useState("All");
  const [vendorId, setVendorId] = useState("");
  const [page, setPage] = useState(1);
  const [acting, setActing] = useState<{ payout: Payout; mode: "PAID" | "CANCELLED" } | null>(null);

  // What is owed right now.
  const bal = useRemote(getBalances, "balances");
  const balances = useMemo<VendorBalance[]>(() => bal.data?.data ?? [], [bal.data]);

  // Payout history.
  const history = useRemote(
    () =>
      getPayouts({
        status: STATUSES.find((s) => label(s) === tab),
        vendorId: vendorId || undefined,
        page,
        limit: PAGE_SIZE,
      }),
    `${tab}:${vendorId}:${page}`
  );
  const payouts: Payout[] = history.data?.data ?? [];
  const total = history.data?.meta.total ?? 0;

  // Vendor filter options (the platform's own shop is never paid out).
  const vendors = useRemote(() => getVendors({ limit: 200 }), "vendors");
  const vendorOptions = useMemo(
    () =>
      (vendors.data?.data ?? [])
        .filter((v) => !v.isPlatform)
        .map((v) => ({ id: v.id, name: v.shop?.name ?? v.user?.email ?? v.id }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [vendors.data]
  );

  const reloadAll = () => {
    bal.reload();
    history.reload();
  };

  const totals = useMemo(
    () => ({
      payable: balances.reduce((a, b) => a + b.payableAmount, 0),
      pending: balances.reduce((a, b) => a + b.pendingAmount, 0),
      vendorsOwed: balances.filter((b) => b.payableAmount > 0).length,
    }),
    [balances]
  );

  const submitCreate = async (note: string) => {
    if (!creating) return false;
    try {
      const payout = await createPayout({ vendorId: creating.vendorId, ...(note ? { note } : {}) });
      toast.success(`Payout of ${money(payout.amount)} created for ${creating.shop.name}.`);
      reloadAll();
      return true;
    } catch (error: any) {
      setCreateError(error);
      toast.error(errorLines(error, "Unable to create the payout.")[0]);
      return false;
    }
  };

  const balState = listState({ loading: bal.loading, live: bal.live, count: balances.length });
  const state = listState({ loading: history.loading, live: history.live, count: payouts.length });
  const kpi = (v: string) => (bal.live ? v : "—");

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Payouts"
        subtitle="What the marketplace owes its vendors, and the transfers made to them."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard label="Payable now" value={kpi(money(totals.payable))} icon={Wallet} note="delivered & paid sub-orders" />
        <KpiCard label="Awaiting delivery" value={kpi(money(totals.pending))} icon={Hourglass} note="paid, still being fulfilled" />
        <KpiCard label="Vendors owed" value={kpi(num(totals.vendorsOwed))} icon={Banknote} note="with a payable balance" />
      </div>

      <Card>
        <PanelHeading title="Vendor balances" subtitle="A payout claims every payable sub-order of the vendor" />
        <Table>
          <THead>
            <tr>
              <TH>Shop</TH>
              <TH>Vendor</TH>
              <TH align="right">Payable</TH>
              <TH align="right">Awaiting delivery</TH>
              <TH align="right" />
            </tr>
          </THead>
          <TBody>
            {balState ? (
              <ListStateRow
                colSpan={5}
                state={balState}
                noun="balances"
                onRetry={bal.reload}
                empty="No vendor is owed anything right now."
              />
            ) : (
              balances.map((b) => (
                <TR key={b.vendorId}>
                  <TD strong>
                    <Link href={`/admin/vendors/${b.vendorId}`} className="hover:text-[var(--gold-deep)]">
                      {b.shop.name}
                    </Link>
                  </TD>
                  <TD>
                    <span className="flex flex-col gap-1">
                      <span>{b.email ?? "—"}</span>
                      <StatusBadge tone={VENDOR_TONE[b.vendorStatus]} className="w-fit !px-2 !py-0.5">
                        {label(b.vendorStatus)}
                      </StatusBadge>
                    </span>
                  </TD>
                  <TD align="right">
                    <span className="flex flex-col">
                      <span className="font-semibold text-[var(--ink)]">{money(b.payableAmount)}</span>
                      <span className="text-[10px]">{b.payableSubOrders} sub-order(s)</span>
                    </span>
                  </TD>
                  <TD align="right">
                    <span className="flex flex-col">
                      <span>{money(b.pendingAmount)}</span>
                      <span className="text-[10px]">{b.pendingSubOrders} sub-order(s)</span>
                    </span>
                  </TD>
                  <TD align="right">
                    <SmallButton
                      variant="dark"
                      disabled={b.payableAmount <= 0}
                      onClick={() => {
                        setCreateError(null);
                        setCreating(b);
                      }}
                    >
                      <Banknote size={12} /> Create payout
                    </SmallButton>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <StatusTabs
            tabs={TABS.map((t) => ({ label: t }))}
            active={tab}
            onChange={(t) => {
              setTab(t);
              setPage(1);
            }}
          />
          <select
            aria-label="Filter by vendor"
            value={vendorId}
            onChange={(e) => {
              setVendorId(e.target.value);
              setPage(1);
            }}
            className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-3 py-2 font-body text-[11.5px] text-[var(--ink)] outline-none focus:border-[var(--gold)]"
          >
            <option value="">All vendors</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>

        <Card>
          <PanelHeading title="Payout history" subtitle="Newest first" />
          <Table>
            <THead>
              <tr>
                <TH>Created</TH>
                <TH>Shop</TH>
                <TH align="right">Amount</TH>
                <TH align="right">Sub-orders</TH>
                <TH>Status</TH>
                <TH>Reference</TH>
                <TH>Paid</TH>
                <TH className="w-[40px]" />
              </tr>
            </THead>
            <TBody>
              {state ? (
                <ListStateRow
                  colSpan={8}
                  state={state}
                  noun="payouts"
                  onRetry={history.reload}
                  empty={tab === "All" && !vendorId ? "No payouts yet." : "No payouts match these filters."}
                />
              ) : (
                payouts.map((p) => (
                  <TR key={p.id}>
                    <TD>
                      <Link href={`/admin/payouts/${p.id}`} className="font-semibold text-[var(--ink)] hover:text-[var(--gold-deep)]">
                        {shortDate(p.createdAt)}
                      </Link>
                    </TD>
                    <TD strong>{p.vendor.shop?.name ?? p.vendor.user?.email ?? "—"}</TD>
                    <TD align="right" strong>
                      {money(p.amount)} <span className="font-mono text-[9.5px] text-[var(--ink-muted)]">{p.currency}</span>
                    </TD>
                    <TD align="right" mono>{p.subOrderCount}</TD>
                    <TD>
                      <StatusBadge tone={PAYOUT_TONE[p.status]}>{label(p.status)}</StatusBadge>
                    </TD>
                    <TD mono>{p.reference ?? "—"}</TD>
                    <TD>{shortDate(p.paidAt)}</TD>
                    <TD>
                      <RowMenu
                        actions={[
                          { label: "View details", icon: CircleCheck, href: `/admin/payouts/${p.id}` },
                          ...(p.status === "PENDING"
                            ? [
                                { label: "Mark paid", icon: Banknote, onSelect: () => setActing({ payout: p, mode: "PAID" as const }) },
                                { label: "Cancel payout", danger: true, onSelect: () => setActing({ payout: p, mode: "CANCELLED" as const }) },
                              ]
                            : []),
                        ]}
                      />
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
          <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="payouts" />
        </Card>
      </div>

      <ReasonDialog
        open={creating !== null}
        title="Create payout"
        subtitle={
          creating
            ? `${creating.shop.name} · ${money(creating.payableAmount)} across ${creating.payableSubOrders} delivered sub-order(s)`
            : undefined
        }
        fieldLabel="NOTE"
        placeholder="Optional note, e.g. the pay period"
        required={false}
        submitLabel="Create payout"
        error={createError}
        onClose={() => setCreating(null)}
        onSubmit={(note) => submitCreate(note)}
      />

      <PayoutDialog
        payout={acting?.payout ?? null}
        mode={acting?.mode ?? "PAID"}
        onClose={() => setActing(null)}
        onDone={reloadAll}
      />
    </div>
  );
}
