import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetOnHoldBookingsQuery,
  useGetAllOrderStatusesQuery,
} from "../../../store/services/api";
import DeleteOrderModal from "../order-modals/DeleteOrderModal";
import AssignOrderModal from "../order-modals/AssignOrderModal";
import { useOrderListColumns } from "../useOrderListColumns";
import {
  mapBookingToOrderListRow,
  tabOrderMetricItems,
} from "../orderListUtils";
import { useOrderListTableFilters } from "../useOrderListTableFilters";
import OrderListDataTable from "../OrderListDataTable";
import { useOrderListPageQueries } from "../useOrderListPageQueries";
import { useOrderListStatsQuery } from "../useOrderListStatsQuery";
import { OrderError, OrderMetrics, OrderPageHeader } from "../OrderWorkspace";

function onHoldBookingsFromResponse(data) {
  return (
    data?.data?.onHoldBookings ??
    data?.data?.data?.onHoldBookings ??
    []
  );
}

export default function OnHoldOrders() {
  const navigate = useNavigate();
  const tableFilters = useOrderListTableFilters(25);
  const pickRows = useCallback((res) => onHoldBookingsFromResponse(res), []);
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
    useListQuery: useGetOnHoldBookingsQuery,
    pickRows,
    totalCountField: "onHoldOrdersCount",
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
    () =>
      orderBookings.map((booking) => ({
        ...mapBookingToOrderListRow(booking),
        onHoldReason: booking?.onHoldReason || booking?.OnHoldOtherReason || "—",
      })),
    [orderBookings]
  );

  const extraColumns = useMemo(
    () => [
      {
        key: "onHoldReason",
        header: "Why on hold",
        render: (row) => (
          <div
            className="max-w-[220px] truncate text-[13px] text-[#38424f]"
            title={row.onHoldReason}
          >
            {row.onHoldReason}
          </div>
        ),
      },
    ],
    []
  );

  const customerColumns = useOrderListColumns({
    navigate,
    orderStatuses,
    setDeleteModal,
    setAssignModal,
    showAssign: true,
    extraColumns,
  });

  return (
    <>
      <div className="min-w-0">
        <OrderPageHeader
          title="On Hold Orders"
          description="Resolve operational holds with the reason, schedule and order value visible together."
        />

        {isError ? (
          <OrderError>
            Could not load on-hold orders. Adjust filters or refresh the page.
          </OrderError>
        ) : null}

        <OrderMetrics
          items={tabOrderMetricItems({
            tabLabel: "On hold orders",
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
