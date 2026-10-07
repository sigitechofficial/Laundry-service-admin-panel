import { useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
import {
  TbTarget,
  TbMapPin,
  TbCalendarEvent,
  TbPercentage,
} from "react-icons/tb";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Badge,
} from "../../design-system";
import { Toggle, PaginationBar } from "../misc-kit";
import {
  DirectoryActions,
  DirectoryActionEdit,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import ZoneMultiSelect from "./ZoneMultiSelect";
import CatalogMultiSelect from "./CatalogMultiSelect";
import {
  useGetServiceDiscountsQuery,
  useCreateServiceDiscountMutation,
  useUpdateServiceDiscountMutation,
  useDeleteServiceDiscountMutation,
  useGetAllZonesQuery,
  useGetAllServicesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useGetAllAddOnServicesQuery,
  useGetZoneCatalogQuery,
} from "../../store/services/api";
import { TbPlus, TbTrash } from "../../shared/icons/index";

// ─── Constants ───────────────────────────────────────────────────────────────

const TARGET_TYPE_OPTIONS = [
  { value: "all",         label: "All services & add-ons" },
  { value: "service",     label: "Specific service(s)" },
  { value: "category",    label: "Specific categor(y/ies)" },
  { value: "subCategory", label: "Specific item(s)" },
  { value: "addon",       label: "Specific add-on(s)" },
];

const ZONE_MODE_OPTIONS = [
  { value: "all",      label: "All zones" },
  { value: "specific", label: "Specific zone(s) only" },
];

const DISCOUNT_TYPE_OPTIONS = [
  { value: "percentage", label: "Percentage (%)" },
  { value: "flat",       label: "Flat amount (£)" },
];

const blankForm = () => ({
  name: "",
  discountType: "percentage",
  discountValue: "",
  maxDiscountCap: "",
  targetType: "all",
  targetIds: [],
  targetCategoryId: "", // UI only — optional filter for sub-categories
  zoneMode: "all",
  zoneIds: [],
  validFrom: "",
  validTo: "",
  isActive: true,
});

function parseTargetIds(row) {
  if (Array.isArray(row?.targetIds) && row.targetIds.length) {
    return row.targetIds.map(String);
  }
  if (row?.targetId != null && row.targetId !== "") {
    return [String(row.targetId)];
  }
  return [];
}

function moneyLabel(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return null;
  return `£${v.toFixed(2)}`;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(row) {
  const now = new Date();
  if (!row.isActive) return <Badge tone="neutral">Inactive</Badge>;
  if (row.validFrom && new Date(row.validFrom) > now)
    return <Badge tone="warning">Scheduled</Badge>;
  if (row.validTo && new Date(row.validTo) < now)
    return <Badge tone="neutral">Expired</Badge>;
  return <Badge tone="success">Active</Badge>;
}

function discountLabel(row) {
  if (row.discountType === "percentage") {
    const cap = row.maxDiscountCap ? ` (max £${Number(row.maxDiscountCap).toFixed(2)})` : "";
    return `${Number(row.discountValue)}%${cap}`;
  }
  return `£${Number(row.discountValue).toFixed(2)} flat`;
}

function extractList(response, ...keys) {
  const root = response?.data ?? response;
  for (const k of keys) {
    if (Array.isArray(root?.[k])) return root[k];
  }
  if (Array.isArray(root)) return root;
  return [];
}

// ─── Section card style helpers ───────────────────────────────────────────────

const card = (bg = "#fff", border = "var(--line, #e5e7eb)") => ({
  background: bg,
  border: `1px solid ${border}`,
  borderRadius: 10,
  padding: "16px 20px",
});

const sectionHead = (color = "#111827") => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 14,
  paddingBottom: 10,
  borderBottom: "1px solid rgba(0,0,0,0.06)",
  color,
});

const iconBox = (bg, color) => ({
  width: 30,
  height: 30,
  borderRadius: 7,
  background: bg,
  color,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
});

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServiceDiscountsPage() {
  const toast = useToaster();
  const [page, setPage] = useState(1);
  const [filterActive, setFilterActive] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useGetServiceDiscountsQuery({
    page,
    limit: 20,
    ...(filterActive !== "" ? { isActive: filterActive } : {}),
  });

  const { data: zonesData } = useGetAllZonesQuery();
  const zones = useMemo(() => {
    const raw = zonesData?.data ?? zonesData;
    return Array.isArray(raw) ? raw : raw?.zones ?? raw?.data ?? [];
  }, [zonesData]);

  const { data: servicesResp } = useGetAllServicesQuery();
  const allServices = useMemo(
    () => extractList(servicesResp, "services", "data"),
    [servicesResp]
  );

  const { data: categoriesResp } = useGetCategoriesQuery();
  const allCategories = useMemo(
    () => extractList(categoriesResp, "categories", "data"),
    [categoriesResp]
  );

  const { data: subCatsResp } = useGetSubCategoriesQuery();
  const allSubCategories = useMemo(
    () => extractList(subCatsResp, "subCategories", "subCat", "data"),
    [subCatsResp]
  );

  const { data: addonsResp } = useGetAllAddOnServicesQuery();
  const allAddons = useMemo(
    () => extractList(addonsResp, "addOnServices", "addons", "data"),
    [addonsResp]
  );

  // Zone catalog for the first selected zone (used to filter services)
  const firstZoneId = form.zoneMode === "specific" ? form.zoneIds[0] : null;
  const { data: zoneCatalogData } = useGetZoneCatalogQuery(firstZoneId, {
    skip: !firstZoneId,
  });

  // Services filtered by zone catalog (when specific zone selected)
  const filteredServices = useMemo(() => {
    if (form.zoneMode !== "specific" || !firstZoneId || !zoneCatalogData) {
      return allServices;
    }
    const zoneServiceIds = new Set(
      (zoneCatalogData?.services || []).map((s) => Number(s.id ?? s.serviceId))
    );
    if (!zoneServiceIds.size) return allServices;
    return allServices.filter((s) => zoneServiceIds.has(Number(s.id ?? s._id)));
  }, [allServices, form.zoneMode, firstZoneId, zoneCatalogData]);

  // Sub-categories filtered by selected category
  const filteredSubCats = useMemo(() => {
    if (!form.targetCategoryId) return allSubCategories;
    return allSubCategories.filter(
      (sc) =>
        String(sc.categoryId ?? sc.category_id ?? sc.parentId) ===
        String(form.targetCategoryId)
    );
  }, [allSubCategories, form.targetCategoryId]);

  const [createDiscount] = useCreateServiceDiscountMutation();
  const [updateDiscount] = useUpdateServiceDiscountMutation();
  const [deleteDiscount] = useDeleteServiceDiscountMutation();

  // ── Form helpers ───────────────────────────────────────────────────────────
  const setField = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const openCreate = () => {
    setEditRow(null);
    setForm(blankForm());
    setModalOpen(true);
  };

  const openEdit = useCallback(
    (row) => {
      setEditRow(row);
      const ids = parseTargetIds(row);
      let targetCategoryId = "";
      if (row.targetType === "subCategory" && ids[0]) {
        const sc = allSubCategories.find(
          (s) => String(s.id ?? s._id) === String(ids[0])
        );
        targetCategoryId = sc
          ? String(sc.categoryId ?? sc.category_id ?? sc.parentId ?? "")
          : "";
      }
      setForm({
        name: row.name || "",
        discountType: row.discountType || "percentage",
        discountValue: row.discountValue != null ? String(row.discountValue) : "",
        maxDiscountCap: row.maxDiscountCap != null ? String(row.maxDiscountCap) : "",
        targetType: row.targetType || "all",
        targetIds: ids,
        targetCategoryId,
        zoneMode: row.zoneMode || "all",
        zoneIds: Array.isArray(row.zoneIds) ? row.zoneIds.map(String) : [],
        validFrom: row.validFrom ? dayjs(row.validFrom).format("YYYY-MM-DD") : "",
        validTo: row.validTo ? dayjs(row.validTo).format("YYYY-MM-DD") : "",
        isActive: row.isActive !== false,
      });
      setModalOpen(true);
    },
    [allSubCategories]
  );

  /** Live price / exceed hints for selected priced leaves (items & add-ons). */
  const priceGuard = useMemo(() => {
    const val = Number(form.discountValue);
    const selected = form.targetIds || [];
    let priced = [];

    if (form.targetType === "subCategory") {
      priced = allSubCategories
        .filter((sc) => selected.includes(String(sc.id ?? sc._id)))
        .map((sc) => ({
          id: String(sc.id ?? sc._id),
          name: sc.name ?? sc.subCategoryName ?? `Item ${sc.id}`,
          price: Number(sc.price) || 0,
        }));
    } else if (form.targetType === "addon") {
      priced = allAddons
        .filter((a) => selected.includes(String(a.id ?? a._id)))
        .map((a) => ({
          id: String(a.id ?? a._id),
          name: a.name ?? a.addonName ?? `Add-on ${a.id}`,
          price: Number(a.price) || 0,
        }));
    } else if (form.targetType === "category" && selected.length) {
      priced = allSubCategories
        .filter((sc) =>
          selected.includes(String(sc.categoryId ?? sc.category_id ?? sc.parentId))
        )
        .map((sc) => ({
          id: String(sc.id ?? sc._id),
          name: sc.name ?? sc.subCategoryName ?? `Item ${sc.id}`,
          price: Number(sc.price) || 0,
        }))
        .filter((p) => p.price > 0);
    } else if (form.targetType === "service" && selected.length) {
      const catIds = new Set(
        allCategories
          .filter((c) => selected.includes(String(c.serviceId ?? c.service_id)))
          .map((c) => String(c.id ?? c._id))
      );
      // Fallback: some APIs nest serviceId only on category
      if (!catIds.size) {
        allCategories.forEach((c) => {
          if (selected.includes(String(c.serviceId))) {
            catIds.add(String(c.id ?? c._id));
          }
        });
      }
      priced = allSubCategories
        .filter((sc) =>
          catIds.has(String(sc.categoryId ?? sc.category_id ?? sc.parentId))
        )
        .map((sc) => ({
          id: String(sc.id ?? sc._id),
          name: sc.name ?? sc.subCategoryName ?? `Item ${sc.id}`,
          price: Number(sc.price) || 0,
        }))
        .filter((p) => p.price > 0);
    }

    priced = priced.filter((p) => p.price > 0);
    if (!priced.length) {
      return { priced: [], min: null, exceeds: [], pctOver: false };
    }
    const min = priced.reduce((a, b) => (a.price <= b.price ? a : b));
    const exceeds =
      form.discountType === "flat" && Number.isFinite(val) && val > 0
        ? priced.filter((p) => val > p.price)
        : [];
    const pctOver =
      form.discountType === "percentage" && Number.isFinite(val) && val > 100;
    return { priced, min, exceeds, pctOver, value: val };
  }, [
    form.discountType,
    form.discountValue,
    form.targetType,
    form.targetIds,
    allSubCategories,
    allAddons,
    allCategories,
  ]);

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      toast.error("Discount value must be greater than zero");
      return;
    }
    if (form.discountType === "percentage" && Number(form.discountValue) > 100) {
      toast.error("Percentage cannot exceed 100%");
      return;
    }
    if (form.targetType !== "all" && !form.targetIds.length) {
      toast.error("Select at least one target from the dropdown");
      return;
    }
    if (form.zoneMode === "specific" && !form.zoneIds.length) {
      toast.error("Select at least one zone for specific zone mode");
      return;
    }
    if (form.discountType === "flat" && priceGuard.exceeds.length) {
      const worst = priceGuard.exceeds.reduce((a, b) =>
        a.price <= b.price ? a : b
      );
      toast.error(
        `£${Number(form.discountValue).toFixed(2)} exceeds "${worst.name}" price (${moneyLabel(worst.price)}). Lower the discount or remove that target.`
      );
      return;
    }

    const payload = {
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountCap: form.maxDiscountCap ? Number(form.maxDiscountCap) : null,
      targetType: form.targetType,
      targetIds:
        form.targetType !== "all" ? form.targetIds.map(Number).filter(Boolean) : null,
      targetId:
        form.targetType !== "all" && form.targetIds.length === 1
          ? Number(form.targetIds[0])
          : null,
      zoneMode: form.zoneMode,
      zoneIds: form.zoneMode === "specific" ? form.zoneIds.map(Number) : null,
      validFrom: form.validFrom || null,
      validTo: form.validTo || null,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editRow) {
        await updateDiscount({ id: editRow.id, ...payload }).unwrap();
        toast.success("Discount updated");
      } else {
        await createDiscount(payload).unwrap();
        toast.success("Discount rule created");
      }
      setModalOpen(false);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to save discount");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDiscount(deleteTarget.id).unwrap();
      toast.success("Discount rule deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete");
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: "discountName",
        header: "Discount Rule",
        render: (row) => (
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{row.name}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>
              {discountLabel(row)}
            </div>
          </div>
        ),
      },
      {
        key: "targetScope",
        header: "Applies To",
        render: (row) => {
          const ids = parseTargetIds(row);
          return (
            <div style={{ fontSize: 13 }}>
              <div>
                {TARGET_TYPE_OPTIONS.find((o) => o.value === row.targetType)?.label ??
                  row.targetType}
              </div>
              {row.targetType !== "all" && ids.length > 0 ? (
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {ids.length} target{ids.length !== 1 ? "s" : ""}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        key: "zoneScope",
        header: "Zone Scope",
        render: (row) => (
          <div style={{ fontSize: 13 }}>
            {row.zoneMode === "all" ? (
              <span style={{ color: "#2e7d32", fontWeight: 500 }}>All zones</span>
            ) : (
              <span>{Array.isArray(row.zoneIds) ? row.zoneIds.length : 0} zone(s)</span>
            )}
          </div>
        ),
      },
      {
        key: "validity",
        header: "Valid Period",
        render: (row) => {
          const from = row.validFrom ? dayjs(row.validFrom).format("DD MMM YYYY") : "—";
          const to = row.validTo ? dayjs(row.validTo).format("DD MMM YYYY") : "No end";
          return (
            <div style={{ fontSize: 12, color: "#4b5563" }}>
              {from} → {to}
            </div>
          );
        },
      },
      {
        key: "discountStatus",
        header: "Status",
        render: (row) => statusBadge(row),
      },
      {
        key: "actions",
        header: "",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionEdit onClick={() => openEdit(row)} />
            <button
              title="Delete rule"
              onClick={() => setDeleteTarget(row)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
              }}
            >
              <TbTrash size={16} />
            </button>
          </DirectoryActions>
        ),
      },
    ],
    [openEdit]
  );

  const rows = data?.rows || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / 20);

  return (
    <div>
      <PageHeader
        title="Service Discounts"
        description="Enterprise offers: multi-select services, categories, items, or add-ons. Flat discounts cannot exceed catalog prices; percentage max 100%."
        actions={
          <Button onClick={openCreate} icon={<TbPlus />}>
            New Discount
          </Button>
        }
      />

      {/* ─── Toolbar ─── */}
      <DirectoryToolbar>
        <Select
          value={filterActive}
          onChange={(value) => { setFilterActive(value); setPage(1); }}
          options={[
            { value: "", label: "All statuses" },
            { value: "true", label: "Active only" },
            { value: "false", label: "Inactive only" },
          ]}
        />
        <DirectoryToolbarEnd>
          <span style={{ fontSize: 13, color: "#6b7280" }}>
            {totalCount} rule{totalCount !== 1 ? "s" : ""}
          </span>
        </DirectoryToolbarEnd>
      </DirectoryToolbar>

      {/* ─── Table ─── */}
      <DirectoryTableWrap>
        <Table
          columns={columns}
          rows={rows}
          loading={isLoading}
          emptyMessage="No discount rules yet. Click 'New Discount' to create one."
        />
      </DirectoryTableWrap>

      {totalPages > 1 && (
        <PaginationBar page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          CREATE / EDIT MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        open={modalOpen}
        size="lg"
        onClose={() => setModalOpen(false)}
        title={editRow ? "Edit Discount Rule" : "New Discount Rule"}
        primaryLabel={saving ? "Saving…" : editRow ? "Save changes" : "Create discount"}
        onPrimary={handleSave}
        primaryDisabled={
          saving ||
          priceGuard.pctOver ||
          (form.discountType === "flat" && priceGuard.exceeds.length > 0)
        }
        secondaryLabel="Cancel"
        onSecondary={() => setModalOpen(false)}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── Rule name ── */}
          <Field
            label="Rule name *"
            hint="Internal label — e.g. 'Dry clean 20% off summer'"
          >
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. 20% off dry cleaning"
            />
          </Field>

          {/* ── Discount type + value ── */}
          <div style={card("#f8fafc", "#e2e8f0")}>
            <div style={sectionHead("#1e293b")}>
              <span style={iconBox("#dbeafe", "#1d4ed8")}>
                <TbPercentage size={16} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Discount Value
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Discount type *">
                <Select
                  value={form.discountType}
                  onChange={(value) => setField("discountType", value)}
                  options={DISCOUNT_TYPE_OPTIONS}
                />
              </Field>
              <Field
                label={`Value * ${form.discountType === "percentage" ? "(%)" : "(£)"}`}
                hint={
                  form.discountType === "percentage"
                    ? "Maximum 100%"
                    : priceGuard.min
                      ? `Cannot exceed cheapest selected price (${moneyLabel(priceGuard.min.price)})`
                      : "Cannot exceed the catalog price of selected targets"
                }
                error={
                  priceGuard.pctOver
                    ? "Percentage cannot exceed 100%"
                    : priceGuard.exceeds.length
                      ? `Exceeds ${priceGuard.exceeds.length} priced target(s)`
                      : undefined
                }
              >
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={form.discountType === "percentage" ? "100" : undefined}
                  value={form.discountValue}
                  onChange={(e) => setField("discountValue", e.target.value)}
                  placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 5.00"}
                  error={Boolean(priceGuard.pctOver || priceGuard.exceeds.length)}
                />
              </Field>
            </div>
            {form.discountType === "percentage" && (
              <div style={{ marginTop: 12 }}>
                <Field
                  label="Maximum cap (£)"
                  hint="Optional — caps the maximum saving"
                >
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.maxDiscountCap}
                    onChange={(e) => setField("maxDiscountCap", e.target.value)}
                    placeholder="e.g. 15.00 — leave blank for no cap"
                  />
                </Field>
              </div>
            )}
            {(priceGuard.pctOver || priceGuard.exceeds.length > 0 || (form.discountType === "flat" && priceGuard.min)) && (
              <div
                style={{
                  marginTop: 12,
                  padding: "10px 12px",
                  borderRadius: 8,
                  fontSize: 12,
                  lineHeight: 1.45,
                  border: `1px solid ${
                    priceGuard.pctOver || priceGuard.exceeds.length ? "#fecaca" : "#bfdbfe"
                  }`,
                  background:
                    priceGuard.pctOver || priceGuard.exceeds.length ? "#fef2f2" : "#eff6ff",
                  color: priceGuard.pctOver || priceGuard.exceeds.length ? "#991b1b" : "#1e40af",
                }}
              >
                {priceGuard.pctOver ? (
                  <>Percentage discount cannot exceed <b>100%</b>. You entered {form.discountValue}%.</>
                ) : priceGuard.exceeds.length ? (
                  <>
                    Flat discount <b>{moneyLabel(form.discountValue)}</b> exceeds catalog price for:{" "}
                    {priceGuard.exceeds
                      .slice(0, 3)
                      .map((p) => `${p.name} (${moneyLabel(p.price)})`)
                      .join(", ")}
                    {priceGuard.exceeds.length > 3
                      ? ` +${priceGuard.exceeds.length - 3} more`
                      : ""}
                    . Max allowed for this selection:{" "}
                    <b>{moneyLabel(priceGuard.min.price)}</b>.
                  </>
                ) : (
                  <>
                    Selected priced items: cheapest is{" "}
                    <b>
                      {priceGuard.min.name} ({moneyLabel(priceGuard.min.price)})
                    </b>
                    . Flat discount must stay at or below this amount.
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── TARGET SCOPE ── */}
          <div style={card("#f0f7ff", "#bfdbfe")}>
            <div style={sectionHead("#1e40af")}>
              <span style={iconBox("#dbeafe", "#1d4ed8")}>
                <TbTarget size={16} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Target Scope
              </span>
            </div>

            <Field label="Apply discount to *" hint="One rule, one target type — select multiple within that type">
              <Select
                value={form.targetType}
                onChange={(value) => {
                  setField("targetType", value);
                  setField("targetIds", []);
                  setField("targetCategoryId", "");
                }}
                options={TARGET_TYPE_OPTIONS}
              />
            </Field>

            {form.targetType === "service" && (
              <div style={{ marginTop: 12 }}>
                <Field
                  label="Select service(s) *"
                  hint={
                    form.zoneMode === "specific" && form.zoneIds.length > 0
                      ? `Showing services available in selected zone${form.zoneIds.length > 1 ? "s" : ""}`
                      : "Multi-select — discount applies to every selected service tree"
                  }
                >
                  <CatalogMultiSelect
                    selectedIds={form.targetIds}
                    onChange={(next) => setField("targetIds", next)}
                    placeholder="Select one or more services…"
                    options={filteredServices.map((s) => ({
                      value: String(s.id ?? s._id),
                      label: s.name ?? s.serviceName ?? s.title ?? `Service ${s.id}`,
                    }))}
                  />
                </Field>
              </div>
            )}

            {form.targetType === "category" && (
              <div style={{ marginTop: 12 }}>
                <Field
                  label="Select categor(y/ies) *"
                  hint="Multi-select — flat discount cannot exceed the cheapest item under these categories"
                >
                  <CatalogMultiSelect
                    selectedIds={form.targetIds}
                    onChange={(next) => setField("targetIds", next)}
                    placeholder="Select one or more categories…"
                    options={allCategories.map((c) => ({
                      value: String(c.id ?? c._id),
                      label: c.name ?? c.categoryName ?? c.title ?? `Category ${c.id}`,
                    }))}
                  />
                </Field>
              </div>
            )}

            {form.targetType === "subCategory" && (
              <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                <Field label="Filter by category" hint="Optional — narrow the item list">
                  <Select
                    value={form.targetCategoryId}
                    onChange={(value) => setField("targetCategoryId", value)}
                    placeholder="All categories"
                    options={[
                      { value: "", label: "All categories" },
                      ...allCategories.map((c) => ({
                        value: String(c.id ?? c._id),
                        label: c.name ?? c.categoryName ?? `Category ${c.id}`,
                      })),
                    ]}
                  />
                </Field>
                <Field
                  label="Select item(s) *"
                  hint="Each item shows its catalog price — flat discount cannot exceed any selected price"
                >
                  <CatalogMultiSelect
                    selectedIds={form.targetIds}
                    onChange={(next) => setField("targetIds", next)}
                    placeholder="Select one or more items…"
                    options={(form.targetCategoryId ? filteredSubCats : allSubCategories).map(
                      (sc) => ({
                        value: String(sc.id ?? sc._id),
                        label:
                          sc.name ?? sc.subCategoryName ?? sc.title ?? `Item ${sc.id}`,
                        price: sc.price,
                      })
                    )}
                  />
                </Field>
              </div>
            )}

            {form.targetType === "addon" && (
              <div style={{ marginTop: 12 }}>
                <Field
                  label="Select add-on(s) *"
                  hint="Each add-on shows its catalog price — flat discount cannot exceed any selected price"
                >
                  <CatalogMultiSelect
                    selectedIds={form.targetIds}
                    onChange={(next) => setField("targetIds", next)}
                    placeholder="Select one or more add-ons…"
                    options={allAddons.map((a) => ({
                      value: String(a.id ?? a._id),
                      label: a.name ?? a.addonName ?? a.title ?? `Add-on ${a.id}`,
                      price: a.price,
                    }))}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ── ZONE SCOPE ── */}
          <div style={card("#f0fdf4", "#bbf7d0")}>
            <div style={sectionHead("#166534")}>
              <span style={iconBox("#dcfce7", "#15803d")}>
                <TbMapPin size={16} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Zone Scope
              </span>
            </div>

            {/* Zone mode toggle pills */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {ZONE_MODE_OPTIONS.map(({ value, label }) => {
                const active = form.zoneMode === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setField("zoneMode", value);
                      if (value === "all") setField("zoneIds", []);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "7px 16px",
                      borderRadius: 20,
                      border: active ? "2px solid #166534" : "1.5px solid #bbf7d0",
                      background: active ? "#166534" : "#fff",
                      color: active ? "#fff" : "#166534",
                      fontSize: 13,
                      fontWeight: active ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.15s",
                    }}
                  >
                    <TbMapPin size={14} />
                    {label}
                  </button>
                );
              })}
            </div>

            {form.zoneMode === "specific" && (
              <div>
                <Field label="Select zones*">
                  <ZoneMultiSelect
                    zones={zones}
                    selectedIds={form.zoneIds}
                    onChange={(next) => setField("zoneIds", next)}
                  />
                </Field>
                {form.zoneIds.length > 0 && form.targetType === "service" && zoneCatalogData ? (
                  <p style={{ fontSize: 11, color: "#6b7280", margin: "8px 0 0" }}>
                    Service list filtered to {filteredServices.length} service
                    {filteredServices.length !== 1 ? "s" : ""} available in this zone
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* ── VALIDITY ── */}
          <div style={card("#f8fafc", "#e2e8f0")}>
            <div style={sectionHead("#1e293b")}>
              <span style={iconBox("#e0f2fe", "#0369a1")}>
                <TbCalendarEvent size={16} />
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Validity Window
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Valid from" hint="Leave blank to start immediately">
                <Input
                  type="date"
                  value={form.validFrom}
                  onChange={(e) => setField("validFrom", e.target.value)}
                />
              </Field>
              <Field label="Valid until" hint="Leave blank for no expiry">
                <Input
                  type="date"
                  value={form.validTo}
                  onChange={(e) => setField("validTo", e.target.value)}
                />
              </Field>
            </div>
          </div>

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
            <Toggle
              checked={form.isActive}
              onChange={(v) => setField("isActive", v)}
            />
            <span style={{ fontSize: 13, color: form.isActive ? "#166534" : "#6b7280", fontWeight: 500 }}>
              {form.isActive ? "Active — discount is live" : "Inactive — discount is paused"}
            </span>
          </div>
        </div>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════
          DELETE CONFIRMATION MODAL
      ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete discount rule?"
        primaryLabel="Delete permanently"
        onPrimary={handleDelete}
        secondaryLabel="Cancel"
        onSecondary={() => setDeleteTarget(null)}
        danger
      >
        <p style={{ fontSize: 14, color: "#374151" }}>
          Are you sure you want to delete{" "}
          <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
          <br /><br />
          This discount will no longer apply to new bookings. Existing orders are
          unaffected.
        </p>
      </Modal>
    </div>
  );
}
