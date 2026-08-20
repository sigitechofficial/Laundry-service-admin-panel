import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryStatusPill,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsServiceDemandQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { downloadReportCsv, ReportInfo, reportMoney, ReportQueryState, unwrapReport } from "./reportUi.js";

export default function ServiceDemandReport() {
  const f = useReportFilters();
  const { data, isLoading, isError, error, refetch } = useReportsServiceDemandQuery(f.params);
  const { rows, total, summary, currency } = unwrapReport(data);

  const reportData = useMemo(
    () =>
      rows.map((row, idx) => ({
        ...row,
        id: `${row.sl || idx + 1}-${idx}`,
        sl: row.sl ?? idx + 1,
        category: row.category ?? "—",
        totalOrders: row.totalOrders ?? 0,
        percentOfTotal: row.percentOfTotal ?? "0%",
        revenue: row.revenue ?? "0.00",
        status: row.status ? "Active" : "Inactive",
      })),
    [rows]
  );

  const columns = [
    {
      key: "category",
      header: "Category",
      render: (row) => <DirectoryIdentity name={row.category} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryStatusPill active={row.status === "Active"} />,
    },
    {
      key: "totalOrders",
      header: "Orders",
      render: (row) => <DirectoryMetric value={row.totalOrders} />,
    },
    {
      key: "percentOfTotal",
      header: "Share",
      render: (row) => <DirectoryMetric value={row.percentOfTotal} />,
    },
    {
      key: "revenue",
      header: "Revenue",
      render: (row) => <DirectoryMoney>{reportMoney(row.revenue, currency)}</DirectoryMoney>,
    },
  ];

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Order demand by service category in the selected period. Category names can repeat, and
          category IDs are not returned, so rows stay on this report.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Categories", value: summary.categories ?? total, tone: "brand" },
            { label: "Orders", value: summary.orders ?? 0, tone: "navy" },
            { label: "Revenue", value: reportMoney(summary.revenue, currency), tone: "success" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search by category…"
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
                  "service-demand.csv",
                  [
                    { key: "category", header: "Category" },
                    { key: "totalOrders", header: "Orders" },
                    { key: "percentOfTotal", header: "Share" },
                    { key: "revenue", header: "Revenue" },
                    { key: "status", header: "Status" },
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
          <Table columns={columns} rows={reportData} rowKey={(row) => row.id} empty="No service demand in this period" />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
