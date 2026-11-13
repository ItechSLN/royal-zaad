'use client';

import { useState } from "react";
import { Activity, FileCheck, ShieldAlert, UserX } from "lucide-react";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import { useAdminResource } from "@/hooks/useAdminResource";
import { auditLogApi } from "@/services/admin-resource.service";
import { fromAuditEvent } from "@/lib/admin-adapters";

type AuditRow = ReturnType<typeof fromAuditEvent>;


const TABS = ["All", "Writes", "Auth", "Permissions", "Failures"];
const TONE: Record<string, Tone> = { Success: "success", Blocked: "danger" };

export default function AuditLogPage() {
  const [tab, setTab] = useState("All");

  const events = useAdminResource({
    resource: auditLogApi,
    fallback: [] as AuditRow[],
    adapt: fromAuditEvent,
    params: { limit: 100 },
  });

  const failed = !events.loading && !events.live;
  const failures = events.rows.filter((e) => e.result !== "Success").length;
  const permissionChanges = events.rows.filter(
    (e) => e.action.includes("permission") || e.action.startsWith("role.")
  ).length;
  const signInFailures = events.rows.filter(
    (e) => e.action.startsWith("auth.") && e.result !== "Success"
  ).length;

  const rows = events.rows.filter((e) => {
    if (tab === "All") return true;
    if (tab === "Auth") return e.action.startsWith("auth.");
    if (tab === "Permissions") return e.action.includes("permission") || e.action.startsWith("role.");
    if (tab === "Failures") return e.result !== "Success";
    return !e.action.startsWith("auth.");
  });

  return (
    <AdminScreen
      title="Audit Log"
      subtitle="Record of privileged actions · only an Admin can amend or remove entries."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      kpis={[
        { label: "Events recorded", value: String(events.meta.total), icon: Activity, note: `latest ${events.rows.length} shown` },
        { label: "Failed sign-ins", value: String(signInFailures), icon: UserX, note: "in the events shown" },
        { label: "Permission changes", value: String(permissionChanges), icon: ShieldAlert, note: "in the events shown" },
        { label: "Blocked actions", value: String(failures), icon: FileCheck, note: "in the events shown" },
      ]}
    >
      <Card>
        <PanelHeading title="Event stream" subtitle="Newest first" />
        <Table>
          <THead>
            <tr>
              <TH>Time</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Object</TH>
              <TH>Source</TH>
              <TH align="right">Result</TH>
              <TH align="right">Event ID</TH>
            </tr>
          </THead>
          <TBody>
            {events.loading && events.rows.length === 0 ? (
              <EmptyRow colSpan={7}>Loading events…</EmptyRow>
            ) : failed ? (
              <EmptyRow colSpan={7}>
                Unable to load the audit log.{" "}
                <button type="button" onClick={() => events.refresh()} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7}>No events match this filter.</EmptyRow>
            ) : (
              rows.map((e, i) => (
                <TR key={e.id} highlight={i === 0}>
                  <TD mono>{e.time}</TD>
                  <TD strong>
                    {e.actor}
                    <span className="ml-2 font-body text-[10px] font-normal text-[var(--ink-muted)]">
                      {e.role}
                    </span>
                  </TD>
                  <TD mono>{e.action}</TD>
                  <TD>
                    {e.detail}
                    <span className="block font-body text-[10px] text-[var(--ink-muted)]">{e.object}</span>
                  </TD>
                  <TD mono>{e.source}</TD>
                  <TD align="right">
                    <StatusBadge tone={TONE[e.result] ?? "neutral"}>{e.result}</StatusBadge>
                  </TD>
                  <TD align="right" mono>{e.id}</TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

      </Card>
    </AdminScreen>
  );
}
