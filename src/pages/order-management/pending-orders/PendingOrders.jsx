import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetPendingOrdersQuery,
  useGetAllOrderStatusesQuery,
} from "../../../store/services/api";
import DeleteOrderModal from "../order-modals/DeleteOrderModal";
import AssignOrderModal from "../order-modals/AssignOrderModal";
import { useOrderListColumns } from "../useOrderListColumns";
import { mapBookingToOrderListRow, tabOrderMetricItems } from "../orderListUtils";
import { useOrderListTableFilters } from "../useOrderListTableFilters";
import OrderListDataTable from "../OrderListDataTable";
import { useOrderListPageQueries } from "../useOrderListPageQueries";
import { useOrderListStatsQuery } from "../useOrderListStatsQuery";
import { OrderError, OrderMetrics, OrderPageHeader } from "../OrderWorkspace";

export default function PendingOrders() {
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
    useListQuery: useGetPendingOrdersQuery,
    pickRows,
    totalCountField: "pendingOrdersCount",
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
          title="Pending Orders"
          description="Prioritize orders still moving through assignment, service, pickup or delivery."
        />

        {isError ? (
          <OrderError>
            Could not load pending orders. Adjust filters or refresh the page.
          </OrderError>
        ) : null}

        <OrderMetrics
          items={tabOrderMetricItems({
            tabLabel: "Pending orders",
            tabValue: totalRows,
            tabTone: "navy",
            stats: dashboardStats,
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
