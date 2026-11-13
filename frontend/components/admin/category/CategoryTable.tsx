'use client';
import { Category } from "@/services/category.service";

type Props = {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
};

export default function CategoryTable({
  categories,
  onEdit,
  onDelete,
}: Props) {
  return (
    <table className="min-w-full divide-y divide-[var(--border)] text-sm">
      <thead className="bg-[var(--admin-bg)] text-left font-body text-[9.5px] font-bold uppercase tracking-[1.1px] text-[var(--ink-muted)]">
        <tr>
          <th className="px-4 py-3">Category Name</th>
          <th className="px-4 py-3">Description</th>
          <th className="px-4 py-3">Actions</th>
        </tr>
      </thead>

      <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
        {categories.length === 0 ? (
          <tr>
            <td
              colSpan={3}
              className="px-4 py-8 text-center text-[var(--ink-muted)]"
            >
              No categories found.
            </td>
          </tr>
        ) : (
          categories.map((category) => (
            <tr key={category.id} className="hover:bg-[var(--admin-bg)]/80">
              <td className="px-4 py-4 font-medium text-[var(--ink)]">
                {category.name}
              </td>

              <td className="px-4 py-4 text-[var(--ink-muted)]">
                {category.description || "-"}
              </td>

              <td className="px-4 py-4">
                <button type="button" onClick={() => onEdit(category)} className="text-[var(--info)] hover:text-blue-800 cursor-pointer">
                  Edit
                </button>

                <button type="button" onClick={() => onDelete(category)} className="ml-4 text-[var(--danger)] hover:text-red-800 cursor-pointer">
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