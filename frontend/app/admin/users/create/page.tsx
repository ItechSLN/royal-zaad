'use client';

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { getRoles, Role } from "@/services/role.service";
import { createUser } from "@/services/users.service";

import TextInput from "@/components/admin/common/form/TextInput";
import SelectInput from "@/components/admin/common/form/SelectInput";
import Checkbox from "@/components/admin/common/form/Checkbox";

import Card from "@/components/admin/common/Card";

const initialFormData = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    roleId: "",
    isActive: true,
};

export default function CreateUserPage() {
    const router = useRouter();
    const [roles, setRoles] = useState<Role[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState(initialFormData);
    const [submitting, setSubmitting] = useState(false);

    const fetchRoles = async () => {
        try {
            const rolesData = await getRoles();
            setRoles(rolesData);
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while fetching roles.");
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const userData = {
            firstName: formData.firstName,
            lastName: formData.lastName,
            email: formData.email,
            passwordHash: formData.password,
            roleId: formData.roleId,
            isActive: formData.isActive,
        };

        setSubmitting(true);
        try {
            await createUser(userData);
            toast.success("User created successfully.");
            setFormData(initialFormData);
            setErrors({});
            router.push("/admin/users");
        } catch (error: any) {
            setErrors(error.errors || {});
            toast.error(Object.values<string>(error?.errors ?? {})[0] || error?.message || "An error occurred while creating the user.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="font-display text-[28px] font-semibold leading-tight text-[var(--ink)]">Create User</p>
                <p className="mt-1 font-body text-[11.5px] text-[var(--ink-muted)]">
                    Create a new user account within the admin dashboard.
                </p>
            </div>
        </div>

      <Card>
        <div className="px-10 py-10 border-b border-[var(--border)]">
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="w-full lg:w-1/2">
                        <TextInput
                        label="First Name"
                        name="firstName"
                        type="text"
                        placeholder="Enter your first name"
                        value={formData.firstName}
                        error={errors.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        />
                    </div>

                    <div className="w-full lg:w-1/2">
                        <TextInput
                        label="Last Name"
                        name="lastName"
                        type="text"
                        placeholder="Enter your last name"
                        value={formData.lastName}
                        error={errors.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="w-full lg:w-1/2">
                        <TextInput
                        label="Email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        value={formData.email}
                        error={errors.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="w-full lg:w-1/2">
                        <TextInput
                        label="Password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        value={formData.password}
                        error={errors.passwordHash}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>
                </div>

                <SelectInput
                    label="Role"
                    name="roleId"
                    value={formData.roleId}
                    placeholder="Select Role"
                    options={roles.map((role) => ({ value: role.id, label: role.name }))}
                    error={errors.roleId}
                    onChange={(e) =>
                        setFormData({
                        ...formData,
                        roleId: e.target.value,
                        })
                    }
                />

                <Checkbox
                label="User Account Active? "
                name="isActive"
                checked={formData.isActive}
                onChange={(e) =>
                    setFormData({
                    ...formData,
                    isActive: e.target.checked,
                    })
                }
                />
                <button
                type="submit"
                disabled={submitting}
                className="w-50 rounded-[2px] bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--cream)] transition hover:-translate-y-0.5 hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                {submitting ? "Creating..." :"Create User"}
                </button>
            </form>
        </div>
      </Card>

      <div className="flex mt-5 p-6 sm:p-10 xl:p-12">
        <Link href="/admin/users" className="text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--ink)]">
            <p>&larr; Back to Users</p>
        </Link>
    </div>
    </div>
  );
}
