import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetAllOrderQuery,
  useGetAllOrderStatusesQuery,
} from "../../../store/services/api";
import DeleteOrderModal from "../order-modals/DeleteOrderModal";
import AssignOrderModal from "../order-modals/AssignOrderModal";
import { useOrderListColumns } from "../useOrderListColumns";
import { mapBookingToOrderListRow } from "../orderListUtils";
import { useOrderListTableFilters } from "../useOrderListTableFilters";
import OrderListDataTable from "../OrderListDataTable";
import { useOrderListPageQueries } from "../useOrderListPageQueries";
import { useOrderListStatsQuery } from "../useOrderListStatsQuery";
import { allOrderMetricItems, downloadOrderListCsv } from "../orderListUtils";
import {
  OrderError,
  OrderHeaderActions,
  OrderMetrics,
  OrderPageHeader,
} from "../OrderWorkspace";

export default function ShopManagement() {
  const navigate = useNavigate();
  const tableFilters = useOrderListTableFilters(25);
  const pickRows = useCallback((res) => res?.data?.orderDetails, []);
  const {
    statsQueryParams,
    rows: orderBookings,
    totalRows,
    isTableLoading,
    isError,
    refetch,
    embeddedCounts,
  } = useOrderListPageQueries({
    tableFilters,
    useListQuery: useGetAllOrderQuery,
    pickRows,
  });
  const { dashboardStats, refetchCounts } =
    useOrderListStatsQuery(statsQueryParams, embeddedCounts);
  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const orderStatuses = useMemo(
    () => (Array.isArray(statusesResponse?.data) ? statusesResponse.data : []),
    [statusesResponse?.data]
  );
  const [deleteModal, setDeleteModal] = useState({ open: false, orderId: null });
  const [assignModal, setAssignModal] = useState({
    open: false,
    orderId: null,
    booking: null,
  });

  const handleDeleteSuccess = () => {
    refetch();
    refetchCounts();
  };

  const customersData = useMemo(
    () => orderBookings.map((booking) => mapBookingToOrderListRow(booking)),
    [orderBookings]
  );

  const customerColumns = useOrderListColumns({
    navigate,
    orderStatuses,
    setDeleteModal,
    setAssignModal,
    showAssign: true,
  });

  return (
    <>
      <div className="min-w-0">
        <OrderPageHeader
          title="Order Management"
          description="Track, filter and act on every order. Cards, table and filters share the same zone, date and status selection."
          actions={
            <OrderHeaderActions
              onExport={() => downloadOrderListCsv(customersData, "orders_export.csv")}
            />
          }
        />

        {isError ? (
          <OrderError>
            Could not load orders. Adjust filters or refresh the page.
          </OrderError>
        ) : null}

        <OrderMetrics
          items={allOrderMetricItems(dashboardStats, {
            filtered: tableFilters.hasActiveFilters,
          })}
        />

        <OrderListDataTable
          data={customersData}
          columns={customerColumns}
          totalRows={totalRows}
          page={tableFilters.page}
          pageSize={tableFilters.pageSize}
          onPageChange={tableFilters.setPage}
          onPageSizeChange={tableFilters.setPageSize}
          zoneId={tableFilters.zoneId}
          onZoneIdChange={tableFilters.setZoneId}
          statusId={tableFilters.statusId}
          onStatusIdChange={tableFilters.setStatusId}
          recurringType={tableFilters.recurringType}
          onRecurringTypeChange={tableFilters.setRecurringType}
          dateRange={tableFilters.dateRange}
          onDateRangeChange={tableFilters.setDateRange}
          orderStatuses={orderStatuses}
          showStatusFilter
          onClearFilters={tableFilters.clearFilters}
          hasActiveFilters={tableFilters.hasActiveFilters}
          searchInput={tableFilters.searchInput}
          onSearchInputChange={tableFilters.setSearchInput}
          sortBy={tableFilters.sortBy}
          onSortByChange={tableFilters.setSortBy}
          sortDir={tableFilters.sortDir}
          onSortDirChange={tableFilters.setSortDir}
          isTableLoading={isTableLoading}
        />
      </div>
      <DeleteOrderModal
        open={deleteModal.open}
        orderId={deleteModal.orderId}
        onClose={() => setDeleteModal({ open: false, orderId: null })}
        onSuccess={handleDeleteSuccess}
      />
      <AssignOrderModal
        open={assignModal.open}
        bookingId={assignModal.orderId}
        bookingSnapshot={assignModal.booking}
        onClose={() =>
          setAssignModal({ open: false, orderId: null, booking: null })
        }
        onSuccess={() => {
          refetch();
          refetchCounts();
        }}
      />
    </>
  );
}
