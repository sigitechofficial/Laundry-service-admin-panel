import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../../shared/icons/index";
import StatCard from "../../../components/ui/StatCard";
import { useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import ActionButtons from "../../../components/ui/ActionButtons";
import {
  useGetOnHoldBookingsQuery,
  useGetAllOrderStatusesQuery,
} from "../../../store/services/api";
import { dateTimeFormat } from "../../../shared/constants";
import {
  canEditOrderFromBooking,
  resolveOrderStatusTitle,
} from "../../../shared/orderEditStatusGate";
import DeleteOrderModal from "../order-modals/DeleteOrderModal";
import { formatOrderMoney } from "../orderListTable";
import { useOrderListTableFilters } from "../useOrderListTableFilters";
import OrderListDataTable from "../OrderListDataTable";
import { useOrderListPageQueries } from "../useOrderListPageQueries";
import { useOrderListStatsQuery } from "../useOrderListStatsQuery";

const ON_HOLD_STICKY_LEFT = ["orderId", "orderPlacedAt"];

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
  const pickRows = useCallback(
    (res) => onHoldBookingsFromResponse(res),
    []
  );
  const {
    statsQueryParams,
    rows: orderBookings,
    totalRows,
    isTableLoading,
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

  const handleDeleteSuccess = () => {
    refetch();
    refetchCounts();
  };

  const customersData = useMemo(
    () =>
      orderBookings.map((booking) => {
        const pickupDate = booking?.collectionDate
          ? dayjs(booking.collectionDate).format("DD MMM YYYY")
          : "—";
        const pickupTime =
          booking?.collectionTimeFrom && booking?.collectionTimeTo
            ? `${booking.collectionTimeFrom.slice(0, 5)} – ${booking.collectionTimeTo.slice(0, 5)}`
            : "—";
        const deliveryDate = booking?.deliveryDate
          ? dayjs(booking.deliveryDate).format("DD MMM YYYY")
          : "—";
        const deliveryTime =
          booking?.deliveryTimeFrom && booking?.deliveryTimeTo
            ? `${booking.deliveryTimeFrom.slice(0, 5)} – ${booking.deliveryTimeTo.slice(0, 5)}`
            : "—";
        const createdRaw = booking?.createdAt;
        const pickupLine =
          pickupDate !== "—" ? `${pickupDate} · ${pickupTime}` : "—";
        const deliveryLine =
          deliveryDate !== "—" ? `${deliveryDate} · ${deliveryTime}` : "—";

        return {
          id: booking?.id,
          orderId: booking?.orderTrackId || booking?.id,
          orderPlacedAt: createdRaw ? dayjs(createdRaw).valueOf() : 0,
          orderDateTime: createdRaw
            ? dayjs(createdRaw).format(dateTimeFormat)
            : "—",
          frequency: booking?.frequency || "—",
          totalItems: booking?.totalItems ?? "—",
          noOfBags: booking?.noOfBags ?? "—",
          pickupLine,
          deliveryLine,
          scheduleSort: booking?.collectionDate
            ? dayjs(booking.collectionDate).valueOf()
            : 0,
          onHoldReason:
            booking?.onHoldReason || booking?.OnHoldOtherReason || "—",
          costAmount:
            booking?.orderAmount != null ? Number(booking.orderAmount) : null,
          OrderStatus: resolveOrderStatusTitle(booking),
          _booking: booking,
          actions: "actions",
        };
      }),
    [orderBookings]
  );

  const customerColumns = useMemo(
    () => [
      {
        field: "orderId",
        headerName: "Order",
        minWidth: 118,
        renderCell: (row) => (
          <Typography
            component="button"
            type="button"
            onClick={() => navigate(`/orders/details/${row.id}`)}
            sx={{
              fontSize: 13,
              fontWeight: 600,
              color: "primary.main",
              background: "none",
              border: "none",
              p: 0,
              cursor: "pointer",
              fontFamily: "inherit",
              "&:hover": { textDecoration: "underline" },
            }}
          >
            #{row.orderId}
          </Typography>
        ),
      },
      {
        field: "orderPlacedAt",
        headerName: "Placed",
        minWidth: 132,
        renderCell: (row) => {
          if (!row.orderPlacedAt) return "—";
          const d = dayjs(row.orderPlacedAt);
          return (
            <Box sx={{ py: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
                {d.format("DD MMM YYYY")}
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 12, color: "text.secondary" }}>
                {d.format("hh:mm A")}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: "frequency",
        headerName: "Frequency",
        minWidth: 110,
      },
      {
        field: "totalItems",
        headerName: "Items & bags",
        minWidth: 120,
        renderCell: (row) => (
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            {row.totalItems} items · {row.noOfBags} bags
          </Typography>
        ),
      },
      {
        field: "scheduleSort",
        headerName: "Pickup & delivery",
        minWidth: 210,
        wrap: true,
        renderCell: (row) => (
          <Box
            sx={{ py: 0.5, whiteSpace: "normal" }}
            title={`Pickup: ${row.pickupLine}\nDelivery: ${row.deliveryLine}`}
          >
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              <Box component="span" sx={{ color: "text.secondary" }}>
                Pickup:{" "}
              </Box>
              {row.pickupLine}
            </Typography>
            <Typography variant="body2" sx={{ fontSize: 13, color: "text.secondary" }}>
              <Box component="span">Delivery: </Box>
              {row.deliveryLine}
            </Typography>
          </Box>
        ),
      },
      {
        field: "onHoldReason",
        headerName: "On-hold reason",
        minWidth: 200,
        wrap: true,
        renderCell: (row) => (
          <Typography
            variant="body2"
            sx={{
              fontSize: 13,
              whiteSpace: "normal",
              lineHeight: 1.4,
              maxWidth: 260,
            }}
            title={row.onHoldReason}
          >
            {row.onHoldReason}
          </Typography>
        ),
      },
      {
        field: "costAmount",
        headerName: "Amount",
        minWidth: 96,
        align: "right",
        renderCell: (row) => (
          <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
            {formatOrderMoney(row.costAmount)}
          </Typography>
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 200,
        sortable: false,
        renderCell: (row) => (
          <ActionButtons
            showEdit={canEditOrderFromBooking(row._booking, orderStatuses)}
            onView={() => navigate(`/orders/details/${row.id}`)}
            onEdit={() => navigate(`/orders/edit/${row.id}`)}
            onDelete={() => setDeleteModal({ open: true, orderId: row.id })}
          />
        ),
      },
    ],
    [navigate, orderStatuses]
  );

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
                title="On Hold ORDERS"
                value={totalRows}
                bgColor="bg-green50"
              />
            </div>

            <Typography
              variant="body2"
              sx={{ fontSize: 13, color: "text.secondary", mt: -4 }}
            >
              On-hold list ({totalRows} matching filters). Table is paginated —
              use the footer to browse all on-hold orders.
            </Typography>

            <div className="w-full min-w-0">
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
                onClearFilters={tableFilters.clearFilters}
                hasActiveFilters={tableFilters.hasActiveFilters}
                stickyLeftFields={ON_HOLD_STICKY_LEFT}
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
    </>
  );
}
