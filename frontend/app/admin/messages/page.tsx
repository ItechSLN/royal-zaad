'use client';

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  CircleCheck,
  Download,
  Inbox,
  Mail,
  MailOpen,
  Reply,
  Timer,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import ActionBar from "@/components/admin/common/ActionBar";
import Card from "@/components/admin/common/Card";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import { StatusTabs, TablePagination } from "@/components/admin/common/TableBits";
import KpiCard, { type DeltaTone } from "@/components/admin/common/KpiCard";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import {
  deleteContactMessage,
  getContactMessages,
  updateContactMessage,
  type ContactMessage,
  type ContactStatus,
} from "@/services/contact.service";

const TABS: { label: string; status?: ContactStatus }[] = [
  { label: "All" },
  { label: "New", status: "NEW" },
  { label: "In progress", status: "IN_PROGRESS" },
  { label: "Resolved", status: "RESOLVED" },
  { label: "Archived", status: "ARCHIVED" },
];

const TONE: Record<ContactStatus, Tone> = {
  NEW: "warning",
  IN_PROGRESS: "info",
  RESOLVED: "success",
  ARCHIVED: "neutral",
};

const LABEL: Record<ContactStatus, string> = {
  NEW: "New",
  IN_PROGRESS: "In progress",
  RESOLVED: "Resolved",
  ARCHIVED: "Archived",
};

const TOPIC: Record<string, string> = {
  ORDER: "Order",
  PRODUCT: "Product",
  RETURNS: "Returns",
  WHOLESALE: "Wholesale",
  PRESS: "Press",
  OTHER: "Other",
};

const when = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
};

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState("All");
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContactMessage | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getContactMessages({ limit: 100 });
      setMessages(res.data);
      setCounts(res.meta.byStatus ?? {});
      setTotal(res.meta.total);
      setLoadError(null);
    } catch (error) {
      const api = error as { message?: string };
      setLoadError(api?.message ?? "Unable to load messages.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rows = useMemo(() => {
    const status = TABS.find((t) => t.label === tab)?.status;
    return status ? messages.filter((m) => m.status === status) : messages;
  }, [messages, tab]);

  const setStatus = async (m: ContactMessage, status: ContactStatus) => {
    try {
      await updateContactMessage(m.id, { status });
      await refresh();
      toast.success(`Marked ${LABEL[status].toLowerCase()}.`);
    } catch (error) {
      const api = error as { message?: string };
      toast.error(api?.message ?? "Unable to update the message.");
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteContactMessage(pendingDelete.id);
      await refresh();
      toast.success("Message deleted.");
    } catch (error) {
      const api = error as { message?: string };
      toast.error(api?.message ?? "Unable to delete the message.");
    }
    setPendingDelete(null);
  };

  const reply = (m: ContactMessage) => {
    const subject = m.subject ? `Re: ${m.subject}` : "Re: your enquiry";
    window.location.assign(`mailto:${m.email}?subject=${encodeURIComponent(subject)}`);
    if (m.status === "NEW") setStatus(m, "IN_PROGRESS");
  };

  const awaiting = (counts.NEW ?? 0) + (counts.IN_PROGRESS ?? 0);
  const answered = messages.filter((m) => m.respondedAt).length;
  const medianReply = (() => {
    const times = messages
      .filter((m) => m.respondedAt)
      .map(
        (m) =>
          (new Date(m.respondedAt as string).getTime() -
            new Date(m.createdAt).getTime()) /
          3_600_000
      );
    if (!times.length) return "—";
    times.sort((a, b) => a - b);
    const mid = times[Math.floor(times.length / 2)];
    return mid < 1 ? `${Math.round(mid * 60)}m` : `${mid.toFixed(1)}h`;
  })();

  return (
    <div className="flex flex-col gap-[18px]">
      <ActionBar
        title="Messages"
        subtitle="Enquiries raised from the storefront contact form."
        actions={[{ label: "Export", icon: Download }]}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Awaiting reply", value: String(awaiting), icon: Inbox, delta: `${counts.NEW ?? 0} new`, deltaTone: (counts.NEW ? "warning" : "muted") as DeltaTone, note: "not yet resolved" },
          { label: "Total enquiries", value: String(total), icon: Mail, delta: `${counts.RESOLVED ?? 0} resolved`, deltaTone: "info" as DeltaTone, note: "all time" },
          { label: "Answered", value: String(answered), icon: MailOpen, delta: "first response sent", deltaTone: "muted" as DeltaTone, note: "of all enquiries" },
          { label: "Median first reply", value: medianReply, icon: Timer, delta: "target under 24h", deltaTone: "muted" as DeltaTone, note: "creation to first action" },
        ].map((k) => (
          <KpiCard key={k.label} {...k} />
        ))}
      </div>

      <StatusTabs
        tabs={TABS.map((t) => ({
          label: t.label,
          count: t.status ? (counts[t.status] ?? 0) : total,
        }))}
        active={tab}
        onChange={(t) => {
          setTab(t);
          setPage(1);
        }}
      />

      <Card>
        <Table>
          <THead>
            <tr>
              <TH>From</TH>
              <TH>Topic</TH>
              <TH>Message</TH>
              <TH>Received</TH>
              <TH>Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {loading && messages.length === 0 ? (
              <EmptyRow colSpan={6}>Loading messages…</EmptyRow>
            ) : loadError ? (
              <EmptyRow colSpan={6}>
                {loadError}{" "}
                <button type="button" onClick={refresh} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={6}>
                {messages.length === 0 ? "No messages yet." : "No messages in this state."}
              </EmptyRow>
            ) : (
              rows.slice((page - 1) * 20, page * 20).map((m) => (
                <TR key={m.id} highlight={m.status === "NEW"}>
                  <TD strong>
                    {m.name}
                    <span className="block font-body text-[10px] font-normal text-[var(--ink-muted)]">
                      {m.email}
                    </span>
                  </TD>
                  <TD>
                    {TOPIC[m.topic] ?? m.topic}
                    {m.orderNumber && (
                      <span className="block font-mono text-[10px] text-[var(--ink-muted)]">
                        {m.orderNumber}
                      </span>
                    )}
                  </TD>
                  <TD className="max-w-[380px]">
                    {m.subject && (
                      <span className="block font-semibold text-[var(--ink)]">
                        {m.subject}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                      className={`text-left ${expanded === m.id ? "" : "line-clamp-2"}`}
                    >
                      {m.message}
                    </button>
                  </TD>
                  <TD>{when(m.createdAt)}</TD>
                  <TD>
                    <StatusBadge tone={TONE[m.status]}>{LABEL[m.status]}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        { label: "Reply by email", icon: Reply, onSelect: () => reply(m) },
                        {
                          label: "Mark in progress",
                          icon: MailOpen,
                          onSelect: () => setStatus(m, "IN_PROGRESS"),
                        },
                        {
                          label: "Mark resolved",
                          icon: CircleCheck,
                          onSelect: () => setStatus(m, "RESOLVED"),
                        },
                        {
                          label: "Archive",
                          icon: Archive,
                          onSelect: () => setStatus(m, "ARCHIVED"),
                        },
                        {
                          label: "Delete",
                          icon: Trash2,
                          danger: true,
                          onSelect: () => setPendingDelete(m),
                        },
                      ]}
                    />
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>

        <TablePagination
          page={page}
          pageSize={20}
          total={rows.length}
          onPageChange={setPage}
          noun="messages"
        />
      </Card>

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete the message from “${pendingDelete.name}”?\n\nThis action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
