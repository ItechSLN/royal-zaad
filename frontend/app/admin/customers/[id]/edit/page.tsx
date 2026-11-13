'use client';

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import TextInput from "@/components/admin/common/form/TextInput";
import Card from "@/components/admin/common/Card";

import { getCustomerById, updateCustomer, CustomerFormData } from "@/services/customer.service";

const initialFormData: CustomerFormData = {
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
};

export default function EditCustomerPage() {
    const params = useParams();
    const router = useRouter();
    const customerId = params.id as string;

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState<CustomerFormData>(initialFormData);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchCustomer = async (id: string) => {
        try {
            const customer = await getCustomerById(id);
            setFormData({
                email: customer.email,
                firstName: customer.firstName,
                lastName: customer.lastName,
                phone: customer.phone ?? "",
            });
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while fetching the customer.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        try {
            await updateCustomer(customerId, formData);
            toast.success("Customer updated successfully.");
            router.push("/admin/customers");
        } catch (error: any) {
            setErrors(error.errors || {});
            toast.error(error?.message || "An error occurred while updating the customer.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (customerId) {
            fetchCustomer(customerId);
        }
    }, [customerId]);

    if (loading) {
        return <div className="p-10 font-body text-[11.5px] text-[var(--ink-muted)]">Loading customer...</div>;
    }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="font-display text-[28px] font-semibold leading-tight text-[var(--ink)]">Edit Customer</p>
                <p className="mt-1 font-body text-[11.5px] text-[var(--ink-muted)]">
                    Edit an existing customer within the admin dashboard.
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
                        placeholder="Enter first name"
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
                        placeholder="Enter last name"
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
                        placeholder="Enter email"
                        value={formData.email}
                        error={errors.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                    </div>
                    <div className="w-full lg:w-1/2">
                        <TextInput
                        label="Phone"
                        name="phone"
                        type="text"
                        placeholder="Enter phone number"
                        value={formData.phone}
                        error={errors.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        />
                    </div>
                </div>

                <button
                type="submit"
                disabled={submitting}
                className="w-50 rounded-[2px] bg-[var(--ink)] px-4 py-3 text-sm font-medium text-[var(--cream)] transition hover:-translate-y-0.5 hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-50"
                >
                {submitting ? "Saving..." :"Save Changes"}
                </button>
            </form>
        </div>
      </Card>

      <div className="flex mt-5 p-6 sm:p-10 xl:p-12">
        <Link href="/admin/customers" className="text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--ink)]">
            <p>&larr; Back to Customers</p>
        </Link>
    </div>
    </div>
  );
}
