'use client';

import { useState } from "react";
import { Download, Eye, FileText, Pencil, Plus, ShoppingBag, Trash2, Unlink } from "lucide-react";
import AdminScreen from "@/components/admin/common/AdminScreen";
import Card, { PanelHeading } from "@/components/admin/common/Card";
import { StatusBadge, type Tone } from "@/components/ui/Badge";
import { Table, THead, TBody, TH, TD, TR, EmptyRow } from "@/components/admin/common/Table";
import RowMenu from "@/components/admin/common/RowMenu";
import ConfirmDialog from "@/components/admin/common/ConfirmDialog";
import { useAdminResource } from "@/hooks/useAdminResource";
import { cmsApi } from "@/services/admin-resource.service";
import { fromPost, toPost } from "@/lib/admin-adapters";
import EntityFormModal, { type EntityValues } from "@/components/admin/form/EntityFormModal";
import { CMS_FIELDS } from "@/lib/admin-forms";

type Post = ReturnType<typeof fromPost>;

const TABS = ["All", "Published", "Draft", "Scheduled"];
const TONE: Record<string, Tone> = { Published: "success", Draft: "neutral", Scheduled: "info" };

export default function CmsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Post | null>(null);
  const [tab, setTab] = useState("All");
  const [pendingDelete, setPendingDelete] = useState<Post | null>(null);

  const posts = useAdminResource({
    resource: cmsApi,
    fallback: [] as Post[],
    adapt: fromPost,
    params: { limit: 100 },
  });

  const loadFailed = !posts.loading && !posts.live;

  const rows = posts.rows.filter((p) => tab === "All" || p.status === tab);

  const published = posts.rows.filter((p) => p.status === "Published").length;
  const scheduledCount = posts.rows.filter((p) => p.status === "Scheduled").length;
  const drafts = posts.rows.filter((p) => p.status === "Draft").length;
  const totalViews = posts.rows.reduce((a, p) => a + (Number(p.raw?.views) || 0), 0);
  const shoppable = posts.rows.filter((p) => p.raw?.shoppable).length;

  const submit = async (values: Record<string, string | boolean>) => {
    const payload = toPost(values);
    return editing
      ? posts.update(editing.id, payload, "Post")
      : posts.create(payload, "Post");
  };

  const open = (p?: Post) => {
    setEditing(p ?? null);
    setFormOpen(true);
  };

  const initial: EntityValues = editing
    ? {
        title: editing.title,
        slug: editing.raw.slug,
        author: editing.raw.author ?? "",
        category: editing.raw.category ?? "",
        status: editing.raw.status,
        publishAt: editing.raw.publishAt ? editing.raw.publishAt.slice(0, 10) : "",
        excerpt: editing.raw.excerpt ?? "",
        body: editing.raw.body ?? "",
        shoppable: Boolean(editing.raw.shoppable),
      }
    : { status: "DRAFT" };

  const confirmDelete = async () => {
    if (pendingDelete) await posts.remove(pendingDelete.id, "Post");
    setPendingDelete(null);
  };

  return (
    <AdminScreen
      title="CMS"
      subtitle="Journal, guides and landing content."
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
      actions={[
        { label: "Export", icon: Download },
        { label: "New post", icon: Plus, emphasis: true, onClick: () => open() },
      ]}
      kpis={[
        { label: "Published", value: String(published), icon: FileText, delta: `${scheduledCount} scheduled`, deltaTone: "info", note: "posts and pages" },
        { label: "Total views", value: totalViews.toLocaleString(), icon: Eye, deltaTone: "muted", note: "across all content" },
        { label: "Shoppable posts", value: String(shoppable), icon: ShoppingBag, deltaTone: "muted", note: "with products attached" },
        { label: "Drafts", value: String(drafts), icon: Unlink, delta: drafts ? "awaiting review" : "none open", deltaTone: drafts ? "warning" : "muted", note: "not yet live" },
      ]}
    >
      <Card>
        <PanelHeading title="Content" subtitle="Everything published to the storefront" />
        <Table>
          <THead>
            <tr>
              <TH>Post</TH>
              <TH>Author</TH>
              <TH>Category</TH>
              <TH>Published</TH>
              <TH align="right">Views</TH>
              <TH align="right">Status</TH>
              <TH className="w-[40px]" />
            </tr>
          </THead>
          <TBody>
            {posts.loading && posts.rows.length === 0 ? (
              <EmptyRow colSpan={7}>Loading posts…</EmptyRow>
            ) : loadFailed ? (
              <EmptyRow colSpan={7}>
                Unable to load posts.{" "}
                <button type="button" onClick={() => posts.refresh()} className="font-semibold text-[var(--gold-deep)] underline">
                  Retry
                </button>
              </EmptyRow>
            ) : rows.length === 0 ? (
              <EmptyRow colSpan={7}>
                {posts.rows.length === 0 ? "No posts yet." : "No content in this state."}
              </EmptyRow>
            ) : (
              rows.map((p, i) => (
                <TR key={p.id} highlight={i === 0}>
                  <TD strong>{p.title}</TD>
                  <TD>{p.author}</TD>
                  <TD>{p.category}</TD>
                  <TD>{p.published}</TD>
                  <TD align="right" mono>{p.views}</TD>
                  <TD align="right">
                    <StatusBadge tone={TONE[p.status] ?? "neutral"}>{p.status}</StatusBadge>
                  </TD>
                  <TD>
                    <RowMenu
                      actions={[
                        { label: "Edit post", icon: Pencil, onSelect: () => open(p) },
                        { label: "Delete", icon: Trash2, danger: true, onSelect: () => setPendingDelete(p) },
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
        entity="post"
        size="lg"
        fields={CMS_FIELDS}
        initial={initial}
        onSubmit={submit}
        onClose={() => setFormOpen(false)}
      />

      {pendingDelete && (
        <ConfirmDialog
          isOpen
          title="Confirm deletion"
          message={`Delete “${pendingDelete.title}”?\n\nThis action cannot be undone.`}
          onConfirm={confirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </AdminScreen>
  );
}
