import { useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  Button, Field, Input, Modal, PageHeader, Select, Table, Textarea,
} from "../../design-system";
import { PaginationBar, Toggle } from "../misc-kit";
import {
  DirectoryActions, DirectoryActionEdit, DirectoryActionIcon, DirectoryActionView,
  DirectoryDotPill, DirectoryIdentity, DirectoryMetrics,
  DirectoryTableWrap, DirectoryToolbar, DirectoryToolbarEnd,
  DirectoryToolSelect, DirectoryViewFields, DirectoryViewModal,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import {
  useGetPromotionsQuery, useLazyGetPromotionByIdQuery, useCreatePromotionMutation, useUpdatePromotionMutation,
  usePublishPromotionMutation, usePausePromotionMutation, useArchivePromotionMutation,
  useClonePromotionMutation, useGetCampaignsQuery, useGetAllZonesQuery,
  useGetAllServicesQuery, useGetCategoriesQuery, useGetSubCategoriesQuery, useGetAllAddOnServicesQuery,
} from "../../store/services/api";
import { TbPlus } from "../../shared/icons/index";
import {
  TbDiscount, TbShoppingCart, TbMapPin, TbUsers, TbCalendarEvent,
  TbPlayerPlay, TbPlayerPause, TbCopy, TbArchive, TbEye, TbFlask, TbTarget, TbChartBar,
} from "react-icons/tb";
import { PromotionReportModal } from "./PromotionReport";
import ZoneMultiSelect from "./ZoneMultiSelect";
import CatalogMultiSelect from "./CatalogMultiSelect";
import PromotionConditionBuilder, { DayPicker } from "./PromotionConditionBuilder";
import PromotionSimulateModal from "./PromotionSimulateModal";
import { CONDITION_DEFS, WEEKDAYS, conditionError, serializeCondition } from "./promotionConditions";
import { BENEFIT_TYPES, STATUS_OPTIONS, STATUS_TONES } from "./promotionLabels";
import {
  FIRST_ORDER_TYPES, basketScopeWarning, bulkPriceSummary, bundleSize, conditionHidden, firstOrderLimitNote,
  firstOrderRule, isTypeLocked, lockedPerCustomerLimit, showsPeriodLimits, visibilityOffered,
} from "./promotionTypeRules";

/* ─── Constants ──────────────────────────────────────────────────────────── */


// Same as basket_discount in % / £ mode — kept for labels and existing promotions,
// but not offered when picking a type (unless the promotion already uses it).
const RETIRED_BENEFIT_TYPES = ["percentage_discount", "fixed_amount_discount"];
const benefitTypeOptions = (current) =>
  BENEFIT_TYPES.filter((b) => !RETIRED_BENEFIT_TYPES.includes(b.value) || b.value === current);

// discountMode is fixed for these types; MODE_CHOICE_TYPES let the admin pick.
const FORCED_MODE = {
  percentage_discount: "percent",
  first_order_discount: "percent",
  first_x_orders_discount: "percent",
  fixed_amount_discount: "amount",
  delivery_discount: "amount",
  bundle: "amount",
};
const MODE_CHOICE_TYPES = ["basket_discount", "item_discount", "category_discount", "service_discount", "cashback"];
const ITEM_SCOPE_TYPES = ["item_discount", "category_discount", "service_discount", "bundle"];
// Types where the admin picks what the targets are (items, add-ons, categories, services or all).
const TARGET_TYPE_CHOICE = ["item_discount", "bundle"];
const DELIVERY_TYPES = ["free_delivery", "delivery_discount"];

const DISCOUNT_MODES = [
  { value: "percent", label: "Percentage (%)" },
  { value: "amount", label: "Amount (£)" },
];

const ITEM_TARGET_TYPES = [
  { value: "subCategory", label: "Specific item(s)" },
  { value: "addon", label: "Specific add-on(s)" },
  { value: "category", label: "Specific categor(y/ies)" },
  { value: "service", label: "Specific service(s)" },
  { value: "all", label: "All items" },
];

const ZONE_SCOPES = [
  { value: "all", label: "All Zones" },
  { value: "selected", label: "Selected Zones" },
  { value: "excluded", label: "All Except Selected" },
];

const ACTIVATION_TYPES = [
  { value: "automatic", label: "Automatic (no code needed)" },
  { value: "coupon_required", label: "Coupon Code Required" },
];

const VISIBILITY_OPTIONS = [
  { value: "public", label: "Public — visible to customers" },
  { value: "private_code", label: "Private — code only" },
  { value: "targeted", label: "Targeted — specific audience" },
  { value: "hidden", label: "Hidden — internal only" },
];

const statusLabel = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;
const benefitLabel = (type) => BENEFIT_TYPES.find((b) => b.value === type)?.label || type;

// Lifecycle rules — mirror the backend transitions.
const canEdit = (s) => s === "draft" || s === "paused";
const canPublish = (s) => ["draft", "approved", "paused"].includes(s);
const canPause = (s) => s === "active" || s === "scheduled";
const canArchive = (s) => s !== "archived";

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function effectiveMode(p) {
  if (FORCED_MODE[p.benefitType]) return FORCED_MODE[p.benefitType];
  if (MODE_CHOICE_TYPES.includes(p.benefitType)) return p.discountMode || "percent";
  return null; // fixed_price (target price) / free_delivery (no value)
}

const needsValue = (bt) => bt !== "free_delivery";
// Item-scope "£ off each" also takes a cap: it limits the total, e.g. £30 off each item but £30 at most.
const showsCap = (p) =>
  effectiveMode(p) === "percent" || p.benefitType === "cashback" || ITEM_SCOPE_TYPES.includes(p.benefitType);
const defaultTargetType = (bt) => {
  if (TARGET_TYPE_CHOICE.includes(bt)) return "subCategory";
  if (bt === "category_discount") return "category";
  if (bt === "service_discount") return "service";
  if (DELIVERY_TYPES.includes(bt)) return "delivery";
  return "basket";
};

const money = (n) => `£${Number(n).toFixed(2)}`;

/** Human value for table / review / view — % vs £ per discountMode. */
function valueLabel(p) {
  if (p.benefitType === "free_delivery") return "Free delivery";
  if (p.discountValue === "" || p.discountValue == null) return "—";
  const n = Number(p.discountValue);
  if (p.benefitType === "fixed_price") return `Basket for ${money(n)}`;
  const cap = showsCap(p) && p.maxDiscountCap ? ` (max ${money(p.maxDiscountCap)})` : "";
  if (p.benefitType === "bundle") return `${bundleSize(p) || "N"} for ${money(n)}${cap}`;
  if (effectiveMode(p) === "percent") return `${n}%${cap}`;
  if (ITEM_SCOPE_TYPES.includes(p.benefitType)) return `${money(n)} off each${cap}`;
  return `${money(n)}${cap}`;
}

function valueFieldLabel(form) {
  const mode = effectiveMode(form);
  const bt = form.benefitType;
  if (bt === "fixed_price") return "Sell basket for (£) *";
  if (bt === "bundle") return "Price for these pieces (£) *";
  if (bt === "cashback") return mode === "percent" ? "Cashback (%) *" : "Cashback (£) *";
  if (mode === "percent") return "Discount (%) *";
  if (ITEM_SCOPE_TYPES.includes(bt)) return "£ off each item *";
  if (bt === "delivery_discount") return "£ off delivery *";
  if (bt === "basket_discount") return "£ off basket *";
  return "Discount (£) *";
}

/** The UK calendar day a promotion starts / ends on (the server's startDay / endDay). */
const promotionDay = (p, which) => {
  const day = which === "start" ? p?.startDay : p?.endDay;
  const stored = which === "start" ? p?.startDate : p?.endDate;
  return day || (stored ? dayjs(stored).format("YYYY-MM-DD") : "");
};

const parseJson = (v, fallback) => {
  if (v == null) return fallback;
  if (typeof v !== "string") return v;
  try { return JSON.parse(v); } catch { return fallback; }
};
const numStr = (v) => (v === "" || v == null ? "" : String(Number(v)));
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
const isPosInt = (v) => Number.isInteger(Number(v)) && Number(v) >= 1;

function extractList(response, ...keys) {
  const root = response?.data ?? response;
  for (const k of keys) {
    if (Array.isArray(root?.[k])) return root[k];
  }
  if (Array.isArray(root)) return root;
  return [];
}

const INITIAL_FORM = () => ({
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
  targetType: "basket",
  targetIds: [],
  zoneScopeMode: "all",
  zoneIds: [],
  zoneOverrides: [],
  startDate: "",
  endDate: "",
  recurringDays: [],
  recurringStartTime: "",
  recurringEndTime: "",
  activationType: "automatic",
  visibility: "public",
  priority: "50",
  stackable: false,
  stackGroup: "",
  globalUsageLimit: "",
  perCustomerLimit: "1",
  perDayLimit: "",
  perWeekLimit: "",
  minSubtotal: "",
  maxSubtotal: "",
  minQuantity: "",
  repricingPolicy: "recalculate",
  conditions: [],
  couponCodes: [],
});

/** GET /promotions/:id detail → form state. */
function formFromPromotion(p) {
  const config = parseJson(p.benefitConfig, {}) || {};
  return {
    ...INITIAL_FORM(),
    name: p.name || "",
    description: p.description || "",
    internalNotes: p.internalNotes || "",
    campaignId: p.campaignId ? String(p.campaignId) : "",
    benefitType: p.benefitType || "percentage_discount",
    discountMode: p.discountMode || "percent",
    discountValue: numStr(p.discountValue),
    maxDiscountCap: numStr(p.maxDiscountCap),
    firstOrders: config.firstOrders != null ? String(config.firstOrders) : "3",
    bundleQuantity: config.bundleQuantity != null ? String(config.bundleQuantity) : "10",
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
function overrideAllowed(form, zoneId) {
  if (form.zoneScopeMode === "selected") return form.zoneIds.includes(zoneId);
  if (form.zoneScopeMode === "excluded") return !form.zoneIds.includes(zoneId);
  return true;
}

/** Form state → create/update payload. Optional numbers/dates are null, never "". */
function buildPayload(form) {
  const bt = form.benefitType;
  const mode = effectiveMode(form);
  const itemScope = ITEM_SCOPE_TYPES.includes(bt);
  const cap = showsCap(form);
  const targetType = itemScope ? form.targetType : defaultTargetType(bt);
  const hasTimes = form.recurringStartTime && form.recurringEndTime;
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    internalNotes: form.internalNotes.trim() || null,
    campaignId: form.campaignId ? Number(form.campaignId) : null,
    benefitType: bt,
    discountMode: mode,
    discountValue: needsValue(bt) ? numOrNull(form.discountValue) : null,
    maxDiscountCap: cap ? numOrNull(form.maxDiscountCap) : null,
    benefitConfig: bt === "first_x_orders_discount" ? { firstOrders: Number(form.firstOrders) }
      : bt === "bundle" ? { bundleQuantity: Number(form.bundleQuantity) }
      : null,
    targetType,
    targetIds: itemScope && targetType !== "all" ? form.targetIds.map(Number) : null,
    zoneScopeMode: form.zoneScopeMode,
    zoneIds:
      form.zoneScopeMode !== "all"
        ? form.zoneIds.map(Number).filter((n) => Number.isInteger(n) && n > 0)
        : null,
    zoneOverrides: form.zoneOverrides
      .filter((zo) => overrideAllowed(form, zo.zoneId))
      .map((zo) => ({
        zoneId: Number(zo.zoneId),
        discountValue: needsValue(bt) ? numOrNull(zo.discountValue) : null,
        maxDiscountCap: cap ? numOrNull(zo.maxDiscountCap) : null,
        minSubtotal: numOrNull(zo.minSubtotal),
      })),
    // Sent as calendar days: the server turns them into the start / end of that day in UK time.
    startDate: form.startDate || null,
    endDate: form.endDate || null,
    recurringDays: form.recurringDays.length ? [...form.recurringDays].sort((a, b) => a - b) : null,
    recurringStartTime: hasTimes ? form.recurringStartTime : null,
    recurringEndTime: hasTimes ? form.recurringEndTime : null,
    activationType: form.activationType,
    visibility: form.visibility,
    priority: form.priority === "" ? 50 : Number(form.priority),
    stackable: form.stackable,
    stackGroup: form.stackable && form.stackGroup.trim() ? form.stackGroup.trim() : null,
    globalUsageLimit: numOrNull(form.globalUsageLimit),
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

const shortDay = (day) => dayjs(day).format("D MMM YYYY");

/**
 * The promotion in plain words, rebuilt as the admin types: what it gives, how it is
 * activated, where, when and how often. Shown on every wizard step.
 */
function promotionSummary(form, zoneName) {
  const bt = form.benefitType;
  const value = valueLabel(form);
  const valueSet = !needsValue(bt) || Number(form.discountValue) > 0;
  const targetWord = { subCategory: "item", addon: "add-on", category: "category", service: "service" }[form.targetType] || "item";
  const targets = form.targetType === "all"
    ? "all items"
    : `${form.targetIds.length || "no"} selected ${targetWord}${form.targetIds.length === 1 ? "" : "s"}`.replace("categorys", "categories");

  let what;
  if (!valueSet) what = `${benefitLabel(bt)} — value not set yet`;
  else if (bt === "first_order_discount") what = `New customers get ${value} off their first order`;
  else if (bt === "first_x_orders_discount") what = `Customers get ${value} off each of their first ${isPosInt(form.firstOrders) ? form.firstOrders : "N"} orders`;
  else if (bt === "free_delivery") what = "Free delivery";
  else if (bt === "delivery_discount") what = `${value} off the delivery fee`;
  else if (bt === "cashback") what = `${value} cashback, added to the customer's credit after delivery`;
  else if (bt === "fixed_price") what = value;
  else if (bt === "bundle") {
    what = bulkPriceSummary({ size: bundleSize(form), price: form.discountValue, cap: form.maxDiscountCap, targets });
  } else if (ITEM_SCOPE_TYPES.includes(bt) && effectiveMode(form) === "amount") {
    const amount = money(form.discountValue);
    const total = Number(form.maxDiscountCap) > 0 ? `, at most ${money(form.maxDiscountCap)} in total` : ", with no limit on the total";
    what = `${amount} off every single item in ${targets} (an item never goes below £0)${total}`;
  } else if (ITEM_SCOPE_TYPES.includes(bt)) what = `${value} on ${targets}`;
  else what = `${value} off the order`;

  const codes = form.couponCodes.map((c) => c.code);
  const how = form.activationType === "automatic"
    ? "Applied automatically"
    : codes.length ? `With code ${codes.slice(0, 3).join(", ")}${codes.length > 3 ? ` +${codes.length - 3}` : ""}` : "Needs a coupon code (none added yet)";

  const zoneCount = form.zoneIds.length;
  const zoneNames = zoneCount && zoneCount <= 2 ? form.zoneIds.map(zoneName).join(", ") : `${zoneCount} zones`;
  const where = form.zoneScopeMode === "all" ? "All zones"
    : !zoneCount ? "No zones selected yet"
    : form.zoneScopeMode === "excluded" ? `All zones except ${zoneNames}` : zoneNames;

  const spend = [
    form.minSubtotal !== "" && Number(form.minSubtotal) > 0
      ? `${ITEM_SCOPE_TYPES.includes(bt) ? "selected items of" : "orders of"} ${money(form.minSubtotal)} or more`
      : null,
    form.maxSubtotal !== "" && Number(form.maxSubtotal) > 0
      ? `${ITEM_SCOPE_TYPES.includes(bt) && !(Number(form.minSubtotal) > 0) ? "selected items up to" : "up to"} ${money(form.maxSubtotal)}`
      : null,
  ].filter(Boolean).join(", ");

  const dates = form.startDate && form.endDate ? `${shortDay(form.startDate)} – ${shortDay(form.endDate)}`
    : form.startDate ? `From ${shortDay(form.startDate)}`
    : form.endDate ? `Until ${shortDay(form.endDate)}` : "From publish, no end date";
  const days = WEEKDAYS.filter((d) => form.recurringDays.includes(d.value)).map((d) => d.label).join(", ");
  const window = form.recurringStartTime && form.recurringEndTime ? `${form.recurringStartTime}–${form.recurringEndTime}` : "";
  const timed = form.startDate || form.endDate || days || window;
  const when = `${[dates, days, window].filter(Boolean).join(" · ")}${timed ? " (UK time)" : ""}`;

  const firstOrder = firstOrderRule(form.conditions);
  const who = firstOrder === "only" ? "First order only"
    : firstOrder === "never" ? "Not on a customer's first order" : null;
  const otherRules = form.conditions.filter((c) => c.conditionType !== "FIRST_ORDER").length;
  const audience = [who, otherRules ? `${otherRules} more audience rule${otherRules === 1 ? "" : "s"}` : null]
    .filter(Boolean).join(", ");

  const perCustomer = lockedPerCustomerLimit(form)?.value ?? form.perCustomerLimit;
  const often = [
    firstOrder === "only" ? "Once per customer (their first order)"
      : !isPosInt(perCustomer) ? "No per-customer limit" : Number(perCustomer) === 1 ? "Once per customer" : `${perCustomer} times per customer`,
    isPosInt(form.globalUsageLimit) ? `first ${form.globalUsageLimit} uses in total` : null,
  ].filter(Boolean).join(", ");

  return [what, how, audience || null, where, spend ? `On ${spend}` : null, when, often].filter(Boolean);
}

function PromotionSummaryBar({ parts }) {
  return (
    <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2" aria-label="Promotion summary">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">In plain words</div>
      <div className="text-sm text-gray-900">
        <strong>{parts[0]}</strong>
        {parts.slice(1).map((part) => <span key={part}> · {part}</span>)}
      </div>
    </div>
  );
}

/** Returns the first validation error for a wizard step, or null. */
function validateStep(step, form) {
  const mode = effectiveMode(form);
  const bt = form.benefitType;
  switch (step) {
    case 0: {
      if (!form.name.trim()) return "Promotion name is required";
      if (needsValue(bt)) {
        const v = Number(form.discountValue);
        if (form.discountValue === "" || !Number.isFinite(v) || v <= 0) {
          return bt === "fixed_price" ? "Basket price must be greater than 0" : "Discount value must be greater than 0";
        }
        if (mode === "percent" && v > 100) return "Percentage cannot exceed 100%";
      }
      if (bt === "first_x_orders_discount" && !isPosInt(form.firstOrders)) return "First N orders must be a whole number of 1 or more";
      if (bt === "bundle" && !(bundleSize(form) && bundleSize(form) <= 1000)) return "Pieces in the deal must be a whole number from 2 to 1000";
      if (showsCap(form) && form.maxDiscountCap !== "" && !(Number(form.maxDiscountCap) > 0)) return "Max discount cap must be greater than 0";
      if (ITEM_SCOPE_TYPES.includes(bt) && form.targetType !== "all" && !form.targetIds.length) return "Select at least one target";
      return null;
    }
    case 1: {
      if (form.zoneScopeMode !== "all" && !form.zoneIds.length) return "Select at least one zone";
      for (const zo of form.zoneOverrides.filter((o) => overrideAllowed(form, o.zoneId))) {
        if (zo.discountValue !== "") {
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
      if (form.activationType === "coupon_required" && !form.couponCodes.length) return "Add at least one coupon code";
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
        ["globalUsageLimit", "Total uses"], ["minQuantity", "Minimum quantity"],
        ...(lockedPerCustomerLimit(form) ? [] : [["perCustomerLimit", "Uses per customer"]]),
        ...(showsPeriodLimits(bt) ? [["perDayLimit", "Per-customer daily limit"], ["perWeekLimit", "Per-customer weekly limit"]] : []),
      ];
      for (const [k, label] of ints) {
        if (form[k] !== "" && !isPosInt(form[k])) return `${label} must be a whole number of 1 or more (blank = unlimited)`;
      }
      if (form.minSubtotal !== "" && !(Number(form.minSubtotal) >= 0)) return "Minimum subtotal cannot be negative";
      if (form.maxSubtotal !== "" && !(Number(form.maxSubtotal) > 0)) return "Maximum subtotal must be greater than 0";
      if (form.minSubtotal !== "" && form.maxSubtotal !== "" && Number(form.maxSubtotal) < Number(form.minSubtotal)) {
        return "Maximum subtotal must be at least the minimum subtotal";
      }
      if (form.priority !== "" && !Number.isInteger(Number(form.priority))) return "Priority must be a whole number";
      return null;
    }
    case 4: {
      if (form.startDate && form.endDate && form.endDate < form.startDate) return "End date must be after the start date";
      if (Boolean(form.recurringStartTime) !== Boolean(form.recurringEndTime)) return "Enter both a start and end time for the recurring window";
      return null;
    }
    default:
      return null;
  }
}

/* ─── Wizard Step Indicator ─────────────────────────────────────────────── */

const STEPS = ["Benefit", "Geography", "Audience", "Limits", "Schedule", "Review"];

function StepIndicator({ step, onSelect }) {
  return (
    <div className="flex gap-1 mb-6">
      {STEPS.map((label, i) => (
        <button
          key={label}
          type="button"
          onClick={() => onSelect(i)}
          className={`flex-1 text-xs py-2 rounded-lg transition-all font-medium ${
            i === step
              ? "bg-blue-600 text-white shadow-sm"
              : i < step
              ? "bg-blue-100 text-blue-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/* ─── Coupon Codes Builder ──────────────────────────────────────────────── */

function CouponCodesBuilder({ codes, onChange, onDuplicate }) {
  const [newCode, setNewCode] = useState("");
  const add = () => {
    const code = newCode.trim().toUpperCase();
    if (!code) return;
    if (codes.some((c) => c.code.toUpperCase() === code)) {
      onDuplicate(code);
      return;
    }
    onChange([...codes, { code, codeType: "shared" }]);
    setNewCode("");
  };
  const remove = (idx) => onChange(codes.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          value={newCode}
          onChange={(e) => setNewCode(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder="Enter coupon code"
          className="flex-1"
        />
        <Button variant="secondary" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {codes.map((c, i) => (
          <span
            key={c.code}
            className={`inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-full ${
              c.isActive === false ? "bg-gray-100 text-gray-400 line-through" : "bg-blue-50 text-blue-700"
            }`}
            title={c.usedCount ? `Used ${c.usedCount}× — removing deactivates it instead of deleting` : undefined}
          >
            {c.code}
            {c.usedCount ? <span className="font-normal text-gray-500">· {c.usedCount} used</span> : null}
            <button type="button" onClick={() => remove(i)} className="hover:text-red-600 ml-1">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

const labelOf = (options, value) => options.find((o) => o.value === value)?.label || value || "—";
const fmtDay = (day, time) => (day ? `${dayjs(day).format("DD MMM YYYY")}, ${time} UK time` : null);

function ViewStat({ label, value, hint }) {
  return (
    <div className="rounded-lg bg-white border border-gray-200 px-3 py-2 min-w-0">
      <p className="m-0 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="m-0 text-lg font-semibold text-gray-900 tabular-nums">{value}</p>
      {hint ? <p className="m-0 text-[11px] text-gray-500 truncate">{hint}</p> : null}
    </div>
  );
}

function ViewSection({ title, children }) {
  return (
    <section>
      <h4 className="m-0 mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">{title}</h4>
      {children}
    </section>
  );
}

/** Read-only promotion summary: what it gives, to whom, under which rules, and when. */
function PromotionViewBody({ promotion: p }) {
  const zones = parseJson(p.zoneIds, []) || [];
  const days = parseJson(p.recurringDays, []) || [];
  const dayText = days.length
    ? WEEKDAYS.filter((d) => days.includes(d.value)).map((d) => d.label).join(", ")
    : null;
  const windowText = p.recurringStartTime && p.recurringEndTime
    ? `${String(p.recurringStartTime).slice(0, 5)}–${String(p.recurringEndTime).slice(0, 5)}`
    : null;
  const coupons = p.couponCodes || [];
  const used = Number(p.globalUsedCount || 0);
  const limit = p.globalUsageLimit;
  const subtotalRule = [
    p.minSubtotal != null && p.minSubtotal !== "" ? `min ${money(p.minSubtotal)}` : null,
    p.maxSubtotal != null && p.maxSubtotal !== "" ? `max ${money(p.maxSubtotal)}` : null,
  ].filter(Boolean).join(" · ");
  const periodLimits = [
    p.perDayLimit ? `${p.perDayLimit} / day per customer` : null,
    p.perWeekLimit ? `${p.perWeekLimit} / week per customer` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-semibold uppercase tracking-wide text-gray-500">{benefitLabel(p.benefitType)}</p>
            <p className="m-0 mt-1 text-2xl font-bold text-gray-900 break-words">{valueLabel(p)}</p>
            <p className="m-0 mt-1 text-sm text-gray-600">
              {p.activationType === "coupon_required" ? "Needs a coupon code" : "Applies automatically"}
              {" · "}
              {p.zoneScopeMode === "all" ? "All zones" : `${labelOf(ZONE_SCOPES, p.zoneScopeMode)} (${zones.length})`}
            </p>
          </div>
          <DirectoryDotPill tone={STATUS_TONES[p.status] || "neutral"}>{statusLabel(p.status)}</DirectoryDotPill>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <ViewStat label="Used" value={limit ? `${used} / ${limit}` : used} hint={limit ? `${Math.max(0, limit - used)} left` : "No limit"} />
          <ViewStat label="Per customer" value={p.perCustomerLimit ?? "∞"} hint="uses each" />
          <ViewStat label="Coupons" value={coupons.length} hint={coupons.length ? null : "None"} />
        </div>
      </div>

      {p.description ? <p className="m-0 text-sm text-gray-700">{p.description}</p> : null}

      <ViewSection title="Who & where">
        <DirectoryViewFields
          fields={[
            { label: "Activation", value: labelOf(ACTIVATION_TYPES, p.activationType) },
            { label: "Visibility", value: labelOf(VISIBILITY_OPTIONS, p.visibility) },
            { label: "Zones", value: p.zoneScopeMode === "all" ? "All zones" : `${labelOf(ZONE_SCOPES, p.zoneScopeMode)} · ${zones.length} zone${zones.length === 1 ? "" : "s"}` },
            ITEM_SCOPE_TYPES.includes(p.benefitType) ? { label: "Applies to", value: labelOf(ITEM_TARGET_TYPES, p.targetType) } : null,
          ]}
        />
      </ViewSection>

      <ViewSection title="Rules">
        <DirectoryViewFields
          fields={[
            subtotalRule ? { label: "Basket subtotal", value: subtotalRule } : null,
            p.minQuantity ? { label: "Min items", value: p.minQuantity } : null,
            periodLimits ? { label: "Limits", value: periodLimits } : null,
            { label: "Priority", value: `${p.priority ?? 50} (higher wins)` },
            { label: "Stackable", value: p.stackable ? `Yes${p.stackGroup ? ` · group ${p.stackGroup}` : ""}` : "No — best single offer" },
          ]}
        />
      </ViewSection>

      <ViewSection title="When">
        <DirectoryViewFields
          fields={[
            { label: "Starts", value: fmtDay(promotionDay(p, "start"), "00:00") || "When published" },
            { label: "Ends", value: fmtDay(promotionDay(p, "end"), "23:59") || "No end date" },
            dayText || windowText ? { label: "Only on", value: [dayText, windowText].filter(Boolean).join(" · ") } : null,
          ]}
        />
      </ViewSection>

      {coupons.length > 0 && (
        <ViewSection title="Coupon codes">
          <div className="flex flex-wrap gap-2">
            {coupons.map((c) => (
              <span
                key={c.id || c.code}
                className={`font-mono text-xs px-2 py-1 rounded-md border ${c.isActive === false ? "border-gray-200 text-gray-400 line-through" : "border-gray-300 text-gray-800 bg-white"}`}
                title={c.isActive === false ? "Deactivated" : undefined}
              >
                {c.code}
                {c.usedCount ? <span className="text-gray-500"> · {c.usedCount} used</span> : null}
              </span>
            ))}
          </div>
        </ViewSection>
      )}
    </div>
  );
}

export default function PromotionsPage() {
  const toast = useToaster();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM());
  const [editId, setEditId] = useState(null);
  const [typeLocked, setTypeLocked] = useState(false);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);
  const [reportRow, setReportRow] = useState(null);
  const [showSimulate, setShowSimulate] = useState(false);

  const { data, isLoading } = useGetPromotionsQuery({ page, limit: 20, status: statusFilter || undefined });
  const { data: campaignsData } = useGetCampaignsQuery({ limit: 200 });
  const { data: zonesData } = useGetAllZonesQuery();

  // Catalog lists feed the target picker and catalog conditions — only needed while the wizard is open.
  const { data: servicesResp } = useGetAllServicesQuery(undefined, { skip: !showForm });
  const { data: categoriesResp } = useGetCategoriesQuery(undefined, { skip: !showForm });
  const { data: subCatsResp } = useGetSubCategoriesQuery(undefined, { skip: !showForm });
  const { data: addonsResp } = useGetAllAddOnServicesQuery(undefined, { skip: !showForm });

  const [fetchPromotion] = useLazyGetPromotionByIdQuery();
  const [createPromotion, { isLoading: creating }] = useCreatePromotionMutation();
  const [updatePromotion, { isLoading: updating }] = useUpdatePromotionMutation();
  const [publishPromotion, { isLoading: publishing }] = usePublishPromotionMutation();
  const [pausePromotion] = usePausePromotionMutation();
  const [archivePromotion, { isLoading: archiving }] = useArchivePromotionMutation();
  const [clonePromotion] = useClonePromotionMutation();
  const saving = creating || updating;

  const promotions = data?.rows || [];
  const totalCount = data?.count || 0;

  const zones = useMemo(() => {
    const raw = zonesData?.data ?? zonesData;
    return Array.isArray(raw) ? raw : raw?.zones ?? raw?.data ?? [];
  }, [zonesData]);
  const zoneName = useCallback(
    (id) => {
      const z = zones.find((x) => String(x.id ?? x._id) === String(id));
      return z ? z.name ?? z.zoneName : `Zone ${id}`;
    },
    [zones]
  );

  const campaignOptions = useMemo(() => [
    { value: "", label: "No Campaign" },
    ...(campaignsData?.rows || []).map((c) => ({ value: String(c.id), label: c.name })),
  ], [campaignsData]);

  const catalogOptions = useMemo(() => {
    const opt = (list, kind) => list.map((x) => ({
      value: String(x.id ?? x._id),
      label: x.name ?? x.serviceName ?? x.categoryName ?? x.subCategoryName ?? x.addonName ?? x.title ?? `${kind} ${x.id}`,
      price: x.price,
    }));
    return {
      service: opt(extractList(servicesResp, "services", "data"), "Service"),
      category: opt(extractList(categoriesResp, "categories", "data"), "Category"),
      subCategory: opt(extractList(subCatsResp, "subCategories", "subCat", "data"), "Item"),
      addon: opt(extractList(addonsResp, "addOnServices", "addons", "data"), "Add-on"),
    };
  }, [servicesResp, categoriesResp, subCatsResp, addonsResp]);

  const setField = useCallback((k, v) => setForm((prev) => ({ ...prev, [k]: v })), []);

  // Benefit type drives discountMode / targetType defaults — reset dependent fields.
  const setBenefitType = (bt) => setForm((prev) => ({
    ...prev,
    benefitType: bt,
    discountMode: MODE_CHOICE_TYPES.includes(bt) ? prev.discountMode || "percent" : FORCED_MODE[bt] || "percent",
    targetType: defaultTargetType(bt),
    targetIds: [],
    visibility: visibilityOffered(prev.visibility, { ...prev, benefitType: bt }) ? prev.visibility : "public",
  }));

  // "Private — code only" has no meaning without a code.
  const setActivationType = (activationType) => setForm((prev) => ({
    ...prev,
    activationType,
    visibility: visibilityOffered(prev.visibility, { ...prev, activationType }) ? prev.visibility : "public",
  }));

  const openCreate = () => { setForm(INITIAL_FORM()); setEditId(null); setTypeLocked(false); setWizardStep(0); setShowForm(true); };

  // Edit loads the full detail — list rows carry no conditions / overrides.
  const openEdit = async (row) => {
    setEditLoadingId(row.id);
    try {
      const res = await fetchPromotion(row.id).unwrap();
      const promo = res?.data ?? res;
      setForm(formFromPromotion(promo));
      setEditId(row.id);
      setTypeLocked(isTypeLocked(promo));
      setWizardStep(0);
      setShowForm(true);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to load promotion");
    } finally {
      setEditLoadingId(null);
    }
  };

  // Moving forward validates every step in between.
  const goToStep = (target) => {
    for (let s = wizardStep; s < target; s += 1) {
      const err = validateStep(s, form);
      if (err) {
        setWizardStep(s);
        toast.error(err);
        return;
      }
    }
    setWizardStep(target);
  };

  const handleSave = async () => {
    if (saving) return;
    for (let s = 0; s < STEPS.length - 1; s += 1) {
      const err = validateStep(s, form);
      if (err) {
        setWizardStep(s);
        toast.error(err);
        return;
      }
    }
    try {
      const payload = buildPayload(form);
      if (editId) {
        await updatePromotion({ id: editId, ...payload }).unwrap();
        toast.success("Promotion updated");
      } else {
        await createPromotion(payload).unwrap();
        toast.success("Promotion created as draft");
      }
      setShowForm(false);
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save");
    }
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    const scope = publishTarget.zoneScopeMode || "all";
    const zones = parseJson(publishTarget.zoneIds, []) || [];
    if (scope !== "all" && !zones.length) {
      toast.error("This draft has no zones saved. Open Edit → Geography, select zones, then Save on Review before publishing.");
      return;
    }
    try {
      const res = await publishPromotion({ id: publishTarget.id }).unwrap();
      toast.success(res?.data?.status === "scheduled" ? "Promotion scheduled" : "Promotion published & active");
      setPublishTarget(null);
    } catch (err) { toast.error(err?.data?.message || "Publish failed"); }
  };
  const handlePause = async (id) => {
    try {
      await pausePromotion({ id }).unwrap();
      toast.success("Promotion paused");
    } catch (err) { toast.error(err?.data?.message || "Pause failed"); }
  };
  const handleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await archivePromotion({ id: archiveTarget.id }).unwrap();
      toast.success("Promotion archived");
      setArchiveTarget(null);
    } catch (err) { toast.error(err?.data?.message || "Archive failed"); }
  };
  const handleClone = async (id) => {
    try {
      await clonePromotion(id).unwrap();
      toast.success("Promotion cloned as draft");
    } catch (err) { toast.error(err?.data?.message || "Clone failed"); }
  };

  /* ─── Table ──────────────────────────────────────────────────────────────── */

  const columns = [
    {
      key: "promotion",
      header: "Promotion",
      render: (row) => <DirectoryIdentity name={row.name} meta={benefitLabel(row.benefitType)} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryDotPill tone={STATUS_TONES[row.status] || "neutral"}>{statusLabel(row.status)}</DirectoryDotPill>,
    },
    { key: "discount", header: "Discount", render: (row) => valueLabel(row) },
    {
      key: "activation",
      header: "Activation",
      render: (row) => (row.activationType === "coupon_required" ? "Coupon" : "Auto"),
    },
    {
      key: "usage",
      header: "Usage",
      render: (row) => (row.globalUsageLimit
        ? `${row.globalUsedCount || 0} / ${row.globalUsageLimit}`
        : `${row.globalUsedCount || 0} used`),
    },
    { key: "coupons", header: "Coupons", render: (row) => row.couponCodes?.length || 0 },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow(row)} />
          <DirectoryActionIcon title="Report" onClick={() => setReportRow(row)}>
            <TbChartBar size={16} className="text-blue-600" />
          </DirectoryActionIcon>
          {canEdit(row.status) && (
            <DirectoryActionEdit onClick={() => openEdit(row)} disabled={editLoadingId === row.id} />
          )}
          {canPublish(row.status) && (
            <DirectoryActionIcon title="Publish" onClick={() => setPublishTarget(row)}>
              <TbPlayerPlay size={16} className="text-green-600" />
            </DirectoryActionIcon>
          )}
          {canPause(row.status) && (
            <DirectoryActionIcon title="Pause" onClick={() => handlePause(row.id)}>
              <TbPlayerPause size={16} className="text-yellow-600" />
            </DirectoryActionIcon>
          )}
          <DirectoryActionIcon title="Clone" onClick={() => handleClone(row.id)}>
            <TbCopy size={16} />
          </DirectoryActionIcon>
          {canArchive(row.status) && (
            <DirectoryActionIcon tone="danger" title="Archive" onClick={() => setArchiveTarget(row)}>
              <TbArchive size={16} />
            </DirectoryActionIcon>
          )}
        </DirectoryActions>
      ),
    },
  ];

  /* ─── Wizard Steps ───────────────────────────────────────────────────────── */

  const mode = effectiveMode(form);
  const itemScope = ITEM_SCOPE_TYPES.includes(form.benefitType);
  const capVisible = showsCap(form);
  // Item, category and service discounts measure spend / quantity on their own items only.
  const offerItemsOnly = ITEM_SCOPE_TYPES.includes(form.benefitType);
  const perCustomerLock = lockedPerCustomerLimit(form);
  const mainValueText = form.discountValue === "" ? "" : mode === "percent" ? `${form.discountValue}%` : money(form.discountValue);
  const overrideZones = zones.filter((z) => overrideAllowed(form, String(z.id ?? z._id)));

  const setOverrideZones = (ids) => setField(
    "zoneOverrides",
    ids.map((zoneId) => form.zoneOverrides.find((o) => o.zoneId === zoneId)
      || { zoneId, discountValue: "", maxDiscountCap: "", minSubtotal: "" })
  );
  const patchOverride = (zoneId, k, v) => setField(
    "zoneOverrides",
    form.zoneOverrides.map((o) => (o.zoneId === zoneId ? { ...o, [k]: v } : o))
  );

  const renderTargetPicker = () => {
    const kind = form.targetType;
    const labels = { service: "service(s)", category: "categor(y/ies)", subCategory: "item(s)", addon: "add-on(s)" };
    return (
      <div className="space-y-4">
        {TARGET_TYPE_CHOICE.includes(form.benefitType) && (
          <Field label="Apply to *" hint={form.benefitType === "bundle" ? "Pieces of everything you select here count together towards the deal" : undefined}>
            <Select
              options={ITEM_TARGET_TYPES}
              value={form.targetType}
              onChange={(v) => setForm((prev) => ({ ...prev, targetType: v, targetIds: [] }))}
            />
          </Field>
        )}
        {kind !== "all" && catalogOptions[kind] && (
          <Field label={`Select ${labels[kind]} *`}>
            <CatalogMultiSelect
              options={catalogOptions[kind]}
              selectedIds={form.targetIds}
              onChange={(ids) => setField("targetIds", ids)}
              placeholder={`Select one or more ${labels[kind]}…`}
            />
          </Field>
        )}
      </div>
    );
  };

  const renderStep = () => {
    switch (wizardStep) {
      case 0: // Benefit
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbDiscount className="text-blue-600" size={18} /> Promotion Benefit
              </div>
              <Field label="Promotion Name *" hint="Customers see this name on their offers and order">
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. First Order 20% Off" />
              </Field>
              <Field label="Description" hint="Optional. A short note on what the offer is for">
                <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Campaign" hint="Optional. Groups promotions under one budget and one report">
                  <Select options={campaignOptions} value={form.campaignId} onChange={(v) => setField("campaignId", v)} />
                </Field>
                <Field label="Activation" hint="Automatic: applies by itself. Coupon: the customer must enter a code when booking">
                  <Select options={ACTIVATION_TYPES} value={form.activationType} onChange={setActivationType} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Benefit Type *"
                  hint={typeLocked ? "Fixed once published, because orders may already hold this offer. Create a new promotion for a different type." : "Decides which settings the next steps ask for"}
                >
                  <Select options={benefitTypeOptions(form.benefitType)} value={form.benefitType} onChange={setBenefitType} disabled={typeLocked} />
                </Field>
                {MODE_CHOICE_TYPES.includes(form.benefitType) && (
                  <Field label="Discount Mode *">
                    <Select options={DISCOUNT_MODES} value={form.discountMode} onChange={(v) => setField("discountMode", v)} />
                  </Field>
                )}
              </div>
              {DELIVERY_TYPES.includes(form.benefitType) && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Delivery is free today, so there is no delivery fee to discount. This promotion will save £0
                  until a delivery fee is added. It never discounts the service fee.
                </p>
              )}
              {form.benefitType === "cashback" && (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Cashback does not lower this order's price. It is worked out on the final invoice and added to the
                  customer's credit after delivery (once paid). The credit is used automatically on their next order.
                  Campaign budget counts the cashback.
                </p>
              )}
              {form.benefitType === "bundle" && (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  Example: 10 shirts for £25 when one shirt is £2.90. Every full group of the chosen pieces costs the
                  price below; pieces left over pay the normal price (12 shirts = £25 + 2 × £2.90). Pieces of all the
                  chosen items count together, and if their prices differ the cheapest are grouped first. A group never
                  costs more than its normal price. Worked out on the final invoice.
                </p>
              )}
              {form.benefitType === "bundle" && (
                <Field label="Pieces in the deal *" hint="How many pieces make one group, e.g. 10 for “10 shirts for £25”">
                  <Input type="number" min="2" max="1000" step="1" value={form.bundleQuantity} onChange={(e) => setField("bundleQuantity", e.target.value)} placeholder="e.g. 10" />
                </Field>
              )}
              {needsValue(form.benefitType) && (
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label={valueFieldLabel(form)}
                    hint={form.benefitType === "fixed_price" ? "Qualifying basket is sold for this price"
                      : form.benefitType === "bundle" ? `What ${bundleSize(form) || "these"} pieces cost together`
                      : mode === "percent" ? "1 – 100"
                      : ITEM_SCOPE_TYPES.includes(form.benefitType) ? "Taken off every matching item (each piece), not off the order. For a set amount in total, also fill Max Discount Cap."
                      : undefined}
                  >
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={mode === "percent" ? "100" : undefined}
                      value={form.discountValue}
                      onChange={(e) => setField("discountValue", e.target.value)}
                      placeholder={mode === "percent" ? "e.g. 20" : form.benefitType === "bundle" ? "e.g. 25.00" : "e.g. 5.00"}
                    />
                  </Field>
                  {capVisible && (
                    <Field label={form.benefitType === "cashback" ? "Max Cashback (£)" : "Max Discount Cap (£)"} hint={form.benefitType === "cashback" ? "Most cashback one order can earn" : form.benefitType === "bundle" ? "Optional. Most this deal takes off one order in total, however many groups it has" : ITEM_SCOPE_TYPES.includes(form.benefitType) && mode === "amount" ? "Most this promotion takes off one order in total. Example: £30 here with £30 off each item gives £30 off these items altogether." : "Caps the whole promotion's saving"}>
                      <Input type="number" min="0" step="0.01" value={form.maxDiscountCap} onChange={(e) => setField("maxDiscountCap", e.target.value)} placeholder="No cap" />
                    </Field>
                  )}
                </div>
              )}
              {form.benefitType === "first_x_orders_discount" && (
                <Field label="First N orders *" hint="Applies to each customer's first N orders. Also sets how many times a customer can use it.">
                  <Input type="number" min="1" step="1" value={form.firstOrders} onChange={(e) => setField("firstOrders", e.target.value)} placeholder="e.g. 3" />
                </Field>
              )}
            </div>
            {itemScope && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                  <TbTarget className="text-blue-600" size={18} /> Targets
                </div>
                {renderTargetPicker()}
              </div>
            )}
          </div>
        );

      case 1: // Geography
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbMapPin className="text-green-600" size={18} /> Zone Targeting
              </div>
              <Field label="Zone Scope" hint="Decided by the zone of the customer's collection address">
                <Select options={ZONE_SCOPES} value={form.zoneScopeMode} onChange={(v) => setField("zoneScopeMode", v)} />
              </Field>
              {form.zoneScopeMode !== "all" && (
                <Field label={form.zoneScopeMode === "excluded" ? "Exclude Zones *" : "Select Zones *"}>
                  <ZoneMultiSelect
                    zones={zones}
                    selectedIds={form.zoneIds}
                    onChange={(ids) => setField("zoneIds", ids)}
                  />
                </Field>
              )}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbMapPin className="text-teal-600" size={18} /> Zone Overrides
              </div>
              <p className="text-xs text-gray-500">
                Optional. Pick a zone only if it needs different numbers from the main settings; every other zone uses
                the main settings. The zone is the one of the customer&apos;s collection address. Blank fields use the main settings.
              </p>
              <ZoneMultiSelect
                zones={overrideZones}
                selectedIds={form.zoneOverrides.map((o) => o.zoneId).filter((id) => overrideAllowed(form, id))}
                onChange={setOverrideZones}
              />
              {form.zoneOverrides.filter((o) => overrideAllowed(form, o.zoneId)).map((o) => (
                <div key={o.zoneId} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div className="text-sm font-medium text-gray-900">{zoneName(o.zoneId)}</div>
                  <div className="grid grid-cols-3 gap-3">
                    {needsValue(form.benefitType) && (
                      <Field
                        label={form.benefitType === "fixed_price" ? "Basket price (£)" : form.benefitType === "bundle" ? "Group price (£)" : mode === "percent" ? "Value (%)" : "Value (£)"}
                        hint={`${form.benefitType === "fixed_price" ? "Basket price" : form.benefitType === "bundle" ? `Price of ${bundleSize(form) || "N"} pieces` : "Discount"} for orders in this zone. Blank = main value${mainValueText ? ` (${mainValueText})` : ""}`}
                      >
                        <Input type="number" min="0" step="0.01" value={o.discountValue} onChange={(e) => patchOverride(o.zoneId, "discountValue", e.target.value)} placeholder={form.discountValue || "Default"} />
                      </Field>
                    )}
                    {capVisible && (
                      <Field label="Cap (£)" hint={`Most this promotion can save on one order in this zone. Blank = main cap (${form.maxDiscountCap ? money(form.maxDiscountCap) : "no cap"})`}>
                        <Input type="number" min="0" step="0.01" value={o.maxDiscountCap} onChange={(e) => patchOverride(o.zoneId, "maxDiscountCap", e.target.value)} placeholder={form.maxDiscountCap || "Default"} />
                      </Field>
                    )}
                    <Field label="Min subtotal (£)" hint={`Laundry total the invoice must reach in this zone. Blank = main minimum (${form.minSubtotal ? money(form.minSubtotal) : "none"})`}>
                      <Input type="number" min="0" step="0.01" value={o.minSubtotal} onChange={(e) => patchOverride(o.zoneId, "minSubtotal", e.target.value)} placeholder={form.minSubtotal || "Default"} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbEye className="text-purple-600" size={18} /> Visibility
              </div>
              <Field label="Customer Visibility" hint="Whether customers see the offer listed in the app before they order">
                <Select
                  options={VISIBILITY_OPTIONS.filter((o) => o.value === form.visibility || visibilityOffered(o.value, form))}
                  value={form.visibility}
                  onChange={(v) => setField("visibility", v)}
                />
              </Field>
              {form.visibility === "hidden" && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Hidden never appears in customer/agent Offers. Automatic discounts can still apply at invoice, but the apps show “Special discount” only after a hold exists — use Public if you want customers to see the offer name.
                </p>
              )}
              <p className="text-xs text-gray-500">
                Money applies when the shop invoices laundry (not at booking create). Basket min/max and min items are checked on the invoice subtotal.
              </p>
            </div>
          </div>
        );

      case 2: // Audience (Conditions)
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbUsers className="text-orange-600" size={18} /> Eligibility Conditions
              </div>
              {FIRST_ORDER_TYPES.includes(form.benefitType) ? (
                <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  {form.benefitType === "first_order_discount"
                    ? "This type already goes only to customers placing their first order, so no customer rule is needed here."
                    : `This type already goes only to a customer's first ${isPosInt(form.firstOrders) ? form.firstOrders : "N"} orders, so no customer rule is needed here.`}{" "}
                  Add a condition only to narrow it further (payment method, collection day, what is in the basket).
                </p>
              ) : (
                <p className="text-xs text-gray-500">Optional. Zones, basket minimums, days and times, and coupon codes each have their own step, so they are not repeated here.</p>
              )}
              <p className="text-xs text-gray-500">&quot;Must match&quot; conditions all apply (AND); at least one &quot;Any of&quot; condition must match (OR).</p>
              <PromotionConditionBuilder
                conditions={form.conditions}
                onChange={(v) => setField("conditions", v)}
                zones={zones}
                catalogOptions={catalogOptions}
                hidden={(type) => conditionHidden(type, form.benefitType)}
              />
              {basketScopeWarning(form.benefitType, form.conditions) ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {basketScopeWarning(form.benefitType, form.conditions)}
                </p>
              ) : null}
            </div>
            {form.activationType === "coupon_required" && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                  <TbDiscount className="text-blue-600" size={18} /> Coupon Codes *
                </div>
                <CouponCodesBuilder
                  codes={form.couponCodes}
                  onChange={(v) => setField("couponCodes", v)}
                  onDuplicate={(code) => toast.error(`Code ${code} is already added`)}
                />
              </div>
            )}
          </div>
        );

      case 3: // Limits
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbShoppingCart className="text-red-600" size={18} /> Usage Limits
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Total Uses (all customers)" hint="The promotion stops after this many uses. Blank = unlimited">
                  <Input type="number" min="1" value={form.globalUsageLimit} onChange={(e) => setField("globalUsageLimit", e.target.value)} placeholder="Unlimited" />
                </Field>
                {perCustomerLock ? (
                  <Field label="Uses per Customer" hint={perCustomerLock.reason}>
                    <Input type="text" value={perCustomerLock.value || "—"} readOnly disabled aria-readonly="true" />
                  </Field>
                ) : (
                  <Field label="Uses per Customer" hint="How many orders one customer can use it on. Blank = unlimited">
                    <Input type="number" min="1" value={form.perCustomerLimit} onChange={(e) => setField("perCustomerLimit", e.target.value)} placeholder="Unlimited" />
                  </Field>
                )}
                {showsPeriodLimits(form.benefitType) && (
                  <>
                    <Field label="Per Customer, per Day" hint="Most uses by one customer in 24 hours">
                      <Input type="number" min="1" value={form.perDayLimit} onChange={(e) => setField("perDayLimit", e.target.value)} placeholder="Unlimited" />
                    </Field>
                    <Field label="Per Customer, per Week" hint="Most uses by one customer in 7 days">
                      <Input type="number" min="1" value={form.perWeekLimit} onChange={(e) => setField("perWeekLimit", e.target.value)} placeholder="Unlimited" />
                    </Field>
                  </>
                )}
              </div>
              {firstOrderLimitNote(form) ? (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {firstOrderLimitNote(form)}
                </p>
              ) : null}
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbShoppingCart className="text-blue-600" size={18} /> Basket Requirements
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Minimum Subtotal (£)" hint={offerItemsOnly ? "The selected items on the final invoice must come to at least this; other services do not count. Blank = no minimum" : "The laundry total on the final invoice must reach this. Blank = no minimum"}>
                  <Input type="number" min="0" step="0.01" value={form.minSubtotal} onChange={(e) => setField("minSubtotal", e.target.value)} placeholder="No minimum" />
                </Field>
                <Field label="Maximum Subtotal (£)" hint={offerItemsOnly ? "No offer when the selected items come to more than this; other services do not count. Blank = no maximum" : "No offer when the laundry total is above this. Blank = no maximum"}>
                  <Input type="number" min="0" step="0.01" value={form.maxSubtotal} onChange={(e) => setField("maxSubtotal", e.target.value)} placeholder="No maximum" />
                </Field>
                <Field label="Minimum Quantity" hint={offerItemsOnly ? "Fewest selected items on the invoice; items from other services do not count. Blank = no minimum" : "Fewest items on the invoice, add-ons included. Blank = no minimum"}>
                  <Input type="number" min="1" value={form.minQuantity} onChange={(e) => setField("minQuantity", e.target.value)} placeholder="No minimum" />
                </Field>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbDiscount className="text-indigo-600" size={18} /> Priority & Stacking
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Priority (higher wins)" hint="0 – 1000. When two offers cannot be combined, the higher number is used. Same number: the older promotion wins">
                  <Input type="number" step="1" value={form.priority} onChange={(e) => setField("priority", e.target.value)} placeholder="50" />
                </Field>
                <Field label="Stackable" hint="Off: if another order discount also qualifies, only the higher-priority one applies. On: it is added to other discounts that also allow combining">
                  <div className="pt-2">
                    <Toggle checked={form.stackable} onChange={(e) => setField("stackable", e.target.checked)} label="Can combine with other promotions" />
                  </div>
                </Field>
              </div>
              {form.stackable && (
                <Field label="Stack Group" hint="Promotions in the same group never combine with each other">
                  <Input value={form.stackGroup} onChange={(e) => setField("stackGroup", e.target.value)} placeholder="e.g. delivery" maxLength={50} />
                </Field>
              )}
            </div>
            <p className="text-xs text-gray-500">
              The discount is always worked out again on the shop&apos;s final invoice, until that invoice is paid.
            </p>
          </div>
        );

      case 4: // Schedule
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbCalendarEvent className="text-indigo-600" size={18} /> Schedule
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Start Date" hint="UK time. Blank = starts when published">
                  <Input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
                </Field>
                <Field label="End Date" hint="Runs to the end of this day, UK time. Blank = no end">
                  <Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setField("endDate", e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbCalendarEvent className="text-teal-600" size={18} /> Recurring Window
              </div>
              <p className="text-xs text-gray-500">Optional — only active on these days / times (UK time). Overnight windows like 22:00 → 02:00 are allowed.</p>
              <Field label="Days" hint="The day the booking is placed, not the collection day. None selected = every day">
                <DayPicker value={form.recurringDays} onChange={(v) => setField("recurringDays", v)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="From" hint="Time the booking is placed. Blank = all day">
                  <Input type="time" value={form.recurringStartTime} onChange={(e) => setField("recurringStartTime", e.target.value)} />
                </Field>
                <Field label="To" hint="Set both From and To, or leave both blank">
                  <Input type="time" value={form.recurringEndTime} onChange={(e) => setField("recurringEndTime", e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <Field label="Internal Notes">
                <Textarea value={form.internalNotes} onChange={(e) => setField("internalNotes", e.target.value)} rows={2} placeholder="Only visible to admin..." />
              </Field>
            </div>
          </div>
        );

      case 5: { // Review
        const days = WEEKDAYS.filter((d) => form.recurringDays.includes(d.value)).map((d) => d.label).join(", ");
        const timeWindow = form.recurringStartTime && form.recurringEndTime ? `${form.recurringStartTime}–${form.recurringEndTime}` : "";
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Review Promotion</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Name:</span> <strong>{form.name || "—"}</strong></div>
                <div><span className="text-gray-500">Type:</span> <strong>{benefitLabel(form.benefitType)}</strong></div>
                <div><span className="text-gray-500">Value:</span> <strong>{valueLabel(form)}</strong></div>
                {form.benefitType === "first_x_orders_discount" && (
                  <div><span className="text-gray-500">Orders:</span> <strong>First {form.firstOrders}</strong></div>
                )}
                {itemScope && (
                  <div><span className="text-gray-500">Targets:</span> <strong>{form.targetType === "all" ? "All items" : `${form.targetIds.length} selected`}</strong></div>
                )}
                <div><span className="text-gray-500">Zone:</span> <strong>{form.zoneScopeMode === "all" ? "All Zones" : `${form.zoneScopeMode === "excluded" ? "All except " : ""}${form.zoneIds.length} zones`}</strong></div>
                <div><span className="text-gray-500">Zone overrides:</span> <strong>{form.zoneOverrides.filter((o) => overrideAllowed(form, o.zoneId)).length}</strong></div>
                <div><span className="text-gray-500">Activation:</span> <strong>{form.activationType === "automatic" ? "Auto" : "Coupon"}</strong></div>
                <div><span className="text-gray-500">Coupons:</span> <strong>{form.couponCodes.length} codes</strong></div>
                <div><span className="text-gray-500">Conditions:</span> <strong>{form.conditions.length} rules</strong></div>
                <div><span className="text-gray-500">Global Limit:</span> <strong>{form.globalUsageLimit || "∞"}</strong></div>
                <div><span className="text-gray-500">Per Customer:</span> <strong>{(perCustomerLock?.value ?? form.perCustomerLimit) || "∞"}{perCustomerLock ? " (set by type)" : ""}</strong></div>
                <div><span className="text-gray-500">Subtotal:</span> <strong>{form.minSubtotal ? `£${form.minSubtotal}` : "£0"} – {form.maxSubtotal ? `£${form.maxSubtotal}` : "∞"}</strong></div>
                <div><span className="text-gray-500">Priority:</span> <strong>{form.priority === "" ? 50 : form.priority}{form.stackable ? " · stackable" : ""}</strong></div>
                <div><span className="text-gray-500">Dates:</span> <strong>{form.startDate || "∞"} — {form.endDate || "∞"}</strong></div>
                <div><span className="text-gray-500">Recurring:</span> <strong>{[days, timeWindow].filter(Boolean).join(" ") || "Always"}</strong></div>
              </div>
            </div>
          </div>
        );
      }

      default: return null;
    }
  };

  return (
    <>
      <PageHeader
        title="Promotions"
        description="Enterprise promotion engine — create, publish, pause, simulate"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowSimulate(true)}>
              <TbFlask size={18} /> Simulate
            </Button>
            <Button onClick={openCreate}>
              <TbPlus size={18} /> New Promotion
            </Button>
          </>
        }
      />

      <DirectoryToolbar>
        <DirectoryToolSelect>
          <Select
            aria-label="Promotion status"
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v ?? ""); setPage(1); }}
            placeholder="All statuses"
          />
        </DirectoryToolSelect>
        <DirectoryToolbarEnd>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {totalCount} promotion{totalCount !== 1 ? "s" : ""}
          </span>
        </DirectoryToolbarEnd>
      </DirectoryToolbar>

      <DirectoryTableWrap>
        <Table
          columns={columns}
          rows={promotions}
          rowKey={(row) => row.id}
          empty={isLoading ? "Loading…" : "No promotions yet — create your first!"}
        />
      </DirectoryTableWrap>

      <PaginationBar page={page} limit={20} total={totalCount} onPageChange={setPage} />

      {/* ─── Wizard Modal ─────────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? "Edit Promotion" : "New Promotion"} size="xl" hideFooter closeOnBackdrop={false}>
        <div className="p-4">
          <StepIndicator step={wizardStep} onSelect={(i) => (i <= wizardStep ? setWizardStep(i) : goToStep(i))} />
          <PromotionSummaryBar parts={promotionSummary(form, zoneName)} />
          {renderStep()}
          <div className="flex justify-between mt-6">
            <Button variant="secondary" onClick={() => (wizardStep > 0 ? setWizardStep(wizardStep - 1) : setShowForm(false))}>
              {wizardStep > 0 ? "← Back" : "Cancel"}
            </Button>
            <div className="flex gap-2">
              {wizardStep < STEPS.length - 1 ? (
                <Button onClick={() => goToStep(wizardStep + 1)}>Next →</Button>
              ) : (
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : editId ? "Update Promotion" : "Create as Draft"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── View Modal ───────────────────────────────────────── */}
      <DirectoryViewModal open={!!viewRow} onClose={() => setViewRow(null)} title={viewRow?.name || "Promotion"} size="md">
        {viewRow && <PromotionViewBody promotion={viewRow} />}
      </DirectoryViewModal>

      {/* ─── Publish Confirm ──────────────────────────────────── */}
      <Modal
        open={!!publishTarget}
        onClose={() => setPublishTarget(null)}
        title="Publish promotion?"
        primaryLabel={publishing ? "Publishing…" : "Publish"}
        onPrimary={handlePublish}
        primaryDisabled={publishing}
      >
        <p style={{ fontSize: 14, color: "#374151" }}>
          <strong>&ldquo;{publishTarget?.name}&rdquo;</strong> ({publishTarget && valueLabel(publishTarget)}){" "}
          {publishTarget?.startDate && dayjs(publishTarget.startDate).isAfter(dayjs())
            ? `will start applying to new orders on ${dayjs(promotionDay(publishTarget, "start")).format("DD MMM YYYY")} (UK time).`
            : "will go live now and start applying to new orders."}
        </p>
      </Modal>

      {/* ─── Archive Confirm ──────────────────────────────────── */}
      <Modal
        open={!!archiveTarget}
        onClose={() => setArchiveTarget(null)}
        title="Archive promotion?"
        primaryLabel={archiving ? "Archiving…" : "Archive"}
        onPrimary={handleArchive}
        primaryDisabled={archiving}
        danger
      >
        <p style={{ fontSize: 14, color: "#374151" }}>
          <strong>&ldquo;{archiveTarget?.name}&rdquo;</strong> will stop applying to new orders. This cannot be undone — clone it to run it again.
        </p>
      </Modal>

      <PromotionSimulateModal open={showSimulate} onClose={() => setShowSimulate(false)} zones={zones} />
      <PromotionReportModal promotion={reportRow} onClose={() => setReportRow(null)} />
    </>
  );
}
