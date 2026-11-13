'use client';

import { Coupon } from "@/services/coupon.service";

type Props = {
  coupons: Coupon[];
  onEdit: (coupon: Coupon) => void;
  onDelete: (coupon: Coupon) => void;
};

export default function CouponTable({ coupons, onEdit, onDelete }: Props) {
  return (
    <table className="min-w-full divide-y divide-[var(--border)] text-sm">
      <thead className="bg-[var(--admin-bg)] text-left font-body text-[9.5px] font-bold uppercase tracking-[1.1px] text-[var(--ink-muted)]">
        <tr>
          <th className="px-4 py-3">Code</th>
          <th className="px-4 py-3">Discount</th>
          <th className="px-4 py-3">Usage</th>
          <th className="px-4 py-3">Expires</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
        {coupons.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-muted)]">
              No coupons found.
            </td>
          </tr>
        ) : (
          coupons.map((coupon) => (
            <tr key={coupon.id} className="hover:bg-[var(--admin-bg)]/80">
              <td className="px-4 py-4 font-medium text-[var(--ink)]">{coupon.code}</td>
              <td className="px-4 py-4 text-[var(--ink-muted)]">
                {coupon.discountType === "PERCENTAGE" ? `${coupon.discountValue}%` : `$${coupon.discountValue}`}
              </td>
              <td className="px-4 py-4 text-[var(--ink-muted)]">
                {coupon.usageCount}{coupon.usageLimit !== null ? ` / ${coupon.usageLimit}` :""}
              </td>
              <td className="px-4 py-4 text-[var(--ink-muted)]">
                {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString(): "—"}
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  coupon.isActive ? "bg-[var(--success-bg)] text-[var(--success)]" :"bg-[var(--danger-bg)] text-[var(--danger)]"
                }`}>
                  {coupon.isActive ? "Active" :"Inactive"}
                </span>
              </td>
              <td className="px-4 py-4">
                <button type="button" onClick={() => onEdit(coupon)} className="text-[var(--info)] hover:text-blue-800 cursor-pointer">
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(coupon)} className="ml-4 text-[var(--danger)] hover:text-red-800 cursor-pointer">
                  Delete
                </button>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
