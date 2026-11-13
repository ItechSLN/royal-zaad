'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Archive, ArchiveRestore, ArrowLeft, ImagePlus, Save, Trash2, X } from "lucide-react";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import { GoldBadge } from "@/components/ui/Badge";
import { getStoreCategories, type Category } from "@/services/category.service";
import { getBrands, type Brand } from "@/services/brand.service";
import {
  archiveVendorProduct,
  createVendorProduct,
  deleteVendorProduct,
  getVendorProduct,
  updateVendorProduct,
  type VendorProduct,
  type VendorProductInput,
} from "@/services/vendor.service";
import {
  Btn,
  ListingBadge,
  MODERATION_HELP,
  ModerationBadge,
  Panel,
  SelectField,
  StateBlock,
  TextField,
  Toggle,
  errorText,
  money,
  slugify,
} from "./ui";
import Card from "@/components/admin/common/Card";

type Form = Omit<VendorProductInput, "isActive"> & { isActive: boolean };

const EMPTY: Form = {
  name: "",
  slug: "",
  sku: "",
  price: "",
  compareAtPrice: "",
  costPrice: "",
  barcode: "",
  categoryId: "",
  brandId: "",
  shortDescription: "",
  description: "",
  isActive: true,
};

const fromProduct = (p: VendorProduct): Form => ({
  name: p.name ?? "",
  slug: p.slug ?? "",
  sku: p.sku ?? "",
  price: p.price ?? "",
  compareAtPrice: p.compareAtPrice ?? "",
  costPrice: p.costPrice ?? "",
  barcode: p.barcode ?? "",
  categoryId: p.categoryId ?? "",
  brandId: p.brandId ?? "",
  shortDescription: p.shortDescription ?? "",
  description: p.description ?? "",
  isActive: Boolean(p.isActive),
});

const isMoney = (v?: string) => !v || (v.trim() !== "" && !Number.isNaN(Number(v)) && Number(v) >= 0);

export default function VendorProductForm({ productId }: { productId?: string }) {
  const router = useRouter();
  const isCreate = !productId;

  const [form, setForm] = useState<Form>(EMPTY);
  const [product, setProduct] = useState<VendorProduct | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "error" | "ready">(isCreate ? "ready" : "loading");
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [slugTouched, setSlugTouched] = useState(!isCreate);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (key: keyof Form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  // Reference data — the same visible-category list the admin editor uses.
  useEffect(() => {
    getStoreCategories(100)
      .then((r) => setCategories(r.data))
      .catch(() => setCategories([]));
    getBrands(1, 100)
      .then((r) => setBrands(r.data))
      .catch(() => setBrands([]));
  }, []);

  const load = useCallback(async () => {
    if (!productId) return;
    setLoadState("loading");
    try {
      const p = await getVendorProduct(productId);
      setProduct(p);
      setForm(fromProduct(p));
      setLoadState("ready");
    } catch (e) {
      setLoadError(errorText(e, "Couldn't load this product."));
      setLoadState("error");
    }
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load the product being edited
    void load();
  }, [load]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Name is required";
    if (!form.slug.trim()) next.slug = "URL handle is required";
    else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.slug.trim()))
      next.slug = "Use lowercase letters, numbers and dashes";
    if (!form.sku.trim()) next.sku = "SKU is required";
    if (!form.price.trim() || !isMoney(form.price)) next.price = "Enter a price";
    if (!isMoney(form.compareAtPrice)) next.compareAtPrice = "Enter a number";
    if (!isMoney(form.costPrice)) next.costPrice = "Enter a number";
    if (!form.categoryId) next.categoryId = "Choose a category";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const save = async () => {
    setFormError("");
    if (!validate()) {
      setFormError("Check the highlighted fields.");
      return;
    }
    setSaving(true);
    const payload: VendorProductInput = { ...form, slug: form.slug.trim() };
    try {
      if (isCreate) {
        const created = await createVendorProduct(payload, images);
        toast.success(
          created.moderationStatus === "PENDING_REVIEW"
            ? "Product created — it's waiting for marketplace review."
            : "Product created."
        );
        router.replace(`/vendor/products/${created.id}`);
      } else {
        await updateVendorProduct(productId, payload, images);
        setImages([]);
        await load();
        toast.success("Changes saved.");
      }
    } catch (e) {
      const api = e as { status?: number; errors?: Record<string, string>; message?: string };
      // The API reports a duplicate (shopId, sku) under a "shopId" key — it's the SKU.
      if (api.errors && Object.keys(api.errors).some((k) => k.includes("shopId"))) {
        api.errors = { sku: "Another of your products already uses this SKU" };
      }
      setErrors(api.errors ?? {});
      setFormError(
        api.errors && Object.keys(api.errors).length
          ? Object.values(api.errors).join(" ")
          : (api.message ?? "Couldn't save this product.")
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async () => {
    if (!product) return;
    try {
      await archiveVendorProduct(product.id, !product.archivedAt);
      toast.success(product.archivedAt ? "Product restored as a draft." : "Product archived.");
      await load();
    } catch (e) {
      toast.error(errorText(e, "Couldn't update the product."));
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    if (!product) return;
    try {
      await deleteVendorProduct(product.id);
      toast.success("Product deleted.");
      router.replace("/vendor/products");
    } catch (e) {
      // e.g. 400 "This product has orders — archive it instead…"
      toast.error(errorText(e, "Couldn't delete the product."));
      setFormError(errorText(e, "Couldn't delete the product."));
    }
  };

  if (loadState !== "ready") {
    return (
      <Card>
        <StateBlock state={loadState} noun="this product" error={loadError} onRetry={load} />
        <div className="pb-6 text-center">
          <Link href="/vendor/products" className="font-body text-[11.5px] font-semibold text-[var(--gold-deep)] underline">
            Back to products
          </Link>
        </div>
      </Card>
    );
  }

  const removed = product?.moderationStatus === "REMOVED";
  const existingImages = product?.images ?? [];
  const margin =
    form.price && form.costPrice && Number(form.price) > 0
      ? ((Number(form.price) - Number(form.costPrice)) / Number(form.price)) * 100
      : null;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-4 rounded-[2px] border border-[var(--border)] bg-[var(--surface)] px-4 py-[14px] md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/vendor/products" aria-label="Back to products" className="mt-1 text-[var(--ink-muted)] hover:text-[var(--ink)]">
            <ArrowLeft size={16} />
          </Link>
          <div className="flex flex-col gap-[3px]">
            <h2 className="font-display text-[20px] font-semibold leading-tight text-[var(--ink)]">
              {isCreate ? "New product" : form.name || "Product"}
            </h2>
            <p className="font-body text-[11px] text-[var(--ink-muted)]">
              {isCreate ? "Add a product to your shop." : `SKU ${product?.sku} · updated ${new Date(product!.updatedAt).toLocaleString()}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {product && (
            <>
              <Btn onClick={toggleArchive}>
                {product.archivedAt ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                {product.archivedAt ? "Unarchive" : "Archive"}
              </Btn>
              <Btn variant="danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={13} /> Delete
              </Btn>
            </>
          )}
          <Btn variant="dark" onClick={save} disabled={saving || removed}>
            <Save size={13} /> {saving ? "Saving…" : isCreate ? "Create product" : "Save changes"}
          </Btn>
        </div>
      </div>

      {product && product.moderationStatus !== "APPROVED" && (
        <div
          role="status"
          className={`rounded-[2px] border px-4 py-3 font-body text-[12px] leading-[1.6] text-[var(--ink)] ${
            product.moderationStatus === "PENDING_REVIEW"
              ? "border-[var(--gold)] bg-[var(--warning-bg)]"
              : "border-[var(--danger)] bg-[var(--danger-bg)]"
          }`}
        >
          <strong>
            {product.moderationStatus === "PENDING_REVIEW"
              ? "In review. "
              : product.moderationStatus === "REJECTED"
                ? "Rejected. "
                : "Removed. "}
          </strong>
          {MODERATION_HELP[product.moderationStatus]}
          {product.moderationReason && product.moderationStatus !== "PENDING_REVIEW" && (
            <span className="mt-1 block">
              <strong>Reason from the marketplace:</strong> {product.moderationReason}
            </span>
          )}
        </div>
      )}

      {formError && (
        <p role="alert" className="rounded-[2px] border border-[var(--danger)] bg-[var(--danger-bg)] px-4 py-3 font-body text-[12px] text-[var(--danger)]">
          {formError}
        </p>
      )}

      <fieldset disabled={removed} className="grid min-w-0 grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.7fr)_1fr]">
        <div className="flex min-w-0 flex-col gap-[18px]">
          <Panel title="Product details" subtitle="What customers see on the product page.">
            <TextField
              label="NAME"
              name="name"
              value={form.name}
              error={errors.name}
              placeholder="Sidr Mountain Honey 500 g"
              onChange={(v) => {
                set("name", v);
                if (!slugTouched) set("slug", slugify(v));
              }}
            />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="SKU" name="sku" value={form.sku} error={errors.sku} help="Unique within your shop" onChange={(v) => set("sku", v)} />
              <TextField label="BARCODE (OPTIONAL)" name="barcode" value={form.barcode ?? ""} error={errors.barcode} help="GTIN / EAN — lets customers compare sellers" onChange={(v) => set("barcode", v)} />
            </div>
            <TextField
              label="SHORT DESCRIPTION"
              name="shortDescription"
              value={form.shortDescription ?? ""}
              error={errors.shortDescription}
              placeholder="500 g · Raw & unfiltered"
              onChange={(v) => set("shortDescription", v)}
            />
            <TextField
              label="DESCRIPTION"
              name="description"
              textarea
              rows={7}
              value={form.description ?? ""}
              error={errors.description}
              onChange={(v) => set("description", v)}
            />
          </Panel>

          <Panel title="Images" subtitle="The first image is the main thumbnail. JPG, PNG, WEBP or GIF up to 5 MB, 10 per upload.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {existingImages.map((img, i) => (
                <div key={img.id} className="relative aspect-square overflow-hidden rounded-[2px] border border-[var(--border)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  {i === 0 && (
                    <span className="absolute left-2 top-2">
                      <GoldBadge className="bg-[#0A0A0BE6]">MAIN</GoldBadge>
                    </span>
                  )}
                </div>
              ))}
              {images.map((file, i) => (
                <div key={`${file.name}-${i}`} className="relative aspect-square overflow-hidden rounded-[2px] border border-dashed border-[var(--gold)]">
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
                    UPLOADS ON SAVE
                  </span>
                </div>
              ))}
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
                  if (dropped.length) setImages((prev) => [...prev, ...dropped].slice(0, 10));
                }}
                className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-2 rounded-[2px] border border-dashed border-[var(--border-strong)] bg-[var(--admin-bg)] transition hover:border-[var(--gold)]"
              >
                <ImagePlus size={18} className="text-[var(--ink-muted)]" />
                <span className="font-body text-[11px] font-semibold text-[var(--ink)]">Add images</span>
                <span className="font-body text-[10px] text-[var(--ink-muted)]">
                  {images.length ? `${images.length} queued` : "or drop files"}
                </span>
                <input
                  type="file"
                  name="images"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    // Copy the files out BEFORE clearing the input: the state
                    // updater runs later, after the FileList has been emptied.
                    const picked = Array.from(e.target.files ?? []);
                    setImages((prev) => [...prev, ...picked].slice(0, 10));
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            {errors.images && <span className="font-body text-[10.5px] text-[var(--danger)]">{errors.images}</span>}
          </Panel>

          <Panel title="Pricing">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <TextField label="PRICE" name="price" type="number" prefix="$" value={form.price} error={errors.price} onChange={(v) => set("price", v)} />
              <TextField label="COMPARE-AT PRICE" name="compareAtPrice" type="number" prefix="$" value={form.compareAtPrice ?? ""} error={errors.compareAtPrice} help="Optional — shown struck through" onChange={(v) => set("compareAtPrice", v)} />
              <TextField label="COST PER ITEM" name="costPrice" type="number" prefix="$" value={form.costPrice ?? ""} error={errors.costPrice} help="Optional — never shown to customers" onChange={(v) => set("costPrice", v)} />
            </div>
            {margin !== null && (
              <p className="font-body text-[11.5px] text-[var(--ink-muted)]">
                Profit {money(Number(form.price) - Number(form.costPrice))} per item ·{" "}
                <span className={margin >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"}>{margin.toFixed(1)}% margin</span>{" "}
                before marketplace commission.
              </p>
            )}
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-[18px]">
          <Panel title="Visibility">
            <Toggle
              name="Published"
              note="Off keeps it as a draft only you can see"
              checked={form.isActive}
              onChange={(v) => set("isActive", v)}
            />
            {product && (
              <div className="flex flex-col gap-2 rounded-[2px] border border-[var(--border)] px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-body text-[11.5px] text-[var(--ink-muted)]">Listing</span>
                  <ListingBadge product={product} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-body text-[11.5px] text-[var(--ink-muted)]">Marketplace review</span>
                  <ModerationBadge status={product.moderationStatus} />
                </div>
                {product.moderationReason && product.moderationStatus !== "PENDING_REVIEW" && (
                  <p className="font-body text-[11px] leading-[1.5] text-[var(--danger)]">
                    Reason: {product.moderationReason}
                  </p>
                )}
                <p className="font-body text-[10.5px] leading-[1.5] text-[var(--ink-muted)]">
                  {product.archivedAt
                    ? "Archived products are hidden and unpublished. Unarchive to edit and publish again."
                    : MODERATION_HELP[product.moderationStatus]}
                </p>
              </div>
            )}
          </Panel>

          <Panel title="Organisation">
            <SelectField
              label="CATEGORY"
              name="categoryId"
              value={form.categoryId}
              error={errors.categoryId}
              placeholder={categories === null ? "Loading categories…" : "Choose a category"}
              onChange={(v) => set("categoryId", v)}
              options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
            />
            <SelectField
              label="BRAND (OPTIONAL)"
              name="brandId"
              value={form.brandId ?? ""}
              error={errors.brandId}
              placeholder="No brand"
              onChange={(v) => set("brandId", v)}
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
            />
            <TextField
              label="URL HANDLE"
              name="slug"
              value={form.slug}
              error={errors.slug}
              help="Used in the product's web address. Must be unique across the marketplace."
              onChange={(v) => {
                setSlugTouched(true);
                set("slug", v);
              }}
            />
          </Panel>
        </div>
      </fieldset>

      {confirmDelete && product && (
        <ConfirmDialog
          isOpen
          title="Delete product"
          message={`Delete “${product.name}”?\n\nOnly products that have never been ordered can be deleted — otherwise archive it instead.`}
          onConfirm={remove}
          onClose={() => setConfirmDelete(false)}
        />
      )}
    </div>
  );
}
