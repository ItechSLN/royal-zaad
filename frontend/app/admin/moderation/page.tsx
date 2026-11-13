'use client';

import { useState } from "react";
import Link from "next/link";
import { Check, ImageOff, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import ListStateRow, { listState } from "@/components/admin/common/ListStateRow";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { money, shortDate } from "@/lib/admin-adapters";
import {
  getModerationQueue,
  moderateProduct,
  type ModerationDecision,
  type ModerationProduct,
  type ModerationStatus,
} from "@/services/marketplace-admin.service";
import {
  MODERATION_TONE,
  ReasonDialog,
  SmallButton,
  VENDOR_TONE,
  errorLines,
  label,
  useRemote,
} from "@/app/admin/marketplace/_components/bits";

const PAGE_SIZE = 20;
const STATUSES: ModerationStatus[] = ["PENDING_REVIEW", "APPROVED", "REJECTED", "REMOVED"];
const TAB_OF: Record<ModerationStatus, string> = {
  PENDING_REVIEW: "Pending review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REMOVED: "Removed",
};

const DECISIONS: Record<
  ModerationDecision,
  { verb: string; title: string; subtitle: string; variant: "dark" | "danger" }
> = {
  APPROVED: {
    verb: "Approve",
    title: "Approve product",
    subtitle: "It becomes visible to customers while the shop is active.",
    variant: "dark",
  },
  REJECTED: {
    verb: "Reject",
    title: "Reject product",
    subtitle: "The vendor is emailed this reason and can edit and resubmit.",
    variant: "danger",
  },
  REMOVED: {
    verb: "Remove",
    title: "Remove product",
    subtitle: "Takes it off the marketplace. The vendor is emailed this reason.",
    variant: "danger",
  },
};

export default function ModerationPage() {
  const [status, setStatus] = useState<ModerationStatus>("PENDING_REVIEW");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ product: ModerationProduct; decision: ModerationDecision } | null>(null);
  const [dialogError, setDialogError] = useState<any>(null);

  const list = useRemote(
    () => getModerationQueue({ moderationStatus: status, page, limit: PAGE_SIZE }),
    `${status}:${page}`
  );

  const counts = useRemote(async () => {
    const results = await Promise.allSettled(
      STATUSES.map((s) => getModerationQueue({ moderationStatus: s, limit: 1 }))
    );
    const next: Partial<Record<ModerationStatus, number>> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") next[STATUSES[i]] = r.value.meta.total;
    });
    return next;
  }, "counts");

  const rows: ModerationProduct[] = list.data?.data ?? [];
  const total = list.data?.meta.total ?? 0;
  const reloadAll = () => {
    list.reload();
    counts.reload();
  };

  const decide = (product: ModerationProduct, decision: ModerationDecision) => {
    setDialogError(null);
    setPending({ product, decision });
  };

  const submit = async (reason: string) => {
    if (!pending) return false;
    const { product, decision } = pending;
    try {
      await moderateProduct(product.id, {
        moderationStatus: decision,
        ...(reason ? { reason } : {}),
      });
      toast.success(`${product.name} ${label(decision).toLowerCase()}.`);
      reloadAll();
      return true;
    } catch (error: any) {
      setDialogError(error);
      toast.error(errorLines(error, "Unable to moderate this product.")[0]);
      return false;
    }
  };

  const state = listState({ loading: list.loading, live: list.live, count: rows.length });
  const tab = TAB_OF[status];

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Product moderation"
        subtitle="Review vendor listings before they reach the storefront. Oldest submissions first."
      />

      <StatusTabs
        tabs={STATUSES.map((s) => ({ label: TAB_OF[s], count: counts.data?.[s] ?? "—" }))}
        active={tab}
        onChange={(t) => {
          const next = STATUSES.find((s) => TAB_OF[s] === t);
          if (next) setStatus(next);
          setPage(1);
        }}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH className="w-[64px]" />
              <TH>Product</TH>
              <TH>Shop</TH>
              <TH align="right">Price</TH>
              <TH>Status</TH>
              <TH>Updated</TH>
              <TH align="right">Decision</TH>
            </tr>
          </THead>
          <TBody>
            {state ? (
              <ListStateRow
                colSpan={7}
                state={state}
                noun="products"
                onRetry={reloadAll}
                empty={status === "PENDING_REVIEW" ? "Nothing waiting for review." : `No ${tab.toLowerCase()} products.`}
              />
            ) : (
              rows.map((p) => (
                <TR key={p.id}>
                  <TD>
                    <div className="flex h-[44px] w-[44px] items-center justify-center overflow-hidden rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)]">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image.url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <ImageOff size={14} className="text-[var(--ink-muted)]" />
                      )}
                    </div>
                  </TD>
                  <TD strong>
                    <div className="flex flex-col gap-0.5">
                      <Link href={`/admin/products/${p.id}`} className="hover:text-[var(--gold-deep)]">
                        {p.name}
                      </Link>
                      <span className="font-mono text-[10px] font-normal text-[var(--ink-muted)]">
                        {p.sku} · {p.category?.name ?? "Uncategorised"}
                        {!p.isActive || p.archivedAt ? " · inactive" : ""}
                      </span>
                    </div>
                  </TD>
                  <TD>
                    {p.shop ? (
                      <div className="flex flex-col gap-1">
                        <Link href={`/admin/vendors/${p.shop.vendor.id}`} className="text-[var(--ink)] hover:text-[var(--gold-deep)]">
                          {p.shop.name}
                        </Link>
                        {p.shop.vendor.isPlatform ? (
                          <span className="font-mono text-[9.5px] uppercase tracking-[1px] text-[var(--gold-deep)]">Platform</span>
                        ) : (
                          <span className={`text-[10px] ${VENDOR_TONE[p.shop.vendor.status] === "success" ? "text-[var(--success)]" : "text-[var(--warning)]"}`}>
                            Vendor {label(p.shop.vendor.status).toLowerCase()}
                          </span>
                        )}
                      </div>
                    ) : (
                      "—"
                    )}
                  </TD>
                  <TD align="right" mono>{money(p.price)}</TD>
                  <TD>
                    <StatusBadge tone={MODERATION_TONE[p.moderationStatus]}>{label(p.moderationStatus)}</StatusBadge>
                  </TD>
                  <TD>{shortDate(p.updatedAt)}</TD>
                  <TD align="right">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {p.moderationStatus !== "APPROVED" && (
                        <SmallButton variant="dark" onClick={() => decide(p, "APPROVED")}>
                          <Check size={12} /> Approve
                        </SmallButton>
                      )}
                      {p.moderationStatus === "PENDING_REVIEW" && (
                        <SmallButton onClick={() => decide(p, "REJECTED")}>
                          <X size={12} /> Reject
                        </SmallButton>
                      )}
                      {p.moderationStatus !== "REMOVED" && (
                        <SmallButton variant="danger" onClick={() => decide(p, "REMOVED")}>
                          <Trash2 size={12} /> Remove
                        </SmallButton>
                      )}
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
        <TablePagination page={page} pageSize={PAGE_SIZE} total={total} onPageChange={setPage} noun="products" />
      </Card>

      <ReasonDialog
        open={pending !== null}
        title={pending ? DECISIONS[pending.decision].title : ""}
        subtitle={pending ? `${pending.product.name} — ${DECISIONS[pending.decision].subtitle}` : undefined}
        fieldLabel={pending?.decision === "APPROVED" ? "NOTE" : "REASON"}
        placeholder={pending?.decision === "APPROVED" ? "Optional note for the audit trail" : "Shared with the vendor"}
        required={pending?.decision !== "APPROVED"}
        submitLabel={pending ? DECISIONS[pending.decision].verb : "Save"}
        variant={pending ? DECISIONS[pending.decision].variant : "dark"}
        error={dialogError}
        onClose={() => setPending(null)}
        onSubmit={(text) => submit(text)}
      />
    </div>
  );
}
