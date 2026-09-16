/** Sum line totals from mapped invoice/order item rows. */
function sumServicesAndAddOnsFromItems(items = []) {
  const servicesOnly = items.reduce(
    (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.rate) || 0),
    0
  );
  const addOnsOnly = items.reduce(
    (sum, item) =>
      sum +
      (item.addOns || []).reduce(
        (acc, ad) => acc + (Number(ad.qty) || 1) * (Number(ad.price) || 0),
        0
      ),
    0
  );
  return {
    servicesOnly,
    addOnsOnly,
    combined: parseFloat((servicesOnly + addOnsOnly).toFixed(2)),
  };
}

/**
 * Laundry the shop invoiced (items + add-ons + repairs). Commission % uses this.
 * Prefer paymentSummary so a leftover items-sheet total cannot hide the real bill.
 */
export function resolveLaundryAdded(paymentSummary, fallback = 0) {
  const fromSummary = Number(
    paymentSummary?.orderSummary?.laundrySubtotal ??
      paymentSummary?.laundrySubtotal
  );
  if (Number.isFinite(fromSummary) && fromSummary >= 0) return fromSummary;
  const n = Number(fallback);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Services + add-ons subtotal (matches backend servicesSubtotal).
 */
export function resolveServicesSubtotal(source, items = []) {
  const fromApi = Number(source?.servicesSubtotal);
  if (Number.isFinite(fromApi) && fromApi >= 0) {
    return fromApi;
  }
  const fromTotalAmount = Number(source?.totalAmount);
  if (Number.isFinite(fromTotalAmount) && fromTotalAmount >= 0) {
    return fromTotalAmount;
  }
  if (items.length > 0) {
    return sumServicesAndAddOnsFromItems(items).combined;
  }
  return 0;
}

/** Booking-time tip vs post-complete extra tip. Extra tip is not part of invoice totals. */
export function splitAdminTips(source) {
  const extra = source?.extraTip;
  if (extra && (extra.bookingTipAmount != null || extra.extraTipAmount != null)) {
    return {
      bookingTip: Number(extra.bookingTipAmount || 0),
      extraTip: Number(extra.extraTipAmount || 0),
    };
  }
  const tips = Array.isArray(source?.tips) ? source.tips : [];
  let bookingTip = 0;
  let extraTip = 0;
  for (const row of tips) {
    const n = Number(row?.amount || 0);
    if (!Number.isFinite(n)) continue;
    if (String(row?.source || "").toLowerCase() === "post_complete") extraTip += n;
    else bookingTip += n;
  }
  return { bookingTip, extraTip };
}

/** Full order subTotal (services + fees, before discount adjustments). */
export function resolveOrderSubtotal(source, feeContext = {}) {
  const fromApi = Number(source?.subTotal ?? source?.subtotal);
  if (Number.isFinite(fromApi) && fromApi >= 0) {
    return fromApi;
  }
  const servicesSubtotal =
    feeContext.servicesSubtotal ?? resolveServicesSubtotal(source);
  const serviceCharge =
    feeContext.serviceCharge ?? Number(source?.billingDetail?.serviceCharge ?? 0);
  const minimumOrderFee =
    feeContext.minimumOrderFee ?? Number(source?.billingDetail?.upfrontAmount ?? 0);
  const tip = feeContext.tip ?? splitAdminTips(source).bookingTip;
  return parseFloat((servicesSubtotal + serviceCharge + minimumOrderFee + tip).toFixed(2));
}

export function mergeInvoiceDetailsFromResponse(responseData) {
  if (!responseData?.invoiceDetails) return null;
  const invoiceDetails = responseData.invoiceDetails;
  const servicesSubtotal = resolveServicesSubtotal({
    servicesSubtotal:
      responseData.servicesSubtotal ?? invoiceDetails?.servicesSubtotal,
  });
  return {
    ...invoiceDetails,
    servicesSubtotal,
    subTotal:
      invoiceDetails?.subTotal ??
      responseData?.subTotal ??
      resolveOrderSubtotal(invoiceDetails, { servicesSubtotal }),
    // The server's settlement math (same object the agent/customer apps render).
    // It lives at the top level of the response, not inside invoiceDetails —
    // carry it so the invoice view never falls back to a stale orderAmount.
    paymentSummary: responseData?.paymentSummary ?? invoiceDetails?.paymentSummary ?? null,
    amountDueNow:
      responseData?.amountDueNow ??
      responseData?.paymentSummary?.amountDueNow ??
      invoiceDetails?.amountDueNow,
    totalItems: responseData?.totalItems ?? invoiceDetails?.totalItems,
    extraTip: responseData?.extraTip ?? invoiceDetails?.extraTip,
  };
}

/**
 * One settlement view for admin invoice screens — mirrors the agent app's
 * receipt blocks (Order summary → Paid at booking → Amount due now).
 * Prefers the server paymentSummary; falls back to the same formula the
 * backend uses (buildAdminInvoicePreview) when the summary is missing.
 */
export function resolveInvoiceSettlement(source, fallback = {}) {
  const ps = source?.paymentSummary || null;
  const paymentType = String(
    ps?.paymentType || source?.paymentType || fallback.paymentType || "card"
  )
    .toLowerCase()
    .trim();
  const isCash = paymentType === "cash";

  if (ps?.orderSummary) {
    const os = ps.orderSummary;
    const paid = ps.paidAtBooking || {};
    const totalPaid = roundInvoiceMoney(paid.totalPaid);
    return {
      paymentType,
      isCash,
      laundrySubtotal: roundInvoiceMoney(os.laundrySubtotal ?? ps.laundrySubtotal),
      minimumAdjustment: roundInvoiceMoney(os.minimumAdjustment ?? ps.minimumAdjustment),
      effectiveLaundry: roundInvoiceMoney(
        os.effectiveLaundry ?? ps.effectiveLaundry ?? os.laundrySubtotal
      ),
      serviceFee: roundInvoiceMoney(os.serviceFee),
      driverTip: roundInvoiceMoney(os.driverTip),
      discount: roundInvoiceMoney(os.discount),
      totalOrderAmount: roundInvoiceMoney(os.totalOrderAmount),
      paidAtBooking: {
        minimumOrderPayment: roundInvoiceMoney(paid.minimumOrderPayment),
        serviceFee: roundInvoiceMoney(paid.serviceFee),
        driverTip: roundInvoiceMoney(paid.driverTip),
        totalPaid,
      },
      amountDueNow: roundInvoiceMoney(ps.amountDueNow ?? source?.amountDueNow),
      paymentStatus: ps.billingPaymentStatus || source?.billingDetail?.paymentStatus || "",
      balanceCollectedVia: ps.balanceCollectedVia || source?.balanceCollectedVia || null,
      fromServer: true,
    };
  }

  const laundry = roundInvoiceMoney(fallback.laundrySubtotal);
  const serviceFee = roundInvoiceMoney(fallback.serviceCharge);
  const minimum = roundInvoiceMoney(fallback.minimumOrderFee);
  const tip = roundInvoiceMoney(fallback.driverTip);
  const discount = roundInvoiceMoney(fallback.discount);
  const preview = buildAdminInvoicePreview({
    paymentType,
    laundrySubtotal: laundry,
    serviceCharge: serviceFee,
    minimumOrderFee: minimum,
    driverTip: tip,
    prepaidDriverTip: fallback.prepaidDriverTip,
    discount,
  });
  const prepaidTip = isCash ? 0 : tip;
  const totalPaid = isCash ? 0 : roundInvoiceMoney(minimum + serviceFee + prepaidTip);
  return {
    paymentType,
    isCash,
    laundrySubtotal: laundry,
    minimumAdjustment: isCash ? roundInvoiceMoney(Math.max(0, minimum - laundry)) : 0,
    effectiveLaundry: isCash ? roundInvoiceMoney(Math.max(laundry, minimum)) : laundry,
    serviceFee,
    driverTip: tip,
    discount,
    totalOrderAmount: preview.totalOrderAmount,
    paidAtBooking: {
      minimumOrderPayment: isCash ? 0 : minimum,
      serviceFee: isCash ? 0 : serviceFee,
      driverTip: prepaidTip,
      totalPaid,
    },
    amountDueNow: preview.total,
    paymentStatus: source?.billingDetail?.paymentStatus || "",
    balanceCollectedVia: source?.balanceCollectedVia || null,
    fromServer: false,
  };
}

function roundInvoiceMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return parseFloat(n.toFixed(2));
}

/**
 * Live admin invoice preview. Matches backend invoicePaymentSummary:
 * card remaining includes unpaid tip (current tip minus pickup prepaid tip).
 */
export function buildAdminInvoicePreview({
  paymentType,
  laundrySubtotal,
  serviceCharge,
  minimumOrderFee,
  driverTip,
  prepaidDriverTip,
  discount = 0,
}) {
  const isCash = String(paymentType || "").toLowerCase().trim() === "cash";
  const laundry = roundInvoiceMoney(laundrySubtotal);
  const service = roundInvoiceMoney(serviceCharge);
  const minimum = roundInvoiceMoney(minimumOrderFee);
  const tip = roundInvoiceMoney(driverTip);
  const disc = roundInvoiceMoney(discount);
  const prepaidTip =
    prepaidDriverTip === undefined ||
    prepaidDriverTip === null ||
    prepaidDriverTip === ""
      ? isCash
        ? 0
        : tip
      : roundInvoiceMoney(prepaidDriverTip);

  if (isCash) {
    const effectiveLaundry = Math.max(laundry, minimum);
    const totalOrderAmount = roundInvoiceMoney(effectiveLaundry + service + tip);
    return {
      upfrontAmount: minimum,
      serviceCharge: service,
      discount: disc,
      categoryCharge: laundry,
      totalOrderAmount,
      total: Math.max(0, roundInvoiceMoney(totalOrderAmount - disc)),
    };
  }

  const totalOrderAmount = roundInvoiceMoney(laundry + service + tip);
  const totalPaid = roundInvoiceMoney(minimum + service + prepaidTip);
  return {
    upfrontAmount: minimum,
    serviceCharge: service,
    discount: disc,
    categoryCharge: laundry,
    totalOrderAmount,
    total: Math.max(0, roundInvoiceMoney(totalOrderAmount - totalPaid - disc)),
  };
}
