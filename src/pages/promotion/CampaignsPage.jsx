import { useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  Button, Field, Input, Modal, PageHeader, Select, Table, Textarea,
} from "../../design-system";
import { PaginationBar, Toggle } from "../misc-kit";
import {
  DirectoryActions, DirectoryActionEdit, DirectoryActionView,
  DirectoryDotPill, DirectoryIdentity, DirectoryMetrics, DirectoryMetric,
  DirectoryTableWrap, DirectoryToolbar, DirectoryToolbarEnd,
  DirectoryToolSelect, DirectoryViewModal,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import {
  useGetCampaignsQuery, useCreateCampaignMutation, useUpdateCampaignMutation, useDeleteCampaignMutation,
} from "../../store/services/api";
import { TbPlus } from "../../shared/icons/index";
import { TbSpeakerphone, TbTarget, TbCurrencyPound, TbCalendarEvent } from "react-icons/tb";
import { formatDate, formatAmount } from "../../utilities/formatters";

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

const statusColor = (s) => {
  switch (s) {
    case "active": return "green";
    case "paused": return "yellow";
    case "draft": return "blue";
    case "completed": return "purple";
    case "archived": return "gray";
    default: return "gray";
  }
};

export default function CampaignsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM());
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const { toastSuccess, toastError, Toaster } = useToaster();

  const { data, isLoading } = useGetCampaignsQuery({ page, limit: 20, status: statusFilter || undefined });
  const [createCampaign, { isLoading: creating }] = useCreateCampaignMutation();
  const [updateCampaign, { isLoading: updating }] = useUpdateCampaignMutation();
  const [deleteCampaign] = useDeleteCampaignMutation();

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
      budgetMinor: row.budgetMinor ? String(row.budgetMinor / 100) : "",
      currency: row.currency || "GBP",
      startDate: row.startDate ? dayjs(row.startDate).format("YYYY-MM-DD") : "",
      endDate: row.endDate ? dayjs(row.endDate).format("YYYY-MM-DD") : "",
      status: row.status || "draft",
    });
    setEditId(row.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        budgetMinor: form.budgetMinor ? Math.round(parseFloat(form.budgetMinor) * 100) : null,
      };
      if (editId) {
        await updateCampaign({ id: editId, ...payload }).unwrap();
        toastSuccess("Campaign updated");
      } else {
        await createCampaign(payload).unwrap();
        toastSuccess("Campaign created");
      }
      setShowForm(false);
    } catch (err) {
      toastError(err?.data?.message || "Failed to save campaign");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete or archive this campaign?")) return;
    try {
      await deleteCampaign(id).unwrap();
      toastSuccess("Campaign removed");
    } catch (err) {
      toastError(err?.data?.message || "Failed to delete");
    }
  };

  const columns = useMemo(() => [
    {
      header: "Campaign",
      cell: (row) => (
        <DirectoryIdentity
          name={row.name}
          subtitle={row.objective ? OBJECTIVE_OPTIONS.find((o) => o.value === row.objective)?.label : "—"}
        />
      ),
    },
    {
      header: "Status",
      cell: (row) => <DirectoryDotPill color={statusColor(row.status)} label={row.status} />,
    },
    {
      header: "Budget",
      cell: (row) => row.budgetMinor ? `£${(row.budgetMinor / 100).toFixed(2)}` : "—",
    },
    {
      header: "Promotions",
      cell: (row) => (row.promotions?.length || 0),
    },
    {
      header: "Dates",
      cell: (row) => {
        if (!row.startDate && !row.endDate) return "Always";
        return `${row.startDate ? formatDate(row.startDate) : "∞"} — ${row.endDate ? formatDate(row.endDate) : "∞"}`;
      },
    },
    {
      header: "",
      cell: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow(row)} />
          <DirectoryActionEdit onClick={() => openEdit(row)} />
        </DirectoryActions>
      ),
    },
  ], []);

  return (
    <>
      <Toaster />
      <PageHeader title="Campaigns" subtitle="Marketing containers for enterprise promotions" />

      <DirectoryToolbar>
        <DirectoryToolSelect
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <DirectoryToolbarEnd>
          <Button onClick={openCreate} icon={<TbPlus />}>New Campaign</Button>
        </DirectoryToolbarEnd>
      </DirectoryToolbar>

      <DirectoryTableWrap>
        <Table columns={columns} data={campaigns} loading={isLoading} emptyText="No campaigns yet" />
      </DirectoryTableWrap>

      <PaginationBar page={page} limit={20} total={totalCount} onPageChange={setPage} />

      {/* ─── Create/Edit Modal ─────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? "Edit Campaign" : "New Campaign"} size="lg">
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
                <Input type="number" value={form.budgetMinor} onChange={(e) => setField("budgetMinor", e.target.value)} placeholder="e.g. 5000" />
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
                <Input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} loading={creating || updating}>
              {editId ? "Update Campaign" : "Create Campaign"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── View Modal ───────────────────────────────────────── */}
      <DirectoryViewModal open={!!viewRow} onClose={() => setViewRow(null)} title={viewRow?.name || "Campaign"}>
        {viewRow && (
          <DirectoryMetrics>
            <DirectoryMetric label="Status" value={viewRow.status} />
            <DirectoryMetric label="Objective" value={viewRow.objective || "—"} />
            <DirectoryMetric label="Channel" value={viewRow.channel || "—"} />
            <DirectoryMetric label="Budget" value={viewRow.budgetMinor ? `£${(viewRow.budgetMinor / 100).toFixed(2)}` : "—"} />
            <DirectoryMetric label="Used" value={viewRow.usedBudgetMinor ? `£${(viewRow.usedBudgetMinor / 100).toFixed(2)}` : "£0.00"} />
            <DirectoryMetric label="Promotions" value={viewRow.promotions?.length || 0} />
            <DirectoryMetric label="Start" value={viewRow.startDate ? formatDate(viewRow.startDate) : "—"} />
            <DirectoryMetric label="End" value={viewRow.endDate ? formatDate(viewRow.endDate) : "—"} />
          </DirectoryMetrics>
        )}
      </DirectoryViewModal>
    </>
  );
}
