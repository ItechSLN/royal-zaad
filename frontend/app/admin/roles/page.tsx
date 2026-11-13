'use client';

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { ROLE_FIELDS } from "@/lib/admin-forms";
import {
  createRole,
  deleteRole,
  getRoles,
  updateRole,
} from "@/services/role.service";
import { getUsers } from "@/services/users.service";
import { toast } from "sonner";

type Role = { id: string; name: string; description?: string };

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<{ role: { id: string } }[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Role | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [roleData, userData] = await Promise.all([
        getRoles(),
        getUsers(1, 100).catch(() => null),
      ]);
      setRoles((roleData ?? []) as Role[]);
      setMembers((userData?.data ?? []) as never);
      setLoadError(null);
    } catch (error: any) {
      setLoadError(error?.message ?? "Unable to load roles.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const memberCount = (roleId: string) =>
    members.filter((u) => u.role?.id === roleId).length;

  const submit = async (values: EntityValues) => {
    const payload = {
      name: String(values.name),
      description: String(values.description ?? ""),
    };

    try {
      if (editing) await updateRole(editing.id, payload);
      else await createRole(payload);
      await refresh();
      toast.success(editing ? "Role updated." : "Role created.");
      return true;
    } catch (error: any) {
      toast.error(Object.values<string>(error?.errors ?? {})[0] ?? error?.message ?? "Unable to save the role.");
      return false;
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRole(pendingDelete.id);
      await refresh();
      toast.success("Role deleted.");
    } catch (error: any) {
      // Refused while users are still assigned to it.
      toast.error(error?.message ?? "Unable to delete the role.");
    }
    setPendingDelete(null);
  };

  const initial: EntityValues | undefined = editing
    ? { name: editing.name, description: editing.description ?? "" }
    : undefined;

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Roles"
        subtitle="Permission sets assigned to staff accounts."
        actions={[
          {
            label: "New role",
            icon: Plus,
            emphasis: true,
            onClick: () => {
              setEditing(null);
              setFormOpen(true);
            },
          },
        ]}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>Role</TH>
              <TH>Description</TH>
              <TH align="right">Members</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && roles.length === 0 ? (
              <EmptyRow colSpan={4}>Loading roles…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={4}>
                {loadError}{" "}
                <button type="button" onClick={refresh} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : roles.length === 0 ? (
              <EmptyRow colSpan={4}>No roles defined.</EmptyRow>
            ) : (
              roles.map((r) => (
                <TR key={r.id}>
                  <TD strong>
                    <span className="inline-flex items-center gap-2">
                      <ShieldCheck size={13} className="text-[var(--gold-deep)]" />
                      {r.name}
                    </span>
                  </TD>
                  <TD>{r.description}</TD>
                  <TD align="right" mono>{memberCount(r.id)}</TD>
                  <TD>
                    <RowMenu
                      actions={[
                        {
                          label: "Edit role",
                          icon: Pencil,
                          onSelect: () => {
                            setEditing(r);
                            setFormOpen(true);
                          },
                        },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(r) },
                      ]}
                    />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      </Card>

      <EntityFormModal
        open={formOpen}
        mode={editing ? "edit" : "create"}
        entity="role"
        fields={ROLE_FIELDS}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete the “${pendingDelete.name}” role?\n\nMembers will lose these permissions.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
