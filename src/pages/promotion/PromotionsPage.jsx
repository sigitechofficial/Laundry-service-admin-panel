import { useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  Button, Field, Input, Modal, PageHeader, Select, Table, Textarea,
} from "../../design-system";
import { PaginationBar, Toggle } from "../misc-kit";
import {
  DirectoryActions, DirectoryActionEdit, DirectoryActionView,
  DirectoryDotPill, DirectoryIdentity, DirectoryMetrics, DirectoryMetric,
  DirectoryTableWrap, DirectoryToolbar, DirectoryToolbarEnd,
  DirectoryToolSelect, DirectoryViewModal,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import {
  useGetPromotionsQuery, useCreatePromotionMutation, useUpdatePromotionMutation,
  usePublishPromotionMutation, usePausePromotionMutation, useArchivePromotionMutation,
  useClonePromotionMutation, useGetCampaignsQuery, useGetAllZonesQuery,
} from "../../store/services/api";
import { TbPlus } from "../../shared/icons/index";
import {
  TbDiscount2, TbPercentage, TbTruck, TbShoppingCart,
  TbMapPin, TbUsers, TbCalendarEvent, TbPlayerPlay, TbPlayerPause,
  TbCopy, TbArchive, TbEye, TbSettings,
} from "react-icons/tb";
import { formatDate } from "../../utilities/formatters";
import ZoneMultiSelect from "./ZoneMultiSelect";

/* ─── Constants ──────────────────────────────────────────────────────────── */

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

const TARGET_TYPES = [
  { value: "basket", label: "Whole Basket" },
  { value: "all", label: "All Items" },
  { value: "service", label: "Specific Service(s)" },
  { value: "category", label: "Specific Category(ies)" },
  { value: "subCategory", label: "Specific Item(s)" },
  { value: "addon", label: "Specific Add-on(s)" },
  { value: "delivery", label: "Delivery" },
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
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

const CONDITION_TYPES = [
  { value: "FIRST_ORDER", label: "First Order Only" },
  { value: "MINIMUM_SUBTOTAL", label: "Minimum Subtotal" },
  { value: "MAXIMUM_SUBTOTAL", label: "Maximum Subtotal" },
  { value: "MINIMUM_QUANTITY", label: "Minimum Quantity" },
  { value: "CUSTOMER_TYPE", label: "Customer Type" },
  { value: "COLLECTION_DAY", label: "Collection Day" },
  { value: "DELIVERY_DAY", label: "Delivery Day" },
  { value: "PAYMENT_METHOD", label: "Payment Method" },
  { value: "ORDER_COUNT", label: "Order Count" },
];

const statusColor = (s) => {
  switch (s) {
    case "active": return "green";
    case "paused": return "yellow";
    case "draft": return "blue";
    case "expired": return "red";
    case "archived": return "gray";
    case "pending_approval": return "orange";
    case "approved": return "purple";
    default: return "gray";
  }
};

const benefitLabel = (type) => BENEFIT_TYPES.find((b) => b.value === type)?.label || type;

const INITIAL_FORM = () => ({
  name: "",
  description: "",
  internalNotes: "",
  campaignId: "",
  benefitType: "percentage_discount",
  discountValue: "",
  maxDiscountCap: "",
  targetType: "basket",
  targetIds: [],
  zoneScopeMode: "all",
  zoneIds: [],
  startDate: "",
  endDate: "",
  activationType: "automatic",
  visibility: "hidden",
  priority: "50",
  stackable: false,
  globalUsageLimit: "",
  perCustomerLimit: "1",
  minSubtotal: "",
  repricingPolicy: "recalculate",
  conditions: [],
  couponCodes: [],
});

/* ─── Wizard Step Indicator ─────────────────────────────────────────────── */

const STEPS = ["Benefit", "Geography", "Audience", "Limits", "Schedule", "Review"];

function StepIndicator({ step, setStep }) {
  return (
    <div className="flex gap-1 mb-6">
      {STEPS.map((label, i) => (
        <button
          key={label}
          onClick={() => setStep(i)}
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

/* ─── Condition Builder ─────────────────────────────────────────────────── */

function ConditionBuilder({ conditions, onChange }) {
  const add = () => onChange([...conditions, { conditionType: "FIRST_ORDER", operator: "equals", value: true }]);
  const remove = (idx) => onChange(conditions.filter((_, i) => i !== idx));
  const update = (idx, field, val) => {
    const next = [...conditions];
    next[idx] = { ...next[idx], [field]: val };
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {conditions.map((c, i) => (
        <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg p-3">
          <Select
            className="flex-1"
            options={CONDITION_TYPES}
            value={c.conditionType}
            onChange={(v) => update(i, "conditionType", v)}
          />
          {["MINIMUM_SUBTOTAL", "MAXIMUM_SUBTOTAL", "MINIMUM_QUANTITY", "ORDER_COUNT"].includes(c.conditionType) && (
            <Input
              className="w-28"
              type="number"
              value={c.value || ""}
              onChange={(e) => update(i, "value", e.target.value)}
              placeholder="Value"
            />
          )}
          <button onClick={() => remove(i)} className="text-red-500 hover:text-red-700 text-sm font-medium px-2">✕</button>
        </div>
      ))}
      <button onClick={add} className="text-blue-600 text-sm font-medium hover:text-blue-800">
        + Add Condition
      </button>
    </div>
  );
}

/* ─── Coupon Codes Builder ──────────────────────────────────────────────── */

function CouponCodesBuilder({ codes, onChange }) {
  const [newCode, setNewCode] = useState("");
  const add = () => {
    if (!newCode.trim()) return;
    onChange([...codes, { code: newCode.trim().toUpperCase(), codeType: "shared" }]);
    setNewCode("");
  };
  const remove = (idx) => onChange(codes.filter((_, i) => i !== idx));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Enter coupon code" className="flex-1" />
        <Button variant="outline" onClick={add}>Add</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {codes.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1.5 rounded-full">
            {c.code}
            <button onClick={() => remove(i)} className="hover:text-red-600 ml-1">✕</button>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function PromotionsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [form, setForm] = useState(INITIAL_FORM());
  const [editId, setEditId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const { toastSuccess, toastError, Toaster } = useToaster();

  const { data, isLoading } = useGetPromotionsQuery({ page, limit: 20, status: statusFilter || undefined });
  const { data: campaignsData } = useGetCampaignsQuery({ limit: 200 });
  const { data: zonesData } = useGetAllZonesQuery();

  const [createPromotion, { isLoading: creating }] = useCreatePromotionMutation();
  const [updatePromotion, { isLoading: updating }] = useUpdatePromotionMutation();
  const [publishPromotion] = usePublishPromotionMutation();
  const [pausePromotion] = usePausePromotionMutation();
  const [archivePromotion] = useArchivePromotionMutation();
  const [clonePromotion] = useClonePromotionMutation();

  const promotions = data?.rows || [];
  const totalCount = data?.count || 0;
  const campaigns = campaignsData?.rows || [];
  const zones = zonesData?.data || zonesData || [];

  const campaignOptions = useMemo(() => [
    { value: "", label: "No Campaign" },
    ...campaigns.map((c) => ({ value: String(c.id), label: c.name })),
  ], [campaigns]);

  const setField = useCallback((k, v) => setForm((prev) => ({ ...prev, [k]: v })), []);

  const openCreate = () => { setForm(INITIAL_FORM()); setEditId(null); setWizardStep(0); setShowForm(true); };
  const openEdit = (row) => {
    setForm({
      name: row.name || "",
      description: row.description || "",
      internalNotes: row.internalNotes || "",
      campaignId: row.campaignId ? String(row.campaignId) : "",
      benefitType: row.benefitType || "percentage_discount",
      discountValue: row.discountValue ? String(row.discountValue) : "",
      maxDiscountCap: row.maxDiscountCap ? String(row.maxDiscountCap) : "",
      targetType: row.targetType || "basket",
      targetIds: row.targetIds || [],
      zoneScopeMode: row.zoneScopeMode || "all",
      zoneIds: row.zoneIds || [],
      startDate: row.startDate ? dayjs(row.startDate).format("YYYY-MM-DD") : "",
      endDate: row.endDate ? dayjs(row.endDate).format("YYYY-MM-DD") : "",
      activationType: row.activationType || "automatic",
      visibility: row.visibility || "hidden",
      priority: row.priority ? String(row.priority) : "50",
      stackable: row.stackable || false,
      globalUsageLimit: row.globalUsageLimit ? String(row.globalUsageLimit) : "",
      perCustomerLimit: row.perCustomerLimit ? String(row.perCustomerLimit) : "1",
      minSubtotal: row.minSubtotal ? String(row.minSubtotal) : "",
      repricingPolicy: row.repricingPolicy || "recalculate",
      conditions: row.conditions || [],
      couponCodes: row.couponCodes?.map((c) => ({ code: c.code, codeType: c.codeType })) || [],
    });
    setEditId(row.id);
    setWizardStep(0);
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        campaignId: form.campaignId ? Number(form.campaignId) : null,
        discountValue: form.discountValue ? Number(form.discountValue) : null,
        maxDiscountCap: form.maxDiscountCap ? Number(form.maxDiscountCap) : null,
        priority: Number(form.priority) || 50,
        globalUsageLimit: form.globalUsageLimit ? Number(form.globalUsageLimit) : null,
        perCustomerLimit: form.perCustomerLimit ? Number(form.perCustomerLimit) : null,
        minSubtotal: form.minSubtotal ? Number(form.minSubtotal) : null,
        zoneIds: form.zoneScopeMode !== "all" ? form.zoneIds : null,
      };
      if (editId) {
        await updatePromotion({ id: editId, ...payload }).unwrap();
        toastSuccess("Promotion updated");
      } else {
        await createPromotion(payload).unwrap();
        toastSuccess("Promotion created");
      }
      setShowForm(false);
    } catch (err) {
      toastError(err?.data?.message || "Failed to save");
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishPromotion({ id }).unwrap();
      toastSuccess("Promotion published & active");
    } catch (err) { toastError(err?.data?.message || "Publish failed"); }
  };
  const handlePause = async (id) => {
    try {
      await pausePromotion({ id }).unwrap();
      toastSuccess("Promotion paused");
    } catch (err) { toastError(err?.data?.message || "Pause failed"); }
  };
  const handleArchive = async (id) => {
    if (!window.confirm("Archive this promotion?")) return;
    try {
      await archivePromotion({ id }).unwrap();
      toastSuccess("Promotion archived");
    } catch (err) { toastError(err?.data?.message || "Archive failed"); }
  };
  const handleClone = async (id) => {
    try {
      await clonePromotion(id).unwrap();
      toastSuccess("Promotion cloned as draft");
    } catch (err) { toastError(err?.data?.message || "Clone failed"); }
  };

  /* ─── Table ──────────────────────────────────────────────────────────────── */

  const columns = useMemo(() => [
    {
      header: "Promotion",
      cell: (row) => (
        <DirectoryIdentity
          name={row.name}
          subtitle={benefitLabel(row.benefitType)}
        />
      ),
    },
    {
      header: "Status",
      cell: (row) => <DirectoryDotPill color={statusColor(row.status)} label={row.status} />,
    },
    {
      header: "Discount",
      cell: (row) => {
        if (!row.discountValue) return "—";
        if (row.benefitType?.includes("percentage")) return `${row.discountValue}%`;
        return `£${Number(row.discountValue).toFixed(2)}`;
      },
    },
    {
      header: "Activation",
      cell: (row) => row.activationType === "coupon_required" ? "Coupon" : "Auto",
    },
    {
      header: "Usage",
      cell: (row) => {
        if (!row.globalUsageLimit) return `${row.globalUsedCount || 0} used`;
        return `${row.globalUsedCount || 0} / ${row.globalUsageLimit}`;
      },
    },
    {
      header: "Coupons",
      cell: (row) => row.couponCodes?.length || 0,
    },
    {
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-1">
          <button onClick={() => setViewRow(row)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="View">
            <TbEye size={16} className="text-gray-500" />
          </button>
          <button onClick={() => openEdit(row)} className="p-1.5 hover:bg-gray-100 rounded-lg" title="Edit">
            <TbSettings size={16} className="text-gray-500" />
          </button>
          {(row.status === "draft" || row.status === "paused") && (
            <button onClick={() => handlePublish(row.id)} className="p-1.5 hover:bg-green-50 rounded-lg" title="Publish">
              <TbPlayerPlay size={16} className="text-green-600" />
            </button>
          )}
          {row.status === "active" && (
            <button onClick={() => handlePause(row.id)} className="p-1.5 hover:bg-yellow-50 rounded-lg" title="Pause">
              <TbPlayerPause size={16} className="text-yellow-600" />
            </button>
          )}
          <button onClick={() => handleClone(row.id)} className="p-1.5 hover:bg-blue-50 rounded-lg" title="Clone">
            <TbCopy size={16} className="text-blue-500" />
          </button>
          <button onClick={() => handleArchive(row.id)} className="p-1.5 hover:bg-red-50 rounded-lg" title="Archive">
            <TbArchive size={16} className="text-red-400" />
          </button>
        </div>
      ),
    },
  ], []);

  /* ─── Wizard Steps ───────────────────────────────────────────────────────── */

  const renderStep = () => {
    switch (wizardStep) {
      case 0: // Benefit
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                <TbDiscount2 className="text-blue-600" size={18} /> Promotion Benefit
              </div>
              <Field label="Promotion Name *">
                <Input value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="e.g. First Order 20% Off" />
              </Field>
              <Field label="Description">
                <Textarea value={form.description} onChange={(e) => setField("description", e.target.value)} rows={2} />
              </Field>
              <Field label="Campaign">
                <Select options={campaignOptions} value={form.campaignId} onChange={(v) => setField("campaignId", v)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Benefit Type *">
                  <Select options={BENEFIT_TYPES} value={form.benefitType} onChange={(v) => setField("benefitType", v)} />
                </Field>
                <Field label="Discount Value *">
                  <Input
                    type="number"
                    value={form.discountValue}
                    onChange={(e) => setField("discountValue", e.target.value)}
                    placeholder={form.benefitType?.includes("percentage") ? "e.g. 20" : "e.g. 5.00"}
                  />
                </Field>
              </div>
              {form.benefitType?.includes("percentage") && (
                <Field label="Max Discount Cap (£)">
                  <Input type="number" value={form.maxDiscountCap} onChange={(e) => setField("maxDiscountCap", e.target.value)} placeholder="e.g. 15.00" />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Target Type">
                  <Select options={TARGET_TYPES} value={form.targetType} onChange={(v) => setField("targetType", v)} />
                </Field>
                <Field label="Activation">
                  <Select options={ACTIVATION_TYPES} value={form.activationType} onChange={(v) => setField("activationType", v)} />
                </Field>
              </div>
            </div>
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
                <Field label={form.zoneScopeMode === "excluded" ? "Exclude Zones" : "Select Zones"}>
                  <ZoneMultiSelect
                    zones={Array.isArray(zones) ? zones : []}
                    selectedIds={form.zoneIds || []}
                    onChange={(ids) => setField("zoneIds", ids)}
                  />
                </Field>
              )}
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
              <p className="text-xs text-gray-500">All conditions must be met (AND logic). Add conditions to restrict who can use this promotion.</p>
              <ConditionBuilder conditions={form.conditions} onChange={(v) => setField("conditions", v)} />
            </div>
            {form.activationType === "coupon_required" && (
              <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center gap-2 text-gray-900 font-semibold text-sm">
                  <TbDiscount2 className="text-blue-600" size={18} /> Coupon Codes
                </div>
                <CouponCodesBuilder codes={form.couponCodes} onChange={(v) => setField("couponCodes", v)} />
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
                  <Input type="number" value={form.globalUsageLimit} onChange={(e) => setField("globalUsageLimit", e.target.value)} placeholder="Unlimited" />
                </Field>
                <Field label="Per Customer Limit">
                  <Input type="number" value={form.perCustomerLimit} onChange={(e) => setField("perCustomerLimit", e.target.value)} placeholder="1" />
                </Field>
              </div>
              <Field label="Minimum Subtotal (£)">
                <Input type="number" value={form.minSubtotal} onChange={(e) => setField("minSubtotal", e.target.value)} placeholder="No minimum" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Priority (higher = first)">
                  <Input type="number" value={form.priority} onChange={(e) => setField("priority", e.target.value)} placeholder="50" />
                </Field>
                <Field label="Stackable">
                  <div className="pt-2">
                    <Toggle checked={form.stackable} onChange={(v) => setField("stackable", v)} label="Can combine with other promotions" />
                  </div>
                </Field>
              </div>
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
                <Field label="Start Date">
                  <Input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} />
                </Field>
                <Field label="End Date">
                  <Input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} />
                </Field>
              </div>
              <Field label="Internal Notes">
                <Textarea value={form.internalNotes} onChange={(e) => setField("internalNotes", e.target.value)} rows={2} placeholder="Only visible to admin..." />
              </Field>
            </div>
          </div>
        );

      case 5: // Review
        return (
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h3 className="font-semibold text-gray-900">Review Promotion</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Name:</span> <strong>{form.name || "—"}</strong></div>
                <div><span className="text-gray-500">Type:</span> <strong>{benefitLabel(form.benefitType)}</strong></div>
                <div><span className="text-gray-500">Value:</span> <strong>{form.discountValue || "—"}{form.benefitType?.includes("percentage") ? "%" : ""}</strong></div>
                <div><span className="text-gray-500">Cap:</span> <strong>{form.maxDiscountCap ? `£${form.maxDiscountCap}` : "None"}</strong></div>
                <div><span className="text-gray-500">Zone:</span> <strong>{form.zoneScopeMode === "all" ? "All Zones" : `${form.zoneIds?.length || 0} zones`}</strong></div>
                <div><span className="text-gray-500">Activation:</span> <strong>{form.activationType === "automatic" ? "Auto" : "Coupon"}</strong></div>
                <div><span className="text-gray-500">Global Limit:</span> <strong>{form.globalUsageLimit || "∞"}</strong></div>
                <div><span className="text-gray-500">Per Customer:</span> <strong>{form.perCustomerLimit || "∞"}</strong></div>
                <div><span className="text-gray-500">Conditions:</span> <strong>{form.conditions?.length || 0} rules</strong></div>
                <div><span className="text-gray-500">Coupons:</span> <strong>{form.couponCodes?.length || 0} codes</strong></div>
                <div><span className="text-gray-500">Dates:</span> <strong>{form.startDate || "∞"} — {form.endDate || "∞"}</strong></div>
                <div><span className="text-gray-500">Min Subtotal:</span> <strong>{form.minSubtotal ? `£${form.minSubtotal}` : "None"}</strong></div>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <>
      <Toaster />
      <PageHeader title="Promotions" subtitle="Enterprise promotion engine — create, publish, pause, simulate" />

      <DirectoryToolbar>
        <DirectoryToolSelect
          placeholder="All statuses"
          options={STATUS_OPTIONS}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <DirectoryToolbarEnd>
          <Button onClick={openCreate} icon={<TbPlus />}>New Promotion</Button>
        </DirectoryToolbarEnd>
      </DirectoryToolbar>

      <DirectoryTableWrap>
        <Table columns={columns} data={promotions} loading={isLoading} emptyText="No promotions yet — create your first!" />
      </DirectoryTableWrap>

      <PaginationBar page={page} limit={20} total={totalCount} onPageChange={setPage} />

      {/* ─── Wizard Modal ─────────────────────────────────────── */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editId ? "Edit Promotion" : "New Promotion"} size="xl">
        <div className="p-4">
          <StepIndicator step={wizardStep} setStep={setWizardStep} />
          {renderStep()}
          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={() => wizardStep > 0 ? setWizardStep(wizardStep - 1) : setShowForm(false)}>
              {wizardStep > 0 ? "← Back" : "Cancel"}
            </Button>
            <div className="flex gap-2">
              {wizardStep < STEPS.length - 1 ? (
                <Button onClick={() => setWizardStep(wizardStep + 1)}>Next →</Button>
              ) : (
                <Button onClick={handleSave} loading={creating || updating}>
                  {editId ? "Update Promotion" : "Create as Draft"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* ─── View Modal ───────────────────────────────────────── */}
      <DirectoryViewModal open={!!viewRow} onClose={() => setViewRow(null)} title={viewRow?.name || "Promotion"}>
        {viewRow && (
          <DirectoryMetrics>
            <DirectoryMetric label="Status" value={viewRow.status} />
            <DirectoryMetric label="Benefit" value={benefitLabel(viewRow.benefitType)} />
            <DirectoryMetric label="Value" value={viewRow.discountValue ? `${viewRow.discountValue}${viewRow.benefitType?.includes("percentage") ? "%" : ""}` : "—"} />
            <DirectoryMetric label="Cap" value={viewRow.maxDiscountCap ? `£${viewRow.maxDiscountCap}` : "—"} />
            <DirectoryMetric label="Zone" value={viewRow.zoneScopeMode === "all" ? "All" : `${viewRow.zoneIds?.length || 0} zones`} />
            <DirectoryMetric label="Activation" value={viewRow.activationType === "automatic" ? "Auto" : "Coupon"} />
            <DirectoryMetric label="Used" value={viewRow.globalUsedCount || 0} />
            <DirectoryMetric label="Limit" value={viewRow.globalUsageLimit || "∞"} />
            <DirectoryMetric label="Coupons" value={viewRow.couponCodes?.length || 0} />
          </DirectoryMetrics>
        )}
      </DirectoryViewModal>
    </>
  );
}
