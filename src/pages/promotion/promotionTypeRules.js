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

/** The type is fixed once the promotion has been published (orders may hold it). */
export const isTypeLocked = (promotion) => Boolean(promotion?.currentVersionId);
