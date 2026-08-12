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
import { useGetActionRequiredOrdersQuery } from "../../../store/services/api";
import { dateTimeFormat } from "../../../shared/constants";

const FILTERS = [
  { value: "all", label: "All" },
  { value: "payment_failed", label: "Payment" },
  { value: "on_hold", label: "On hold" },
  { value: "needs_assignment", label: "Unassigned shop" },
  { value: "needs_staff", label: "Needs staff" },
  { value: "pickup_reschedule", label: "Pickup" },
  { value: "delivery_failed", label: "Delivery" },
];

const REASON_COLORS = {
  payment_failed: "error",
  on_hold: "warning",
  needs_assignment: "warning",
  needs_staff: "warning",
  pickup_reschedule: "info",
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

export default function ActionRequiredOrders() {
  const navigate = useNavigate();
  const { error: showError } = useToaster();
  const [filter, setFilter] = useState("all");
  const { data, isLoading, isError, refetch, isFetching } =
    useGetActionRequiredOrdersQuery();

  useEffect(() => {
    if (isError) {
      showError("Could not load action-required orders");
    }
  }, [isError, showError]);

  const items = data?.data?.items || [];
  const countsByReason = data?.data?.countsByReason || {};
  const total = data?.data?.count ?? items.length;

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((row) => (row.reasons || []).includes(filter));
  }, [items, filter]);

  const tableData = useMemo(
    () =>
      filtered.map((row) => ({
        id: row.id,
        orderId: row.orderTrackId || String(row.id),
        customer: row.customer?.name || "—",
        phone: row.customer?.phoneNum || "—",
        zone: row.zoneName || "—",
        status: row.bookingStatusTitle || `Status ${row.bookingStatusId}`,
        reasons: row.reasonLabels || [],
        reasonKeys: row.reasons || [],
        detail:
          row.paymentFailureReason ||
          (row.pickupRescheduleRequired
            ? "Customer must reschedule pickup"
            : "—"),
        updatedAt: row.updatedAt
          ? dayjs(row.updatedAt).format(dateTimeFormat)
          : "—",
        raw: row,
      })),
    [filtered]
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
      { field: "customer", headerName: "Customer", minWidth: 140 },
      { field: "phone", headerName: "Phone", minWidth: 120 },
      { field: "zone", headerName: "Zone", minWidth: 100 },
      { field: "status", headerName: "Status", minWidth: 130 },
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
      {
        field: "detail",
        headerName: "Detail",
        minWidth: 200,
        wrap: true,
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
        <Chip label={`${total} orders`} color="warning" size="small" />
      </Box>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Orders that need admin attention — payment failures, on hold, unassigned
        shops, failed pickup/delivery. Clear blockers from this list first.
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
            <ToggleButton key={f.value} value={f.value} sx={{ textTransform: "none" }}>
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
        stickyLeftFields={["orderId"]}
        stickyRightFields={["actions"]}
        emptyMessage="No action-required orders — you're clear."
        isLoading={isFetching && !isLoading}
        showDateRange={false}
        showDownload={false}
      />
    </Box>
  );
}
