import { useState, useMemo, useCallback } from "react";
import dayjs from "dayjs";
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
import {
  useGetServiceDiscountsQuery,
  useCreateServiceDiscountMutation,
  useUpdateServiceDiscountMutation,
  useDeleteServiceDiscountMutation,
  useGetAllZonesQuery,
} from "../../store/services/api";
import { TbPlus, TbTrash } from "../../shared/icons/index";

// ─── Constants ───────────────────────────────────────────────────────────────

const TARGET_TYPE_LABELS = {
  all: "All services & add-ons",
  service: "Specific service",
  category: "Specific category",
  subCategory: "Specific item (sub-category)",
  addon: "Specific add-on",
};

const ZONE_MODE_LABELS = {
  all: "All zones",
  specific: "Specific zone(s)",
};

const blankForm = () => ({
  name: "",
  discountType: "percentage",
  discountValue: "",
  maxDiscountCap: "",
  targetType: "all",
  targetId: "",
  zoneMode: "all",
  zoneIds: [],
  validFrom: "",
  validTo: "",
  isActive: true,
});

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

function targetLabel(row, services, categories) {
  if (row.targetType === "all") return "All services & add-ons";
  const tId = row.targetId;
  if (row.targetType === "service") {
    const s = (services || []).find((x) => x.id === tId || x.id === Number(tId));
    return s ? `Service: ${s.name}` : `Service ID ${tId}`;
  }
  if (row.targetType === "category") {
    const c = (categories || []).find((x) => x.id === tId || x.id === Number(tId));
    return c ? `Category: ${c.name}` : `Category ID ${tId}`;
  }
  if (row.targetType === "subCategory") return `Item ID ${tId}`;
  if (row.targetType === "addon") return `Add-on ID ${tId}`;
  return "—";
}

function zoneLabel(row, zones) {
  if (row.zoneMode === "all") return "All zones";
  const ids = Array.isArray(row.zoneIds) ? row.zoneIds.map(Number) : [];
  if (!ids.length) return "—";
  const names = ids
    .map((id) => {
      const z = (zones || []).find((z) => Number(z.id) === id);
      return z ? z.name : `Zone ${id}`;
    })
    .join(", ");
  return names;
}

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
  const zones = zonesData?.zones || zonesData?.data || [];

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

  const openEdit = useCallback((row) => {
    setEditRow(row);
    setForm({
      name: row.name || "",
      discountType: row.discountType || "percentage",
      discountValue: row.discountValue != null ? String(row.discountValue) : "",
      maxDiscountCap: row.maxDiscountCap != null ? String(row.maxDiscountCap) : "",
      targetType: row.targetType || "all",
      targetId: row.targetId != null ? String(row.targetId) : "",
      zoneMode: row.zoneMode || "all",
      zoneIds: Array.isArray(row.zoneIds) ? row.zoneIds.map(String) : [],
      validFrom: row.validFrom ? dayjs(row.validFrom).format("YYYY-MM-DD") : "",
      validTo: row.validTo ? dayjs(row.validTo).format("YYYY-MM-DD") : "",
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  }, []);

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.discountValue || Number(form.discountValue) <= 0) {
      toast.error("Discount value must be a positive number"); return;
    }
    if (form.discountType === "percentage" && Number(form.discountValue) > 100) {
      toast.error("Percentage cannot exceed 100"); return;
    }
    if (form.targetType !== "all" && !form.targetId) {
      toast.error("Target ID is required for the selected target type"); return;
    }
    if (form.zoneMode === "specific" && !form.zoneIds.length) {
      toast.error("Select at least one zone for specific zone mode"); return;
    }

    const payload = {
      name: form.name.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      maxDiscountCap: form.maxDiscountCap ? Number(form.maxDiscountCap) : null,
      targetType: form.targetType,
      targetId: form.targetType !== "all" ? Number(form.targetId) : null,
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
        toast.success("Discount created");
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
      toast.success("Discount deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to delete");
    }
  };

  // ── Zone multi-select toggle ───────────────────────────────────────────────
  const toggleZoneId = (id) => {
    const sid = String(id);
    setForm((f) => ({
      ...f,
      zoneIds: f.zoneIds.includes(sid)
        ? f.zoneIds.filter((z) => z !== sid)
        : [...f.zoneIds, sid],
    }));
  };

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        key: "discountName",
        header: "Discount rule",
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
        header: "Applies to",
        render: (row) => (
          <div style={{ fontSize: 13 }}>
            <div>{TARGET_TYPE_LABELS[row.targetType] || row.targetType}</div>
            {row.targetType !== "all" && row.targetId && (
              <div style={{ fontSize: 12, color: "#6b7280" }}>ID: {row.targetId}</div>
            )}
          </div>
        ),
      },
      {
        key: "zoneScope",
        header: "Zone scope",
        render: (row) => (
          <div style={{ fontSize: 13 }}>
            {row.zoneMode === "all" ? (
              <span style={{ color: "#2e7d32", fontWeight: 500 }}>All zones</span>
            ) : (
              <span>
                {Array.isArray(row.zoneIds) ? row.zoneIds.length : 0} zone(s)
              </span>
            )}
          </div>
        ),
      },
      {
        key: "validity",
        header: "Valid period",
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
              title="Delete"
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
        description="Set percentage or flat discounts on specific services, categories, items, or add-ons — scoped to all zones or selected zones."
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
          emptyMessage="No discount rules yet. Create one to start discounting services."
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
        onClose={() => setModalOpen(false)}
        title={editRow ? "Edit Discount Rule" : "New Discount Rule"}
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editRow ? "Save changes" : "Create discount"}
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Name */}
          <Field label="Rule name *" hint="Internal label e.g. 'Dry clean 20% off summer'">
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. 20% off dry cleaning"
            />
          </Field>

          {/* Discount type + value */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Discount type *">
              <Select
                value={form.discountType}
                onChange={(value) => setField("discountType", value)}
                options={[
                  { value: "percentage", label: "Percentage (%)" },
                  { value: "flat", label: "Flat amount (£)" },
                ]}
              />
            </Field>
            <Field
              label={`Discount value * ${form.discountType === "percentage" ? "(%)" : "(£)"}`}
            >
              <Input
                type="number"
                min="0.01"
                step="0.01"
                max={form.discountType === "percentage" ? "100" : undefined}
                value={form.discountValue}
                onChange={(e) => setField("discountValue", e.target.value)}
                placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 5.00"}
              />
            </Field>
          </div>

          {/* Max cap (percentage only) */}
          {form.discountType === "percentage" && (
            <Field
              label="Maximum discount cap (£)"
              hint="Optional — limits maximum savings for percentage discounts"
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
          )}

          {/* ── TARGET SCOPE ── */}
          <div
            style={{
              background: "#f0f7ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div
              style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.5px", color: "#1d4ed8", marginBottom: 12 }}
            >
              🎯 Target scope
            </div>

            <Field label="Apply discount to *">
              <Select
                value={form.targetType}
                onChange={(value) => {
                  setField("targetType", value);
                  setField("targetId", "");
                }}
                options={[
                  { value: "all", label: "All services, categories & add-ons" },
                  { value: "service", label: "Specific service (by service ID)" },
                  { value: "category", label: "Specific category (by category ID)" },
                  { value: "subCategory", label: "Specific item / sub-category (by item ID)" },
                  { value: "addon", label: "Specific add-on (by add-on ID)" },
                ]}
              />
            </Field>

            {form.targetType !== "all" && (
              <div style={{ marginTop: 12 }}>
                <Field
                  label={`${TARGET_TYPE_LABELS[form.targetType]} ID *`}
                  hint="Find the ID from the Service Management dashboard"
                >
                  <Input
                    type="number"
                    value={form.targetId}
                    onChange={(e) => setField("targetId", e.target.value)}
                    placeholder="e.g. 3"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* ── ZONE SCOPE ── */}
          <div
            style={{
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: 8,
              padding: "14px 16px",
            }}
          >
            <div
              style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase",
                letterSpacing: "0.5px", color: "#166534", marginBottom: 12 }}
            >
              🗺️ Zone scope
            </div>

            <Field label="Zone mode *">
              <Select
                value={form.zoneMode}
                onChange={(value) => {
                  setField("zoneMode", value);
                  if (value === "all") setField("zoneIds", []);
                }}
                options={[
                  { value: "all", label: "All zones" },
                  { value: "specific", label: "Specific zone(s) only" },
                ]}
              />
            </Field>

            {form.zoneMode === "specific" && zones.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "#166534", marginBottom: 8, fontWeight: 500 }}>
                  Select zones (click to toggle):
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {zones.map((z) => {
                    const sid = String(z.id);
                    const selected = form.zoneIds.includes(sid);
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => toggleZoneId(z.id)}
                        style={{
                          padding: "5px 12px",
                          borderRadius: 20,
                          border: selected ? "2px solid #166534" : "1px solid #d1fae5",
                          background: selected ? "#166534" : "#f0fdf4",
                          color: selected ? "#fff" : "#166534",
                          fontSize: 12,
                          fontWeight: selected ? 600 : 400,
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {z.name || z.zoneName}
                      </button>
                    );
                  })}
                </div>
                {form.zoneIds.length > 0 && (
                  <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>
                    {form.zoneIds.length} zone{form.zoneIds.length !== 1 ? "s" : ""} selected
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── VALIDITY ── */}
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

          {/* Active toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Toggle
              checked={form.isActive}
              onChange={(v) => setField("isActive", v)}
            />
            <span style={{ fontSize: 13, color: form.isActive ? "#166534" : "#6b7280" }}>
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
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete permanently
            </Button>
          </div>
        }
      >
        <p style={{ fontSize: 14, color: "#374151" }}>
          Are you sure you want to delete{" "}
          <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
          <br />
          <br />
          This discount will no longer apply to new bookings. Existing orders are
          unaffected.
        </p>
      </Modal>
    </div>
  );
}
