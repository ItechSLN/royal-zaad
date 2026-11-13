'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, Search, SlidersHorizontal } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import ListStateRow from "@/components/admin/common/ListStateRow";
import Modal, { ModalButton } from "@/components/admin/form/Modal";
import { Table, THead, TBody, TH, TD, TR } from "@/components/admin/common/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { SelectField, TextField, errorText } from "@/components/vendor/ui";
import {
  adjustVendorStock,
  getVendorInventory,
  type AdjustReason,
  type VendorInventoryRow,
} from "@/services/vendor.service";

const REASONS: { value: AdjustReason; label: string }[] = [
  { value: "COUNT", label: "Stock count" },
  { value: "RECEIPT", label: "Received stock" },
  { value: "DAMAGE", label: "Damaged / lost" },
  { value: "RETURN", label: "Customer return" },
  { value: "TRANSFER", label: "Transfer" },
];

const isLow = (r: VendorInventoryRow) => r.available <= r.reorderAt;

function AdjustDialog({
  row,
  onClose,
  onSaved,
}: {
  row: VendorInventoryRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState<AdjustReason | "">("COUNT");
  const [quantity, setQuantity] = useState(String(row.quantity));
  const [reorderAt, setReorderAt] = useState(String(row.reorderAt));
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const next: Record<string, string> = {};
    if (!reason) next.reason = "Choose a reason";
    if (!/^\d+$/.test(quantity)) next.quantity = "Enter a whole number, 0 or more";
    else if (Number(quantity) < row.reserved)
      next.quantity = `At least ${row.reserved} — that many are reserved for open orders`;
    if (!/^\d+$/.test(reorderAt)) next.reorderAt = "Enter a whole number, 0 or more";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSaving(true);
    setMessage("");
    try {
      await adjustVendorStock(row.productId, {
        reason: reason as AdjustReason,
        quantity: Number(quantity),
        reorderAt: Number(reorderAt),
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      toast.success(`Stock updated for ${row.product.name}.`);
      onSaved();
    } catch (e) {
      const api = e as { errors?: Record<string, string> };
      setErrors(api.errors ?? {});
      setMessage(errorText(e, "Couldn't update stock."));
      setSaving(false);
    }
  };

  const delta = /^\d+$/.test(quantity) ? Number(quantity) - row.quantity : 0;

  return (
    <Modal
      open
      size="sm"
      title="Adjust stock"
      subtitle={`${row.product.name} · ${row.product.sku}`}
      onClose={onClose}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="dark" onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </ModalButton>
        </>
      }
    >
      <SelectField label="REASON" value={reason} error={errors.reason} onChange={(v) => setReason(v as AdjustReason)} options={REASONS} />
      <TextField
        label="UNITS ON HAND (NEW TOTAL)"
        type="number"
        value={quantity}
        error={errors.quantity}
        help={`Currently ${row.quantity} on hand, ${row.reserved} reserved.${delta ? ` Change: ${delta > 0 ? "+" : ""}${delta}.` : ""}`}
        onChange={setQuantity}
      />
      <TextField
        label="REORDER POINT"
        type="number"
        value={reorderAt}
        error={errors.reorderAt}
        help="Flagged as low stock when available units reach this number."
        onChange={setReorderAt}
      />
      <TextField label="NOTE (OPTIONAL)" value={note} error={errors.note} onChange={setNote} />
      {message && <p role="alert" className="font-body text-[11.5px] text-[var(--danger)]">{message}</p>}
    </Modal>
  );
}

export default function VendorInventoryPage() {
  const [rows, setRows] = useState<VendorInventoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [query, setQuery] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [editing, setEditing] = useState<VendorInventoryRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setRows(await getVendorInventory());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (!lowOnly || isLow(r)) &&
        (!q || r.product.name.toLowerCase().includes(q) || r.product.sku.toLowerCase().includes(q))
    );
  }, [rows, query, lowOnly]);

  const lowCount = (rows ?? []).filter(isLow).length;
  const state = failed && !rows ? "error" : !rows ? "loading" : visible.length === 0 ? "empty" : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Inventory"
        subtitle="Stock for each of your products. Reserved units are held for open orders."
      />

      <Card>
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-3 py-[9px] sm:w-[320px]">
            <Search size={14} className="text-[var(--ink-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or SKU"
              aria-label="Search inventory"
              className="w-full bg-transparent font-body text-[12px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
            />
          </div>
          <label className="flex items-center gap-2 font-body text-[12px] text-[var(--ink)]">
            <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="accent-[var(--ink)]" />
            Low stock only {rows && `(${lowCount})`}
          </label>
        </div>
        {failed && rows && (
          <p className="px-5 pb-3 font-body text-[12px] text-[var(--danger)]">
            Couldn&apos;t refresh stock.{" "}
            <button type="button" className="font-semibold underline" onClick={load}>Retry</button>
          </p>
        )}
        <div className={loading && rows ? "opacity-60" : ""}>
          <Table>
            <THead>
              <tr>
                <TH>Product</TH>
                <TH>SKU</TH>
                <TH align="right">On hand</TH>
                <TH align="right">Reserved</TH>
                <TH align="right">Available</TH>
                <TH align="right">Reorder at</TH>
                <TH>Status</TH>
                <TH align="right" />
              </tr>
            </THead>
            <TBody>
              {state ? (
                <ListStateRow
                  colSpan={8}
                  state={state}
                  onRetry={load}
                  noun="inventory"
                  empty={
                    rows && rows.length > 0 ? (
                      "No products match this filter."
                    ) : (
                      <>
                        No stock records yet — they&apos;re created with each product.{" "}
                        <Link href="/vendor/products/new" className="font-semibold text-[var(--gold-deep)] underline">
                          Add a product
                        </Link>
                      </>
                    )
                  }
                />
              ) : (
                visible.map((r) => {
                  const low = isLow(r);
                  return (
                    <TR key={r.id} highlight={low}>
                      <TD strong>
                        <Link href={`/vendor/products/${r.productId}`} className="hover:underline">
                          {r.product.name}
                        </Link>
                        {r.product.archivedAt && <span className="ml-2 text-[10px] font-normal text-[var(--ink-muted)]">archived</span>}
                      </TD>
                      <TD mono>{r.product.sku}</TD>
                      <TD align="right" mono>{r.quantity}</TD>
                      <TD align="right" mono>{r.reserved}</TD>
                      <TD align="right" mono strong className={r.available <= 0 ? "!text-[var(--danger)]" : low ? "!text-[var(--warning)]" : ""}>
                        {r.available}
                      </TD>
                      <TD align="right" mono>{r.reorderAt}</TD>
                      <TD>
                        {r.available <= 0 ? (
                          <StatusBadge tone="danger">Out of stock</StatusBadge>
                        ) : low ? (
                          <StatusBadge tone="warning">
                            <span className="inline-flex items-center gap-1"><AlertTriangle size={11} /> Low</span>
                          </StatusBadge>
                        ) : (
                          <StatusBadge tone="success">In stock</StatusBadge>
                        )}
                      </TD>
                      <TD align="right">
                        <button
                          type="button"
                          onClick={() => setEditing(r)}
                          className="inline-flex items-center gap-1.5 rounded-[2px] border border-[var(--border-strong)] px-3 py-1.5 font-body text-[11px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
                        >
                          <SlidersHorizontal size={12} /> Adjust
                        </button>
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
        </div>
      </Card>

      {editing && (
        <AdjustDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
