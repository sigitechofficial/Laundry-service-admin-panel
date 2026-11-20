/**
 * The full promotion form ("More options" / Edit), without React: its defaults, loading a saved
 * promotion, the payload it saves and each step's checks. The page and the tests use this same code.
 */
import dayjs from "dayjs";
import { CONDITION_DEFS, conditionError, serializeCondition } from "./promotionConditions.js";
import { conditionHidden, lockedPerCustomerLimit, showsPeriodLimits } from "./promotionTypeRules.js";
import { TIME_24, dateWithTime } from "./promotionTime.js";
import { dealsFromPromotion, dealsToConfig, newDeal, validateDeals } from "./promotionDeals.js";

// discountMode is fixed for these types; MODE_CHOICE_TYPES let the admin pick.
export const FORCED_MODE = {
  percentage_discount: "percent",
  first_order_discount: "percent",
  first_x_orders_discount: "percent",
  fixed_amount_discount: "amount",
  delivery_discount: "amount",
  bundle: "amount",
};
export const MODE_CHOICE_TYPES = ["basket_discount", "item_discount", "category_discount", "service_discount", "cashback"];
export const ITEM_SCOPE_TYPES = ["item_discount", "category_discount", "service_discount", "bundle"];
// Types where the admin picks what the targets are (items, add-ons, categories, services or all).
export const TARGET_TYPE_CHOICE = ["item_discount", "bundle"];
export const DELIVERY_TYPES = ["free_delivery", "delivery_discount"];

export function effectiveMode(p) {
  if (FORCED_MODE[p.benefitType]) return FORCED_MODE[p.benefitType];
  if (MODE_CHOICE_TYPES.includes(p.benefitType)) return p.discountMode || "percent";
  return null; // fixed_price (target price) / free_delivery (no value)
}

export const needsValue = (bt) => bt !== "free_delivery";
// Item-scope "£ off each" also takes a cap: it limits the total, e.g. £30 off each item but £30 at most.
export const showsCap = (p) =>
  effectiveMode(p) === "percent" || p.benefitType === "cashback" || ITEM_SCOPE_TYPES.includes(p.benefitType);
export const defaultTargetType = (bt) => {
  if (TARGET_TYPE_CHOICE.includes(bt)) return "subCategory";
  if (bt === "category_discount") return "category";
  if (bt === "service_discount") return "service";
  if (DELIVERY_TYPES.includes(bt)) return "delivery";
  return "basket";
};

/** The UK calendar day a promotion starts / ends on (the server's startDay / endDay). */
export const promotionDay = (p, which) => {
  const day = which === "start" ? p?.startDay : p?.endDay;
  const stored = which === "start" ? p?.startDate : p?.endDate;
  return day || (stored ? dayjs(stored).format("YYYY-MM-DD") : "");
};

export const parseJson = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return fallback; }
};
export const numStr = (v) => (v === "" || v == null ? "" : String(Number(v)));
export const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
export const isPosInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 1;

export const INITIAL_FORM = () => ({
  name: "",
  description: "",
  internalNotes: "",
  campaignId: "",
  benefitType: "basket_discount",
  discountMode: "percent",
  discountValue: "",
  maxDiscountCap: "",
  firstOrders: "3",
  bundleQuantity: "10",
  // Bulk price deals (benefitType "bundle"), edited with BulkDealsEditor.
  deals: [newDeal()],
  targetType: "basket",
  targetIds: [],
  zoneScopeMode: "all",
  zoneIds: [],
  zoneOverrides: [],
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  recurringDays: [],
  recurringStartTime: "",
  recurringEndTime: "",
  activationType: "automatic",
  visibility: "public",
  priority: "50",
  stackable: false,
  stackGroup: "",
  globalUsageLimit: "",
  budget: "",
  perCustomerLimit: "1",
  perDayLimit: "",
  perWeekLimit: "",
  minSubtotal: "",
  maxSubtotal: "",
  minQuantity: "",
  repricingPolicy: "recalculate",
  keptConfig: {},
  conditions: [],
  couponCodes: [],
});

/** The offer has its own budget (not a shared one). */
export const ownsBudget = (p) => Boolean(p?.campaign && Number(p.campaign.ownerPromotionId) === Number(p.id));

/** GET /promotions/:id detail → form state. */
export function formFromPromotion(p) {
  const config = parseJson(p.benefitConfig, {}) || {};
  return {
    ...INITIAL_FORM(),
    name: p.name || "",
    description: p.description || "",
    internalNotes: p.internalNotes || "",
    // An own budget (a pool owned by this offer) shows as the Budget field, not a shared budget.
    campaignId: p.campaignId && !ownsBudget(p) ? String(p.campaignId) : "",
    budget: ownsBudget(p) && p.campaign.budgetMinor != null ? String(p.campaign.budgetMinor / 100) : "",
    benefitType: p.benefitType || "percentage_discount",
    discountMode: p.discountMode || "percent",
    discountValue: numStr(p.discountValue),
    maxDiscountCap: numStr(p.maxDiscountCap),
    firstOrders: config.firstOrders != null ? String(config.firstOrders) : "3",
    bundleQuantity: config.bundleQuantity != null ? String(config.bundleQuantity) : "10",
    // Settings this form has no fields for (bulk deals, only-in-service) are kept as they are.
    keptConfig: config.onlyServiceIds ? { onlyServiceIds: config.onlyServiceIds } : {},
    deals: p.benefitType === "bundle" ? dealsFromPromotion(p, config) : [newDeal()],
    targetType: p.targetType || defaultTargetType(p.benefitType),
    targetIds: (parseJson(p.targetIds, []) || []).map(String),
    zoneScopeMode: p.zoneScopeMode || "all",
    zoneIds: (parseJson(p.zoneIds, []) || []).map(String),
    zoneOverrides: (p.zoneOverrides || []).map((zo) => ({
      zoneId: String(zo.zoneId),
      discountValue: numStr(zo.discountValue),
      maxDiscountCap: numStr(zo.maxDiscountCap),
      minSubtotal: numStr(zo.minSubtotal),
    })),
    startDate: promotionDay(p, "start"),
    endDate: promotionDay(p, "end"),
    // UK times; whole days (00:00 / 23:59) show as empty.
    startTime: p.startTime && p.startTime !== "00:00" ? p.startTime : "",
    endTime: p.endTime && p.endTime !== "23:59" ? p.endTime : "",
    recurringDays: parseJson(p.recurringDays, []) || [],
    recurringStartTime: p.recurringStartTime ? String(p.recurringStartTime).slice(0, 5) : "",
    recurringEndTime: p.recurringEndTime ? String(p.recurringEndTime).slice(0, 5) : "",
    activationType: p.activationType || "automatic",
    visibility: p.visibility || "hidden",
    priority: p.priority != null ? String(p.priority) : "50",
    stackable: Boolean(p.stackable),
    stackGroup: p.stackGroup || "",
    globalUsageLimit: numStr(p.globalUsageLimit),
    perCustomerLimit: numStr(p.perCustomerLimit),
    perDayLimit: numStr(p.perDayLimit),
    perWeekLimit: numStr(p.perWeekLimit),
    minSubtotal: numStr(p.minSubtotal),
    maxSubtotal: numStr(p.maxSubtotal),
    minQuantity: numStr(p.minQuantity),
    repricingPolicy: p.repricingPolicy || "recalculate",
    conditions: (p.conditions || []).map((c) => {
      let value = parseJson(c.value, null);
      if (CONDITION_DEFS[c.conditionType]?.kind === "schedule") {
        value = { days: [], startTime: "", endTime: "", ...(value || {}) };
      }
      return { conditionType: c.conditionType, operator: c.operator, value, logicGroup: c.logicGroup || "ALL" };
    }),
    couponCodes: (p.couponCodes || []).map((c) => ({
      code: c.code,
      codeType: c.codeType,
      usageLimit: c.usageLimit,
      usedCount: c.usedCount,
      isActive: c.isActive,
    })),
  };
}

/** Zones an override may target, given the scope mode. */
export function overrideAllowed(form, zoneId) {
  if (form.zoneScopeMode === "selected") return form.zoneIds.includes(zoneId);
  if (form.zoneScopeMode === "excluded") return !form.zoneIds.includes(zoneId);
  return true;
}

/** Form state → create/update payload. Optional numbers/dates are null, never "". */
export function buildPayload(form) {
  const bt = form.benefitType;
  const mode = effectiveMode(form);
  const itemScope = ITEM_SCOPE_TYPES.includes(bt);
  const cap = showsCap(form);
  const bulk = bt === "bundle";
  // Bulk deals: every deal's items are the offer's items; the first deal fills the single-deal fields.
  const firstDeal = bulk ? form.deals[0] || newDeal() : null;
  const targetType = bulk ? "subCategory" : itemScope ? form.targetType : defaultTargetType(bt);
  const hasTimes = form.recurringStartTime && form.recurringEndTime;
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    internalNotes: form.internalNotes.trim() || null,
    campaignId: form.campaignId ? Number(form.campaignId) : null,
    benefitType: bt,
    discountMode: mode,
    discountValue: bulk ? numOrNull(firstDeal.price) : needsValue(bt) ? numOrNull(form.discountValue) : null,
    maxDiscountCap: cap ? numOrNull(form.maxDiscountCap) : null,
    benefitConfig: bt === "first_x_orders_discount" ? { firstOrders: Number(form.firstOrders) }
      : bulk ? { ...(form.keptConfig || {}), bundleQuantity: numOrNull(firstDeal.qty), deals: dealsToConfig(form.deals) }
      : null,
    targetType,
    targetIds: bulk ? [...new Set(form.deals.flatMap((d) => d.itemIds.map(Number)))]
      : itemScope && targetType !== "all" ? form.targetIds.map(Number) : null,
    zoneScopeMode: form.zoneScopeMode,
    zoneIds:
      form.zoneScopeMode !== "all"
        ? form.zoneIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
        : null,
    zoneOverrides: form.zoneOverrides
      .filter((zo) => overrideAllowed(form, zo.zoneId))
      .map((zo) => ({
        zoneId: Number(zo.zoneId),
        discountValue: needsValue(bt) && !bulk ? numOrNull(zo.discountValue) : null,
        maxDiscountCap: cap ? numOrNull(zo.maxDiscountCap) : null,
        minSubtotal: numOrNull(zo.minSubtotal),
      })),
    // Sent as calendar days: the server turns them into the start / end of that day in UK time.
    startDate: dateWithTime(form.startDate, form.startTime),
    endDate: dateWithTime(form.endDate, form.endTime),
    recurringDays: form.recurringDays.length ? [...form.recurringDays].sort((a, b) => a - b) : null,
    recurringStartTime: hasTimes ? form.recurringStartTime : null,
    recurringEndTime: hasTimes ? form.recurringEndTime : null,
    activationType: form.activationType,
    visibility: form.visibility,
    priority: form.priority === "" ? 50 : Number(form.priority),
    stackable: form.stackable,
    stackGroup: form.stackable && form.stackGroup.trim() ? form.stackGroup.trim() : null,
    globalUsageLimit: numOrNull(form.globalUsageLimit),
    // Own budget only when the offer is not in a shared budget.
    budget: form.campaignId ? null : numOrNull(form.budget),
    perCustomerLimit: numOrNull(lockedPerCustomerLimit(form)?.value ?? form.perCustomerLimit),
    perDayLimit: showsPeriodLimits(bt) ? numOrNull(form.perDayLimit) : null,
    perWeekLimit: showsPeriodLimits(bt) ? numOrNull(form.perWeekLimit) : null,
    minSubtotal: numOrNull(form.minSubtotal),
    maxSubtotal: numOrNull(form.maxSubtotal),
    minQuantity: numOrNull(form.minQuantity),
    repricingPolicy: form.repricingPolicy,
    conditions: form.conditions.map(serializeCondition),
    // Full-list semantics on update: codes missing from this list are removed/deactivated.
    couponCodes: form.couponCodes.map((c) => ({
      code: c.code,
      codeType: c.codeType || "shared",
      ...(c.usageLimit != null ? { usageLimit: c.usageLimit } : {}),
    })),
  };
}

/** Returns the first validation error for a wizard step, or null. */
export function validateStep(step, form, priceOf) {
  const mode = effectiveMode(form);
  const bt = form.benefitType;
  switch (step) {
    case 0: {
      if (!form.name.trim()) return "Promotion name is required";
      if (bt === "bundle") {
        const err = validateDeals(form.deals, priceOf);
        if (err) return err;
      } else if (needsValue(bt)) {
        const v = Number(form.discountValue);
        if (form.discountValue === "" || !Number.isFinite(v) || v <= 0) {
          return bt === "fixed_price" ? "Basket price must be greater than 0" : "Discount value must be greater than 0";
        }
        if (mode === "percent" && v > 100) return "Percentage cannot exceed 100%";
      }
      // Without a ceiling a £300 basket sold for £15 gives £285 off.
      if (bt === "fixed_price") {
        const max = Number(form.maxSubtotal);
        if (form.maxSubtotal === "" || !Number.isFinite(max) || max <= 0) {
          return "Fixed price needs “Only for laundry totals up to”, so a large order cannot be sold at this price";
        }
        if (max <= Number(form.discountValue)) return "“Only for laundry totals up to” must be more than the fixed price";
      }
      if (bt === "first_x_orders_discount" && !isPosInt(form.firstOrders)) return "First N orders must be a whole number of 1 or more";
      if (showsCap(form) && form.maxDiscountCap !== "" && !(Number(form.maxDiscountCap) > 0)) return "Max discount cap must be greater than 0";
      if (ITEM_SCOPE_TYPES.includes(bt) && bt !== "bundle" && form.targetType !== "all" && !form.targetIds.length) return "Select at least one target";
      return null;
    }
    case 1: {
      if (form.zoneScopeMode !== "all" && !form.zoneIds.length) return "Select at least one zone";
      for (const zo of form.zoneOverrides.filter((o) => overrideAllowed(form, o.zoneId))) {
        if (zo.discountValue !== "" && bt !== "bundle") {
          const v = Number(zo.discountValue);
          if (!(v > 0)) return "Zone override value must be greater than 0";
          if (mode === "percent" && v > 100) return "Zone override percentage cannot exceed 100%";
        }
        if (zo.maxDiscountCap !== "" && !(Number(zo.maxDiscountCap) > 0)) return "Zone override cap must be greater than 0";
        if (zo.minSubtotal !== "" && !(Number(zo.minSubtotal) >= 0)) return "Zone override minimum subtotal cannot be negative";
      }
      return null;
    }
    case 2: {
      // Who: a promotion that needs a code must have one.
      if (form.activationType === "coupon_required" && !form.couponCodes.length) return "Add at least one code, or choose Automatic";
      for (const c of form.conditions) {
        const err = conditionError(c);
        if (err) return err;
        const covered = conditionHidden(c.conditionType, bt);
        if (covered?.mustRemove) return `Remove the "${CONDITION_DEFS[c.conditionType]?.label || c.conditionType}" condition: ${covered.reason}`;
      }
      return null;
    }
    case 3: {
      const ints = [
        ["globalUsageLimit", "Total orders"], ["minQuantity", "Minimum quantity"],
        ...(lockedPerCustomerLimit(form) ? [] : [["perCustomerLimit", "Uses per customer"]]),
        ...(showsPeriodLimits(bt) ? [["perDayLimit", "Per-customer daily limit"], ["perWeekLimit", "Per-customer weekly limit"]] : []),
      ];
      for (const [k, label] of ints) {
        if (form[k] !== "" && !isPosInt(form[k])) return `${label} must be a whole number of 1 or more (blank = unlimited)`;
      }
      if (!form.campaignId && form.budget !== "" && !(Number(form.budget) > 0)) return "Budget must be more than £0 (blank = no limit)";
      if (form.minSubtotal !== "" && !(Number(form.minSubtotal) >= 0)) return "Minimum subtotal cannot be negative";
      if (form.maxSubtotal !== "" && !(Number(form.maxSubtotal) > 0)) return "\"Laundry total up to\" must be more than £0";
      if (form.minSubtotal !== "" && form.maxSubtotal !== "" && Number(form.maxSubtotal) < Number(form.minSubtotal)) {
        return "\"Laundry total up to\" must be at least \"Laundry total over\"";
      }
      if (form.priority !== "" && !Number.isInteger(Number(form.priority))) return "Priority must be a whole number";
      return null;
    }
    case 4: {
      if (form.startTime && !TIME_24.test(form.startTime)) return "Start time: use 24-hour time, e.g. 09:00";
      if (form.endTime && !TIME_24.test(form.endTime)) return "End time: use 24-hour time, e.g. 18:30";
      if (form.startDate && form.endDate && form.endDate < form.startDate) return "End date must be after the start date";
      if (form.startDate && form.endDate === form.startDate && (form.endTime || "23:59") <= (form.startTime || "00:00")) return "The end time must be after the start time";
      if (Boolean(form.recurringStartTime) !== Boolean(form.recurringEndTime)) return "Repeat window: choose both From and To, or leave both empty";
      if (form.recurringStartTime && form.recurringStartTime === form.recurringEndTime) return "Repeat window: From and To can't be the same time";
      return null;
    }
    default:
      return null;
  }
}

export const STEPS = ["What", "Where", "Who", "Limits", "When", "Review"];
