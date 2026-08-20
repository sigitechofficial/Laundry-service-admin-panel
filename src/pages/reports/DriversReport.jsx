import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsDriversQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import {
  downloadReportCsv,
  driverDetailPath,
  ReportEntityLink,
  ReportInfo,
  reportMoney,
  ReportQueryState,
  unwrapReport,
} from "./reportUi.js";

export default function DriversReport() {
  const f = useReportFilters();
  const { data, isLoading, isError, error, refetch } = useReportsDriversQuery(f.params);
  const { rows, total, summary, currency } = unwrapReport(data);

  const reportData = useMemo(
    () => rows.map((row) => ({ ...row, id: row.driverId })),
    [rows]
  );

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Driver pickup and delivery activity in the selected period. Names open the driver profile
          when a driver ID is present.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Drivers", value: summary.drivers ?? total, tone: "brand" },
            { label: "Pickups", value: summary.pickups ?? 0, tone: "navy" },
            { label: "On-time pickup", value: summary.onTimePickupRate ?? "0%", tone: "warning" },
            { label: "Earnings", value: reportMoney(summary.earnings, currency), tone: "success" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search by driver name…"
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
                  "drivers.csv",
                  [
                    { key: "driverName", header: "Driver" },
                    { key: "email", header: "Email" },
                    { key: "pickups", header: "Pickups" },
                    { key: "deliveries", header: "Deliveries" },
                    { key: "onTimePickups", header: "On-time pickups" },
                    { key: "onTimeDeliveries", header: "On-time deliveries" },
                    { key: "onTimePickupRate", header: "On-time pickup" },
                    { key: "earnings", header: "Earnings" },
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
                key: "driverName",
                header: "Driver",
                render: (row) => (
                  <ReportEntityLink
                    to={driverDetailPath(row.driverId)}
                    name={row.driverName}
                    meta={row.email}
                  />
                ),
              },
              { key: "pickups", header: "Pickups", render: (row) => <DirectoryMetric value={row.pickups} /> },
              { key: "deliveries", header: "Deliveries", render: (row) => <DirectoryMetric value={row.deliveries} /> },
              {
                key: "onTimePickups",
                header: "On-time pickups",
                render: (row) => <DirectoryMetric value={row.onTimePickups ?? "—"} />,
              },
              {
                key: "onTimePickupRate",
                header: "On-time pickup",
                render: (row) => <DirectoryMetric value={row.onTimePickupRate ?? "—"} />,
              },
              {
                key: "earnings",
                header: "Earnings",
                render: (row) => <DirectoryMoney>{reportMoney(row.earnings, currency)}</DirectoryMoney>,
              },
            ]}
            rows={reportData}
            rowKey={(row) => row.id}
            empty="No driver activity in this period"
          />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
