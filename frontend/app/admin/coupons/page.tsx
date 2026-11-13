'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Download, Pencil, Plus, Ticket, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { COUPON_FIELDS } from "@/lib/admin-forms";
import { shortDate } from "@/lib/admin-adapters";
import {
  createCoupon,
  deleteCoupon,
  getCoupons,
  updateCoupon,
  type Coupon,
} from "@/services/coupon.service";

const PAGE_SIZE = 20;

/** Where a coupon stands right now — the flag alone doesn't say if it has lapsed. */
const couponState = (c: Coupon, now = Date.now()) => {
  if (!c.isActive) return "Inactive";
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return "Expired";
  if (c.usageLimit !== null && c.usageCount >= c.usageLimit) return "Used up";
  if (new Date(c.startsAt).getTime() > now) return "Scheduled";
  return "Active";
};

const STATE_TONE = {
  Active: "success",
  Scheduled: "info",
  Expired: "neutral",
  "Used up": "warning",
  Inactive: "neutral",
} as const;

const dateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Coupon | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Coupon | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getCoupons(1, 100);
      setCoupons(res.data ?? []);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load coupons.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = {
      code: String(values.code).toUpperCase(),
      description: String(values.description ?? ""),
      discountType: String(values.discountType) as Coupon["discountType"],
      discountValue: Number(values.discountValue) || 0,
      minimumPurchase: values.minimumPurchase
        ? Number(values.minimumPurchase)
        : undefined,
      usageLimit: values.usageLimit ? Number(values.usageLimit) : undefined,
      startsAt: String(values.startsAt || new Date().toISOString().slice(0, 10)),
      // Clearing the field on edit removes the expiry.
      expiresAt: values.expiresAt ? String(values.expiresAt) : editing ? null : undefined,
      isActive: Boolean(values.isActive),
    };

    try {
      if (editing) await updateCoupon(editing.id, payload as never);
      else await createCoupon(payload as never);
      setLoadError(null);
      await refresh();
      toast.success(editing ? "Coupon updated." : "Coupon created.");
      return true;
    } catch (error: any) {
      const detail = error?.errors ? Object.values(error.errors)[0] : null;
      toast.error(String(detail ?? error?.message ?? "Unable to save the coupon."));
      return false;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCoupon(pendingDelete.id);
      await refresh();
      toast.success("Coupon deleted.");
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to delete the coupon.");
    }
    setPendingDelete(null);
  };

  const rows = useMemo(
    () =>
      coupons.filter((c) => tab === "All" || couponState(c) === tab),
    [coupons, tab]
  );

  const initial: EntityValues = editing
    ? {
        code: editing.code,
        description: editing.description ?? "",
        discountType: editing.discountType,
        discountValue: String(Number(editing.discountValue)),
        usageLimit: editing.usageLimit ? String(editing.usageLimit) : "",
        expiresAt: dateInput(editing.expiresAt),
        startsAt: dateInput(editing.startsAt),
        minimumPurchase: editing.minimumPurchase ? String(Number(editing.minimumPurchase)) : "",
        isActive: editing.isActive,
      }
    : { isActive: true, discountType: "PERCENTAGE" };

  const value = (c: Coupon) =>
    c.discountType === "PERCENTAGE"
      ? `${Number(c.discountValue)}%`
      : `$${Number(c.discountValue)}`;

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Coupons"
        subtitle="Discount codes, redemption limits and expiry."
        actions={[
          { label: "Export", icon: Download },
          {
            label: "New coupon",
            icon: Plus,
            emphasis: true,
            onClick: () => {
              setEditing(null);
              setFormOpen(true);
            },
          },
        ]}
      />

      <StatusTabs
        tabs={[
          { label: "All", count: coupons.length },
          ...(["Active", "Scheduled", "Expired", "Inactive"] as const).map((label) => ({
            label,
            count: coupons.filter((c) => couponState(c) === label).length,
          })),
        ]}
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
              <TH>Code</TH>
              <TH>Description</TH>
              <TH align="right">Value</TH>
              <TH align="right">Redeemed</TH>
              <TH>Expires</TH>
              <TH>Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && coupons.length === 0 ? (
              <EmptyRow colSpan={7}>Loading coupons…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={7}>
                {loadError}{" "}
                <button type="button" onClick={refresh} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7}>
                {coupons.length === 0 ? "No coupons yet." : "No coupons in this state."}
              </EmptyRow>
            ) : (
              rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((c) => (
                <TR key={c.id}>
                  <TD strong mono>
                    <span className="inline-flex items-center gap-2">
                      <Ticket size={13} className="text-[var(--gold-deep)]" />
                      {c.code}
                    </span>
                  </TD>
                  <TD>{c.description || "—"}</TD>
                  <TD align="right" strong>{value(c)}</TD>
                  <TD align="right" mono>
                    {c.usageCount.toLocaleString()}
                    {c.usageLimit ? ` / ${c.usageLimit.toLocaleString()}` : ""}
                  </TD>
                  <TD>{c.expiresAt ? shortDate(c.expiresAt) : "No expiry"}</TD>
                  <TD>
                    <StatusBadge tone={STATE_TONE[couponState(c)]}>{couponState(c)}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        {
                          label: "Edit coupon",
                          icon: Pencil,
                          onSelect: () => {
                            setEditing(c);
                            setFormOpen(true);
                          },
                        },
                        {
                          label: "Copy code",
                          icon: Copy,
                          onSelect: () => {
                            navigator.clipboard?.writeText(c.code);
                            toast.success(`${c.code} copied`);
                          },
                        },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(c) },
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
          total={rows.length}
          onPageChange={setPage}
          noun="coupons"
        />
      </Card>

      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="coupon"
        fields={COUPON_FIELDS}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete coupon “${pendingDelete.code}”?\n\nThis action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
