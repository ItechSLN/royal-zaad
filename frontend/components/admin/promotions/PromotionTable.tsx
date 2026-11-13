'use client';

import { Promotion } from "@/services/promotion.service";

type Props = {
  promotions: Promotion[];
  onEdit: (promotion: Promotion) => void;
  onDelete: (promotion: Promotion) => void;
};

export default function PromotionTable({ promotions, onEdit, onDelete }: Props) {
  return (
    <table className="min-w-full divide-y divide-[var(--border)] text-sm">
      <thead className="bg-[var(--admin-bg)] text-left font-body text-[9.5px] font-bold uppercase tracking-[1.1px] text-[var(--ink-muted)]">
        <tr>
          <th className="px-4 py-3">Name</th>
          <th className="px-4 py-3">Discount</th>
          <th className="px-4 py-3">Products</th>
          <th className="px-4 py-3">Window</th>
          <th className="px-4 py-3">Status</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
        {promotions.length === 0 ? (
          <tr>
            <td colSpan={6} className="px-4 py-8 text-center text-[var(--ink-muted)]">
              No promotions found.
            </td>
          </tr>
        ) : (
          promotions.map((promotion) => (
            <tr key={promotion.id} className="hover:bg-[var(--admin-bg)]/80">
              <td className="px-4 py-4 font-medium text-[var(--ink)]">{promotion.name}</td>
              <td className="px-4 py-4 text-[var(--ink-muted)]">
                {promotion.discountType === "PERCENTAGE" ? `${promotion.discountValue}%` : `$${promotion.discountValue}`}
              </td>
              <td className="px-4 py-4 text-[var(--ink-muted)]">{promotion.products.length}</td>
              <td className="px-4 py-4 text-[var(--ink-muted)]">
                {new Date(promotion.startsAt).toLocaleDateString()} – {new Date(promotion.endsAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                  promotion.isActive ? "bg-[var(--success-bg)] text-[var(--success)]" :"bg-[var(--danger-bg)] text-[var(--danger)]"
                }`}>
                  {promotion.isActive ? "Active" :"Inactive"}
                </span>
              </td>
              <td className="px-4 py-4">
                <button type="button" onClick={() => onEdit(promotion)} className="text-[var(--info)] hover:text-blue-800 cursor-pointer">
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(promotion)} className="ml-4 text-[var(--danger)] hover:text-red-800 cursor-pointer">
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
