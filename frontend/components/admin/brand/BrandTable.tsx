'use client';
import { Brand } from "@/services/brand.service";

type Props = {
  brands: Brand[];
  onEdit: (brand: Brand) => void;
  onDelete: (brand: Brand) => void;
};

export default function BrandTable({ brands, onEdit, onDelete }: Props) {
  return (
    <table className="min-w-full divide-y divide-[var(--border)] text-sm">
      <thead className="bg-[var(--admin-bg)] text-left font-body text-[9.5px] font-bold uppercase tracking-[1.1px] text-[var(--ink-muted)]">
        <tr>
          <th className="px-4 py-3">Brand Name</th>
          <th className="px-4 py-3">Slug</th>
          <th className="px-4 py-3">Description</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
        {brands.length === 0 ? (
          <tr>
            <td colSpan={4} className="px-4 py-8 text-center text-[var(--ink-muted)]">
              No brands found.
            </td>
          </tr>
        ) : (
          brands.map((brand) => (
            <tr key={brand.id} className="hover:bg-[var(--admin-bg)]/80">
              <td className="px-4 py-4 font-medium text-[var(--ink)]">{brand.name}</td>

              <td className="px-4 py-4 text-[var(--ink-muted)]">{brand.slug}</td>

              <td className="px-4 py-4 text-[var(--ink-muted)]">{brand.description || "-"}</td>

              <td className="px-4 py-4">
                <button
                  type="button"
                  onClick={() => onEdit(brand)}
                  className="text-[var(--info)] hover:text-blue-800 cursor-pointer"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(brand)}
                  className="ml-4 text-[var(--danger)] hover:text-red-800 cursor-pointer"
                >
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
