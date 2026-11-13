'use client';

import { useState } from "react";
import {
  BellDot,
  BellPlus,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  Info,
  ListChecks,
  TriangleAlert,
} from "lucide-react";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { useAdminResource } from "@/hooks/useAdminResource";
import {
  alertRulesApi,
  markAllNotificationsRead,
  markNotificationRead,
  notificationsApi,
} from "@/services/admin-resource.service";
import { fromNotification, toAlertRule } from "@/lib/admin-adapters";
import { toast } from "sonner";

type Alert = ReturnType<typeof fromNotification>;

import EntityFormModal from "@/components/admin/form/EntityFormModal";
import { ALERT_RULE_FIELDS } from "@/lib/admin-forms";

const TABS = ["Unread", "Critical", "All"];

const SEVERITY: Record<string, { icon: typeof CircleAlert; tone: Tone; label: string }> = {
  critical: { icon: TriangleAlert, tone: "danger", label: "Critical" },
  warning: { icon: CircleAlert, tone: "warning", label: "Warning" },
  success: { icon: CircleCheck, tone: "success", label: "Resolved" },
  info: { icon: Info, tone: "info", label: "Info" },
};

export default function NotificationsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [tab, setTab] = useState("Unread");

  const alerts = useAdminResource({
    resource: notificationsApi,
    fallback: [] as Alert[],
    adapt: fromNotification,
    params: { limit: 50 },
  });

  const rules = useAdminResource({
    resource: alertRulesApi,
    fallback: [],
    adapt: (r: any) => r,
  });

  // Counts come from the API so they cover every notification, not just this page.
  const unread = Number(alerts.meta.unreadCount ?? alerts.rows.filter((n) => n.unread).length);
  const critical = Number(alerts.meta.criticalCount ?? alerts.rows.filter((n) => n.severity === "critical").length);
  const failed = !alerts.loading && !alerts.live;

  const categories = new Set(
    rules.rows.map((r: any) => r.category).filter(Boolean)
  ).size;

  const createRule = async (values: Record<string, string | boolean>) => {
    return rules.create(toAlertRule(values), "Alert rule");
  };

  const readOne = async (id: string) => {
    try {
      await markNotificationRead(id);
      await alerts.refresh(alerts.meta.page);
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to mark the alert as read.");
    }
  };

  const readAll = async () => {
    try {
      const result = await markAllNotificationsRead();
      await alerts.refresh();
      toast.success(`${result.count} alert(s) marked read.`);
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to mark alerts as read.");
    }
  };

  const tabLabels = [`Unread ${unread}`, `Critical ${critical}`, "All"];
  const labelFor = (t: string) => tabLabels[TABS.indexOf(t)] ?? "All";

  const rows = alerts.rows.filter((n) =>
    tab === "All" ? true : tab === "Critical" ? n.severity === "critical" : n.unread
  );

  return (
    <AdminScreen
      title="Notifications & Alerts"
      subtitle="Rules watching inventory, orders, payments and infrastructure."
      tabs={tabLabels}
      activeTab={labelFor(tab)}
      onTabChange={(t) => setTab(TABS[tabLabels.indexOf(t)] ?? "All")}
      actions={[
        { label: "Mark all read", icon: CheckCheck, onClick: readAll },
        { label: "New alert rule", icon: BellPlus, emphasis: true, onClick: () => setFormOpen(true) },
      ]}
      kpis={[
        { label: "Unread alerts", value: String(unread), icon: BellDot, delta: `${critical} critical`, deltaTone: "danger", note: `${alerts.meta.total} in total` },
        { label: "Alert rules", value: String(rules.meta.total ?? rules.rows.length), icon: ListChecks, delta: `${categories} categories`, deltaTone: "info", note: `${rules.rows.filter((r: any) => r.isMuted).length} muted` },
      ]}
    >
      <div className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1.5fr)_1fr]">
        <Card>
          <PanelHeading title="Activity feed" subtitle="Newest first · unread carry a gold rail" />
          <div className="flex flex-col">
            {alerts.loading && alerts.rows.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-[12px] text-[var(--ink-muted)]">Loading alerts…</p>
            ) : failed ? (
              <p className="px-5 py-10 text-center font-body text-[12px] text-[var(--ink-muted)]">
                Unable to load alerts.{" "}
                <button type="button" onClick={() => alerts.refresh()} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </p>
            ) : rows.length === 0 ? (
              <p className="px-5 py-10 text-center font-body text-[12px] text-[var(--ink-muted)]">No alerts in this view.</p>
            ) : null}
            {!failed && rows.map((n) => {
              const s = SEVERITY[n.severity];
              return (
                <div
                  key={n.id}
                  className={`flex gap-3 border-b border-[var(--border)] px-5 py-4 last:border-b-0 ${
                    n.unread ? "bg-[#FBF8F1]" : ""
                  }`}
                >
                  <span className={`mt-1 h-7 w-[2px] shrink-0 ${n.unread ? "bg-[var(--gold)]" : "bg-transparent"}`} />
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[2px] bg-[var(--admin-bg)]">
                    <s.icon size={15} className={`text-[var(--${n.severity === "critical" ? "danger" : n.severity === "warning" ? "warning" : n.severity === "success" ? "success" : "info"})]`} />
                  </span>

                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <div className="flex items-start justify-between gap-3">
                      <span className={`font-body text-[12.5px] text-[var(--ink)] ${n.unread ? "font-semibold" : ""}`}>
                        {n.title}
                      </span>
                      <span className="shrink-0 font-mono text-[10px] text-[var(--ink-muted)]">{n.time}</span>
                    </div>
                    <p className="font-body text-[11px] leading-[1.6] text-[var(--ink-muted)]">{n.body}</p>
                    <div className="flex items-center gap-3">
                      <StatusBadge tone={s.tone} showDot={false}>{s.label}</StatusBadge>
                      <span className="font-body text-[9.5px] text-[var(--ink-muted)]">{n.meta}</span>
                      {n.unread && (
                        <button
                          type="button"
                          onClick={() => readOne(n.id)}
                          className="ml-auto font-body text-[10px] font-semibold text-[var(--gold-deep)] hover:text-[var(--ink)]"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <PanelHeading title="Alert rules" subtitle="What is being watched" />
          <div className="flex flex-col gap-2 px-5 pb-6">
            {rules.rows.length === 0 ? (
              <p className="py-6 text-center font-body text-[11.5px] text-[var(--ink-muted)]">
                {rules.loading ? "Loading rules…" : "No alert rules yet."}
              </p>
            ) : (
              rules.rows.map((r: any) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 border border-[var(--border)] bg-[var(--admin-bg)] p-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="font-body text-[11.5px] font-semibold text-[var(--ink)]">{r.name}</span>
                    <span className="font-body text-[9.5px] text-[var(--ink-muted)]">
                      {[r.category, r.threshold, r.channels].filter(Boolean).join(" · ") || "—"}
                    </span>
                  </div>
                  <StatusBadge tone={r.isMuted ? "neutral" : SEVERITY[String(r.severity ?? "INFO").toLowerCase()]?.tone ?? "info"}>
                    {r.isMuted ? "Muted" : SEVERITY[String(r.severity ?? "INFO").toLowerCase()]?.label ?? r.severity}
                  </StatusBadge>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      <EntityFormModal
        open={formOpen}
        mode="create"
        entity="alert rule"
        size="md"
        fields={ALERT_RULE_FIELDS}
        onSubmit={createRule}
        onClose={() => setFormOpen(false)}
      />
    </AdminScreen>
  );
}
