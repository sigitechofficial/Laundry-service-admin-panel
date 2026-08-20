import dayjs from "dayjs";
import { canAdminAssignOrReassignFromBooking } from "../../shared/adminAssignGate";
import { resolveOrderStatusTitle } from "../../shared/orderEditStatusGate";
import {
  DATE_TIME_FORMAT,
  formatDate,
  formatMoney,
  resolveCurrencySymbol,
} from "../../utilities/formatters";

function formatDriverName(user, { shopOwnerUserId = null, assigneeId = null } = {}) {
  if (assigneeId == null && !user) return null;
  const ownerId = shopOwnerUserId != null ? Number(shopOwnerUserId) : null;
  const id =
    assigneeId != null
      ? Number(assigneeId)
      : user?.id != null
        ? Number(user.id)
        : null;
  if (id == null && !user) return null;
  if (ownerId != null && (id == null || id === ownerId)) return "Shop owner";
  if (!user) return null;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || null;
}

function resolveOrderMoneySymbol(source) {
  return (
    resolveCurrencySymbol(source?.paymentSummary) ||
    resolveCurrencySymbol(source) ||
    "£"
  );
}

export function formatOrderMoney(amount, source) {
  const symbol = resolveOrderMoneySymbol(source);
  const code =
    source?.paymentSummary?.currency ||
    source?.paymentSummary?.currencyCode ||
    source?.currency;
  return formatMoney(amount, symbol, code);
}

function normalizeStatusKey(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isDeliveryPrepPhase(id, title) {
  if (id === 12) return true;
  return (
    title.includes("completed at facility") ||
    title.includes("completed (at facility)") ||
    title.includes("processing is done") ||
    title.includes("processing done") ||
    title.includes("ready for delivery")
  );
}

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
  if (title.includes("out for delivery") || title.includes("delivery failed")) {
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

function toEntityId(value) {
  if (value == null || value === "" || value === "—") return null;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric > 0 ? numeric : null;
  const text = String(value).trim();
  return text || null;
}

/** Customer details id from booking fields already in list payloads. */
export function resolveCustomerId(booking) {
  return toEntityId(
    booking?.customer?.id ?? booking?.userId ?? booking?.customerId
  );
}

/**
 * Shop details id from booking FK / joined laundryShop.
 * Never use laundryShop.userId — that is the agent account, not the shop.
 */
export function resolveLaundryShopId(booking) {
  return toEntityId(booking?.laundryShopId ?? booking?.laundryShop?.id);
}

export function customerDetailsPath(id) {
  const resolved = toEntityId(id);
  return resolved ? `/customer-management/details/${resolved}` : null;
}

export function shopDetailsPath(id) {
  const resolved = toEntityId(id);
  return resolved ? `/shop-management/details/${resolved}` : null;
}

/** Shop label from booking.laundryShop (same join All Orders uses). */
export function resolveShopName(booking) {
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
  for (const value of values) {
    const label = String(value ?? "").trim();
    if (!label || seen.has(label)) continue;
    seen.add(label);
    out.push(label);
  }
  return out;
}

function toItemCount(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function sumNestedItemQuantities(list) {
  if (!Array.isArray(list) || !list.length) return null;
  let sawQuantity = false;
  let sum = 0;
  for (const row of list) {
    const n = toItemCount(
      row?.items ?? row?.quantity ?? row?.qty ?? row?.itemCount ?? row?.noOfItems
    );
    if (n == null) continue;
    sawQuantity = true;
    sum += n;
  }
  return sawQuantity ? sum : null;
}

/**
 * Live item count for list rows.
 * Prefer Σ customerSelectedServices[].items (list payload now includes `items`).
 * Fall back to booking.totalItems / itemCount only when the nested sum is absent.
 */
export function resolveOrderItemCount(booking) {
  const nested = sumNestedItemQuantities(
    booking?.customerSelectedServices ||
      booking?.orderItems ||
      booking?.services
  );
  if (nested != null) return nested;

  for (const value of [
    booking?.totalItems,
    booking?.itemCount,
    booking?.items,
    booking?.noOfItems,
  ]) {
    const n = toItemCount(value);
    if (n != null) return n;
  }
  return 0;
}

export function mapBookingToOrderListRow(booking) {
  const createdRaw = booking?.createdAt || booking?.created_at;
  const services = uniqueOrderedStrings(
    (booking?.customerSelectedServices ?? []).map((service) => service?.service?.name)
  );
  const serviceType = services.join(", ");
  const totalItems = resolveOrderItemCount(booking);
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
    ? formatDate(booking.collectionDate, DATE_TIME_FORMAT)
    : "—";
  const deliveryDateTime = booking?.deliveryDate
    ? formatDate(booking.deliveryDate, DATE_TIME_FORMAT)
    : "—";
  const statusTitle = resolveOrderStatusTitle(booking);
  const schedulePhase = resolveOrderSchedulePhase(booking, statusTitle);
  const paymentDeliveryGate = booking?.paymentDeliveryGate || null;
  const paymentWaitingAdmin = paymentDeliveryGate === "waiting_admin";

  return {
    id: booking?.id,
    orderId: orderDisplayId,
    orderPlacedAt: createdRaw ? dayjs(createdRaw).valueOf() : 0,
    orderDateTime: createdRaw ? formatDate(createdRaw, DATE_TIME_FORMAT) : "—",
    serviceType: serviceType || null,
    serviceNames: services,
    shopName: shopLabel,
    laundryShopId: resolveLaundryShopId(booking),
    customerId: resolveCustomerId(booking),
    totalItems,
    pickupAt: booking?.collectionDate ? dayjs(booking.collectionDate).valueOf() : 0,
    pickupDateTime,
    deliveryDateTime,
    onHoldCount,
    pickupDriver,
    deliveryDriver,
    schedulePhase,
    costAmount,
    OrderStatus: statusTitle,
    paymentWaitingAdmin,
    paymentDeliveryGate,
    zoneId: booking?.zoneId ?? null,
    _booking: booking,
    canAdminAssign: canAdminAssignOrReassignFromBooking(booking),
    actions: "actions",
    _export: {
      orderId: orderDisplayId,
      orderDateTime: createdRaw ? formatDate(createdRaw, DATE_TIME_FORMAT) : "",
      serviceType,
      totalItems,
      pickupDateTime,
      deliveryDateTime,
      onHoldCount,
      pickupDriver: pickupDriver || "",
      deliveryDriver: deliveryDriver || "",
      shopName: shopLabel || "",
      cost: formatOrderMoney(costAmount),
      status: statusTitle,
      paymentHold: paymentWaitingAdmin ? "Payment hold — admin" : "",
    },
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadOrderListCsv(rows = [], filename = "orders_export.csv") {
  const head = ["Order", "Placed", "Shop", "Services", "Items", "Pickup", "Delivery", "Status"];
  const lines = [head.join(",")];
  rows.forEach((row) => {
    const x = row._export || {};
    lines.push(
      [
        x.orderId || row.orderId || "",
        x.orderDateTime || row.orderDateTime || "",
        csvEscape(x.shopName || row.shopName || ""),
        csvEscape(x.serviceType || row.serviceType || ""),
        x.totalItems ?? row.totalItems ?? "",
        csvEscape(x.pickupDateTime || row.pickupDateTime || ""),
        csvEscape(x.deliveryDateTime || row.deliveryDateTime || ""),
        x.status || row.OrderStatus || row.status || "",
      ].join(",")
    );
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function tabOrderMetricItems({
  tabLabel,
  tabValue,
  tabTone = "brand",
  tabHint = "Matching current filters",
  stats,
}) {
  return [
    { label: tabLabel, value: tabValue, tone: tabTone, hint: tabHint },
    { label: "All orders", value: stats.total, tone: "brand", hint: "All time" },
    { label: "New orders", value: stats.newOrders, tone: "danger", hint: "Needs assignment" },
    {
      label: stats.hasExtended ? "Active orders" : "Open orders",
      value: stats.activeOrders,
      tone: "navy",
      hint: "In processing",
    },
  ];
}

export function allOrderMetricItems(stats, { filtered = false } = {}) {
  return [
    {
      label: "Total orders",
      value: stats.total,
      tone: "brand",
      hint: filtered ? "Matching current filters" : "All time",
    },
    {
      label: "New orders",
      value: stats.newOrders,
      tone: "danger",
      hint: "Needs assignment",
    },
    {
      label: stats.hasExtended ? "Active orders" : "Open orders",
      value: stats.activeOrders,
      tone: "navy",
      hint: "In processing",
    },
    {
      label: "Repeat orders",
      value: stats.repeatOrders,
      tone: "success",
      hint: "Returning customer orders",
    },
  ];
}
