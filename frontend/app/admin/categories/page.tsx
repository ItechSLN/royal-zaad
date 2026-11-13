'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  Eye,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { CATEGORY_FIELDS } from "@/lib/admin-forms";
import type { CategoryNode as BaseNode } from "@/lib/showcase-catalogue";
import {
  categoriesApi,
  getCategoryTree,
  uploadCategoryImage,
} from "@/services/admin-resource.service";
import { fromCategory, toCategory } from "@/lib/admin-adapters";

type CategoryNode = Omit<BaseNode, "children"> & {
  description?: string;
  featured?: boolean;
  children?: CategoryNode[];
};

function Toggle({
  name,
  note,
  checked,
  onChange,
}: {
  name: string;
  note: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex flex-col">
        <span className="font-body text-[12px] font-semibold text-[var(--ink)]">{name}</span>
        <span className="font-body text-[10.5px] text-[var(--ink-muted)]">{note}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={name}
        onClick={() => onChange(!checked)}
        className={`flex h-[20px] w-[36px] shrink-0 items-center rounded-full p-[3px] transition ${
          checked ? "justify-end bg-[var(--ink)]" : "justify-start bg-[var(--cream-2)]"
        }`}
      >
        <span
          className={`h-[14px] w-[14px] rounded-full ${
            checked ? "bg-[var(--gold)]" : "bg-[var(--border-strong)]"
          }`}
        />
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (next: string) => void;
  readOnly?: boolean;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
        {label}
      </span>
      <input
        value={value}
        readOnly={readOnly}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-[2px] border border-[var(--border-strong)] px-[14px] py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)] ${
          readOnly ? "bg-[var(--admin-bg)] text-[var(--ink-muted)]" : "bg-[var(--surface)]"
        }`}
      />
    </label>
  );
}

export default function CategoriesPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryNode | null>(null);
  const [presetParent, setPresetParent] = useState("");
  const [pendingDelete, setPendingDelete] = useState<CategoryNode | null>(null);

  const loadTree = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCategoryTree();
      const mapped = (data ?? []).map(fromCategory) as CategoryNode[];
      setTree(mapped);
      setLoadError(null);
      setSelectedId((current) =>
        mapped.some(
          (c) => c.id === current || (c.children ?? []).some((k) => k.id === current)
        )
          ? current
          : (mapped[0]?.id ?? "")
      );
      setExpanded((current) => (current.length || !mapped[0] ? current : [mapped[0].id]));
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load categories.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTree();
  }, [loadTree]);

  /** Every node with the id of its parent, so selection can resolve either level. */
  const flat = useMemo(
    () =>
      tree.flatMap((c) => [
        { node: c, parent: null as CategoryNode | null },
        ...(c.children ?? []).map((s) => ({ node: s, parent: c })),
      ]),
    [tree]
  );

  const hit = flat.find((f) => f.node.id === selectedId) ?? flat[0];
  const selected = hit?.node;
  const parent = hit?.parent ?? null;
  /** The category whose children the sub-category table lists. */
  const owner = parent ?? selected;
  const children = owner?.children ?? [];

  const matches = (name: string) => name.toLowerCase().includes(query.trim().toLowerCase());

  const totals = tree.reduce(
    (a, c) => ({
      top: a.top + 1,
      sub: a.sub + (c.children?.length ?? 0),
      products: a.products + c.products,
    }),
    { top: 0, sub: 0, products: 0 }
  );

  const openCreate = (parentId = "") => {
    setEditing(null);
    setPresetParent(parentId);
    setFormOpen(true);
  };

  const openEdit = (node: CategoryNode, parentId = "") => {
    setEditing(node);
    setPresetParent(parentId);
    setFormOpen(true);
  };

  /** Parent options are the live top-level categories, not a fixed list. */
  const fields = useMemo(
    () =>
      CATEGORY_FIELDS.map((f) =>
        f.name === "parent"
          ? { ...f, options: tree.map((c) => ({ value: c.id, label: c.name })) }
          : f
      ),
    [tree]
  );

  const initial: EntityValues | undefined = useMemo(() => {
    if (editing) {
      return {
        name: editing.name,
        slug: editing.slug,
        parent: presetParent,
        sort: String(editing.sort ?? ""),
        description: editing.description ?? "",
        imageUrl: editing.imageUrl ?? "",
        inNav: editing.visibility !== "Hidden",
        featured: Boolean(editing.featured),
      };
    }
    if (presetParent) {
      return {
        name: "",
        slug: "",
        parent: presetParent,
        sort: "",
        description: "",
        imageUrl: "",
        inNav: true,
        featured: false,
      };
    }
    return undefined;
  }, [editing, presetParent]);

  const handleSubmit = async (values: EntityValues, files: Record<string, File>) => {
    try {
      const payload = toCategory(values);
      const saved = editing
        ? await categoriesApi.update(editing.id, payload)
        : await categoriesApi.create(payload);

      // The upload needs an id, so it follows the save. A server without
      // upload credentials answers 503 — the category itself is still saved,
      // so that is reported as a warning rather than a failure.
      if (files.imageUrl) {
        try {
          await uploadCategoryImage(saved.id, files.imageUrl);
        } catch (uploadError: any) {
          toast.warning(
            uploadError?.message ??
              "The category was saved, but the image could not be uploaded."
          );
        }
      }

      await loadTree();
      if (payload.parentId) {
        const parentId = payload.parentId;
        setExpanded((e) => (e.includes(parentId) ? e : [...e, parentId]));
      }
      setSelectedId(saved.id);
      toast.success(editing ? "Category updated." : `“${payload.name}” created.`);
      return true;
    } catch (error: any) {
      const detail = error?.errors ? Object.values(error.errors)[0] : null;
      toast.error(String(detail ?? error?.message ?? "Unable to save the category."));
      return false;
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await categoriesApi.remove(pendingDelete.id);
      await loadTree();
      toast.success(`“${pendingDelete.name}” deleted.`);
    } catch (error: any) {
      // The API refuses while products or sub-categories still reference it.
      toast.error(error?.message ?? "Unable to delete the category.");
    }
    setPendingDelete(null);
  };

  /** Swaps a sub-category with its neighbour and saves both sort orders. */
  const move = async (node: CategoryNode, delta: number) => {
    const kids = owner?.children ?? [];
    const i = kids.findIndex((s) => s.id === node.id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= kids.length) return;

    const reordered = [...kids];
    [reordered[i], reordered[j]] = [reordered[j], reordered[i]];
    try {
      await Promise.all(
        reordered.map((s, n) => categoriesApi.update(s.id, { sortOrder: n + 1 }))
      );
      await loadTree();
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to reorder the categories.");
    }
  };

  /** Saves one flag from the detail panel, then re-reads the tree. */
  const saveFlag = async (payload: Record<string, boolean>, failure: string) => {
    if (!selected) return;
    try {
      await categoriesApi.update(selected.id, payload);
      await loadTree();
    } catch (error: any) {
      toast.error(error?.message ?? failure);
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Catalogue structure"
        subtitle={`${totals.top} top-level categories · ${totals.sub} sub-categories · ${totals.products.toLocaleString()} products mapped`}
        actions={[
          ...(owner
            ? [
                {
                  label: "Add sub-category",
                  icon: CornerDownRight,
                  onClick: () => openCreate(owner.id),
                },
              ]
            : []),
          { label: "New category", icon: Plus, emphasis: true, onClick: () => openCreate() },
        ]}
      />

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Tree */}
        <Card>
          <div className="flex flex-col gap-[3px] px-5 pb-4 pt-5">
            <h3 className="font-display text-[19px] font-semibold text-[var(--ink)]">
              Category tree
            </h3>
            <p className="font-body text-[11px] text-[var(--ink-muted)]">
              Reorder sub-categories from their row menu. Nesting is limited to two levels.
            </p>
          </div>

          <div className="px-5 pb-4">
            <div className="flex items-center gap-2 rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2">
              <Search size={14} className="text-[var(--ink-muted)]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filter categories…"
                className="w-full bg-transparent font-body text-[12px] text-[var(--ink)] outline-none placeholder:text-[var(--ink-muted)]"
              />
            </div>
          </div>

          <div className="flex flex-col pb-2">
            {loading && tree.length === 0 && (
              <p className="px-5 py-4 font-body text-[12px] text-[var(--ink-muted)]">Loading categories…</p>
            )}
            {loadError && (
              <p className="px-5 py-4 font-body text-[12px] text-[var(--ink-muted)]">
                {loadError}{" "}
                <button type="button" onClick={loadTree} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </p>
            )}
            {!loading && !loadError && tree.length === 0 && (
              <p className="px-5 py-4 font-body text-[12px] text-[var(--ink-muted)]">No categories yet.</p>
            )}
            {tree
              .filter((c) => matches(c.name) || (c.children ?? []).some((s) => matches(s.name)))
              .map((c) => {
                const isOpen = expanded.includes(c.id);
                const hasKids = (c.children?.length ?? 0) > 0;
                return (
                  <div key={c.id} className="flex flex-col">
                    <div
                      className={`flex items-center gap-2 border-l-2 px-5 py-[9px] transition ${
                        selectedId === c.id
                          ? "border-[var(--gold)] bg-[var(--cream-2)]"
                          : "border-transparent hover:bg-[var(--admin-bg)]"
                      }`}
                    >
                      {hasKids ? (
                        <button
                          type="button"
                          aria-label={isOpen ? "Collapse" : "Expand"}
                          onClick={() =>
                            setExpanded((e) =>
                              e.includes(c.id) ? e.filter((x) => x !== c.id) : [...e, c.id]
                            )
                          }
                          className="text-[var(--ink-muted)]"
                        >
                          {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        </button>
                      ) : (
                        <span className="w-[13px]" />
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedId(c.id)}
                        className="flex flex-1 items-center justify-between gap-2 text-left"
                      >
                        <span
                          className={`font-body text-[12.5px] ${
                            selectedId === c.id
                              ? "font-semibold text-[var(--ink)]"
                              : "text-[var(--ink)]"
                          }`}
                        >
                          {c.name}
                        </span>
                        <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                          {c.products}
                        </span>
                      </button>

                      <button
                        type="button"
                        aria-label={`Add sub-category to ${c.name}`}
                        title={`Add sub-category to ${c.name}`}
                        onClick={() => openCreate(c.id)}
                        className="text-[var(--ink-muted)] transition hover:text-[var(--gold-deep)]"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    {isOpen &&
                      (c.children ?? []).map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSelectedId(s.id)}
                          className={`flex items-center justify-between gap-2 border-l-2 py-[8px] pl-[52px] pr-5 text-left transition ${
                            selectedId === s.id
                              ? "border-[var(--gold)] bg-[var(--cream-2)]"
                              : "border-transparent hover:bg-[var(--admin-bg)]"
                          }`}
                        >
                          <span
                            className={`font-body text-[12px] ${
                              s.visibility === "Hidden"
                                ? "text-[var(--ink-muted)] line-through"
                                : "text-[var(--ink-muted)]"
                            }`}
                          >
                            {s.name}
                          </span>
                          <span className="font-mono text-[10px] text-[var(--ink-muted)]">
                            {s.products}
                          </span>
                        </button>
                      ))}
                  </div>
                );
              })}
          </div>

          <div className="border-t border-[var(--border)] px-5 py-3">
            <button
              type="button"
              onClick={() => openCreate()}
              className="flex items-center gap-2 font-body text-[11.5px] font-semibold text-[var(--gold-deep)]"
            >
              <Plus size={13} /> Add category
            </button>
          </div>
        </Card>

        {/* Detail */}
        {!selected || !owner ? (
          <Card>
            <p className="px-5 py-10 text-center font-body text-[12px] text-[var(--ink-muted)]">
              {loading ? "Loading…" : loadError ? "Categories could not be loaded." : "Create a category to start building the catalogue."}
            </p>
          </Card>
        ) : (
        <div className="flex flex-col gap-[18px]">
          <Card>
            <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-start gap-4">
                {selected.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.imageUrl}
                    alt=""
                    className="h-[64px] w-[64px] shrink-0 rounded-[2px] border border-[var(--border)] object-cover"
                  />
                )}
              <div className="flex flex-col gap-1">
                <span className="font-body text-[10px] text-[var(--ink-muted)]">
                  Catalogue&nbsp;&nbsp;›&nbsp;&nbsp;
                  {parent ? `${parent.name}  ›  ${selected.name}` : selected.name}
                </span>
                <h3 className="font-display text-[26px] font-semibold text-[var(--ink)]">
                  {selected.name}
                </h3>
                <span className="font-body text-[11px] text-[var(--ink-muted)]">
                  {selected.products} products ·{" "}
                  {parent
                    ? `sub-category of ${parent.name}`
                    : `${selected.children?.length ?? 0} sub-categories`}
                  {selected.imageUrl ? "" : " · no image"}
                </span>
              </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreate(owner.id)}
                  className="rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 font-body text-[11.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
                >
                  Add sub-category
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(selected, parent?.id ?? "")}
                  className="rounded-[2px] bg-[var(--ink)] px-4 py-2 font-body text-[11.5px] font-semibold text-[var(--cream)] transition hover:bg-[var(--charcoal)]"
                >
                  Edit
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-4 px-5 py-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="CATEGORY NAME" value={selected.name} readOnly />
                <Field label="URL SLUG" value={selected.slug} readOnly />
              </div>
              <Field label="PARENT" value={parent ? parent.name : "— Top level —"} readOnly />

              <div className="flex flex-col gap-4 border-t border-[var(--border)] pt-4">
                <Toggle
                  name="Show in main navigation"
                  note="Appears in the storefront mega-menu"
                  checked={selected.visibility !== "Hidden"}
                  onChange={(next) =>
                    saveFlag({ isVisible: next, showInNav: next }, "Unable to update visibility.")
                  }
                />
                <Toggle
                  name="Feature on homepage"
                  note="Pinned to the seasonal rail"
                  checked={Boolean(selected.featured)}
                  onChange={(next) => saveFlag({ isFeatured: next }, "Unable to update homepage placement.")}
                />
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
              <div className="flex flex-col gap-[3px]">
                <h3 className="font-display text-[19px] font-semibold text-[var(--ink)]">
                  Sub-categories of {owner.name}
                </h3>
                <p className="font-body text-[11px] text-[var(--ink-muted)]">
                  Sort order controls left-to-right placement in the storefront menu.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openCreate(owner.id)}
                className="flex shrink-0 items-center gap-2 rounded-[2px] border border-[var(--border-strong)] px-3 py-2 font-body text-[11.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)]"
              >
                <Plus size={13} /> Add sub-category
              </button>
            </div>

            <Table>
              <THead>
                <tr>
                  <TH>Sub-category</TH>
                  <TH align="right">Products</TH>
                  <TH>Visibility</TH>
                  <TH align="right">Sort</TH>
                  <TH>Updated</TH>
                  <TH className="w-[40px]" />
                </tr>
              </THead>
              <TBody>
                {children.length === 0 ? (
                  <EmptyRow colSpan={6}>
                    No sub-categories yet — add the first one to start nesting.
                  </EmptyRow>
                ) : (
                  children.map((s, i) => (
                    <TR key={s.id} highlight={s.id === selectedId}>
                      <TD strong>{s.name}</TD>
                      <TD align="right" mono>{s.products}</TD>
                      <TD>
                        <StatusBadge tone={s.visibility === "Hidden" ? "neutral" : "success"}>
                          {s.visibility ?? "Visible"}
                        </StatusBadge>
                      </TD>
                      <TD align="right" mono>{s.sort ?? i + 1}</TD>
                      <TD>{s.updated ?? "—"}</TD>
                      <TD>
                        <RowMenu
                          actions={[
                            { label: "Edit category", icon: Pencil, onSelect: () => openEdit(s, owner.id) },
                            { label: "Select", icon: Eye, onSelect: () => setSelectedId(s.id) },
                            { label: "Move up", icon: ArrowUpDown, onSelect: () => move(s, -1) },
                            { label: "Move down", icon: ArrowUpDown, onSelect: () => move(s, 1) },
                            { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(s) },
                          ]}
                        />
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Card>
        </div>
        )}
      </div>

      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity={presetParent && !editing ? "sub-category" : "category"}
        subtitle={
          presetParent && !editing
            ? `Nested under ${tree.find((c) => c.id === presetParent)?.name ?? "—"}`
            : undefined
        }
        fields={fields}
        initial={initial}
        onSubmit={handleSubmit}
        onClose={() => setFormOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete “${pendingDelete.name}”?\n\nA category that still holds products or sub-categories cannot be deleted. This action cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
