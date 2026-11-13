'use client';

import { toast } from "sonner";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getOrderById, updateOrderStatus, markPaymentPaid, Order, OrderStatus } from "@/services/order.service";
import type { OrderVendorBreakdown } from "@/services/marketplace-admin.service";

const fmt = (value: number | string | null | undefined) => `$${Number(value ?? 0).toFixed(2)}`;
const titleCase = (value?: string | null) =>
    value ? value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ") : "—";

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export default function OrderDetailPage() {
    const [order, setOrder] = useState<Order | null>(null);
    const [updating, setUpdating] = useState(false);
    const params = useParams();
    const orderId = params.id as string;

    const fetchOrder = async (id: string) => {
        try {
            const data = await getOrderById(id);
            setOrder(data);
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while fetching the order.");
        }
    };

    useEffect(() => {
        if (orderId) {
            fetchOrder(orderId);
        }
    }, [orderId]);

    const handleStatusChange = async (status: OrderStatus) => {
        if (!order) return;
        setUpdating(true);
        try {
            await updateOrderStatus(order.id, status);
            toast.success(`Order marked as ${status}.`);
            fetchOrder(order.id);
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while updating the order.");
        } finally {
            setUpdating(false);
        }
    };

    const handleMarkPaid = async () => {
        if (!order?.payment) return;
        setUpdating(true);
        try {
            await markPaymentPaid(order.payment.id);
            toast.success("Payment marked as paid.");
            fetchOrder(order.id);
        } catch (error: any) {
            toast.error(error?.message || "An error occurred while updating the payment.");
        } finally {
            setUpdating(false);
        }
    };

    if (!order) {
        return <div className="p-10 font-body text-[11.5px] text-[var(--ink-muted)]">Loading...</div>;
    }

    const nextStatuses = ALLOWED_TRANSITIONS[order.status] ?? [];
    const vendorOrders = (order as Order & { vendorOrders?: OrderVendorBreakdown[] }).vendorOrders ?? [];

    return (
        <div className="space-y-6">
            <div className="flex gap-3 border-b border-[var(--border)] pb-5 sm:flex-row sm:items-end justify-between">
                <div>
                    <Link href="/admin/orders" className="text-sm font-medium text-[var(--gold-deep)] hover:text-[var(--ink)]">
                        <p>&larr; Back to orders</p>
                    </Link>
                    <p className="mt-2 font-display text-[28px] font-semibold leading-tight text-[var(--ink)]">{order.orderNumber}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {nextStatuses.map((status) => (
                        <button
                            key={status}
                            disabled={updating}
                            onClick={() => handleStatusChange(status)}
                            className="rounded-[2px] bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--cream)] transition hover:-translate-y-0.5 hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Mark as {status}
                        </button>
                    ))}
                    {order.payment && order.payment.status === "PENDING" && (
                        <button
                            disabled={updating}
                            onClick={handleMarkPaid}
                            className="rounded-[2px] bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Mark Payment Paid
                        </button>
                    )}
                </div>
            </div>

            <div className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-8">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Customer</p>
                        <p className="font-medium">{order.customer.firstName} {order.customer.lastName}</p>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">{order.customer.email}</p>
                    </div>
                    <div>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Order Status</p>
                        <span className="mt-1 inline-flex rounded-full bg-[var(--cream-2)] px-3 py-1 text-sm font-semibold">
                            {order.status}
                        </span>
                    </div>
                    <div>
                        <p className="font-body text-[11.5px] text-[var(--ink-muted)]">Payment Status</p>
                        <span className="mt-1 inline-flex rounded-full bg-[var(--cream-2)] px-3 py-1 text-sm font-semibold">
                            {order.payment?.status ?? "No payment record"}
                        </span>
                    </div>
                </div>

                <div className="mt-8">
                    <p className="mb-3 font-body text-[11.5px] text-[var(--ink-muted)]">Items</p>
                    <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                        <thead className="bg-[var(--admin-bg)] text-left font-body text-[9.5px] font-bold uppercase tracking-[1.1px] text-[var(--ink-muted)]">
                            <tr>
                                <th className="px-4 py-3">Product</th>
                                <th className="px-4 py-3">SKU</th>
                                <th className="px-4 py-3">Qty</th>
                                <th className="px-4 py-3">Unit Price</th>
                                <th className="px-4 py-3">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                            {order.items.map((item) => (
                                <tr key={item.id}>
                                    <td className="px-4 py-3 font-medium text-[var(--ink)]">{item.product.name}</td>
                                    <td className="px-4 py-3 text-[var(--ink-muted)]">{item.product.sku}</td>
                                    <td className="px-4 py-3 text-[var(--ink-muted)]">{item.quantity}</td>
                                    <td className="px-4 py-3 text-[var(--ink-muted)]">${Number(item.unitPrice).toFixed(2)}</td>
                                    <td className="px-4 py-3 text-[var(--ink-muted)]">${Number(item.total).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="mt-6 ml-auto w-full max-w-xs space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-[var(--ink-muted)]">Subtotal</span>
                        <span className="font-medium">${Number(order.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[var(--ink-muted)]">
                            Discount {order.coupon ? `(${order.coupon.code})` :""}
                        </span>
                        <span className="font-medium">-${Number(order.discountTotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[var(--ink-muted)]">Tax</span>
                        <span className="font-medium">${Number(order.taxTotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-[var(--ink-muted)]">Shipping</span>
                        <span className="font-medium">${Number(order.shippingTotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base font-semibold text-[var(--ink)]">
                        <span>Total</span>
                        <span>${Number(order.total).toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {vendorOrders.length > 0 && (
                <div className="rounded-[2px] border border-[var(--border)] bg-[var(--surface)] p-8">
                    <p className="font-display text-[19px] font-semibold text-[var(--ink)]">Per-shop breakdown</p>
                    <p className="mb-4 font-body text-[11px] text-[var(--ink-muted)]">
                        Each shop fulfils its own part of this order; commission is kept by the marketplace.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                            <thead className="bg-[var(--admin-bg)] text-left font-body text-[9.5px] font-bold uppercase tracking-[1.1px] text-[var(--ink-muted)]">
                                <tr>
                                    <th className="px-4 py-3">Shop</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Fulfilment</th>
                                    <th className="px-4 py-3 text-right">Subtotal</th>
                                    <th className="px-4 py-3 text-right">Shipping</th>
                                    <th className="px-4 py-3 text-right">Tax</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right">Commission</th>
                                    <th className="px-4 py-3 text-right">Vendor net</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                                {vendorOrders.map((vo) => (
                                    <tr key={vo.id}>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-[var(--ink)]">{vo.shop?.name ?? "Unknown shop"}</p>
                                            <p className="font-body text-[11px] text-[var(--ink-muted)]">
                                                {[vo.shop?.city, vo.shop?.phone].filter(Boolean).join(" · ") || "—"}
                                            </p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="inline-flex rounded-full bg-[var(--cream-2)] px-3 py-1 text-xs font-semibold">
                                                {vo.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-[var(--ink-muted)]">{titleCase(vo.fulfillmentMethod)}</td>
                                        <td className="px-4 py-3 text-right text-[var(--ink-muted)]">{fmt(vo.subtotal)}</td>
                                        <td className="px-4 py-3 text-right text-[var(--ink-muted)]">{fmt(vo.shippingTotal)}</td>
                                        <td className="px-4 py-3 text-right text-[var(--ink-muted)]">{fmt(vo.taxTotal)}</td>
                                        <td className="px-4 py-3 text-right font-medium text-[var(--ink)]">{fmt(vo.total)}</td>
                                        <td className="px-4 py-3 text-right text-[var(--ink-muted)]">
                                            {fmt(vo.commissionAmount)}
                                            <span className="ml-1 text-xs">({Number(vo.commissionRate)}%)</span>
                                        </td>
                                        <td className="px-4 py-3 text-right font-semibold text-[var(--ink)]">{fmt(vo.vendorNet)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    )
}
