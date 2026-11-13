'use client';

import { useCallback, useEffect, useState } from "react";
import { CircleCheck, CircleSlash, Download, MessageSquareReply, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { REVIEW_REPLY_FIELDS } from "@/lib/admin-forms";
import {
  deleteReview,
  getAdminReviews,
  setReviewApproval,
  type AdminReview,
} from "@/services/review.service";

const TABS = ["Pending", "Approved", "All"] as const;

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={12}
          className={n <= rating ? "fill-[var(--gold)] text-[var(--gold)]" : "text-[var(--border-strong)]"}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Pending");
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1, pendingCount: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [replying, setReplying] = useState<AdminReview | null>(null);
  const [pendingDelete, setPendingDelete] = useState<AdminReview | null>(null);

  /** The tab is a server-side filter, so paging covers the whole queue. */
  const fetchReviews = useCallback(
    async (page: number) => {
      setLoading(true);
      try {
        const res = await getAdminReviews({
          page,
          limit: 20,
          isApproved: tab === "All" ? undefined : tab === "Approved",
        });
        setReviews(res.data ?? []);
        setMeta(res.meta);
        setLoadError(null);
      } catch (error: any) {
        setLoadError(error?.message ?? "Unable to load reviews.");
      } finally {
        setLoading(false);
      }
    },
    [tab]
  );

  useEffect(() => {
    fetchReviews(1);
  }, [fetchReviews]);

  const rows = reviews;

  const setApproval = async (review: AdminReview, isApproved: boolean) => {
    try {
      await setReviewApproval(review.id, isApproved);
      await fetchReviews(meta.page);
      toast.success(isApproved ? "Review published." : "Review unpublished.");
      return true;
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to update the review.");
      return false;
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteReview(pendingDelete.id);
      await fetchReviews(meta.page);
      toast.success("Review deleted.");
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to delete the review.");
    }
    setPendingDelete(null);
  };

  const initial: EntityValues | undefined = replying
    ? { status: replying.isApproved ? "approve" : "hold" }
    : undefined;

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Reviews"
        subtitle="Moderate customer reviews before they appear on the storefront."
        actions={[{ label: "Export", icon: Download }]}
      />

      <StatusTabs
        tabs={[
          { label: "Pending", count: meta.pendingCount },
          { label: "Approved", count: tab === "Approved" ? meta.total : undefined },
          { label: "All", count: tab === "All" ? meta.total : undefined },
        ]}
        active={tab}
        onChange={(t) => setTab(t as (typeof TABS)[number])}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Product</TH>
              <TH>Customer</TH>
              <TH>Rating</TH>
              <TH>Review</TH>
              <TH>Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && rows.length === 0 ? (
              <EmptyRow colSpan={6}>Loading reviews…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={6}>
                {loadError}{" "}
                <button type="button" onClick={() => fetchReviews(meta.page)} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={6}>No reviews in this state.</EmptyRow>
            ) : (
              rows.map((r) => (
                <TR key={r.id}>
                  <TD strong>
                    {r.product.name}
                    <span className="block font-mono text-[10px] font-normal text-[var(--ink-muted)]">
                      {r.product.sku}
                    </span>
                  </TD>
                  <TD>
                    {r.customer.firstName} {r.customer.lastName}
                    <span className="block font-body text-[10px] text-[var(--ink-muted)]">
                      {r.customer.email}
                    </span>
                  </TD>
                  <TD>
                    <Stars rating={r.rating} />
                  </TD>
                  <TD className="max-w-[340px]">
                    {r.title && (
                      <span className="block font-semibold text-[var(--ink)]">{r.title}</span>
                    )}
                    <span className="line-clamp-2">{r.content || "—"}</span>
                  </TD>
                  <TD>
                    <StatusBadge tone={r.isApproved ? "success" : "warning"}>
                      {r.isApproved ? "Approved" : "Pending"}
                    </StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        {
                          label: "Moderate",
                          icon: MessageSquareReply,
                          onSelect: () => setReplying(r),
                        },
                        r.isApproved
                          ? {
                              label: "Unpublish",
                              icon: CircleSlash,
                              onSelect: () => setApproval(r, false),
                            }
                          : {
                              label: "Approve",
                              icon: CircleCheck,
                              onSelect: () => setApproval(r, true),
                            },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(r) },
                      ]}
                    />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        <TablePagination
          page={meta.page}
          pageSize={meta.limit}
          total={meta.total}
          onPageChange={fetchReviews}
          noun="reviews"
        />
      </Card>

      <EntityFormModal
        open={Boolean(replying)}
        mode="edit"
        entity="review"
        subtitle={replying ? `${replying.product.name} · ${replying.rating}★` : undefined}
        submitLabel="Save"
        size="md"
        fields={REVIEW_REPLY_FIELDS}
        initial={initial}
        onSubmit={(v) => (replying ? setApproval(replying, v.status === "approve") : true)}
        onClose={() => setReplying(null)}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete this review of “${pendingDelete.product.name}”?\n\nThis action cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
