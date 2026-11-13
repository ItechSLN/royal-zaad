'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BadgeCheck, MailWarning, Store } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import ListStateRow, { listState } from "@/components/admin/common/ListStateRow";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD } from "@/components/admin/common/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { money, num, shortDate } from "@/lib/admin-adapters";
import {
  getVendors,
  VENDOR_STATUSES,
  type AdminVendor,
  type VendorStatus,
} from "@/services/marketplace-admin.service";
import { SearchBox, VENDOR_TONE, label, personName, useRemote } from "@/app/admin/marketplace/_components/bits";

const PAGE_SIZE = 20;
const TABS = ["All", ...VENDOR_STATUSES.map(label)];
const statusOf = (tab: string) =>
  VENDOR_STATUSES.find((s) => label(s) === tab) as VendorStatus | undefined;

export default function VendorsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("Pending");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const list = useRemote(
    () => getVendors({ status: statusOf(tab), q: q || undefined, page, limit: PAGE_SIZE }),
    JSON.stringify([tab, q, page])
  );

  // Tab counts: one cheap query per status (limit=1, read meta.total).
  const counts = useRemote(async () => {
    const keys: (VendorStatus | undefined)[] = [undefined, ...VENDOR_STATUSES];
    const results = await Promise.allSettled(
      keys.map((status) => getVendors({ status, q: q || undefined, limit: 1 }))
    );
    const next: Record<string, number | undefined> = {};
    results.forEach((r, i) => {
      next[keys[i] ? label(keys[i]) : "All"] = r.status === "fulfilled" ? r.value.meta.total : undefined;
    });
    return next;
  }, q);

  const rows: AdminVendor[] = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const state = listState({ loading: list.loading, live: list.live, count: rows.length });

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Vendors"
        subtitle="Shops selling on the marketplace — applications, approvals and suspensions."
      >
        <SearchBox
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }} placeholder="Search shop, owner or email" />
      </ActionBar>

      <StatusTabs
        tabs={TABS.map((t) => ({ label: t, count: counts.data?.[t] ?? "—" }))}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Shop</TH>
              <TH>Owner</TH>
              <TH>City</TH>
              <TH>Status</TH>
              <TH align="right">Products</TH>
              <TH align="right">Orders</TH>
              <TH align="right">Gross sales</TH>
              <TH>Joined</TH>
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={8}
                state={state}
                noun="vendors"
                onRetry={() => {
                  list.reload();
                  counts.reload();
                }}
                empty={q ? `No vendors match “${q}”.` : tab === "All" ? "No vendors yet." : `No ${tab.toLowerCase()} vendors.`}
              />
            ) : (
              rows.map((v) => (
                <tr
                  key={v.id}
                  onClick={() => router.push(`/admin/vendors/${v.id}`)}
                  className="cursor-pointer border-b border-[var(--border)] transition last:border-b-0 hover:bg-[var(--admin-bg)]"
                >
                  <TD strong>
                    <Link
                      href={`/admin/vendors/${v.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-2 hover:text-[var(--gold-deep)]"
                    >
                      <Store size={13} className="text-[var(--gold-deep)]" />
                      {v.shop?.name ?? "No shop yet"}
                    </Link>
                    {v.isPlatform && (
                      <span className="ml-2 font-mono text-[9.5px] uppercase tracking-[1px] text-[var(--gold-deep)]">
                        Platform
                      </span>
                    )}
                  </TD>
                  <TD>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[var(--ink)]">{personName(v.user)}</span>
                      <span className="inline-flex items-center gap-1 text-[10.5px]">
                        {v.user?.email ?? "—"}
                        {v.user &&
                          (v.user.emailVerifiedAt ? (
                            <span title="Email verified" className="inline-flex items-center gap-0.5 text-[var(--success)]">
                              <BadgeCheck size={11} /> verified
                            </span>
                          ) : (
                            <span title="Email not verified" className="inline-flex items-center gap-0.5 text-[var(--warning)]">
                              <MailWarning size={11} /> unverified
                            </span>
                          ))}
                      </span>
                    </div>
                  </TD>
                  <TD>{[v.shop?.city, v.shop?.country].filter(Boolean).join(", ") || "—"}</TD>
                  <TD>
                    <StatusBadge tone={VENDOR_TONE[v.status]}>{label(v.status)}</StatusBadge>
                  </TD>
                  <TD align="right" mono>{num(v.stats.productCount)}</TD>
                  <TD align="right" mono>{num(v.stats.orderCount)}</TD>
                  <TD align="right" strong>{money(v.stats.grossSales)}</TD>
                  <TD>{shortDate(v.createdAt)}</TD>
                </tr>
              ))
            )}
          </TBody>
        </Table>
        <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="vendors" />
      </Card>
    </div>
  );
}
