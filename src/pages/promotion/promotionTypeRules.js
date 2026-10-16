/**
 * What a promotion's type, or another wizard step, already decides — so the wizard never
 * asks for the same rule twice. Pure functions (no React), mirrored by the server.
 */

export const FIRST_ORDER_TYPES = ["first_order_discount", "first_x_orders_discount"];

/** Conditions that repeat a setting with its own place in the wizard: type → where it lives. */
export const CONDITION_HOMES = {
  ZONE: "Geography → Zone Scope",
  MINIMUM_SUBTOTAL: "Limits → Minimum Subtotal",
  MAXIMUM_SUBTOTAL: "Limits → Maximum Subtotal",
  MINIMUM_QUANTITY: "Limits → Minimum Quantity",
  SCHEDULE: "Schedule → Recurring Window",
  BOOKING_TIME: "Schedule → Recurring Window",
  COUPON: "Benefit → Activation and the coupon codes below",
};

const ORDER_HISTORY_CONDITIONS = ["FIRST_ORDER", "CUSTOMER_TYPE", "ORDER_COUNT"];

/**
 * Why a condition type is not offered for this promotion, or null when it is.
 * `mustRemove` — the server refuses it with this type (it repeats or contradicts the type).
 */
export function conditionHidden(conditionType, benefitType) {
  if (FIRST_ORDER_TYPES.includes(benefitType) && ORDER_HISTORY_CONDITIONS.includes(conditionType)) {
    return {
      mustRemove: true,
      reason: benefitType === "first_order_discount"
        ? "This type is already for a customer's first order only. Remove this condition to save."
        : "This type is already limited to a customer's first orders. Remove this condition to save.",
    };
  }
  if (CONDITION_HOMES[conditionType]) {
    return { mustRemove: false, reason: `Already has its own place: ${CONDITION_HOMES[conditionType]}. It still works, but new promotions set it there.` };
  }
  return null;
}

/** Per-customer limit the type fixes ({ value, reason }), or null when the admin chooses it. */
export function lockedPerCustomerLimit({ benefitType, firstOrders }) {
  if (benefitType === "first_order_discount") {
    return { value: "1", reason: "Set by the type: a customer has only one first order." };
  }
  if (benefitType === "first_x_orders_discount") {
    const n = Number(firstOrders);
    const valid = Number.isInteger(n) && n >= 1;
    return {
      value: valid ? String(n) : "",
      reason: valid
        ? `Set by "First N orders": each customer can use it on their first ${n} order${n === 1 ? "" : "s"}.`
        : "Set by \"First N orders\" on the Benefit step.",
    };
  }
  return null;
}

/** Per-day / per-week limits only matter when a customer can use the promotion more than once. */
export const showsPeriodLimits = (benefitType) => benefitType !== "first_order_discount";

/** Is this visibility a sensible choice here? (The promotion's current value is always kept.) */
export function visibilityOffered(visibility, { activationType, benefitType }) {
  if (visibility === "private_code") return activationType === "coupon_required";
  // A first-order type is already shown only to customers who qualify.
  if (visibility === "targeted") return !FIRST_ORDER_TYPES.includes(benefitType);
  return true;
}

// Types whose saving is worked out on the whole basket (not on chosen items).
const WHOLE_BASKET_TYPES = [
  "basket_discount", "percentage_discount", "fixed_amount_discount", "fixed_price",
  "first_order_discount", "first_x_orders_discount", "cashback",
];
const BASKET_CONTENT_CONDITIONS = ["SERVICE", "CATEGORY", "PRODUCT", "ADDON"];

/**
 * A whole-basket promotion with a "Basket contains …" condition: the condition only
 * decides who gets the offer, the saving still covers every item. Returns the
 * warning to show, or null.
 */
export function basketScopeWarning(benefitType, conditions = []) {
  if (!WHOLE_BASKET_TYPES.includes(benefitType)) return null;
  if (!conditions.some((c) => BASKET_CONTENT_CONDITIONS.includes(c.conditionType))) return null;
  const saving = benefitType === "cashback" ? "cashback is still worked out on" : "discount still comes off";
  return `"Basket contains …" only decides who gets this offer. The ${saving} the whole basket, other services included. ` +
    "To discount only certain services, categories or items, create a Service, Category or Item Discount instead.";
}

/** The type is fixed once the promotion has been published (orders may hold it). */
export const isTypeLocked = (promotion) => Boolean(promotion?.currentVersionId);

const isTrue = (v) => v === true || v === "true";
const isFalse = (v) => v === false || v === "false";

/**
 * A "Must match: First order" condition in Audience: "only" (first order only),
 * "never" (not on a first order) or null when there is none.
 */
export function firstOrderRule(conditions = []) {
  const rule = conditions.find((c) => c.conditionType === "FIRST_ORDER" && (c.logicGroup || "ALL") === "ALL");
  if (!rule) return null;
  if (isTrue(rule.value)) return "only";
  if (isFalse(rule.value)) return "never";
  return null;
}

/**
 * With "First order only" a customer can get the offer once, so per-customer, per-day
 * and per-week limits above 1 never come into play. Returns the note to show, or null.
 */
export function firstOrderLimitNote({ conditions = [], perCustomerLimit, perDayLimit, perWeekLimit }) {
  if (firstOrderRule(conditions) !== "only") return null;
  const above1 = [perCustomerLimit, perDayLimit, perWeekLimit].some((v) => Number(v) > 1);
  if (!above1) return null;
  return 'Audience has "First order only", so each customer can get this offer once, on their first order. ' +
    '"Uses per Customer", "per Day" and "per Week" above 1 have no effect. Remove that condition to let customers use it again.';
}
