/**
 * Create promotion (the one-page form), without React: its defaults, checks and the payload
 * it saves — also the preset "More options" opens the full form with. Shared with the tests.
 */
import dayjs from "dayjs";
import { TIME_24, dateWithTime } from "./promotionTime.js";
import { dealsToConfig, newDeal, validateDeals } from "./promotionDeals.js";
import { promotionCurrency } from "./promotionForm.js";

export const num = (v) => (v === "" || v == null ? null : Number(v));

// "On what?" → promotion type and what it targets.
export const ON_TYPE = {
  order: { benefitType: "basket_discount", targetType: "basket" },
  service: { benefitType: "service_discount", targetType: "service" },
  item: { benefitType: "item_discount", targetType: "subCategory" },
};

export const INITIAL = () => ({
  name: "",
  on: "order",
  targetIds: [],
  what: "percent",
  value: "",
  deals: [newDeal()],
  maxOff: "",
  minOrder: "",
  needs: false,
  needServiceIds: [],
  needItemIds: [],
  who: "everyone",
  code: "",
  startDate: dayjs().format("YYYY-MM-DD"),
  startTime: "",
  endDate: "",
  endTime: "",
  perCustomer: "1",
  totalUses: "",
  budget: "",
  // ISO code chosen by the admin; "" = the currency every active zone shares (the offer is
  // for all zones). Asked for only when the zones do not share one.
  currency: "",
});

/**
 * First problem with the answers, or null. `zonesCurrency`: the currency every active zone
 * shares ('' when they do not); `currencySymbol`: the offer currency's symbol, for messages.
 */
export function validate(f, priceOf, { zonesCurrency = "", currencySymbol = "" } = {}) {
  if (!f.name.trim()) return "Give the promotion a name";
  if (f.what === "bulk") {
    const err = validateDeals(f.deals, priceOf, currencySymbol);
    if (err) return err;
  } else {
    if (f.on !== "order" && !f.targetIds.length) return f.on === "item" ? "Choose at least one item" : "Choose at least one service";
    if (f.on === "order" && f.needs && !f.needServiceIds.length) return "Choose what the order must include, or untick “Only if the order includes…”";
    const v = num(f.value);
    if (!v || v <= 0) return f.what === "percent" ? "Enter the % off" : "Enter the amount off";
    if (f.what === "percent" && v > 100) return "% off can't be more than 100";
  }
  if (f.who === "code" && !/^[A-Z0-9_-]{3,30}$/i.test(f.code.trim())) return "Enter a code: 3–30 letters or numbers";
  if (f.startTime && !TIME_24.test(f.startTime)) return "Start time: use 24-hour time, e.g. 09:00";
  if (f.endTime && !TIME_24.test(f.endTime)) return "End time: use 24-hour time, e.g. 18:30";
  if (f.endDate && f.startDate && f.endDate < f.startDate) return "The end date is before the start date";
  if (f.endDate && f.endDate === f.startDate && (f.endTime || "23:59") <= (f.startTime || "00:00")) return "The end time must be after the start time";
  if (num(f.budget) != null && num(f.budget) <= 0) return "Budget must be more than 0, or left empty";
  if (!promotionCurrency(f, zonesCurrency)) return "Choose the offer's currency: your zones do not share one";
  if (num(f.totalUses) != null && !(Number.isInteger(num(f.totalUses)) && num(f.totalUses) >= 1)) return "Total orders must be a whole number";
  if (num(f.perCustomer) != null && !(Number.isInteger(num(f.perCustomer)) && num(f.perCustomer) >= 1)) return "Uses per customer must be a whole number";
  return null;
}

/** Quick answers → the full promotion payload (and the full form's preset for "More options"). */
export function quickOfferToPreset(f) {
  const bulk = f.what === "bulk";
  const first = f.deals[0] || newDeal();
  return {
    name: f.name.trim(),
    currency: f.currency,
    ...ON_TYPE[f.on],
    // Bulk: the offer's items are every deal's items; the first deal fills the single-deal fields.
    ...(bulk ? { benefitType: "bundle", bundleQuantity: first.qty, deals: f.deals } : {}),
    targetIds: f.on === "order" ? [] : bulk ? [...new Set(f.deals.flatMap((d) => d.itemIds))] : f.targetIds,
    discountMode: bulk ? "amount" : f.what,
    discountValue: bulk ? first.price : f.value,
    maxDiscountCap: f.what === "percent" ? f.maxOff : "",
    minSubtotal: bulk ? "" : f.minOrder,
    activationType: f.who === "code" ? "coupon_required" : "automatic",
    visibility: f.who === "code" ? "private_code" : "public",
    couponCodes: f.who === "code" && f.code.trim() ? [{ code: f.code.trim().toUpperCase(), codeType: "shared" }] : [],
    conditions: [
      ...(f.who === "first" ? [{ conditionType: "FIRST_ORDER", operator: "equals", value: true, logicGroup: "ALL" }] : []),
      // "Only if the order includes…": the chosen items, or else anything from the chosen services.
      ...(f.on === "order" && f.needs && f.needItemIds.length
        ? [{ conditionType: "PRODUCT", operator: "in", value: f.needItemIds.map(Number), logicGroup: "ALL" }]
        : f.on === "order" && f.needs && f.needServiceIds.length
          ? [{ conditionType: "SERVICE", operator: "in", value: f.needServiceIds.map(Number), logicGroup: "ALL" }]
          : []),
    ],
    startDate: f.startDate,
    startTime: f.startTime,
    endDate: f.endDate,
    endTime: f.endTime,
    perCustomerLimit: f.perCustomer,
    globalUsageLimit: f.totalUses,
    budget: f.budget,
  };
}

/** Answers → the create payload; `zonesCurrency` as in validate (saved when none was chosen). */
export function toPayload(f, { zonesCurrency = "" } = {}) {
  const p = quickOfferToPreset(f);
  const { bundleQuantity, deals, ...rest } = p;
  return {
    ...rest,
    currency: promotionCurrency(f, zonesCurrency) || null,
    benefitConfig: f.what === "bulk"
      ? {
        bundleQuantity: num(bundleQuantity),
        deals: dealsToConfig(deals),
      }
      : null,
    discountValue: num(p.discountValue),
    maxDiscountCap: num(p.maxDiscountCap),
    minSubtotal: num(p.minSubtotal),
    targetIds: p.targetIds.length ? p.targetIds.map(Number) : null,
    zoneScopeMode: "all",
    stackable: false,
    priority: 50,
    repricingPolicy: "recalculate",
    perCustomerLimit: num(p.perCustomerLimit),
    globalUsageLimit: num(p.globalUsageLimit),
    // UK time: date only = whole day; with a time = that minute.
    startDate: dateWithTime(p.startDate, p.startTime),
    endDate: dateWithTime(p.endDate, p.endTime),
    startTime: undefined,
    endTime: undefined,
    budget: num(p.budget),
  };
}
