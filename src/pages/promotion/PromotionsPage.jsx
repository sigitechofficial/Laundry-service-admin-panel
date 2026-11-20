import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useSearchParams } from "react-router-dom";
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
import QuickOfferForm from "./QuickOfferForm";
import TimeInput24 from "./TimeInput24";
import LiveOfferEditModal from "./LiveOfferEditModal";
import {
  DELIVERY_TYPES, FORCED_MODE, INITIAL_FORM, ITEM_SCOPE_TYPES, MODE_CHOICE_TYPES, STEPS, TARGET_TYPE_CHOICE,
  buildPayload, defaultTargetType, effectiveMode, formFromPromotion, isPosInt, needsValue, overrideAllowed,
  parseJson, promotionDay, showsCap, validateStep,
} from "./promotionForm.js";
import BulkDealsEditor, {
  dealsSummary, useServiceItemCatalog,
} from "./BulkDealsEditor";
import { WEEKDAYS } from "./promotionConditions";
import { BENEFIT_HELP, BENEFIT_TYPES, STATUS_OPTIONS, STATUS_TONES } from "./promotionLabels";
import {
  CLOSED_CAMPAIGN_STATUSES, LIVE_PROMOTION_STATUSES, campaignStatusLabel, campaignStopReason, stopReasonText,
  isOwnBudget, budgetTakenMinor,
} from "./campaignState";
import {
  FIRST_ORDER_TYPES, basketScopeWarning, bundleSize, conditionHidden, firstOrderLimitNote,
  firstOrderRule, isTypeLocked, lockedPerCustomerLimit, showsPeriodLimits, visibilityOffered,
} from "./promotionTypeRules";

/* ─── Constants ──────────────────────────────────────────────────────────── */


// Same as basket_discount in % / £ mode — kept for labels and existing promotions,
// but not offered when picking a type (unless the promotion already uses it).
const RETIRED_BENEFIT_TYPES = ["percentage_discount", "fixed_amount_discount"];
const benefitTypeOptions = (current) =>
  BENEFIT_TYPES.filter((b) => !RETIRED_BENEFIT_TYPES.includes(b.value) || b.value === current);


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


const money = (n) => `£${Number(n).toFixed(2)}`;

/** What the offer is on, for the list ("2 services", "5 items"); null for the whole order. */
function onLabel(p) {
  const n = (parseJson(p.targetIds, []) || []).length;
  const kind = { service: ["service", "services"], category: ["category", "categories"], subCategory: ["item", "items"], addon: ["add-on", "add-ons"] }[p.targetType];
  if (!kind) return p.targetType === "all" ? "all items" : null;
  return `on ${n} ${n === 1 ? kind[0] : kind[1]}`;
}

/** Who gets the offer, in a few words, for the list. */
function whoLabel(p) {
  const conds = Array.isArray(p.conditions) ? p.conditions : [];
  const firstOrder = FIRST_ORDER_TYPES.includes(p.benefitType) || conds.some((c) => c.conditionType === "FIRST_ORDER");
  const codes = (p.couponCodes || []).filter((c) => c.isActive !== false).map((c) => c.code);
  if (p.activationType === "coupon_required") return codes.length === 1 ? `Code ${codes[0]}` : `${codes.length} codes`;
  const who = firstOrder ? "First order" : "Everyone";
  // "Only if the order includes…" offers say so in the list.
  const needsItems = conds.some((c) => ["PRODUCT", "SERVICE", "CATEGORY", "ADDON"].includes(c.conditionType));
  return needsItems ? `${who} · only with chosen items` : who;
}

/** Human value for table / review / view — % vs £ per discountMode. */
function valueLabel(p) {
  if (p.benefitType === "free_delivery") return "Free delivery";
  if (p.discountValue === "" || p.discountValue == null) return "—";
  const n = Number(p.discountValue);
  if (p.benefitType === "fixed_price") return `Basket for ${money(n)}`;
  const cap = showsCap(p) && p.maxDiscountCap ? ` (max ${money(p.maxDiscountCap)})` : "";
  if (p.benefitType === "bundle") {
    // Several deals: "10 for £30.00 + 5 for £25.00"
    const deals = p.deals || parseJson(p.benefitConfig, {})?.deals;
    if (Array.isArray(deals) && deals.length) {
      const set = deals.filter((d) => Number(d.price) > 0);
      if (set.length) return set.map((d) => `${d.quantity ?? d.qty} for ${money(d.price)}`).join(" + ") + cap;
    }
    return `${bundleSize(p) || "N"} for ${money(n)}${cap}`;
  }
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


function extractList(response, ...keys) {
  const root = response?.data ?? response;
  for (const k of keys) {
    if (Array.isArray(root?.[k])) return root[k];
  }
  if (Array.isArray(root)) return root;
  return [];
}


const shortDay = (day) => dayjs(day).format("D MMM YYYY");

/**
 * The promotion in plain words, rebuilt as the admin types: what it gives, how it is
 * activated, where, when and how often. Shown on every wizard step.
 */
function promotionSummary(form, zoneName, catalogOptions = {}, dealsApi = null) {
  const bt = form.benefitType;
  const value = valueLabel(form);
  const valueSet = bt === "bundle"
    ? form.deals.some((d) => d.itemIds.length && Number(d.price) > 0)
    : !needsValue(bt) || Number(form.discountValue) > 0;
  const targetWord = { subCategory: "item", addon: "add-on", category: "category", service: "service" }[form.targetType] || "item";
  const picked = (catalogOptions[form.targetType] || [])
    .filter((o) => form.targetIds.map(String).includes(String(o.value)))
    .map((o) => o.label);
  const named = picked.length <= 3 ? picked.join(", ") : `${picked.slice(0, 3).join(", ")} +${picked.length - 3}`;
  const targets = form.targetType === "all"
    ? "all items"
    : named || `${form.targetIds.length || "no"} selected ${targetWord}${form.targetIds.length === 1 ? "" : "s"}`.replace("categorys", "categories");

  let what;
  if (!valueSet) what = `${benefitLabel(bt)} — value not set yet`;
  else if (bt === "first_order_discount") what = `New customers get ${value} off their first order`;
  else if (bt === "first_x_orders_discount") what = `Customers get ${value} off each of their first ${isPosInt(form.firstOrders) ? form.firstOrders : "N"} orders`;
  else if (bt === "free_delivery") what = "Free delivery";
  else if (bt === "delivery_discount") what = `${value} off the delivery fee`;
  else if (bt === "cashback") what = `${value} cashback, added to the customer's credit after delivery`;
  else if (bt === "fixed_price") what = value;
  else if (bt === "bundle") {
    what = (dealsApi && dealsSummary(form.deals, dealsApi)) || `${valueLabel(form)} bulk price`;
    if (Number(form.maxDiscountCap) > 0) what += ` At most ${money(form.maxDiscountCap)} off one order.`;
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
  // A row with no rule chosen yet does nothing, so it is not counted.
  const otherRules = form.conditions.filter((c) => c.conditionType && c.conditionType !== "FIRST_ORDER").length;
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


/* ─── Wizard Step Indicator ─────────────────────────────────────────────── */


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
              ? "bg-blue-600 text-white"
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
function PromotionViewBody({ promotion: p, campaign }) {
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
            {
              label: "Campaign",
              value: campaign
                ? `${campaign.name} · ${campaignStatusLabel(campaign.status)}${campaignStopReason(campaign) ? ` (${stopReasonText(campaignStopReason(campaign), campaign).toLowerCase()})` : ""}`
                : "None",
            },
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
            { label: "Stackable", value: p.stackable ? `Yes${p.stackGroup ? ` · group ${p.stackGroup}` : ""}` : "No — best single promotion" },
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
  const [statusFilter, setStatusFilter] = useState("active");
  const [campaignFilter, setCampaignFilter] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [showQuick, setShowQuick] = useState(false);
  // The full form was opened from Create promotion's "More options": it can go back there.
  const [fromQuick, setFromQuick] = useState(false);
  const [resumeQuick, setResumeQuick] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const [liveEdit, setLiveEdit] = useState(null);

  const { data, isLoading } = useGetPromotionsQuery({
    page, limit: 20, status: statusFilter || undefined, campaignId: campaignFilter || undefined,
  });
  const { data: campaignsData } = useGetCampaignsQuery({ limit: 200 });
  const campaignById = useMemo(
    () => new Map((campaignsData?.rows || []).map((c) => [String(c.id), c])),
    [campaignsData]
  );
  /** The promotion's campaign: from the row when the API includes it, else from the campaign list. */
  const campaignOf = useCallback(
    (p) => (p?.campaignId ? p.campaign || campaignById.get(String(p.campaignId)) || null : null),
    [campaignById]
  );
  /** Why new orders cannot use a live promotion because of its campaign, or null. */
  const campaignStop = useCallback((p) => {
    if (!p || !LIVE_PROMOTION_STATUSES.includes(p.status)) return null;
    if (p.campaignStopReason !== undefined) return p.campaignStopReason;
    return campaignStopReason(campaignOf(p));
  }, [campaignOf]);
  const { data: zonesData } = useGetAllZonesQuery();

  // Catalog lists feed the target picker and catalog conditions — only needed while the wizard is open.
  const { data: servicesResp } = useGetAllServicesQuery(undefined, { skip: !showForm });
  const { data: categoriesResp } = useGetCategoriesQuery(undefined, { skip: !showForm });
  const { data: subCatsResp } = useGetSubCategoriesQuery(undefined, { skip: !showForm });
  const { data: addonsResp } = useGetAllAddOnServicesQuery(undefined, { skip: !showForm });

  // Bulk deals pick services, then their items (with prices for "normally £X").
  const dealsApi = useServiceItemCatalog(showForm && form.benefitType === "bundle");

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
    { value: "", label: "None (own limits)" },
    ...(campaignsData?.rows || [])
      .filter((c) => !CLOSED_CAMPAIGN_STATUSES.includes(c.status) || String(c.id) === String(form.campaignId))
      .map((c) => ({ value: String(c.id), label: c.status === "active" ? c.name : `${c.name} (${campaignStatusLabel(c.status)})` })),
  ], [campaignsData, form.campaignId]);
  const campaignFilterOptions = useMemo(() => [
    { value: "", label: "All campaigns" },
    ...(campaignsData?.rows || []).map((c) => ({ value: String(c.id), label: c.name })),
  ], [campaignsData]);
  const formCampaign = form.campaignId ? campaignById.get(String(form.campaignId)) || null : null;
  const formCampaignStop = campaignStopReason(formCampaign);

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
    // Keep the admin's % / £ choice only between types that both offer it; a mode forced
    // by the previous type (e.g. £ for Delivery Discount) must not carry over.
    discountMode: MODE_CHOICE_TYPES.includes(bt)
      ? (MODE_CHOICE_TYPES.includes(prev.benefitType) && prev.discountMode) || "percent"
      : FORCED_MODE[bt] || "percent",
    targetType: defaultTargetType(bt),
    targetIds: [],
    visibility: visibilityOffered(prev.visibility, { ...prev, benefitType: bt }) ? prev.visibility : "public",
  }));

  // "Private — code only" has no meaning without a code; a new coupon offer starts private
  // (customers who have the code use it). The admin can still pick Public to list it.
  const setActivationType = (activationType) => setForm((prev) => {
    let visibility = visibilityOffered(prev.visibility, { ...prev, activationType }) ? prev.visibility : "public";
    if (activationType === "coupon_required" && prev.activationType !== "coupon_required" && visibility === "public") {
      visibility = "private_code";
    }
    return { ...prev, activationType, visibility };
  });

  // What the form looked like when it opened: closing asks first when anything changed.
  const openedFormRef = useRef("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const wizardTopRef = useRef(null);

  const openForm = (nextForm) => {
    openedFormRef.current = JSON.stringify(nextForm);
    setForm(nextForm);
    setConfirmDiscard(false);
    setWizardStep(0);
    setFromQuick(false);
    setShowForm(true);
  };
  const closeFormNow = () => {
    setConfirmDiscard(false);
    setShowForm(false);
  };
  // Back to the simple Create promotion form, with its answers as they were.
  const backToQuickNow = () => {
    setConfirmBack(false);
    setShowForm(false);
    setResumeQuick(true);
    setShowQuick(true);
  };
  const requestBackToQuick = () => {
    if (JSON.stringify(form) !== openedFormRef.current) setConfirmBack(true);
    else backToQuickNow();
  };
  // Escape, Cancel and the close paths all come here, so typed work is never lost by accident.
  const requestCloseForm = () => {
    if (JSON.stringify(form) !== openedFormRef.current) setConfirmDiscard(true);
    else closeFormNow();
  };

  // Every step starts at its top, not where the previous step was scrolled to.
  useEffect(() => {
    if (!showForm) return;
    wizardTopRef.current?.closest(".jd-modal__b")?.scrollTo({ top: 0 });
  }, [wizardStep, showForm]);

  const openCreate = (preset = {}) => {
    setEditId(null);
    setTypeLocked(false);
    openForm({ ...INITIAL_FORM(), ...preset });
  };

  // Links from the Campaigns page: add a promotion into a campaign, or open one.
  useEffect(() => {
    const wantsNew = searchParams.get("new") === "1";
    const viewId = searchParams.get("view");
    if (!wantsNew && !viewId) return;
    const next = new URLSearchParams(searchParams);
    next.delete("new");
    next.delete("campaign");
    next.delete("view");
    setSearchParams(next, { replace: true });
    if (wantsNew) {
      const campaignId = searchParams.get("campaign") || "";
      openCreate(campaignId ? { campaignId } : {});
      return;
    }
    fetchPromotion(Number(viewId)).unwrap()
      .then((res) => setViewRow(res?.data ?? res))
      .catch(() => toast.error("Promotion not found"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Edit loads the full detail — list rows carry no conditions / overrides.
  const openEdit = async (row) => {
    setEditLoadingId(row.id);
    try {
      const res = await fetchPromotion(row.id).unwrap();
      const promo = res?.data ?? res;
      setEditId(row.id);
      setTypeLocked(isTypeLocked(promo));
      openForm(formFromPromotion(promo));
    } catch (err) {
      toast.error(err?.data?.message || "Failed to load promotion");
    } finally {
      setEditLoadingId(null);
    }
  };

  // Live offer: change name, end date, limits and budget without pausing.
  const openLiveEdit = (row) => {
    const c = campaignOf(row);
    setLiveEdit({
      id: row.id,
      name: row.name,
      endDate: promotionDay(row, "end"),
      endTime: row.endTime && row.endTime !== "23:59" ? row.endTime : "",
      globalUsageLimit: row.globalUsageLimit,
      perCustomerLimit: row.perCustomerLimit,
      budget: c && isOwnBudget(c) && c.budgetMinor != null ? c.budgetMinor / 100 : "",
      sharedBudgetName: c && !isOwnBudget(c) ? c.name : null,
      taken: (row.globalUsedCount || 0) + (row.globalReservedCount || 0),
    });
  };

  // Moving forward validates every step in between.
  const goToStep = (target) => {
    for (let s = wizardStep; s < target; s += 1) {
      const err = validateStep(s, form, dealsApi.priceOf);
      if (err) {
        setWizardStep(s);
        toast.error(err);
        return;
      }
    }
    setWizardStep(target);
  };

  // Save; with goLive the promotion is published straight away (like Create promotion's "Save & go live").
  const handleSave = async (goLive = false) => {
    if (saving || publishing) return;
    for (let s = 0; s < STEPS.length - 1; s += 1) {
      const err = validateStep(s, form, dealsApi.priceOf);
      if (err) {
        setWizardStep(s);
        toast.error(err);
        return;
      }
    }
    try {
      const payload = buildPayload(form);
      let id = editId;
      if (editId) {
        await updatePromotion({ id: editId, ...payload }).unwrap();
      } else {
        const res = await createPromotion(payload).unwrap();
        id = (res?.data ?? res)?.id;
      }
      if (goLive && id) {
        const pub = await publishPromotion({ id }).unwrap();
        const scheduled = (pub?.data ?? pub)?.status === "scheduled";
        setStatusFilter(scheduled ? "scheduled" : "active");
        setPage(1);
        toast.success(scheduled ? `"${payload.name}" is scheduled` : `"${payload.name}" is live`);
      } else if (editId) {
        toast.success("Promotion updated");
      } else {
        // The list opens on Live, where a new draft would not be listed: show drafts.
        setStatusFilter("draft");
        setPage(1);
        toast.success(`"${payload.name}" saved as a draft`);
      }
      closeFormNow();
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
      const blockedBy = campaignStopReason(campaignOf(publishTarget));
      toast.success(
        blockedBy
          ? `Promotion published. It will not apply to orders until the campaign "${campaignOf(publishTarget)?.name}" runs.`
          : res?.data?.status === "scheduled" ? "Promotion scheduled" : "Promotion published & active"
      );
      setPublishTarget(null);
    } catch (err) { toast.error(err?.data?.message || "Publish failed"); }
  };
  const handlePause = async (id) => {
    try {
      await pausePromotion({ id }).unwrap();
      toast.success("Promotion paused — orders that already have it keep the discount");
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
      render: (row) => <DirectoryIdentity name={row.name} meta={[valueLabel(row), onLabel(row), whoLabel(row)].filter(Boolean).join(" · ")} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        // One status: a live offer its budget stops shows why, instead of "Live".
        const stop = campaignStop(row);
        return stop ? (
          <span title="New orders can't use it. Orders already booked keep the full discount.">
            <DirectoryDotPill tone="warning">{stopReasonText(stop, campaignOf(row))}</DirectoryDotPill>
          </span>
        ) : (
          <DirectoryDotPill tone={STATUS_TONES[row.status] || "neutral"}>{statusLabel(row.status)}</DirectoryDotPill>
        );
      },
    },
    {
      key: "budget",
      header: "Budget",
      render: (row) => {
        const c = campaignOf(row);
        if (!c) return <span className="text-gray-400">No limit</span>;
        if (!isOwnBudget(c)) return <span title="Campaign budget, shared with other promotions">Campaign · {c.name}</span>;
        return c.budgetMinor == null ? "No limit" : `£${(budgetTakenMinor(c) / 100).toFixed(2)} of £${(c.budgetMinor / 100).toFixed(2)}`;
      },
    },
    {
      key: "usage",
      header: "Orders",
      // Booked = holds the offer, not paid yet; paid = done. Both count towards Total orders.
      render: (row) => {
        const booked = row.globalReservedCount || 0;
        const paid = row.globalUsedCount || 0;
        return (
          <div className="flex flex-col">
            <span>{booked} booked · {paid} paid</span>
            {row.globalUsageLimit ? <span className="text-xs text-gray-500">of {row.globalUsageLimit} allowed</span> : null}
          </div>
        );
      },
    },
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
          {canPause(row.status) && (
            <DirectoryActionEdit onClick={() => openLiveEdit(row)} />
          )}
          {canPublish(row.status) && (
            <DirectoryActionIcon title="Publish" onClick={() => setPublishTarget(row)}>
              <TbPlayerPlay size={16} className="text-green-600" />
            </DirectoryActionIcon>
          )}
          {canPause(row.status) && (
            <DirectoryActionIcon title="Pause (stops new orders only)" onClick={() => handlePause(row.id)}>
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
              <Field label="Promotion Name *" hint="Customers see this name on their order">
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. First Order 20% Off" />
              </Field>
              <Field label="Description" hint="Optional. A short note on what the promotion is for">
                <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Campaign" hint="Optional. Only when several promotions share one budget, dates and on/off switch. For one promotion, use Budget on the Limits step">
                  <Select options={campaignOptions} value={form.campaignId} onChange={(v) => setField("campaignId", v ?? "")} />
                </Field>
                <Field label="Activation" hint="Automatic: applies by itself. Coupon: the customer must enter a code when booking">
                  <Select options={ACTIVATION_TYPES} value={form.activationType} onChange={setActivationType} />
                </Field>
              </div>
              {/* The codes sit right under the choice that needs them. */}
              {form.activationType === "coupon_required" && (
                <div className="rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                    <TbDiscount className="text-blue-600" size={18} /> Coupon Codes *
                  </div>
                  <p className="text-xs text-gray-500">Customers type one of these when booking. Letters are saved in capitals.</p>
                  <CouponCodesBuilder
                    codes={form.couponCodes}
                    onChange={(v) => setField("couponCodes", v)}
                    onDuplicate={(code) => toast.error(`Code ${code} is already added`)}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label="Benefit Type *"
                  hint={typeLocked
                    ? "Fixed once published, because orders may already hold this offer. Create a new promotion for a different type."
                    : BENEFIT_HELP[form.benefitType] || "Decides which settings the next steps ask for"}
                >
                  <Select options={benefitTypeOptions(form.benefitType)} value={form.benefitType} onChange={setBenefitType} disabled={typeLocked} />
                </Field>
                {MODE_CHOICE_TYPES.includes(form.benefitType) && (
                  <Field label="Discount Mode *">
                    <Select options={DISCOUNT_MODES} value={form.discountMode} onChange={(v) => setField("discountMode", v)} />
                  </Field>
                )}
              </div>
              {formCampaignStop && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {stopReasonText(formCampaignStop, formCampaign)}: this promotion will not run, even once published,
                  until the campaign &ldquo;{formCampaign?.name}&rdquo; runs
                  {formCampaign?.status === "draft" ? " (set the campaign to Active on the Campaigns page)" : ""}.
                </p>
              )}
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
                <>
                  <p className="text-xs text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    Example: 10 T-shirts for £30 when one is £4.50. Every full group costs the deal price; pieces left
                    over pay the normal price (12 T-shirts = £30 + 2 × £4.50). Each deal counts only its own items, and
                    the cheapest pieces are grouped first. Worked out on the final invoice.
                  </p>
                  <BulkDealsEditor deals={form.deals} onChange={(deals) => setField("deals", deals)} api={dealsApi} />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Max Discount Cap (£)" hint="Optional. Most these deals take off one order in total">
                      <Input type="number" min="0" step="0.01" value={form.maxDiscountCap} onChange={(e) => setField("maxDiscountCap", e.target.value)} placeholder="No cap" />
                    </Field>
                  </div>
                </>
              )}
              {needsValue(form.benefitType) && form.benefitType !== "bundle" && (
                <div className="grid grid-cols-2 gap-4">
                  <Field
                    label={valueFieldLabel(form)}
                    hint={form.benefitType === "fixed_price" ? "The customer pays this for the laundry (services and add-ons), whatever it would normally cost"
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
                  {form.benefitType === "fixed_price" && (
                    <Field
                      label="Only for laundry totals up to (£) *"
                      hint={
                        Number(form.maxSubtotal) > Number(form.discountValue) && Number(form.discountValue) > 0
                          ? `Biggest saving on one order: ${money(Number(form.maxSubtotal) - Number(form.discountValue))}. Larger orders get no promotion.`
                          : "Larger orders get no promotion. Same as “Laundry total up to” on the Limits step."
                      }
                    >
                      <Input type="number" min="0" step="0.01" value={form.maxSubtotal} onChange={(e) => setField("maxSubtotal", e.target.value)} placeholder="e.g. 40.00" />
                    </Field>
                  )}
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
            {itemScope && form.benefitType !== "bundle" && (
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
                    {needsValue(form.benefitType) && form.benefitType !== "bundle" && (
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
                    <Field label="Laundry total over (£)" hint={`Laundry total (service fee not included) the invoice must reach in this zone. Blank = main minimum (${form.minSubtotal ? money(form.minSubtotal) : "none"})`}>
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
                  Hidden promotions are not listed in the apps. An automatic one can still be given on the invoice, shown as
                  “Special discount”. Choose Public if customers should see its name before they order.
                </p>
              )}
              <p className="text-xs text-gray-500">
                The discount is worked out when the shop makes the invoice, not when the order is booked. Laundry totals and
                item counts are checked on that invoice.
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
                <p className="text-xs text-gray-500">Optional. Set elsewhere, so not repeated here: coupon codes (Benefit), zones (Geography), basket minimums (Limits), days and times (Schedule).</p>
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
                <Field label="Total orders" hint="Stops after this many orders, all customers together. Blank = no limit">
                  <Input type="number" min="1" value={form.globalUsageLimit} onChange={(e) => setField("globalUsageLimit", e.target.value)} placeholder="Unlimited" />
                </Field>
                <Field
                  label="Budget (£)"
                  hint={form.campaignId
                    ? "This promotion uses its campaign budget (step 1)"
                    : "Stops new orders when this much has been given away. Orders already booked keep the full discount. Blank = no limit"}
                >
                  <Input type="number" min="1" value={form.campaignId ? "" : form.budget} onChange={(e) => setField("budget", e.target.value)} placeholder={form.campaignId ? "Shared" : "No limit"} disabled={Boolean(form.campaignId)} />
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
                <Field label={offerItemsOnly ? "Selected items total over (£)" : "Laundry total over (£)"} hint={offerItemsOnly ? "The selected items on the final invoice must come to at least this; other services do not count. Service fee not included. Blank = no minimum" : "The laundry total on the final invoice must reach this. Service fee not included. Blank = no minimum"}>
                  <Input type="number" min="0" step="0.01" value={form.minSubtotal} onChange={(e) => setField("minSubtotal", e.target.value)} placeholder="No minimum" />
                </Field>
                <Field label={offerItemsOnly ? "Selected items total up to (£)" : "Laundry total up to (£)"} hint={offerItemsOnly ? "No offer when the selected items come to more than this; other services do not count. Blank = no maximum" : "No offer when the laundry total is above this. Blank = no maximum"}>
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
                <Field label="Priority" hint="0 – 1000. When promotions can't be combined, the customer gets the one that saves the most. Priority only breaks a tie (higher wins)">
                  <Input type="number" step="1" value={form.priority} onChange={(e) => setField("priority", e.target.value)} placeholder="50" />
                </Field>
                <Field label="Stackable" hint="Off: if another promotion also applies, the customer gets whichever saves more. On: it is added to other promotions that can also combine">
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
              <div className="grid grid-cols-4 gap-4">
                <Field label="Start Date" hint="UK time. Blank = starts when published">
                  <Input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
                </Field>
                <Field label="Start time" hint="24-hour. Blank = 00:00">
                  <TimeInput24 value={form.startTime} onChange={(v) => setField("startTime", v)} aria-label="Start time" disabled={!form.startDate} />
                </Field>
                <Field label="End Date" hint="UK time. Blank = no end">
                  <Input type="date" value={form.endDate} min={form.startDate || undefined} onChange={(e) => setField("endDate", e.target.value)} />
                </Field>
                <Field label="End time" hint="24-hour. Blank = 23:59">
                  <TimeInput24 value={form.endTime} onChange={(v) => setField("endTime", v)} aria-label="End time" disabled={!form.endDate} />
                </Field>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbCalendarEvent className="text-teal-600" size={18} /> Repeat on days / times
              </div>
              <p className="text-xs text-gray-500">Optional. Only works on these days and times (UK time), e.g. every Tuesday 09:00–12:00. Overnight like 22:00 → 02:00 is fine.</p>
              <Field label="Days" hint="The day the booking is placed, not the collection day. None selected = every day">
                <DayPicker value={form.recurringDays} onChange={(v) => setField("recurringDays", v)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="From" hint="Time the booking is placed (24-hour). Empty = all day">
                  <TimeInput24 value={form.recurringStartTime} onChange={(v) => setField("recurringStartTime", v)} aria-label="Repeat from" />
                </Field>
                <Field label="To" hint="Choose both From and To, or leave both empty">
                  <TimeInput24 value={form.recurringEndTime} onChange={(v) => setField("recurringEndTime", v)} aria-label="Repeat to" />
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
                {itemScope && form.benefitType !== "bundle" && (
                  <div><span className="text-gray-500">On:</span> <strong>{form.targetType === "all" ? "All items" : (catalogOptions[form.targetType] || []).filter((o) => form.targetIds.map(String).includes(o.value)).map((o) => o.label).join(", ") || `${form.targetIds.length} selected`}</strong></div>
                )}
                {form.benefitType === "bundle" && (
                  <div className="col-span-2"><span className="text-gray-500">Deals:</span> <strong>{dealsSummary(form.deals, dealsApi) || "—"}</strong></div>
                )}
                <div><span className="text-gray-500">Zone:</span> <strong>{form.zoneScopeMode === "all" ? "All Zones" : `${form.zoneScopeMode === "excluded" ? "All except " : ""}${form.zoneIds.length} zones`}</strong></div>
                <div><span className="text-gray-500">Zone overrides:</span> <strong>{form.zoneOverrides.filter((o) => overrideAllowed(form, o.zoneId)).length}</strong></div>
                <div><span className="text-gray-500">Activation:</span> <strong>{form.activationType === "automatic" ? "Auto" : "Coupon"}</strong></div>
                <div><span className="text-gray-500">Coupons:</span> <strong>{form.couponCodes.length} {form.couponCodes.length === 1 ? "code" : "codes"}</strong></div>
                <div><span className="text-gray-500">Audience rules:</span> <strong>{form.conditions.filter((c) => c.conditionType).length || "None"}</strong></div>
                <div><span className="text-gray-500">Total orders:</span> <strong>{form.globalUsageLimit || "No limit"}</strong></div>
                <div><span className="text-gray-500">Budget:</span> <strong>{form.campaignId ? "Campaign budget" : form.budget ? `£${form.budget}` : "No limit"}</strong></div>
                <div><span className="text-gray-500">Per customer:</span> <strong>{(perCustomerLock?.value ?? form.perCustomerLimit) || "No limit"}{perCustomerLock ? " (set by type)" : ""}</strong></div>
                <div><span className="text-gray-500">Laundry total:</span> <strong>{[form.minSubtotal ? `over £${form.minSubtotal}` : "", form.maxSubtotal ? `up to £${form.maxSubtotal}` : ""].filter(Boolean).join(", ") || "Any"}</strong></div>
                {showsPeriodLimits(form.benefitType) && (
                  <div><span className="text-gray-500">Per customer, per day / week:</span> <strong>{form.perDayLimit || "No limit"} / {form.perWeekLimit || "No limit"}</strong></div>
                )}
                <div><span className="text-gray-500">Minimum items:</span> <strong>{form.minQuantity || "None"}</strong></div>
                <div><span className="text-gray-500">Priority:</span> <strong>{form.priority === "" ? 50 : form.priority}</strong></div>
                <div><span className="text-gray-500">Combines with other promotions:</span> <strong>{form.stackable ? "Yes" : "No, the best saving is used"}</strong></div>
                <div><span className="text-gray-500">Visibility:</span> <strong>{labelOf(VISIBILITY_OPTIONS, form.visibility)}</strong></div>
                <div><span className="text-gray-500">Campaign:</span> <strong>{form.campaignId ? campaignOptions.find((c) => c.value === String(form.campaignId))?.label || "Selected" : "None"}</strong></div>
                <div><span className="text-gray-500">Dates (UK):</span> <strong>{form.startDate ? `${shortDay(form.startDate)} ${form.startTime || "00:00"}` : "When published"} — {form.endDate ? `${shortDay(form.endDate)} ${form.endTime || "23:59"}` : "No end"}</strong></div>
                <div><span className="text-gray-500">Repeat:</span> <strong>{[days, timeWindow].filter(Boolean).join(" ") || "Every day, all day"}</strong></div>
                {form.description?.trim() ? (
                  <div className="col-span-2"><span className="text-gray-500">Description:</span> <strong>{form.description.trim()}</strong></div>
                ) : null}
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
        description="Discounts customers get on their orders"
        actions={
          <>
            <Button variant="secondary" onClick={() => setShowSimulate(true)}>
              <TbFlask size={18} /> Simulate
            </Button>
            {campaignFilter ? (
              <Button variant="secondary" onClick={() => openCreate({ campaignId: campaignFilter })}>
                <TbPlus size={18} /> Add to this campaign
              </Button>
            ) : null}
            <Button onClick={() => { setResumeQuick(false); setShowQuick(true); }}>
              <TbPlus size={18} /> Create promotion
            </Button>
          </>
        }
      />
      <LiveOfferEditModal offer={liveEdit} onClose={() => setLiveEdit(null)} />
      <QuickOfferForm
        open={showQuick}
        resume={resumeQuick}
        onClose={() => setShowQuick(false)}
        onSaved={(status) => {
          setShowQuick(false);
          setStatusFilter(status === "draft" ? "draft" : status);
          setPage(1);
        }}
        onMoreOptions={(preset) => {
          setShowQuick(false);
          openCreate(preset);
          setFromQuick(true);
        }}
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
        <DirectoryToolSelect>
          <Select
            aria-label="Campaign"
            options={campaignFilterOptions}
            value={campaignFilter}
            onChange={(v) => { setCampaignFilter(v ?? ""); setPage(1); }}
            placeholder="All campaigns"
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
      <Modal open={showForm} onClose={requestCloseForm} title={editId ? "Edit promotion" : "Create promotion"} size="xl" hideFooter closeOnBackdrop={false}>
        <div className="p-4" ref={wizardTopRef}>
          <StepIndicator step={wizardStep} onSelect={(i) => (i <= wizardStep ? setWizardStep(i) : goToStep(i))} />
          <PromotionSummaryBar parts={promotionSummary(form, zoneName, catalogOptions, dealsApi)} />
          {renderStep()}
          <div className="flex justify-between mt-6">
            <Button
              variant="secondary"
              onClick={() => (wizardStep > 0 ? setWizardStep(wizardStep - 1) : fromQuick ? requestBackToQuick() : requestCloseForm())}
            >
              {wizardStep > 0 ? "← Back" : fromQuick ? "← Back to simple form" : "Cancel"}
            </Button>
            <div className="flex gap-2">
              {wizardStep < STEPS.length - 1 ? (
                <Button onClick={() => goToStep(wizardStep + 1)}>Next →</Button>
              ) : (
                <>
                  <Button variant="secondary" onClick={() => handleSave(false)} disabled={saving || publishing}>
                    {editId ? "Save changes" : "Save as draft"}
                  </Button>
                  <Button onClick={() => handleSave(true)} disabled={saving || publishing}>
                    {saving || publishing ? "Saving…" : "Save & go live"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── Discard Confirm ──────────────────────────────────── */}
      <Modal
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        title="Discard changes?"
        secondaryLabel="Keep editing"
        primaryLabel="Discard"
        onPrimary={closeFormNow}
        danger
      >
        <p style={{ fontSize: 14, color: "#374151" }}>
          {editId
            ? "Your changes to this promotion have not been saved."
            : "This promotion has not been saved yet."}{" "}
          If you close now, what you entered is lost.
        </p>
      </Modal>

      {/* ─── Back to the simple form: changes made here are not carried back ─── */}
      <Modal
        open={confirmBack}
        onClose={() => setConfirmBack(false)}
        title="Go back to the simple form?"
        secondaryLabel="Stay here"
        primaryLabel="Go back"
        onPrimary={backToQuickNow}
      >
        <p style={{ fontSize: 14, color: "#374151" }}>
          Your answers in the simple form are kept. Changes you made on this screen are not carried back.
        </p>
      </Modal>

      {/* ─── View Modal ───────────────────────────────────────── */}
      <DirectoryViewModal open={!!viewRow} onClose={() => setViewRow(null)} title={viewRow?.name || "Promotion"} size="md">
        {viewRow && <PromotionViewBody promotion={viewRow} campaign={campaignOf(viewRow)} />}
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
          {publishTarget && campaignStopReason(campaignOf(publishTarget))
            ? "will be published, but will not apply to orders yet."
            : publishTarget?.startDate && dayjs(publishTarget.startDate).isAfter(dayjs())
            ? `will start applying to new orders on ${dayjs(promotionDay(publishTarget, "start")).format("DD MMM YYYY")} (UK time).`
            : "will go live now and start applying to new orders."}
        </p>
        {publishTarget && campaignStopReason(campaignOf(publishTarget)) ? (
          <p className="mt-3 mb-0 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {stopReasonText(campaignStopReason(campaignOf(publishTarget)), campaignOf(publishTarget))}: it will not apply to orders
            until the campaign &ldquo;{campaignOf(publishTarget)?.name}&rdquo; runs.
          </p>
        ) : null}
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
          <strong>&ldquo;{archiveTarget?.name}&rdquo;</strong> will stop applying to new orders. Orders that already have it keep the discount. This cannot be undone — clone it to run it again.
        </p>
      </Modal>

      <PromotionSimulateModal open={showSimulate} onClose={() => setShowSimulate(false)} zones={zones} />
      <PromotionReportModal promotion={reportRow} onClose={() => setReportRow(null)} />
    </>
  );
}
