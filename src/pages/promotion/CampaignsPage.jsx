import { useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  Button, Field, Input, Modal, PageHeader, Select, Table, Textarea,
} from "../../design-system";
import { PaginationBar, Toggle } from "../misc-kit";
import {
  DirectoryActions, DirectoryActionDelete, DirectoryActionEdit, DirectoryActionView,
  DirectoryDotPill, DirectoryIdentity, DirectoryMetrics,
  DirectoryTableWrap, DirectoryToolbar, DirectoryToolbarEnd,
  DirectoryToolSelect, DirectoryViewFields, DirectoryViewModal,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import { CampaignReportSection } from "./PromotionReport";
import {
  useGetCampaignsQuery, useCreateCampaignMutation, useUpdateCampaignMutation, useDeleteCampaignMutation,
} from "../../store/services/api";
import { TbPlus } from "../../shared/icons/index";
import { TbSpeakerphone, TbCurrencyPound } from "react-icons/tb";
import { formatDate } from "../../utilities/formatters";

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

const OBJECTIVE_OPTIONS = [
  { value: "", label: "None" },
  { value: "acquisition", label: "Customer Acquisition" },
  { value: "retention", label: "Customer Retention" },
  { value: "reactivation", label: "Win-Back / Reactivation" },
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "seasonal", label: "Seasonal / Holiday" },
  { value: "zone_launch", label: "New Zone Launch" },
];

const CHANNEL_OPTIONS = [
  { value: "", label: "None" },
  { value: "organic", label: "Organic" },
  { value: "google", label: "Google Ads" },
  { value: "meta", label: "Meta / Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "influencer", label: "Influencer" },
  { value: "referral", label: "Referral" },
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
];

const INITIAL_FORM = () => ({
  name: "",
  description: "",
  objective: "",
  channel: "",
  budgetMinor: "",
  currency: "GBP",
  startDate: "",
  endDate: "",
  status: "draft",
});

const FILTER_OPTIONS = [{ value: "", label: "All statuses" }, ...STATUS_OPTIONS];

const STATUS_TONES = {
  active: "success",
  paused: "warning",
  draft: "created",
  completed: "info",
  archived: "neutral",
};

const statusLabel = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;
const pounds = (minor) => (minor ? `£${(Number(minor) / 100).toFixed(2)}` : "—");

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM());
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToaster();

  const { data, isLoading } = useGetCampaignsQuery({ page, limit: 20, status: statusFilter || undefined });
  const [createCampaign, { isLoading: creating }] = useCreateCampaignMutation();
  const [updateCampaign, { isLoading: updating }] = useUpdateCampaignMutation();
  const [deleteCampaign, { isLoading: deleting }] = useDeleteCampaignMutation();
  const saving = creating || updating;

  const campaigns = data?.rows || [];
  const totalCount = data?.count || 0;

  const setField = useCallback((k, v) => setForm((prev) => ({ ...prev, [k]: v })), []);

  const openCreate = () => { setForm(INITIAL_FORM()); setEditId(null); setShowForm(true); };
  const openEdit = (row) => {
    setForm({
      name: row.name || "",
      description: row.description || "",
      objective: row.objective || "",
      channel: row.channel || "",
      budgetMinor: row.budgetMinor != null ? String(row.budgetMinor / 100) : "",
      currency: row.currency || "GBP",
      startDate: row.startDate ? dayjs(row.startDate).format("YYYY-MM-DD") : "",
      endDate: row.endDate ? dayjs(row.endDate).format("YYYY-MM-DD") : "",
      status: row.status || "draft",
    });
    setEditId(row.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (saving) return;
    if (!form.name.trim()) return toast.error("Campaign name is required");
    const budget = form.budgetMinor === "" ? null : Number(form.budgetMinor);
    if (budget != null && !(budget >= 0)) return toast.error("Budget cannot be negative");
    if (form.startDate && form.endDate && form.endDate < form.startDate) {
      return toast.error("End date must be after the start date");
    }
    try {
      // Optional fields go as null, never "".
      const payload = {
        ...form,
        name: form.name.trim(),
        description: form.description.trim() || null,
        objective: form.objective || null,
        channel: form.channel || null,
        budgetMinor: budget == null ? null : Math.round(budget * 100),
        startDate: form.startDate ? dayjs(form.startDate).startOf("day").toISOString() : null,
        endDate: form.endDate ? dayjs(form.endDate).endOf("day").toISOString() : null,
      };
      if (editId) {
        await updateCampaign({ id: editId, ...payload }).unwrap();
        toast.success("Campaign updated");
      } else {
        await createCampaign(payload).unwrap();
        toast.success("Campaign created");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save campaign");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await deleteCampaign(deleteTarget.id).unwrap();
      // Campaigns that still have promotions are archived instead of deleted.
      toast.success(res?.data?.archived ? "Campaign archived (it has promotions)" : "Campaign deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete");
    }
  };

  const columns = [
    {
      key: "campaign",
      header: "Campaign",
      render: (row) => (
        <DirectoryIdentity
          name={row.name}
          meta={row.objective ? OBJECTIVE_OPTIONS.find((o) => o.value === row.objective)?.label : "—"}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryDotPill tone={STATUS_TONES[row.status] || "neutral"}>{statusLabel(row.status)}</DirectoryDotPill>,
    },
    { key: "budget", header: "Budget", render: (row) => pounds(row.budgetMinor) },
    { key: "promotions", header: "Promotions", render: (row) => row.promotions?.length || 0 },
    {
      key: "dates",
      header: "Dates",
      render: (row) => {
        if (!row.startDate && !row.endDate) return "Always";
        return `${row.startDate ? formatDate(row.startDate) : "∞"} — ${row.endDate ? formatDate(row.endDate) : "∞"}`;
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow(row)} />
          <DirectoryActionEdit onClick={() => openEdit(row)} />
          <DirectoryActionDelete onClick={() => setDeleteTarget(row)} />
        </DirectoryActions>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Marketing containers for enterprise promotions"
        actions={
          <Button onClick={openCreate}>
            <TbPlus size={18} /> New Campaign
          </Button>
        }
      />

      <DirectoryToolbar>
        <DirectoryToolSelect>
          <Select
            aria-label="Campaign status"
            options={FILTER_OPTIONS}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}
            placeholder="All statuses"
          />
        </DirectoryToolSelect>
        <DirectoryToolbarEnd>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {totalCount} campaign{totalCount !== 1 ? "s" : ""}
          </span>
        </DirectoryToolbarEnd>
      </DirectoryToolbar>

      <DirectoryTableWrap>
        <Table
          columns={columns}
          rows={campaigns}
          rowKey={(row) => row.id}
          empty={isLoading ? "Loading…" : "No campaigns yet"}
        />
      </DirectoryTableWrap>

      <PaginationBar page={page} limit={20} total={totalCount} onPageChange={setPage} />

      {/* ─── Create/Edit Modal ─────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? "Edit Campaign" : "New Campaign"} size="lg" hideFooter closeOnBackdrop={false}>
        <div className="space-y-4 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
              <TbSpeakerphone className="text-blue-600" size={18} /> Campaign Details
            </div>
            <Field label="Campaign Name *">
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Summer Customer Acquisition 2027" />
            </Field>
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} placeholder="Campaign objective and notes..." />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Objective">
                <Select options={OBJECTIVE_OPTIONS} value={form.objective} onChange={(v) => setField("objective", v)} />
              </Field>
              <Field label="Channel">
                <Select options={CHANNEL_OPTIONS} value={form.channel} onChange={(v) => setField("channel", v)} />
              </Field>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
              <TbCurrencyPound className="text-green-600" size={18} /> Budget & Dates
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Budget (£)">
                <Input type="number" min="0" step="0.01" value={form.budgetMinor} onChange={(e) => setField("budgetMinor", e.target.value)} placeholder="e.g. 5000" />
              </Field>
              <Field label="Status">
                <Select options={STATUS_OPTIONS} value={form.status} onChange={(v) => setField("status", v)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date">
                <Input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
              </Field>
              <Field label="End Date">
                <Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setField("endDate", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editId ? "Update Campaign" : "Create Campaign"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── View Modal ───────────────────────────────────────── */}
      <DirectoryViewModal open={!!viewRow} onClose={() => setViewRow(null)} title={viewRow?.name || "Campaign"} size="lg">
        {viewRow && (
          <div className="space-y-4">
            <DirectoryViewFields
              fields={[
                { label: "Status", value: statusLabel(viewRow.status) },
                { label: "Objective", value: OBJECTIVE_OPTIONS.find((o) => o.value === viewRow.objective)?.label || "—" },
                { label: "Channel", value: CHANNEL_OPTIONS.find((o) => o.value === viewRow.channel)?.label || "—" },
                { label: "Start", value: viewRow.startDate ? formatDate(viewRow.startDate) : "—" },
                { label: "End", value: viewRow.endDate ? formatDate(viewRow.endDate) : "—" },
              ]}
            />
            <CampaignReportSection campaignId={viewRow.id} />
          </div>
        )}
      </DirectoryViewModal>

      {/* ─── Delete Confirm ───────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete or archive campaign?"
        primaryLabel={deleting ? "Deleting…" : "Delete"}
        onPrimary={handleDelete}
        primaryDisabled={deleting}
        danger
      >
        <p style={{ fontSize: 14, color: "#374151" }}>
          Delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? Campaigns that still have promotions are archived instead of deleted.
        </p>
      </Modal>
    </>
  );
}
