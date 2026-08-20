import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsCancellationsQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { downloadReportCsv, ReportInfo, reportMoney, ReportQueueLink, reportShare, ReportQueryState, unwrapReport } from "./reportUi.js";

export default function CancellationsReport() {
  const f = useReportFilters();
  const { data, isLoading, isError, error, refetch } = useReportsCancellationsQuery(f.params);
  const { rows, total, summary, currency } = unwrapReport(data);

  const reportData = useMemo(
    () =>
      rows.map((row, idx) => ({
        ...row,
        id: `${row.reason || idx}`,
        cancelShare: reportShare(row.cancelledOrders, summary.cancelled),
      })),
    [rows, summary.cancelled]
  );

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Cancellation and no-show reasons in the selected period. Reason rows stay here; open the
          cancelled-orders queue for individual bookings.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Cancelled", value: summary.cancelled ?? 0, tone: "danger" },
            { label: "Cancel rate", value: summary.cancelRate ?? "0%", tone: "warning" },
            { label: "No-shows", value: summary.noShowOrders ?? 0, tone: "navy" },
            { label: "No-show fees", value: reportMoney(summary.noShowFees, currency), tone: "brand" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search reasons…"
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
              extraTools={<ReportQueueLink to="/orders/cancel-orders">Open cancelled orders</ReportQueueLink>}
              onExport={() =>
                downloadReportCsv(
                  "cancellations.csv",
                  [
                    { key: "reason", header: "Reason" },
                    { key: "cancelledOrders", header: "Cancelled" },
                    { key: "cancelShare", header: "Share" },
                    { key: "noShowOrders", header: "No-shows" },
                    { key: "noShowFees", header: "No-show fees" },
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
              { key: "reason", header: "Reason", render: (row) => <DirectoryIdentity name={row.reason} /> },
              { key: "cancelledOrders", header: "Cancelled", render: (row) => <DirectoryMetric value={row.cancelledOrders} /> },
              { key: "cancelShare", header: "Share", render: (row) => <DirectoryMetric value={row.cancelShare} /> },
              { key: "noShowOrders", header: "No-shows", render: (row) => <DirectoryMetric value={row.noShowOrders} /> },
              {
                key: "noShowFees",
                header: "No-show fees",
                render: (row) => <DirectoryMoney>{reportMoney(row.noShowFees, currency)}</DirectoryMoney>,
              },
            ]}
            rows={reportData}
            rowKey={(row) => row.id}
            empty="No cancellations in this period"
          />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
