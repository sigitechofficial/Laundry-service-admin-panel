import { useState, useCallback, useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  Button, Field, Input, Modal, PageHeader, Select, Table, Textarea,
} from "../../design-system";
import { PaginationBar } from "../misc-kit";
import {
  DirectoryActions, DirectoryActionDelete, DirectoryActionEdit, DirectoryActionView,
  DirectoryDotPill, DirectoryIdentity,
  DirectoryTableWrap, DirectoryToolbar, DirectoryToolbarEnd,
  DirectoryToolSelect, DirectoryViewModal,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import { CampaignReportSection } from "./PromotionReport";
import {
  useGetCampaignsQuery, useCreateCampaignMutation, useUpdateCampaignMutation, useDeleteCampaignMutation,
  useGetPromotionsQuery,
} from "../../store/services/api";
import { TbPlus } from "../../shared/icons/index";
import { TbSpeakerphone, TbCurrencyPound, TbAlertTriangle } from "react-icons/tb";
import { formatDate } from "../../utilities/formatters";
import { STATUS_TONES as PROMOTION_STATUS_TONES, benefitLabel, statusLabel as promotionStatusLabel } from "./promotionLabels";
import {
  CAMPAIGN_STATUS_OPTIONS, LIVE_PROMOTION_STATUSES, SWITCH_OFF_STATUSES,
  budgetLeftMinor, budgetTakenMinor, campaignStatusLabel, campaignStopReason, poundsFromMinor, stopReasonText, ukToday,
} from "./campaignState";

const PROMOTIONS_PATH = "/promotion/promotions";

const INITIAL_FORM = () => ({
  name: "",
  description: "",
  budgetMinor: "",
  currency: "GBP",
  startDate: "",
  endDate: "",
  status: "draft",
});

const FILTER_OPTIONS = [{ value: "", label: "All statuses" }, ...CAMPAIGN_STATUS_OPTIONS];

const STATUS_TONES = {
  active: "success",
  paused: "warning",
  draft: "created",
  completed: "info",
  archived: "neutral",
};

/** What each status means for the promotions inside, in the form. */
const STATUS_HINTS = {
  draft: "Draft: its promotions do not run yet. Set Active to start them.",
  active: "Active: its promotions run between the start and end dates, until the budget is used up.",
  paused: "Paused: its promotions stop, including for orders already booked.",
  completed: "Completed: its promotions stop for new orders. Orders already booked keep their discount.",
  archived: "Archived: its promotions stop, including for orders already booked.",
};

const liveOf = (promotions) => (promotions || []).filter((p) => LIVE_PROMOTION_STATUSES.includes(p.status));
const nameList = (promotions) => {
  const names = promotions.map((p) => `“${p.name}”`);
  return names.length <= 3 ? names.join(", ") : `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`;
};

/**
 * What saving this status does to the campaign's promotions, or null when nothing changes.
 * Returned as a sentence for the confirm step.
 */
function statusImpact(fromStatus, toStatus, promotions) {
  if (fromStatus === toStatus) return null;
  const live = liveOf(promotions);
  if (!live.length) return null;
  const n = `${live.length} promotion${live.length === 1 ? "" : "s"}`;
  if (toStatus === "active") return { tone: "info", text: `${n} will start running for new orders: ${nameList(live)}.` };
  if (fromStatus !== "active") return null;
  if (SWITCH_OFF_STATUSES.includes(toStatus)) {
    return { tone: "danger", text: `${n} will stop, including for orders already booked: ${nameList(live)}.` };
  }
  return { tone: "danger", text: `${n} will stop for new orders: ${nameList(live)}. Orders already booked keep their discount.` };
}

/** Running / not running, with the reason. */
function RunningPill({ campaign }) {
  const reason = campaignStopReason(campaign);
  if (!reason) return <DirectoryDotPill tone="success">Running</DirectoryDotPill>;
  return <DirectoryDotPill tone="neutral">Not running · {stopReasonText(reason, campaign)}</DirectoryDotPill>;
}

function BudgetMeter({ campaign }) {
  if (campaign.budgetMinor == null) return <p className="m-0 text-sm text-gray-600">No budget limit</p>;
  const budget = Number(campaign.budgetMinor);
  const spent = Number(campaign.usedBudgetMinor || 0);
  const held = Number(campaign.heldBudgetMinor || 0);
  const left = budgetLeftMinor(campaign);
  const pct = (v) => (budget > 0 ? Math.min(100, (v / budget) * 100) : 100);
  return (
    <div className="space-y-2">
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100" role="img" aria-label={`Budget ${poundsFromMinor(budgetTakenMinor(campaign))} of ${poundsFromMinor(budget)} used`}>
        <div className="h-full bg-blue-600" style={{ width: `${pct(spent)}%` }} />
        <div className="h-full bg-blue-300" style={{ width: `${Math.min(100 - pct(spent), pct(held))}%` }} />
      </div>
      <div className="grid grid-cols-4 gap-2 text-xs">
        <div><p className="m-0 text-gray-500">Budget</p><p className="m-0 font-semibold text-gray-900 tabular-nums">{poundsFromMinor(budget)}</p></div>
        <div><p className="m-0 text-gray-500"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-600" />Spent (paid)</p><p className="m-0 font-semibold text-gray-900 tabular-nums">{poundsFromMinor(spent)}</p></div>
        <div><p className="m-0 text-gray-500"><span className="mr-1 inline-block h-2 w-2 rounded-full bg-blue-300" />Held (unpaid)</p><p className="m-0 font-semibold text-gray-900 tabular-nums">{campaign.heldBudgetMinor != null ? poundsFromMinor(held) : "—"}</p></div>
        <div><p className="m-0 text-gray-500">Left</p><p className={`m-0 font-semibold tabular-nums ${left === 0 ? "text-red-600" : "text-gray-900"}`}>{poundsFromMinor(left)}</p></div>
      </div>
    </div>
  );
}

/** The campaign's promotions, with a way to add one straight into it. */
function CampaignPromotions({ campaign, onAdd, onOpen }) {
  const { data, isLoading } = useGetPromotionsQuery({ campaignId: campaign.id, limit: 100 });
  const rows = data?.rows || [];
  const runningCampaign = !campaignStopReason(campaign);
  return (
    <section className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
        <div>
          <h4 className="m-0 text-sm font-semibold text-gray-900">Promotions in this campaign</h4>
          <p className="m-0 text-xs text-gray-500">{isLoading ? "Loading…" : `${rows.length} promotion${rows.length === 1 ? "" : "s"}`}</p>
        </div>
        <Button size="sm" onClick={onAdd} disabled={["completed", "archived"].includes(campaign.status)}>
          <TbPlus size={16} /> Add promotion
        </Button>
      </div>
      {!isLoading && !rows.length ? (
        <p className="m-0 px-4 py-5 text-sm text-gray-500">No promotions yet. Add one to give this campaign something to run.</p>
      ) : (
        <ul className="m-0 list-none divide-y divide-gray-100 p-0">
          {rows.map((p) => {
            const live = LIVE_PROMOTION_STATUSES.includes(p.status);
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                <div className="min-w-0 flex-1">
                  <button type="button" className="m-0 block max-w-full truncate border-0 bg-transparent p-0 text-left text-sm font-medium text-gray-900 hover:text-blue-700" onClick={() => onOpen(p)}>
                    {p.name}
                  </button>
                  <p className="m-0 text-xs text-gray-500">
                    {benefitLabel(p.benefitType)} · {p.activationType === "coupon_required" ? "Coupon" : "Automatic"} · {Number(p.globalUsedCount || 0)} used
                  </p>
                </div>
                <DirectoryDotPill tone={PROMOTION_STATUS_TONES[p.status] || "neutral"}>{promotionStatusLabel(p.status)}</DirectoryDotPill>
                {live && !runningCampaign ? <span className="text-xs font-medium text-amber-700">Not running</span> : null}
              </li>
            );
          })}
        </ul>
      )}
      {["completed", "archived"].includes(campaign.status) ? (
        <p className="m-0 border-t border-gray-200 px-4 py-2 text-xs text-gray-500">This campaign is {campaign.status}, so no promotions can be added.</p>
      ) : null}
    </section>
  );
}

export default function CampaignsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM());
  const [editRow, setEditRow] = useState(null);
  const [confirmImpact, setConfirmImpact] = useState(null);
  const [viewId, setViewId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const toast = useToaster();

  const { data, isLoading } = useGetCampaignsQuery({ page, limit: 20, status: statusFilter || undefined });
  const [createCampaign, { isLoading: creating }] = useCreateCampaignMutation();
  const [updateCampaign, { isLoading: updating }] = useUpdateCampaignMutation();
  const [deleteCampaign, { isLoading: deleting }] = useDeleteCampaignMutation();
  const saving = creating || updating;

  const campaigns = useMemo(() => data?.rows || [], [data]);
  const totalCount = data?.count || 0;
  // The open campaign follows the list, so it refreshes after an edit.
  const viewRow = useMemo(() => campaigns.find((c) => c.id === viewId) || null, [campaigns, viewId]);

  const setField = useCallback((k, v) => setForm((prev) => ({ ...prev, [k]: v })), []);

  const openCreate = () => { setForm(INITIAL_FORM()); setEditRow(null); setShowForm(true); };
  const openEdit = (row) => {
    setForm({
      name: row.name || "",
      description: row.description || "",
      budgetMinor: row.budgetMinor != null ? String(row.budgetMinor / 100) : "",
      currency: row.currency || "GBP",
      startDate: row.startDate ? dayjs(row.startDate).format("YYYY-MM-DD") : "",
      endDate: row.endDate ? dayjs(row.endDate).format("YYYY-MM-DD") : "",
      status: row.status || "draft",
    });
    setEditRow(row);
    setShowForm(true);
  };

  const addPromotion = (campaign) => navigate(`${PROMOTIONS_PATH}?new=1&campaign=${campaign.id}`);
  const openPromotion = (promotion) => navigate(`${PROMOTIONS_PATH}?view=${promotion.id}`);

  const formError = () => {
    if (!form.name.trim()) return "Campaign name is required";
    const budget = form.budgetMinor === "" ? null : Number(form.budgetMinor);
    if (budget != null && !(budget >= 0)) return "Budget cannot be negative";
    if (form.startDate && form.endDate && form.endDate < form.startDate) return "End date must be on or after the start date";
    if (form.status === "active" && form.endDate && form.endDate < ukToday()) {
      return "This campaign has already ended. Change the end date to make it active.";
    }
    return null;
  };

  const save = async () => {
    try {
      const budget = form.budgetMinor === "" ? null : Number(form.budgetMinor);
      // Optional fields go as null, never "".
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        budgetMinor: budget == null ? null : Math.round(budget * 100),
        currency: form.currency || "GBP",
        status: form.status,
        // Campaign dates are calendar days: send the day itself, not a moment in this browser's timezone.
        startDate: form.startDate || null,
        endDate: form.endDate || null,
      };
      if (editRow) {
        await updateCampaign({ id: editRow.id, ...payload }).unwrap();
        toast.success("Campaign updated");
      } else {
        await createCampaign(payload).unwrap();
        toast.success(payload.status === "draft" ? "Campaign created as draft" : "Campaign created");
      }
      setConfirmImpact(null);
      setShowForm(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save campaign");
    }
  };

  const handleSave = () => {
    if (saving) return;
    const err = formError();
    if (err) return toast.error(err);
    // A status change that starts or stops promotions is confirmed first.
    const impact = editRow ? statusImpact(editRow.status, form.status, editRow.promotions) : null;
    if (impact) return setConfirmImpact(impact);
    return save();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const hasPromotions = (deleteTarget.promotions?.length || 0) > 0;
    try {
      if (hasPromotions) {
        // A campaign with promotions is never deleted: archiving it is a deliberate stop.
        await updateCampaign({ id: deleteTarget.id, status: "archived" }).unwrap();
        toast.success("Campaign archived. Its promotions have stopped.");
      } else {
        await deleteCampaign(deleteTarget.id).unwrap();
        toast.success("Campaign deleted");
      }
      if (viewId === deleteTarget.id) setViewId(null);
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.data?.message || (hasPromotions ? "Failed to archive" : "Failed to delete"));
    }
  };

  const columns = [
    {
      key: "campaign",
      header: "Campaign",
      render: (row) => (
        <DirectoryIdentity
          name={row.name}
          meta={stopReasonText(campaignStopReason(row), row) || "Running"}
          onClick={() => setViewId(row.id)}
          title="Open this campaign"
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryDotPill tone={STATUS_TONES[row.status] || "neutral"}>{campaignStatusLabel(row.status)}</DirectoryDotPill>,
    },
    {
      key: "budget",
      header: "Budget",
      render: (row) => (row.budgetMinor == null
        ? "No limit"
        : `${poundsFromMinor(budgetTakenMinor(row))} of ${poundsFromMinor(row.budgetMinor)}`),
    },
    {
      key: "promotions",
      header: "Promotions",
      render: (row) => {
        const total = row.promotions?.length || 0;
        const live = liveOf(row.promotions).length;
        if (!total) return "0";
        // "live" only when they actually run: a stopped campaign runs none of them.
        return campaignStopReason(row) ? `${total} (none running)` : `${total} (${live} running)`;
      },
    },
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
          <DirectoryActionView onClick={() => setViewId(row.id)} />
          <DirectoryActionEdit onClick={() => openEdit(row)} />
          {row.status !== "archived" || !row.promotions?.length ? (
            <DirectoryActionDelete onClick={() => setDeleteTarget(row)} />
          ) : null}
        </DirectoryActions>
      ),
    },
  ];

  const deleteHasPromotions = (deleteTarget?.promotions?.length || 0) > 0;
  const deleteLive = liveOf(deleteTarget?.promotions);

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Group promotions under one budget, one set of dates and one on/off switch"
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
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editRow ? "Edit Campaign" : "New Campaign"} size="lg" hideFooter closeOnBackdrop={false}>
        <div className="space-y-4 p-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
              <TbSpeakerphone className="text-blue-600" size={18} /> Campaign Details
            </div>
            <Field label="Campaign Name *">
              <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. Black Friday 2026" />
            </Field>
            <Field label="Description">
              <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} placeholder="What this campaign is for (optional)" />
            </Field>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
              <TbCurrencyPound className="text-green-600" size={18} /> Budget, Dates & Status
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Budget (£)" hint="Total discount + cashback all its promotions may give. Empty = no limit">
                <Input type="number" min="0" step="0.01" value={form.budgetMinor} onChange={(e) => setField("budgetMinor", e.target.value)} placeholder="e.g. 500" />
              </Field>
              <Field label="Status" hint={STATUS_HINTS[form.status]}>
                <Select options={CAMPAIGN_STATUS_OPTIONS} value={form.status} onChange={(v) => setField("status", v)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Start Date" hint="Its promotions start on this day (UK time)">
                <Input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
              </Field>
              <Field label="End Date" hint="Last day they run. The campaign completes the day after">
                <Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setField("endDate", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editRow ? "Update Campaign" : "Create Campaign"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─── Confirm a status change that starts / stops promotions ─── */}
      <Modal
        open={!!confirmImpact}
        onClose={() => setConfirmImpact(null)}
        title={confirmImpact?.tone === "danger" ? "Stop this campaign's promotions?" : "Start this campaign's promotions?"}
        primaryLabel={saving ? "Saving…" : confirmImpact?.tone === "danger" ? "Yes, stop them" : "Yes, start them"}
        onPrimary={save}
        primaryDisabled={saving}
        danger={confirmImpact?.tone === "danger"}
      >
        <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>{confirmImpact?.text}</p>
      </Modal>

      {/* ─── View Modal ───────────────────────────────────────── */}
      <DirectoryViewModal open={!!viewRow} onClose={() => setViewId(null)} title={viewRow?.name || "Campaign"} size="lg">
        {viewRow && (
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <DirectoryDotPill tone={STATUS_TONES[viewRow.status] || "neutral"}>{campaignStatusLabel(viewRow.status)}</DirectoryDotPill>
                  <RunningPill campaign={viewRow} />
                </div>
                <Button size="sm" variant="secondary" onClick={() => openEdit(viewRow)}>Edit campaign</Button>
              </div>
              <p className="m-0 text-sm text-gray-600">
                {viewRow.startDate || viewRow.endDate
                  ? `${viewRow.startDate ? formatDate(viewRow.startDate) : "Any time"} — ${viewRow.endDate ? formatDate(viewRow.endDate) : "no end date"}`
                  : "No dates: runs while active"}
              </p>
              {viewRow.description ? <p className="m-0 text-sm text-gray-700">{viewRow.description}</p> : null}
              <BudgetMeter campaign={viewRow} />
            </div>
            <CampaignPromotions campaign={viewRow} onAdd={() => addPromotion(viewRow)} onOpen={openPromotion} />
            <CampaignReportSection campaignId={viewRow.id} />
          </div>
        )}
      </DirectoryViewModal>

      {/* ─── Delete / archive confirm ─────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={deleteHasPromotions ? "Archive this campaign?" : "Delete this campaign?"}
        primaryLabel={deleting || updating ? "Please wait…" : deleteHasPromotions ? "Archive campaign" : "Delete"}
        onPrimary={handleDelete}
        primaryDisabled={deleting || updating}
        danger
      >
        {deleteHasPromotions ? (
          <div style={{ fontSize: 14, color: "#374151" }} className="space-y-2">
            <p className="m-0">
              <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong> has {deleteTarget.promotions.length} promotion{deleteTarget.promotions.length === 1 ? "" : "s"}, so it can&rsquo;t be deleted. You can archive it instead.
            </p>
            {deleteLive.length ? (
              <p className="m-0 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">
                <TbAlertTriangle size={18} className="mt-0.5 shrink-0" />
                <span>Archiving stops {deleteLive.length} live promotion{deleteLive.length === 1 ? "" : "s"}, including for orders already booked: {nameList(deleteLive)}.</span>
              </p>
            ) : null}
          </div>
        ) : (
          <p style={{ fontSize: 14, color: "#374151", margin: 0 }}>
            Delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>? It has no promotions, so nothing else changes.
          </p>
        )}
      </Modal>
    </>
  );
}
