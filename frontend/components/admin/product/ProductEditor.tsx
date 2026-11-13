'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Eye, ImagePlus, Pencil, Plus, Save, Trash2, Upload, X } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import type { FieldDef } from "@/components/admin/form/Fields";
import { StatusBadge, GoldBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import {
  createProduct,
  getProductById,
  updateProduct,
  type Product,
  type ProductFormData,
} from "@/services/product.service";
import { getStoreCategories, type Category } from "@/services/category.service";
import { getBrands, type Brand } from "@/services/brand.service";
import { warehousesApi } from "@/services/admin-resource.service";
import {
  createVariant,
  deleteVariant,
  getVariants,
  updateVariant,
  type ProductVariant,
} from "@/services/variant.service";

const VARIANT_TONE: Record<string, Tone> = { Active: "success", Draft: "neutral" };

const slugify = (v: string) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const money = (v: string | null | undefined) =>
  v === null || v === undefined || v === ""
    ? "—"
    : `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Panel({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-4 px-5 pb-4 pt-5">
        <div className="flex flex-col gap-[3px]">
          <h3 className="font-display text-[19px] font-semibold text-[var(--ink)]">{title}</h3>
          {subtitle && (
            <p className="font-body text-[11px] leading-[1.6] text-[var(--ink-muted)]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="flex flex-col gap-4 px-5 pb-5">{children}</div>
    </Card>
  );
}

/** Controlled field — the previous editor used defaultValue, so nothing was captured. */
function Field({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  error,
  textarea = false,
  rows = 5,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  suffix?: string;
  placeholder?: string;
  error?: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
        {label}
      </span>
      {textarea ? (
        <textarea
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className="w-full resize-y rounded-[2px] border border-[var(--border-strong)] bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] leading-[1.7] text-[var(--ink)] outline-none transition focus:border-[var(--gold)]"
        />
      ) : (
        <div
          className={`flex items-center rounded-[2px] border bg-[var(--surface)] px-[14px] transition focus-within:border-[var(--gold)] ${
            error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
          }`}
        >
          <input
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none"
          />
          {suffix && (
            <span className="shrink-0 font-body text-[11px] text-[var(--ink-muted)]">{suffix}</span>
          )}
        </div>
      )}
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = "Select…",
  error,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  error?: string;
}) {
  return (
    <label className="flex w-full flex-col gap-2">
      <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-[2px] border bg-[var(--surface)] px-[14px] py-[12px] font-body text-[12.5px] text-[var(--ink)] outline-none transition focus:border-[var(--gold)] ${
          error ? "border-[var(--danger)]" : "border-[var(--border-strong)]"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <span className="font-body text-[10.5px] text-[var(--danger)]">{error}</span>}
    </label>
  );
}

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
    <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-3 last:border-b-0 last:pb-0">
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

const EMPTY = {
  name: "",
  slug: "",
  sku: "",
  barcode: "",
  shortDescription: "",
  description: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  categoryId: "",
  brandId: "",
  isFeatured: false,
};

export default function ProductEditor({ mode }: { mode: "create" | "edit" }) {
  const router = useRouter();
  const params = useParams();
  const productId = (params?.id as string) ?? "";
  const isCreate = mode === "create";

  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<"draft" | "publish" | null>(null);
  const [loaded, setLoaded] = useState<Product | null>(null);
  const [images, setImages] = useState<File[]>([]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [warehouses, setWarehouses] = useState<{ value: string; label: string }[]>([]);

  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [variantOpen, setVariantOpen] = useState(false);
  const [editingVariant, setEditingVariant] = useState<ProductVariant | null>(null);
  const [pendingVariant, setPendingVariant] = useState<ProductVariant | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  /* ── reference data ── */
  useEffect(() => {
    getStoreCategories(100).then((r) => setCategories(r.data)).catch(() => setCategories([]));
    getBrands(1, 100).then((r) => setBrands(r.data)).catch(() => setBrands([]));
    warehousesApi
      .list({ limit: 50 })
      .then((r) =>
        setWarehouses(
          (r.data as { id: string; name: string }[]).map((w) => ({
            value: w.id,
            label: w.name,
          }))
        )
      )
      .catch(() => setWarehouses([]));
  }, []);

  /* ── existing product ── */
  const load = useCallback(async () => {
    if (isCreate || !productId) return;
    try {
      const p = await getProductById(productId);
      setLoaded(p);
      setForm({
        name: p.name ?? "",
        slug: p.slug ?? "",
        sku: p.sku ?? "",
        barcode: p.barcode ?? "",
        shortDescription: p.shortDescription ?? "",
        description: p.description ?? "",
        price: p.price ?? "",
        compareAtPrice: p.compareAtPrice ?? "",
        costPrice: p.costPrice ?? "",
        categoryId: p.categoryId ?? "",
        brandId: p.brandId ?? "",
        isFeatured: Boolean(p.isFeatured),
      });
      setVariants((p.variants as ProductVariant[]) ?? []);
    } catch {
      toast.error("Unable to load this product.");
    }
  }, [isCreate, productId]);

  useEffect(() => {
    load();
  }, [load]);

  const refreshVariants = useCallback(async () => {
    if (!productId) return;
    try {
      setVariants(await getVariants(productId));
    } catch {
      /* leave what is on screen */
    }
  }, [productId]);

  /* ── save ── */
  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "A product title is required";
    if (!form.sku.trim()) next.sku = "A SKU is required";
    if (!form.price.trim() || Number.isNaN(Number(form.price)))
      next.price = "Enter a price";
    if (!form.categoryId) next.categoryId = "Choose a category";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async (publish: boolean) => {
    if (!validate()) {
      toast.error("Check the highlighted fields.");
      return;
    }

    setSaving(publish ? "publish" : "draft");

    const payload: ProductFormData = {
      name: form.name.trim(),
      slug: form.slug.trim() || slugify(form.name),
      sku: form.sku.trim(),
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim(),
      price: form.price,
      compareAtPrice: form.compareAtPrice,
      costPrice: form.costPrice || undefined,
      barcode: form.barcode || undefined,
      categoryId: form.categoryId,
      brandId: form.brandId || undefined,
      isActive: publish,
      isFeatured: form.isFeatured,
    };

    try {
      if (isCreate) {
        const created = await createProduct(payload, images);
        toast.success(publish ? "Product published." : "Draft saved.");
        router.push(`/admin/products/${created.id}/edit`);
      } else {
        await updateProduct(productId, payload, images);
        setImages([]);
        await load();
        toast.success(publish ? "Changes published." : "Draft saved.");
      }
    } catch (error) {
      const api = error as { errors?: Record<string, string>; message?: string };
      setErrors(api?.errors ?? {});
      toast.error(api?.message ?? "Unable to save this product.");
    } finally {
      setSaving(null);
    }
  };

  /* ── variants ── */
  const variantFields: FieldDef[] = useMemo(
    () => [
      { name: "name", label: "VARIANT NAME", placeholder: "500 g · Raw" },
      { name: "sku", label: "SKU", placeholder: "HON-SDR-500" },
      { name: "price", label: "PRICE", type: "money", placeholder: "148.00" },
      { name: "costPrice", label: "UNIT COST", type: "money", help: "Optional" },
      { name: "quantity", label: "ON HAND", type: "number", help: "Optional" },
      {
        name: "warehouseId",
        label: "WAREHOUSE",
        type: "select",
        help: "Optional",
        options: warehouses,
      },
      { name: "isActive", label: "Available for sale", type: "toggle", full: true },
    ],
    [warehouses]
  );

  const variantInitial: EntityValues = editingVariant
    ? {
        name: editingVariant.name,
        sku: editingVariant.sku,
        price: editingVariant.price,
        costPrice: editingVariant.costPrice ?? "",
        quantity: String(editingVariant.quantity ?? 0),
        warehouseId: editingVariant.warehouseId ?? "",
        isActive: editingVariant.isActive,
      }
    : {
        name: "",
        sku: form.sku ? `${form.sku}-` : "",
        price: form.price,
        costPrice: form.costPrice,
        quantity: "0",
        warehouseId: "",
        isActive: true,
      };

  const submitVariant = async (values: EntityValues) => {
    const payload = {
      name: String(values.name),
      sku: String(values.sku),
      price: Number(values.price) || 0,
      costPrice: values.costPrice ? Number(values.costPrice) : undefined,
      quantity: values.quantity ? Number(values.quantity) : 0,
      warehouseId: values.warehouseId ? String(values.warehouseId) : undefined,
      isActive: Boolean(values.isActive),
    };

    try {
      if (editingVariant) await updateVariant(editingVariant.id, payload);
      else await createVariant(productId, payload);
      await refreshVariants();
      toast.success(editingVariant ? "Variant updated." : "Variant added.");
      return true;
    } catch (error) {
      const api = error as { errors?: Record<string, string>; message?: string };
      toast.error(api?.errors?.sku ?? api?.message ?? "Unable to save the variant.");
      return false;
    }
  };

  const confirmDeleteVariant = async () => {
    if (!pendingVariant) return;
    try {
      await deleteVariant(pendingVariant.id);
      await refreshVariants();
      toast.success("Variant removed.");
    } catch (error) {
      const api = error as { message?: string };
      toast.error(api?.message ?? "Unable to remove the variant.");
    }
    setPendingVariant(null);
  };

  const existingImages = loaded?.images ?? [];

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title={isCreate ? "New product" : form.name || "Product"}
        subtitle={
          isCreate
            ? "Create a catalogue entry — it stays a draft until you publish."
            : `SKU ${form.sku || "—"} · ${loaded?.isActive ? "Published" : "Draft"}`
        }
        actions={[
          ...(isCreate
            ? []
            : [
                {
                  label: "Preview",
                  icon: Eye,
                  href: `/products/${productId}`,
                },
                { label: "Duplicate", icon: Copy, onClick: () => toast.info("Duplicate is not wired up yet.") },
              ]),
          {
            label: saving === "draft" ? "Saving…" : "Save draft",
            icon: Save,
            onClick: () => save(false),
          },
          {
            label:
              saving === "publish"
                ? "Publishing…"
                : isCreate
                  ? "Create product"
                  : "Publish changes",
            icon: Upload,
            emphasis: true,
            onClick: () => save(true),
          },
        ]}
      />

      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.7fr)_1fr]">
        <div className="flex flex-col gap-[18px]">
          <Panel
            title="General information"
            subtitle="Core naming and descriptive copy shown across storefront and marketplace feeds."
          >
            <Field
              label="PRODUCT TITLE"
              value={form.name}
              error={errors.name}
              placeholder="Sidr Mountain Honey"
              onChange={(v) => {
                set("name", v);
                if (isCreate) set("slug", slugify(v));
              }}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="SKU" value={form.sku} error={errors.sku} placeholder="HON-SDR-500" onChange={(v) => set("sku", v)} />
              <Field label="BARCODE (GTIN)" value={form.barcode} placeholder="6281000450127" onChange={(v) => set("barcode", v)} />
            </div>
            <SelectField
              label="BRAND"
              value={form.brandId}
              onChange={(v) => set("brandId", v)}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="No brand"
            />
            <Field
              label="SHORT DESCRIPTION"
              value={form.shortDescription}
              placeholder="500 g · Raw & unfiltered"
              onChange={(v) => set("shortDescription", v)}
            />
            <Field
              label="DESCRIPTION"
              value={form.description}
              onChange={(v) => set("description", v)}
              textarea
              rows={7}
            />
          </Panel>

          <Panel
            title="Media"
            subtitle="First image becomes the primary thumbnail. JPG, PNG or WEBP up to 5 MB."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {existingImages.map((img, i) => (
                <div
                  key={img.id}
                  className="relative aspect-square overflow-hidden rounded-[2px] border border-[var(--border)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  {i === 0 && (
                    <span className="absolute left-2 top-2">
                      <GoldBadge className="bg-[#0A0A0BE6]">PRIMARY</GoldBadge>
                    </span>
                  )}
                </div>
              ))}

              {images.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="relative aspect-square overflow-hidden rounded-[2px] border border-dashed border-[var(--gold)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(file)} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => setImages((prev) => prev.filter((_, n) => n !== i))}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--noir)]/80 text-[var(--cream)]"
                  >
                    <X size={12} />
                  </button>
                  <span className="absolute bottom-0 left-0 right-0 bg-[var(--noir)]/80 py-1 text-center font-body text-[9px] text-[var(--cream)]">
                    PENDING UPLOAD
                  </span>
                </div>
              ))}

              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files).filter((f) =>
                    f.type.startsWith("image/")
                  );
                  if (dropped.length) setImages((prev) => [...prev, ...dropped]);
                }}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-[2px] border border-dashed border-[var(--border-strong)] bg-[var(--admin-bg)] transition hover:border-[var(--gold)]"
              >
                <ImagePlus size={18} className="text-[var(--ink-muted)]" />
                <span className="font-body text-[11px] font-semibold text-[var(--ink)]">Add media</span>
                <span className="font-body text-[10px] text-[var(--ink-muted)]">
                  {images.length ? `${images.length} queued` : "or drop files"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    // Copy the files out before clearing the input: the state
                    // updater runs later, after the FileList has been emptied.
                    const picked = Array.from(e.target.files ?? []);
                    setImages((prev) => [...prev, ...picked]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          </Panel>

          <Panel title="Pricing & margin">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="RETAIL PRICE" value={form.price} error={errors.price} placeholder="148.00" onChange={(v) => set("price", v)} />
              <Field label="COMPARE AT" value={form.compareAtPrice} placeholder="185.00" onChange={(v) => set("compareAtPrice", v)} />
              <Field label="UNIT COST" value={form.costPrice} placeholder="89.10" onChange={(v) => set("costPrice", v)} />
            </div>
            <p className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">
              Tax is applied at checkout by destination — see{" "}
              <a href="/admin/tax" className="font-semibold text-[var(--gold-deep)] underline">
                Tax
              </a>
              .
            </p>

            {form.price && form.costPrice && (
              <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                <div className="flex flex-col gap-1">
                  <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
                    PROFIT
                  </span>
                  <span className="font-display text-[22px] font-semibold text-[var(--ink)]">
                    {money(String(Number(form.price) - Number(form.costPrice)))}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-body text-[9.5px] font-bold tracking-[1.6px] text-[var(--ink-muted)]">
                    MARGIN
                  </span>
                  <span className="font-display text-[22px] font-semibold text-[var(--success)]">
                    {Number(form.price) > 0
                      ? `${(((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100).toFixed(1)}%`
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </Panel>

          <Panel
            title="Variants"
            subtitle={
              isCreate
                ? "Save the product first — variants attach to a saved product."
                : `${variants.length} variant${variants.length === 1 ? "" : "s"} · each carries its own SKU, price and stock.`
            }
            action={
              <button
                type="button"
                disabled={isCreate}
                onClick={() => {
                  setEditingVariant(null);
                  setVariantOpen(true);
                }}
                className="flex shrink-0 items-center gap-2 rounded-[2px] border border-[var(--border-strong)] px-3 py-2 font-body text-[11.5px] font-semibold text-[var(--ink)] transition hover:bg-[var(--cream-2)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Plus size={13} /> Add variant
              </button>
            }
          >
            <div className="-mx-5">
              <Table>
                <THead>
                  <tr>
                    <TH>Variant</TH>
                    <TH>SKU</TH>
                    <TH align="right">Price</TH>
                    <TH align="right">On hand</TH>
                    <TH>Warehouse</TH>
                    <TH align="right">Status</TH>
                    <TH className="w-[40px]" />
                  </tr>
                </THead>
                <TBody>
                  {variants.length === 0 ? (
                    <EmptyRow colSpan={7}>
                      {isCreate
                        ? "Save the product to start adding variants."
                        : "No variants yet — add the first one."}
                    </EmptyRow>
                  ) : (
                    variants.map((v) => (
                      <TR key={v.id}>
                        <TD strong>{v.name}</TD>
                        <TD mono>{v.sku}</TD>
                        <TD align="right" mono>{money(v.price)}</TD>
                        <TD align="right" mono>{v.quantity}</TD>
                        <TD>{v.warehouse?.name ?? "—"}</TD>
                        <TD align="right">
                          <StatusBadge tone={VARIANT_TONE[v.isActive ? "Active" : "Draft"]}>
                            {v.isActive ? "Active" : "Draft"}
                          </StatusBadge>
                        </TD>
                        <TD>
                          <RowMenu
                            actions={[
                              {
                                label: "Edit variant",
                                icon: Pencil,
                                onSelect: () => {
                                  setEditingVariant(v);
                                  setVariantOpen(true);
                                },
                              },
                              {
                                label: "Remove",
                                icon: Trash2,
                                danger: true,
                                onSelect: () => setPendingVariant(v),
                              },
                            ]}
                          />
                        </TD>
                      </TR>
                    ))
                  )}
                </TBody>
              </Table>
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-[18px]">
          <Panel title="Status & visibility">
            <div className="flex items-center justify-between rounded-[2px] border border-[var(--border)] bg-[var(--admin-bg)] px-4 py-3">
              <span className="font-body text-[12px] text-[var(--ink-muted)]">Current status</span>
              <StatusBadge tone={loaded?.isActive ? "success" : "neutral"}>
                {isCreate ? "Draft" : loaded?.isActive ? "Published" : "Draft"}
              </StatusBadge>
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <Toggle
                name="Feature on the storefront"
                note="Pinned to the best-sellers rail"
                checked={form.isFeatured}
                onChange={(v) => set("isFeatured", v)}
              />
            </div>
          </Panel>

          <Panel title="Organisation">
            <SelectField
              label="CATEGORY"
              value={form.categoryId}
              error={errors.categoryId}
              onChange={(v) => set("categoryId", v)}
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <Field label="URL HANDLE" value={form.slug} placeholder="sidr-mountain-honey" onChange={(v) => set("slug", v)} />
          </Panel>
        </div>
      </div>

      <EntityFormModal
        open={variantOpen}
        mode={editingVariant ? "edit" : "create"}
        entity="variant"
        fields={variantFields}
        initial={variantInitial}
        onSubmit={submitVariant}
        onClose={() => setVariantOpen(false)}
      />

      {pendingVariant && (
        <ConfirmDialog
          isOpen
          title="Remove variant"
          message={`Remove “${pendingVariant.name}” (${pendingVariant.sku})?\n\nThis action cannot be undone.`}
          onConfirm={confirmDeleteVariant}
          onClose={() => setPendingVariant(null)}
        />
      )}
    </div>
  );
}
