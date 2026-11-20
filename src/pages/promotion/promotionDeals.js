/**
 * Bulk deals ("10 T-shirts for £30"): rules shared by Create promotion, the full form and tests.
 * Stored as benefitConfig.deals = [{ itemIds, serviceIds, quantity, price }].
 */

/** One deal row in a form (strings while typing). */
export const newDeal = () => ({ itemIds: [], serviceIds: [], qty: "10", price: "" });

const num = (v) => (v === "" || v == null ? null : Number(v));
const money = (n) => `£${Number(n).toFixed(2).replace(/\.00$/, "")}`;

/** What a deal's pieces normally cost (cheapest chosen item, as the deal groups the cheapest first). */
export function dealNormal(deal, priceOf) {
  const prices = deal.itemIds.map(priceOf).filter((p) => p > 0);
  const q = num(deal.qty);
  return prices.length && q ? Math.min(...prices) * q : null;
}

/** First problem with the deals, or null. */
export function validateDeals(deals, priceOf) {
  if (!deals.length) return "Add a deal";
  for (const [i, d] of deals.entries()) {
    const n = deals.length > 1 ? `Deal ${i + 1}: ` : "";
    if (!d.serviceIds.length) return `${n}choose a service`;
    if (!d.itemIds.length) return `${n}choose at least one item`;
    const q = num(d.qty);
    if (!Number.isInteger(q) || q < 2 || q > 1000) return `${n}pieces must be a whole number from 2 to 1000`;
    if (!(num(d.price) > 0)) return `${n}enter the price for these pieces`;
    // A deal must be cheaper than buying the pieces normally.
    const normal = priceOf ? dealNormal(d, priceOf) : null;
    if (normal != null && num(d.price) >= normal) return `${n}the price must be less than the normal ${money(normal)}`;
  }
  return null;
}

/** Form rows → what the API stores. */
export const dealsToConfig = (deals) => deals.map((d) => ({
  itemIds: d.itemIds.map(Number), serviceIds: d.serviceIds.map(Number), quantity: num(d.qty), price: num(d.price),
}));

/**
 * A saved promotion → form rows. Older bulk offers kept one deal in the main fields
 * (items in targetIds, pieces in bundleQuantity, price in discountValue): they become one row.
 */
export function dealsFromPromotion(p, config) {
  if (Array.isArray(config?.deals) && config.deals.length) {
    return config.deals.map((d) => ({
      itemIds: (d.itemIds || []).map(String),
      serviceIds: (d.serviceIds || []).map(String),
      qty: d.quantity != null ? String(d.quantity) : "",
      price: d.price != null ? String(Number(d.price)) : "",
    }));
  }
  const items = p.targetType === "subCategory" ? (Array.isArray(p.targetIds) ? p.targetIds : []) : [];
  return [{
    itemIds: items.map(String),
    serviceIds: (config?.onlyServiceIds || []).map(String),
    qty: config?.bundleQuantity != null ? String(config.bundleQuantity) : "10",
    price: p.discountValue != null && p.discountValue !== "" ? String(Number(p.discountValue)) : "",
  }];
}

/** "10 T-Shirt for £30 (normally £45); 5 Trousers (Dry Clean) for £25" */
export function dealsSummary(deals, { nameOf, priceOf, serviceNameOf }) {
  const ready = deals.filter((d) => d.itemIds.length && num(d.price));
  if (!ready.length) return null;
  const parts = ready.map((d) => {
    const names = d.itemIds.map(nameOf).filter(Boolean).join(" or ") || `${d.itemIds.length} items`;
    const services = d.serviceIds.map(serviceNameOf).filter(Boolean).join(" or ");
    const normal = dealNormal(d, priceOf);
    return `${num(d.qty) || "N"} ${names}${services ? ` (${services})` : ""} for ${money(d.price)}${normal != null ? ` (normally ${money(normal)})` : ""}`;
  });
  const own = ready.length > 1 ? " Each deal counts only its own items." : "";
  return `${parts.join("; ")}. Extra pieces are at the normal price.${own}`;
}
