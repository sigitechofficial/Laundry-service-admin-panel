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
  };
}
