import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../../shared/icons/index";
import { Delay } from "../../../components/shared/Loaders";
import StatCard from "../../../components/ui/StatCard";
import { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetPendingOrdersQuery,
  useGetAllOrderStatusesQuery,
} from "../../../store/services/api";
import {
  ORDER_TABLE_STICKY_LEFT_FIELDS,
  ORDER_TABLE_STICKY_RIGHT_FIELDS,
} from "../../../shared/constants";
import DeleteOrderModal from "../order-modals/DeleteOrderModal";
import AssignOrderModal from "../order-modals/AssignOrderModal";
import {
  buildOrderListColumns,
  mapBookingToOrderListRow,
} from "../orderListTable";
import { useOrderListTableFilters } from "../useOrderListTableFilters";
import OrderListDataTable from "../OrderListDataTable";
import { useOrderListPageQueries } from "../useOrderListPageQueries";
import { useOrderListStatsQuery } from "../useOrderListStatsQuery";

export default function PendingOrders() {
  const navigate = useNavigate();
  const tableFilters = useOrderListTableFilters(25);
  const pickRows = useCallback((res) => res?.data?.orderDetails, []);
  const {
    statsQueryParams,
    rows: orderBookings,
    totalRows,
    isTableLoading,
    isLoading,
    refetch,
    tableFilterKey,
  } = useOrderListPageQueries({
    tableFilters,
    useListQuery: useGetPendingOrdersQuery,
    pickRows,
    totalCountField: "pendingOrdersCount",
  });
  const { dashboardStats, refetchCounts } =
    useOrderListStatsQuery(statsQueryParams);
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

  const customerColumns = useMemo(
    () =>
      buildOrderListColumns({
        navigate,
        orderStatuses,
        setDeleteModal,
        setAssignModal,
        showAssign: true,
      }),
    [navigate, orderStatuses]
  );

  if (isLoading && orderBookings.length === 0) return <Delay />;

  return (
    <>
    <div className="!space-y-11">
            <Box className="flex items-center gap-x-5 justify-between">
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Order Management
                </Typography>
              </Box>
            </Box>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter">
              <StatCard
                title="TOTAL ORDERS"
                value={dashboardStats.total}
                bgColor="bg-purple50"
              />

              <StatCard
                title="Pending ORDERS"
                value={dashboardStats.pending}
                bgColor="bg-green50"
              />
            </div>

            <Typography
              variant="body2"
              sx={{ fontSize: 13, color: "text.secondary", mt: -4 }}
            >
              Pending list ({totalRows} matching filters). Table is paginated —
              use the footer to browse all pending orders.
            </Typography>

            <div className="w-full min-w-0">
              <OrderListDataTable
                key={tableFilterKey}
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
                stickyLeftFields={ORDER_TABLE_STICKY_LEFT_FIELDS}
                stickyRightFields={ORDER_TABLE_STICKY_RIGHT_FIELDS}
                searchInput={tableFilters.searchInput}
                onSearchInputChange={tableFilters.setSearchInput}
                isTableLoading={isTableLoading}
              />
            </div>
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
