'use client';

import { useState } from "react";
import Link from "next/link";
import { CheckCheck, Flag, Package, Store, XCircle } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import ListStateRow, { listState } from "@/components/admin/common/ListStateRow";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { relative, shortDate } from "@/lib/admin-adapters";
import {
  getReports,
  resolveReport,
  type MarketplaceReport,
  type ReportAction,
  type ReportStatus,
  type ReportTarget,
} from "@/services/marketplace-admin.service";
import {
  MODERATION_TONE,
  REPORT_TONE,
  ReasonDialog,
  SmallButton,
  errorLines,
  label,
  useRemote,
} from "@/app/admin/marketplace/_components/bits";

const PAGE_SIZE = 20;
const STATUSES: ReportStatus[] = ["OPEN", "RESOLVED", "DISMISSED"];
const TARGETS: { value: ReportTarget | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "PRODUCT", label: "Products" },
  { value: "SHOP", label: "Shops" },
];

export default function ReportsQueuePage() {
  const [status, setStatus] = useState<ReportStatus>("OPEN");
  const [target, setTarget] = useState<ReportTarget | "">("");
  const [page, setPage] = useState(1);
  const [handling, setHandling] = useState<{ report: MarketplaceReport; mode: "RESOLVED" | "DISMISSED" } | null>(null);
  const [dialogError, setDialogError] = useState<any>(null);

  const list = useRemote(
    () => getReports({ status, targetType: target || undefined, page, limit: PAGE_SIZE }),
    `${status}:${target}:${page}`
  );

  const counts = useRemote(async () => {
    const results = await Promise.allSettled(
      STATUSES.map((s) => getReports({ status: s, targetType: target || undefined, limit: 1 }))
    );
    const next: Partial<Record<ReportStatus, number>> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") next[STATUSES[i]] = r.value.meta.total;
    });
    return next;
  }, target);

  const rows: MarketplaceReport[] = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const reloadAll = () => {
    list.reload();
    counts.reload();
  };

  const open = (report: MarketplaceReport, mode: "RESOLVED" | "DISMISSED") => {
    setDialogError(null);
    setHandling({ report, mode });
  };

  const submit = async (resolution: string, action: string) => {
    if (!handling) return false;
    const { report, mode } = handling;
    try {
      const res = await resolveReport(report.id, {
        status: mode,
        resolution,
        ...(mode === "RESOLVED" && action ? { action: action as ReportAction } : {}),
      });
      toast.success(
        mode === "RESOLVED"
          ? `Report resolved.${res.actionResult ? ` ${res.actionResult}.` : ""}`
          : "Report dismissed."
      );
      reloadAll();
      return true;
    } catch (error: any) {
      setDialogError(error);
      toast.error(errorLines(error, "Unable to update this report.")[0]);
      return false;
    }
  };

  const actionOptions = (r: MarketplaceReport) => {
    const options = [{ value: "", label: "No further action" }];
    if (r.targetType === "PRODUCT" && r.product && r.product.moderationStatus !== "REMOVED") {
      options.push({ value: "REMOVE_PRODUCT", label: "Remove the product from the marketplace" });
    }
    if (r.shop && !r.shop.vendor.isPlatform && r.shop.vendor.status === "ACTIVE") {
      options.push({ value: "SUSPEND_VENDOR", label: "Suspend the vendor (Admin only)" });
    }
    return options;
  };

  const state = listState({ loading: list.loading, live: list.live, count: rows.length });

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Reports"
        subtitle="Products and shops flagged by customers and vendors."
        filters={TARGETS.map((t) => ({
          label: "Target",
          value: t.label,
          emphasis: target === t.value,
          onClick: () => {
            setTarget(t.value);
            setPage(1);
          },
        }))}
      />

      <StatusTabs
        tabs={STATUSES.map((s) => ({ label: label(s), count: counts.data?.[s] ?? "—" }))}
        active={label(status)}
        onChange={(t) => {
          const next = STATUSES.find((s) => label(s) === t);
          if (next) setStatus(next);
          setPage(1);
        }}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Reported</TH>
              <TH>Reason</TH>
              <TH>Reporter</TH>
              <TH>Filed</TH>
              <TH>Status</TH>
              <TH align="right">{status === "OPEN" ? "Handle" : "Resolution"}</TH>
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={6}
                state={state}
                noun="reports"
                onRetry={reloadAll}
                empty={status === "OPEN" ? "No open reports — all clear." : `No ${label(status).toLowerCase()} reports.`}
              />
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD strong>
                    <div className="flex flex-col gap-1">
                      {r.targetType === "PRODUCT" ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Package size={13} className="text-[var(--gold-deep)]" />
                          {r.product ? (
                            <Link href={`/admin/products/${r.product.id}`} className="hover:text-[var(--gold-deep)]">
                              {r.product.name}
                            </Link>
                          ) : (
                            "Deleted product"
                          )}
                          {r.product && (
                            <StatusBadge tone={MODERATION_TONE[r.product.moderationStatus]} showDot={false} className="!px-2 !py-0.5">
                              {label(r.product.moderationStatus)}
                            </StatusBadge>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5">
                          <Store size={13} className="text-[var(--gold-deep)]" /> Shop
                        </span>
                      )}
                      {r.shop && (
                        <span className="text-[10.5px] font-normal text-[var(--ink-muted)]">
                          {r.targetType === "PRODUCT" ? "Sold by " : ""}
                          <Link href={`/admin/vendors/${r.shop.vendor.id}`} className="text-[var(--ink)] hover:text-[var(--gold-deep)]">
                            {r.shop.name}
                          </Link>{" "}
                          · vendor {label(r.shop.vendor.status).toLowerCase()}
                        </span>
                      )}
                    </div>
                  </TD>
                  <TD>
                    <div className="flex max-w-[320px] flex-col gap-1">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-[var(--ink)]">
                        <Flag size={12} className="text-[var(--danger)]" /> {label(r.reason)}
                      </span>
                      {r.details && <span className="whitespace-pre-line">{r.details}</span>}
                    </div>
                  </TD>
                  <TD>{r.reporter?.email ?? "—"}</TD>
                  <TD>
                    <span title={shortDate(r.createdAt)}>{relative(r.createdAt)}</span>
                  </TD>
                  <TD>
                    <StatusBadge tone={REPORT_TONE[r.status]}>{label(r.status)}</StatusBadge>
                  </TD>
                  <TD align="right">
                    {r.status === "OPEN" ? (
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <SmallButton variant="dark" onClick={() => open(r, "RESOLVED")}>
                          <CheckCheck size={12} /> Resolve
                        </SmallButton>
                        <SmallButton onClick={() => open(r, "DISMISSED")}>
                          <XCircle size={12} /> Dismiss
                        </SmallButton>
                      </div>
                    ) : (
                      <div className="ml-auto flex max-w-[280px] flex-col gap-0.5 text-left">
                        <span className="text-[var(--ink)]">{r.resolution || "—"}</span>
                        <span className="text-[10px]">{shortDate(r.resolvedAt)}</span>
                      </div>
                    )}
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
        <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="reports" />
      </Card>

      <ReasonDialog
        open={handling !== null}
        title={handling?.mode === "DISMISSED" ? "Dismiss report" : "Resolve report"}
        subtitle={
          handling
            ? `${label(handling.report.reason)} · ${
                handling.report.targetType === "PRODUCT"
                  ? handling.report.product?.name ?? "product"
                  : handling.report.shop?.name ?? "shop"
              }`
            : undefined
        }
        choice={
          handling?.mode === "RESOLVED"
            ? {
                label: "ACTION",
                options: actionOptions(handling.report),
                help: "Optional — taken together with resolving the report.",
              }
            : undefined
        }
        fieldLabel="RESOLUTION"
        placeholder={handling?.mode === "DISMISSED" ? "Why no action is needed" : "What was found and done"}
        submitLabel={handling?.mode === "DISMISSED" ? "Dismiss" : "Resolve"}
        error={dialogError}
        onClose={() => setHandling(null)}
        onSubmit={submit}
      />
    </div>
  );
}
