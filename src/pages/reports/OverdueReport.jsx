import { useMemo } from "react";
import { Table } from "../../design-system";
import {
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useReportsOverdueQuery } from "../../store/services/api";
import ReportToolbar, { ReportPagination } from "./ReportToolbar";
import { useReportFilters } from "./reportQueryUtils";
import {
  downloadReportCsv,
  ReportEntityLink,
  ReportInfo,
  ReportQueryState,
  shopDetailPath,
  unwrapReport,
} from "./reportUi.js";

export default function OverdueReport() {
  const f = useReportFilters();
  const { data, isLoading, isError, error, refetch } = useReportsOverdueQuery(f.params);
  const { rows, total, summary } = unwrapReport(data);

  const reportData = useMemo(
    () => rows.map((row) => ({ ...row, id: row.shopId || row.shopName })),
    [rows]
  );

  return (
    <ReportQueryState isLoading={isLoading} isError={isError} error={error} onRetry={refetch}>
      <div>
        <ReportInfo>
          Live SLA snapshot of shops with overdue pickups or deliveries. Period and dates do not
          apply. Shop names open the shop profile.
        </ReportInfo>
        <DirectoryMetrics
          items={[
            { label: "Shops affected", value: summary.shops ?? total, tone: "brand" },
            { label: "Overdue pickup", value: summary.overduePickup ?? 0, tone: "warning" },
            { label: "Overdue delivery", value: summary.overdueDelivery ?? 0, tone: "danger" },
          ]}
        />
        <DirectoryTableWrap
          toolbar={
            <ReportToolbar
              search={f.search}
              onSearch={f.setSearch}
              searchPlaceholder="Search by shop…"
              hideSearch={false}
              zoneId={f.zoneId}
              onZoneIdChange={f.setZoneId}
              shopId={f.shopId}
              onShopIdChange={f.setShopId}
              onClear={f.clearFilters}
              onExport={() =>
                downloadReportCsv(
                  "overdue.csv",
                  [
                    { key: "shopName", header: "Shop" },
                    { key: "zoneName", header: "Zone" },
                    { key: "overduePickup", header: "Overdue pickup" },
                    { key: "overdueDelivery", header: "Overdue delivery" },
                    { key: "totalOverdue", header: "Total" },
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
                key: "shopName",
                header: "Shop",
                render: (row) => (
                  <ReportEntityLink to={shopDetailPath(row.shopId)} name={row.shopName} />
                ),
              },
              {
                key: "zoneName",
                header: "Zone",
                render: (row) => row.zoneName || "—",
              },
              { key: "overduePickup", header: "Overdue pickup", render: (row) => <DirectoryMetric value={row.overduePickup} /> },
              { key: "overdueDelivery", header: "Overdue delivery", render: (row) => <DirectoryMetric value={row.overdueDelivery} /> },
              { key: "totalOverdue", header: "Total", render: (row) => <DirectoryMetric value={row.totalOverdue} /> },
            ]}
            rows={reportData}
            rowKey={(row) => row.id}
            empty="No overdue pickups or deliveries"
          />
        </DirectoryTableWrap>
      </div>
    </ReportQueryState>
  );
}
