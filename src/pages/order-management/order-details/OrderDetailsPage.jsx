import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
} from "@mui/material";
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
} from "../../../store/services/api";
import { BASE_URL } from "../../../utilities/URL";
import { canEditOrderFromBooking } from "../../../shared/orderEditStatusGate";
import ModalComponent from "../../../components/shared/Modal";
import useToaster from "../../../components/ui/Toaster";
import {
  mergeInvoiceDetailsFromResponse,
  resolveOrderSubtotal,
  resolveServicesSubtotal,
} from "../../../utilities/invoiceTotals";
import AssignOrderModal from "../order-modals/AssignOrderModal";
import OrderAssignActionButton from "../order-modals/OrderAssignActionButton";
import { canAdminAssignOrReassignFromBooking } from "../../../shared/adminAssignGate";

const statusStyleMap = {
  completed: { bg: "#D1FAE5", color: "#065F46", label: "Completed" },
  pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
  hold: { bg: "#FEF3C7", color: "#92400E", label: "On Hold" },
};

const CARD_SX = {
  borderRadius: "12px",
  border: "1px solid #E5E7EB",
  boxShadow: "0 1px 4px 0 rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.04)",
  overflow: "hidden",
};

const SECTION_HEADER_SX = {
  px: 2.5,
  py: 1.75,
  borderBottom: "1px solid #F1F5F9",
  bgcolor: "#FFFFFF",
};

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
  const formattedDate = dayjs(date).format("ddd DD MMM");
  if (timeFrom && timeTo) return `${formattedDate}, ${timeFrom} - ${timeTo}`;
  return formattedDate || fallback;
}

function formatAddress(address) {
  if (!address) return "N/A";
  const parts = [address.streetAddress, address.district, address.province].filter(
    Boolean
  );
  return parts.join(", ") || "N/A";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function toNumber(value, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function buildInvoiceView(invoiceDetails, fallbackShopName = "") {
  if (!invoiceDetails) return null;
  const customerName =
    `${invoiceDetails?.customer?.firstName || ""} ${invoiceDetails?.customer?.lastName || ""}`.trim() ||
    "Customer";
  const invoiceNo = invoiceDetails?.orderTrackId || `INV-${invoiceDetails?.id || ""}`;
  const dateText = dayjs(invoiceDetails?.createdAt || invoiceDetails?.collectionDate).isValid()
    ? dayjs(invoiceDetails.createdAt || invoiceDetails.collectionDate).format("DD MMM YYYY")
    : "N/A";
  const timeText = invoiceDetails?.collectionTimeTo || invoiceDetails?.collectionTimeFrom || "N/A";
  const addressText = [invoiceDetails?.customer?.phoneNum, invoiceDetails?.dropOffAddress?.streetAddress]
    .filter(Boolean)
    .join(" · ");
  const agentName =
    `${invoiceDetails?.driver?.firstName || ""} ${invoiceDetails?.driver?.lastName || ""}`.trim() ||
    fallbackShopName ||
    "justDray cleaner";
  const items = (invoiceDetails?.customerSelectedServices || [])
    .filter((it) => Number(it?.items) > 0)
    .map((it, idx) => ({
      id: it?.id || idx + 1,
      name: it?.subCategory?.name || it?.category?.name || it?.service?.name || "Item",
      qty: Number(it?.items) || 0,
      rate: Number(it?.categoryPrice || it?.subCategory?.price || 0),
      serviceName: it?.service?.name || "",
      addOns: (it?.addOns || []).map((ad) => ({
        name: ad?.name || ad?.addOnService?.name || ad?.service?.name || ad?.title || "Add-on",
        price: Number(ad?.price || 0),
        qty: Number(ad?.quantity || 1),
      })),
      preferences: (it?.selectedServicePreferences || [])
        .map((pref) => pref?.preferenceValue?.value)
        .filter(Boolean),
      instruction: it?.serviceInstruction || "",
    }));
  const addOns = items.reduce(
    (sum, item) =>
      sum +
      item.addOns.reduce((acc, ad) => acc + (Number(ad.qty) || 1) * (Number(ad.price) || 0), 0),
    0
  );
  const servicesSubtotal = resolveServicesSubtotal(invoiceDetails, items);
  const serviceCharge = Number(invoiceDetails?.billingDetail?.serviceCharge ?? 0);
  const minimumOrderFee = Number(invoiceDetails?.billingDetail?.upfrontAmount ?? 0);
  const discount = Number(invoiceDetails?.billingDetail?.discount ?? 0);
  const orderSubtotal = resolveOrderSubtotal(invoiceDetails, {
    servicesSubtotal,
    serviceCharge,
    minimumOrderFee,
  });
  const grandTotal = Number(
    invoiceDetails?.orderAmount ?? invoiceDetails?.billingDetail?.total ?? orderSubtotal
  );
  const pickupWindow = `${invoiceDetails?.collectionTimeFrom || "N/A"}-${invoiceDetails?.collectionTimeTo || "N/A"}`;
  const deliveryWindow = `${invoiceDetails?.deliveryTimeFrom || "N/A"}-${invoiceDetails?.deliveryTimeTo || "N/A"}`;
  const computedTotalItems = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  return {
    invoiceNo,
    customerName,
    dateText,
    timeText,
    addressText: addressText || "N/A",
    agentName,
    totalItems: computedTotalItems > 0 ? computedTotalItems : Number(invoiceDetails?.totalItems || 0),
    items,
    servicesSubtotal,
    subtotal: orderSubtotal,
    addOns,
    minimumOrderFee,
    serviceCharge,
    discount,
    grandTotal,
    pickupWindow,
    deliveryWindow,
    bags: Number(invoiceDetails?.noOfBags || 0),
    frequency: invoiceDetails?.frequency || "Just Once",
    emailOrPhone: [invoiceDetails?.customer?.phoneNum, invoiceDetails?.customer?.email]
      .filter(Boolean)
      .join(" · "),
    printedDate: dayjs().format("DD MMM YYYY"),
  };
}

function printHtmlDocument(html) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  iframe.onload = () => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1200);
  };
}

function a4InvoiceHtml(view) {
  const rows = view.items
    .map((item, idx) => {
      const addonRows = (item.addOns || []).length
        ? (item.addOns || [])
            .map(
              (ad) =>
                `<div class="itemSubRow"><span>+ ${ad.qty}x ${ad.name}</span><span>£${(
                  ad.qty * ad.price
                ).toFixed(2)}</span></div>`
            )
            .join("")
        : "";
      const prefRow =
        (item.preferences || []).length > 0
          ? `<div class="itemMuted">Pref: ${(item.preferences || []).join(", ")}</div>`
          : "";
      const instructionRow = item.instruction
        ? `<div class="itemMuted">${item.instruction}</div>`
        : "";
      return `<tr><td class="center">${idx + 1}</td><td class="itemCell"><div class="itemTitle">${item.serviceName ? `${item.serviceName} - ` : ""}${item.name}</div>${addonRows}${prefRow}${instructionRow}</td><td class="right">${item.qty}</td><td class="right">£${item.rate.toFixed(2)}</td><td class="right">£${(item.qty * item.rate).toFixed(2)}</td></tr>`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>A4 Receipt</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,sans-serif;color:#111827;margin:0;padding:20px;background:#fff}
    .sheet{max-width:1000px;margin:0 auto}
    .top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:14px}
    .brand{font-size:40px;font-weight:700;line-height:1.05;margin:0}
    .receiptTag{font-size:22px;font-weight:500;margin-top:3px}
    .meta{font-size:14px;line-height:1.5;min-width:230px}
    .metaRow{display:flex;gap:8px}
    .metaLabel{font-weight:700;min-width:58px}
    .customer{border:1px solid #d1d5db;border-radius:10px;padding:12px 14px;margin:12px 0 14px;display:flex;justify-content:space-between;align-items:flex-start;gap:18px}
    .customerMain{font-size:14px;line-height:1.4}
    .pieces{font-size:13px;font-weight:700;white-space:nowrap}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #d1d5db;padding:9px 10px;font-size:13px;vertical-align:top}
    th{background:#f8fafc;font-size:12px;letter-spacing:.02em}
    .center{text-align:center}
    .right{text-align:right}
    .itemCell{line-height:1.35}
    .itemTitle{font-weight:700}
    .itemSubRow{display:flex;justify-content:space-between;gap:10px;color:#374151;font-size:12px;margin-top:2px}
    .itemMuted{font-size:12px;color:#6b7280;margin-top:2px}
    .totals{margin-left:auto;width:280px;margin-top:10px}
    .totals .row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
    .totals .grand{font-weight:700;font-size:24px;padding-top:6px}
  </style>
  </head><body><div class="sheet">
    <div class="top">
      <div>
        <h1 class="brand">justDray cleaner</h1>
        <div class="receiptTag">CUSTOMER RECEIPT</div>
      </div>
      <div class="meta">
        <div class="metaRow"><span class="metaLabel">Invoice:</span><span>${view.invoiceNo}</span></div>
        <div class="metaRow"><span class="metaLabel">Date:</span><span>${view.dateText}</span></div>
        <div class="metaRow"><span class="metaLabel">Time:</span><span>${view.timeText}</span></div>
        <div class="metaRow"><span class="metaLabel">Agent:</span><span>${view.agentName}</span></div>
      </div>
    </div>
    <div class="customer">
      <div class="customerMain">
        <div><b>Customer:</b> ${view.customerName}</div>
        <div><b>Contact / Address:</b> ${view.addressText}</div>
      </div>
      <div class="pieces">Total Pieces: ${view.totalItems}</div>
    </div>
    <table>
      <thead><tr><th>#</th><th>ITEM DETAILS</th><th>QTY</th><th>RATE</th><th>LINE TOTAL</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Services subtotal</span><span>£${view.servicesSubtotal.toFixed(2)}</span></div>
      <div class="row"><span>Minimum Order Fee</span><span>-£${Math.abs(view.minimumOrderFee || 0).toFixed(2)}</span></div>
      <div class="row"><span>Service Charge</span><span>£${view.serviceCharge.toFixed(2)}</span></div>
      <div class="row"><span>Subtotal</span><span>£${view.subtotal.toFixed(2)}</span></div>
      <div class="row"><span>Discount</span><span>£${view.discount.toFixed(2)}</span></div>
      <div class="row grand"><span>Grand Total</span><span>£${view.grandTotal.toFixed(2)}</span></div>
    </div>
  </div></body></html>`;
}

function thermalInvoiceHtml(view) {
  const itemRows = view.items
    .map((item) => {
      const addonRows = item.addOns
        .map((ad) => `<div class="subrow"><span>+ ${ad.qty}x ${ad.name}</span><span>£${(ad.qty * ad.price).toFixed(2)}</span></div>`)
        .join("");
      return `<div class="row strong"><span>${item.qty}x ${item.serviceName ? `${item.serviceName} - ` : ""}${item.name}</span><span>£${(item.qty * item.rate).toFixed(2)}</span></div>${addonRows}`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>58mm Thermal</title><style>body{font-family:'Courier New',monospace}.ticket{width:58mm;margin:0 auto;padding:8px}.row{display:flex;justify-content:space-between;font-size:11px}.subrow{display:flex;justify-content:space-between;font-size:10px;padding-left:8px;color:#374151}.line{border-top:1px dashed #333;margin:6px 0}.strong{font-weight:700}</style></head><body><div class="ticket"><div style="text-align:center;font-weight:700">justDray cleaner</div><div style="text-align:center;font-size:11px">Customer Receipt</div><div style="text-align:center;font-size:10px">Format: 58mm Thermal</div><div class="line"></div><div class="row"><span>Invoice</span><span>${view.invoiceNo}</span></div><div class="row"><span>Date</span><span>${view.dateText}</span></div><div class="row"><span>Pickup</span><span>${view.pickupWindow}</span></div><div class="row"><span>Delivery</span><span>${view.deliveryWindow}</span></div><div class="line"></div><div><b>${view.customerName}</b></div><div style="font-size:10px">${view.emailOrPhone || ""}</div><div style="font-size:10px">${view.addressText}</div><div class="line"></div><div class="row strong"><span>Items (${view.totalItems})</span><span>Amount</span></div>${itemRows}<div class="line"></div><div class="row"><span>Services subtotal</span><span>£${view.servicesSubtotal.toFixed(2)}</span></div><div class="row"><span>Minimum Order Fee</span><span>-£${Math.abs(view.minimumOrderFee || 0).toFixed(2)}</span></div><div class="row"><span>Service Charge</span><span>£${view.serviceCharge.toFixed(2)}</span></div><div class="row"><span>Subtotal</span><span>£${view.subtotal.toFixed(2)}</span></div><div class="row"><span>Discount</span><span>£${view.discount.toFixed(2)}</span></div><div class="line"></div><div class="row strong" style="font-size:18px"><span>Total</span><span>£${view.grandTotal.toFixed(2)}</span></div></div></body></html>`;
}

export default function OrderDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const orderId = Number(id);
  const { error: showError } = useToaster();

  const { data: orderResponse, isLoading, refetch: refetchOrder } =
    useGetOrderForEditQuery(orderId, {
    skip: !orderId,
  });
  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const [fetchInvoice, { isFetching: isFetchingInvoice }] = useLazyInvoiceCreationQuery();
  const orderData = orderResponse?.data;
  const shopName =
    orderData?.laundryShop?.bussinessInformations?.[0]?.shopName ||
    orderData?.laundryShop?.shopName ||
    orderData?.laundryShop?.name ||
    "";
  const bookingId = orderData?.id || orderId;

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
  const orderStatusOptions = useMemo(
    () => (Array.isArray(statusesResponse?.data) ? statusesResponse.data : []),
    [statusesResponse?.data]
  );
  const canShowGenerateInvoice = useMemo(() => {
    if (!orderData) return false;
    return canEditOrderFromBooking(orderData, orderStatusOptions);
  }, [orderData, orderStatusOptions]);

  const canShowAdminAssign = useMemo(() => {
    return canAdminAssignOrReassignFromBooking(orderData);
  }, [orderData]);

  const groupedItems = useMemo(() => {
    if (!orderItemsData?.customerServices) return [];
    return orderItemsData.customerServices.flatMap((service) => {
      const itemGroups = {};
      service.categories?.forEach((category) => {
        category.subCategories?.forEach((subCategory) => {
          const key = `${service.serviceName}-${subCategory.name}`;
          if (!itemGroups[key]) {
            itemGroups[key] = {
              serviceName: service.serviceName,
              name: subCategory.name,
              price: subCategory.price,
              count: 0,
              categoryName: category.name,
            };
          }
          itemGroups[key].count += 1;
        });
      });
      return Object.values(itemGroups);
    });
  }, [orderItemsData]);
  const selectedServiceGroups = useMemo(() => {
    const rows = Array.isArray(orderData?.customerSelectedServices)
      ? orderData.customerSelectedServices.filter((it) => Number(it?.items) > 0)
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
      map[sid].items.push({
        id: it?.id,
        itemName: it?.subCategory?.name || it?.category?.name || "Item",
        categoryName: it?.category?.name || "",
        qty: Number(it?.items) || 0,
        unitPrice: Number(it?.categoryPrice || it?.subCategory?.price || 0),
        serviceImage: it?.service?.image || "",
        addOns: Array.isArray(it?.addOns) ? it.addOns : [],
        preferences: Array.isArray(it?.selectedServicePreferences)
          ? it.selectedServicePreferences
              .map((p) => p?.preferenceValue?.value)
              .filter(Boolean)
          : [],
      });
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
            Number(item.quantity ?? item.items ?? 0) *
              Number(item.categoryPrice ?? item.price ?? 0),
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
  const invoiceView = useMemo(
    () => buildInvoiceView(invoiceDetails, shopName),
    [invoiceDetails, shopName]
  );
  const invoicePreviewHtml = useMemo(() => {
    if (!invoiceView) return "";
    return invoiceModal.format === "thermal"
      ? thermalInvoiceHtml(invoiceView)
      : a4InvoiceHtml(invoiceView);
  }, [invoiceModal.format, invoiceView]);

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
    const html = invoiceModal.format === "thermal" ? thermalInvoiceHtml(invoiceView) : a4InvoiceHtml(invoiceView);
    printHtmlDocument(html);
  };

  const handlePrintReceipt = () => {
    if (!orderData) return;

    const receiptOrderId = orderData?.orderTrackId || orderData?.id || orderId || "";
    const createdAt = dayjs(orderData?.created_at || orderData?.createdAt).isValid()
      ? dayjs(orderData?.created_at || orderData?.createdAt).format("ddd DD MMM YYYY · HH:mm")
      : "";

    const customerName = `${orderData?.customer?.firstName || ""} ${orderData?.customer?.lastName || ""}`.trim();
    const customerEmail = orderData?.customer?.email || "";
    const customerPhone = orderData?.customer?.phone || orderData?.customer?.mobile || "";

    const pickupDateText = dayjs(orderData?.collectionDate).isValid()
      ? dayjs(orderData?.collectionDate).format("ddd DD MMM YYYY")
      : "N/A";
    const pickupTimeText =
      orderData?.collectionTimeFrom && orderData?.collectionTimeTo
        ? `${orderData.collectionTimeFrom} - ${orderData.collectionTimeTo}`
        : orderData?.collectionTimeFrom || "N/A";

    const deliveryDateText = dayjs(orderData?.deliveryDate).isValid()
      ? dayjs(orderData?.deliveryDate).format("ddd DD MMM YYYY")
      : "N/A";
    const deliveryTimeText =
      orderData?.deliveryTimeFrom && orderData?.deliveryTimeTo
        ? `${orderData.deliveryTimeFrom} - ${orderData.deliveryTimeTo}`
        : orderData?.deliveryTimeFrom || "N/A";

    const dropOff = orderData?.dropOffAddress || null;
    const pickup = orderData?.pickupAddress || null;

    const items = Array.isArray(groupedItems)
      ? groupedItems.map((row) => ({
          label: `${row.name} (${row.serviceName})`,
          qty: row.count,
          price: row.price,
        }))
      : [];

    const itemsHtml =
      items.length > 0
        ? items
            .map(
              (it) => `
              <div class="row item">
                <div class="grow">
                  <div class="name">${escapeHtml(it.label)}</div>
                  <div class="muted">Qty: ${escapeHtml(it.qty)}</div>
                </div>
                <div class="price">$${escapeHtml((Number(it.qty || 0) * Number(it.price || 0)).toFixed(2))}</div>
              </div>
            `
            )
            .join("")
        : `<div class="muted">No items</div>`;

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Receipt #${escapeHtml(receiptOrderId)}</title>
    <style>
      @page { margin: 12mm; }
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color: #0f172a; }
      .sheet { max-width: 520px; margin: 0 auto; }
      .brand { display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; }
      .brand h1 { margin:0; font-size: 16px; letter-spacing: .08em; text-transform: uppercase; }
      .brand .meta { text-align:right; font-size: 12px; color: #475569; }
      .divider { height:1px; background:#e2e8f0; margin: 12px 0; }
      .sectionTitle { font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: #64748b; margin: 0 0 8px; font-weight: 700; }
      .row { display:flex; justify-content:space-between; gap: 12px; }
      .grow { flex: 1; min-width: 0; }
      .muted { color:#64748b; font-size: 12px; }
      .value { font-size: 13px; color:#334155; font-weight: 600; }
      .item { padding: 8px 0; border-bottom: 1px dashed #e2e8f0; }
      .item:last-child { border-bottom: none; }
      .name { font-size: 13px; font-weight: 700; color:#0f172a; }
      .price { font-size: 13px; font-weight: 700; white-space: nowrap; }
      .totals { margin-top: 10px; }
      .totals .row { padding: 6px 0; }
      .totals .grand { border-top: 2px solid #0f172a; margin-top: 8px; padding-top: 10px; }
      .footer { margin-top: 18px; text-align:center; font-size: 11px; color:#64748b; }
      .pill { display:inline-flex; align-items:center; gap:6px; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background:#f1f5f9; color:#334155; }
      .dot { width: 6px; height: 6px; border-radius: 50%; background: #0ea5e9; display:inline-block; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <div class="brand">
        <div>
          <h1>Receipt</h1>
          <div class="muted">Order #${escapeHtml(receiptOrderId)}</div>
          ${statusBadge?.label ? `<div style="margin-top:6px"><span class="pill"><span class="dot"></span>${escapeHtml(statusBadge.label)}</span></div>` : ""}
        </div>
        <div class="meta">
          <div>${escapeHtml(createdAt)}</div>
          <div>${escapeHtml(shopName || "")}</div>
        </div>
      </div>

      <div class="divider"></div>

      <div>
        <div class="sectionTitle">Customer</div>
        <div class="row"><div class="muted">Name</div><div class="value">${escapeHtml(customerName || "N/A")}</div></div>
        ${customerPhone ? `<div class="row"><div class="muted">Phone</div><div class="value">${escapeHtml(customerPhone)}</div></div>` : ""}
        ${customerEmail ? `<div class="row"><div class="muted">Email</div><div class="value">${escapeHtml(customerEmail)}</div></div>` : ""}
      </div>

      <div class="divider"></div>

      <div>
        <div class="sectionTitle">Schedule</div>
        <div class="row"><div class="muted">Pickup</div><div class="value">${escapeHtml(pickupDateText)} · ${escapeHtml(pickupTimeText)}</div></div>
        <div class="row"><div class="muted">Delivery</div><div class="value">${escapeHtml(deliveryDateText)} · ${escapeHtml(deliveryTimeText)}</div></div>
      </div>

      <div class="divider"></div>

      <div>
        <div class="sectionTitle">Address</div>
        <div class="row"><div class="muted">Pickup</div><div class="value">${escapeHtml(formatAddress(pickup))}</div></div>
        <div class="row"><div class="muted">Drop off</div><div class="value">${escapeHtml(formatAddress(dropOff))}</div></div>
      </div>

      <div class="divider"></div>

      <div>
        <div class="sectionTitle">Items</div>
        ${itemsHtml}
      </div>

      <div class="divider"></div>

      <div class="totals">
        <div class="row"><div class="muted">Total items</div><div class="value">${escapeHtml(orderData?.totalItems || items.reduce((s, i) => s + Number(i.qty || 0), 0) || 0)}</div></div>
        <div class="row grand"><div class="name">Total</div><div class="price">$${escapeHtml(orderTotal)}</div></div>
      </div>

      <div class="footer">Thank you</div>
    </div>
    <script>
      window.onload = () => { window.print(); };
    </script>
  </body>
</html>`;

    // Use an off-screen iframe for reliable printing (avoids popup blockers/blank tabs).
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document;
    if (!frameDoc) {
      document.body.removeChild(iframe);
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const cleanup = () => {
      setTimeout(() => {
        if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
      }, 1200);
    };

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      cleanup();
    };
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

  const activityRows = [
    {
      text: `Order ${statusBadge.label.toLowerCase()}`,
      time: formatDateTime(
        orderData?.deliveryDate,
        orderData?.deliveryTimeFrom,
        orderData?.deliveryTimeTo
      ),
    },
    {
      text: `Items collected (${pickupItemsCount || 0})`,
      time: formatDateTime(
        orderData?.collectionDate,
        orderData?.collectionTimeFrom,
        orderData?.collectionTimeTo
      ),
    },
    {
      text: "Order placed",
      time: dayjs(orderData?.created_at).isValid()
        ? dayjs(orderData?.created_at).format("ddd DD MMM · HH:mm")
        : `Order #${orderData?.orderTrackId || orderData?.id}`,
    },
  ];

  if (isLoading) return <Delay />;

  if (!orderData) {
    return (
      <Box className="space-y-6!">
        <Button
          startIcon={<TbChevronLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: "none" }}
        >
          Back
        </Button>
        <Paper sx={{ p: 4 }}>
          <Typography>No order data available</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <>
    <Box sx={{ pb: 1, width: "100%", display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Paper sx={{ ...CARD_SX, px: 2.5, py: 1.75 }}>
        <Box className="flex items-center justify-between gap-3 flex-wrap">
          <Box className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              aria-label="Go back"
              className="flex items-center justify-center p-1 rounded-lg hover:bg-grey50 transition-colors"
            >
              <TbChevronLeft size={20} />
            </button>
            <Box>
              <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                Order Details
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                #{orderData.orderTrackId || orderData.id}
              </Typography>
            </Box>
          </Box>

          <Box className="flex items-center gap-2">
            <Button
              variant="outlined"
              size="medium"
              disabled={!orderId || orderId <= 1}
              onClick={() => navigate(`/orders/details/${orderId - 1}`)}
              sx={{
                minWidth: 40,
                width: 40,
                height: 40,
                borderRadius: "8px",
                borderColor: "#E2E8F0",
                color: "#64748B",
              }}
            >
              <TbChevronLeft size={22} />
            </Button>
            <Button
              variant="outlined"
              size="medium"
              disabled={!orderId}
              onClick={() => navigate(`/orders/details/${orderId + 1}`)}
              sx={{
                minWidth: 40,
                width: 40,
                height: 40,
                borderRadius: "8px",
                borderColor: "#E2E8F0",
                color: "#64748B",
              }}
            >
              <TbChevronRight size={22} />
            </Button>
            {canShowGenerateInvoice ? (
              <Button
                variant="outlined"
                onClick={handleOpenInvoiceModal}
                disabled={isFetchingInvoice}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px",
                  borderColor: "#D0D5DD",
                  color: "#344054",
                  bgcolor: "#fff",
                  fontWeight: 600,
                  fontSize: 13,
                  minHeight: 40,
                  px: 2,
                }}
              >
                {isFetchingInvoice ? "Generating..." : "Generate Invoice"}
              </Button>
            ) : null}
            {canShowAdminAssign ? (
              <OrderAssignActionButton
                booking={orderData}
                size="medium"
                onClick={() => setAssignModalOpen(true)}
              />
            ) : null}
            <Button
              variant="contained"
              onClick={() => navigate(`/orders/edit/${orderId}`)}
              sx={{
                textTransform: "none",
                borderRadius: "8px",
                bgcolor: "#000099",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                minHeight: 40,
                px: 2,
                "&:hover": { bgcolor: "#00007A" },
              }}
            >
              Edit Order
            </Button>
          </Box>
        </Box>
      </Paper>
      <Box className="grid grid-cols-1 xl:grid-cols-[1fr_304px] gap-5">
        <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
          <Paper sx={CARD_SX}>
            <Box sx={{ p: 2.5 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
                  alignItems: "start",
                  gap: 2,
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontSize: 10,
                      letterSpacing: "0.08em",
                      fontWeight: 700,
                      textTransform: "uppercase",
                    }}
                  >
                    Order ID
                  </Typography>
                  <Typography
                    fontFamily="Switzer"
                    fontWeight={700}
                    sx={{ lineHeight: 1.1, fontSize: 28, color: "#0F172A" }}
                  >
                    #{orderData.orderTrackId || orderData.id}
                  </Typography>
                  <Box className="flex items-center gap-2 flex-wrap">
                    <Box
                      sx={{
                        bgcolor: statusBadge.bg,
                        color: statusBadge.color,
                        px: 1.6,
                        minHeight: 26,
                        borderRadius: "999px",
                        display: "inline-flex",
                        alignItems: "center",
                        border: "1px solid rgba(0,0,0,0.08)",
                      }}
                    >
                      <Typography variant="caption" fontWeight={700} sx={{ fontSize: 10 }}>
                        {statusBadge.label}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        px: 1.3,
                        minHeight: 26,
                        borderRadius: "999px",
                        bgcolor: "#EFF6FF",
                        color: "#2563EB",
                        border: "1px solid #BFDBFE",
                        display: "inline-flex",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10 }}>
                        {orderData.frequency || "Just Once"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: 1.2,
                  }}
                >
                  <Paper
                    sx={{
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      boxShadow: "none",
                      p: 1.5,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}
                    >
                      Order Total
                    </Typography>
                    <Typography
                      fontFamily="Switzer"
                      fontWeight={700}
                      color="#0000A0"
                      sx={{ mt: 0.35, fontSize: 24, lineHeight: 1 }}
                    >
                      ${orderTotal}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#93C5FD" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Collection & Delivery
                </Typography>
              </Box>
            </Box>
            <Box className="grid grid-cols-1 md:grid-cols-2" sx={{ bgcolor: "#FCFDFE" }}>
              <Box
                sx={{
                  p: 2.5,
                  borderRight: { md: "1px solid #E4E7EC" },
                  borderBottom: { xs: "1px solid #E4E7EC", md: "none" },
                }}
              >
                <Box className="flex items-center justify-between gap-2 mb-1.5">
                  <Box className="flex items-center gap-2">
                    <TbFileDescription size={16} color="#2563EB" />
                    <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10, letterSpacing: "0.05em" }}>
                      COLLECTION
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1.1, py: 0.35, borderRadius: "999px", bgcolor: "#EFF6FF", border: "1px solid #BFDBFE" }}>
                    <Typography sx={{ fontSize: 10, color: "#1D4ED8", fontWeight: 700 }}>
                      Pickup Window
                    </Typography>
                  </Box>
                </Box>
                <Typography fontFamily="Switzer" fontWeight={700} sx={{ fontSize: 20, color: "#0F172A", lineHeight: 1.2 }}>
                  {orderData.collectionTimeFrom || "N/A"} -{" "}
                  {orderData.collectionTimeTo || "N/A"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
                  {dayjs(orderData.collectionDate).isValid()
                    ? dayjs(orderData.collectionDate).format("ddd DD MMM YYYY")
                    : "N/A"}
                </Typography>
                <Box sx={{ mt: 2, pt: 1.6, borderTop: "1px solid #E9EEF5" }}>
                  <TbFileDescription size={16} color="#2563EB" />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}
                  >
                    Proof of Pickup
                  </Typography>
                  <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    <Paper sx={{ p: 1, border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: "8px", bgcolor: "#fff" }}>
                      <Typography sx={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                        Items Counted
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                        {pickupItemsDisplayCount || 0}
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: 1, border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: "8px", bgcolor: "#fff" }}>
                      <Typography sx={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                        Images
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                        {pickupProofs.length || 0}
                      </Typography>
                    </Paper>
                  </Box>
                  {pickupProofs.some((p) => p.note) && (
                    <Paper
                      sx={{ mt: 1, p: 1.1, bgcolor: "#FFFBEB", border: "1px solid #FDE68A", boxShadow: "none", borderRadius: "8px" }}
                    >
                      <Typography variant="caption" color="#92400E" sx={{ fontSize: 11 }}>
                        Note: {pickupProofs.find((p) => p.note)?.note}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Box>

              <Box sx={{ p: 2.5 }}>
                <Box className="flex items-center justify-between gap-2 mb-1.5">
                  <Box className="flex items-center gap-2">
                    <MdOutlineStore size={16} color="#059669" />
                    <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, fontSize: 10, letterSpacing: "0.05em" }}>
                      DELIVERY
                    </Typography>
                  </Box>
                  <Box sx={{ px: 1.1, py: 0.35, borderRadius: "999px", bgcolor: "#ECFDF5", border: "1px solid #A7F3D0" }}>
                    <Typography sx={{ fontSize: 10, color: "#047857", fontWeight: 700 }}>
                      Drop-off Window
                    </Typography>
                  </Box>
                </Box>
                <Typography fontFamily="Switzer" fontWeight={700} sx={{ fontSize: 20, color: "#0F172A", lineHeight: 1.2 }}>
                  {orderData.deliveryTimeFrom || "N/A"} -{" "}
                  {orderData.deliveryTimeTo || "N/A"}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 12, mt: 0.5 }}>
                  {dayjs(orderData.deliveryDate).isValid()
                    ? dayjs(orderData.deliveryDate).format("ddd DD MMM YYYY")
                    : "N/A"}
                </Typography>
                <Box sx={{ mt: 2, pt: 1.6, borderTop: "1px solid #E9EEF5" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Proof of Delivery
                  </Typography>
                  <Box sx={{ mt: 1, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
                    <Paper sx={{ p: 1, border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: "8px", bgcolor: "#fff" }}>
                      <Typography sx={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                        Items Counted
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                        {deliveryItemsDisplayCount || 0}
                      </Typography>
                    </Paper>
                    <Paper sx={{ p: 1, border: "1px solid #E2E8F0", boxShadow: "none", borderRadius: "8px", bgcolor: "#fff" }}>
                      <Typography sx={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>
                        Images
                      </Typography>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                        {deliveryProofs.length || 0}
                      </Typography>
                    </Paper>
                  </Box>
                  {pickupItemsCount > deliveryItemsCount && (
                    <Paper
                      sx={{ mt: 1, p: 1.1, bgcolor: "#FEF2F2", border: "1px solid #FECACA", boxShadow: "none", borderRadius: "8px" }}
                    >
                      <Typography variant="caption" color="#B91C1C" sx={{ fontSize: 11 }}>
                        Delivery item count is lower than pickup count.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box
              sx={SECTION_HEADER_SX}
              className="flex items-center justify-between"
            >
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#A78BFA" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Proof of Collection & Delivery
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {dayjs(orderData.collectionDate).isValid()
                  ? dayjs(orderData.collectionDate).format("ddd DD MMM")
                  : "N/A"}{" "}
                -{" "}
                {dayjs(orderData.deliveryDate).isValid()
                  ? dayjs(orderData.deliveryDate).format("ddd DD MMM")
                  : "N/A"}
              </Typography>
            </Box>

            <Box className="grid grid-cols-1 md:grid-cols-2">
              <Box
                sx={{
                  p: 2.5,
                  borderRight: { md: "1px solid #E4E7EC" },
                  borderBottom: { xs: "1px solid #E4E7EC", md: "none" },
                }}
              >
                <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10 }}>
                  PROOF OF PICKUP
                </Typography>
                <Box className="grid grid-cols-3 gap-2 mt-2">
                  {pickupProofs.length ? (
                    pickupProofs.slice(0, 3).map((proof, idx) => (
                      <Box
                        key={proof.id || idx}
                        className="aspect-square rounded-md overflow-hidden bg-[#F3F4F6]"
                      >
                        <img
                          src={`${BASE_URL}${proof.imgUpload}`}
                          alt={`pickup-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </Box>
                    ))
                  ) : (
                    <Paper
                      sx={{
                        p: 1.8,
                        gridColumn: "1 / -1",
                        textAlign: "left",
                        bgcolor: "#F8FAFC",
                        border: "1px dashed #E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "none",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        No images attached
                      </Typography>
                    </Paper>
                  )}
                </Box>
                <Box sx={{ mt: 2 }} className="space-y-0">
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Items Collected</Typography>
                    <Typography sx={{ fontSize: 11, color: "#334155", fontWeight: 600 }}>
                      {pickupItemsDisplayCount || 0} items
                    </Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Driver Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Customer Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Timestamp</Typography>
                    <Typography sx={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{pickupProofTime}</Typography>
                  </Box>
                </Box>
                {pickupProofs.some((p) => p.note) && (
                  <Paper
                    sx={{
                      mt: 1.5,
                      p: 1.4,
                      bgcolor: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      borderRadius: "8px",
                      boxShadow: "none",
                    }}
                  >
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#D97706", textTransform: "uppercase", mb: 0.6 }}>
                      Driver Note
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#334155" }}>
                      {pickupProofs.find((p) => p.note)?.note}
                    </Typography>
                  </Paper>
                )}
              </Box>

              <Box sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, fontSize: 10 }}>
                  PROOF OF DELIVERY
                </Typography>
                <Box className="grid grid-cols-3 gap-2 mt-2">
                  {deliveryProofs.length ? (
                    deliveryProofs.slice(0, 3).map((proof, idx) => (
                      <Box
                        key={proof.id || idx}
                        className="aspect-square rounded-md overflow-hidden bg-[#F3F4F6]"
                      >
                        <img
                          src={`${BASE_URL}${proof.imgUpload}`}
                          alt={`delivery-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </Box>
                    ))
                  ) : (
                    <Paper
                      sx={{
                        p: 1.8,
                        gridColumn: "1 / -1",
                        textAlign: "left",
                        bgcolor: "#F8FAFC",
                        border: "1px dashed #E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "none",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        No images available
                      </Typography>
                    </Paper>
                  )}
                </Box>
                <Box sx={{ mt: 2 }} className="space-y-0">
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Items Delivered</Typography>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: deliveryItemsCount > 0 ? "#334155" : "#EF4444",
                        fontWeight: 600,
                      }}
                    >
                      {deliveryItemsDisplayCount || 0} items
                    </Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Driver Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Customer Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Timestamp</Typography>
                    <Typography sx={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{deliveryProofTime}</Typography>
                  </Box>
                </Box>
                {pickupItemsCount > deliveryItemsCount && (
                  <Paper
                    sx={{
                      mt: 1.5,
                      p: 1.4,
                      bgcolor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: "8px",
                      boxShadow: "none",
                    }}
                  >
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", mb: 0.6 }}>
                      Alert
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                      {deliveryItemsCount || 0} items recorded at delivery. Possible mismatch with
                      pickup count of {pickupItemsCount || 0}.
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box
              sx={SECTION_HEADER_SX}
              className="flex items-center justify-between"
            >
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#34D399" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Order Items
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.4,
                  minHeight: 30,
                  borderRadius: "6px",
                  bgcolor: "#ECFDF3",
                  border: "1px solid #86EFAC",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="caption"
                  color="#15803D"
                  sx={{ fontWeight: 700, fontSize: 11, lineHeight: 1.1, display: "flex", alignItems: "center" }}
                >
                  {selectedServiceGroups.length || 0} service(s)
                </Typography>
              </Box>
            </Box>

            <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              {!selectedServiceGroups.length ? (
                <Typography variant="body2" color="text.secondary" sx={{ fontSize: 15, py: 0.6 }}>
                  {isLoadingItems ? "Loading items..." : "No selected order items available"}
                </Typography>
              ) : (
                <>
                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
                      Select service
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1.25, overflowX: "auto", pb: 0.5 }}>
                      {selectedServiceGroups.map((serviceGroup) => {
                        const active = String(serviceGroup.serviceId) === String(selectedItemsServiceIdResolved);
                        const imgUrl =
                          serviceGroup.items?.[0]?.serviceImage
                            ? `${BASE_URL}${String(serviceGroup.items[0].serviceImage).replace(/^\//, "")}`
                            : "";
                        const initial = (serviceGroup.serviceName || "?").trim().charAt(0).toUpperCase();
                        return (
                          <Box
                            key={`svc-chip-${serviceGroup.serviceId}`}
                            component="button"
                            type="button"
                            onClick={() => setSelectedItemsServiceId(serviceGroup.serviceId)}
                            sx={{
                              flex: "0 0 auto",
                              minWidth: 92,
                              maxWidth: 112,
                              px: 1.25,
                              py: 1.25,
                              borderRadius: "12px",
                              border: "none",
                              bgcolor: active ? "#EFF6FF" : "#F8FAFC",
                              cursor: "pointer",
                            }}
                          >
                            <Box
                              sx={{
                                width: 48,
                                height: 48,
                                mx: "auto",
                                mb: 1,
                                borderRadius: "10px",
                                overflow: "hidden",
                                bgcolor: "#EEF2FF",
                                border: "1px solid #E2E8F0",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {imgUrl ? (
                                <Box component="img" src={imgUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              ) : (
                                <Typography sx={{ fontSize: 15, color: "#94A3B8" }}>{initial}</Typography>
                              )}
                            </Box>
                            <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25, color: active ? "#2563EB" : "#64748B" }}>
                              {serviceGroup.serviceName}
                            </Typography>
                            <Typography sx={{ mt: 0.35, fontSize: 11, color: "#475569" }}>
                              {serviceGroup.items.reduce((sum, item) => sum + (item.qty || 0), 0)} item(s)
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  <Box>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
                      Category
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2.25, overflowX: "auto", borderBottom: "1px solid #E5E7EB" }}>
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setSelectedItemsCategoryKey("all")}
                        sx={{
                          pb: 1.1,
                          border: "none",
                          bgcolor: "transparent",
                          fontWeight: 700,
                          fontSize: 14,
                          color: selectedItemsCategoryKey === "all" ? "#2563EB" : "#64748B",
                          borderBottom: "2px solid",
                          borderBottomColor: selectedItemsCategoryKey === "all" ? "#2563EB" : "transparent",
                          mb: "-1px",
                          cursor: "pointer",
                        }}
                      >
                        All
                      </Box>
                      {categoryTabsForSelectedService.map((tab) => (
                        <Box
                          key={`cat-tab-${tab.key}`}
                          component="button"
                          type="button"
                          onClick={() => setSelectedItemsCategoryKey(tab.key)}
                          sx={{
                            pb: 1.1,
                            border: "none",
                            bgcolor: "transparent",
                            whiteSpace: "nowrap",
                            fontWeight: 700,
                            fontSize: 14,
                            color: selectedItemsCategoryKey === tab.key ? "#2563EB" : "#64748B",
                            borderBottom: "2px solid",
                            borderBottomColor: selectedItemsCategoryKey === tab.key ? "#2563EB" : "transparent",
                            mb: "-1px",
                            cursor: "pointer",
                          }}
                        >
                          {tab.label}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mt: 0.25,
                    }}
                  >
                    <Box sx={{ width: 4, height: 22, bgcolor: "#2563EB", borderRadius: 1 }} />
                    <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>
                      {selectedItemsCategoryKey === "all" ? "Items" : selectedItemsCategoryKey}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                    {visibleOrderItems.map((item) => {
                      const lineTotal = (item.qty || 0) * (item.unitPrice || 0);
                      return (
                        <Box
                          key={`item-${item.id}`}
                          sx={{
                            border: "1px solid #E5E7EB",
                            borderRadius: "12px",
                            p: 1.5,
                            bgcolor: "#fff",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 1,
                            }}
                          >
                            <Box>
                              <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>
                                {item.itemName}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: "#64748B" }}>
                                {item.categoryName || selectedServiceData?.serviceName}
                              </Typography>
                              <Typography sx={{ mt: 0.45, fontSize: 13, color: "#0F172A", fontWeight: 600 }}>
                                ${item.unitPrice.toFixed(2)}{" "}
                                <Box component="span" sx={{ color: "#94A3B8", fontWeight: 500 }}>
                                  / piece
                                </Box>
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: "right" }}>
                              <Typography sx={{ fontSize: 11, color: "#334155" }}>
                                Qty: <b>{item.qty}</b>
                              </Typography>
                              <Typography sx={{ mt: 0.4, fontSize: 22, fontWeight: 700, color: "#0F172A" }}>
                                ${lineTotal.toFixed(2)}
                              </Typography>
                            </Box>
                          </Box>
                          {(item.addOns || []).length > 0 && (
                            <Box sx={{ mt: 0.75 }}>
                              {(item.addOns || []).map((ad, idx) => (
                                <Typography key={`addon-${item.id}-${idx}`} sx={{ fontSize: 11, color: "#475569" }}>
                                  + {Number(ad?.quantity || 1)}x {ad?.name || ad?.addOnService?.name || "Add-on"} (
                                  ${((Number(ad?.quantity || 1) * Number(ad?.price || 0))).toFixed(2)})
                                </Typography>
                              ))}
                            </Box>
                          )}
                          {(item.preferences || []).length > 0 && (
                            <Typography sx={{ mt: 0.55, fontSize: 11, color: "#64748B" }}>
                              Preferences: {item.preferences.join(", ")}
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Box>
                </>
              )}
            </Box>

            <Box sx={{ p: 2.5, borderTop: "1px solid #E4E7EC", bgcolor: "#FCFCFD", display: "flex", flexDirection: "column", rowGap: 0.4 }}>
              <Box className="flex items-center justify-between" sx={{ py: 0.9 }}>
                <Typography variant="body2" color="text.secondary">
                  Services subtotal
                </Typography>
                <Typography variant="body2">${servicesSubtotalAmount.toFixed(2)}</Typography>
              </Box>
              <Box className="flex items-center justify-between" sx={{ py: 0.9 }}>
                <Typography variant="body2" color="text.secondary">
                  Minimum Order Fee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  -${Math.abs(minimumOrderFeeAmount).toFixed(2)}
                </Typography>
              </Box>
              <Box className="flex items-center justify-between" sx={{ py: 0.9 }}>
                <Typography variant="body2" color="text.secondary">
                  Service Charge
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ${serviceChargeAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box className="flex items-center justify-between" sx={{ py: 0.9 }}>
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">${orderSubtotalAmount.toFixed(2)}</Typography>
              </Box>
              <Box className="flex items-center justify-between" sx={{ py: 0.9 }}>
                <Typography variant="body2" color="text.secondary">
                  Delivery Fee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ${deliveryFeeAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box className="flex items-center justify-between" sx={{ py: 0.9 }}>
                <Typography variant="body2" color="text.secondary">
                  Driver Tip
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  ${tipAmount.toFixed(2)}
                </Typography>
              </Box>
              <Box className="flex items-center justify-between pt-2.5 mt-2.5" sx={{ borderTop: "1px solid #E4E7EC" }}>
                <Typography fontFamily="Switzer" fontWeight={700}>
                  Total
                </Typography>
                <Typography fontFamily="Switzer" fontWeight={700} color="primary.main">
                  ${orderTotal}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* ── Service Comparison: Customer Original vs Agent Invoice ─────── */}
          {(comparisonData || isLoadingComparison) && (
            <Paper sx={CARD_SX}>
              <Box sx={SECTION_HEADER_SX} className="flex items-center justify-between">
                <Box className="flex items-center gap-1.5">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#F59E0B" }} />
                  <Typography variant="caption" color="text.secondary"
                    sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Service Comparison
                  </Typography>
                  {comparisonData?.fallbackToLive && (
                    <Typography variant="caption"
                      sx={{ fontSize: 10, color: "#9CA3AF", fontStyle: "italic", ml: 1 }}>
                      (snapshot not yet available — showing current services)
                    </Typography>
                  )}
                </Box>
                <Box sx={{ px: 1.3, minHeight: 22, borderRadius: "999px", bgcolor: "#FFFBEB", border: "1px solid #FDE68A", display: "inline-flex", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 10, color: "#B45309", fontWeight: 700 }}>Customer vs Agent</Typography>
                </Box>
              </Box>

              {isLoadingComparison ? (
                <Box sx={{ p: 2.5 }}>
                  <Typography variant="caption" color="text.secondary">Loading comparison...</Typography>
                </Box>
              ) : (
                <Box className="grid grid-cols-1 md:grid-cols-2">
                  {/* ── Customer Original ── */}
                  <Box sx={{ p: 2.5, borderRight: { md: "1px solid #E4E7EC" } }}>
                    <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 4, height: 18, bgcolor: "#F59E0B", borderRadius: 1 }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#92400E", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Customer Selected
                      </Typography>
                    </Box>
                    {(!comparisonData?.customerOriginal?.services?.length) ? (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>No snapshot available</Typography>
                    ) : (() => {
                      const groups = {};
                      (comparisonData.customerOriginal.services || []).forEach((svc) => {
                        const heading = svc.service?.name || "Other";
                        if (!groups[heading]) groups[heading] = [];
                        groups[heading].push(svc);
                      });
                      return (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {Object.entries(groups).map(([heading, items]) => (
                            <Box key={heading}>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#92400E", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.75, borderBottom: "1px solid #FDE68A", pb: 0.4 }}>
                                {heading}
                              </Typography>
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                                {items.map((svc, idx) => (
                                  <Box key={`orig-${svc.id || idx}`} sx={{ border: "1px solid #FDE68A", borderRadius: "10px", p: 1.4, bgcolor: "#FFFBEB" }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                                      {svc.subCategory?.name || svc.category?.name || "Item"}
                                    </Typography>
                                    <Box className="flex items-center gap-3 mt-0.5 flex-wrap">
                                      {svc.items != null && (
                                        <Typography sx={{ fontSize: 11, color: "#475569" }}>Qty: <b>{svc.items}</b></Typography>
                                      )}
                                      {svc.categoryPrice != null && (
                                        <Typography sx={{ fontSize: 11, color: "#475569" }}>£{Number(svc.categoryPrice).toFixed(2)}/pc</Typography>
                                      )}
                                    </Box>
                                    {(svc.preferences || []).length > 0 && (
                                      <Box sx={{ mt: 0.75, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                        {svc.preferences.map((pref, pi) => (
                                          <Box key={pi} sx={{ px: 1, py: 0.3, borderRadius: "999px", bgcolor: "#FEF3C7", border: "1px solid #FDE68A" }}>
                                            <Typography sx={{ fontSize: 10, color: "#92400E", fontWeight: 600 }}>
                                              {pref.preferenceType?.name && `${pref.preferenceType.name}: `}{pref.preferenceValue?.value || "—"}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                    )}
                                    {svc.serviceInstruction && (
                                      <Typography sx={{ mt: 0.5, fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>
                                        Note: {svc.serviceInstruction}
                                      </Typography>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          ))}
                          {(comparisonData.customerOriginal.bookingPreferences || []).length > 0 && (
                            <Box>
                              <Typography sx={{ fontSize: 10, color: "#92400E", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.5 }}>
                                Booking Preferences
                              </Typography>
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                {comparisonData.customerOriginal.bookingPreferences.map((pref, pi) => (
                                  <Box key={pi} sx={{ px: 1, py: 0.3, borderRadius: "999px", bgcolor: "#FEF3C7", border: "1px solid #FDE68A" }}>
                                    <Typography sx={{ fontSize: 10, color: "#92400E", fontWeight: 600 }}>
                                      {pref.preferenceType?.name && `${pref.preferenceType.name}: `}{pref.preferenceValue?.value || "—"}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      );
                    })()}
                  </Box>

                  {/* ── Agent Invoice ── */}
                  <Box sx={{ p: 2.5 }}>
                    <Box sx={{ mb: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ width: 4, height: 18, bgcolor: "#000099", borderRadius: 1 }} />
                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#000099", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                        Agent Invoice
                      </Typography>
                    </Box>
                    {(!comparisonData?.agentInvoice?.services?.length) ? (
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 12 }}>No agent services yet</Typography>
                    ) : (() => {
                      const groups = {};
                      (comparisonData.agentInvoice.services || []).forEach((svc) => {
                        const heading = svc.service?.name || "Other";
                        if (!groups[heading]) groups[heading] = [];
                        groups[heading].push(svc);
                      });
                      return (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {Object.entries(groups).map(([heading, items]) => (
                            <Box key={heading}>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#000099", textTransform: "uppercase", letterSpacing: "0.06em", mb: 0.75, borderBottom: "1px solid #C7D2FE", pb: 0.4 }}>
                                {heading}
                              </Typography>
                              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                                {items.map((svc, idx) => (
                                  <Box key={`agent-${svc.id || idx}`} sx={{ border: "1px solid #C7D2FE", borderRadius: "10px", p: 1.4, bgcolor: "#EEF2FF" }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                                      {svc.subCategory?.name || svc.category?.name || "Item"}
                                    </Typography>
                                    <Box className="flex items-center gap-3 mt-0.5 flex-wrap">
                                      {svc.items != null && (
                                        <Typography sx={{ fontSize: 11, color: "#475569" }}>Qty: <b>{svc.items}</b></Typography>
                                      )}
                                      {svc.categoryPrice != null && (
                                        <Typography sx={{ fontSize: 11, color: "#475569" }}>£{Number(svc.categoryPrice).toFixed(2)}/pc</Typography>
                                      )}
                                    </Box>
                                    {(svc.addOns || []).length > 0 && (
                                      <Box sx={{ mt: 0.5 }}>
                                        {svc.addOns.map((ad, ai) => (
                                          <Typography key={ai} sx={{ fontSize: 11, color: "#475569" }}>
                                            + {ad.items || 1}x {ad.addOnService?.name || "Add-on"} (£{Number(ad.price || 0).toFixed(2)})
                                          </Typography>
                                        ))}
                                      </Box>
                                    )}
                                    {(svc.selectedServicePreferences || []).length > 0 && (
                                      <Box sx={{ mt: 0.75, display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                                        {svc.selectedServicePreferences.map((pref, pi) => (
                                          <Box key={pi} sx={{ px: 1, py: 0.3, borderRadius: "999px", bgcolor: "#E0E7FF", border: "1px solid #C7D2FE" }}>
                                            <Typography sx={{ fontSize: 10, color: "#3730A3", fontWeight: 600 }}>
                                              {pref.preferenceType?.name && `${pref.preferenceType.name}: `}{pref.preferenceValue?.value || "—"}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                    )}
                                    {svc.serviceInstruction && (
                                      <Typography sx={{ mt: 0.5, fontSize: 11, color: "#6B7280", fontStyle: "italic" }}>
                                        Note: {svc.serviceInstruction}
                                      </Typography>
                                    )}
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      );
                    })()}
                  </Box>
                </Box>
              )}
            </Paper>
          )}
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#C4B5FD" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Shop
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-3">
              <Box className="flex justify-between gap-3">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}
                >
                  Shop Name
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#475569" }} textAlign="right">
                  {shopName || "Not assigned"}
                </Typography>
              </Box>
              <Box className="flex justify-between gap-3">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}
                >
                  Frequency
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#475569" }} textAlign="right">
                  {orderData?.frequency || "Just Once"}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#60A5FA" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Delivery Address
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-3">
              <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10 }}>
                DELIVERY LOCATION
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                {formatAddress(orderData.pickupAddress || orderData.dropOffAddress)}
              </Typography>
              <Box className="flex justify-between gap-3">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: "uppercase" }}>
                  Instructions
                </Typography>
                <Typography variant="caption" textAlign="right">
                  {orderData?.driverInstruction || "N/A"}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#FBBF24" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Drivers
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-3">
              <Box>
                <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10 }}>
                  COLLECTION DRIVER
                </Typography>
                <Box className="flex items-center gap-2.5 mt-2">
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "999px",
                      bgcolor: "#F1F5F9",
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 14,
                      color: orderData?.driver ? "#334155" : "#94A3B8",
                      fontStyle: orderData?.driver ? "normal" : "italic",
                    }}
                  >
                    {orderData?.driver
                      ? `${orderData.driver.firstName} ${orderData.driver.lastName}`
                      : "Unassigned"}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, fontSize: 10 }}>
                  DELIVERY DRIVER
                </Typography>
                <Box className="flex items-center gap-2.5 mt-2">
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "999px",
                      bgcolor: "#F1F5F9",
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 14,
                      color:
                        orderData?.deliveryDriver || orderData?.driver ? "#334155" : "#94A3B8",
                      fontStyle:
                        orderData?.deliveryDriver || orderData?.driver ? "normal" : "italic",
                    }}
                  >
                    {orderData?.deliveryDriver
                      ? `${orderData.deliveryDriver.firstName} ${orderData.deliveryDriver.lastName}`
                      : orderData?.driver
                        ? `${orderData.driver.firstName} ${orderData.driver.lastName}`
                        : "Unassigned"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#D1D5DB" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Activity
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-4">
              {activityRows.map((activity, idx) => (
                <Box key={idx} className="flex gap-3 items-start">
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: "3px" }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: idx === 0 ? "#4ADE80" : idx === 1 ? "#60A5FA" : "#CBD5E1",
                        flexShrink: 0,
                      }}
                    />
                    {idx < activityRows.length - 1 && (
                      <Box sx={{ width: 1, height: 28, bgcolor: "#E2E8F0", mt: 1 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {activity.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

        </Box>
      </Box>
    </Box>

    <ModalComponent
      open={invoiceModal.open}
      onClose={handleCloseInvoiceModal}
      title=""
      width={760}
      maxHeight="92vh"
      hideHeader
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Typography sx={{ textAlign: "center", fontSize: 24, fontWeight: 700, color: "#111827", lineHeight: 1.2 }}>
          Confirm Invoice
        </Typography>
        <Typography sx={{ textAlign: "center", color: "#6B7280", fontSize: 14, mb: 0.5 }}>
          Review the summary before finalizing
        </Typography>
        <Paper sx={{ border: "1px solid #E5E7EB", borderRadius: "12px", p: 1.25, boxShadow: "none" }}>
          <Typography sx={{ fontSize: 11, color: "#6B7280", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
            Receipt Print Format
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1 }}>
            <Button onClick={() => setInvoiceModal((p) => ({ ...p, format: "a4" }))} variant="outlined" sx={{ minHeight: 42, fontSize: 14, fontWeight: 600, textTransform: "none", borderRadius: "10px", bgcolor: invoiceModal.format === "a4" ? "#ECFDF5" : "#fff", color: invoiceModal.format === "a4" ? "#047857" : "#4B5563", borderColor: invoiceModal.format === "a4" ? "#059669" : "#D1D5DB" }}>A4 Receipt</Button>
            <Button onClick={() => setInvoiceModal((p) => ({ ...p, format: "thermal" }))} variant="outlined" sx={{ minHeight: 42, fontSize: 14, fontWeight: 600, textTransform: "none", borderRadius: "10px", bgcolor: invoiceModal.format === "thermal" ? "#ECFDF5" : "#fff", color: invoiceModal.format === "thermal" ? "#047857" : "#4B5563", borderColor: invoiceModal.format === "thermal" ? "#059669" : "#D1D5DB" }}>58mm Thermal</Button>
          </Box>
        </Paper>
        <Paper sx={{ border: "1px solid #E5E7EB", borderRadius: "12px", p: 2, boxShadow: "none" }}>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: 1 }}>
            <Typography sx={{ color: "#6B7280", fontSize: 14 }}>Customer</Typography>
            <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: 14 }}>{invoiceView?.customerName || "N/A"}</Typography>
            <Typography sx={{ color: "#6B7280", fontSize: 14 }}>Invoice No.</Typography>
            <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: 14 }}>{invoiceView?.invoiceNo || "N/A"}</Typography>
            <Typography sx={{ color: "#6B7280", fontSize: 14 }}>Receipt Format</Typography>
            <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: 14 }}>{invoiceModal.format === "a4" ? "A4 Receipt" : "58mm Thermal"}</Typography>
            <Typography sx={{ color: "#6B7280", fontSize: 14 }}>Total Items</Typography>
            <Typography sx={{ color: "#111827", fontWeight: 600, fontSize: 14 }}>{invoiceView?.totalItems || 0}</Typography>
          </Box>
          <Box sx={{ mt: 2, pt: 1.5, borderTop: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography sx={{ color: "#1F2937", fontWeight: 700, fontSize: 22 }}>Total</Typography>
            <Typography sx={{ color: "#1F2937", fontWeight: 700, fontSize: 24 }}>£{Number(invoiceView?.grandTotal || 0).toFixed(2)}</Typography>
          </Box>
        </Paper>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1.3fr 1.8fr", gap: 1.5 }}>
          <Button variant="outlined" onClick={handleCloseInvoiceModal} sx={{ minHeight: 44, borderRadius: "10px", textTransform: "none" }}>Cancel</Button>
          <Button variant="outlined" onClick={() => setInvoiceModal((p) => ({ ...p, previewOpen: true }))} sx={{ minHeight: 44, borderRadius: "10px", textTransform: "none", color: "#047857", borderColor: "#047857", bgcolor: "#ECFDF5" }}>Preview Receipt</Button>
          <Button variant="contained" onClick={handlePrintInvoice} sx={{ minHeight: 44, borderRadius: "10px", textTransform: "none", bgcolor: "#047857" }}>Confirm & Generate</Button>
        </Box>
      </Box>
    </ModalComponent>

    <ModalComponent
      open={invoiceModal.previewOpen}
      onClose={() => setInvoiceModal((p) => ({ ...p, previewOpen: false }))}
      title={invoiceModal.format === "a4" ? "A4 Receipt Preview" : "58mm Thermal Preview"}
      width={invoiceModal.format === "a4" ? 960 : 420}
    >
      {invoicePreviewHtml ? (
        <Box
          sx={{
            border: "1px solid #D1D5DB",
            borderRadius: "10px",
            overflow: "hidden",
            bgcolor: "#F8FAFC",
          }}
        >
          <iframe
            title={invoiceModal.format === "a4" ? "A4 Receipt Preview" : "58mm Thermal Preview"}
            srcDoc={invoicePreviewHtml}
            style={{
              width: "100%",
              height: invoiceModal.format === "a4" ? "76vh" : "520px",
              border: "0",
              background: "#fff",
            }}
          />
        </Box>
      ) : (
        <Typography sx={{ fontSize: 13, color: "#64748B" }}>
          Receipt preview is unavailable.
        </Typography>
      )}
    </ModalComponent>
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

