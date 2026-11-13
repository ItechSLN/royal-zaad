'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Download, Eye, Plus, SlidersHorizontal } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { StatusTabs, StockMeter, TablePagination } from "@/components/admin/common/TableBits";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { INVENTORY_ADJUST_FIELDS } from "@/lib/admin-forms";
import { getInventory, type InventoryItem } from "@/services/inventory.service";
import { adjustInventory, warehousesApi } from "@/services/admin-resource.service";
import { toast } from "sonner";

type Row = InventoryItem & {
  warehouse?: string | { id: string; code: string; name: string; city: string };
};

/** The API nests the warehouse; older records may carry a plain label or none. */
const warehouseLabel = (w: Row["warehouse"]) =>
  !w ? "—" : typeof w === "string" ? w : `${w.city} ${w.code.replace("WH-", "")}`;

const PAGE_SIZE = 20;

/** Walk every page so tab counts and the adjust picker cover all stock records. */
const FETCH_LIMIT = 100;
const fetchAllInventory = async () => {
  const all: Row[] = [];
  for (let page = 1; ; page++) {
    const res = await getInventory(page, FETCH_LIMIT);
    all.push(...((res?.data ?? []) as Row[]));
    if (!res?.meta || page >= res.meta.totalPages) break;
  }
  return all;
};

const state = (available: number, reorderAt: number) =>
  available <= 0 ? "Out of stock" : available <= reorderAt ? "Low stock" : "In stock";

export default function InventoryPage() {
  const [inventory, setInventory] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [tab, setTab] = useState("All");
  const [formOpen, setFormOpen] = useState(false);
  // null while creating a fresh adjustment; a row when adjusting an existing one.
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);

  const openAdjust = (row?: Row) => {
    setAdjusting(row ?? null);
    setFormOpen(true);
  };

  // Loading starts true; retry() re-arms it so the effect never sets state synchronously.
  const fetchInventory = useCallback(
    () =>
      fetchAllInventory()
        .then((data) => {
          setInventory(data);
          setLoadError(null);
        })
        .catch((error: { message?: string }) => {
          setInventory([]);
          setLoadError(error?.message ?? "Unable to load inventory.");
        })
        .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const retry = () => {
    setLoading(true);
    setLoadError(null);
    fetchInventory();
  };

  // The adjust dialog picks a destination facility from the live network.
  useEffect(() => {
    warehousesApi
      .list({ limit: 50 })
      .then((res) =>
        setWarehouses(
          res.data.map((w: any) => ({ value: w.id, label: `${w.name}` }))
        )
      )
      .catch(() => setWarehouses([]));
  }, []);

  const counts = useMemo(() => {
    const c = { All: inventory.length, "In stock": 0, "Low stock": 0, "Out of stock": 0 };
    inventory.forEach((i) => {
      c[state(i.quantity - i.reserved, i.reorderAt) as keyof typeof c] += 1;
    });
    return c;
  }, [inventory]);

  const filtered = inventory.filter(
    (i) => tab === "All" || state(i.quantity - i.reserved, i.reorderAt) === tab
  );
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Product and warehouse options come only from what actually exists — never
  // the sample options baked into the shared field definitions.
  const fields = INVENTORY_ADJUST_FIELDS.map((f) =>
    f.name === "warehouse"
      ? { ...f, options: warehouses }
      : f.name === "product"
        ? {
            ...f,
            options: inventory.map((i) => ({
              value: i.productId,
              label: `${i.product.name} · ${i.product.sku}`,
            })),
          }
        : f
  );

  const initial: EntityValues | undefined = adjusting
    ? {
        product: adjusting.productId,
        warehouse:
          typeof adjusting.warehouse === "object" && adjusting.warehouse
            ? adjusting.warehouse.id
            : "",
        reason: "count",
        quantity: String(adjusting.quantity),
        reserved: String(adjusting.reserved),
        reorderAt: String(adjusting.reorderAt),
        note: "",
      }
    : undefined;

  const applyAdjustment = async (values: EntityValues) => {
    const productId = String(values.product);
    const target =
      adjusting ?? inventory.find((i) => i.productId === productId) ?? null;

    if (!target) {
      toast.error("No stock record exists for that product yet.");
      return false;
    }

    try {
      await adjustInventory(target.id, {
        reason: String(values.reason || "count").toUpperCase(),
        quantity: Number(values.quantity) || 0,
        reserved: Number(values.reserved) || 0,
        reorderAt: Number(values.reorderAt) || 0,
        warehouseId: values.warehouse ? String(values.warehouse) : undefined,
        note: values.note ? String(values.note) : undefined,
      });
      await fetchInventory();
      toast.success("Adjustment posted.");
      return true;
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to post the adjustment.");
      return false;
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Inventory"
        subtitle="On-hand, reserved and reorder thresholds across every warehouse."
        filters={[{ label: "Warehouse:", value: "All warehouses", emphasis: true }]}
        actions={[
          { label: "Export", icon: Download },
          { label: "Stock transfer", icon: ArrowLeftRight, href: "/admin/warehouses" },
          {
            label: "New adjustment",
            icon: Plus,
            emphasis: true,
            onClick: () =>
              loadError || loading
                ? toast.error("Inventory hasn't loaded — retry before posting an adjustment.")
                : openAdjust(),
          },
        ]}
      />

      <StatusTabs
        tabs={(["All", "In stock", "Low stock", "Out of stock"] as const).map((label) => ({
          label,
          count: loading || loadError ? undefined : counts[label],
        }))}
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
              <TH>Product</TH>
              <TH>SKU</TH>
              <TH>Warehouse</TH>
              <TH className="w-[190px]">On hand</TH>
              <TH align="right">Reserved</TH>
              <TH align="right">Available</TH>
              <TH align="right">Reorder at</TH>
              <TH>Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && inventory.length === 0 ? (
              <EmptyRow colSpan={9}>Loading inventory…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={9}>
                {loadError}{" "}
                <button type="button" onClick={retry} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : inventory.length === 0 ? (
              <EmptyRow colSpan={9}>No inventory records yet.</EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={9}>No inventory records in this state.</EmptyRow>
            ) : (
              rows.map((item) => {
                const available = item.quantity - item.reserved;
                const label = state(available, item.reorderAt);
                const tone =
                  label === "Out of stock" ? "danger" : label === "Low stock" ? "warning" : "success";
                return (
                  <TR key={item.id}>
                    <TD strong>{item.product.name}</TD>
                    <TD mono>{item.product.sku}</TD>
                    <TD>{warehouseLabel(item.warehouse)}</TD>
                    <TD>
                      <StockMeter
                        onHand={item.quantity}
                        capacity={Math.max(item.quantity, item.reorderAt * 4, 1)}
                        tone={tone}
                      />
                    </TD>
                    <TD align="right" mono>{item.reserved}</TD>
                    <TD align="right" mono strong>{available}</TD>
                    <TD align="right" mono>{item.reorderAt}</TD>
                    <TD>
                      <StatusBadge tone={tone}>{label}</StatusBadge>
                    </TD>
                    <TD>
                      <RowMenu
                        actions={[
                          {
                            label: "Adjust stock",
                            icon: SlidersHorizontal,
                            onSelect: () => openAdjust(item),
                          },
                          {
                            label: "Transfer stock",
                            icon: ArrowLeftRight,
                            href: "/admin/warehouses",
                          },
                          {
                            label: "View product",
                            icon: Eye,
                            href: `/admin/products/${item.productId}`,
                          },
                        ]}
                      />
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>

        <TablePagination
          page={page}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
          noun="stock records"
        />
      </Card>

      <EntityFormModal
        open={formOpen}
        mode={adjusting ? "edit" : "create"}
        entity="stock level"
        subtitle={
          adjusting
            ? `${adjusting.product.name} · ${adjusting.product.sku}`
            : "Pick the product you are stocking, then post the new counts."
        }
        submitLabel="Post adjustment"
        fields={fields}
        initial={initial}
        onSubmit={applyAdjustment}
        onClose={() => setFormOpen(false)}
      />
    </div>
  );
}
