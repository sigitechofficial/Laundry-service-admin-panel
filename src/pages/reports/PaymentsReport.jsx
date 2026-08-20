import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsPaymentsQuery } from "../../store/services/api";
import ReportToolbar from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { downloadReportCsv, ReportInfo, reportMoney, ReportQueueLink, ReportQueryState, unwrapReport } from "./reportUi.js";

export default function PaymentsReport() {
  const f = useReportFilters({ paginated: false });
  const { data, isLoading, isError, error, refetch } = useReportsPaymentsQuery(f.params);
  const { rows, summary, currency, failures } = unwrapReport(data);

  const mixRows = useMemo(
    () =>
      rows.map((row, idx) => ({
        ...row,
        id: `mix-${row.method || idx}`,
      })),
    [rows]
  );

  const failureRows = useMemo(
    () =>
      failures.map((row, idx) => ({
        ...row,
        id: `fail-${row.reasonCode || idx}`,
      })),
    [failures]
  );

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Payment method mix and failed-card attempts for the selected period. Search is not
          supported. Use the payment-failures queue for operational follow-up — this report does not
          include booking IDs.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Orders", value: summary.orders ?? 0, tone: "brand" },
            { label: "Card", value: summary.cardOrders ?? 0, tone: "navy" },
            { label: "Cash", value: summary.cashOrders ?? 0, tone: "warning" },
            { label: "Revenue", value: reportMoney(summary.revenue, currency), tone: "success" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              hideSearch
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
                  "payments-mix.csv",
                  [
                    { key: "method", header: "Method" },
                    { key: "orders", header: "Orders" },
                    { key: "share", header: "Share" },
                    { key: "revenue", header: "Revenue" },
                  ],
                  mixRows
                )
              }
              exportDisabled={!mixRows.length}
            />
          }
        >
          <Table
            columns={[
              { key: "method", header: "Method", render: (row) => <DirectoryIdentity name={row.method} /> },
              { key: "orders", header: "Orders", render: (row) => <DirectoryMetric value={row.orders} /> },
              { key: "share", header: "Share", render: (row) => <DirectoryMetric value={row.share ?? "—"} /> },
              {
                key: "revenue",
                header: "Revenue",
                render: (row) => <DirectoryMoney>{reportMoney(row.revenue, currency)}</DirectoryMoney>,
              },
            ]}
            rows={mixRows}
            rowKey={(row) => row.id}
            empty="No payment mix in this period"
          />
        </DirectoryTableWrap>

        <div style={{ height: 24 }} />
        <DirectoryMetrics
          items={[
            { label: "Failed attempts", value: summary.failedAttempts ?? 0, tone: "danger" },
            { label: "Failed bookings", value: summary.failedBookings ?? 0, tone: "warning" },
            { label: "Failed amount", value: reportMoney(summary.failedAmount, currency), tone: "danger" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              hideSearch
              extraTools={<ReportQueueLink to="/orders/payment-failures">Open payment failures</ReportQueueLink>}
              onExport={() =>
                downloadReportCsv(
                  "payment-failures.csv",
                  [
                    { key: "reason", header: "Reason" },
                    { key: "reasonCode", header: "Code" },
                    { key: "attempts", header: "Attempts" },
                    { key: "bookings", header: "Bookings" },
                    { key: "amount", header: "Amount" },
                  ],
                  failureRows
                )
              }
              exportDisabled={!failureRows.length}
            />
          }
        >
          <Table
            columns={[
              { key: "reason", header: "Failure reason", render: (row) => <DirectoryIdentity name={row.reason} meta={row.reasonCode} /> },
              { key: "attempts", header: "Attempts", render: (row) => <DirectoryMetric value={row.attempts} /> },
              { key: "bookings", header: "Bookings", render: (row) => <DirectoryMetric value={row.bookings} /> },
              {
                key: "amount",
                header: "Amount",
                render: (row) => <DirectoryMoney>{reportMoney(row.amount, currency)}</DirectoryMoney>,
              },
            ]}
            rows={failureRows}
            rowKey={(row) => row.id}
            empty="No payment failures in this period"
          />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
