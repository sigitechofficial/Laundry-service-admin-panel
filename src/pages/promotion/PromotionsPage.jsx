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
  TbDiscount, TbTruck, TbShoppingCart, TbMapPin, TbUsers, TbCalendarEvent,
  TbPlayerPlay, TbPlayerPause, TbCopy, TbArchive, TbEye, TbFlask, TbTarget,
} from "react-icons/tb";
import ZoneMultiSelect from "./ZoneMultiSelect";
import CatalogMultiSelect from "./CatalogMultiSelect";
import PromotionConditionBuilder, { DayPicker } from "./PromotionConditionBuilder";
import PromotionSimulateModal from "./PromotionSimulateModal";
import { CONDITION_DEFS, WEEKDAYS, conditionError, serializeCondition } from "./promotionConditions";

/* ─── Constants ──────────────────────────────────────────────────────────── */

// buy_x_get_y and bundle are rejected by the backend for now — not offered.
const BENEFIT_TYPES = [
  { value: "percentage_discount", label: "Percentage Discount" },
  { value: "fixed_amount_discount", label: "Fixed Amount Discount" },
  { value: "free_delivery", label: "Free Delivery" },
  { value: "delivery_discount", label: "Delivery Discount" },
  { value: "basket_discount", label: "Basket Discount" },
  { value: "item_discount", label: "Item Discount" },
  { value: "category_discount", label: "Category Discount" },
  { value: "service_discount", label: "Service Discount" },
  { value: "first_order_discount", label: "First Order Discount" },
  { value: "first_x_orders_discount", label: "First X Orders Discount" },
  { value: "cashback", label: "Cashback" },
  { value: "fixed_price", label: "Fixed Price Offer" },
];

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
};
const MODE_CHOICE_TYPES = ["basket_discount", "item_discount", "category_discount", "service_discount", "cashback"];
const ITEM_SCOPE_TYPES = ["item_discount", "category_discount", "service_discount"];
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

const REPRICING_POLICIES = [
  { value: "recalculate", label: "Recalculate — reapply with final items" },
  { value: "revalidate", label: "Revalidate — keep if still qualifies" },
  { value: "lock", label: "Lock — preserve original benefit" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

const STATUS_TONES = {
  active: "success",
  scheduled: "teal",
  draft: "created",
  pending_approval: "warning",
  approved: "info",
  paused: "warning",
  expired: "danger",
  archived: "neutral",
};

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
const showsCap = (p) => effectiveMode(p) === "percent" || p.benefitType === "cashback";
const defaultTargetType = (bt) => {
  if (bt === "item_discount") return "subCategory";
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
  if (effectiveMode(p) === "percent") return `${n}%${cap}`;
  if (ITEM_SCOPE_TYPES.includes(p.benefitType)) return `${money(n)} off each`;
  return `${money(n)}${cap}`;
}

function valueFieldLabel(form) {
  const mode = effectiveMode(form);
  const bt = form.benefitType;
  if (bt === "fixed_price") return "Sell basket for (£) *";
  if (bt === "cashback") return mode === "percent" ? "Cashback (%) *" : "Cashback (£) *";
  if (mode === "percent") return "Discount (%) *";
  if (ITEM_SCOPE_TYPES.includes(bt)) return "£ off each item *";
  if (bt === "delivery_discount") return "£ off delivery *";
  if (bt === "basket_discount") return "£ off basket *";
  return "Discount (£) *";
}

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
  visibility: "hidden",
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
    startDate: p.startDate ? dayjs(p.startDate).format("YYYY-MM-DD") : "",
    endDate: p.endDate ? dayjs(p.endDate).format("YYYY-MM-DD") : "",
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
    benefitConfig: bt === "first_x_orders_discount" ? { firstOrders: Number(form.firstOrders) } : null,
    targetType,
    targetIds: itemScope && targetType !== "all" ? form.targetIds.map(Number) : null,
    zoneScopeMode: form.zoneScopeMode,
    zoneIds: form.zoneScopeMode !== "all" ? form.zoneIds.map(Number) : null,
    zoneOverrides: form.zoneOverrides
      .filter((zo) => overrideAllowed(form, zo.zoneId))
      .map((zo) => ({
        zoneId: Number(zo.zoneId),
        discountValue: needsValue(bt) ? numOrNull(zo.discountValue) : null,
        maxDiscountCap: cap ? numOrNull(zo.maxDiscountCap) : null,
        minSubtotal: numOrNull(zo.minSubtotal),
      })),
    startDate: form.startDate ? dayjs(form.startDate).startOf("day").toISOString() : null,
    // End of the chosen day, so the promotion runs through the whole end date.
    endDate: form.endDate ? dayjs(form.endDate).endOf("day").toISOString() : null,
    recurringDays: form.recurringDays.length ? [...form.recurringDays].sort((a, b) => a - b) : null,
    recurringStartTime: hasTimes ? form.recurringStartTime : null,
    recurringEndTime: hasTimes ? form.recurringEndTime : null,
    activationType: form.activationType,
    visibility: form.visibility,
    priority: form.priority === "" ? 50 : Number(form.priority),
    stackable: form.stackable,
    stackGroup: form.stackable && form.stackGroup.trim() ? form.stackGroup.trim() : null,
    globalUsageLimit: numOrNull(form.globalUsageLimit),
    perCustomerLimit: numOrNull(form.perCustomerLimit),
    perDayLimit: numOrNull(form.perDayLimit),
    perWeekLimit: numOrNull(form.perWeekLimit),
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
      }
      return null;
    }
    case 3: {
      const ints = [
        ["globalUsageLimit", "Global usage limit"], ["perCustomerLimit", "Per customer limit"],
        ["perDayLimit", "Per-day limit"], ["perWeekLimit", "Per-week limit"], ["minQuantity", "Minimum quantity"],
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

export default function PromotionsPage() {
  const toast = useToaster();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM());
  const [editId, setEditId] = useState(null);
  const [editLoadingId, setEditLoadingId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [publishTarget, setPublishTarget] = useState(null);
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
  }));

  const openCreate = () => { setForm(INITIAL_FORM()); setEditId(null); setWizardStep(0); setShowForm(true); };

  // Edit loads the full detail — list rows carry no conditions / overrides.
  const openEdit = async (row) => {
    setEditLoadingId(row.id);
    try {
      const res = await fetchPromotion(row.id).unwrap();
      const promo = res?.data ?? res;
      setForm(formFromPromotion(promo));
      setEditId(row.id);
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
        {form.benefitType === "item_discount" && (
          <Field label="Apply to *">
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
              <Field label="Promotion Name *">
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. First Order 20% Off" />
              </Field>
              <Field label="Description">
                <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Campaign">
                  <Select options={campaignOptions} value={form.campaignId} onChange={(v) => setField("campaignId", v)} />
                </Field>
                <Field label="Activation">
                  <Select options={ACTIVATION_TYPES} value={form.activationType} onChange={(v) => setField("activationType", v)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Benefit Type *">
                  <Select options={benefitTypeOptions(form.benefitType)} value={form.benefitType} onChange={setBenefitType} />
                </Field>
                {MODE_CHOICE_TYPES.includes(form.benefitType) && (
                  <Field label="Discount Mode *">
                    <Select options={DISCOUNT_MODES} value={form.discountMode} onChange={(v) => setField("discountMode", v)} />
                  </Field>
                )}
              </div>
              {needsValue(form.benefitType) && (
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label={valueFieldLabel(form)}
                    hint={form.benefitType === "fixed_price" ? "Qualifying basket is sold for this price" : mode === "percent" ? "1 – 100" : undefined}
                  >
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      max={mode === "percent" ? "100" : undefined}
                      value={form.discountValue}
                      onChange={(e) => setField("discountValue", e.target.value)}
                      placeholder={mode === "percent" ? "e.g. 20" : "e.g. 5.00"}
                    />
                  </Field>
                  {capVisible && (
                    <Field label="Max Discount Cap (£)" hint="Caps the whole promotion's saving">
                      <Input type="number" min="0" step="0.01" value={form.maxDiscountCap} onChange={(e) => setField("maxDiscountCap", e.target.value)} placeholder="No cap" />
                    </Field>
                  )}
                </div>
              )}
              {form.benefitType === "first_x_orders_discount" && (
                <Field label="First N orders *" hint="Applies to each customer's first N orders">
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
              <Field label="Zone Scope">
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
              <p className="text-xs text-gray-500">Optional per-zone value, cap or minimum subtotal. Blank fields use the main settings.</p>
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
                      <Field label={form.benefitType === "fixed_price" ? "Basket price (£)" : mode === "percent" ? "Value (%)" : "Value (£)"}>
                        <Input type="number" min="0" step="0.01" value={o.discountValue} onChange={(e) => patchOverride(o.zoneId, "discountValue", e.target.value)} placeholder={form.discountValue || "Default"} />
                      </Field>
                    )}
                    {capVisible && (
                      <Field label="Cap (£)">
                        <Input type="number" min="0" step="0.01" value={o.maxDiscountCap} onChange={(e) => patchOverride(o.zoneId, "maxDiscountCap", e.target.value)} placeholder={form.maxDiscountCap || "Default"} />
                      </Field>
                    )}
                    <Field label="Min subtotal (£)">
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
              <Field label="Customer Visibility">
                <Select options={VISIBILITY_OPTIONS} value={form.visibility} onChange={(v) => setField("visibility", v)} />
              </Field>
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
              <p className="text-xs text-gray-500">&quot;Must match&quot; conditions all apply (AND); at least one &quot;Any of&quot; condition must match (OR).</p>
              <PromotionConditionBuilder
                conditions={form.conditions}
                onChange={(v) => setField("conditions", v)}
                zones={zones}
                catalogOptions={catalogOptions}
              />
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
                <Field label="Global Usage Limit">
                  <Input type="number" min="1" value={form.globalUsageLimit} onChange={(e) => setField("globalUsageLimit", e.target.value)} placeholder="Unlimited" />
                </Field>
                <Field label="Per Customer Limit">
                  <Input type="number" min="1" value={form.perCustomerLimit} onChange={(e) => setField("perCustomerLimit", e.target.value)} placeholder="Unlimited" />
                </Field>
                <Field label="Per-day Limit">
                  <Input type="number" min="1" value={form.perDayLimit} onChange={(e) => setField("perDayLimit", e.target.value)} placeholder="Unlimited" />
                </Field>
                <Field label="Per-week Limit">
                  <Input type="number" min="1" value={form.perWeekLimit} onChange={(e) => setField("perWeekLimit", e.target.value)} placeholder="Unlimited" />
                </Field>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbShoppingCart className="text-blue-600" size={18} /> Basket Requirements
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Minimum Subtotal (£)">
                  <Input type="number" min="0" step="0.01" value={form.minSubtotal} onChange={(e) => setField("minSubtotal", e.target.value)} placeholder="No minimum" />
                </Field>
                <Field label="Maximum Subtotal (£)">
                  <Input type="number" min="0" step="0.01" value={form.maxSubtotal} onChange={(e) => setField("maxSubtotal", e.target.value)} placeholder="No maximum" />
                </Field>
                <Field label="Minimum Quantity">
                  <Input type="number" min="1" value={form.minQuantity} onChange={(e) => setField("minQuantity", e.target.value)} placeholder="No minimum" />
                </Field>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbDiscount className="text-indigo-600" size={18} /> Priority & Stacking
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Priority (higher wins)">
                  <Input type="number" step="1" value={form.priority} onChange={(e) => setField("priority", e.target.value)} placeholder="50" />
                </Field>
                <Field label="Stackable">
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
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbTruck className="text-teal-600" size={18} /> Repricing Policy
              </div>
              <p className="text-xs text-gray-500">What happens when laundry items change after pickup?</p>
              <Select options={REPRICING_POLICIES} value={form.repricingPolicy} onChange={(v) => setField("repricingPolicy", v)} />
            </div>
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
                <Field label="Start Date" hint="Blank = starts when published">
                  <Input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
                </Field>
                <Field label="End Date" hint="Runs to the end of this day. Blank = no end">
                  <Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setField("endDate", e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbCalendarEvent className="text-teal-600" size={18} /> Recurring Window
              </div>
              <p className="text-xs text-gray-500">Optional — only active on these days / times (zone local time). Overnight windows like 22:00 → 02:00 are allowed.</p>
              <Field label="Days">
                <DayPicker value={form.recurringDays} onChange={(v) => setField("recurringDays", v)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="From">
                  <Input type="time" value={form.recurringStartTime} onChange={(e) => setField("recurringStartTime", e.target.value)} />
                </Field>
                <Field label="To">
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
                <div><span className="text-gray-500">Per Customer:</span> <strong>{form.perCustomerLimit || "∞"}</strong></div>
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
      <DirectoryViewModal open={!!viewRow} onClose={() => setViewRow(null)} title={viewRow?.name || "Promotion"}>
        {viewRow && (
          <div className="space-y-4">
            <DirectoryMetrics
              items={[
                { label: "Status", value: statusLabel(viewRow.status) },
                { label: "Value", value: valueLabel(viewRow) },
                { label: "Used", value: viewRow.globalUsedCount || 0, hint: `Limit ${viewRow.globalUsageLimit || "∞"}` },
                { label: "Coupons", value: viewRow.couponCodes?.length || 0 },
              ]}
            />
            <DirectoryViewFields
              fields={[
                { label: "Benefit", value: benefitLabel(viewRow.benefitType) },
                { label: "Zone scope", value: viewRow.zoneScopeMode === "all" ? "All zones" : `${viewRow.zoneScopeMode} · ${(parseJson(viewRow.zoneIds, []) || []).length} zones` },
                { label: "Activation", value: viewRow.activationType === "coupon_required" ? "Coupon" : "Auto" },
                { label: "Priority", value: viewRow.priority },
                { label: "Stackable", value: viewRow.stackable ? `Yes${viewRow.stackGroup ? ` (${viewRow.stackGroup})` : ""}` : "No" },
                { label: "Per customer", value: viewRow.perCustomerLimit ?? "∞" },
                { label: "Start", value: viewRow.startDate ? dayjs(viewRow.startDate).format("DD MMM YYYY HH:mm") : "—" },
                { label: "End", value: viewRow.endDate ? dayjs(viewRow.endDate).format("DD MMM YYYY HH:mm") : "—" },
              ]}
            />
          </div>
        )}
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
            ? `will start applying to new orders on ${dayjs(String(publishTarget.startDate).slice(0, 10)).format("DD MMM YYYY")}.`
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
    </>
  );
}
