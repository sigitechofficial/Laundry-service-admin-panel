import { useMemo, useState } from "react";
import { Button, Table } from "../../design-system";
import {
  DirectoryActions,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryTableWrap,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { useReportsOnHoldQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { downloadReportCsv, ReportInfo, ReportQueueLink, ReportQueryState, unwrapReport } from "./reportUi.js";

export default function OnHoldReport() {
  const f = useReportFilters();
  const [viewRow, setViewRow] = useState(null);
  const { data, isLoading, isError, error, refetch } = useReportsOnHoldQuery(f.params);
  const { rows, total, summary } = unwrapReport(data);

  const reportData = useMemo(
    () =>
      rows.map((row, idx) => ({
        id: `${row.orderId || idx}-${idx}`,
        sl: row.sl ?? idx + 1,
        orderId: row.orderId ?? "—",
        customerName: row.customerName ?? "—",
        email: row.email ?? "—",
        phone: row.phone ?? "—",
        items: row.items ?? 0,
        onHoldReason: row.onHoldReason ?? "—",
        status: row.status ?? "—",
        resolution: row.resolution ?? "—",
      })),
    [rows]
  );

  const columns = [
    {
      key: "customerName",
      header: "Order",
      render: (row) => (
        <DirectoryIdentity name={row.customerName} meta={row.orderId} />
      ),
    },
    {
      key: "email",
      header: "Contact",
      render: (row) => <DirectoryIdentity name={row.email} meta={row.phone} />,
    },
    {
      key: "items",
      header: "Items",
      render: (row) => <DirectoryMetric value={row.items} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryDotPill tone="warning">{row.status}</DirectoryDotPill>,
    },
    {
      key: "onHoldReason",
      header: "Reason",
      render: (row) => <DirectoryIdentity name={row.onHoldReason} meta={row.resolution} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => setViewRow(row)}>
            View
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Orders currently on hold in the selected period. Open the on-hold queue for operational
          follow-up. This list returns track IDs, not booking IDs, so rows do not open order details.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "On hold", value: summary.onHold ?? total, tone: "warning" },
            ...(Array.isArray(summary.reasons) ? summary.reasons.slice(0, 3) : []).map((reason, index) => ({
              label: reason.reason || "Reason",
              value: reason.count ?? 0,
              tone: index === 0 ? "navy" : "brand",
            })),
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search by order ID or reason…"
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
              extraTools={<ReportQueueLink to="/orders/on-hold-orders">Open on-hold queue</ReportQueueLink>}
              onExport={() =>
                downloadReportCsv(
                  "on-hold.csv",
                  [
                    { key: "orderId", header: "Order" },
                    { key: "customerName", header: "Customer" },
                    { key: "email", header: "Email" },
                    { key: "phone", header: "Phone" },
                    { key: "items", header: "Items" },
                    { key: "status", header: "Status" },
                    { key: "onHoldReason", header: "Reason" },
                    { key: "resolution", header: "Last update" },
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
          <Table columns={columns} rows={reportData} rowKey={(row) => row.id} empty="No on-hold orders in this period" />
        </DirectoryTableWrap>
        <DirectoryViewModal
          open={Boolean(viewRow)}
          title={viewRow?.orderId || "On-hold order"}
          onClose={() => setViewRow(null)}
          fields={[
            { label: "Order ID", value: viewRow?.orderId },
            { label: "Customer", value: viewRow?.customerName },
            { label: "Email", value: viewRow?.email },
            { label: "Phone", value: viewRow?.phone },
            { label: "Items", value: viewRow?.items },
            { label: "Reason", value: viewRow?.onHoldReason },
            { label: "Status", value: viewRow?.status },
            { label: "Last update", value: viewRow?.resolution },
          ]}
        />
      </div>
    </ReportQueryState>
  );
}
