'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createPromotion, updatePromotion, Promotion, PromotionFormData } from "@/services/promotion.service";
import { getProducts, Product } from "@/services/product.service";
import TextInput from "@/components/admin/common/form/TextInput";
import SelectInput from "@/components/admin/common/form/SelectInput";
import Checkbox from "@/components/admin/common/form/Checkbox";

type Props = {
  promotion?: Promotion | null;
  onSuccess: () => void;
  onCancel?: () => void;
};

const initialState: PromotionFormData = {
  name: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  startsAt: "",
  endsAt: "",
  isActive: true,
  productIds: [],
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10): "");

export default function PromotionForm({ promotion, onSuccess, onCancel }: Props) {
  const [formData, setFormData] = useState<PromotionFormData>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    getProducts(1, 100)
      .then((res) => setProducts(res.data))
      .catch(() => toast.error("Unable to load products for promotion targeting."));
  }, []);

  useEffect(() => {
    if (promotion) {
      setFormData({
        name: promotion.name,
        description: promotion.description ?? "",
        discountType: promotion.discountType,
        discountValue: promotion.discountValue,
        startsAt: toDateInput(promotion.startsAt),
        endsAt: toDateInput(promotion.endsAt),
        isActive: promotion.isActive,
        productIds: promotion.products.map((p) => p.id),
      });
    } else {
      setFormData(initialState);
    }
  }, [promotion]);

  const toggleProduct = (productId: string) => {
    setFormData((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      if (promotion) {
        await updatePromotion(promotion.id, formData);
        toast.success("Promotion updated successfully");
      } else {
        await createPromotion(formData);
        toast.success("Promotion created successfully");
      }

      setFormData(initialState);
      onSuccess();
    } catch (error: any) {
      setErrors(error.errors || {});
      toast.error(error?.message || "An error occurred while saving the promotion.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4 p-5" onSubmit={handleSubmit}>
      <TextInput
        label="Name"
        name="name"
        value={formData.name}
        placeholder="e.g. Summer Sale"
        error={errors.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <TextInput
        label="Description"
        name="description"
        value={formData.description}
        placeholder="Optional"
        error={errors.description}
        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
      />

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="w-full lg:w-1/2">
          <SelectInput
            label="Discount Type"
            name="discountType"
            value={formData.discountType}
            options={[
              { value: "PERCENTAGE", label: "Percentage" },
              { value: "FIXED_AMOUNT", label: "Fixed Amount" },
            ]}
            error={errors.discountType}
            onChange={(e) => setFormData({ ...formData, discountType: e.target.value as PromotionFormData["discountType"] })}
          />
        </div>
        <div className="w-full lg:w-1/2">
          <TextInput
            label={formData.discountType === "PERCENTAGE" ? "Discount (%)" :"Discount Amount"}
            name="discountValue"
            type="number"
            value={formData.discountValue}
            placeholder="0"
            error={errors.discountValue}
            onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="w-full lg:w-1/2">
          <TextInput
            label="Starts At"
            name="startsAt"
            type="date"
            value={formData.startsAt}
            error={errors.startsAt}
            onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
          />
        </div>
        <div className="w-full lg:w-1/2">
          <TextInput
            label="Ends At"
            name="endsAt"
            type="date"
            value={formData.endsAt}
            error={errors.endsAt}
            onChange={(e) => setFormData({ ...formData, endsAt: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-sm font-medium text-[var(--ink)]">Applies to Products</span>
        <div className="max-h-48 overflow-y-auto rounded-[2px] border border-[var(--border-strong)] p-3 space-y-2">
          {products.length === 0 ? (
            <p className="font-body text-[11.5px] text-[var(--ink-muted)]">No products available.</p>
          ) : (
            products.map((product) => (
              <Checkbox
                key={product.id}
                label={`${product.name} (${product.sku})`}
                name={`product-${product.id}`}
                checked={formData.productIds.includes(product.id)}
                onChange={() => toggleProduct(product.id)}
              />
            ))
          )}
        </div>
        {errors.productIds && <p className="text-sm text-[var(--danger)]">{errors.productIds}</p>}
      </div>

      <Checkbox
        label="Promotion Active? "
        name="isActive"
        checked={formData.isActive}
        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
      />

      <div className="flex justify-end gap-3">
        {promotion && (
          <button type="button" onClick={onCancel} className="rounded-[2px] border px-4 py-2">
            Cancel
          </button>
        )}

        <button type="submit" disabled={submitting} className="rounded-[2px] bg-slate-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "Saving..." : promotion ? "Update Promotion" :"Save Promotion"}
        </button>
      </div>
    </form>
  );
}
