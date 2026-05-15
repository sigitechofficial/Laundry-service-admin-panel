import { useMemo, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Chip,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import ButtonBlue from "../../components/ui/ButtonBlue";
import useToaster from "../../components/ui/Toaster";
import DataTable from "../../components/ui/DataTable";
import StatCard from "../../components/ui/StatCard";
import ModalComponent from "../../components/shared/Modal";
import ImageUpload from "../../components/ui/ImageUpload";
import {
  useGetAllServicesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useGetAllZonesQuery,
  useCreateBannerMutation,
  useGetAllBannersQuery,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
} from "../../store/services/api";
import { TbSparkles, TbPlus, TbEdit, TbTrash, TbCalendar } from "../../shared/icons/index";
import { BASE_URL } from "../../utilities/URL";

const FIELD_LABEL_SX = {
  mb: 0.75,
  fontSize: "11px",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const SELECT_SX = {
  width: "100%",
  height: "48px",
  borderRadius: "8px",
  border: "1px solid #E2E8F0",
  bgcolor: "#fff",
  fontFamily: "Switzer",
  fontSize: "14px",
  "& .MuiSelect-select": { py: "12px", px: "14px", display: "flex", alignItems: "center" },
  "& .MuiOutlinedInput-notchedOutline": { border: "none" },
};

const DATE_SX = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    height: "48px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    fontFamily: "Switzer",
    bgcolor: "#fff",
    "& fieldset": { border: "none" },
  },
};

const OFFER_TYPES = [
  { value: "percentage", label: "Percentage (% off)" },
  { value: "flat", label: "Flat Amount (off)" },
  { value: "free_delivery", label: "Free Delivery" },
];

const TARGET_TYPES = [
  { value: "global", label: "Global (All Services)" },
  { value: "service", label: "Specific Service" },
  { value: "category", label: "Specific Category" },
  { value: "sub_category", label: "Specific Sub-Category" },
];

const initialForm = () => ({
  title: "",
  description: "",
  bannerImage: null,
  offerType: "percentage",
  discountValue: "",
  maxDiscountCap: "",
  targetType: "global",
  targetServiceId: "",
  targetCategoryId: "",
  targetSubCategoryId: "",
  zoneMode: "all",
  zoneIds: [],
  startDate: null,
  endDate: null,
  displayOrder: "1",
  showOnHome: true,
  isActive: true,
});

function extractList(response, ...keys) {
  const root = response?.data ?? response;
  for (const k of keys) {
    if (Array.isArray(root?.[k])) return root[k];
  }
  if (Array.isArray(root)) return root;
  return [];
}

function extractBanners(response) {
  // Actual backend shape:
  // {
  //   status: "1",
  //   data: { banners: [...] },
  //   meta: { pagination: { total, page, limit, totalPages } }   ← root-level
  // }
  const banners = response?.data?.banners ?? [];
  const total =
    response?.meta?.pagination?.total ??   // root-level meta (actual shape)
    response?.data?.meta?.pagination?.total ??
    response?.data?.total ??
    banners.length;
  return { banners: Array.isArray(banners) ? banners : [], total: Number(total) || 0 };
}

/**
 * Parse zoneIds from whatever the backend returns:
 *   "[30]"   → JSON string  → [30]
 *   "1,3"    → CSV string   → [1, 3]
 *   [1, 3]   → already array
 *   null/""  → []
 */
function parseZoneIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    // JSON array string e.g. "[30]"
    if (trimmed.startsWith("[")) {
      try { return JSON.parse(trimmed).map(Number).filter(Boolean); } catch { /* fall through */ }
    }
    // Comma-separated e.g. "1,3" or "30"
    return trimmed.split(",").map((s) => Number(s.trim())).filter(Boolean);
  }
  return [];
}

/** Resolve a banner image path (relative or absolute) to a displayable URL. */
function resolveBannerImageUrl(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const base = String(BASE_URL).replace(/\/$/, "");
  const rel  = path.startsWith("/") ? path : `/${path}`;
  return `${base}${rel}`;
}

function targetLabel(banner) {
  const t = banner.targetType;
  if (t === "global") return "Global";
  if (t === "service") return `Service #${banner.targetId ?? "—"}`;
  if (t === "category") return `Category #${banner.targetId ?? "—"}`;
  if (t === "sub_category") return `Sub-Cat #${banner.targetId ?? "—"}`;
  return "—";
}

function offerDisplay(banner) {
  if (banner.offerType === "free_delivery") return "Free Delivery";
  if (banner.offerType === "percentage") return `${banner.discountValue ?? "—"}%`;
  return `£${Number(banner.discountValue ?? 0).toFixed(2)} off`;
}

function BannerForm({ form, errors, patch, services, categories, subCategories, zones }) {
  const filteredSubCats = useMemo(
    () =>
      form.targetCategoryId
        ? subCategories.filter(
            (sc) =>
              String(sc.categoryId ?? sc.category_id ?? sc.parentId) ===
              String(form.targetCategoryId)
          )
        : subCategories,
    [subCategories, form.targetCategoryId]
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Typography sx={{ fontSize: 12, color: "#64748B" }}>
        Fields marked <span style={{ color: "#DC2626" }}>*</span> are required.
      </Typography>

      {/* --- Basic Info --- */}
      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Basic Info</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>
              Title <span style={{ color: "#DC2626" }}>*</span>
            </Typography>
            <InputFieldBordered
              placeholder="e.g. Eid Special Offer"
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
            />
            {errors.title && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.title}</Typography>
            )}
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Description</Typography>
            <InputFieldBordered
              placeholder="Short description of this offer"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
            />
          </Box>
          <Box>
            <FormControlLabel
              control={
                <Switch checked={form.isActive} onChange={(e) => patch("isActive", e.target.checked)} color="primary" />
              }
              label={
                <Typography sx={{ fontSize: 13, color: "#334155" }}>
                  {form.isActive ? "Active" : "Inactive"}
                </Typography>
              }
            />
          </Box>
          <Box>
            <FormControlLabel
              control={
                <Switch checked={form.showOnHome} onChange={(e) => patch("showOnHome", e.target.checked)} color="primary" />
              }
              label={
                <Typography sx={{ fontSize: 13, color: "#334155" }}>
                  Show on Home Screen
                </Typography>
              }
            />
          </Box>
        </Box>
      </Box>

      {/* --- Banner Image --- */}
      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Banner Image</Typography>
        <ImageUpload
          value={form.bannerImage}
          onChange={(file) => patch("bannerImage", file)}
          placeholder="Click to upload banner image (recommended: 1200×400)"
        />
      </Box>

      {/* --- Offer Details --- */}
      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Offer Details</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>
              Offer Type <span style={{ color: "#DC2626" }}>*</span>
            </Typography>
            <Select
              value={form.offerType}
              onChange={(e) => patch("offerType", e.target.value)}
              size="small"
              sx={SELECT_SX}
            >
              {OFFER_TYPES.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {form.offerType !== "free_delivery" && (
            <Box>
              <Typography sx={FIELD_LABEL_SX}>
                Discount Value <span style={{ color: "#DC2626" }}>*</span>
              </Typography>
              <InputFieldBordered
                type="number"
                inputMode="decimal"
                placeholder={form.offerType === "percentage" ? "e.g. 20" : "e.g. 5.00"}
                value={form.discountValue}
                onChange={(e) => patch("discountValue", e.target.value)}
                min={0}
                step="0.01"
              />
              {errors.discountValue && (
                <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.discountValue}</Typography>
              )}
            </Box>
          )}

          {form.offerType === "percentage" && (
            <Box>
              <Typography sx={FIELD_LABEL_SX}>Max Discount Cap</Typography>
              <InputFieldBordered
                type="number"
                inputMode="decimal"
                placeholder="No cap"
                value={form.maxDiscountCap}
                onChange={(e) => patch("maxDiscountCap", e.target.value)}
                min={0}
                step="0.01"
              />
              <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.5 }}>
                Max £ discount from %
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* --- Target --- */}
      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Apply To (Target)</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Target Type</Typography>
            <Select
              value={form.targetType}
              onChange={(e) => {
                patch("targetType", e.target.value);
                patch("targetServiceId", "");
                patch("targetCategoryId", "");
                patch("targetSubCategoryId", "");
              }}
              size="small"
              sx={SELECT_SX}
            >
              {TARGET_TYPES.map((t) => (
                <MenuItem key={t.value} value={t.value}>
                  {t.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {form.targetType === "service" && (
            <Box>
              <Typography sx={FIELD_LABEL_SX}>
                Select Service <span style={{ color: "#DC2626" }}>*</span>
              </Typography>
              <Select
                value={form.targetServiceId}
                onChange={(e) => patch("targetServiceId", e.target.value)}
                size="small"
                sx={SELECT_SX}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  — Choose a service —
                </MenuItem>
                {services.map((s) => (
                  <MenuItem key={s.id ?? s._id} value={String(s.id ?? s._id)}>
                    {s.name ?? s.serviceName ?? s.title}
                  </MenuItem>
                ))}
              </Select>
              {errors.targetServiceId && (
                <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.targetServiceId}</Typography>
              )}
            </Box>
          )}

          {(form.targetType === "category" || form.targetType === "sub_category") && (
            <Box>
              <Typography sx={FIELD_LABEL_SX}>
                Select Category <span style={{ color: "#DC2626" }}>*</span>
              </Typography>
              <Select
                value={form.targetCategoryId}
                onChange={(e) => {
                  patch("targetCategoryId", e.target.value);
                  patch("targetSubCategoryId", "");
                }}
                size="small"
                sx={SELECT_SX}
                displayEmpty
              >
                <MenuItem value="" disabled>
                  — Choose a category —
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id ?? c._id} value={String(c.id ?? c._id)}>
                    {c.name ?? c.categoryName ?? c.title}
                  </MenuItem>
                ))}
              </Select>
              {errors.targetCategoryId && (
                <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.targetCategoryId}</Typography>
              )}
            </Box>
          )}

          {form.targetType === "sub_category" && (
            <Box>
              <Typography sx={FIELD_LABEL_SX}>
                Select Sub-Category <span style={{ color: "#DC2626" }}>*</span>
              </Typography>
              <Select
                value={form.targetSubCategoryId}
                onChange={(e) => patch("targetSubCategoryId", e.target.value)}
                size="small"
                sx={SELECT_SX}
                displayEmpty
                disabled={!form.targetCategoryId}
              >
                <MenuItem value="" disabled>
                  {form.targetCategoryId ? "— Choose sub-category —" : "— Select category first —"}
                </MenuItem>
                {filteredSubCats.map((sc) => (
                  <MenuItem key={sc.id ?? sc._id} value={String(sc.id ?? sc._id)}>
                    {sc.name ?? sc.subCategoryName ?? sc.title}
                  </MenuItem>
                ))}
              </Select>
              {errors.targetSubCategoryId && (
                <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.targetSubCategoryId}</Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* --- Zone Filter --- */}
      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Zone Filter</Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <RadioGroup
            row
            value={form.zoneMode}
            onChange={(e) => {
              patch("zoneMode", e.target.value);
              if (e.target.value === "all") patch("zoneIds", []);
            }}
          >
            <FormControlLabel value="all" control={<Radio size="small" />} label="All Zones" />
            <FormControlLabel value="specific" control={<Radio size="small" />} label="Specific Zones" />
          </RadioGroup>

          {form.zoneMode === "specific" && (
            <Box>
              <Typography sx={FIELD_LABEL_SX}>
                Select Zones <span style={{ color: "#DC2626" }}>*</span>
              </Typography>
              <Select
                multiple
                value={form.zoneIds}
                onChange={(e) => patch("zoneIds", e.target.value)}
                input={<OutlinedInput sx={{ borderRadius: "8px", border: "1px solid #E2E8F0", "& fieldset": { border: "none" } }} />}
                renderValue={(selected) => (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selected.map((id) => {
                      const z = zones.find((z) => String(z.id ?? z._id) === String(id));
                      return (
                        <Chip
                          key={id}
                          label={z ? (z.name ?? z.zoneName) : id}
                          size="small"
                          sx={{ bgcolor: "#EEF2FF", color: "#4338CA", fontFamily: "Switzer" }}
                        />
                      );
                    })}
                  </Box>
                )}
                sx={{ width: "100%", minHeight: "48px", fontFamily: "Switzer", fontSize: "14px" }}
              >
                {zones.map((z) => (
                  <MenuItem key={z.id ?? z._id} value={String(z.id ?? z._id)}>
                    <Checkbox checked={form.zoneIds.includes(String(z.id ?? z._id))} size="small" />
                    <ListItemText primary={z.name ?? z.zoneName} />
                  </MenuItem>
                ))}
              </Select>
              {errors.zoneIds && (
                <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.zoneIds}</Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {/* --- Validity --- */}
      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Validity & Display</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Start Date</Typography>
            <DatePicker
              value={form.startDate}
              onChange={(v) => patch("startDate", v)}
              slotProps={{
                textField: { placeholder: "Optional", sx: DATE_SX, fullWidth: true },
              }}
              slots={{ openPickerIcon: () => <TbCalendar size={18} style={{ color: "#6B7280" }} /> }}
            />
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>End Date</Typography>
            <DatePicker
              value={form.endDate}
              onChange={(v) => patch("endDate", v)}
              slotProps={{
                textField: { placeholder: "Optional", sx: DATE_SX, fullWidth: true },
              }}
              slots={{ openPickerIcon: () => <TbCalendar size={18} style={{ color: "#6B7280" }} /> }}
            />
            {errors.endDate && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.endDate}</Typography>
            )}
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Display Order</Typography>
            <InputFieldBordered
              type="number"
              inputMode="numeric"
              placeholder="1"
              value={form.displayOrder}
              onChange={(e) => patch("displayOrder", e.target.value)}
              min={1}
              step={1}
            />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const TABLE_COLUMNS = [
  { field: "sl", headerName: "SL", minWidth: 56, flex: 0.05 },
  { field: "title", headerName: "Title", minWidth: 160, flex: 0.18 },
  { field: "offerDisplay", headerName: "Offer", minWidth: 120, flex: 0.12 },
  { field: "offerTypeLabel", headerName: "Type", minWidth: 110, flex: 0.11 },
  { field: "targetDisplay", headerName: "Target", minWidth: 150, flex: 0.15 },
  { field: "zonesDisplay", headerName: "Zones", minWidth: 110, flex: 0.11 },
  { field: "startDate", headerName: "Start", minWidth: 100, flex: 0.1 },
  { field: "endDate", headerName: "End", minWidth: 100, flex: 0.1 },
  { field: "activeLabel", headerName: "Status", minWidth: 80, flex: 0.08 },
];

function offerTypeLabel(type) {
  if (type === "percentage") return "Percentage";
  if (type === "flat") return "Flat Amount";
  if (type === "free_delivery") return "Free Delivery";
  return type ?? "—";
}

function rowFromBanner(b, idx) {
  const zoneIds = parseZoneIds(b.zoneIds);
  return {
    id: b.id ?? b._id ?? idx,
    _raw: b,
    title: b.title ?? "—",
    offerDisplay: offerDisplay(b),
    offerTypeLabel: offerTypeLabel(b.offerType),
    targetDisplay: targetLabel(b),
    zonesDisplay: !zoneIds.length ? "All Zones" : `${zoneIds.length} zone(s)`,
    startDate: b.startDate ?? "—",
    endDate: b.endDate ?? "—",
    isActive: b.isActive,
    activeLabel: b.isActive ? "Active" : "Inactive",
  };
}

export default function BannersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { success, error: toastError } = useToaster();

  const { data: bannersResponse, isLoading: bannersLoading, refetch } = useGetAllBannersQuery({ page, limit });
  const { data: servicesResponse } = useGetAllServicesQuery();
  const { data: categoriesResponse } = useGetCategoriesQuery();
  const { data: subCatsResponse } = useGetSubCategoriesQuery();
  const { data: zonesResponse } = useGetAllZonesQuery();

  const [createBanner, { isLoading: creating }] = useCreateBannerMutation();
  const [updateBanner, { isLoading: updating }] = useUpdateBannerMutation();
  const [deleteBanner, { isLoading: deleting }] = useDeleteBannerMutation();

  const services = useMemo(() => extractList(servicesResponse, "services", "data"), [servicesResponse]);
  const categories = useMemo(() => extractList(categoriesResponse, "categories", "data"), [categoriesResponse]);
  const subCategories = useMemo(() => extractList(subCatsResponse, "subCategories", "subCat", "data"), [subCatsResponse]);
  const zones = useMemo(() => extractList(zonesResponse, "zones", "data"), [zonesResponse]);

  const { banners, total } = useMemo(() => extractBanners(bannersResponse), [bannersResponse]);

  const tableRows = useMemo(
    () => banners.map((b, i) => ({ ...rowFromBanner(b, i), sl: (page - 1) * limit + i + 1 })),
    [banners, page, limit]
  );

  const stats = useMemo(() => {
    const active = tableRows.filter((r) => r.isActive).length;
    const inactive = tableRows.filter((r) => !r.isActive).length;
    const now = dayjs();
    const expiringSoon = tableRows.filter((r) => {
      if (!r.endDate || r.endDate === "—") return false;
      const d = dayjs(r.endDate);
      if (!d.isValid()) return false;
      const diff = d.diff(now, "day");
      return diff >= 0 && diff <= 7;
    }).length;
    return { total, active, expiringSoon, inactive };
  }, [tableRows, total]);

  const patch = useCallback((key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const resetForm = () => {
    setForm(initialForm());
    setErrors({});
  };

  const openCreate = () => {
    resetForm();
    setEditBanner(null);
    setCreateOpen(true);
  };

  const openEdit = (row) => {
    const b = row._raw;
    setForm({
      title: b.title ?? "",
      description: b.description ?? "",
      bannerImage: resolveBannerImageUrl(b.bannerImage),
      offerType: b.offerType ?? "percentage",
      discountValue: String(b.discountValue ?? ""),
      maxDiscountCap: String(b.maxDiscountCap ?? ""),
      targetType: b.targetType ?? "global",
      targetServiceId: b.targetType === "service" ? String(b.targetId ?? "") : "",
      targetCategoryId:
        b.targetType === "category" || b.targetType === "sub_category"
          ? String(b.targetId ?? "")
          : "",
      targetSubCategoryId: b.targetType === "sub_category" ? String(b.targetId ?? "") : "",
      zoneMode: parseZoneIds(b.zoneIds).length ? "specific" : "all",
      zoneIds: parseZoneIds(b.zoneIds).map(String),
      startDate: b.startDate ? dayjs(b.startDate) : null,
      endDate: b.endDate ? dayjs(b.endDate) : null,
      displayOrder: String(b.displayOrder ?? "1"),
      showOnHome: b.showOnHome ?? true,
      isActive: b.isActive ?? true,
    });
    setEditBanner(row);
    setCreateOpen(true);
  };

  const closeModal = () => {
    setCreateOpen(false);
    setEditBanner(null);
    resetForm();
  };

  const resolveTargetId = () => {
    if (form.targetType === "service") return form.targetServiceId ? Number(form.targetServiceId) : null;
    if (form.targetType === "category") return form.targetCategoryId ? Number(form.targetCategoryId) : null;
    if (form.targetType === "sub_category") return form.targetSubCategoryId ? Number(form.targetSubCategoryId) : null;
    return null;
  };

  const validate = () => {
    const next = {};
    if (!form.title.trim()) next.title = "Title is required.";

    if (form.offerType !== "free_delivery") {
      const val = parseFloat(String(form.discountValue).trim());
      if (!Number.isFinite(val) || val <= 0) next.discountValue = "Enter a valid discount value greater than zero.";
      if (form.offerType === "percentage" && val > 100) next.discountValue = "Percentage cannot exceed 100.";
    }

    if (form.targetType === "service" && !form.targetServiceId)
      next.targetServiceId = "Please select a service.";
    if ((form.targetType === "category" || form.targetType === "sub_category") && !form.targetCategoryId)
      next.targetCategoryId = "Please select a category.";
    if (form.targetType === "sub_category" && !form.targetSubCategoryId)
      next.targetSubCategoryId = "Please select a sub-category.";

    if (form.zoneMode === "specific" && !form.zoneIds.length)
      next.zoneIds = "Select at least one zone.";

    if (form.startDate && form.endDate) {
      const a = dayjs(form.startDate).startOf("day");
      const b = dayjs(form.endDate).startOf("day");
      if (a.isValid() && b.isValid() && b.isBefore(a)) next.endDate = "End date must be on or after start date.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => {
    const fd = new FormData();

    fd.append("title", form.title.trim());
    if (form.description.trim()) fd.append("description", form.description.trim());

    fd.append("offerType", form.offerType);
    if (form.offerType !== "free_delivery") {
      fd.append("discountValue", String(parseFloat(String(form.discountValue))));
    }
    if (form.offerType === "percentage" && form.maxDiscountCap) {
      fd.append("maxDiscountCap", String(parseFloat(form.maxDiscountCap)));
    }

    fd.append("targetType", form.targetType);
    const targetId = resolveTargetId();
    if (targetId !== null) fd.append("targetId", String(targetId));

    // Zone IDs — comma-separated string e.g. "1,3"  (empty string = all zones)
    const zoneIds = form.zoneMode === "specific" ? form.zoneIds.map(Number).filter(Boolean) : [];
    fd.append("zoneIds", zoneIds.join(","));

    if (form.startDate) fd.append("startDate", dayjs(form.startDate).format("YYYY-MM-DD"));
    if (form.endDate)   fd.append("endDate",   dayjs(form.endDate).format("YYYY-MM-DD"));

    fd.append("displayOrder", String(parseInt(form.displayOrder) || 1));
    fd.append("showOnHome",   String(form.showOnHome));
    fd.append("isActive",     String(form.isActive));

    // Only attach image when user picked a new File — skip strings (existing URL)
    if (form.bannerImage instanceof File) {
      fd.append("bannerImage", form.bannerImage);
    }

    return fd;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const body = buildPayload();          // FormData
    const titleForToast = form.title.trim();

    try {
      if (editBanner) {
        await updateBanner({ id: editBanner.id, body }).unwrap();
        success(`Banner "${titleForToast}" updated successfully.`);
      } else {
        await createBanner(body).unwrap();
        success(`Banner "${titleForToast}" created successfully.`);
      }
      refetch();
      closeModal();
    } catch (err) {
      const msg =
        err?.data?.message ?? err?.data?.error ?? err?.error ??
        (typeof err?.data === "string" ? err.data : null);
      toastError(msg ? String(msg) : "Something went wrong. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBanner(deleteTarget.id).unwrap();
      success(`Banner "${deleteTarget.title}" deleted.`);
      refetch();
    } catch {
      toastError("Could not delete banner.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const columnsWithActions = useMemo(
    () => [
      ...TABLE_COLUMNS,
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 100,
        flex: 0.1,
        renderCell: (params) => (
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Box
              onClick={() => openEdit(params.row)}
              sx={{ cursor: "pointer", color: "#0000A0", "&:hover": { color: "#00008B" } }}
            >
              <TbEdit size={18} />
            </Box>
            <Box
              onClick={() => setDeleteTarget(params.row)}
              sx={{ cursor: "pointer", color: "#DC2626", "&:hover": { color: "#B91C1C" } }}
            >
              <TbTrash size={18} />
            </Box>
          </Box>
        ),
      },
    ],
    []
  );

  const isBusy = creating || updating;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column", rowGap: 2.5 }}>
        {/* Page Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
          <Box className="flex items-center gap-x-5">
            <Typography color="blue.50">
              <TbSparkles size="24px" />
            </Typography>
            <Typography variant="h4" fontFamily="Switzer" color="grey.20">
              Banners &amp; Offers
            </Typography>
          </Box>
          <ButtonBlue size="medium" startIcon={<TbPlus size={20} />} onClick={openCreate}>
            Create Banner
          </ButtonBlue>
        </Box>

        {/* Stats */}
        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 font-Inter">
          {[
            { label: "Total Banners", value: String(stats.total), bgColor: "bg-purple50" },
            { label: "Active", value: String(stats.active), bgColor: "bg-red50" },
            { label: "Expiring Soon", value: String(stats.expiringSoon), bgColor: "bg-green50" },
            { label: "Inactive", value: String(stats.inactive), bgColor: "bg-green200" },
          ].map((s) => (
            <StatCard key={s.label} title={s.label} value={s.value} bgColor={s.bgColor} />
          ))}
        </Box>

        {/* Table */}
        <DataTable
          data={tableRows}
          columns={columnsWithActions}
          searchPlaceholder="Search banners…"
          showFilters={false}
          showDateRange={false}
          showDownload={false}
          height={560}
          serverSidePagination
          totalRows={total}
          currentPage={page}
          pageSize={limit}
          onPageChange={(p) => setPage(p)}
          onPageSizeChange={(l) => { setLimit(l); setPage(1); }}
        />

        {/* Create / Edit Modal */}
        <ModalComponent
          open={createOpen}
          onClose={closeModal}
          title={editBanner ? "Edit Banner" : "Create Banner"}
          width={Math.min(760, typeof window !== "undefined" ? window.innerWidth - 48 : 760)}
          maxHeight="93vh"
          primaryAction={{
            label: editBanner ? "Save Changes" : "Create Banner",
            onClick: handleSubmit,
            disabled: isBusy || bannersLoading,
            isLoading: isBusy,
          }}
          secondaryAction={{
            label: "Cancel",
            onClick: closeModal,
            disabled: isBusy,
          }}
        >
          <BannerForm
            form={form}
            errors={errors}
            patch={patch}
            services={services}
            categories={categories}
            subCategories={subCategories}
            zones={zones}
          />
        </ModalComponent>

        {/* Delete Confirmation Modal */}
        <ModalComponent
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          title="Delete Banner"
          width={440}
          primaryAction={{
            label: "Delete",
            onClick: handleDelete,
            disabled: deleting,
            isLoading: deleting,
          }}
          secondaryAction={{
            label: "Cancel",
            onClick: () => setDeleteTarget(null),
            disabled: deleting,
          }}
        >
          <Typography sx={{ fontSize: 14, color: "#374151" }}>
            Are you sure you want to delete the banner{" "}
            <strong>&quot;{deleteTarget?.title}&quot;</strong>? This action cannot be undone.
          </Typography>
        </ModalComponent>
      </Box>
    </LocalizationProvider>
  );
}
