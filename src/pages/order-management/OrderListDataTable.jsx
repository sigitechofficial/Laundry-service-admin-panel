import { useMemo } from "react";
import DataTable from "../../components/ui/DataTable";
import OrderZoneFilter from "./OrderZoneFilter";
import OrderFiltersPopover from "./OrderFiltersPopover";

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
  statusId,
  onStatusIdChange,
  dateRange,
  onDateRangeChange,
  orderStatuses,
  showStatusFilter = false,
  onClearFilters,
  hasActiveFilters,
  stickyLeftFields,
  stickyRightFields,
  height = 600,
  searchInput,
  onSearchInputChange,
  isTableLoading = false,
}) {
  const emptyMessage = useMemo(() => {
    if (zoneId != null && String(zoneId).trim() !== "") {
      return "No orders found for this zone";
    }
    if (hasActiveFilters) {
      return "No orders match these filters";
    }
    return "No orders found";
  }, [zoneId, hasActiveFilters]);

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="Search orders (ID, customer, email, phone)…"
      height={height}
      stickyLeftFields={stickyLeftFields}
      stickyRightFields={stickyRightFields}
      serverSidePagination
      totalRows={totalRows}
      currentPage={page}
      pageSize={pageSize}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      dateRangeValue={dateRange}
      onDateRangeChange={onDateRangeChange}
      searchValue={searchInput}
      onSearchChange={onSearchInputChange}
      isLoading={isTableLoading}
      emptyMessage={emptyMessage}
      filtersSlot={
        <OrderFiltersPopover
          statusId={statusId}
          onStatusChange={onStatusIdChange}
          orderStatuses={orderStatuses}
          showStatusFilter={showStatusFilter}
          onClearFilters={onClearFilters}
          hasActiveFilters={hasActiveFilters}
        />
      }
      toolbarExtra={
        <OrderZoneFilter value={zoneId} onChange={onZoneIdChange} />
      }
    />
  );
}
