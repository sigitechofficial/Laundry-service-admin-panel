import { useMemo, useState } from "react";
import { Button, Table } from "../../design-system";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import { useReportsTopShopsQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import {
  downloadReportCsv,
  ReportEntityLink,
  ReportInfo,
  reportMoney,
  ReportQueryState,
  shopDetailPath,
  unwrapReport,
} from "./reportUi.js";

export default function TopPerformingShopsReport() {
  const f = useReportFilters();
  const [viewRow, setViewRow] = useState(null);
  const { data, isLoading, isError, error, refetch } = useReportsTopShopsQuery(f.params);
  const { rows, total, summary, currency } = unwrapReport(data);

  const reportData = useMemo(
    () =>
      rows.map((shop, index) => ({
        ...shop,
        id: `${shop.shopId || shop.sl || index + 1}-${index}`,
        sl: shop.sl ?? index + 1,
        rank: shop.rank ?? "—",
        shopName: shop.shopName ?? "—",
        city: shop.city ?? "—",
        country: shop.country ?? "—",
        zone: shop.zone ?? "—",
        location: shop.location ?? "—",
        ordersCompleted: shop.ordersCompleted ?? 0,
        grossRevenue: shop.grossRevenue ?? "0.00",
        commissionPercent: shop.commissionPercent ?? "—",
        commissionAmount: shop.commissionAmount ?? "0.00",
        driversCommission: shop.driversCommission ?? "0.00",
        deduction: shop.deduction ?? "0.00",
        netPayout: shop.netPayout ?? "0.00",
      })),
    [rows]
  );

  const columns = [
    {
      key: "shopName",
      header: "Shop",
      render: (row) => (
        <ReportEntityLink
          to={shopDetailPath(row.shopId)}
          name={row.shopName}
          meta={joinMeta(`#${row.rank}`, row.location)}
        />
      ),
    },
    {
      key: "zone",
      header: "Zone",
      render: (row) => <DirectoryIdentity name={row.zone} meta={joinMeta(row.city, row.country)} />,
    },
    {
      key: "ordersCompleted",
      header: "Orders",
      render: (row) => <DirectoryMetric value={row.ordersCompleted} />,
    },
    {
      key: "grossRevenue",
      header: "Revenue",
      render: (row) => <DirectoryMoney>{reportMoney(row.grossRevenue, currency)}</DirectoryMoney>,
    },
    {
      key: "commissionPercent",
      header: "Commission",
      render: (row) => (
        <DirectoryMetric value={row.commissionPercent} hint={reportMoney(row.commissionAmount, currency)} />
      ),
    },
    {
      key: "netPayout",
      header: "Net payout",
      render: (row) => <DirectoryMoney>{reportMoney(row.netPayout, currency)}</DirectoryMoney>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow(row)} />
        </DirectoryActions>
      ),
    },
  ];

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Shops ranked by completed orders in the selected period. Shop names open the shop profile.
          The shop filter uses the laundry address ID, not this profile ID.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Shops", value: summary.shops ?? total, tone: "brand" },
            { label: "Orders", value: summary.orders ?? 0, tone: "navy" },
            { label: "Revenue", value: reportMoney(summary.revenue, currency), tone: "success" },
            { label: "Net payout", value: reportMoney(summary.netPayout, currency), tone: "warning" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search by shop name…"
              period={f.period}
              onPeriodChange={f.setPeriod}
              startDate={f.startDate}
              endDate={f.endDate}
              onStartDateChange={f.setStartDate}
              onEndDateChange={f.setEndDate}
              zoneId={f.zoneId}
              onZoneIdChange={f.setZoneId}
              onClear={f.clearFilters}
              onExport={() =>
                downloadReportCsv(
                  "top-shops.csv",
                  [
                    { key: "rank", header: "Rank" },
                    { key: "shopName", header: "Shop" },
                    { key: "location", header: "Location" },
                    { key: "city", header: "City" },
                    { key: "country", header: "Country" },
                    { key: "zone", header: "Zone" },
                    { key: "ordersCompleted", header: "Orders" },
                    { key: "grossRevenue", header: "Revenue" },
                    { key: "commissionPercent", header: "Commission %" },
                    { key: "commissionAmount", header: "Commission" },
                    { key: "driversCommission", header: "Driver commission" },
                    { key: "deduction", header: "Deduction" },
                    { key: "netPayout", header: "Net payout" },
                  ],
                  reportData
                )
              }
              exportDisabled={!reportData.length}
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
          <Table columns={columns} rows={reportData} rowKey={(row) => row.id} empty="No shops in this period" />
        </DirectoryTableWrap>
        <DirectoryViewModal
          open={Boolean(viewRow)}
          title={viewRow?.shopName || "Shop"}
          onClose={() => setViewRow(null)}
          fields={[
            { label: "Rank", value: viewRow?.rank },
            { label: "Shop", value: viewRow?.shopName },
            { label: "City", value: viewRow?.city },
            { label: "Country", value: viewRow?.country },
            { label: "Zone", value: viewRow?.zone },
            { label: "Location", value: viewRow?.location },
            { label: "Orders", value: viewRow?.ordersCompleted },
            { label: "Gross revenue", value: reportMoney(viewRow?.grossRevenue, currency) },
            { label: "Commission", value: viewRow?.commissionPercent },
            { label: "Commission amount", value: reportMoney(viewRow?.commissionAmount, currency) },
            { label: "Driver commission", value: reportMoney(viewRow?.driversCommission, currency) },
            { label: "Deduction", value: reportMoney(viewRow?.deduction, currency) },
            { label: "Net payout", value: reportMoney(viewRow?.netPayout, currency) },
          ]}
        />
      </div>
    </ReportQueryState>
  );
}
