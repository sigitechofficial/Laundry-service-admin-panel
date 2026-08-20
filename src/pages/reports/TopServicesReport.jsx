import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsTopServicesQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { downloadReportCsv, ReportInfo, reportMoney, reportShare, ReportQueryState, unwrapReport } from "./reportUi.js";

export default function TopServicesReport() {
  const f = useReportFilters();
  const { data, isLoading, isError, error, refetch } = useReportsTopServicesQuery(f.params);
  const { rows, total, summary, currency } = unwrapReport(data);

  const orderBase = useMemo(() => {
    const fromSummary = Number(summary.orders);
    if (Number.isFinite(fromSummary) && fromSummary > 0) return fromSummary;
    if (total > 0 && total > rows.length) return 0;
    return rows.reduce((sum, row) => sum + Number(row.numberOfOrders || 0), 0);
  }, [rows, summary.orders, total]);

  const reportData = useMemo(
    () =>
      rows.map((row, idx) => ({
        ...row,
        id: `${row.sl || idx + 1}-${idx}`,
        sl: row.sl ?? idx + 1,
        rank: row.rank ?? "—",
        service: row.service ?? "—",
        noOfOrders: row.numberOfOrders ?? 0,
        totalRevenue: row.totalRevenue ?? "0.00",
        orderShare: reportShare(row.numberOfOrders, orderBase),
      })),
    [orderBase, rows]
  );

  const columns = [
    { key: "rank", header: "Rank", render: (row) => <DirectoryMetric value={row.rank} /> },
    {
      key: "service",
      header: "Service",
      render: (row) => <DirectoryIdentity name={row.service} />,
    },
    {
      key: "noOfOrders",
      header: "Orders",
      render: (row) => <DirectoryMetric value={row.noOfOrders} />,
    },
    {
      key: "orderShare",
      header: "Share",
      render: (row) => <DirectoryMetric value={row.orderShare} />,
    },
    {
      key: "totalRevenue",
      header: "Revenue",
      render: (row) => <DirectoryMoney>{reportMoney(row.totalRevenue, currency)}</DirectoryMoney>,
    },
  ];

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Services ranked by completed-order volume in the selected period. Service IDs are not
          returned, so rows stay on this report.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Services", value: summary.services ?? total, tone: "brand" },
            { label: "Orders", value: summary.orders ?? 0, tone: "navy" },
            { label: "Revenue", value: reportMoney(summary.revenue, currency), tone: "success" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search by service…"
              period={f.period}
              onPeriodChange={f.setPeriod}
              startDate={f.startDate}
              endDate={f.endDate}
              onStartDateChange={f.setStartDate}
              onEndDateChange={f.setEndDate}
              zoneId={f.zoneId}
              onZoneIdChange={f.setZoneId}
              shopId={f.shopId}
              onShopIdChange={f.setShopId}
              onClear={f.clearFilters}
              onExport={() =>
                downloadReportCsv(
                  "top-services.csv",
                  [
                    { key: "rank", header: "Rank" },
                    { key: "service", header: "Service" },
                    { key: "noOfOrders", header: "Orders" },
                    { key: "orderShare", header: "Share" },
                    { key: "totalRevenue", header: "Revenue" },
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
          <Table columns={columns} rows={reportData} rowKey={(row) => row.id} empty="No services in this period" />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
