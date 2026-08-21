import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge, Button, PageHeader, Select } from "../../../design-system";
import dayjs from "dayjs";
import { Delay } from "../../../components/shared/Loaders";
import {
  TbChevronLeft,
  TbChevronRight,
  TbFileDescription,
  MdOutlineStore,
} from "../../../shared/icons/index";
import {
  useGetOrderForEditQuery,
  useGetOrderItemsSheetQuery,
  useGetAllOrderStatusesQuery,
  useLazyInvoiceCreationQuery,
  useGetServiceComparisonQuery,
  useGetShopReviewByBookingQuery,
  useEditOrderMutation,
} from "../../../store/services/api";
import {
  formatDate,
  formatMoney,
  joinMediaUrl,
  resolveDisplayCurrency,
} from "../../../utilities/formatters";
import { canEditOrderFromBooking } from "../../../shared/orderEditStatusGate";
import useToaster from "../../../components/ui/Toaster";
import {
  mergeInvoiceDetailsFromResponse,
  resolveOrderSubtotal,
  resolveServicesSubtotal,
} from "../../../utilities/invoiceTotals";
import AssignOrderModal from "../order-modals/AssignOrderModal";
import OrderAssignActionButton from "../order-modals/OrderAssignActionButton";
import { canAdminAssignOrReassignFromBooking } from "../../../shared/adminAssignGate";
import InvoiceDetailModal from "../invoice/InvoiceDetailModal";
import {
  buildInvoiceView,
  invoicePrintHtml,
  printHtmlDocument,
} from "../invoice/invoiceView";
import {
  OdCard,
  OdEmptyInvoice,
  OdMetaRow,
  OdMoreCategories,
  OdSectionTitle,
  OdStatCell,
  OdTimeline,
} from "./OrderDetailsChrome";
import styles from "./orderDetails.module.css";

const statusStyleMap = {
  completed: { bg: "#D1FAE5", color: "#065F46", label: "Completed" },
  pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
  hold: { bg: "#FEF3C7", color: "#92400E", label: "On Hold" },
};

const CARD = {
  borderRadius: 16,
  border: "1px solid #e6e9f0",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
  overflow: "hidden",
  background: "#fff",
};

const SECTION_HEAD = {
  padding: "14px 20px",
  borderBottom: "1px solid var(--line)",
  background: "var(--surface)",
};

function StarRating({ value = 0 }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span
      aria-label={`${filled} out of 5 stars`}
      style={{ letterSpacing: 2, fontSize: 16, lineHeight: 1 }}
    >
      <span style={{ color: "var(--warning)" }}>{"★".repeat(filled)}</span>
      <span style={{ color: "var(--n-300)" }}>{"★".repeat(5 - filled)}</span>
    </span>
  );
}

function statusBadgeTone(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("complete")) return "success";
  if (normalized.includes("cancel")) return "danger";
  if (normalized.includes("pending") || normalized.includes("hold")) return "warning";
  return "neutral";
}

function paymentBadgeTone(status) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "paid") return "success";
  if (normalized === "failed") return "danger";
  return "warning";
}

function getPaymentStatusBadge(status) {
  const normalized = String(status || "pending").toLowerCase();
  if (normalized === "paid") {
    return { bg: "#D1FAE5", color: "#065F46", label: "Paid" };
  }
  if (normalized === "failed") {
    return { bg: "#FEE2E2", color: "#991B1B", label: "Failed" };
  }
  return { bg: "#FEF3C7", color: "#92400E", label: "Pending" };
}

function formatPaymentType(value) {
  const normalized = String(value || "card").toLowerCase();
  return normalized === "cash" ? "Cash" : "Card";
}

function getStatusBadge(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("complete")) return statusStyleMap.completed;
  if (normalized.includes("pending")) return statusStyleMap.pending;
  if (normalized.includes("cancel")) return statusStyleMap.cancelled;
  if (normalized.includes("hold")) return statusStyleMap.hold;
  return { bg: "#E5E7EB", color: "#374151", label: status || "Unknown" };
}

function formatDateTime(date, timeFrom, timeTo, fallback = "N/A") {
  if (!date) return fallback;
  const formattedDate = formatDate(date, "ddd DD MMM");
  if (timeFrom && timeTo) return `${formattedDate}, ${timeFrom} - ${timeTo}`;
  return formattedDate || fallback;
}

/** Prefer subcategory (e.g. 3kg / 5kg) over bare category name. */
function formatAgentInvoiceItemName(row) {
  const repairLabel = (Array.isArray(row?.repairItems) ? row.repairItems : [])
    .map((r) => r?.garmentName)
    .filter(Boolean)
    .join(", ");
  if (repairLabel) return repairLabel;

  const sub = row?.subCategory;
  const base =
    String(sub?.name || row?.category?.name || "").trim() || "Item";
  const kg = Number(sub?.weightKg);
  if (Number.isFinite(kg) && kg > 0 && !/\d+\s*kg/i.test(base)) {
    return `${base} (${kg}kg)`;
  }
  return base;
}

/** Flat CSS add-ons, or line-split add-ons when the agent used serviceLines. */
function collectInvoiceAddOns(row) {
  const fromLines = (Array.isArray(row?.serviceLines) ? row.serviceLines : [])
    .flatMap((line) => (Array.isArray(line?.addOns) ? line.addOns : []));
  if (fromLines.length > 0) return fromLines;
  return Array.isArray(row?.addOns) ? row.addOns : [];
}

function normalizeInvoiceAddOn(ad) {
  const quantity = Number(ad?.items ?? ad?.quantity ?? 1) || 1;
  const unitPrice = Number(ad?.price ?? ad?.addOnService?.price ?? 0) || 0;
  return {
    ...ad,
    quantity,
    price: unitPrice,
    name: ad?.addOnService?.name || ad?.name || "Add-on",
  };
}

/**
 * Expand agent invoice CSS rows that use serviceLines into one display row
 * per line so "1x with add-on" and "1x without" never collapse into Qty:N.
 */
function expandAgentInvoiceServices(services) {
  const list = Array.isArray(services) ? services : [];
  const out = [];
  list.forEach((svc) => {
    const lines = (Array.isArray(svc?.serviceLines) ? svc.serviceLines : []).filter(
      (l) => Number(l?.items) > 0
    );
    if (lines.length > 1) {
      lines.forEach((line, lineIdx) => {
        out.push({
          ...svc,
          id: `${svc?.id ?? "svc"}-line-${lineIdx}`,
          items: Number(line?.items) || 0,
          addOns: Array.isArray(line?.addOns) ? line.addOns : [],
        });
      });
      return;
    }
    if (lines.length === 1) {
      out.push({
        ...svc,
        items: Number(lines[0]?.items) || Number(svc?.items) || 0,
        addOns: Array.isArray(lines[0]?.addOns)
          ? lines[0].addOns
          : Array.isArray(svc?.addOns)
            ? svc.addOns
            : [],
      });
      return;
    }
    out.push(svc);
  });
  return out;
}

function formatAddress(address) {
  if (!address) return "N/A";
  const parts = [address.streetAddress, address.district, address.province].filter(
    Boolean
  );
  return parts.join(", ") || "N/A";
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function OrderDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const orderId = Number(id);
  const { error: showError, success } = useToaster();

  const { data: orderResponse, isLoading, refetch: refetchOrder } =
    useGetOrderForEditQuery(orderId, {
    skip: !orderId,
  });
  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const [fetchInvoice, { isFetching: isFetchingInvoice }] = useLazyInvoiceCreationQuery();
  const [editOrder, { isLoading: isUpdatingStatus }] = useEditOrderMutation();
  const [selectedStatusId, setSelectedStatusId] = useState("");
  const orderData = orderResponse?.data;
  const shopName =
    orderData?.laundryShop?.bussinessInformations?.[0]?.shopName ||
    orderData?.laundryShop?.shopName ||
    orderData?.laundryShop?.name ||
    "";
  const bookingId = orderData?.id || orderId;

  const { data: shopReviewResponse } = useGetShopReviewByBookingQuery(bookingId, {
    skip: !bookingId,
  });
  const shopReview = shopReviewResponse?.data || null;

  const { data: orderItemsResponse, isLoading: isLoadingItems } =
    useGetOrderItemsSheetQuery(bookingId, {
      skip: !bookingId,
    });

  const { data: comparisonResponse, isLoading: isLoadingComparison } =
    useGetServiceComparisonQuery(bookingId, {
      skip: !bookingId,
    });
  const comparisonData = comparisonResponse?.data;

  const orderItemsData = orderItemsResponse?.data;
  const statusBadge = getStatusBadge(orderData?.bookingStatus?.title);
  const orderStatusOptions = useMemo(() => {
    const list = Array.isArray(statusesResponse?.data)
      ? statusesResponse.data
      : [];
    // Stage DB has many duplicate status rows; keep lowest id per title.
    const sorted = [...list].sort(
      (a, b) => Number(a?.id ?? 0) - Number(b?.id ?? 0)
    );
    const seen = new Set();
    const unique = [];
    for (const option of sorted) {
      const key = String(option?.title ?? "")
        .trim()
        .toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(option);
    }
    const currentId = orderData?.bookingStatusId;
    if (
      currentId != null &&
      !unique.some((o) => Number(o.id) === Number(currentId))
    ) {
      const current =
        list.find((o) => Number(o.id) === Number(currentId)) ||
        (orderData?.bookingStatus
          ? {
              id: currentId,
              title: orderData.bookingStatus.title,
            }
          : null);
      if (current) unique.unshift(current);
    }
    return unique;
  }, [
    statusesResponse?.data,
    orderData?.bookingStatusId,
    orderData?.bookingStatus,
  ]);

  useEffect(() => {
    if (
      orderData?.bookingStatusId !== undefined &&
      orderData?.bookingStatusId !== null
    ) {
      setSelectedStatusId(String(orderData.bookingStatusId));
      return;
    }
    setSelectedStatusId("");
  }, [orderData?.bookingStatusId, orderId]);

  const statusDirty =
    selectedStatusId !== "" &&
    String(orderData?.bookingStatusId ?? "") !== selectedStatusId;

  const handleUpdateStatus = async () => {
    if (!orderId || !selectedStatusId) return;
    if (!statusDirty) {
      showError("Select a different status to update.");
      return;
    }
    try {
      const response = await editOrder({
        orderId,
        body: { bookingStatusId: Number(selectedStatusId) },
      }).unwrap();
      if (response?.status === "1" || response?.status === 1) {
        success(response?.message || "Order status updated.");
        await refetchOrder();
      } else {
        showError(response?.message || "Failed to update order status.");
      }
    } catch (err) {
      showError(
        err?.data?.message || err?.message || "Failed to update order status."
      );
    }
  };

  const canShowGenerateInvoice = useMemo(() => {
    if (!orderData) return false;
    return canEditOrderFromBooking(orderData, orderStatusOptions);
  }, [orderData, orderStatusOptions]);

  const canShowAdminAssign = useMemo(() => {
    return canAdminAssignOrReassignFromBooking(orderData);
  }, [orderData]);

  const selectedServiceGroups = useMemo(() => {
    const rows = Array.isArray(orderData?.customerSelectedServices)
      ? orderData.customerSelectedServices.filter((it) => {
          if (Number(it?.items) > 0) return true;
          // Agent used serviceLines (multi-line add-on flow) — items may be 0 on the parent row.
          if (
            Array.isArray(it?.serviceLines) &&
            it.serviceLines.some((l) => Number(l?.items) > 0)
          )
            return true;
          if (Array.isArray(it?.repairItems) && it.repairItems.length > 0)
            return true;
          return false;
        })
      : [];
    const map = {};
    rows.forEach((it) => {
      const sid = String(it?.serviceId || "other");
      if (!map[sid]) {
        map[sid] = {
          serviceId: sid,
          serviceName: it?.service?.name || "Service",
          items: [],
        };
      }
      const repairItems = Array.isArray(it?.repairItems) ? it.repairItems : [];
      const serviceLines = Array.isArray(it?.serviceLines)
        ? it.serviceLines.filter((l) => Number(l?.items) > 0)
        : [];
      const unitPrice = Number(it?.categoryPrice || it?.subCategory?.price || 0);
      const baseItem = {
        serviceName: it?.service?.name || map[sid].serviceName || "Service",
        itemName: formatAgentInvoiceItemName(it),
        categoryName: it?.category?.name || "",
        subCategoryName: it?.subCategory?.name || "",
        weightKg: it?.subCategory?.weightKg ?? null,
        unitPrice,
        unitLabel: Number(it?.subCategory?.weightKg) > 0 ? "/ load" : "/ piece",
        serviceImage: it?.service?.image || "",
        preferences: Array.isArray(it?.selectedServicePreferences)
          ? it.selectedServicePreferences
              .map((p) => p?.preferenceValue?.value)
              .filter(Boolean)
          : [],
        repairItems,
        instruction: it?.serviceInstruction || "",
      };

      // When agent used serviceLines (multi-line add-on flow), split into one
      // display row per line so "1x with add-on" and "1x without" stay separate.
      if (serviceLines.length > 1) {
        serviceLines.forEach((line, lineIdx) => {
          const lineAddOns = Array.isArray(line?.addOns) ? line.addOns : [];
          map[sid].items.push({
            ...baseItem,
            id: `${it?.id}-line-${lineIdx}`,
            qty: Number(line?.items) || 0,
            addOns: lineAddOns.map(normalizeInvoiceAddOn),
          });
        });
      } else {
        // Single line or flat row — one display entry as before.
        const flatQty = (() => {
          const flat = Number(it?.items);
          if (flat > 0) return flat;
          const fromLines = serviceLines.reduce((s, l) => s + (Number(l?.items) || 0), 0);
          if (fromLines > 0) return fromLines;
          return repairItems.reduce((sum, r) => sum + (Number(r?.quantity) || 1), 0) || 0;
        })();
        const singleLineAddOns =
          serviceLines.length === 1 && Array.isArray(serviceLines[0]?.addOns)
            ? serviceLines[0].addOns
            : null;
        map[sid].items.push({
          ...baseItem,
          id: it?.id,
          qty: flatQty,
          addOns: (singleLineAddOns ?? collectInvoiceAddOns(it)).map(normalizeInvoiceAddOn),
        });
      }
    });
    return Object.values(map);
  }, [orderData?.customerSelectedServices]);

  const proofEntries = Array.isArray(orderData?.proofOfDeliveries)
    ? orderData.proofOfDeliveries
    : [];
  const pickupProofs = proofEntries.filter((p) => {
    const type = String(p?.deliveryType || "")
      .replace(/[\s_-]/g, "")
      .toLowerCase();
    return type === "pickup";
  });
  const deliveryProofs = proofEntries.filter((p) => {
    const type = String(p?.deliveryType || "")
      .replace(/[\s_-]/g, "")
      .toLowerCase();
    return type === "delivery" || type === "dropoff";
  });

  const pickupItemsCount = pickupProofs.reduce(
    (sum, proof) => sum + Number(proof?.noOfItems || 0),
    0
  );
  const deliveryItemsCount = deliveryProofs.reduce(
    (sum, proof) => sum + Number(proof?.noOfItems || 0),
    0
  );
  const pickupBagsCount = pickupProofs.reduce(
    (sum, proof) => sum + Number(proof?.noOfBags || 0),
    0
  );
  const deliveryBagsCount = deliveryProofs.reduce(
    (sum, proof) => sum + Number(proof?.noOfBags || 0),
    0
  );
  const orderItemsTotal = Number(orderData?.totalItems || 0);
  const pickupItemsDisplayCount =
    pickupItemsCount > 0 ? pickupItemsCount : pickupProofs.length > 0 ? orderItemsTotal : 0;
  const deliveryItemsDisplayCount =
    deliveryItemsCount > 0
      ? deliveryItemsCount
      : deliveryProofs.length > 0
      ? orderItemsTotal
      : 0;

  const addOnsTotalAmount = useMemo(() => {
    return selectedServiceGroups.reduce(
      (sum, svc) =>
        sum +
        svc.items.reduce(
          (itemSum, item) =>
            itemSum +
            (item.addOns || []).reduce(
              (addOnSum, ad) =>
                addOnSum + (Number(ad?.quantity || 1) * Number(ad?.price || 0)),
              0
            ),
          0
        ),
      0
    );
  }, [selectedServiceGroups]);
  const servicesSubtotalAmount = useMemo(() => {
    if (
      orderItemsData?.servicesSubtotal != null ||
      orderItemsData?.totalAmount != null
    ) {
      return resolveServicesSubtotal(orderItemsData);
    }
    const servicesOnly = selectedServiceGroups.reduce(
      (sum, svc) =>
        sum +
        svc.items.reduce(
          (itemSum, item) =>
            itemSum +
            Number(item.qty ?? item.quantity ?? item.items ?? 0) *
              Number(item.unitPrice ?? item.categoryPrice ?? item.price ?? 0),
          0
        ),
      0
    );
    return parseFloat((servicesOnly + addOnsTotalAmount).toFixed(2));
  }, [orderItemsData, selectedServiceGroups, addOnsTotalAmount]);
  const minimumOrderFeeAmount = toNumber(
    orderData?.billingDetail?.upfrontAmount ?? 0
  );
  const serviceChargeAmount = toNumber(orderData?.billingDetail?.serviceCharge ?? 0);
  const deliveryFeeAmount = toNumber(orderData?.deliveryFee ?? 0);
  const tipAmount = toNumber(orderData?.tips?.[0]?.amount ?? 0);
  const orderSubtotalAmount = toNumber(
    resolveOrderSubtotal(orderData, {
      servicesSubtotal: servicesSubtotalAmount,
      serviceCharge: serviceChargeAmount,
      minimumOrderFee: minimumOrderFeeAmount,
      tip: tipAmount,
    })
  );
  const totalAmount = toNumber(
    orderData?.billingDetail?.total ?? orderData?.orderAmount ?? orderSubtotalAmount
  );
  const [selectedItemsServiceId, setSelectedItemsServiceId] = useState("");
  const [selectedItemsCategoryKey, setSelectedItemsCategoryKey] = useState("all");
  const [invoiceModal, setInvoiceModal] = useState({
    open: false,
    format: "a4",
    previewOpen: false,
  });
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [customerCompareExpanded, setCustomerCompareExpanded] = useState(false);
  const selectedItemsServiceIdResolved =
    selectedItemsServiceId || selectedServiceGroups?.[0]?.serviceId || "";

  useEffect(() => {
    if (!selectedServiceGroups.length) {
      setSelectedItemsServiceId("");
      return;
    }
    if (!selectedServiceGroups.some((s) => s.serviceId === selectedItemsServiceIdResolved)) {
      setSelectedItemsServiceId(selectedServiceGroups[0].serviceId);
    }
  }, [selectedServiceGroups, selectedItemsServiceIdResolved]);

  useEffect(() => {
    setSelectedItemsCategoryKey("all");
  }, [selectedItemsServiceIdResolved]);

  const selectedServiceData = useMemo(
    () => selectedServiceGroups.find((s) => s.serviceId === selectedItemsServiceIdResolved) || null,
    [selectedItemsServiceIdResolved, selectedServiceGroups]
  );
  const categoryTabsForSelectedService = useMemo(() => {
    const seen = new Set();
    const out = [];
    (selectedServiceData?.items || []).forEach((it) => {
      const key = (it.categoryName || "Items").trim();
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ key, label: key });
      }
    });
    return out;
  }, [selectedServiceData]);
  const visibleOrderItems = useMemo(() => {
    const list = selectedServiceData?.items || [];
    if (selectedItemsCategoryKey === "all") return list;
    return list.filter((it) => (it.categoryName || "Items").trim() === selectedItemsCategoryKey);
  }, [selectedItemsCategoryKey, selectedServiceData]);

  const orderTotal = totalAmount.toFixed(2);
  const paymentSummary = orderData?.paymentSummary;
  const paymentWaitingAdmin =
    orderData?.paymentDeliveryGate === "waiting_admin" ||
    paymentSummary?.paymentWaitingAdmin === true;
  const paymentStatusBadge = getPaymentStatusBadge(
    paymentSummary?.billingPaymentStatus ?? orderData?.billingDetail?.paymentStatus
  );
  const paymentCurrencySymbol = resolveDisplayCurrency(
    paymentSummary ?? orderData,
    { applyDefault: true }
  ).symbol;
  const amountDueNow = Number(
    paymentSummary?.amountDueNow ??
      (String(orderData?.billingDetail?.paymentStatus || "").toLowerCase() === "paid"
        ? 0
        : totalAmount)
  );
  const invoiceView = useMemo(
    () => buildInvoiceView(invoiceDetails, shopName),
    [invoiceDetails, shopName]
  );

  const handleOpenInvoiceModal = async () => {
    try {
      const response = await fetchInvoice(Number(bookingId)).unwrap();
      const details = mergeInvoiceDetailsFromResponse(response?.data);
      if (!details) {
        showError("Invoice details not found.");
        return;
      }
      setInvoiceDetails(details);
      setInvoiceModal({ open: true, format: "a4", previewOpen: false });
    } catch (err) {
      showError(err?.data?.message || "Failed to fetch invoice details.");
    }
  };

  const handleCloseInvoiceModal = () => {
    setInvoiceModal((prev) => ({ ...prev, open: false, previewOpen: false }));
  };

  const handlePrintInvoice = () => {
    if (!invoiceView) return;
    printHtmlDocument(invoicePrintHtml(invoiceView, invoiceModal.format));
  };

  const pickupPrimaryProof = pickupProofs[0] || {};
  const deliveryPrimaryProof = deliveryProofs[0] || {};
  const pickupProofTime = dayjs(
    pickupPrimaryProof?.createdAt ||
      pickupPrimaryProof?.created_at ||
      orderData?.collectionDate
  ).isValid()
    ? dayjs(
        pickupPrimaryProof?.createdAt ||
          pickupPrimaryProof?.created_at ||
          orderData?.collectionDate
      ).format(
        "ddd DD MMM · HH:mm"
      )
    : "Not captured";
  const deliveryProofTime = dayjs(
    deliveryPrimaryProof?.createdAt ||
      deliveryPrimaryProof?.created_at ||
      orderData?.deliveryDate
  ).isValid()
    ? dayjs(
        deliveryPrimaryProof?.createdAt ||
          deliveryPrimaryProof?.created_at ||
          orderData?.deliveryDate
      ).format(
        "ddd DD MMM · HH:mm"
      )
    : "Not captured";

  const shopOwnerUserId =
    orderData?.shopOwnerUserId ?? orderData?.laundryShop?.userId ?? null;
  const formatStaffLabel = (user, assigneeId, shopHeldFlag) => {
    const id =
      assigneeId != null
        ? Number(assigneeId)
        : user?.id != null
          ? Number(user.id)
          : null;
    const ownerId = shopOwnerUserId != null ? Number(shopOwnerUserId) : null;
    if (
      shopHeldFlag === true ||
      id == null ||
      (ownerId != null && id === ownerId)
    ) {
      return "Shop owner";
    }
    if (!user) return "Unassigned";
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
    return name || "Assigned staff";
  };
  const personName = (u) => {
    if (!u) return null;
    const n = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return n || null;
  };

  const pickupDriverLabel = formatStaffLabel(
    orderData?.driver,
    orderData?.driverId,
    orderData?.isPickupShopHeld
  );
  const deliveryDriverLabel = formatStaffLabel(
    orderData?.deliveryDriver,
    orderData?.deliveryDriverId,
    orderData?.isDeliveryShopHeld
  );
  const pickupCompletedByLabel =
    orderData?.pickupCompletedByName ||
    personName(orderData?.pickupCompletedBy) ||
    null;
  const deliveryCompletedByLabel =
    orderData?.deliveryCompletedByName ||
    personName(orderData?.deliveryCompletedBy) ||
    null;

  const attemptRows = Array.isArray(orderData?.attempts) ? orderData.attempts : [];

  const formatAttemptFeeLabel = (attempt) => {
    const feeSymbol = resolveDisplayCurrency(attempt, { applyDefault: true }).symbol;
    if (attempt?.feeCharged) {
      return `Charged ${formatMoney(attempt?.feeAmount, feeSymbol, attempt?.feeCurrency)}`;
    }
    if (attempt?.feeWaived && attempt?.feeWaiveReason) {
      return `No fee · ${attempt.feeWaiveReason}`;
    }
    return "No fee";
  };

  const attemptActivityRows = attemptRows
    .filter((a) => String(a.status || "").toLowerCase() === "failed")
    .map((a) => {
      const type = String(a.attemptType || "attempt");
      const reason = a.failureReasonLabel || a.failureReason || "Reason not recorded";
      return {
        text: `${type} failed · ${reason} · ${formatAttemptFeeLabel(a)}`,
        time: formatDate(a.failedAt || a.updatedAt, "ddd DD MMM · HH:mm"),
        tone: "error",
      };
    });

  const assignmentActivityRows = (orderData?.assignmentEvents || []).map((ev) => {
    const action = String(ev.action || "").toLowerCase();
    const leg = String(ev.assignmentType || "leg");
    const source = ev.source ? ` (${ev.source})` : "";
    const from = personName(ev.fromUser);
    const to = personName(ev.toUser);
    let text = `${action || "event"} · ${leg}${source}`;
    if (action === "complete") {
      text = `${leg} completed by ${to || from || "staff"}${source}`;
    } else if (action === "unassign" || ev.source === "self_return") {
      text = `${from || "Staff"} returned ${leg} to shop owner${source}`;
    } else if (to) {
      text = `${leg} ${action || "assigned"} → ${to}${source}`;
    }
    return {
      text,
      time: formatDate(ev.createdAt, "ddd DD MMM · HH:mm"),
      tone: action === "complete" ? "completed" : "system",
    };
  });

  const activityRows = [
    ...attemptActivityRows,
    ...assignmentActivityRows,
    {
      text: `Order ${statusBadge.label.toLowerCase()}`,
      time: formatDateTime(
        orderData?.deliveryDate,
        orderData?.deliveryTimeFrom,
        orderData?.deliveryTimeTo
      ),
      tone: String(statusBadge.label || "").toLowerCase().includes("complete")
        ? "completed"
        : "system",
    },
    {
      text: `Items collected (${pickupItemsCount || 0})`,
      time: formatDateTime(
        orderData?.collectionDate,
        orderData?.collectionTimeFrom,
        orderData?.collectionTimeTo
      ),
      tone: pickupItemsCount > 0 ? "completed" : "system",
    },
    {
      text: "Order placed",
      time: dayjs(orderData?.created_at || orderData?.createdAt).isValid()
        ? dayjs(orderData?.created_at || orderData?.createdAt).format(
            "ddd DD MMM · HH:mm"
          )
        : `Order #${orderData?.orderTrackId || orderData?.id}`,
      tone: "neutral",
    },
  ];

  if (isLoading) return <Delay />;

  if (!orderData) {
    return (
      <div>
        <PageHeader
          title="Order Details"
          description="No order data available"
          actions={
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <TbChevronLeft size={18} />
              Back
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <>
    <div className={styles.page}>
      <PageHeader
        title={`Order #${orderData.orderTrackId || orderData.id}`}
        description="Order Management / Order details"
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!orderId || orderId <= 1}
              onClick={() => navigate(`/orders/details/${orderId - 1}`)}
              aria-label="Previous order"
            >
              <TbChevronLeft size={18} />
            </Button>
            <Button
              variant="secondary"
              disabled={!orderId}
              onClick={() => navigate(`/orders/details/${orderId + 1}`)}
              aria-label="Next order"
            >
              <TbChevronRight size={18} />
            </Button>
            {canShowGenerateInvoice ? (
              <Button
                variant="secondary"
                onClick={handleOpenInvoiceModal}
                disabled={isFetchingInvoice}
              >
                {isFetchingInvoice ? "Loading..." : "View / Print Invoice"}
              </Button>
            ) : null}
            {canShowAdminAssign ? (
              <OrderAssignActionButton
                booking={orderData}
                size="medium"
                onClick={() => setAssignModalOpen(true)}
              />
            ) : null}
            <Button onClick={() => navigate(`/orders/edit/${orderId}`)}>
              Edit Order
            </Button>
          </>
        }
      />
      <div className={styles.grid}>
        <div className={styles.stack}>
          <OdCard>
            <div className={styles.toolbar}>
              <Badge tone={statusBadgeTone(orderData?.bookingStatus?.title)}>
                {statusBadge.label}
              </Badge>
              <span className={styles.freqPill}>
                {orderData.frequency || "Just Once"}
              </span>
              {paymentWaitingAdmin ? (
                <button
                  type="button"
                  onClick={() => navigate("/orders/payment-failures")}
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}
                >
                  <Badge tone="danger">Payment hold — admin action</Badge>
                </button>
              ) : null}
              <div className={styles.toolbarActions}>
                <Select
                  value={selectedStatusId}
                  onChange={(value) => setSelectedStatusId(String(value))}
                  disabled={isUpdatingStatus || !orderStatusOptions.length}
                  placeholder="No status available"
                  options={orderStatusOptions.map((option) => ({
                    value: String(option.id),
                    label: option.title,
                  }))}
                />
                <Button
                  onClick={handleUpdateStatus}
                  disabled={
                    isUpdatingStatus || !statusDirty || !selectedStatusId
                  }
                >
                  {isUpdatingStatus ? "Updating..." : "Update"}
                </Button>
                <div className={styles.totalBlock}>
                  <p className={styles.sectionLabel}>Order Total</p>
                  <p className={styles.totalValue}>
                    {formatMoney(totalAmount, paymentCurrencySymbol)}
                  </p>
                </div>
              </div>
            </div>
          </OdCard>

          <OdCard>
            <OdSectionTitle>Collection & Delivery</OdSectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ background: "#FCFDFE" }}>
              <div style={{ padding: 20, borderRight: "1px solid #E4E7EC", borderBottom: "none" }}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <TbFileDescription size={16} color="#2563EB" />
                    <p style={{ margin: 0,  color: "#2563EB", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em" }}>
                      COLLECTION
                    </p>
                  </div>
                  <div style={{ paddingLeft: 8.8, paddingRight: 8.8, paddingTop: 2.8, paddingBottom: 2.8, borderRadius: "999px", background: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#1D4ED8", fontWeight: 700 }}>
                      Pickup Window
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, fontFamily: "Switzer", fontWeight: 700, fontSize: 20, color: "#0F172A", lineHeight: 1.2 }}>
                  {orderData.collectionTimeFrom || "N/A"} -{" "}
                  {orderData.collectionTimeTo || "N/A"}
                </p>
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, marginTop: 4 }}>
                  {orderData.collectionDate
                    ? formatDate(orderData.collectionDate, "ddd DD MMM YYYY")
                    : "N/A"}
                </p>
                <div className={styles.proofGrid}>
                  <OdStatCell label="Items counted" value={pickupItemsDisplayCount || 0} warnZero />
                  <OdStatCell label="Bags counted" value={pickupBagsCount || 0} warnZero />
                </div>
                <div>
                  {pickupProofs.some((p) => p.note) && (
                    <div
                      style={{ marginTop: 8, padding: 9, background: "var(--warning-bg)", border: "1px solid #FDE68A", borderRadius: "var(--r-md)" }}
                    >
                      <p style={{ margin: 0, color: "#92400E",  fontSize: 11 }}>
                        Note: {pickupProofs.find((p) => p.note)?.note}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ padding: 20 }}>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <MdOutlineStore size={16} color="#059669" />
                    <p style={{ margin: 0,  color: "#059669", fontWeight: 700, fontSize: 12, letterSpacing: "0.05em" }}>
                      DELIVERY
                    </p>
                  </div>
                  <div style={{ paddingLeft: 8.8, paddingRight: 8.8, paddingTop: 2.8, paddingBottom: 2.8, borderRadius: "999px", background: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                    <p style={{ margin: 0, fontSize: 12, color: "#047857", fontWeight: 700 }}>
                      Drop-off Window
                    </p>
                  </div>
                </div>
                <p style={{ margin: 0, fontFamily: "Switzer", fontWeight: 700, fontSize: 20, color: "#0F172A", lineHeight: 1.2 }}>
                  {orderData.deliveryTimeFrom || "N/A"} -{" "}
                  {orderData.deliveryTimeTo || "N/A"}
                </p>
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, marginTop: 4 }}>
                  {orderData.deliveryDate
                    ? formatDate(orderData.deliveryDate, "ddd DD MMM YYYY")
                    : "N/A"}
                </p>
                <div className={styles.proofGrid}>
                  <OdStatCell label="Items counted" value={deliveryItemsDisplayCount || 0} warnZero />
                  <OdStatCell label="Bags counted" value={deliveryBagsCount || 0} warnZero />
                </div>
                <div>
                  {pickupItemsCount > deliveryItemsCount && (
                    <div
                      style={{ marginTop: 8, padding: 9, background: "var(--danger-bg)", border: "1px solid #FECACA", borderRadius: "var(--r-md)" }}
                    >
                      <p style={{ margin: 0, color: "#B91C1C",  fontSize: 11 }}>
                        Delivery item count is lower than pickup count.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </OdCard>

          <div style={CARD}>
            <div className="flex items-center justify-between" style={{ ...SECTION_HEAD }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#A78BFA" }} />
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Proof of Collection & Delivery
                </p>
              </div>
              <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>
                {orderData.collectionDate
                  ? formatDate(orderData.collectionDate, "ddd DD MMM")
                  : "N/A"}{" "}
                -{" "}
                {orderData.deliveryDate
                  ? formatDate(orderData.deliveryDate, "ddd DD MMM")
                  : "N/A"}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2">
              <div style={{ padding: 20, borderRight: "1px solid #E4E7EC", borderBottom: "none" }}>
                <p style={{ margin: 0,  color: "#2563EB", fontWeight: 700, fontSize: 12 }}>
                  PROOF OF PICKUP
                </p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {pickupProofs.length ? (
                    pickupProofs.slice(0, 3).map((proof, idx) => (
                      <div key={proof.id || idx} className="aspect-square rounded-md overflow-hidden bg-[#F3F4F6]">
                        <img
                          src={joinMediaUrl(proof.imgUpload)}
                          alt={`pickup-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    <div
                      style={{ padding: 14,
                        gridColumn: "1 / -1",
                        textAlign: "left",
                        background: "var(--canvas)",
                        border: "1px dashed var(--line)",
                        borderRadius: "var(--r-lg)", }}
                    >
                      <p style={{ margin: 0, color: "var(--muted)",  fontSize: 11 }}>
                        No images attached
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-0" style={{ marginTop: 16 }}>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Items Collected</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#334155", fontWeight: 600 }}>
                      {pickupItemsDisplayCount || 0} items
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Driver Signature</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontStyle: "italic" }}>Not captured</p>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Customer Signature</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontStyle: "italic" }}>Not captured</p>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Timestamp</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#334155", fontWeight: 500 }}>{pickupProofTime}</p>
                  </div>
                </div>
                {pickupProofs.some((p) => p.note) && (
                  <div
                    style={{ marginTop: 12,
                      padding: 11,
                      background: "var(--warning-bg)",
                      border: "1px solid #FDE68A",
                      borderRadius: "var(--r-md)", }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#D97706", textTransform: "uppercase", marginBottom: 4.8 }}>
                      Driver Note
                    </p>
                    <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
                      {pickupProofs.find((p) => p.note)?.note}
                    </p>
                  </div>
                )}
              </div>

              <div style={{ padding: 20 }}>
                <p style={{ margin: 0,  color: "#059669", fontWeight: 700, fontSize: 12 }}>
                  PROOF OF DELIVERY
                </p>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {deliveryProofs.length ? (
                    deliveryProofs.slice(0, 3).map((proof, idx) => (
                      <div key={proof.id || idx} className="aspect-square rounded-md overflow-hidden bg-[#F3F4F6]">
                        <img
                          src={joinMediaUrl(proof.imgUpload)}
                          alt={`delivery-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  ) : (
                    <div
                      style={{ padding: 14,
                        gridColumn: "1 / -1",
                        textAlign: "left",
                        background: "var(--canvas)",
                        border: "1px dashed var(--line)",
                        borderRadius: "var(--r-lg)", }}
                    >
                      <p style={{ margin: 0, color: "var(--muted)",  fontSize: 11 }}>
                        No images available
                      </p>
                    </div>
                  )}
                </div>
                <div className="space-y-0" style={{ marginTop: 16 }}>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Items Delivered</p>
                    <p style={{ margin: 0, fontSize: 11,
                        color: deliveryItemsCount > 0 ? "#334155" : "#EF4444",
                        fontWeight: 600, }}>
                      {deliveryItemsDisplayCount || 0} items
                    </p>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Driver Signature</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontStyle: "italic" }}>Not captured</p>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Customer Signature</p>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B", fontStyle: "italic" }}>Not captured</p>
                  </div>
                  <div className="flex items-center justify-between py-2" style={{ borderTop: "1px solid #F1F5F9" }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>Timestamp</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#334155", fontWeight: 500 }}>{deliveryProofTime}</p>
                  </div>
                </div>
                {pickupItemsCount > deliveryItemsCount && (
                  <div
                    style={{ marginTop: 12,
                      padding: 11,
                      background: "var(--danger-bg)",
                      border: "1px solid #FECACA",
                      borderRadius: "var(--r-md)", }}
                  >
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", marginBottom: 4.8 }}>
                      Alert
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                      {deliveryItemsCount || 0} items recorded at delivery. Possible mismatch with
                      pickup count of {pickupItemsCount || 0}.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div className="flex items-center justify-between" style={{ ...SECTION_HEAD }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} />
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Order Items
                </p>
              </div>
              <div style={{ paddingLeft: 11.2, paddingRight: 11.2, minHeight: 30, borderRadius: "6px", background: "#ECFDF3", border: "1px solid #86EFAC", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <p style={{ margin: 0, color: "#15803D",  fontWeight: 700, fontSize: 11, lineHeight: 1.1, display: "flex", alignItems: "center" }}>
                  {selectedServiceGroups.length || 0} service(s)
                </p>
              </div>
            </div>

            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
              {!selectedServiceGroups.length ? (
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 15, paddingTop: 4.8, paddingBottom: 4.8 }}>
                  {isLoadingItems ? "Loading items..." : "No selected order items available"}
                </p>
              ) : (
                <>
                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                      Select service
                    </p>
                    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
                      {selectedServiceGroups.map((serviceGroup) => {
                        const active = String(serviceGroup.serviceId) === String(selectedItemsServiceIdResolved);
                        const imgUrl =
                          serviceGroup.items?.[0]?.serviceImage
                            ? joinMediaUrl(serviceGroup.items[0].serviceImage)
                            : "";
                        const initial = (serviceGroup.serviceName || "?").trim().charAt(0).toUpperCase();
                        return (
                          <button key={`svc-chip-${serviceGroup.serviceId}`} type="button" onClick={() => setSelectedItemsServiceId(serviceGroup.serviceId)} style={{ flex: "0 0 auto",
                              minWidth: 92,
                              maxWidth: 112,
                              paddingLeft: 10, paddingRight: 10,
                              paddingTop: 10, paddingBottom: 10,
                              borderRadius: "12px",
                              border: "none",
                              background: active ? "#EFF6FF" : "#F8FAFC",
                              cursor: "pointer", }}>
                            <div style={{ width: 48, height: 48, marginLeft: "auto", marginRight: "auto", marginBottom: 8, borderRadius: "10px", overflow: "hidden", background: "#EEF2FF", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {imgUrl ? (
                                <img src={imgUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <p style={{ margin: 0, fontSize: 15, color: "#64748B" }}>{initial}</p>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: 600, lineHeight: 1.25, color: active ? "#2563EB" : "#64748B" }}>
                              {serviceGroup.serviceName}
                            </p>
                            <p style={{ margin: 0, marginTop: 2.8, fontSize: 11, color: "#475569" }}>
                              {serviceGroup.items.reduce((sum, item) => sum + (item.qty || 0), 0)} item(s)
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 8 }}>
                      Category
                    </p>
                    <div style={{ display: "flex", gap: 18, overflowX: "auto", borderBottom: "1px solid #E5E7EB" }}>
                      <button type="button" onClick={() => setSelectedItemsCategoryKey("all")} style={{ paddingBottom: 8.8,
                          border: "none",
                          background: "transparent",
                          fontWeight: 700,
                          fontSize: 14,
                          color: selectedItemsCategoryKey === "all" ? "#2563EB" : "#64748B",
                          borderBottom: "2px solid",
                          borderBottomColor: selectedItemsCategoryKey === "all" ? "#2563EB" : "transparent",
                          marginBottom: "-1px",
                          cursor: "pointer", }}>
                        All
                      </button>
                      {categoryTabsForSelectedService.map((tab) => (
                        <button key={`cat-tab-${tab.key}`} type="button" onClick={() => setSelectedItemsCategoryKey(tab.key)} style={{ paddingBottom: 8.8,
                            border: "none",
                            background: "transparent",
                            whiteSpace: "nowrap",
                            fontWeight: 700,
                            fontSize: 14,
                            color: selectedItemsCategoryKey === tab.key ? "#2563EB" : "#64748B",
                            borderBottom: "2px solid",
                            borderBottomColor: selectedItemsCategoryKey === tab.key ? "#2563EB" : "transparent",
                            marginBottom: "-1px",
                            cursor: "pointer", }}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>
                    <div style={{ width: 4, height: 22, background: "#2563EB", borderRadius: 4 }} />
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#0F172A" }}>
                      {selectedItemsCategoryKey === "all" ? "Items" : selectedItemsCategoryKey}
                    </p>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9.6 }}>
                    {visibleOrderItems.map((item) => {
                      const lineTotal = (item.qty || 0) * (item.unitPrice || 0);

                      // Flat customer booking row — no subCategory, zero price, no invoice lines.
                      // Show as a compact customer-notes card (like the agent app — no qty×price row).
                      const isCustomerNotesRow =
                        item.unitPrice === 0 &&
                        item.itemName === "Item" &&
                        (item.addOns || []).length === 0 &&
                        (item.repairItems || []).length === 0;

                      if (isCustomerNotesRow) {
                        const hasPrefs = (item.preferences || []).length > 0;
                        const hasNote = (item.instruction || "").trim().length > 0;
                        if (!hasPrefs && !hasNote) return null;
                        return (
                          <div key={`item-${item.id}`} style={{ border: "1px solid #DBEAFE", borderRadius: "12px", padding: "10px 14px", background: "#F0F7FF" }}>
                            <p style={{ margin: 0, marginBottom: 4, fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 0.3, textTransform: "uppercase" }}>
                              Customer Preferences
                            </p>
                            {hasPrefs && (
                              <p style={{ margin: 0, fontSize: 12, color: "#334155", lineHeight: 1.5 }}>
                                {item.preferences.join(" · ")}
                              </p>
                            )}
                            {hasNote && (
                              <p style={{ margin: 0, marginTop: hasPrefs ? 4 : 0, fontSize: 12, color: "#475569", fontStyle: "italic" }}>
                                Note: {item.instruction}
                              </p>
                            )}
                          </div>
                        );
                      }

                      // Normal priced item row — matches agent app format.
                      const itemLabel = item.itemName && item.itemName !== "Item"
                        ? `${item.serviceName} - ${item.itemName}`
                        : item.serviceName;
                      return (
                        <div key={`item-${item.id}`} style={{ border: "1px solid #E5E7EB", borderRadius: "12px", padding: "12px 14px", background: "#fff" }}>

                          {/* Main row: qty label + price total */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: 13.5, fontWeight: 600, color: "#0F172A", lineHeight: 1.4 }}>
                                {item.qty}x {itemLabel}
                              </p>
                              {item.unitPrice > 0 && (
                                <p style={{ margin: 0, marginTop: 2, fontSize: 12, color: "#64748B" }}>
                                  {formatMoney(item.unitPrice, paymentCurrencySymbol)} × {item.qty}
                                </p>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#0F172A", whiteSpace: "nowrap" }}>
                              {item.unitPrice > 0
                                ? formatMoney(lineTotal, paymentCurrencySymbol)
                                : <span style={{ color: "#94A3B8", fontWeight: 500, fontSize: 12 }}>—</span>}
                            </p>
                          </div>

                          {/* Add-ons */}
                          {(item.addOns || []).length > 0 && (
                            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                              {(item.addOns || []).map((ad, idx) => {
                                const adQty = Number(ad?.quantity || 1);
                                const adPrice = Number(ad?.price || 0);
                                const adTotal = adQty * adPrice;
                                return (
                                  <div key={`addon-${item.id}-${idx}`}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                      <p style={{ margin: 0, fontSize: 13, color: "#0F172A", fontWeight: 500 }}>
                                        + {ad?.name || "Add-on"}
                                      </p>
                                      {adPrice > 0 && (
                                        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#0F172A", whiteSpace: "nowrap" }}>
                                          {formatMoney(adTotal, paymentCurrencySymbol)}
                                        </p>
                                      )}
                                    </div>
                                    {adPrice > 0 && (
                                      <p style={{ margin: 0, fontSize: 11.5, color: "#64748B" }}>
                                        {formatMoney(adPrice, paymentCurrencySymbol)} × {adQty}
                                      </p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Preferences */}
                          {(item.preferences || []).length > 0 && (
                            <p style={{ margin: 0, marginTop: 6, fontSize: 11, color: "#64748B" }}>
                              Preferences: {item.preferences.join(", ")}
                            </p>
                          )}

                          {/* Repair items */}
                          {(item.repairItems || []).length > 0 && (
                            <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4.8 }}>
                              {(item.repairItems || []).map((ri, rIdx) => {
                                const optionNames = (ri?.options || [])
                                  .map((o) => o?.optionName)
                                  .filter(Boolean)
                                  .join(", ");
                                const images = Array.isArray(ri?.images) ? ri.images : [];
                                return (
                                  <div key={`repair-${item.id}-${rIdx}`} style={{ padding: 8, borderRadius: "8px", background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#0F172A" }}>
                                      {ri?.garmentName || "Garment"}
                                      {ri?.quantity > 1 ? ` ×${ri.quantity}` : ""}
                                    </p>
                                    {optionNames ? (
                                      <p style={{ margin: 0, fontSize: 11, color: "#475569", marginTop: 2 }}>
                                        {optionNames}
                                      </p>
                                    ) : null}
                                    {ri?.instruction ? (
                                      <p style={{ margin: 0, fontSize: 11, color: "#64748B", marginTop: 2, fontStyle: "italic" }}>
                                        {ri.instruction}
                                      </p>
                                    ) : null}
                                    {images.length > 0 ? (
                                      <div style={{ marginTop: 4.8, display: "flex", gap: 4.8, flexWrap: "wrap" }}>
                                        {images.map((img, ii) => {
                                          const path = img?.imageUrl || "";
                                          const src = joinMediaUrl(path);
                                          return (
                                            <img key={`ri-img-${rIdx}-${ii}`} src={src} alt="" style={{ width: 48, height: 48, objectFit: "cover", borderRadius: "6px", border: "1px solid #E2E8F0" }} />
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {item.instruction ? (
                            <p style={{ margin: 0, marginTop: 4.4, fontSize: 11, color: "#64748B", fontStyle: "italic" }}>
                              Note: {item.instruction}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            <div style={{ padding: 20, borderTop: "1px solid #E4E7EC", background: "#FCFCFD", display: "flex", flexDirection: "column", rowGap: 3.2 }}>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Services subtotal
                </p>
                <p style={{ margin: 0, fontSize: 14 }}>
                  {formatMoney(servicesSubtotalAmount, paymentCurrencySymbol)}
                </p>
              </div>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Minimum Order Fee
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  -{formatMoney(Math.abs(minimumOrderFeeAmount), paymentCurrencySymbol)}
                </p>
              </div>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Service Charge
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  {formatMoney(serviceChargeAmount, paymentCurrencySymbol)}
                </p>
              </div>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Subtotal
                </p>
                <p style={{ margin: 0, fontSize: 14 }}>{formatMoney(orderSubtotalAmount, paymentCurrencySymbol)}</p>
              </div>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Delivery Fee
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  {formatMoney(deliveryFeeAmount, paymentCurrencySymbol)}
                </p>
              </div>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Driver Tip
                </p>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  {formatMoney(tipAmount, paymentCurrencySymbol)}
                </p>
              </div>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Payment Status
                </p>
                <Badge
                  tone={paymentBadgeTone(
                    paymentSummary?.billingPaymentStatus ?? orderData?.billingDetail?.paymentStatus
                  )}
                >
                  {paymentStatusBadge.label}
                </Badge>
              </div>
              <div className="flex items-center justify-between" style={{ paddingTop: 7.2, paddingBottom: 7.2 }}>
                <p style={{ margin: 0, color: "var(--muted)", fontSize: 14 }}>
                  Amount Due
                </p>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700,
                    color: amountDueNow > 0 ? "#B45309" : "#065F46", }}>
                  {formatMoney(amountDueNow, paymentCurrencySymbol)}
                </p>
              </div>
              {paymentSummary?.paymentStateLabel ? (
                <div style={{ paddingTop: 4, paddingBottom: 4 }}>
                  <p style={{ margin: 0,  fontSize: 11, color: "#64748B" }}>
                    {paymentSummary.paymentStateLabel}
                  </p>
                </div>
              ) : null}
              <div className="flex items-center justify-between pt-2.5 mt-2.5" style={{ borderTop: "1px solid #E4E7EC" }}>
                <p style={{ margin: 0, fontFamily: "Switzer", fontWeight: 700 }}>
                  Total
                </p>
                <p style={{ margin: 0, fontFamily: "Switzer", fontWeight: 700, color: "var(--accent)" }}>
                  {formatMoney(orderTotal, paymentCurrencySymbol)}
                </p>
              </div>
            </div>
          </div>

          {/* ── Service Comparison: Customer Original vs Agent Invoice ─────── */}
          {(comparisonData || isLoadingComparison) && (
            <div style={CARD}>
              <div className="flex items-center justify-between" style={{ ...SECTION_HEAD }}>
                <div className="flex items-center gap-1.5">
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F59E0B" }} />
                  <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Service Comparison
                  </p>
                  {comparisonData?.fallbackToLive && (
                    <p style={{ margin: 0,  fontSize: 12, color: "#9CA3AF", fontStyle: "italic", marginLeft: 8 }}>
                      (snapshot not yet available — showing current services)
                    </p>
                  )}
                </div>
                <div style={{ paddingLeft: 10.4, paddingRight: 10.4, minHeight: 22, borderRadius: "999px", background: "#FFFBEB", border: "1px solid #FDE68A", display: "inline-flex", alignItems: "center" }}>
                  <p style={{ margin: 0, fontSize: 12, color: "#B45309", fontWeight: 700 }}>Customer vs Agent</p>
                </div>
              </div>

              {isLoadingComparison ? (
                <div style={{ padding: 20 }}>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: 12 }}>Loading comparison...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2">
                  {/* ── Customer Original ── */}
                  <div style={{ padding: 20, borderRight: "1px solid #E4E7EC" }}>
                    <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 4, height: 18, background: "#F59E0B", borderRadius: 4 }} />
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#92400E", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Customer Selected
                      </p>
                    </div>
                    {(!comparisonData?.customerOriginal?.services?.length) ? (
                      <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12 }}>No snapshot available</p>
                    ) : (() => {
                      const groups = {};
                      (comparisonData.customerOriginal.services || []).forEach((svc) => {
                        const heading = svc.service?.name || "Other";
                        if (!groups[heading]) groups[heading] = [];
                        groups[heading].push(svc);
                      });
                      const entries = Object.entries(groups);
                      const visible = customerCompareExpanded ? entries : entries.slice(0, 2);
                      const hidden = Math.max(0, entries.length - visible.length);
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {visible.map(([heading, items]) => (
                            <div key={heading}>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, borderBottom: "1px solid #FDE68A", paddingBottom: 3.2 }}>
                                {heading}
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {items.map((svc, idx) => (
                                  <div key={`orig-${svc.id || idx}`} style={{ border: "1px solid #FDE68A", borderRadius: "10px", padding: 11.2, background: "#FFFBEB" }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                                      {svc.subCategory?.name || svc.category?.name || "Item"}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                      {svc.items != null && (
                                        <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Qty: <b>{svc.items}</b></p>
                                      )}
                                      {svc.categoryPrice != null && (
                                        <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>{formatMoney(svc.categoryPrice, paymentCurrencySymbol)}/pc</p>
                                      )}
                                    </div>
                                    {(svc.preferences || []).length > 0 && (
                                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {svc.preferences.map((pref, pi) => (
                                          <div key={pi} style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2.4, paddingBottom: 2.4, borderRadius: "999px", background: "#FEF3C7", border: "1px solid #FDE68A" }}>
                                            <p style={{ margin: 0, fontSize: 12, color: "#92400E", fontWeight: 600 }}>
                                              {pref.preferenceType?.name && `${pref.preferenceType.name}: `}{pref.preferenceValue?.value || "—"}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {svc.serviceInstruction && (
                                      <p style={{ margin: 0, marginTop: 4, fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>
                                        Note: {svc.serviceInstruction}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                          <OdMoreCategories
                            hidden={hidden}
                            onExpand={() => setCustomerCompareExpanded(true)}
                          />
                          {(comparisonData.customerOriginal.bookingPreferences || []).length > 0 && (
                            <div>
                              <p style={{ margin: 0, fontSize: 12, color: "#92400E", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
                                Booking Preferences
                              </p>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {comparisonData.customerOriginal.bookingPreferences.map((pref, pi) => (
                                  <div key={pi} style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2.4, paddingBottom: 2.4, borderRadius: "999px", background: "#FEF3C7", border: "1px solid #FDE68A" }}>
                                    <p style={{ margin: 0, fontSize: 12, color: "#92400E", fontWeight: 600 }}>
                                      {pref.preferenceType?.name && `${pref.preferenceType.name}: `}{pref.preferenceValue?.value || "—"}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ── Agent Invoice ── */}
                  <div style={{ padding: 20 }}>
                    <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 4, height: 18, background: "#000099", borderRadius: 4 }} />
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#000099", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Agent Invoice
                      </p>
                    </div>
                    {(!comparisonData?.agentInvoice?.services?.length) ? (
                      <OdEmptyInvoice invoiceGenerated={comparisonData?.invoiceGenerated} />
                    ) : (() => {
                      const groups = {};
                      expandAgentInvoiceServices(comparisonData.agentInvoice.services).forEach((svc) => {
                        const heading = svc.service?.name || "Other";
                        if (!groups[heading]) groups[heading] = [];
                        groups[heading].push(svc);
                      });
                      return (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {Object.entries(groups).map(([heading, items]) => (
                            <div key={heading}>
                              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#000099", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6, borderBottom: "1px solid #C7D2FE", paddingBottom: 3.2 }}>
                                {heading}
                              </p>
                              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                                {items.map((svc, idx) => (
                                  <div key={`agent-${svc.id || idx}`} style={{ border: "1px solid #C7D2FE", borderRadius: "10px", padding: 11.2, background: "#EEF2FF" }}>
                                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                                      {svc.subCategory?.name || svc.category?.name || "Item"}
                                    </p>
                                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                      {svc.items != null && (
                                        <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>Qty: <b>{svc.items}</b></p>
                                      )}
                                      {svc.categoryPrice != null && (
                                        <p style={{ margin: 0, fontSize: 11, color: "#475569" }}>{formatMoney(svc.categoryPrice, paymentCurrencySymbol)}/pc</p>
                                      )}
                                    </div>
                                    {(svc.addOns || []).length > 0 && (
                                      <div style={{ marginTop: 4 }}>
                                        {svc.addOns.map((ad, ai) => (
                                          <p key={ai} style={{ margin: 0, fontSize: 11, color: "#475569" }}>
                                            + {ad.items || 1}x {ad.addOnService?.name || "Add-on"} ({formatMoney(ad.price, paymentCurrencySymbol)})
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                    {(svc.selectedServicePreferences || []).length > 0 && (
                                      <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 4 }}>
                                        {svc.selectedServicePreferences.map((pref, pi) => (
                                          <div key={pi} style={{ paddingLeft: 8, paddingRight: 8, paddingTop: 2.4, paddingBottom: 2.4, borderRadius: "999px", background: "#E0E7FF", border: "1px solid #C7D2FE" }}>
                                            <p style={{ margin: 0, fontSize: 12, color: "#3730A3", fontWeight: 600 }}>
                                              {pref.preferenceType?.name && `${pref.preferenceType.name}: `}{pref.preferenceValue?.value || "—"}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {svc.serviceInstruction && (
                                      <p style={{ margin: 0, marginTop: 4, fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>
                                        Note: {svc.serviceInstruction}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className={styles.stack}>
          <div style={CARD}>
            <OdSectionTitle>Payment</OdSectionTitle>
            <div className="space-y-3" style={{ padding: 20 }}>
              <div className={`${styles.due} ${amountDueNow > 0 ? styles.dueWarn : styles.dueOk}`}>
                <p className={styles.dueLabel}>Amount due</p>
                <p className={styles.dueValue}>
                  {formatMoney(amountDueNow, paymentCurrencySymbol)}
                </p>
              </div>
              <OdMetaRow
                label="Method"
                value={formatPaymentType(paymentSummary?.paymentType ?? orderData?.paymentType)}
              />
              <div className="flex justify-between gap-3 items-center">
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Status
                </p>
                <Badge
                  tone={paymentBadgeTone(
                    paymentSummary?.billingPaymentStatus ?? orderData?.billingDetail?.paymentStatus
                  )}
                >
                  {paymentStatusBadge.label}
                </Badge>
              </div>
              {paymentWaitingAdmin ? (
                <div style={{ marginTop: 4, padding: 10, borderRadius: 6, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "#991B1B" }}>
                    Flagged: payment not processed — delivery held
                  </p>
                  <p style={{ margin: 0, fontSize: 11, color: "#7F1D1D", marginTop: 4 }}>
                    Agent is waiting for admin instruction. Resolve under Payment Failures
                    (shift to cash or allow proceed).
                  </p>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => navigate("/orders/payment-failures")}
                    style={{ marginTop: 8 }}
                  >
                    Open Payment Failures
                  </Button>
                </div>
              ) : null}
              {paymentSummary?.paidAtBooking?.totalPaid > 0 ? (
                <div className="flex justify-between gap-3">
                  <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Paid at Booking
                  </p>
                  <p style={{ margin: 0, textAlign: "right", fontSize: 13, fontWeight: 500, color: "#475569" }}>
                    {formatMoney(paymentSummary.paidAtBooking.totalPaid, paymentCurrencySymbol)}
                  </p>
                </div>
              ) : null}
              {paymentSummary?.paymentStateLabel ? (
                <p style={{ margin: 0,  fontSize: 11, color: "#64748B", display: "block" }}>
                  {paymentSummary.paymentStateLabel}
                </p>
              ) : null}
              {orderData?.invoiceStatus ? (
                <div className="flex justify-between gap-3">
                  <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                    Invoice
                  </p>
                  <p style={{ margin: 0, textAlign: "right", fontSize: 13, fontWeight: 500, color: "#475569" }}>
                    {String(orderData.invoiceStatus).charAt(0).toUpperCase() +
                      String(orderData.invoiceStatus).slice(1)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div style={CARD}>
            <div style={{ ...SECTION_HEAD }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#C4B5FD" }} />
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Shop
                </p>
              </div>
            </div>
            <div className="space-y-3" style={{ padding: 20 }}>
              <div className="flex justify-between gap-3">
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Shop Name
                </p>
                <p style={{ margin: 0, textAlign: "right", fontSize: 13, fontWeight: 500, color: "#475569" }}>
                  {shopName || "Not assigned"}
                </p>
              </div>
              <div className="flex justify-between gap-3">
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Frequency
                </p>
                <p style={{ margin: 0, textAlign: "right", fontSize: 13, fontWeight: 500, color: "#475569" }}>
                  {orderData?.frequency || "Just Once"}
                </p>
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div style={{ ...SECTION_HEAD }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FBBF24" }} />
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Customer Review
                </p>
              </div>
            </div>
            <div className="space-y-3" style={{ padding: 20 }}>
              {!shopReview ? (
                <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                  No review submitted for this order yet.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <StarRating value={Number(shopReview.rating) || 0} />
                    <Badge tone={shopReview.visibility === "hidden" ? "neutral" : "success"}>
                      {shopReview.visibility || "published"}
                    </Badge>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(shopReview.reasons || []).map((r) => (
                      <Badge
                        key={`${r.code}-${r.label}`}
                        tone={r.sentiment === "positive" ? "success" : "danger"}
                      >
                        {r.otherText ? `${r.label}: ${r.otherText}` : r.label || r.code}
                      </Badge>
                    ))}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: "#334155" }}>
                    {shopReview.comment || "No written comment"}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "#64748B" }}>
                    {shopReview.customerName || "Customer"}
                    {shopReview.submittedAt
                      ? ` · ${formatDate(shopReview.submittedAt, "DD MMM YYYY, HH:mm")}`
                      : ""}
                  </p>
                </>
              )}
            </div>
          </div>

          <div style={CARD}>
            <div style={{ ...SECTION_HEAD }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#60A5FA" }} />
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Delivery Address
                </p>
              </div>
            </div>
            <div className="space-y-3" style={{ padding: 20 }}>
              <p style={{ margin: 0,  color: "#2563EB", fontWeight: 700, fontSize: 12 }}>
                DELIVERY LOCATION
              </p>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.45 }}>
                {formatAddress(orderData.pickupAddress || orderData.dropOffAddress)}
              </p>
              <div className="flex justify-between gap-3">
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, textTransform: "uppercase" }}>
                  Instructions
                </p>
                <p style={{ margin: 0, textAlign: "right", fontSize: 12 }}>
                  {orderData?.driverInstruction || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div style={{ ...SECTION_HEAD }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#FBBF24" }} />
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Drivers
                </p>
              </div>
            </div>
            <div className="space-y-3" style={{ padding: 20 }}>
              <div>
                <p style={{ margin: 0,  color: "#2563EB", fontWeight: 700, fontSize: 12 }}>
                  COLLECTION DRIVER
                </p>
                <div className="flex items-center gap-2.5 mt-2">
                  <div style={{ width: 32, height: 32, borderRadius: "999px", background: "#F1F5F9", border: "1px solid #E2E8F0" }} />
                  <p style={{ margin: 0,  fontSize: 14,
                      color:
                        pickupDriverLabel === "Shop owner" ||
                        pickupDriverLabel === "Unassigned"
                          ? "#94A3B8"
                          : "#334155",
                      fontStyle:
                        pickupDriverLabel === "Shop owner" ||
                        pickupDriverLabel === "Unassigned"
                          ? "italic"
                          : "normal", }}>
                    {pickupDriverLabel}
                  </p>
                </div>
                {pickupCompletedByLabel ? (
                  <p style={{ margin: 0,  marginTop: 6, display: "block", color: "#64748B", fontSize: 12 }}>
                    Completed by {pickupCompletedByLabel}
                    {orderData?.pickupCompletedAt
                      ? ` · ${formatDate(orderData.pickupCompletedAt, "DD MMM YYYY · HH:mm")}`
                      : ""}
                  </p>
                ) : null}
                {orderData?.geofenceCompliance?.hasAnyOverride ? (
                  <div style={{ marginTop: 8 }}>
                    <Badge tone="warning">Geofence override recorded</Badge>
                  </div>
                ) : null}
              </div>
              <div>
                <p style={{ margin: 0,  color: "#059669", fontWeight: 700, fontSize: 12 }}>
                  DELIVERY DRIVER
                </p>
                <div className="flex items-center gap-2.5 mt-2">
                  <div style={{ width: 32, height: 32, borderRadius: "999px", background: "#F1F5F9", border: "1px solid #E2E8F0" }} />
                  <p style={{ margin: 0,  fontSize: 14,
                      color:
                        deliveryDriverLabel === "Shop owner" ||
                        deliveryDriverLabel === "Unassigned"
                          ? "#94A3B8"
                          : "#334155",
                      fontStyle:
                        deliveryDriverLabel === "Shop owner" ||
                        deliveryDriverLabel === "Unassigned"
                          ? "italic"
                          : "normal", }}>
                    {deliveryDriverLabel}
                  </p>
                </div>
                {deliveryCompletedByLabel ? (
                  <p style={{ margin: 0,  marginTop: 6, display: "block", color: "#64748B", fontSize: 12 }}>
                    Completed by {deliveryCompletedByLabel}
                    {orderData?.deliveryCompletedAt
                      ? ` · ${formatDate(orderData.deliveryCompletedAt, "DD MMM YYYY · HH:mm")}`
                      : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          <div style={CARD}>
            <div style={{ ...SECTION_HEAD }}>
              <div className="flex items-center gap-1.5">
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#F87171" }} />
                <p style={{ margin: 0, color: "var(--muted)",  fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Attempt outcomes
                </p>
              </div>
            </div>
            <div className="space-y-3" style={{ padding: 20 }}>
              {attemptRows.length ? (
                attemptRows.map((attempt) => {
                  const failed = String(attempt.status || "").toLowerCase() === "failed";
                  const feeCharged = Boolean(attempt.feeCharged);
                  return (
                    <div key={attempt.id} style={{ padding: 12,
                        borderRadius: "10px",
                        border: "1px solid #E5E7EB",
                        background: failed ? "#FFF7F7" : "#F8FAFC", }}>
                      <div className="flex items-center justify-between gap-2" style={{ marginBottom: 6 }}>
                        <p style={{ margin: 0,  fontWeight: 700,
                            fontSize: 12,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                            color: attempt.attemptType === "delivery" ? "#059669" : "#2563EB", }}>
                          {attempt.attemptType || "attempt"} #{attempt.attemptNumber || "—"}
                        </p>
                        <Badge tone={failed ? "danger" : "neutral"}>
                          {String(attempt.status || "—")}
                        </Badge>
                      </div>
                      {failed ? (
                        <>
                          <p style={{ margin: 0,  fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                            {attempt.failureReasonLabel || attempt.failureReason || "Reason not recorded"}
                          </p>
                          {attempt.failureReasonNote ? (
                            <p style={{ margin: 0, fontSize: 12, display: "block", marginTop: 4, color: "#64748B" }}>
                              Note: {attempt.failureReasonNote}
                            </p>
                          ) : null}
                          <div style={{ marginTop: 8 }}>
                            <Badge tone={feeCharged ? "warning" : "success"}>
                              {formatAttemptFeeLabel(attempt)}
                            </Badge>
                          </div>
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: 12, color: "#64748B" }}>
                          {attempt.completedAt
                            ? `Completed ${formatDate(attempt.completedAt, "DD MMM YYYY · HH:mm")}`
                            : String(attempt.status || "Open")}
                        </p>
                      )}
                      {attempt.driverName ? (
                        <p style={{ margin: 0, fontSize: 12, display: "block", marginTop: 6, color: "#64748B" }}>
                          By {attempt.driverName}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p style={{ margin: 0,  color: "#64748B", fontSize: 13 }}>
                  No pickup or delivery attempts recorded yet.
                </p>
              )}
            </div>
          </div>

          <div style={CARD}>
            <OdSectionTitle>Activity</OdSectionTitle>
            <OdTimeline rows={activityRows} />
          </div>

        </div>
      </div>
    </div>

    <InvoiceDetailModal
      open={invoiceModal.open}
      view={invoiceView}
      format={invoiceModal.format}
      onFormatChange={(format) => setInvoiceModal((prev) => ({ ...prev, format }))}
      onClose={handleCloseInvoiceModal}
      onPrint={handlePrintInvoice}
      onEdit={() => {
        handleCloseInvoiceModal();
        navigate(`/orders/edit/${orderId}`);
      }}
    />
    <AssignOrderModal
      open={assignModalOpen}
      bookingId={bookingId}
      bookingSnapshot={orderData}
      onClose={() => setAssignModalOpen(false)}
      onSuccess={() => refetchOrder()}
    />
    </>
  );
}

