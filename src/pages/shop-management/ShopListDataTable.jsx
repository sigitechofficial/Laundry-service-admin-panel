import { useMemo } from "react";
import DataTable from "../../components/ui/DataTable";
import OrderZoneFilter from "../order-management/OrderZoneFilter";
import ShopFiltersPopover from "./ShopFiltersPopover";
import {
  SHOP_TABLE_STICKY_LEFT_FIELDS,
  SHOP_TABLE_STICKY_RIGHT_FIELDS,
} from "../../shared/constants";

export default function ShopListDataTable({
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
  onClearFilters,
  hasActiveFilters,
  height = 600,
  searchInput,
  onSearchInputChange,
  isTableLoading = false,
  stickyLeftFields = SHOP_TABLE_STICKY_LEFT_FIELDS,
  stickyRightFields = SHOP_TABLE_STICKY_RIGHT_FIELDS,
}) {
  const emptyMessage = useMemo(() => {
    if (zoneId != null && String(zoneId).trim() !== "") {
      return "No shops found for this zone";
    }
    if (hasActiveFilters) {
      return "No shops match these filters";
    }
    return "No shops found";
  }, [zoneId, hasActiveFilters]);

  return (
    <DataTable
      data={data}
      columns={columns}
      searchPlaceholder="Search by shop name, email, address..."
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
        <ShopFiltersPopover
          statusId={statusId}
          onStatusChange={onStatusIdChange}
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
