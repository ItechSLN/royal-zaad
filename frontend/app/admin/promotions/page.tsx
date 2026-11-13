'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Percent, Plus, Trash2 } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { PROMOTION_FIELDS } from "@/lib/admin-forms";
import { shortDate } from "@/lib/admin-adapters";
import {
  createPromotion,
  deletePromotion,
  getPromotions,
  updatePromotion,
  type Promotion,
} from "@/services/promotion.service";
import { getProducts, type Product } from "@/services/product.service";
import { getCategoryTree } from "@/services/admin-resource.service";
import { toast } from "sonner";

const PAGE_SIZE = 20;

type TreeNode = { id: string; name: string; children?: { id: string }[] };

/** Where a promotion stands right now — "isActive" alone doesn't say if it is running. */
const promotionState = (p: Promotion, now = Date.now()) => {
  if (!p.isActive) return "Paused";
  if (new Date(p.startsAt).getTime() > now) return "Scheduled";
  if (new Date(p.endsAt).getTime() < now) return "Ended";
  return "Live";
};

const STATE_TONE = {
  Live: "success",
  Scheduled: "info",
  Ended: "neutral",
  Paused: "warning",
} as const;

const TABS = ["Live", "Scheduled", "Ended", "Paused"] as const;

const dateInput = (value?: string | null) => (value ? value.slice(0, 10) : "");

/** "Applies to" values: keep the current selection, the whole catalogue, a category or one product. */
const KEEP = "keep";
const ALL = "all";

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<TreeNode[]>([]);
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Promotion | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Promotion | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPromotions(1, 100);
      setPromotions(res.data ?? []);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load promotions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    // The "applies to" picker needs the live catalogue.
    getProducts(1, 1000)
      .then((res) => setProducts(res.data ?? []))
      .catch(() => setProducts([]));
    getCategoryTree()
      .then((tree) => setCategories(tree ?? []))
      .catch(() => setCategories([]));
  }, [refresh]);

  const fields = useMemo(
    () =>
      PROMOTION_FIELDS.map((f) =>
        f.name === "scope"
          ? {
              ...f,
              options: [
                ...(editing
                  ? [{ value: KEEP, label: `Keep current selection (${editing.products.length} products)` }]
                  : []),
                { value: ALL, label: `Entire catalogue (${products.length} products)` },
                ...categories.map((c) => ({ value: `category:${c.id}`, label: `Category · ${c.name}` })),
                ...products.map((p) => ({ value: `product:${p.id}`, label: `Product · ${p.name} · ${p.sku}` })),
              ],
            }
          : f
      ),
    [products, categories, editing]
  );

  /** Resolves the "applies to" choice into the product ids the API links. */
  const resolveProducts = (scope: string): string[] | undefined => {
    if (scope === KEEP) return undefined;
    if (scope === ALL) return products.map((p) => p.id);
    if (scope.startsWith("category:")) {
      const id = scope.slice("category:".length);
      const node = categories.find((c) => c.id === id);
      const ids = new Set([id, ...(node?.children ?? []).map((c) => c.id)]);
      return products.filter((p) => ids.has(p.categoryId)).map((p) => p.id);
    }
    if (scope.startsWith("product:")) return [scope.slice("product:".length)];
    return [];
  };

  const submit = async (values: Record<string, string | boolean>) => {
    const productIds = resolveProducts(String(values.scope ?? ""));
    if (productIds && productIds.length === 0) {
      toast.error("That selection has no products — the promotion would not discount anything.");
      return false;
    }

    const payload = {
      name: String(values.name),
      description: String(values.description ?? ""),
      discountType: String(values.discountType) as Promotion["discountType"],
      discountValue: Number(values.discountValue) || 0,
      startsAt: String(values.startsAt),
      endsAt: String(values.endsAt),
      isActive: Boolean(values.isActive),
      productIds,
    };

    try {
      if (editing) await updatePromotion(editing.id, payload as never);
      else await createPromotion(payload as never);
      await refresh();
      toast.success(editing ? "Promotion updated." : "Promotion created.");
      return true;
    } catch (error: any) {
      const detail = error?.errors ? Object.values(error.errors)[0] : null;
      toast.error(String(detail ?? error?.message ?? "Unable to save the promotion."));
      return false;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deletePromotion(pendingDelete.id);
      await refresh();
      toast.success("Promotion deleted.");
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to delete the promotion.");
    }
    setPendingDelete(null);
  };

  const rows = useMemo(
    () => promotions.filter((p) => tab === "All" || promotionState(p) === tab),
    [promotions, tab]
  );

  const initial: EntityValues = editing
    ? {
        name: editing.name,
        description: editing.description ?? "",
        discountType: editing.discountType,
        discountValue: String(Number(editing.discountValue)),
        startsAt: dateInput(editing.startsAt),
        endsAt: dateInput(editing.endsAt),
        scope: KEEP,
        isActive: editing.isActive,
      }
    : { isActive: true, discountType: "PERCENTAGE" };

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Promotions"
        subtitle="Campaign-level discounts applied across the catalogue."
        actions={[
          { label: "Export", icon: Download },
          {
            label: "New promotion",
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
          { label: "All", count: promotions.length },
          ...TABS.map((label) => ({
            label,
            count: promotions.filter((p) => promotionState(p) === label).length,
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
              <TH>Promotion</TH>
              <TH align="right">Discount</TH>
              <TH align="right">Products</TH>
              <TH>Starts</TH>
              <TH>Ends</TH>
              <TH>Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && promotions.length === 0 ? (
              <EmptyRow colSpan={7}>Loading promotions…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={7}>
                {loadError}{" "}
                <button type="button" onClick={refresh} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7}>
                {promotions.length === 0 ? "No promotions yet." : "No promotions in this state."}
              </EmptyRow>
            ) : (
              rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((p) => (
                <TR key={p.id}>
                  <TD strong>
                    <span className="inline-flex items-center gap-2">
                      <Percent size={13} className="text-[var(--gold-deep)]" />
                      {p.name}
                    </span>
                    <span className="block font-body text-[10px] font-normal text-[var(--ink-muted)]">
                      {p.description}
                    </span>
                  </TD>
                  <TD align="right" strong>
                    {p.discountType === "PERCENTAGE"
                      ? `${Number(p.discountValue)}%`
                      : `$${Number(p.discountValue)}`}
                  </TD>
                  <TD align="right" mono>{p.products.length}</TD>
                  <TD>{shortDate(p.startsAt)}</TD>
                  <TD>{shortDate(p.endsAt)}</TD>
                  <TD>
                    <StatusBadge tone={STATE_TONE[promotionState(p)]}>{promotionState(p)}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        {
                          label: "Edit promotion",
                          icon: Pencil,
                          onSelect: () => {
                            setEditing(p);
                            setFormOpen(true);
                          },
                        },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(p) },
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
          noun="promotions"
        />
      </Card>

      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="promotion"
        fields={fields}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete promotion “${pendingDelete.name}”?\n\nThis action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
