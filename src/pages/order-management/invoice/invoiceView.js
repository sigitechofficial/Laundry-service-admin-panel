import {
  formatDate,
  formatMoney,
  resolveDisplayCurrency,
} from "../../../utilities/formatters";
import {
  resolveInvoiceSettlement,
  resolveOrderSubtotal,
  resolveServicesSubtotal,
  splitAdminTips,
} from "../../../utilities/invoiceTotals";

function formatDay(value) {
  const text = formatDate(value);
  return text === "—" ? "" : text;
}

export function formatInvoiceMoney(value, symbol, code) {
  const fallback = resolveDisplayCurrency(null, { applyDefault: true });
  return formatMoney(value ?? 0, symbol || fallback.symbol, code || fallback.code);
}

function invoiceMoney(view, amount) {
  const fallback = resolveDisplayCurrency(null, { applyDefault: true });
  return formatMoney(
    amount,
    view?.currencySymbol || fallback.symbol,
    view?.currencyCode || fallback.code
  );
}

export function invoiceStatusTone(label) {
  const status = String(label || "").toLowerCase();
  if (status.includes("complete") || status.includes("paid")) return "success";
  if (status.includes("cancel") || status.includes("fail")) return "danger";
  if (status.includes("hold") || status.includes("pending") || status.includes("unpaid")) {
    return "warning";
  }
  if (status.includes("invoice") || status.includes("generated")) return "brand";
  return "neutral";
}

export function buildInvoiceView(invoiceDetails, fallbackShopName = "") {
  if (!invoiceDetails) return null;
  const customerName =
    `${invoiceDetails?.customer?.firstName || ""} ${invoiceDetails?.customer?.lastName || ""}`.trim() ||
    "Customer";
  const invoiceNo = invoiceDetails?.orderTrackId || `INV-${invoiceDetails?.id || ""}`;
  const resolvedCurrency = resolveDisplayCurrency(
    invoiceDetails?.paymentSummary ?? invoiceDetails,
    { applyDefault: true }
  );
  const currencySymbol = resolvedCurrency.symbol;
  const currencyCode =
    invoiceDetails?.paymentSummary?.currency ||
    invoiceDetails?.paymentSummary?.currencyCode ||
    invoiceDetails?.currency ||
    resolvedCurrency.code;
  const dateText = invoiceDetails?.createdAt || invoiceDetails?.collectionDate
    ? formatDate(invoiceDetails.createdAt || invoiceDetails.collectionDate)
    : "N/A";
  const timeText = invoiceDetails?.collectionTimeTo || invoiceDetails?.collectionTimeFrom || "N/A";
  const addressText = [invoiceDetails?.customer?.phoneNum, invoiceDetails?.dropOffAddress?.streetAddress]
    .filter(Boolean)
    .join(" · ");
  const shopName =
    invoiceDetails?.laundryShop?.bussinessInformations?.[0]?.shopName ||
    invoiceDetails?.laundryShop?.shopName ||
    fallbackShopName ||
    "";
  const agentName =
    `${invoiceDetails?.driver?.firstName || ""} ${invoiceDetails?.driver?.lastName || ""}`.trim() ||
    shopName ||
    "justDray cleaner";
  const items = (invoiceDetails?.customerSelectedServices || [])
    .filter((it) => Number(it?.items) > 0)
    .map((it, idx) => {
      // categoryPrice = price charged on this line (zone-resolved snapshot at
      // booking/invoice time). subCategory.price = live master catalog price.
      const rate = Number(it?.categoryPrice || it?.subCategory?.price || 0);
      const masterRate = Number(it?.subCategory?.price);
      const zonePriced =
        Number.isFinite(masterRate) &&
        masterRate > 0 &&
        it?.categoryPrice != null &&
        Math.abs(rate - masterRate) >= 0.005;
      return {
      id: it?.id || idx + 1,
      name: it?.subCategory?.name || it?.category?.name || it?.service?.name || "Item",
      qty: Number(it?.items) || 0,
      rate,
      masterRate: Number.isFinite(masterRate) ? masterRate : null,
      zonePriced,
      serviceName: it?.service?.name || "",
      addOns: (it?.addOns || []).map((ad) => ({
        name: ad?.name || ad?.addOnService?.name || ad?.service?.name || ad?.title || "Add-on",
        price: Number(ad?.price || 0),
        qty: Number(ad?.quantity || ad?.items || 1),
        instruction: String(ad?.instructions || ad?.instruction || "").trim(),
      })),
      preferences: (it?.selectedServicePreferences || [])
        .map((pref) => pref?.preferenceValue?.value)
        .filter(Boolean),
      instruction: it?.serviceInstruction || "",
      };
    });
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
  const tax = Number(
    invoiceDetails?.billingDetail?.tax ?? invoiceDetails?.billingDetail?.vat ?? NaN
  );
  const orderSubtotal = resolveOrderSubtotal(invoiceDetails, {
    servicesSubtotal,
    serviceCharge,
    minimumOrderFee,
  });
  const pickupWindow = `${invoiceDetails?.collectionTimeFrom || "N/A"}-${invoiceDetails?.collectionTimeTo || "N/A"}`;
  const deliveryWindow = `${invoiceDetails?.deliveryTimeFrom || "N/A"}-${invoiceDetails?.deliveryTimeTo || "N/A"}`;
  const computedTotalItems = items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
  const tip = splitAdminTips(invoiceDetails).bookingTip || Number(invoiceDetails?.billingDetail?.tip ?? 0);
  // Settlement = server paymentSummary (what the apps show). Fallback recomputes
  // with the same formula so we never display a stale/zero orderAmount.
  const settlement = resolveInvoiceSettlement(invoiceDetails, {
    paymentType: invoiceDetails?.paymentType,
    laundrySubtotal: servicesSubtotal,
    serviceCharge,
    minimumOrderFee,
    driverTip: tip,
    prepaidDriverTip: invoiceDetails?.billingDetail?.prepaidDriverTip,
    discount,
  });
  const grandTotal = settlement.totalOrderAmount;
  return {
    settlement,
    amountDue: settlement.amountDueNow,
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
    printedDate: formatDate(new Date()),
    currencySymbol,
    currencyCode,
    shopName,
    statusLabel: invoiceDetails?.bookingStatus?.title || invoiceDetails?.status || "",
    paymentStatus: invoiceDetails?.billingDetail?.paymentStatus || "",
    customerEmail: invoiceDetails?.customer?.email || "",
    customerPhone: invoiceDetails?.customer?.phoneNum || invoiceDetails?.customer?.phone || "",
    customerAddress:
      invoiceDetails?.dropOffAddress?.streetAddress ||
      invoiceDetails?.pickupAddress?.streetAddress ||
      "",
    collectionDateText: formatDay(invoiceDetails?.collectionDate),
    deliveryDateText: formatDay(invoiceDetails?.deliveryDate),
    tax: Number.isFinite(tax) ? tax : null,
    tip,
  };
}

export function printHtmlDocument(html) {
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

/**
 * Settlement rows for print formats — same blocks as the agent receipt:
 * Order summary → Paid at booking → Amount due now.
 */
function settlementHtml(view, { rowClass = "row", grandClass = "row grand", headClass = "row strong", lineClass = "line" } = {}) {
  const s = view.settlement || {};
  const paid = s.paidAtBooking || {};
  const m = (v) => invoiceMoney(view, v);
  const rows = [];
  rows.push(`<div class="${headClass}"><span>Order summary (${s.isCash ? "Cash" : "Card"})</span><span></span></div>`);
  rows.push(`<div class="${rowClass}"><span>Laundry subtotal</span><span>${m(s.laundrySubtotal)}</span></div>`);
  if (s.isCash && Number(s.minimumAdjustment) > 0) {
    rows.push(`<div class="${rowClass}"><span>Minimum order top-up</span><span>${m(s.minimumAdjustment)}</span></div>`);
  }
  rows.push(`<div class="${rowClass}"><span>Service fee</span><span>${m(s.serviceFee)}</span></div>`);
  if (Number(s.driverTip) > 0) rows.push(`<div class="${rowClass}"><span>Tip</span><span>${m(s.driverTip)}</span></div>`);
  if (Number(s.discount) > 0) rows.push(`<div class="${rowClass}"><span>Discount</span><span>-${m(s.discount)}</span></div>`);
  rows.push(`<div class="${grandClass}"><span>Total order amount</span><span>${m(s.totalOrderAmount)}</span></div>`);
  if (Number(paid.totalPaid) > 0) {
    rows.push(`<div class="${lineClass}"></div>`);
    rows.push(`<div class="${headClass}"><span>Paid at booking</span><span></span></div>`);
    if (Number(paid.minimumOrderPayment) > 0) {
      rows.push(`<div class="${rowClass}"><span>Minimum order payment</span><span>${m(paid.minimumOrderPayment)}</span></div>`);
    }
    if (Number(paid.serviceFee) > 0) rows.push(`<div class="${rowClass}"><span>Service fee</span><span>${m(paid.serviceFee)}</span></div>`);
    if (Number(paid.driverTip) > 0) rows.push(`<div class="${rowClass}"><span>Tip</span><span>${m(paid.driverTip)}</span></div>`);
    rows.push(`<div class="${headClass}"><span>Total paid</span><span>${m(paid.totalPaid)}</span></div>`);
  }
  rows.push(`<div class="${lineClass}"></div>`);
  rows.push(`<div class="${grandClass}"><span>Amount due now</span><span>${m(s.amountDueNow)}</span></div>`);
  if (Number(paid.totalPaid) > 0) {
    rows.push(`<div class="${rowClass}" style="color:#6b7280;font-size:0.85em"><span>${m(s.totalOrderAmount)} total − ${m(paid.totalPaid)} already paid</span><span></span></div>`);
  } else if (s.isCash) {
    rows.push(`<div class="${rowClass}" style="color:#6b7280;font-size:0.85em"><span>Collected in cash at delivery</span><span></span></div>`);
  }
  return rows.join("");
}

export function a4InvoiceHtml(view) {
  const rows = view.items
    .map((item, idx) => {
      const addonRows = (item.addOns || []).length
        ? (item.addOns || [])
            .map(
              (ad) =>
                `<div class="itemSubRow"><span>+ ${ad.qty}x ${ad.name}${ad.instruction ? `<div class="itemMuted">${ad.instruction}</div>` : ""}</span><span>${invoiceMoney(view, ad.qty * ad.price)}</span></div>`
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
      const zoneRow = item.zonePriced
        ? `<div class="itemMuted">Zone price · master ${invoiceMoney(view, item.masterRate)}</div>`
        : "";
      return `<tr><td class="center">${idx + 1}</td><td class="itemCell"><div class="itemTitle">${item.serviceName ? `${item.serviceName} - ` : ""}${item.name}</div>${addonRows}${prefRow}${instructionRow}${zoneRow}</td><td class="right">${item.qty}</td><td class="right">${invoiceMoney(view, item.rate)}</td><td class="right">${invoiceMoney(view, item.qty * item.rate)}</td></tr>`;
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
    .totals{margin-left:auto;width:320px;margin-top:10px}
    .totals .row{display:flex;justify-content:space-between;padding:4px 0;font-size:14px}
    .totals .strong{font-weight:700;font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#6b7280;padding-top:8px}
    .totals .grand{font-weight:700;font-size:18px;padding-top:6px}
    .totals .line{border-top:1px dashed #cbd5e1;margin:6px 0}
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
      ${settlementHtml(view)}
    </div>
  </div></body></html>`;
}

export function thermalInvoiceHtml(view) {
  const itemRows = view.items
    .map((item) => {
      const addonRows = item.addOns
        .map((ad) => `<div class="subrow"><span>+ ${ad.qty}x ${ad.name}</span><span>${invoiceMoney(view, ad.qty * ad.price)}</span></div>`)
        .join("");
      return `<div class="row strong"><span>${item.qty}x ${item.serviceName ? `${item.serviceName} - ` : ""}${item.name}</span><span>${invoiceMoney(view, item.qty * item.rate)}</span></div>${addonRows}`;
    })
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><title>58mm Thermal</title><style>body{font-family:'Courier New',monospace}.ticket{width:58mm;margin:0 auto;padding:8px}.row{display:flex;justify-content:space-between;font-size:11px}.subrow{display:flex;justify-content:space-between;font-size:10px;padding-left:8px;color:#374151}.line{border-top:1px dashed #333;margin:6px 0}.strong{font-weight:700}</style></head><body><div class="ticket"><div style="text-align:center;font-weight:700">justDray cleaner</div><div style="text-align:center;font-size:11px">Customer Receipt</div><div style="text-align:center;font-size:10px">Format: 58mm Thermal</div><div class="line"></div><div class="row"><span>Invoice</span><span>${view.invoiceNo}</span></div><div class="row"><span>Date</span><span>${view.dateText}</span></div><div class="row"><span>Pickup</span><span>${view.pickupWindow}</span></div><div class="row"><span>Delivery</span><span>${view.deliveryWindow}</span></div><div class="line"></div><div><b>${view.customerName}</b></div><div style="font-size:10px">${view.emailOrPhone || ""}</div><div style="font-size:10px">${view.addressText}</div><div class="line"></div><div class="row strong"><span>Items (${view.totalItems})</span><span>Amount</span></div>${itemRows}<div class="line"></div>${settlementHtml(view, { rowClass: "row", grandClass: "row strong", headClass: "row strong", lineClass: "line" })}</div></body></html>`;
}

export function invoicePrintHtml(view, format) {
  if (!view) return "";
  return format === "thermal" ? thermalInvoiceHtml(view) : a4InvoiceHtml(view);
}
