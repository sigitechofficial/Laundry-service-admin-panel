/**
 * Condition definitions for the enterprise promotion builder — mirrors the
 * backend per-type validation table (operators + value shapes).
 */

/* ─── Shared constants ───────────────────────────────────────────────────── */

export const WEEKDAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

export const OPERATOR_LABELS = {
  in: "is any of",
  not_in: "is none of",
  equals: "is exactly",
  gte: "at least",
  lte: "at most",
  between: "between",
};

export const LOGIC_GROUPS = [
  { value: "ALL", label: "Must match" },
  { value: "ANY", label: "Any of (OR)" },
];

export const CUSTOMER_TYPES = [
  { value: "new", label: "New (no completed orders)" },
  { value: "returning", label: "Returning" },
  { value: "inactive", label: "Inactive (90+ days)" },
];

export const PAYMENT_METHODS = [
  { value: "card", label: "Card" },
  { value: "cash", label: "Cash" },
];

/**
 * Per-type operators, default values and editor kind — mirrors the backend
 * validation table. CUSTOMER_SEGMENT / TURNAROUND_TYPE are intentionally
 * absent (no platform data yet).
 */
export const CONDITION_DEFS = {
  FIRST_ORDER: { label: "First order", operators: ["equals"], kind: "boolean", initial: () => true },
  CUSTOMER_TYPE: { label: "Customer type", operators: ["in", "not_in"], kind: "customerType", initial: () => ["new"] },
  ORDER_COUNT: { label: "Previous order count", operators: ["gte", "lte", "equals", "between"], kind: "integer", initial: () => 1 },
  MINIMUM_SUBTOTAL: { label: "Basket subtotal (min)", operators: ["gte", "lte"], kind: "money", initial: () => 20 },
  MAXIMUM_SUBTOTAL: { label: "Basket subtotal (max)", operators: ["lte", "gte"], kind: "money", initial: () => 100 },
  MINIMUM_QUANTITY: { label: "Item quantity (min)", operators: ["gte", "lte"], kind: "integer", initial: () => 2 },
  MAXIMUM_QUANTITY: { label: "Item quantity (max)", operators: ["lte", "gte"], kind: "integer", initial: () => 10 },
  ZONE: { label: "Zone", operators: ["in", "not_in"], kind: "zones", initial: () => [] },
  SERVICE: { label: "Basket contains service", operators: ["in"], kind: "catalog", catalog: "service", initial: () => [] },
  CATEGORY: { label: "Basket contains category", operators: ["in"], kind: "catalog", catalog: "category", initial: () => [] },
  PRODUCT: { label: "Basket contains item", operators: ["in"], kind: "catalog", catalog: "subCategory", initial: () => [] },
  ADDON: { label: "Basket contains add-on", operators: ["in"], kind: "catalog", catalog: "addon", initial: () => [] },
  COLLECTION_DAY: { label: "Collection day", operators: ["in", "not_in"], kind: "days", initial: () => [] },
  DELIVERY_DAY: { label: "Delivery day", operators: ["in", "not_in"], kind: "days", initial: () => [] },
  BOOKING_TIME: { label: "Booking time", operators: ["between"], kind: "timeRange", initial: () => ({ start: "09:00", end: "17:00" }) },
  SCHEDULE: { label: "Schedule window", operators: ["between"], kind: "schedule", initial: () => ({ days: [], startTime: "", endTime: "" }) },
  PAYMENT_METHOD: { label: "Payment method", operators: ["in"], kind: "payment", initial: () => ["card"] },
  COUPON: { label: "Coupon code entered", operators: ["in"], kind: "codes", initial: () => [] },
};

export const CONDITION_TYPE_OPTIONS = Object.entries(CONDITION_DEFS).map(([value, d]) => ({ value, label: d.label }));

export const newCondition = (conditionType = "FIRST_ORDER") => {
  const def = CONDITION_DEFS[conditionType];
  return { conditionType, operator: def.operators[0], value: def.initial(), logicGroup: "ALL" };
};

const isNum = (v) => v !== "" && v != null && Number.isFinite(Number(v));
const isTime = (v) => /^\d{2}:\d{2}$/.test(String(v || ""));

/** Returns an error string for an invalid condition, or null. */
export function conditionError(c) {
  const def = CONDITION_DEFS[c.conditionType];
  if (!def) return `"${c.conditionType}" is not supported in this editor — remove it`;
  const v = c.value;
  switch (def.kind) {
    case "boolean":
      return typeof v === "boolean" ? null : `${def.label}: choose yes or no`;
    case "integer":
    case "money":
      if (c.operator === "between") {
        if (!Array.isArray(v) || !isNum(v[0]) || !isNum(v[1])) return `${def.label}: enter both min and max`;
        if (Number(v[0]) > Number(v[1])) return `${def.label}: min cannot exceed max`;
        return null;
      }
      if (!isNum(v) || Number(v) < 0) return `${def.label}: enter a number (0 or more)`;
      return null;
    case "timeRange":
      return isTime(v?.start) && isTime(v?.end) ? null : `${def.label}: enter start and end times`;
    case "schedule": {
      const hasDays = Array.isArray(v?.days) && v.days.length > 0;
      const hasStart = isTime(v?.startTime);
      const hasEnd = isTime(v?.endTime);
      if (hasStart !== hasEnd) return `${def.label}: enter both start and end times`;
      if (!hasDays && !hasStart) return `${def.label}: pick days and/or a time window`;
      return null;
    }
    default:
      return Array.isArray(v) && v.length ? null : `${def.label}: select at least one value`;
  }
}

/** Normalise form state → API shape (numbers, trimmed codes). */
export function serializeCondition(c) {
  const def = CONDITION_DEFS[c.conditionType];
  if (!def) return c;
  let value = c.value;
  if (def.kind === "integer" || def.kind === "money") {
    value = Array.isArray(value) ? value.map(Number) : Number(value);
  } else if (def.kind === "zones" || def.kind === "catalog") {
    value = value.map(Number);
  } else if (def.kind === "schedule") {
    value = {
      ...(value.days?.length ? { days: value.days } : {}),
      ...(value.startTime ? { startTime: value.startTime } : {}),
      ...(value.endTime ? { endTime: value.endTime } : {}),
    };
  }
  return { conditionType: c.conditionType, operator: c.operator, value, logicGroup: c.logicGroup || "ALL" };
}
