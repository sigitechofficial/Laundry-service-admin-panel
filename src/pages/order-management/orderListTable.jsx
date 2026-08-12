import { Box, Chip, Typography } from "@mui/material";
import dayjs from "dayjs";
import ActionButtons from "../../components/ui/ActionButtons";
import OrderAssignActionButton from "./order-modals/OrderAssignActionButton";
import { dateTimeFormat } from "../../shared/constants";
import { canAdminAssignOrReassignFromBooking } from "../../shared/adminAssignGate";
import {
  canEditOrderFromBooking,
  resolveOrderStatusTitle,
} from "../../shared/orderEditStatusGate";

const cellSx = { py: 0.5, lineHeight: 1.35, maxWidth: 280 };

function formatDriverName(user, { shopOwnerUserId = null, assigneeId = null } = {}) {
  if (assigneeId == null && !user) return null;
  const ownerId =
    shopOwnerUserId != null ? Number(shopOwnerUserId) : null;
  const id =
    assigneeId != null
      ? Number(assigneeId)
      : user?.id != null
        ? Number(user.id)
        : null;
  if (id == null && !user) return null;
  if (ownerId != null && (id == null || id === ownerId)) {
    return "Shop owner";
  }
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

export function formatOrderMoney(amount) {
  if (amount == null || amount === "") return "—";
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return `£${n.toFixed(2)}`;
}

function normalizeStatusKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Facility finished — next leg is delivery (highlight delivery row). */
function isDeliveryPrepPhase(id, title) {
  if (id === 12) return true;
  if (
    title.includes("completed at facility") ||
    title.includes("completed (at facility)") ||
    title.includes("processing is done") ||
    title.includes("processing done") ||
    title.includes("ready for delivery")
  ) {
    return true;
  }
  return false;
}

/** Which leg of the journey is active — drives highlight on schedule & driver cells. */
export function resolveOrderSchedulePhase(booking, statusTitle) {
  const id = Number(booking?.bookingStatusId);
  const title = normalizeStatusKey(
    statusTitle || resolveOrderStatusTitle(booking)
  );

  if ([17, 19, 20, 21, 23].includes(id)) return "neutral";
  if ([18, 24].includes(id)) return "neutral";

  if (id >= 13 && id <= 16) return "delivery";
  if (isDeliveryPrepPhase(id, title)) return "delivery";
  if (id >= 8 && id <= 11) return "neutral";
  if (id >= 1 && id <= 7) return "pickup";

  if (
    title.includes("out for delivery") ||
    title.includes("delivery failed")
  ) {
    return "delivery";
  }
  if (
    title.includes("driver reached") &&
    !title.includes("pickup") &&
    !title.includes("pick up")
  ) {
    return "delivery";
  }
  if (
    title.includes("delivered") &&
    !title.includes("shop") &&
    !title.includes("laundry to shop")
  ) {
    return "delivery";
  }

  if (
    title.includes("pickup") ||
    title.includes("pick up") ||
    title.includes("collection") ||
    title.includes("awaiting collection")
  ) {
    return "pickup";
  }
  if (title.includes("transit to facility") || title === "in transit") {
    return "pickup";
  }
  if (
    title.includes("confirmed") ||
    title.includes("order created") ||
    title === "pending" ||
    title === "new"
  ) {
    return "pickup";
  }

  if (title.includes("processing is done") || title.includes("processing done")) {
    return "delivery";
  }

  if (
    title.includes("processing") ||
    title.includes("invoice") ||
    title.includes("at facility")
  ) {
    return "neutral";
  }

  if (title.includes("completed") && title.includes("facility")) {
    return "delivery";
  }

  return "neutral";
}

function LabelValue({ label, value, muted = false, active = false, tone = "pickup" }) {
  if (!value || value === "—") {
    return (
      <Typography variant="body2" sx={{ fontSize: 13, color: "text.disabled" }}>
        {label}: —
      </Typography>
    );
  }

  const accent =
    tone === "delivery"
      ? { color: "#2E7D32", bg: "rgba(46, 125, 50, 0.12)", border: "#A5D6A7" }
      : { color: "#1565C0", bg: "rgba(25, 118, 210, 0.1)", border: "#90CAF9" };

  return (
    <Typography
      variant="body2"
      component="div"
      sx={{
        fontSize: 13,
        lineHeight: 1.45,
        color: active ? accent.color : muted ? "text.secondary" : "text.primary",
        fontWeight: active ? 600 : 400,
        opacity: muted && !active ? 0.72 : 1,
        ...(active && {
          bgcolor: accent.bg,
          border: `1px solid ${accent.border}`,
          borderRadius: "6px",
          px: 0.75,
          py: 0.35,
          mt: label === "Delivery" ? 0.35 : 0,
        }),
      }}
    >
      <Box
        component="span"
        sx={{
          color: active ? accent.color : "text.secondary",
          fontWeight: 600,
          fontSize: 12,
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}
      >
        {label}
      </Box>
      <Box component="span" sx={{ color: "text.secondary", mx: 0.5 }}>
        ·
      </Box>
      {value}
    </Typography>
  );
}

function StackedCell({ primary, secondary, title, emptySecondary = "No services listed" }) {
  return (
    <Box sx={cellSx} title={title}>
      {primary ? (
        <Typography
          variant="body2"
          sx={{ fontSize: 13, fontWeight: 600, color: "text.primary" }}
        >
          {primary}
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ fontSize: 13, color: "text.disabled" }}>
          No shop assigned
        </Typography>
      )}
      {secondary ? (
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            color: "text.secondary",
            mt: primary ? 0.25 : 0,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            whiteSpace: "normal",
          }}
        >
          {secondary}
        </Typography>
      ) : (
        <Typography
          variant="body2"
          sx={{ fontSize: 12, color: "text.disabled", mt: primary ? 0.25 : 0 }}
        >
          {emptySecondary}
        </Typography>
      )}
    </Box>
  );
}

function resolveShopName(booking) {
  const shop = booking?.laundryShop;
  if (!shop) return null;
  return (
    shop.name ||
    shop.bussinessInformation?.shopName ||
    shop.bussinessInformations?.[0]?.shopName ||
    null
  );
}

function uniqueOrderedStrings(values) {
  const seen = new Set();
  const out = [];
  for (const v of values) {
    const label = String(v ?? "").trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

/** Flat row for table, search, and download — all original fields preserved on `_export`. */
export function mapBookingToOrderListRow(booking) {
  const createdRaw = booking?.createdAt || booking?.created_at;
  const services = uniqueOrderedStrings(
    (booking?.customerSelectedServices ?? []).map((s) => s?.service?.name)
  );
  const serviceType = services.join(", ");
  const shopOwnerUserId =
    booking?.laundryShop?.userId ?? booking?.shopOwnerUserId ?? null;
  const pickupDriver =
    formatDriverName(booking?.driver, {
      shopOwnerUserId,
      assigneeId: booking?.driverId,
    }) || "—";
  const deliveryDriver =
    formatDriverName(booking?.deliveryDriver, {
      shopOwnerUserId,
      assigneeId: booking?.deliveryDriverId,
    }) || "—";
  const orderDisplayId = booking?.orderTrackId || booking?.id;
  const onHoldCount = booking?.OnHoldConfirmations?.length ?? 0;
  const costAmount =
    booking?.orderAmount != null ? Number(booking.orderAmount) : null;
  const shopLabel = resolveShopName(booking);

  const pickupDateTime = booking?.collectionDate
    ? dayjs(booking.collectionDate).format(dateTimeFormat)
    : "—";
  const deliveryDateTime = booking?.deliveryDate
    ? dayjs(booking.deliveryDate).format(dateTimeFormat)
    : "—";
  const statusTitle = resolveOrderStatusTitle(booking);
  const schedulePhase = resolveOrderSchedulePhase(booking, statusTitle);

  return {
    id: booking?.id,
    orderId: orderDisplayId,
    orderPlacedAt: createdRaw ? dayjs(createdRaw).valueOf() : 0,
    orderDateTime: createdRaw
      ? dayjs(createdRaw).format(dateTimeFormat)
      : "—",
    serviceType: serviceType || null,
    shopName: shopLabel,
    totalItems: booking?.totalItems ?? null,
    pickupAt: booking?.collectionDate
      ? dayjs(booking.collectionDate).valueOf()
      : 0,
    pickupDateTime,
    deliveryDateTime,
    onHoldCount,
    pickupDriver: pickupDriver || "—",
    deliveryDriver: deliveryDriver || "—",
    schedulePhase,
    costAmount,
    OrderStatus: statusTitle,
    zoneId: booking?.zoneId ?? null,
    _booking: booking,
    canAdminAssign: canAdminAssignOrReassignFromBooking(booking),
    actions: "actions",
    _export: {
      orderId: orderDisplayId,
      orderDateTime: createdRaw
        ? dayjs(createdRaw).format(dateTimeFormat)
        : "",
      serviceType,
      totalItems: booking?.totalItems,
      pickupDateTime,
      deliveryDateTime,
      onHoldCount,
      pickupDriver: pickupDriver || "",
      deliveryDriver: deliveryDriver || "",
      shopName: shopLabel || "",
      cost: formatOrderMoney(costAmount),
      status: resolveOrderStatusTitle(booking),
    },
  };
}

export function buildOrderListColumns({
  navigate,
  orderStatuses,
  setDeleteModal,
  setAssignModal,
  showAssign = true,
}) {
  return [
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
      headerName: "Order placed",
      minWidth: 132,
      renderCell: (row) => {
        if (!row.orderPlacedAt) return "—";
        const d = dayjs(row.orderPlacedAt);
        return (
          <StackedCell
            primary={d.format("DD MMM YYYY")}
            secondary={d.format("hh:mm A")}
            title={`When the order was created: ${row.orderDateTime}`}
          />
        );
      },
    },
    {
      field: "shopName",
      headerName: "Shop & service",
      minWidth: 200,
      renderCell: (row) => (
        <StackedCell
          primary={row.shopName}
          secondary={row.serviceType}
          title={[row.shopName, row.serviceType].filter(Boolean).join("\n")}
        />
      ),
    },
    {
      field: "totalItems",
      headerName: "Items",
      minWidth: 72,
      align: "center",
    },
    {
      field: "pickupAt",
      headerName: "Pickup & delivery",
      minWidth: 200,
      wrap: true,
      renderCell: (row) => (
        <Box
          sx={{ ...cellSx, whiteSpace: "normal" }}
          title={`Pickup: ${row.pickupDateTime}\nDelivery: ${row.deliveryDateTime}\nStatus: ${row.OrderStatus}`}
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
    {
      field: "onHoldCount",
      headerName: "On-hold",
      minWidth: 88,
      align: "center",
      renderCell: (row) =>
        row.onHoldCount > 0 ? (
          <Chip
            size="small"
            label={row.onHoldCount}
            sx={{
              height: 24,
              fontSize: 12,
              fontWeight: 600,
              bgcolor: "#FFF7E6",
              color: "#D46B08",
              border: "1px solid #FFD591",
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{ fontSize: 12, color: "text.disabled" }}
            title="No on-hold items on this order"
          >
            None
          </Typography>
        ),
    },
    {
      field: "pickupDriver",
      headerName: "Drivers",
      minWidth: 168,
      wrap: true,
      sortable: false,
      renderCell: (row) => (
        <Box
          sx={{ ...cellSx, whiteSpace: "normal" }}
          title={`Pickup: ${row.pickupDriver}\nDelivery: ${row.deliveryDriver}`}
        >
          <LabelValue
            label="Pickup"
            value={row.pickupDriver}
            tone="pickup"
            active={row.schedulePhase === "pickup"}
            muted={row.schedulePhase === "delivery"}
          />
          <LabelValue
            label="Delivery"
            value={row.deliveryDriver}
            tone="delivery"
            active={row.schedulePhase === "delivery"}
            muted={row.schedulePhase === "pickup"}
          />
        </Box>
      ),
    },
    {
      field: "costAmount",
      headerName: "Total",
      minWidth: 96,
      align: "right",
      renderCell: (row) => (
        <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600 }}>
          {formatOrderMoney(row.costAmount)}
        </Typography>
      ),
    },
    {
      field: "OrderStatus",
      headerName: "Status",
      minWidth: 140,
      renderCell: (row) => (
        <Chip
          size="small"
          label={row.OrderStatus || "—"}
          sx={{
            height: 26,
            maxWidth: 160,
            fontSize: 11,
            fontWeight: 600,
            "& .MuiChip-label": {
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          }}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: showAssign ? 280 : 200,
      sortable: false,
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {showAssign && setAssignModal ? (
            <OrderAssignActionButton
              booking={row._booking}
              onClick={() =>
                setAssignModal({
                  open: true,
                  orderId: row.id,
                  booking: row._booking,
                })
              }
            />
          ) : null}
          <ActionButtons
            showEdit={canEditOrderFromBooking(row._booking, orderStatuses)}
            onView={() => navigate(`/orders/details/${row.id}`)}
            onEdit={() => navigate(`/orders/edit/${row.id}`)}
            onDelete={() => setDeleteModal({ open: true, orderId: row.id })}
          />
        </Box>
      ),
    },
  ];
}
