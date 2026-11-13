'use client';

import { useCallback, useEffect, useState } from "react";
import { Download, Pencil, Plus, Trash2 } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { BRAND_FIELDS } from "@/lib/admin-forms";
import {
  createBrand,
  deleteBrand,
  getBrands,
  updateBrand,
} from "@/services/brand.service";
import { toast } from "sonner";

type Brand = { id: string; name: string; slug: string; description?: string };

export default function BrandsPage() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Brand | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBrands(1, 200);
      setBrands((res.data ?? []) as Brand[]);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load brands.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = {
      name: String(values.name),
      slug:
        String(values.slug).trim() ||
        String(values.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      description: values.description ? String(values.description) : undefined,
    };

    try {
      if (editing) await updateBrand(editing.id, payload);
      else await createBrand(payload);
      await refresh();
      toast.success(editing ? "Brand updated." : "Brand created.");
      return true;
    } catch (error: any) {
      const detail = error?.errors ? Object.values(error.errors)[0] : null;
      toast.error(String(detail ?? error?.message ?? "Unable to save the brand."));
      return false;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteBrand(pendingDelete.id);
      await refresh();
      toast.success("Brand deleted.");
    } catch (error: any) {
      // Refused while products still reference the brand.
      toast.error(error?.message ?? "Unable to delete the brand.");
    }
    setPendingDelete(null);
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (b: Brand) => {
    setEditing(b);
    setFormOpen(true);
  };

  const initial: EntityValues | undefined = editing
    ? { name: editing.name, slug: editing.slug, description: editing.description ?? "" }
    : undefined;

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Brands"
        subtitle="Producers and labels behind the catalogue."
        actions={[
          { label: "Export", icon: Download },
          { label: "New brand", icon: Plus, emphasis: true, onClick: openCreate },
        ]}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Brand</TH>
              <TH>Slug</TH>
              <TH>Description</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && brands.length === 0 ? (
              <EmptyRow colSpan={4}>Loading brands…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={4}>
                {loadError}{" "}
                <button type="button" onClick={refresh} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : brands.length === 0 ? (
              <EmptyRow colSpan={4}>No brands yet.</EmptyRow>
            ) : (
              brands.slice((page - 1) * 20, page * 20).map((b) => (
                <TR key={b.id}>
                  <TD strong>{b.name}</TD>
                  <TD mono>{b.slug}</TD>
                  <TD>{b.description || "—"}</TD>
                  <TD>
                    <RowMenu
                      actions={[
                        { label: "Edit brand", icon: Pencil, onSelect: () => openEdit(b) },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(b) },
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
          pageSize={20}
          total={brands.length}
          onPageChange={setPage}
          noun="brands"
        />
      </Card>

      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="brand"
        fields={BRAND_FIELDS}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />

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
