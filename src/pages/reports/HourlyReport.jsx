import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsHourlyQuery } from "../../store/services/api";
import ReportToolbar from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import { downloadReportCsv, ReportInfo, reportShare, ReportQueryState, unwrapReport } from "./reportUi.js";

export default function HourlyReport() {
  const f = useReportFilters({ paginated: false });
  const { data, isLoading, isError, error, refetch } = useReportsHourlyQuery(f.params);
  const { rows, summary } = unwrapReport(data);

  const reportData = useMemo(
    () =>
      rows.map((row, idx) => ({
        id: `${row.sl || idx + 1}-${idx}`,
        sl: row.sl ?? idx + 1,
        hours: row.hours ?? "—",
        pickupOrders: row.pickupOrders ?? 0,
        deliveryOrders: row.deliveryOrders ?? 0,
        totalActivity: row.totalActivity ?? 0,
        pickupShare: reportShare(row.pickupOrders, row.totalActivity),
        deliveryShare: reportShare(row.deliveryOrders, row.totalActivity),
      })),
    [rows]
  );

  const columns = [
    { key: "hours", header: "Hours", render: (row) => <DirectoryIdentity name={row.hours} /> },
    { key: "pickupOrders", header: "Pickup", render: (row) => <DirectoryMetric value={row.pickupOrders} /> },
    { key: "deliveryOrders", header: "Delivery", render: (row) => <DirectoryMetric value={row.deliveryOrders} /> },
    {
      key: "pickupShare",
      header: "Pickup share",
      render: (row) => <DirectoryMetric value={row.pickupShare} />,
    },
    {
      key: "deliveryShare",
      header: "Delivery share",
      render: (row) => <DirectoryMetric value={row.deliveryShare} />,
    },
    { key: "totalActivity", header: "Total", render: (row) => <DirectoryMetric value={row.totalActivity} /> },
  ];

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Pickup and delivery volume by hour of day for the selected period. Search is not supported,
          and hour buckets do not open individual orders.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Hours", value: summary.hours ?? reportData.length, tone: "brand" },
            { label: "Pickup", value: summary.pickup ?? 0, tone: "navy" },
            { label: "Delivery", value: summary.delivery ?? 0, tone: "warning" },
            { label: "Activity", value: summary.activity ?? 0, tone: "success" },
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
                  "hourly-activity.csv",
                  [
                    { key: "hours", header: "Hours" },
                    { key: "pickupOrders", header: "Pickup" },
                    { key: "deliveryOrders", header: "Delivery" },
                    { key: "pickupShare", header: "Pickup share" },
                    { key: "deliveryShare", header: "Delivery share" },
                    { key: "totalActivity", header: "Total" },
                  ],
                  reportData
                )
              }
              exportDisabled={!reportData.length}
            />
          }
        >
          <Table columns={columns} rows={reportData} rowKey={(row) => row.id} empty="No hourly activity in this period" />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
