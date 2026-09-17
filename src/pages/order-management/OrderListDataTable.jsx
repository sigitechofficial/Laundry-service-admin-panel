import { useMemo } from "react";
import OrderListFilters from "./OrderListFilters";
import ListPagination from "./ListPagination";
import { OrderTablePanel } from "./OrderWorkspace";
import styles from "./orderList.module.css";
import { downloadOrderListCsv } from "./orderListUtils";

function toKitColumns(columns = []) {
  return columns.map((c) => ({
    key: c.key || c.field,
    header: c.header || c.headerName,
    align: c.align,
    render: c.render || c.renderCell,
  }));
}

function cellAlign(align) {
  if (align === "center") return "text-center";
  if (align === "right") return "text-right";
  return "text-left";
}

export default function OrderListDataTable({
  data,
  columns,
  totalRows,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  zoneId,
  onZoneIdChange,
  shopId,
  onShopIdChange,
  statusId,
  onStatusIdChange,
  recurringType,
  onRecurringTypeChange,
  dateRange,
  onDateRangeChange,
  orderStatuses,
  showStatusFilter = true,
  onClearFilters,
  hasActiveFilters,
  searchInput,
  onSearchInputChange,
  isTableLoading = false,
  searchPlaceholder = "Search by order ID, customer, shop or service…",
  onDownload,
  downloading = false,
  emptyText,
  lead,
  tableLayout = "default",
  showSort = true,
  showDownload = true,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  sortOptions,
  defaultSortBy,
}) {
  const emptyMessage = useMemo(() => {
    if (isTableLoading && !data?.length) return "Loading orders…";
    if (emptyText) return emptyText;
    if (zoneId != null && String(zoneId).trim() !== "") {
      return "No orders found for this zone";
    }
    if (hasActiveFilters) {
      return "No orders match these filters";
    }
    return "No orders found";
  }, [zoneId, hasActiveFilters, isTableLoading, data?.length, emptyText]);

  const kitColumns = useMemo(() => toKitColumns(columns), [columns]);

  const handleDownload = () => {
    if (onDownload) {
      onDownload();
      return;
    }
    // Page-only fallback: writes just the rows currently rendered. Tabs should
    // pass `onDownload` (useOrderListCsvExport) to export the whole filtered set.
    downloadOrderListCsv(data || [], "orders_export.csv");
  };

  return (
    <div className="w-full min-w-0">
      <OrderTablePanel>
        {lead ? <div className={styles.lead}>{lead}</div> : null}
        <OrderListFilters
          searchInput={searchInput}
          onSearchInputChange={onSearchInputChange}
          searchPlaceholder={searchPlaceholder}
          zoneId={zoneId}
          onZoneIdChange={onZoneIdChange}
          shopId={shopId}
          onShopIdChange={onShopIdChange}
          statusId={statusId}
          onStatusIdChange={onStatusIdChange}
          recurringType={recurringType}
          onRecurringTypeChange={onRecurringTypeChange}
          orderStatuses={orderStatuses}
          showStatusFilter={showStatusFilter}
          dateRange={dateRange}
          onDateRangeChange={onDateRangeChange}
          onClearFilters={onClearFilters}
          hasActiveFilters={hasActiveFilters}
          onDownload={showDownload ? handleDownload : undefined}
          downloading={downloading}
          showSort={showSort}
          sortBy={sortBy}
          onSortByChange={onSortByChange}
          sortDir={sortDir}
          onSortDirChange={onSortDirChange}
          sortOptions={sortOptions}
          defaultSortBy={defaultSortBy}
          extra={
            isTableLoading && data?.length ? (
              <span className="text-xs font-medium text-[#5c6673]">Refreshing…</span>
            ) : null
          }
        />
        <div className={styles.scroll}>
          <table
            className={`${styles.table} ${
              tableLayout === "fluid"
                ? styles.tableFluid
                : tableLayout === "grow"
                  ? styles.tableGrow
                  : tableLayout === "default"
                    ? styles.tableLayout
                    : ""
            }`}
          >
            <thead>
              <tr>
                {kitColumns.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    className={cellAlign(c.align)}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!data?.length ? (
                <tr>
                  <td colSpan={kitColumns.length} className={styles.empty}>
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {kitColumns.map((c) => (
                      <td
                        key={c.key}
                        className={cellAlign(c.align)}
                      >
                        {c.render ? c.render(row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className={styles.footer}>
          <ListPagination
            page={page}
            pageSize={pageSize}
            totalRows={totalRows}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      </OrderTablePanel>
    </div>
  );
}
