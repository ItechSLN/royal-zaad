'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Download,
  Eye,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import {
  BulkBar,
  FilterBar,
  RowCheckbox,
  StatusTabs,
  StockMeter,
  TablePagination,
} from "@/components/admin/common/TableBits";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { getProducts, deleteProduct, type Product } from "@/services/product.service";
import { fromProduct } from "@/lib/admin-adapters";
import { toast } from "sonner";

const STATUS_TONE: Record<string, Tone> = {
  Active: "success",
  Draft: "neutral",
  "Low stock": "warning",
  "Out of stock": "danger",
  Unpublished: "info",
  Archived: "neutral",
};

const PAGE_SIZE = 10;

/** Tab labels only — every count is computed from the loaded catalogue. */
const PRODUCT_TABS = [
  "All products",
  "Active",
  "Draft",
  "Low stock",
  "Out of stock",
  "Unpublished",
  "Archived",
] as const;

type ProductRow = ReturnType<typeof fromProduct>;

/** Staff see drafts too; walk every page so tab counts cover the whole catalogue. */
const FETCH_LIMIT = 100;
const fetchAllProducts = async () => {
  const all: Product[] = [];
  for (let page = 1; ; page++) {
    const res = await getProducts(page, FETCH_LIMIT);
    all.push(...(res?.data ?? []));
    if (!res?.meta || page >= res.meta.totalPages) break;
  }
  return all;
};

export default function ProductsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("All products");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<ProductRow | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Loading starts true; retry() re-arms it so the effect never sets state synchronously.
  const refresh = useCallback(
    () =>
      fetchAllProducts()
        .then((data) => {
          setProducts(data.map(fromProduct));
          setLoadError(null);
        })
        .catch((error: { message?: string }) => {
          setProducts([]);
          setLoadError(error?.message ?? "Unable to load products.");
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    refresh();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteProduct(pendingDelete.id);
      await refresh();
      toast.success("Product deleted.");
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to delete the product.");
    }
    setPendingDelete(null);
  };

  const filtered = useMemo(
    () => products.filter((p) => tab === "All products" || p.status === tab),
    [products, tab]
  );

  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.includes(r.id));

  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const tabs = PRODUCT_TABS.map((label) => ({
    label,
    count: loading || loadError
      ? undefined
      : label === "All products"
        ? products.length
        : products.filter((p) => p.status === label).length,
  }));

  const stockTone = (p: ProductRow) =>
    p.onHand === 0 ? "danger" : p.onHand / p.capacity < 0.35 ? "warning" : "success";

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Products"
        subtitle="Catalogue across every channel — pricing, stock and publication."
        actions={[
          { label: "Import CSV", icon: Upload },
          { label: "Export", icon: Download },
          { label: "New product", icon: Plus, emphasis: true, href: "/admin/products/create" },
        ]}
      />

      <StatusTabs
        tabs={tabs}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
          setSelected([]);
        }}
      />

      <FilterBar
        filters={[
          { label: "Category:", value: "All categories" },
          { label: "Brand:", value: "All brands" },
          { label: "Warehouse:", value: "All warehouses" },
          { label: "Stock:", value: "Any level" },
          { label: "Price:", value: "Any" },
        ]}
        trailing={
          <>
            <button type="button" className="font-body text-[11px] text-[var(--ink-muted)] transition hover:text-[var(--ink)]">
              Saved view · Restock watchlist
            </button>
            <button type="button" className="font-body text-[11px] font-semibold text-[var(--gold-deep)]">
              Clear filters
            </button>
          </>
        }
      />

      <BulkBar
        count={selected.length}
        total={filtered.length}
        actions={["Edit price", "Assign category", "Publish", "Archive"]}
        onClear={() => setSelected([])}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH className="w-[36px]">
                <RowCheckbox
                  checked={allOnPageSelected}
                  label="Select all rows"
                  onChange={(next) => setSelected(next ? rows.map((r) => r.id) : [])}
                />
              </TH>
              <TH>Product</TH>
              <TH>Category</TH>
              <TH align="right">Variants</TH>
              <TH align="right">Price</TH>
              <TH>Stock</TH>
              <TH align="right">Sales 30d</TH>
              <TH>Status</TH>
              <TH>Updated</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>

          <TBody>
            {loading && products.length === 0 ? (
              <EmptyRow colSpan={10}>Loading products…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={10}>
                {loadError}{" "}
                <button type="button" onClick={retry} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : products.length === 0 ? (
              <EmptyRow colSpan={10}>No products yet.</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={10}>No products in this state.</EmptyRow>
            ) : (
              rows.map((p) => (
                <TR key={p.id} highlight={selected.includes(p.id)}>
                  <TD>
                    <RowCheckbox
                      checked={selected.includes(p.id)}
                      label={`Select ${p.name}`}
                      onChange={() => toggle(p.id)}
                    />
                  </TD>

                  <TD>
                    <div className="flex items-center gap-[11px]">
                      {p.image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={p.image}
                          alt={p.name}
                          className="h-[38px] w-[38px] shrink-0 rounded-[2px] border border-[var(--border)] object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span
                          aria-hidden
                          className="h-[38px] w-[38px] shrink-0 rounded-[2px] border border-[var(--border)] bg-[var(--cream-2)]"
                        />
                      )}
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="font-body text-[11.5px] font-semibold text-[var(--ink)]">
                          {p.name}
                        </span>
                        <span className="font-mono text-[9.5px] text-[var(--ink-muted)]">
                          SKU {p.sku} · cost {p.cost}
                        </span>
                      </div>
                    </div>
                  </TD>

                  <TD>{p.category}</TD>
                  <TD align="right" mono>{p.variants || "—"}</TD>
                  <TD align="right" strong>{p.price}</TD>

                  <TD className="w-[154px]">
                    <StockMeter onHand={p.onHand} capacity={p.capacity} tone={stockTone(p)} />
                  </TD>

                  <TD align="right" mono>{p.sales30d}</TD>

                  <TD>
                    <StatusBadge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</StatusBadge>
                  </TD>

                  <TD>{p.updated}</TD>

                  <TD>
                    <RowMenu
                      actions={[
                        { label: "View product", icon: Eye, onSelect: () => router.push(`/admin/products/${p.id}`) },
                        { label: "Edit product", icon: Pencil, onSelect: () => router.push(`/admin/products/${p.id}/edit`) },
                        { label: "Duplicate", icon: Copy },
                        { label: "Archive", icon: Archive },
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
          total={filtered.length}
          onPageChange={setPage}
          noun="products"
        />
      </Card>

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Are you sure you want to delete “${pendingDelete.name}”?\n\nThis action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
