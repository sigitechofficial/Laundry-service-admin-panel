import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryDotPill,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsCustomersQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import {
  customerDetailPath,
  downloadReportCsv,
  ReportEntityLink,
  ReportInfo,
  reportMoney,
  ReportQueryState,
  unwrapReport,
} from "./reportUi.js";
import { formatDate } from "../../utilities/formatters";

export default function CustomersReport() {
  const f = useReportFilters();
  const { data, isLoading, isError, error, refetch } = useReportsCustomersQuery(f.params);
  const { rows, total, summary, currency } = unwrapReport(data);

  const reportData = useMemo(
    () =>
      rows.map((row) => ({
        ...row,
        id: row.customerId,
        firstOrderAt: formatDate(row.firstOrderAt),
      })),
    [rows]
  );

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Customers ranked by spend in the selected period. Names open the customer profile when a
          customer ID is present.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Customers", value: summary.customers ?? total, tone: "brand" },
            { label: "New", value: summary.newCustomers ?? 0, tone: "navy" },
            { label: "Repeat", value: summary.repeatCustomers ?? 0, tone: "warning" },
            { label: "Spend", value: reportMoney(summary.revenue, currency), tone: "success" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search by name or email…"
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
                  "customers.csv",
                  [
                    { key: "customerName", header: "Customer" },
                    { key: "email", header: "Email" },
                    { key: "segment", header: "Segment" },
                    { key: "ordersInPeriod", header: "Orders in period" },
                    { key: "completedOrders", header: "Completed" },
                    { key: "spend", header: "Spend" },
                    { key: "firstOrderAt", header: "First order" },
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
          <Table
            columns={[
              {
                key: "customerName",
                header: "Customer",
                render: (row) => (
                  <ReportEntityLink
                    to={customerDetailPath(row.customerId)}
                    name={row.customerName}
                    meta={row.email}
                  />
                ),
              },
              {
                key: "segment",
                header: "Segment",
                render: (row) => (
                  <DirectoryDotPill tone={row.segment === "New" ? "navy" : "success"}>{row.segment}</DirectoryDotPill>
                ),
              },
              { key: "ordersInPeriod", header: "Orders in period", render: (row) => <DirectoryMetric value={row.ordersInPeriod} /> },
              { key: "completedOrders", header: "Completed", render: (row) => <DirectoryMetric value={row.completedOrders ?? "—"} /> },
              {
                key: "spend",
                header: "Spend",
                render: (row) => <DirectoryMoney>{reportMoney(row.spend, currency)}</DirectoryMoney>,
              },
              {
                key: "firstOrderAt",
                header: "First order",
                render: (row) => row.firstOrderAt,
              },
            ]}
            rows={reportData}
            rowKey={(row) => row.id}
            empty="No customers in this period"
          />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
