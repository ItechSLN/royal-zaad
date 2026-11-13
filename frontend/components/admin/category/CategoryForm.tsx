'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createCategory, updateCategory } from "@/services/category.service";
import TextInput from "@/components/admin/common/form/TextInput";
import { Category } from "@/services/category.service";
import { generateSlug } from "@/lib/utils";


type Props = {
  category?: Category | null;
  onSuccess: () => void;
  onCancel?: () => void;
};

const initialState = {
  name: "",
  slug: "",
  description: "",
};

export default function CategoryForm({
  category,
  onSuccess,
  onCancel,
}: Props) {

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description ?? "",
      });
    } else {
      setFormData(initialState);
    }
  }, [category]);



  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setErrors({});

      if (category) {
        await updateCategory(category.id, formData);
        toast.success("Category updated successfully");
      } else {
        await createCategory(formData);
        toast.success("Category created successfully");
      }

      setFormData(initialState);
      onSuccess();

    } catch (error: any) {
      setErrors(error.errors || {});
      toast.error(error.message);
    }
  };

  return (
    <form className="space-y-4 p-5" onSubmit={handleSubmit} >

        <TextInput
        label="Name"
        name="name"
        value={formData.name}
        placeholder="Enter role name"
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
        placeholder="Enter role description"
        error={errors.description}
        onChange={(e) =>
            setFormData({
            ...formData,
            description: e.target.value,
            })
        }
        />
        <div className="flex justify-end gap-3">
        {category && (
          <button type="button" onClick={onCancel} className="rounded-[2px] border px-4 py-2">
            Cancel
          </button>
        )}

        <button className="rounded-[2px] bg-slate-600 px-4 py-2 text-white">
          {category ? "Update Category" :"Save Category"}
        </button>
      </div>
    </form>
  );
}