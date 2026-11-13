'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Brand, createBrand, updateBrand } from "@/services/brand.service";
import TextInput from "@/components/admin/common/form/TextInput";
import { generateSlug } from "@/lib/utils";

type Props = {
  brand?: Brand | null;
  onSuccess: () => void;
  onCancel?: () => void;
};

const initialState = {
  name: "",
  slug: "",
  description: "",
};

export default function BrandForm({ brand, onSuccess, onCancel }: Props) {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        slug: brand.slug,
        description: brand.description ?? "",
      });
    } else {
      setFormData(initialState);
    }
  }, [brand]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setErrors({});

      if (brand) {
        await updateBrand(brand.id, formData);
        toast.success("Brand updated successfully");
      } else {
        await createBrand(formData);
        toast.success("Brand created successfully");
      }

      setFormData(initialState);
      onSuccess();
    } catch (error: any) {
      setErrors(error.errors || {});
      toast.error(error.message);
    }
  };

  return (
    <form className="space-y-4 p-5" onSubmit={handleSubmit}>
      <TextInput
        label="Name"
        name="name"
        value={formData.name}
        placeholder="Enter brand name"
        error={errors.name}
        onChange={(e) =>
          setFormData({
            ...formData,
            name: e.target.value,
            slug: generateSlug(e.target.value),
          })
        }
      />

      <TextInput
        label="Description"
        name="description"
        value={formData.description}
        placeholder="Enter brand description"
        error={errors.description}
        onChange={(e) =>
          setFormData({
            ...formData,
            description: e.target.value,
          })
        }
      />

      <div className="flex justify-end gap-3">
        {brand && (
          <button type="button" onClick={onCancel} className="rounded-[2px] border px-4 py-2">
            Cancel
          </button>
        )}

        <button className="rounded-[2px] bg-slate-600 px-4 py-2 text-white">
          {brand ? "Update Brand" :"Save Brand"}
        </button>
      </div>
    </form>
  );
}
