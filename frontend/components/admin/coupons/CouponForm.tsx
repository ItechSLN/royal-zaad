'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createCoupon, updateCoupon, Coupon, CouponFormData } from "@/services/coupon.service";
import TextInput from "@/components/admin/common/form/TextInput";
import SelectInput from "@/components/admin/common/form/SelectInput";
import Checkbox from "@/components/admin/common/form/Checkbox";

type Props = {
  coupon?: Coupon | null;
  onSuccess: () => void;
  onCancel?: () => void;
};

const initialState: CouponFormData = {
  code: "",
  description: "",
  discountType: "PERCENTAGE",
  discountValue: "",
  minimumPurchase: "",
  usageLimit: "",
  startsAt: "",
  expiresAt: "",
  isActive: true,
};

const toDateInput = (value?: string | null) => (value ? value.slice(0, 10): "");

export default function CouponForm({ coupon, onSuccess, onCancel }: Props) {
  const [formData, setFormData] = useState<CouponFormData>(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code,
        description: coupon.description ?? "",
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumPurchase: coupon.minimumPurchase ?? "",
        usageLimit: coupon.usageLimit !== null ? String(coupon.usageLimit): "",
        startsAt: toDateInput(coupon.startsAt),
        expiresAt: toDateInput(coupon.expiresAt),
        isActive: coupon.isActive,
      });
    } else {
      setFormData(initialState);
    }
  }, [coupon]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    try {
      if (coupon) {
        await updateCoupon(coupon.id, formData);
        toast.success("Coupon updated successfully");
      } else {
        await createCoupon(formData);
        toast.success("Coupon created successfully");
      }

      setFormData(initialState);
      onSuccess();
    } catch (error: any) {
      setErrors(error.errors || {});
      toast.error(error?.message || "An error occurred while saving the coupon.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-4 p-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-3 lg:flex-row">
        <div className="w-full lg:w-1/2">
          <TextInput
            label="Code"
            name="code"
            value={formData.code}
            placeholder="e.g. SAVE10"
            error={errors.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />
        </div>
        <div className="w-full lg:w-1/2">
          <TextInput
            label="Description"
            name="description"
            value={formData.description}
            placeholder="Enter description"
            error={errors.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </div>

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
            onChange={(e) => setFormData({ ...formData, discountType: e.target.value as CouponFormData["discountType"] })}
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
            label="Minimum Purchase"
            name="minimumPurchase"
            type="number"
            value={formData.minimumPurchase}
            placeholder="Optional"
            error={errors.minimumPurchase}
            onChange={(e) => setFormData({ ...formData, minimumPurchase: e.target.value })}
          />
        </div>
        <div className="w-full lg:w-1/2">
          <TextInput
            label="Usage Limit"
            name="usageLimit"
            type="number"
            value={formData.usageLimit}
            placeholder="Optional"
            error={errors.usageLimit}
            onChange={(e) => setFormData({ ...formData, usageLimit: e.target.value })}
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
            label="Expires At"
            name="expiresAt"
            type="date"
            value={formData.expiresAt ?? ""}
            placeholder="Optional"
            error={errors.expiresAt}
            onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
          />
        </div>
      </div>

      <Checkbox
        label="Coupon Active? "
        name="isActive"
        checked={formData.isActive}
        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
      />

      <div className="flex justify-end gap-3">
        {coupon && (
          <button type="button" onClick={onCancel} className="rounded-[2px] border px-4 py-2">
            Cancel
          </button>
        )}

        <button type="submit" disabled={submitting} className="rounded-[2px] bg-slate-600 px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "Saving..." : coupon ? "Update Coupon" :"Save Coupon"}
        </button>
      </div>
    </form>
  );
}
