'use client';

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createRole, updateRole, Role } from "@/services/role.service";
import TextInput from "@/components/admin/common/form/TextInput";

type Props = {
  role?: Role | null;
  onSuccess: () => void;
  onCancel?: () => void;
};

const initialState = {
  name: "",
  description: "",
};

export default function RoleForm({
  role,
  onSuccess,
  onCancel,
}: Props) {

  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (role) {
      setFormData({
        name: role.name,
        description: role.description ?? "",
      });
    } else {
      setFormData(initialState);
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      setErrors({});

      if (role) {
        await updateRole(role.id, formData);
        toast.success("Role updated successfully");
      } else {
        await createRole(formData);
        toast.success("Role created successfully");
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
        {role && (
          <button type="button" onClick={onCancel} className="rounded-[2px] border px-4 py-2">
            Cancel
          </button>
        )}

        <button className="rounded-[2px] bg-slate-600 px-4 py-2 text-white">
          {role ? "Update Role" :"Save Role"}
        </button>
      </div>
    </form>
  );
}