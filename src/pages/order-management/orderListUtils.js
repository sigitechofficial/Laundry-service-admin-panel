import dayjs from "dayjs";
import { canAdminAssignOrReassignFromBooking } from "../../shared/adminAssignGate";
import { resolveOrderStatusTitle } from "../../shared/orderEditStatusGate";
import {
  DATE_TIME_FORMAT,
  formatBookingWindow,
  formatDate,
  formatMoney,
  resolveDisplayCurrency,
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

function resolveOrderMoney(source) {
  return resolveDisplayCurrency(source?.paymentSummary ?? source, {
    applyDefault: true,
  });
}

export function formatOrderMoney(amount, source) {
  const { symbol, code } = resolveOrderMoney(source);
  return formatMoney(amount, symbol, code || undefined);
}

function titleCasePaymentMethod(value) {
  const key = String(value ?? "").trim().toLowerCase();
  if (key === "card") return "Card";
  if (key === "cash") return "Cash";
  return null;
}

/**
 * Human label for how an order is/was paid. When the balance ended up being
 * collected differently from how the order was booked (cash→card switch at
 * delivery), show both so admins are not misled by the booking-time method.
 */
function resolvePaymentMethodLabel(booking) {
  const booked = titleCasePaymentMethod(booking?.paymentType);
  const collected = titleCasePaymentMethod(
    booking?.balanceCollectedVia ?? booking?.balancePaymentMethod
  );
  if (booked && collected && collected !== booked) {
    return `${booked} → ${collected}`;
  }
  return booked || collected || "—";
}

function resolveBillingDetail(booking) {
  return (
    booking?.billingDetail ||
    booking?.billingDetails ||
    (Array.isArray(booking?.billingDetails) ? booking.billingDetails[0] : null) ||
    null
  );
}

function toAmount(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
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

/** Display name + phone for order list rows (matches Action Required / Payment Failures). */
export function resolveCustomerDisplay(booking) {
  const customer = booking?.customer;
  if (!customer) {
    return { name: "—", phone: "—" };
  }
  const fromParts = [customer.firstName, customer.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const name =
    customer.name ||
    fromParts ||
    customer.email ||
    "—";
  const phone = customer.phoneNum || "—";
  return { name, phone };
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

/**
 * bussinessInformation.id for the shop-details route. The detail page
 * (`getSingleShopData`) resolves bussinessInformation.id first, so linking with
 * laundryShopId (an addressDb.id) can open the wrong shop or 404. Use the
 * business-info id joined on the booking; fall back to laundryShopId only when
 * the join is missing.
 */
export function resolveShopBusinessInfoId(booking) {
  const shop = booking?.laundryShop;
  const bizId =
    shop?.bussinessInformation?.id ??
    shop?.bussinessInformations?.[0]?.id ??
    null;
  return toEntityId(bizId);
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
  const billing = resolveBillingDetail(booking);
  const paymentMethod = resolvePaymentMethodLabel(booking);
  const upfrontAmount = toAmount(billing?.upfrontAmount);
  // Final = persisted invoice total once finalized, else the running order amount.
  const finalAmount = toAmount(billing?.total) ?? costAmount;
  const upfrontLabel =
    upfrontAmount != null ? formatOrderMoney(upfrontAmount, booking) : "—";
  const finalLabel =
    finalAmount != null ? formatOrderMoney(finalAmount, booking) : "—";
  const shopLabel = resolveShopName(booking);
  const pickupDateTime = formatBookingWindow(
    booking?.collectionDate,
    booking?.collectionTimeFrom,
    booking?.collectionTimeTo
  );
  const deliveryDateTime = formatBookingWindow(
    booking?.deliveryDate,
    booking?.deliveryTimeFrom,
    booking?.deliveryTimeTo
  );
  const statusTitle = resolveOrderStatusTitle(booking);
  const schedulePhase = resolveOrderSchedulePhase(booking, statusTitle);
  const paymentDeliveryGate = booking?.paymentDeliveryGate || null;
  const paymentWaitingAdmin = paymentDeliveryGate === "waiting_admin";
  const isRecurringAutoCreated = booking?.isRecurringAutoCreated === true;
  const { name: customerName, phone: customerPhone } =
    resolveCustomerDisplay(booking);

  return {
    id: booking?.id,
    orderId: orderDisplayId,
    orderPlacedAt: createdRaw ? dayjs(createdRaw).valueOf() : 0,
    orderDateTime: createdRaw ? formatDate(createdRaw, DATE_TIME_FORMAT) : "—",
    serviceType: serviceType || null,
    serviceNames: services,
    shopName: shopLabel,
    laundryShopId: resolveLaundryShopId(booking),
    shopBusinessInfoId: resolveShopBusinessInfoId(booking),
    customerId: resolveCustomerId(booking),
    customer: customerName,
    phone: customerPhone,
    totalItems,
    pickupAt: booking?.collectionDate ? dayjs(booking.collectionDate).valueOf() : 0,
    pickupDateTime,
    deliveryDateTime,
    onHoldCount,
    pickupDriver,
    deliveryDriver,
    schedulePhase,
    costAmount,
    paymentMethod,
    upfrontAmount,
    finalAmount,
    upfrontLabel,
    finalLabel,
    OrderStatus: statusTitle,
    lastStatusChange: booking?.lastStatusChange || null,
    paymentWaitingAdmin,
    paymentDeliveryGate,
    isRecurringAutoCreated,
    refundSummary: booking?.refundSummary || null,
    hasRefund: Boolean(booking?.refundSummary?.hasRefund),
    totalRefunded: Number(booking?.refundSummary?.totalRefunded || 0),
    isFullyRefunded: Boolean(booking?.refundSummary?.isFullyRefunded),
    recurringPlanId: booking?.recurringPlanId ?? null,
    recurringSourceBookingId: booking?.recurringSourceBookingId ?? null,
    recurringNextBookingId: booking?.recurringNextBookingId ?? null,
    recurringCycleDate: booking?.recurringCycleDate || null,
    zoneId: booking?.zoneId ?? null,
    _booking: booking,
    canAdminAssign: canAdminAssignOrReassignFromBooking(booking),
    actions: "actions",
    _export: {
      orderId: orderDisplayId,
      orderDateTime: createdRaw ? formatDate(createdRaw, DATE_TIME_FORMAT) : "",
      customerName,
      customerPhone,
      serviceType,
      totalItems,
      pickupDateTime,
      deliveryDateTime,
      onHoldCount,
      pickupDriver: pickupDriver || "",
      deliveryDriver: deliveryDriver || "",
      shopName: shopLabel || "",
      cost: formatOrderMoney(costAmount, booking),
      paymentMethod,
      upfront: upfrontLabel,
      finalAmount: finalLabel,
      status: statusTitle,
      statusChangedBy: booking?.lastStatusChange
        ? [
            booking.lastStatusChange.actorLabel,
            booking.lastStatusChange.actorName,
          ]
            .filter(Boolean)
            .join(" · ")
        : "",
      statusChangedAt: booking?.lastStatusChange?.at
        ? formatDate(booking.lastStatusChange.at, DATE_TIME_FORMAT)
        : "",
      paymentHold: paymentWaitingAdmin ? "Payment hold — admin" : "",
      type: isRecurringAutoCreated ? "Recurring" : "Manual",
    },
  };
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadOrderListCsv(rows = [], filename = "orders_export.csv") {
  const head = [
    "Order",
    "Placed",
    "Customer",
    "Phone",
    "Shop",
    "Services",
    "Type",
    "Items",
    "Pickup",
    "Delivery",
    "Payment method",
    "Upfront",
    "Final amount",
    "Status",
    "Status changed by",
    "Status changed at",
  ];
  const lines = [head.join(",")];
  rows.forEach((row) => {
    const x = row._export || {};
    lines.push(
      [
        x.orderId || row.orderId || "",
        x.orderDateTime || row.orderDateTime || "",
        csvEscape(x.customerName || row.customer || ""),
        csvEscape(x.customerPhone || row.phone || ""),
        csvEscape(x.shopName || row.shopName || ""),
        csvEscape(x.serviceType || row.serviceType || ""),
        x.type || (row.isRecurringAutoCreated ? "Recurring" : "Manual"),
        x.totalItems ?? row.totalItems ?? "",
        csvEscape(x.pickupDateTime || row.pickupDateTime || ""),
        csvEscape(x.deliveryDateTime || row.deliveryDateTime || ""),
        csvEscape(x.paymentMethod || row.paymentMethod || ""),
        csvEscape(x.upfront || row.upfrontLabel || ""),
        csvEscape(x.finalAmount || row.finalLabel || ""),
        x.status || row.OrderStatus || row.status || "",
        csvEscape(x.statusChangedBy || ""),
        csvEscape(x.statusChangedAt || ""),
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
