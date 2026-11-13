'use client';

import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import TextInput from "@/components/admin/common/form/TextInput";
import Card from "@/components/admin/common/Card";

import { getInventoryById, updateInventory, InventoryFormData } from "@/services/inventory.service";

const initialFormData: InventoryFormData = {
    quantity: 0,
    reserved: 0,
    reorderAt: 0,
};

export default function EditInventoryPage() {
    const params = useParams();
    const router = useRouter();
    const inventoryId = params.id as string;

    const [productLabel, setProductLabel] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [formData, setFormData] = useState(initialFormData);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchInventory = async (id: string) => {
        try {
            const item = await getInventoryById(id);
            setProductLabel(`${item.product.name} (${item.product.sku})`);
            setFormData({
                quantity: item.quantity,
                reserved: item.reserved,
                reorderAt: item.reorderAt,
            });
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while fetching the inventory record.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setErrors({});

        try {
            await updateInventory(inventoryId, formData);
            toast.success("Inventory updated successfully.");
            router.push("/admin/inventory");
        } catch (error: any) {
            setErrors(error.errors || {});
            toast.error(error?.message || "An error occurred while updating inventory.");
        } finally {
            setSubmitting(false);
        }
    };

    useEffect(() => {
        if (inventoryId) {
            fetchInventory(inventoryId);
        }
    }, [inventoryId]);

    if (loading) {
        return <div className="p-10 font-body text-[11.5px] text-[var(--ink-muted)]">Loading inventory...</div>;
    }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
                <p className="font-display text-[28px] font-semibold leading-tight text-[var(--ink)]">Update Inventory</p>
                <p className="mt-1 font-body text-[11.5px] text-[var(--ink-muted)]">
                    {productLabel}
                </p>
            </div>
        </div>

      <Card>
        <div className="px-10 py-10 border-b border-[var(--border)]">
            <form className="space-y-5" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-3 lg:flex-row">
                    <div className="w-full lg:w-1/3">
                        <TextInput
                        label="Quantity"
                        name="quantity"
                        type="number"
                        placeholder="0"
                        value={String(formData.quantity)}
                        error={errors.quantity}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                        />
                    </div>
                    <div className="w-full lg:w-1/3">
                        <TextInput
                        label="Reserved"
                        name="reserved"
                        type="number"
                        placeholder="0"
                        value={String(formData.reserved)}
                        error={errors.reserved}
                        onChange={(e) => setFormData({ ...formData, reserved: Number(e.target.value) })}
                        />
                    </div>
                    <div className="w-full lg:w-1/3">
                        <TextInput
                        label="Reorder At"
                        name="reorderAt"
                        type="number"
                        placeholder="0"
                        value={String(formData.reorderAt)}
                        error={errors.reorderAt}
                        onChange={(e) => setFormData({ ...formData, reorderAt: Number(e.target.value) })}
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
        <Link href="/admin/inventory" className="text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--ink)]">
            <p>&larr; Back to Inventory</p>
        </Link>
    </div>
    </div>
  );
}
