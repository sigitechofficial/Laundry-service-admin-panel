import { useMemo, useState } from "react";
import { Select, Table } from "../../design-system";
import {
  DirectoryClearButton,
  DirectoryDotPill,
  DirectoryExportButton,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { useLazyReportsCampaignsQuery, useReportsCampaignsQuery } from "../../store/services/api";
import useCsvExport from "../../hooks/useCsvExport";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { ReportInfo, reportMoney, ReportQueryState, unwrapReport } from "./reportUi.js";
import { builtinFiltersActive, splitSort, useSpendReportExtras, YES_NO_USED } from "./promotionReportFilters";
import { CampaignReportSection } from "../promotion/PromotionReport";
import { formatDate } from "../../utilities/formatters";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];
const STATUS_TONES = { active: "success", paused: "warning", draft: "created", completed: "info", archived: "neutral" };
const statusLabel = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;

const OBJECTIVE_OPTIONS = [
  { value: "", label: "All objectives" },
  { value: "acquisition", label: "Customer Acquisition" },
  { value: "retention", label: "Customer Retention" },
  { value: "reactivation", label: "Win-Back / Reactivation" },
  { value: "brand_awareness", label: "Brand Awareness" },
  { value: "seasonal", label: "Seasonal / Holiday" },
  { value: "zone_launch", label: "New Zone Launch" },
];
const objectiveLabel = (v) => OBJECTIVE_OPTIONS.find((o) => o.value === v)?.label || v || "";

const SORT_OPTIONS = [
  { value: "cost_desc", label: "Most spent first" },
  { value: "cost_asc", label: "Least spent first" },
  { value: "budget_used_desc", label: "Most budget used (%)" },
  { value: "budget_desc", label: "Biggest budget" },
  { value: "uses_desc", label: "Most uses" },
  { value: "customers_desc", label: "Most customers" },
  { value: "promotions_desc", label: "Most promotions" },
  { value: "newest_desc", label: "Newest campaign" },
  { value: "name_asc", label: "Name A–Z" },
];

const plural = (n, word) => `${Number(n) || 0} ${word}${Number(n) === 1 ? "" : "s"}`;

const EXTRA_KEYS = ["status", "objective", "onlyUsed", "sort"];

const CSV_COLUMNS = [
  { key: "id", header: "Campaign ID" },
  { key: "name", header: "Campaign" },
  { header: "Status", value: (r) => statusLabel(r.status) },
  { header: "Objective", value: (r) => objectiveLabel(r.objective) },
  { key: "channel", header: "Channel" },
  { key: "promotions", header: "Promotions" },
  { key: "activePromotions", header: "Active promotions" },
  { key: "uses", header: "Paid uses in period" },
  { key: "customers", header: "Customers in period" },
  { header: "Discount in period", value: (r) => Number(r.discount).toFixed(2) },
  { header: "Cashback in period", value: (r) => Number(r.cashback).toFixed(2) },
  { header: "Spent in period", value: (r) => Number(r.cost).toFixed(2) },
  { header: "Budget", value: (r) => (r.budget != null ? Number(r.budget).toFixed(2) : "No limit") },
  { header: "Budget used (all time)", value: (r) => Number(r.budgetUsed).toFixed(2) },
  { header: "Budget used %", value: (r) => (r.percentUsed != null ? r.percentUsed : "") },
  { header: "Budget left", value: (r) => (r.budgetRemaining != null ? Number(r.budgetRemaining).toFixed(2) : "") },
  { header: "Refunded in period", value: (r) => Number(r.refundedAmount).toFixed(2) },
  { header: "Start", value: (r) => (r.startDate ? formatDate(r.startDate) : "") },
  { header: "End", value: (r) => (r.endDate ? formatDate(r.endDate) : "") },
];

function BudgetBar({ pct }) {
  if (pct == null) return <span style={{ fontSize: 12, color: "var(--muted)" }}>No budget</span>;
  const color = pct >= 90 ? "var(--danger, #dc2626)" : pct >= 70 ? "var(--warning, #d97706)" : "var(--success, #16a34a)";
  return (
    <div style={{ minWidth: 90 }}>
      <div style={{ height: 6, borderRadius: 3, background: "var(--line, #e5e7eb)", overflow: "hidden" }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: color }} />
      </div>
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{pct}% used</span>
    </div>
  );
}

export default function CampaignsReport() {
  const f = useReportFilters();
  const x = useSpendReportExtras(f, EXTRA_KEYS);
  const { sort, dir } = splitSort(x.values.sort);
  const params = useMemo(
    () => ({ ...f.params, sort, dir, status: x.values.status, objective: x.values.objective, onlyUsed: x.values.onlyUsed }),
    [f.params, sort, dir, x.values.status, x.values.objective, x.values.onlyUsed]
  );
  const { data, isLoading, isError, error, refetch } = useReportsCampaignsQuery(params);
  const { rows, total, summary, currency } = unwrapReport(data);
  const [fetchAll] = useLazyReportsCampaignsQuery();
  const [openRow, setOpenRow] = useState(null);

  const csv = useCsvExport({
    filenameBase: "campaign-spend",
    filenameFilters: { period: f.period, from: f.startDate, to: f.endDate, search: f.search },
    columns: CSV_COLUMNS,
    fetchAll: () =>
      fetchAll({ ...params, page: undefined, limit: undefined, export: 1 })
        .unwrap()
        .then((res) => ({
          rows: res?.data?.data || [],
          pagination: { truncated: res?.data?.truncated, totalRecords: res?.data?.total },
        })),
  });

  const money = (v) => reportMoney(v, currency);
  const top = summary.topSpender;
  const outside = summary.notInCampaign;

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          What each campaign's promotions cost in the period (discount + cashback on paid
          orders), next to its budget. "Budget used" is the campaign's running total since it
          started; when it reaches 100% its promotions stop applying. Click a campaign for each
          promotion's share.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            {
              label: "Spent in period",
              value: money(summary.cost),
              tone: "danger",
              hint: `${money(summary.discount)} discount + ${money(summary.cashback)} cashback`,
            },
            {
              label: "Campaigns with spend",
              value: `${summary.campaignsUsed ?? 0} of ${summary.campaigns ?? 0}`,
              tone: "navy",
              hint: top ? `Top: ${top.name} (${money(top.cost)})` : "No campaign spend in this period",
            },
            {
              label: "Budgets",
              value: money(summary.budget),
              tone: "brand",
              hint: `${money(summary.budgetUsed)} used all time · ${summary.budgetsUsedUp ?? 0} used up`,
            },
            {
              label: "Not in a campaign",
              value: money(outside?.cost),
              tone: "warning",
              hint: `${plural(outside?.uses, "use")} from promotions without a campaign`,
            },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search campaign, objective, channel or promotion…"
              period={f.period}
              onPeriodChange={f.setPeriod}
              startDate={f.startDate}
              endDate={f.endDate}
              onStartDateChange={f.setStartDate}
              onEndDateChange={f.setEndDate}
              zoneId={f.zoneId}
              onZoneIdChange={f.setZoneId}
              onClear={x.clearAll}
              extraTools={
                <>
                  <DirectoryToolSelect>
                    <Select aria-label="Sort" value={x.values.sort || "cost_desc"} onChange={x.set("sort")} options={SORT_OPTIONS} />
                  </DirectoryToolSelect>
                  <DirectoryToolSelect>
                    <Select aria-label="Status" value={x.values.status} onChange={x.set("status")} options={STATUS_OPTIONS} />
                  </DirectoryToolSelect>
                  <DirectoryToolSelect>
                    <Select aria-label="Objective" value={x.values.objective} onChange={x.set("objective")} options={OBJECTIVE_OPTIONS} />
                  </DirectoryToolSelect>
                  <DirectoryToolSelect>
                    <Select aria-label="Used" value={x.values.onlyUsed} onChange={x.set("onlyUsed")} options={YES_NO_USED} />
                  </DirectoryToolSelect>
                  <DirectoryExportButton onClick={csv.run} loading={csv.isExporting} disabled={!total} count={total} />
                  {x.active && !builtinFiltersActive(f) ? <DirectoryClearButton onClick={x.clearAll} /> : null}
                </>
              }
            />
          }
          footer={
            <ReportPagination
              page={f.page}
              pageSize={f.limit}
              totalRows={total}
              onPageChange={f.setPage}
              onPageSizeChange={f.setLimit}
            />
          }
        >
          <Table
            columns={[
              {
                key: "name",
                header: "Campaign",
                render: (row) => (
                  <DirectoryIdentity
                    name={row.name}
                    meta={[`#${row.id}`, objectiveLabel(row.objective), row.channel, `${plural(row.promotions, "promotion")} (${row.activePromotions} active)`].filter(Boolean).join(" · ")}
                    onClick={() => setOpenRow(row)}
                    title="Open this campaign's report"
                  />
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <DirectoryDotPill tone={STATUS_TONES[row.status] || "neutral"}>{statusLabel(row.status)}</DirectoryDotPill>,
              },
              { key: "uses", header: "Uses", render: (row) => <DirectoryMetric value={row.uses} hint={plural(row.customers, "customer")} /> },
              {
                key: "cost",
                header: "Spent in period",
                render: (row) => (
                  <DirectoryMetric
                    value={money(row.cost)}
                    hint={row.cashback > 0 ? `${money(row.discount)} + ${money(row.cashback)} cashback` : undefined}
                  />
                ),
              },
              {
                key: "budget",
                header: "Budget",
                render: (row) => (
                  <DirectoryMetric
                    value={row.budget != null ? money(row.budget) : "No limit"}
                    hint={row.budget != null ? `${money(row.budgetRemaining)} left` : undefined}
                  />
                ),
              },
              { key: "percentUsed", header: "Budget used", render: (row) => <BudgetBar pct={row.percentUsed} /> },
              { key: "refundedAmount", header: "Refunded", render: (row) => <DirectoryMoney>{row.refundedAmount ? money(row.refundedAmount) : "—"}</DirectoryMoney> },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
            empty="No campaigns match these filters"
          />
        </DirectoryTableWrap>
        <DirectoryViewModal open={!!openRow} onClose={() => setOpenRow(null)} title={`Campaign · ${openRow?.name || ""}`} size="xl">
          {openRow ? <CampaignReportSection campaignId={openRow.id} /> : null}
        </DirectoryViewModal>
      </div>
    </ReportQueryState>
  );
}
