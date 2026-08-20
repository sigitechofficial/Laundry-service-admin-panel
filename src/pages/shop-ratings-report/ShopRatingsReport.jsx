import { useMemo, useState } from "react";
import { Select, Table, Button } from "../../design-system";
import {
  useGetShopRatingsReportQuery,
  useGetReviewReasonInsightsQuery,
  useReportsReviewReasonShopsQuery,
} from "../../store/services/api";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDotPill,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import ReportToolbar from "../reports/ReportToolbar";
import { useReportFilters } from "../reports/reportQueryUtils";
import {
  downloadReportCsv,
  RatingHistogram,
  ReportEntityLink,
  ReportInfo,
  ReportQueryState,
  ReportQueueLink,
  shopDetailPath,
  unwrapReport,
} from "../reports/reportUi.js";

const SORT_OPTIONS = [
  { value: "avg_desc", label: "Best rated" },
  { value: "avg_asc", label: "Lowest rated" },
  { value: "low_pct_desc", label: "Highest low-rating %" },
  { value: "count_desc", label: "Most reviews" },
];

const MIN_REVIEWS_OPTIONS = [
  { value: "1", label: "1+" },
  { value: "5", label: "5+" },
  { value: "10", label: "10+" },
  { value: "25", label: "25+" },
];

function performanceTone(perf) {
  if (perf === "good") return "success";
  if (perf === "fair") return "warning";
  return "danger";
}

function ShareBar({ value, sentiment }) {
  const pct = Math.min(100, value || 0);
  const fill = sentiment === "positive" ? "var(--success)" : "var(--danger)";
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      style={{
        width: "100%",
        minWidth: 80,
        height: 8,
        background: "var(--n-100)",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <div style={{ width: `${pct}%`, height: "100%", background: fill, borderRadius: 999 }} />
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2
        style={{
          margin: "0 0 6px",
          fontSize: "var(--text-h3)",
          fontWeight: 700,
          letterSpacing: "-0.3px",
        }}
      >
        {title}
      </h2>
      {description ? (
        <p className="jd-lead" style={{ margin: "0 0 14px" }}>
          {description}
        </p>
      ) : (
        <div style={{ height: 14 }} />
      )}
      {children}
    </section>
  );
}

export default function ShopRatingsReport() {
  const [sort, setSort] = useState("avg_desc");
  const [minReviews, setMinReviews] = useState("5");
  const f = useReportFilters({ paginated: false });
  const [viewRow, setViewRow] = useState(null);
  const [selectedReason, setSelectedReason] = useState(null);

  const ratingsQuery = useMemo(
    () => ({ sort, minReviews, page: 1, limit: 50 }),
    [sort, minReviews]
  );
  const insightsQuery = useMemo(
    () => ({
      period: f.period,
      ...(f.period === "custom" && f.startDate ? { startDate: f.startDate } : {}),
      ...(f.period === "custom" && f.endDate ? { endDate: f.endDate } : {}),
      ...(f.zoneId ? { zoneId: f.zoneId } : {}),
    }),
    [f.endDate, f.period, f.startDate, f.zoneId]
  );
  const reasonShopsQuery = useMemo(
    () => ({
      reasonCode: selectedReason?.code,
      period: f.period,
      ...(f.period === "custom" && f.startDate ? { startDate: f.startDate } : {}),
      ...(f.period === "custom" && f.endDate ? { endDate: f.endDate } : {}),
      page: 1,
      limit: 50,
    }),
    [f.endDate, f.period, f.startDate, selectedReason?.code]
  );

  const ratings = useGetShopRatingsReportQuery(ratingsQuery);
  const insights = useGetReviewReasonInsightsQuery(insightsQuery);
  const reasonShops = useReportsReviewReasonShopsQuery(reasonShopsQuery, {
    skip: !selectedReason?.code,
  });

  const { rows: shops, total, summary } = unwrapReport(ratings.data);
  const insightsPayload = insights.data?.data?.data || insights.data?.data || {};
  const positives = Array.isArray(insightsPayload.positives) ? insightsPayload.positives : [];
  const negatives = Array.isArray(insightsPayload.negatives) ? insightsPayload.negatives : [];
  const { rows: citingShops } = unwrapReport(reasonShops.data);

  const shopRows = shops.map((row) => ({
    id: row.shopId,
    sl: row.sl,
    shopId: row.shopId,
    shopName: row.shopName,
    avgRating: row.avgRating,
    publishedCount: row.publishedCount,
    ratingCount: row.ratingCount,
    lowRatingPercent: `${row.lowRatingPercent}%`,
    performance: row.performance,
    histogram: row.histogram || {},
    topPositiveReasonCode: row.topPositiveReasonCode || "—",
    topNegativeReasonCode: row.topNegativeReasonCode || "—",
  }));

  const shopColumns = [
    {
      key: "shopName",
      header: "Shop",
      render: (row) => <ReportEntityLink to={shopDetailPath(row.shopId)} name={row.shopName} />,
    },
    {
      key: "performance",
      header: "Health",
      render: (row) => (
        <DirectoryDotPill tone={performanceTone(row.performance)}>{row.performance}</DirectoryDotPill>
      ),
    },
    {
      key: "avgRating",
      header: "Avg",
      render: (row) => <DirectoryMetric value={row.avgRating} />,
    },
    {
      key: "lowRatingPercent",
      header: "Low rating",
      render: (row) => <DirectoryMetric value={row.lowRatingPercent} />,
    },
    {
      key: "publishedCount",
      header: "Published",
      render: (row) => <DirectoryMetric value={row.publishedCount} hint={row.ratingCount != null ? `${row.ratingCount} total` : undefined} />,
    },
    {
      key: "topPositiveReasonCode",
      header: "Top positive",
      render: (row) => row.topPositiveReasonCode,
    },
    {
      key: "topNegativeReasonCode",
      header: "Top negative",
      render: (row) => row.topNegativeReasonCode,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow({ kind: "shop", ...row })} />
        </DirectoryActions>
      ),
    },
  ];

  const reasonColumns = [
    {
      key: "label",
      header: "Reason",
      render: (row) => <ReportEntityLink name={row.label} meta={row.code} />,
    },
    {
      key: "selectionCount",
      header: "Selections",
      render: (row) => <DirectoryMetric value={row.selectionCount} />,
    },
    {
      key: "shopCount",
      header: "Shops",
      render: (row) => <DirectoryMetric value={row.shopCount} />,
    },
    {
      key: "reviewCount",
      header: "Reviews",
      render: (row) => <DirectoryMetric value={row.reviewCount ?? "—"} />,
    },
    {
      key: "bar",
      header: "Share",
      render: (row) => <ShareBar value={row.share} sentiment={row.sentiment} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => setSelectedReason(row)}>
            Shops
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  const maxPos = Math.max(...positives.map((p) => p.selectionCount || 0), 1);
  const maxNeg = Math.max(...negatives.map((n) => n.selectionCount || 0), 1);
  const positiveRows = positives.map((r, i) => ({
    id: `p-${r.reasonId}`,
    sl: i + 1,
    ...r,
    sentiment: "positive",
    share: Math.round(((r.selectionCount || 0) / maxPos) * 100),
  }));
  const negativeRows = negatives.map((r, i) => ({
    id: `n-${r.reasonId}`,
    sl: i + 1,
    ...r,
    sentiment: "negative",
    share: Math.round(((r.selectionCount || 0) / maxNeg) * 100),
  }));

  const citingShopRows = citingShops.map((row, index) => ({
    ...row,
    id: `${row.shopId || row.sl || index}-${index}`,
  }));

  const ratingsDirty = sort !== "avg_desc" || minReviews !== "5";

  return (
    <ReportQueryState
      isLoading={ratings.isLoading || insights.isLoading}
      isError={ratings.isError || insights.isError}
      error={ratings.error || insights.error}
      onRetry={() => {
        ratings.refetch();
        insights.refetch();
      }}
    >
      <div>
        <ReportInfo>
          Lifetime published shop ratings. Sort and minimum reviews apply to this table. Period and
          zone apply only to reason insights below — they do not filter shop scores.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Shops", value: summary.shops ?? total, tone: "brand" },
            { label: "Positive reasons", value: positives.length, tone: "success" },
            { label: "Negative reasons", value: negatives.length, tone: "danger" },
          ]}
        />

        <Section title="Shop performance">
          <DirectoryTableWrap
            toolbar={
              <DirectoryToolbar>
                <DirectoryToolSelect>
                  <Select aria-label="Shop sort" value={sort} onChange={setSort} options={SORT_OPTIONS} />
                </DirectoryToolSelect>
                <DirectoryToolSelect>
                  <Select
                    aria-label="Min reviews"
                    value={minReviews}
                    onChange={setMinReviews}
                    options={MIN_REVIEWS_OPTIONS}
                  />
                </DirectoryToolSelect>
                <ReportQueueLink to="/shop-reviews">Open reviews inbox</ReportQueueLink>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!shopRows.length}
                  onClick={() =>
                    downloadReportCsv(
                      "shop-ratings.csv",
                      [
                        { key: "shopName", header: "Shop" },
                        { key: "avgRating", header: "Avg" },
                        { key: "publishedCount", header: "Published" },
                        { key: "ratingCount", header: "Rating count" },
                        { key: "lowRatingPercent", header: "Low %" },
                        { key: "performance", header: "Health" },
                        { key: "topPositiveReasonCode", header: "Top positive" },
                        { key: "topNegativeReasonCode", header: "Top negative" },
                      ],
                      shopRows
                    )
                  }
                >
                  Export
                </Button>
                {ratingsDirty ? (
                  <DirectoryToolbarEnd>
                    <DirectoryClearButton
                      onClick={() => {
                        setSort("avg_desc");
                        setMinReviews("5");
                      }}
                    />
                  </DirectoryToolbarEnd>
                ) : null}
              </DirectoryToolbar>
            }
          >
            <Table columns={shopColumns} rows={shopRows} rowKey={(row) => row.id} empty="No shops match these filters" />
          </DirectoryTableWrap>
        </Section>

        <Section title="Reason insights">
          <ReportInfo>
            Reason selections for the chosen period and zone. Open a reason to see which shops cited
            it. Shop filter is not supported on this endpoint.
          </ReportInfo>
          <div style={{ marginBottom: 16 }}>
            <ReportToolbar
              hideSearch
              period={f.period}
              onPeriodChange={(next) => {
                f.setPeriod(next);
                setSelectedReason(null);
              }}
              startDate={f.startDate}
              endDate={f.endDate}
              onStartDateChange={(value) => {
                f.setStartDate(value);
                setSelectedReason(null);
              }}
              onEndDateChange={(value) => {
                f.setEndDate(value);
                setSelectedReason(null);
              }}
              zoneId={f.zoneId}
              onZoneIdChange={(next) => {
                f.setZoneId(next);
                setSelectedReason(null);
              }}
              onClear={() => {
                f.patchFilters({ period: "this_month", startDate: "", endDate: "", zoneId: "" });
                setSelectedReason(null);
              }}
            />
          </div>
        </Section>

        <Section
          title="What's going well"
          description={`Top positive: ${insightsPayload.topPositive?.label || "—"} (${insightsPayload.topPositive?.selectionCount ?? 0})`}
        >
          <DirectoryTableWrap>
            <Table columns={reasonColumns} rows={positiveRows} rowKey={(row) => row.id} empty="No positive reason insights" />
          </DirectoryTableWrap>
        </Section>

        <Section
          title="What needs attention"
          description={`Top negative: ${insightsPayload.topNegative?.label || "—"} (${insightsPayload.topNegative?.selectionCount ?? 0})`}
        >
          <DirectoryTableWrap>
            <Table columns={reasonColumns} rows={negativeRows} rowKey={(row) => row.id} empty="No negative reason insights" />
          </DirectoryTableWrap>
        </Section>

        {selectedReason ? (
          <Section
            title={`Shops citing ${selectedReason.label}`}
            description="Shops that selected this reason in the insights period. Names open the shop profile."
          >
            <ReportQueryState
              isLoading={reasonShops.isLoading}
              isError={reasonShops.isError}
              error={reasonShops.error}
              onRetry={reasonShops.refetch}
            >
              <DirectoryTableWrap
                toolbar={
                  <DirectoryToolbar>
                    <Button variant="secondary" size="sm" onClick={() => setSelectedReason(null)}>
                      Clear reason
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={!citingShopRows.length}
                      onClick={() =>
                        downloadReportCsv(
                          `review-reason-shops-${selectedReason.code}.csv`,
                          [
                            { key: "shopName", header: "Shop" },
                            { key: "selectionCount", header: "Selections" },
                            { key: "avgRatingInSubset", header: "Avg in subset" },
                          ],
                          citingShopRows
                        )
                      }
                    >
                      Export
                    </Button>
                  </DirectoryToolbar>
                }
              >
                <Table
                  columns={[
                    {
                      key: "shopName",
                      header: "Shop",
                      render: (row) => (
                        <ReportEntityLink to={shopDetailPath(row.shopId)} name={row.shopName} />
                      ),
                    },
                    {
                      key: "selectionCount",
                      header: "Selections",
                      render: (row) => <DirectoryMetric value={row.selectionCount} />,
                    },
                    {
                      key: "avgRatingInSubset",
                      header: "Avg in subset",
                      render: (row) => <DirectoryMetric value={row.avgRatingInSubset ?? "—"} />,
                    },
                  ]}
                  rows={citingShopRows}
                  rowKey={(row) => row.id}
                  empty="No shops cited this reason in the selected period"
                />
              </DirectoryTableWrap>
            </ReportQueryState>
          </Section>
        ) : null}

        <DirectoryViewModal
          open={Boolean(viewRow)}
          title={viewRow?.shopName || "Shop rating"}
          onClose={() => setViewRow(null)}
        >
          <div style={{ display: "grid", gap: 16 }}>
            <dl style={{ margin: 0, display: "grid", gap: 8 }}>
              {[
                { label: "Shop", value: viewRow?.shopName },
                { label: "Avg rating", value: viewRow?.avgRating },
                { label: "Published reviews", value: viewRow?.publishedCount },
                { label: "Rating count", value: viewRow?.ratingCount },
                { label: "Low % (1–2)", value: viewRow?.lowRatingPercent },
                { label: "Health", value: viewRow?.performance },
                { label: "Top positive", value: viewRow?.topPositiveReasonCode },
                { label: "Top negative", value: viewRow?.topNegativeReasonCode },
              ].map((field) => (
                <div key={field.label} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 12 }}>
                  <dt style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>{field.label}</dt>
                  <dd style={{ margin: 0 }}>{field.value ?? "—"}</dd>
                </div>
              ))}
            </dl>
            <div>
              <p style={{ margin: "0 0 8px", fontWeight: 600 }}>Rating histogram</p>
              <RatingHistogram histogram={viewRow?.histogram} />
            </div>
          </div>
        </DirectoryViewModal>
      </div>
    </ReportQueryState>
  );
}
