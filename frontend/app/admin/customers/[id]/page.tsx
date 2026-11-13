'use client';

import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getCustomerById, Customer } from "@/services/customer.service";

export default function CustomerViewPage() {
    const [customer, setCustomer] = useState<Customer | null>(null);
    const params = useParams();
    const customerId = params.id as string;

    const fetchCustomer = async (id: string) => {
        try {
            const data = await getCustomerById(id);
            setCustomer(data);
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while fetching the customer.");
        }
    };

    useEffect(() => {
        if (customerId) {
            fetchCustomer(customerId);
        }
    }, [customerId]);

    if (!customer) {
        return <div className="p-10 font-body text-[11.5px] text-[var(--ink-muted)]">Loading...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end justify-between">
                <div>
                    <Link href="/admin/customers" className="text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--ink)]">
                        <p>&larr; Back to customers</p>
                    </Link>
                </div>
                <div>
                    <Link href={`/admin/customers/${customer.id}/edit`} className="rounded-[2px] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--cream)] transition hover:-translate-y-0.5 hover:bg-[var(--charcoal)]">
                        Edit Customer
                    </Link>
                </div>
            </div>

            <div className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-8">
                <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
                    <div className="flex flex-col items-center lg:w-52">
                        <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[var(--ink)] text-3xl font-bold text-[var(--cream)]">
                            {customer.firstName.charAt(0).toUpperCase()}{customer.lastName.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-[var(--ink)]">
                            {customer.firstName} {customer.lastName}
                        </h1>

                        <p className="mt-2 text-[var(--ink-muted)]">{customer.email}</p>

                        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                            <div>
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Email</p>
                                <p className="font-medium">{customer.email}</p>
                            </div>

                            <div>
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Phone</p>
                                <p className="font-medium">{customer.phone ?? "—"}</p>
                            </div>
                        </div>

                        <div className="mt-8">
                            <p className="mb-3 font-body text-[11.5px] text-[var(--ink-muted)]">Addresses</p>
                            {customer.addresses.length === 0 ? (
                                <p className="font-body text-[11.5px] text-[var(--ink-muted)]">No addresses on file.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    {customer.addresses.map((address) => (
                                        <div key={address.id} className="rounded-[2px] border border-[var(--border)] p-4 text-sm">
                                            <p className="font-medium text-[var(--ink)]">
                                                {address.recipientName}
                                                {address.isDefault && (
                                                    <span className="ml-2 rounded-full bg-[var(--success-bg)] px-2 py-0.5 text-xs font-semibold text-[var(--success)]">
                                                        Default
                                                    </span>
                                                )}
                                            </p>
                                            <p className="mt-1 text-[var(--ink-muted)]">{address.line1}</p>
                                            {address.line2 && <p className="text-[var(--ink-muted)]">{address.line2}</p>}
                                            <p className="text-[var(--ink-muted)]">
                                                {address.city}{address.state ? `, ${address.state}` :""} {address.postalCode}
                                            </p>
                                            <p className="text-[var(--ink-muted)]">{address.country}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
