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
} from "../directory-table/directoryTable";
import {
  useGetCampaignsQuery,
  useLazyReportsPromotionsQuery,
  useReportsPromotionsQuery,
} from "../../store/services/api";
import useCsvExport from "../../hooks/useCsvExport";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { ReportInfo, reportMoney, ReportQueryState, unwrapReport } from "./reportUi.js";
import { builtinFiltersActive, splitSort, useSpendReportExtras, YES_NO_USED } from "./promotionReportFilters";
import { BENEFIT_TYPES, STATUS_OPTIONS, STATUS_TONES, benefitLabel, statusLabel } from "../promotion/promotionLabels";
import { PromotionReportModal } from "../promotion/PromotionReport";
import { formatDate } from "../../utilities/formatters";

const SORT_OPTIONS = [
  { value: "cost_desc", label: "Most spent first" },
  { value: "cost_asc", label: "Least spent first" },
  { value: "uses_desc", label: "Most uses" },
  { value: "customers_desc", label: "Most customers" },
  { value: "discount_desc", label: "Most discount" },
  { value: "cashback_desc", label: "Most cashback" },
  { value: "average_desc", label: "Highest cost per use" },
  { value: "refunds_desc", label: "Most refunded" },
  { value: "last_used_desc", label: "Used most recently" },
  { value: "newest_desc", label: "Newest promotion" },
  { value: "name_asc", label: "Name A–Z" },
];

const plural = (n, word) => `${Number(n) || 0} ${word}${Number(n) === 1 ? "" : "s"}`;

const EXTRA_KEYS = ["status", "benefitType", "campaignId", "onlyUsed", "sort"];

const CSV_COLUMNS = [
  { key: "id", header: "Promotion ID" },
  { key: "name", header: "Promotion" },
  { header: "Status", value: (r) => statusLabel(r.status) },
  { header: "Benefit", value: (r) => benefitLabel(r.benefitType) },
  { header: "Campaign", value: (r) => r.campaignName || "" },
  { key: "codes", header: "Codes" },
  { key: "uses", header: "Paid uses" },
  { key: "customers", header: "Customers" },
  { header: "Discount", value: (r) => Number(r.discount).toFixed(2) },
  { header: "Cashback", value: (r) => Number(r.cashback).toFixed(2) },
  { header: "Cost (discount + cashback)", value: (r) => Number(r.cost).toFixed(2) },
  { header: "Cost per use", value: (r) => Number(r.averageCost).toFixed(2) },
  { header: "Cashback credited", value: (r) => Number(r.cashbackCredited).toFixed(2) },
  { header: "Cashback waiting for delivery", value: (r) => Number(r.cashbackPending).toFixed(2) },
  { key: "refunds", header: "Refunds" },
  { header: "Refunded amount", value: (r) => Number(r.refundedAmount).toFixed(2) },
  { key: "holding", header: "Orders holding it now" },
  { header: "Usage limit", value: (r) => (r.usageLimit != null ? r.usageLimit : "No limit") },
  { key: "usedAllTime", header: "Used all time" },
  { header: "First use in period", value: (r) => (r.firstUsedAt ? formatDate(r.firstUsedAt) : "") },
  { header: "Last use in period", value: (r) => (r.lastUsedAt ? formatDate(r.lastUsedAt) : "") },
];

export default function PromotionsReport() {
  const f = useReportFilters();
  const x = useSpendReportExtras(f, EXTRA_KEYS);
  const { sort, dir } = splitSort(x.values.sort);
  const params = useMemo(
    () => ({
      ...f.params,
      sort,
      dir,
      status: x.values.status,
      benefitType: x.values.benefitType,
      campaignId: x.values.campaignId,
      onlyUsed: x.values.onlyUsed,
    }),
    [f.params, sort, dir, x.values.status, x.values.benefitType, x.values.campaignId, x.values.onlyUsed]
  );
  const { data, isLoading, isError, error, refetch } = useReportsPromotionsQuery(params);
  const { rows, total, summary, currency } = unwrapReport(data);
  const { data: campaignsRes } = useGetCampaignsQuery({ limit: 200 });
  const [fetchAll] = useLazyReportsPromotionsQuery();
  const [openRow, setOpenRow] = useState(null);

  const campaignOptions = useMemo(
    () => [
      { value: "", label: "All campaigns" },
      { value: "none", label: "Not in a campaign" },
      ...(campaignsRes?.rows || []).map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [campaignsRes]
  );

  const csv = useCsvExport({
    filenameBase: "promotion-spend",
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
  const byType = summary.byBenefitType || [];

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          What each promotion cost in the period: discount given on paid orders plus cashback
          (paid as credit after delivery). Uses count on the day the order was paid; refunds on
          the day they were refunded and are not part of the cost. Click a promotion for its
          day-by-day, zone and order breakdown.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            {
              label: "Total spent",
              value: money(summary.cost),
              tone: "danger",
              hint: `${money(summary.discount)} discount + ${money(summary.cashback)} cashback`,
            },
            {
              label: "Paid uses",
              value: summary.uses ?? 0,
              tone: "brand",
              hint: `${plural(summary.orders, "order")} · ${plural(summary.customers, "customer")} · ${money(summary.averageCost)} per use`,
            },
            {
              label: "Promotions used",
              value: `${summary.promotionsUsed ?? 0} of ${summary.promotions ?? 0}`,
              tone: "navy",
              hint: top ? `Top: ${top.name} (${money(top.cost)})` : "No paid uses in this period",
            },
            {
              label: "Refunded",
              value: money(summary.refundedAmount),
              tone: "warning",
              hint: `${plural(summary.refunds, "refund")} · ${plural(summary.holding, "order")} holding a promotion now · ${money(summary.cashbackPending)} cashback not credited yet`,
            },
          ]}
        />
        {byType.length > 0 && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--muted)" }}>
            Spend by type:{" "}
            {byType.map((b, i) => (
              <span key={b.benefitType}>
                {i ? " · " : ""}
                <strong>{benefitLabel(b.benefitType)}</strong> {money(b.cost)} ({plural(b.uses, "use")})
              </span>
            ))}
          </p>
        )}
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search promotion, code, campaign or #id…"
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
                    <Select
                      aria-label="Benefit type"
                      value={x.values.benefitType}
                      onChange={x.set("benefitType")}
                      options={[{ value: "", label: "All types" }, ...BENEFIT_TYPES]}
                    />
                  </DirectoryToolSelect>
                  <DirectoryToolSelect>
                    <Select aria-label="Campaign" value={x.values.campaignId} onChange={x.set("campaignId")} options={campaignOptions} />
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
                header: "Promotion",
                render: (row) => (
                  <DirectoryIdentity
                    name={row.name}
                    meta={[`#${row.id}`, benefitLabel(row.benefitType), row.campaignName, row.codes].filter(Boolean).join(" · ")}
                    onClick={() => setOpenRow(row)}
                    title="Open this promotion's report"
                  />
                ),
              },
              {
                key: "status",
                header: "Status",
                render: (row) => <DirectoryDotPill tone={STATUS_TONES[row.status] || "neutral"}>{statusLabel(row.status)}</DirectoryDotPill>,
              },
              {
                key: "uses",
                header: "Uses",
                render: (row) => (
                  <DirectoryMetric
                    value={row.uses}
                    hint={row.usageLimit != null ? `${row.usedAllTime} of ${row.usageLimit} all time` : plural(row.customers, "customer")}
                  />
                ),
              },
              { key: "discount", header: "Discount", render: (row) => <DirectoryMoney>{money(row.discount)}</DirectoryMoney> },
              {
                key: "cashback",
                header: "Cashback",
                render: (row) => (
                  <DirectoryMetric
                    value={money(row.cashback)}
                    hint={row.cashbackPending > 0 ? `${money(row.cashbackPending)} not credited yet` : undefined}
                  />
                ),
              },
              {
                key: "cost",
                header: "Cost",
                render: (row) => <DirectoryMetric value={money(row.cost)} hint={row.uses ? `${money(row.averageCost)} per use` : undefined} />,
              },
              {
                key: "refunds",
                header: "Refunded",
                render: (row) => <DirectoryMetric value={row.refunds ? money(row.refundedAmount) : "—"} hint={row.refunds ? plural(row.refunds, "order") : undefined} />,
              },
            ]}
            rows={rows}
            rowKey={(row) => row.id}
            empty="No promotions match these filters"
          />
        </DirectoryTableWrap>
        <PromotionReportModal promotion={openRow} onClose={() => setOpenRow(null)} />
      </div>
    </ReportQueryState>
  );
}
