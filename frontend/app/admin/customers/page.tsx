'use client';

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Mail, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { TablePagination } from "@/components/admin/common/TableBits";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { CUSTOMER_FIELDS } from "@/lib/admin-forms";
import { money } from "@/lib/admin-adapters";
import {
  createCustomer,
  deleteCustomer,
  getCustomers,
  updateCustomer,
  type Customer,
} from "@/services/customer.service";

type Row = Customer;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Row | null>(null);

  const fetchCustomers = useCallback(async (page: number) => {
    try {
      const res = await getCustomers(page, 20);
      setCustomers(res.data ?? []);
      setMeta(res.meta);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCustomers(1);
  }, [fetchCustomers]);

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (c: Row) => {
    setEditing(c);
    setFormOpen(true);
  };

  const initial: EntityValues | undefined = editing
    ? {
        firstName: editing.firstName,
        lastName: editing.lastName,
        email: editing.email,
        phone: editing.phone ?? "",
        tier: editing.tier ?? "",
        notes: editing.notes ?? "",
      }
    : undefined;

  const handleSubmit = async (values: EntityValues) => {
    const payload = {
      firstName: String(values.firstName),
      lastName: String(values.lastName),
      email: String(values.email),
      phone: String(values.phone ?? ""),
      ...(values.tier ? { tier: String(values.tier) as Customer["tier"] } : {}),
      notes: String(values.notes ?? ""),
    };

    try {
      if (editing) {
        await updateCustomer(editing.id, payload);
      } else {
        await createCustomer(payload);
      }
      await fetchCustomers(meta.page);
    } catch (error: any) {
      toast.error(Object.values<string>(error?.errors ?? {})[0] ?? error?.message ?? "Unable to save the customer.");
      return false;
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCustomer(pendingDelete.id);
      toast.success("Customer deleted.");
      await fetchCustomers(meta.page);
    } catch (error: any) {
      // Refused while the customer has a login or orders on record.
      toast.error(error?.message ?? "Unable to delete the customer.");
    }
    setPendingDelete(null);
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Customers"
        subtitle={`${meta.total} accounts · lifetime value and order history`}
        actions={[
          { label: "New customer", icon: Plus, emphasis: true, onClick: openCreate },
        ]}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Customer</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH align="right">Orders</TH>
              <TH align="right">Lifetime spend</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && customers.length === 0 ? (
              <EmptyRow colSpan={6}>Loading customers…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={6}>
                {loadError}{" "}
                <button type="button" onClick={() => fetchCustomers(meta.page)} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : customers.length === 0 ? (
              <EmptyRow colSpan={6}>No customers found.</EmptyRow>
            ) : (
              customers.map((c) => (
                <TR key={c.id}>
                  <TD strong>
                    <Link href={`/admin/customers/${c.id}`} className="hover:text-[var(--gold-deep)]">
                      {c.firstName} {c.lastName}
                    </Link>
                  </TD>
                  <TD>{c.email}</TD>
                  <TD mono>{c.phone ?? "—"}</TD>
                  <TD align="right" mono>{c.orderCount ?? "—"}</TD>
                  <TD align="right" strong>{c.totalSpend !== undefined ? money(c.totalSpend) : "—"}</TD>
                  <TD>
                    <RowMenu
                      actions={[
                        { label: "View profile", icon: Eye, href: `/admin/customers/${c.id}` },
                        { label: "Edit customer", icon: Pencil, onSelect: () => openEdit(c) },
                        {
                          label: "Email customer",
                          icon: Mail,
                          onSelect: () => {
                            window.location.assign(`mailto:${c.email}`);
                          },
                        },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(c) },
                      ]}
                    />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        <TablePagination
          page={meta.page}
          pageSize={meta.limit}
          total={meta.total}
          onPageChange={fetchCustomers}
          noun="customers"
        />
      </Card>

      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="customer"
        fields={CUSTOMER_FIELDS}
        initial={initial}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSubmit}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete “${pendingDelete.firstName} ${pendingDelete.lastName}”?\n\nThis action cannot be undone.`}
          onConfirm={handleDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
