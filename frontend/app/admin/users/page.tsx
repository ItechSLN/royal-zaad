'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, KeyRound, Pencil, Plus, Trash2, UserX } from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import { StatusBadge } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { deleteUser, getUsers, updateUser, type User } from "@/services/users.service";
import { forgotPassword } from "@/services/storefront-auth.service";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState("All");
  const [pendingDelete, setPendingDelete] = useState<User | null>(null);

  const fetchUsers = useCallback(async (page: number) => {
    try {
      const res = await getUsers(page, 20);
      setUsers(res.data ?? []);
      setMeta(res.meta);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(1);
  }, [fetchUsers]);

  const rows = useMemo(
    () => users.filter((u) => (tab === "All" ? true : tab === "Active" ? u.isActive : !u.isActive)),
    [users, tab]
  );

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteUser(pendingDelete.id);
      toast.success("User deleted.");
      await fetchUsers(meta.page);
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to delete the user.");
    }
    setPendingDelete(null);
  };

  const toggleActive = async (u: User) => {
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? "Account suspended." : "Account reinstated.");
      await fetchUsers(meta.page);
    } catch (error: any) {
      toast.error(error?.errors?.isActive ?? error?.message ?? "Unable to update the account.");
    }
  };

  const sendReset = async (u: User) => {
    try {
      await forgotPassword(u.email);
      toast.success(`Reset link sent to ${u.email}`);
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to send a reset link.");
    }
  };

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Users & roles"
        subtitle="Staff accounts and the permissions attached to them."
        actions={[
          { label: "Manage roles", href: "/admin/roles" },
          { label: "New user", icon: Plus, emphasis: true, href: "/admin/users/create" },
        ]}
      />

      <StatusTabs
        tabs={[
          { label: "All", count: users.length },
          { label: "Active", count: users.filter((u) => u.isActive).length },
          { label: "Suspended", count: users.filter((u) => !u.isActive).length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Role</TH>
              <TH>Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && users.length === 0 ? (
              <EmptyRow colSpan={5}>Loading users…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={5}>
                {loadError}{" "}
                <button type="button" onClick={() => fetchUsers(meta.page)} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={5}>No users in this state.</EmptyRow>
            ) : (
              rows.map((u) => (
                <TR key={u.id}>
                  <TD strong>
                    <Link href={`/admin/users/${u.id}`} className="hover:text-[var(--gold-deep)]">
                      {u.firstName} {u.lastName}
                    </Link>
                  </TD>
                  <TD>{u.email}</TD>
                  <TD>{u.role?.name ?? "—"}</TD>
                  <TD>
                    <StatusBadge tone={u.isActive ? "success" : "danger"}>
                      {u.isActive ? "Active" : "Suspended"}
                    </StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        { label: "View profile", icon: Eye, href: `/admin/users/${u.id}` },
                        { label: "Edit user", icon: Pencil, href: `/admin/users/${u.id}/edit` },
                        {
                          label: "Reset password",
                          icon: KeyRound,
                          onSelect: () => sendReset(u),
                        },
                        {
                          label: u.isActive ? "Suspend account" : "Reinstate account",
                          icon: UserX,
                          onSelect: () => toggleActive(u),
                        },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(u) },
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
          total={meta.total || rows.length}
          onPageChange={fetchUsers}
          noun="users"
        />
      </Card>

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
