'use client';

import { useState } from "react";
import { CopyPlus, Download, MailOpen, Pencil, Plus, Send, Trash2, TrendingUp, UserMinus } from "lucide-react";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import { useAdminResource } from "@/hooks/useAdminResource";
import { campaignsApi } from "@/services/admin-resource.service";
import { fromCampaign, money, toCampaign } from "@/lib/admin-adapters";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { CAMPAIGN_FIELDS } from "@/lib/admin-forms";

type Campaign = ReturnType<typeof fromCampaign>;

const TABS = ["All", "Email", "Push", "SMS"];
const TONE: Record<string, Tone> = { Live: "success", Scheduled: "info", Completed: "neutral" };

export default function CampaignsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Campaign | null>(null);
  /** Prefill for "Duplicate" — saved as a new campaign, never over the original. */
  const [copyOf, setCopyOf] = useState<Campaign | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Campaign | null>(null);
  const [tab, setTab] = useState("All");

  const campaigns = useAdminResource({
    resource: campaignsApi,
    fallback: [] as Campaign[],
    adapt: fromCampaign,
    params: { limit: 100 },
  });

  const loadFailed = !campaigns.loading && !campaigns.live;
  const rows = campaigns.rows.filter((c) => tab === "All" || c.channel === tab);

  const totalSent = campaigns.rows.reduce((a, c) => a + (Number(c.raw?.sent) || 0), 0);
  const revenueSum = campaigns.rows.reduce((a, c) => a + (Number(c.raw?.revenue) || 0), 0);
  const openRates = campaigns.rows
    .map((c) => Number(c.raw?.openRate))
    .filter((n) => n > 0);
  const avgOpen = openRates.length
    ? (openRates.reduce((a, b) => a + b, 0) / openRates.length).toFixed(1)
    : "0";
  const channels = new Set(campaigns.rows.map((c) => c.channel)).size;
  const live = campaigns.rows.filter((c) => c.status === "Live").length;
  const scheduled = campaigns.rows.filter((c) => c.status === "Scheduled").length;

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = toCampaign(values);
    return editing
      ? campaigns.update(editing.id, payload, "Campaign")
      : campaigns.create(payload, "Campaign");
  };

  const open = (c?: Campaign) => {
    setCopyOf(null);
    setEditing(c ?? null);
    setFormOpen(true);
  };

  const duplicate = (c: Campaign) => {
    setEditing(null);
    setCopyOf(c);
    setFormOpen(true);
  };

  const source = editing ?? copyOf;
  const initial: EntityValues | undefined = source
    ? {
        name: copyOf ? `${source.name} (copy)` : source.name,
        channel: String(source.raw.channel ?? "EMAIL").toLowerCase(),
        audience: source.raw.audience ?? "",
        status: copyOf ? "DRAFT" : source.raw.status,
        sendAt: source.raw.sendAt ? source.raw.sendAt.slice(0, 10) : "",
        subject: source.raw.subject ?? "",
        preview: source.raw.preview ?? "",
        alwaysOn: Boolean(source.raw.alwaysOn),
      }
    : { status: "DRAFT", channel: "email", audience: "all" };

  const confirmDelete = async () => {
    if (pendingDelete) await campaigns.remove(pendingDelete.id, "Campaign");
    setPendingDelete(null);
  };

  return (
    <AdminScreen
      title="Campaigns"
      subtitle="Lifecycle messaging across email, push and SMS."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      actions={[
        { label: "Export", icon: Download },
        { label: "New campaign", icon: Plus, emphasis: true, onClick: () => open() },
      ]}
      kpis={[
        { label: "Messages sent", value: totalSent.toLocaleString(), icon: Send, delta: `${campaigns.rows.length} campaigns`, deltaTone: "info", note: `${channels} channels` },
        { label: "Attributed revenue", value: money(revenueSum), icon: TrendingUp, deltaTone: "muted", note: "as recorded on each campaign" },
        { label: "Avg. open rate", value: `${avgOpen}%`, icon: MailOpen, delta: "blended", deltaTone: "muted", note: "across all sends" },
        { label: "Live campaigns", value: String(live), icon: UserMinus, delta: `${scheduled} scheduled`, deltaTone: "info", note: "running right now" },
      ]}
    >
      <Card>
        <PanelHeading title="Campaigns" subtitle="Performance by send" />
        <Table>
          <THead>
            <tr>
              <TH>Campaign</TH>
              <TH>Channel</TH>
              <TH>Schedule</TH>
              <TH align="right">Sent</TH>
              <TH align="right">Open rate</TH>
              <TH align="right">Revenue</TH>
              <TH align="right">Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {campaigns.loading && campaigns.rows.length === 0 ? (
              <EmptyRow colSpan={8}>Loading campaigns…</EmptyRow>
            ) : loadFailed ? (
              <EmptyRow colSpan={8}>
                Unable to load campaigns.{" "}
                <button type="button" onClick={() => campaigns.refresh()} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={8}>
                {campaigns.rows.length === 0 ? "No campaigns yet." : "No campaigns on this channel."}
              </EmptyRow>
            ) : (
              rows.map((c, i) => (
                <TR key={c.id} highlight={i === 0}>
                  <TD strong>{c.name}</TD>
                  <TD>{c.channel}</TD>
                  <TD>{c.schedule}</TD>
                  <TD align="right" mono>{c.sent}</TD>
                  <TD align="right" mono>{c.openRate}</TD>
                  <TD align="right" strong>{c.revenue}</TD>
                  <TD align="right">
                    <StatusBadge tone={TONE[c.status] ?? "neutral"}>{c.status}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        { label: "Edit campaign", icon: Pencil, onSelect: () => open(c) },
                        { label: "Duplicate", icon: CopyPlus, onSelect: () => duplicate(c) },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(c) },
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
        entity="campaign"
        size="md"
        fields={CAMPAIGN_FIELDS}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete campaign “${pendingDelete.name}”?\n\nThis action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </AdminScreen>
  );
}
