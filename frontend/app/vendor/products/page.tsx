'use client';

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ImageOff, Pencil, Plus, Search, Trash2 } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import ListStateRow from "@/components/admin/common/ListStateRow";
import RowMenu from "@/components/admin/common/RowMenu";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { ListingBadge, ModerationBadge, errorText, money } from "@/components/vendor/ui";
import {
  archiveVendorProduct,
  deleteVendorProduct,
  getVendorProducts,
  type Paginated,
  type ProductStatusFilter,
  type VendorProduct,
} from "@/services/vendor.service";

const TABS: { label: string; value: ProductStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Published", value: "published" },
  { label: "Drafts", value: "draft" },
  { label: "Archived", value: "archived" },
  { label: "In review", value: "pending" },
  { label: "Rejected", value: "rejected" },
  { label: "Removed", value: "removed" },
];
const LIMIT = 10;

function ProductsList() {
  const router = useRouter();
  const params = useSearchParams();
  const initial = (params.get("status") as ProductStatusFilter) ?? "all";
  const [status, setStatus] = useState<ProductStatusFilter>(
    TABS.some((t) => t.value === initial) ? initial : "all"
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<VendorProduct> | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<VendorProduct | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setResult(await getVendorProducts({ status, q: search, page, limit: LIMIT }));
    } catch {
      setResult(null);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- refetch when filters change
    void load();
  }, [load]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const changeTab = (label: string) => {
    const tab = TABS.find((t) => t.label === label);
    if (!tab) return;
    setStatus(tab.value);
    setPage(1);
    router.replace(tab.value === "all" ? "/vendor/products" : `/vendor/products?status=${tab.value}`, {
      scroll: false,
    });
  };

  const archive = async (p: VendorProduct, archived: boolean) => {
    try {
      await archiveVendorProduct(p.id, archived);
      toast.success(archived ? `“${p.name}” archived.` : `“${p.name}” restored as a draft.`);
      await load();
    } catch (e) {
      toast.error(errorText(e, "Couldn't update the product."));
    }
  };

  const confirmDelete = async () => {
    const p = pendingDelete;
    setPendingDelete(null);
    if (!p) return;
    try {
      await deleteVendorProduct(p.id);
      toast.success(`“${p.name}” deleted.`);
      await load();
    } catch (e) {
      toast.error(errorText(e, "Couldn't delete the product."));
    }
  };

  const rows = result?.data ?? [];
  const state = loading && !result ? "loading" : failed ? "error" : rows.length === 0 ? "empty" : null;
  const activeLabel = TABS.find((t) => t.value === status)?.label ?? "All";

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Products"
        subtitle="Everything you list on the marketplace. Only published, approved products are visible to customers."
        actions={[{ label: "Add product", icon: Plus, emphasis: true, href: "/vendor/products/new" }]}
      />

      <Card>
        <div className="flex flex-col gap-3 px-5 pt-4">
          <StatusTabs tabs={TABS.map((t) => ({ label: t.label }))} active={activeLabel} onChange={changeTab} />
          <div className="flex items-center gap-2 rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-3 py-[9px] sm:max-w-[340px]">
            <Search size={14} className="text-[var(--ink-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or SKU"
              aria-label="Search products"
              className="w-full bg-transparent font-body text-[12px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
          </div>
        </div>

        <div className={`mt-4 ${loading && result ? "opacity-60" : ""}`}>
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH>SKU</TH>
                <TH align="right">Price</TH>
                <TH align="right">Stock</TH>
                <TH>Listing</TH>
                <TH>Moderation</TH>
                <TH className="w-[40px]" />
              </tr>
            </THead>
            <TBody>
              {state ? (
                <ListStateRow
                  colSpan={7}
                  state={state}
                  onRetry={load}
                  noun="products"
                  empty={
                    search || status !== "all" ? (
                      "No products match this filter."
                    ) : (
                      <>
                        You haven&apos;t added any products yet.{" "}
                        <Link href="/vendor/products/new" className="font-semibold text-[var(--gold-deep)] underline">
                          Add your first product
                        </Link>
                      </>
                    )
                  }
                />
              ) : (
                rows.map((p) => {
                  const available = p.inventory ? p.inventory.quantity - p.inventory.reserved : null;
                  return (
                    <TR key={p.id}>
                      <TD>
                        <Link href={`/vendor/products/${p.id}`} className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)]">
                            {p.images?.[0] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.images[0].url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <ImageOff size={14} className="text-[var(--ink-muted)]" />
                            )}
                          </span>
                          <span className="flex flex-col">
                            <span className="font-semibold text-[var(--ink)] hover:underline">{p.name}</span>
                            <span className="text-[10.5px]">{p.category?.name ?? "—"}</span>
                          </span>
                        </Link>
                      </TD>
                      <TD mono>{p.sku}</TD>
                      <TD align="right" mono>{money(p.price)}</TD>
                      <TD align="right" mono className={available !== null && available <= 0 ? "!text-[var(--danger)]" : ""}>
                        {available ?? "—"}
                      </TD>
                      <TD><ListingBadge product={p} /></TD>
                      <TD>
                        <span className="flex flex-col items-start gap-1">
                          <ModerationBadge status={p.moderationStatus} />
                          {p.moderationReason && (p.moderationStatus === "REJECTED" || p.moderationStatus === "REMOVED") && (
                            <span className="max-w-[220px] text-[10.5px] leading-[1.4] text-[var(--danger)]">
                              {p.moderationReason}
                            </span>
                          )}
                        </span>
                      </TD>
                      <TD>
                        <RowMenu
                          actions={[
                            ...(p.moderationStatus !== "REMOVED"
                              ? [{ label: "Edit", icon: Pencil, onSelect: () => router.push(`/vendor/products/${p.id}`) }]
                              : []),
                            p.archivedAt
                              ? { label: "Unarchive", icon: ArchiveRestore, onSelect: () => void archive(p, false) }
                              : { label: "Archive", icon: Archive, onSelect: () => void archive(p, true) },
                            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(p) },
                          ]}
                        />
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
        {result && result.meta.total > LIMIT && (
          <TablePagination page={page} pageSize={LIMIT} total={result.meta.total} onPageChange={setPage} noun="products" />
        )}
      </Card>

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Delete product"
          message={`Delete “${pendingDelete.name}” (${pendingDelete.sku})?\n\nOnly products that have never been ordered can be deleted — otherwise archive it instead.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

export default function VendorProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsList />
    </Suspense>
  );
}
