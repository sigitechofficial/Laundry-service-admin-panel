import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { BsCardList } from "../../../shared/icons/index";
import { Delay } from "../../../components/shared/Loaders";
import DataTable from "../../../components/ui/DataTable";
import useToaster from "../../../components/ui/Toaster";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { useGetActionRequiredOrdersQuery, useGetAllOrderStatusesQuery } from "../../../store/services/api";
import { dateTimeFormat } from "../../../shared/constants";
import OrderZoneFilter from "../OrderZoneFilter";
import OrderFiltersPopover from "../OrderFiltersPopover";
import {
  LabelValue,
  resolveOrderSchedulePhase,
} from "../orderListTable";

/**
 * Column roles:
 * - Status → booking pipeline state
 * - Why action needed → admin exception reason chip(s)
 * - Pickup & delivery → scheduled slots (same pattern as other order tabs)
 */
const FILTERS = [
  { value: "all", label: "All" },
  { value: "payment_failed", label: "Payment" },
  { value: "on_hold", label: "On hold" },
  { value: "needs_assignment", label: "Unassigned shop" },
  { value: "overdue_pickup", label: "Overdue pickup" },
  { value: "pickup_reschedule", label: "Pickup" },
  { value: "overdue_delivery", label: "Overdue delivery" },
  { value: "delivery_failed", label: "Delivery" },
];

const REASON_COLORS = {
  payment_failed: "error",
  on_hold: "warning",
  needs_assignment: "warning",
  overdue_pickup: "warning",
  pickup_reschedule: "info",
  overdue_delivery: "warning",
  delivery_failed: "error",
};

function openPathForItem(item) {
  if (item.reasons?.includes("payment_failed")) {
    return "/orders/payment-failures";
  }
  if (item.reasons?.includes("on_hold")) {
    return "/orders/on-hold-orders";
  }
  return `/orders/details/${item.id}`;
}

function schedulePhaseForRow(row) {
  const reasons = row.reasons || [];
  if (
    reasons.includes("overdue_pickup") ||
    reasons.includes("pickup_reschedule")
  ) {
    return "pickup";
  }
  if (
    reasons.includes("overdue_delivery") ||
    reasons.includes("delivery_failed")
  ) {
    return "delivery";
  }
  return resolveOrderSchedulePhase(row, row.bookingStatusTitle);
}

export default function ActionRequiredOrders() {
  const navigate = useNavigate();
  const { error: showError } = useToaster();
  const [filter, setFilter] = useState("all");
  const [zoneId, setZoneId] = useState("");
  const [statusId, setStatusId] = useState("");
  const [dateRange, setDateRange] = useState(null);

  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const orderStatuses = useMemo(
    () => (Array.isArray(statusesResponse?.data) ? statusesResponse.data : []),
    [statusesResponse?.data]
  );

  const listParams = useMemo(() => {
    const params = {};
    if (filter !== "all") params.reason = filter;
    if (zoneId != null && String(zoneId).trim() !== "") {
      params.zoneId = String(zoneId);
    }
    if (dateRange?.startDate && dateRange?.endDate) {
      params.startDate = dayjs(dateRange.startDate).format("YYYY-MM-DD");
      params.endDate = dayjs(dateRange.endDate).format("YYYY-MM-DD");
    }
    return params;
  }, [filter, zoneId, dateRange]);

  const hasActiveFilters = Boolean(
    (zoneId != null && String(zoneId).trim() !== "") ||
      (statusId != null && String(statusId).trim() !== "") ||
      (dateRange?.startDate && dateRange?.endDate)
  );

  const clearFilters = () => {
    setZoneId("");
    setStatusId("");
    setDateRange(null);
  };

  const { data, currentData, isLoading, isError, refetch, isFetching } =
    useGetActionRequiredOrdersQuery(listParams);

  useEffect(() => {
    if (isError) {
      showError("Could not load action-required orders");
    }
  }, [isError, showError]);

  const payload = currentData ?? (isFetching ? undefined : data);
  const items = payload?.data?.items || [];
  const countsByReason = payload?.data?.countsByReason || {};
  const total =
    payload?.data?.totalCount ?? payload?.data?.count ?? items.length;

  const visibleItems = useMemo(() => {
    if (statusId == null || String(statusId).trim() === "") return items;
    const want = Number(statusId);
    return items.filter((row) => Number(row.bookingStatusId) === want);
  }, [items, statusId]);

  const listCount = visibleItems.length;

  const tableData = useMemo(
    () =>
      visibleItems.map((row) => {
        const placedRaw = row.createdAt;
        const pickupDateTime = row.collectionDate
          ? dayjs(row.collectionDate).format(dateTimeFormat)
          : "—";
        const deliveryDateTime = row.deliveryDate
          ? dayjs(row.deliveryDate).format(dateTimeFormat)
          : "—";
        return {
          id: row.id,
          orderId: row.orderTrackId || String(row.id),
          orderPlacedAt: placedRaw ? dayjs(placedRaw).valueOf() : 0,
          orderPlaced: placedRaw
            ? dayjs(placedRaw).format(dateTimeFormat)
            : "—",
          customer: row.customer?.name || "—",
          phone: row.customer?.phoneNum || "—",
          zone: row.zoneName || "—",
          status: row.bookingStatusTitle || `Status ${row.bookingStatusId}`,
          reasons: row.reasonLabels || [],
          reasonKeys: row.reasons || [],
          pickupAt: row.collectionDate
            ? dayjs(row.collectionDate).valueOf()
            : 0,
          pickupDateTime,
          deliveryDateTime,
          schedulePhase: schedulePhaseForRow(row),
          updatedAt: row.updatedAt
            ? dayjs(row.updatedAt).format(dateTimeFormat)
            : "—",
          raw: row,
        };
      }),
    [visibleItems]
  );

  const columns = useMemo(
    () => [
      {
        field: "orderId",
        headerName: "Order",
        minWidth: 130,
        renderCell: (row) => (
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{ cursor: "pointer", color: "primary.main" }}
            onClick={() => navigate(`/orders/details/${row.id}`)}
          >
            #{row.orderId}
          </Typography>
        ),
      },
      {
        field: "orderPlaced",
        headerName: "Order placed",
        minWidth: 170,
        sortField: "orderPlacedAt",
      },
      { field: "customer", headerName: "Customer", minWidth: 140 },
      { field: "phone", headerName: "Phone", minWidth: 120 },
      { field: "zone", headerName: "Zone", minWidth: 100 },
      {
        field: "pickupAt",
        headerName: "Pickup & delivery",
        minWidth: 200,
        wrap: true,
        renderCell: (row) => (
          <Box
            sx={{ py: 0.5, lineHeight: 1.35, maxWidth: 280, whiteSpace: "normal" }}
            title={`Pickup: ${row.pickupDateTime}\nDelivery: ${row.deliveryDateTime}`}
          >
            <LabelValue
              label="Pickup"
              value={row.pickupDateTime}
              tone="pickup"
              active={row.schedulePhase === "pickup"}
              muted={row.schedulePhase === "delivery"}
            />
            <LabelValue
              label="Delivery"
              value={row.deliveryDateTime}
              tone="delivery"
              active={row.schedulePhase === "delivery"}
              muted={row.schedulePhase === "pickup"}
            />
          </Box>
        ),
      },
      { field: "status", headerName: "Status", minWidth: 150 },
      {
        field: "reasons",
        headerName: "Why action needed",
        minWidth: 220,
        sortable: false,
        renderCell: (row) => (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {(row.reasonKeys || []).map((key, idx) => (
              <Chip
                key={key}
                size="small"
                color={REASON_COLORS[key] || "default"}
                label={row.reasons[idx] || key}
                variant="outlined"
                sx={{ height: 22, fontSize: 11 }}
              />
            ))}
          </Stack>
        ),
      },
      { field: "updatedAt", headerName: "Updated", minWidth: 150 },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 110,
        sortable: false,
        renderCell: (row) => (
          <Button
            size="small"
            variant="contained"
            onClick={(e) => {
              e.stopPropagation();
              navigate(openPathForItem(row.raw));
            }}
            sx={{ textTransform: "none" }}
          >
            Open
          </Button>
        ),
      },
    ],
    [navigate]
  );

  if (isLoading) return <Delay />;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
        <BsCardList size={22} />
        <Typography variant="h4">Action Required</Typography>
        <Chip
          label={
            filter === "all"
              ? `${total} orders`
              : `${listCount} in this filter · ${total} total`
          }
          color="warning"
          size="small"
        />
      </Box>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Status is the order pipeline. Why action needed is the admin blocker.
        Pickup & delivery shows the scheduled slots. Use zone and order-placed
        date like other order tabs; reason tabs above narrow the blocker type.
      </Typography>

      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        mb={2}
      >
        <ToggleButtonGroup
          exclusive
          size="small"
          value={filter}
          onChange={(_e, v) => v && setFilter(v)}
        >
          {FILTERS.map((f) => (
            <ToggleButton
              key={f.value}
              value={f.value}
              sx={{ textTransform: "none" }}
            >
              {f.label}
              {f.value !== "all" && countsByReason[f.value] != null
                ? ` (${countsByReason[f.value]})`
                : f.value === "all"
                  ? ` (${total})`
                  : ""}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        <Button
          variant="outlined"
          onClick={() => refetch()}
          disabled={isFetching}
          sx={{ textTransform: "none" }}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </Stack>

      <DataTable
        data={tableData}
        columns={columns}
        searchPlaceholder="Search action-required orders..."
        stickyLeftFields={["orderId", "orderPlaced"]}
        stickyRightFields={["actions"]}
        emptyMessage={
          hasActiveFilters
            ? "No orders match these filters"
            : filter === "all"
              ? "No action-required orders — you're clear."
              : `No orders in “${FILTERS.find((f) => f.value === filter)?.label || filter}”.`
        }
        isLoading={isFetching && !isLoading}
        showDateRange
        dateRangeValue={dateRange}
        onDateRangeChange={setDateRange}
        showDownload={false}
        toolbarExtra={
          <OrderZoneFilter value={zoneId} onChange={setZoneId} />
        }
        filtersSlot={
          <OrderFiltersPopover
            statusId={statusId}
            onStatusChange={setStatusId}
            orderStatuses={orderStatuses}
            showStatusFilter
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        }
      />
    </Box>
  );
}
