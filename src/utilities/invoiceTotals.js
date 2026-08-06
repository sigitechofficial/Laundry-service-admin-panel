/** Sum line totals from mapped invoice/order item rows. */
export function sumServicesAndAddOnsFromItems(items = []) {
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
  const tip = feeContext.tip ?? Number(source?.tips?.[0]?.amount ?? 0);
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
