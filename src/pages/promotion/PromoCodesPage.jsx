import { useMemo, useState, useCallback } from "react";
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
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
import { useAddCouponMutation, useGetAllCouponsQuery } from "../../store/services/api";
import { TbCalendar, TbPlus } from "../../shared/icons/index";

const SECTION_CARD_SX = {
  borderRadius: "12px",
  border: "1px solid #E5E7EB",
  boxShadow: "0 1px 4px 0 rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.04)",
  overflow: "hidden",
  bgcolor: "#fff",
};

const FIELD_LABEL_SX = {
  mb: 0.75,
  fontSize: "11px",
  fontWeight: 700,
  color: "#64748B",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const SELECT_FIELD_SX = {
  width: "100%",
  height: "48px",
  borderRadius: "8px",
  border: "1px solid #E2E8F0",
  bgcolor: "#fff",
  fontFamily: "Switzer",
  fontSize: "14px",
  "& .MuiSelect-select": {
    py: "12px",
    px: "14px",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    border: "none",
  },
};

const DATE_FIELD_SX = {
  width: "100%",
  "& .MuiOutlinedInput-root": {
    height: "48px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    fontFamily: "Switzer",
    bgcolor: "#fff",
    "& fieldset": {
      border: "none",
    },
  },
};

const MENU_PROPS = {
  PaperProps: { sx: { maxHeight: 280 } },
};

const initialPromoForm = () => ({
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  minOrderAmount: "",
  maxDiscountCap: "",
  usageLimit: "",
  usedCount: "0",
  perUserLimit: "1",
  startDate: null,
  expiryDate: null,
  isActive: true,
});

function parseOptionalInt(s) {
  const t = String(s).trim();
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

function parseOptionalDecimal(s) {
  const t = String(s).trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(v) {
  if (v == null || v === "") return "—";
  return Number(v).toFixed(2);
}

function rowFromPayload(body, id) {
  const usageLimit = body.usageLimit;
  return {
    id,
    code: body.code,
    description: body.description || "—",
    discountType: body.discountType,
    discountValue: body.discountValue,
    discountLabel: body.discountType === "percentage" ? "Percentage" : "Flat",
    discountDisplay: body.discountType === "percentage" ? `${body.discountValue}%` : Number(body.discountValue).toFixed(2),
    minOrder: body.minOrderAmount != null ? formatMoney(body.minOrderAmount) : "—",
    maxCap: body.maxDiscountCap != null ? formatMoney(body.maxDiscountCap) : "—",
    usedCount: body.usedCount ?? 0,
    usageLimitLabel: usageLimit == null ? "∞" : String(usageLimit),
    perUser: String(body.perUserLimit ?? 1),
    startDate: body.startDate || "—",
    expiryDate: body.expiryDate || "—",
    isActive: body.isActive,
    activeLabel: body.isActive ? "Active" : "Off",
  };
}

function extractCouponsData(response) {
  const root = response?.data ?? response;
  const payload = root?.data ?? root;
  const payloadList = Array.isArray(payload) ? payload : null;
  const coupons =
    payloadList ??
    payload?.coupons ??
    payload?.allCoupons ??
    payload?.rows ??
    payload?.results ??
    root?.data ??
    root?.coupons ??
    [];
  const pagination = root?.meta?.pagination ?? payload?.meta?.pagination;
  const total =
    pagination?.total ??
    payload?.total ??
    payload?.totalCount ??
    payload?.count ??
    root?.total ??
    root?.count ??
    0;
  return {
    coupons: Array.isArray(coupons) ? coupons : [],
    total: Number.isFinite(Number(total))
      ? Number(total)
      : Array.isArray(coupons)
        ? coupons.length
        : 0,
  };
}

function CreatePromoCodeForm({ form, errors, patch, discountHint }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Typography sx={{ fontSize: 12, color: "#64748B" }}>
        Required fields are marked. Optional fields can be left blank.
      </Typography>

      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Basic</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>
              Code <Typography component="span" sx={{ color: "#DC2626" }}>*</Typography>
            </Typography>
            <InputFieldBordered
              placeholder="e.g. SUMMER20"
              value={form.code}
              onChange={(e) => patch("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
              autoComplete="off"
            />
            {errors.code && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.code}</Typography>
            )}
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>
              Description <Typography component="span" sx={{ color: "#DC2626" }}>*</Typography>
            </Typography>
            <InputFieldBordered
              placeholder="e.g. Get 10% off your first order"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              autoComplete="off"
            />
            {errors.description && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.description}</Typography>
            )}
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Active</Typography>
            <FormControlLabel
              control={
                <Switch checked={form.isActive} onChange={(e) => patch("isActive", e.target.checked)} color="primary" />
              }
              label={
                <Typography sx={{ fontSize: 13, color: "#334155" }}>
                  {form.isActive ? "Usable when within dates and limits" : "Disabled"}
                </Typography>
              }
            />
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Discount</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>
              Discount type <Typography component="span" sx={{ color: "#DC2626" }}>*</Typography>
            </Typography>
            <Select
              value={form.discountType}
              onChange={(e) => patch("discountType", e.target.value)}
              size="small"
              sx={SELECT_FIELD_SX}
              MenuProps={MENU_PROPS}
            >
              <MenuItem value="percentage">Percentage (% off)</MenuItem>
              <MenuItem value="flat">Flat amount (off)</MenuItem>
            </Select>
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>
              Discount value <Typography component="span" sx={{ color: "#DC2626" }}>*</Typography>
            </Typography>
            <InputFieldBordered
              type="number"
              inputMode="decimal"
              placeholder={form.discountType === "percentage" ? "10" : "5.00"}
              value={form.discountValue}
              onChange={(e) => patch("discountValue", e.target.value)}
              min={0}
              step="0.01"
            />
            <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.5 }}>{discountHint}</Typography>
            {errors.discountValue && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.discountValue}</Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Conditions</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Min order amount</Typography>
            <InputFieldBordered
              type="number"
              inputMode="decimal"
              placeholder="No minimum"
              value={form.minOrderAmount}
              onChange={(e) => patch("minOrderAmount", e.target.value)}
              min={0}
              step="0.01"
            />
            <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.5 }}>Minimum cart value</Typography>
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Max discount cap</Typography>
            <InputFieldBordered
              type="number"
              inputMode="decimal"
              placeholder="No cap"
              value={form.maxDiscountCap}
              onChange={(e) => patch("maxDiscountCap", e.target.value)}
              min={0}
              step="0.01"
            />
            <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.5 }}>For % discounts</Typography>
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Used count</Typography>
            <InputFieldBordered
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={form.usedCount}
              onChange={(e) => patch("usedCount", e.target.value)}
              min={0}
              step={1}
            />
            {errors.usedCount && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.usedCount}</Typography>
            )}
            <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.5 }}>Current redemption count</Typography>
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Usage limits</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Global usage limit</Typography>
            <InputFieldBordered
              type="number"
              inputMode="numeric"
              placeholder="Unlimited"
              value={form.usageLimit}
              onChange={(e) => patch("usageLimit", e.target.value)}
              min={1}
              step={1}
            />
            {errors.usageLimit && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.usageLimit}</Typography>
            )}
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Per user limit</Typography>
            <InputFieldBordered
              type="number"
              inputMode="numeric"
              placeholder="1"
              value={form.perUserLimit}
              onChange={(e) => patch("perUserLimit", e.target.value)}
              min={1}
              step={1}
            />
            {errors.perUserLimit && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.perUserLimit}</Typography>
            )}
          </Box>
        </Box>
      </Box>

      <Box>
        <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Validity</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 2 }}>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Start date</Typography>
            <DatePicker
              value={form.startDate}
              onChange={(v) => patch("startDate", v)}
              slotProps={{
                textField: { placeholder: "Optional", sx: DATE_FIELD_SX, fullWidth: true },
              }}
              slots={{ openPickerIcon: () => <TbCalendar size={18} style={{ color: "#6B7280" }} /> }}
            />
          </Box>
          <Box>
            <Typography sx={FIELD_LABEL_SX}>Expiry date</Typography>
            <DatePicker
              value={form.expiryDate}
              onChange={(v) => patch("expiryDate", v)}
              slotProps={{
                textField: { placeholder: "Optional", sx: DATE_FIELD_SX, fullWidth: true },
              }}
              slots={{ openPickerIcon: () => <TbCalendar size={18} style={{ color: "#6B7280" }} /> }}
            />
            {errors.expiryDate && (
              <Typography sx={{ fontSize: 12, color: "#DC2626", mt: 0.5 }}>{errors.expiryDate}</Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

const TABLE_COLUMNS = [
  { field: "sl", headerName: "SL", minWidth: 56, flex: 0.08 },
  { field: "code", headerName: "Code", minWidth: 120, flex: 0.12 },
  { field: "description", headerName: "Description", minWidth: 180, flex: 0.18 },
  { field: "discountLabel", headerName: "Type", minWidth: 100, flex: 0.1 },
  { field: "discountDisplay", headerName: "Value", minWidth: 88, flex: 0.09 },
  { field: "minOrder", headerName: "Min order", minWidth: 96, flex: 0.1 },
  { field: "maxCap", headerName: "Max cap", minWidth: 88, flex: 0.09 },
  { field: "usedCount", headerName: "Used", minWidth: 64, flex: 0.07 },
  { field: "usageLimitLabel", headerName: "Global limit", minWidth: 88, flex: 0.09 },
  { field: "perUser", headerName: "Per user", minWidth: 72, flex: 0.08 },
  { field: "startDate", headerName: "Start", minWidth: 100, flex: 0.1 },
  { field: "expiryDate", headerName: "Expiry", minWidth: 100, flex: 0.1 },
  { field: "activeLabel", headerName: "Status", minWidth: 80, flex: 0.08 },
];

export default function PromoCodesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(initialPromoForm);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { success, error: toastError, info } = useToaster();
  const { data: couponsResponse, isLoading: isCouponsLoading, refetch } = useGetAllCouponsQuery({
    page,
    limit,
    isActive: true,
  });
  const [addCoupon, { isLoading }] = useAddCouponMutation();

  const discountHint = useMemo(() => {
    if (form.discountType === "percentage") {
      return "Percentage 0–100 (e.g. 10 for 10% off).";
    }
    return "Fixed amount off the order (e.g. 5.00).";
  }, [form.discountType]);

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
    setForm(initialPromoForm());
    setErrors({});
  };

  const closeModal = () => {
    setCreateOpen(false);
    resetForm();
  };

  const { coupons, total } = useMemo(
    () => extractCouponsData(couponsResponse),
    [couponsResponse]
  );

  const tableRows = useMemo(
    () =>
      coupons.map((coupon, idx) =>
        rowFromPayload(coupon, coupon?.id ?? coupon?._id ?? `${page}-${idx}`)
      ),
    [coupons, page]
  );

  const stats = useMemo(() => {
    const active = tableRows.filter((r) => r.isActive).length;
    const now = dayjs();
    const expiringSoon = tableRows.filter((r) => {
      if (!r.expiryDate || r.expiryDate === "—") return false;
      const exp = dayjs(r.expiryDate);
      if (!exp.isValid()) return false;
      const days = exp.diff(now, "day");
      return days >= 0 && days <= 7;
    }).length;
    const disabled = tableRows.filter((r) => !r.isActive).length;
    return { total, active, expiringSoon, disabled };
  }, [tableRows]);

  const tableData = useMemo(
    () => tableRows.map((r, i) => ({ ...r, sl: i + 1 })),
    [tableRows]
  );

  const validate = () => {
    const next = {};
    const code = form.code.trim().toUpperCase().replace(/\s/g, "");
    if (!code) next.code = "Code is required.";
    if (!String(form.description).trim()) next.description = "Description is required.";

    const rawVal = String(form.discountValue).trim();
    const val = parseFloat(rawVal);
    if (rawVal === "" || !Number.isFinite(val) || val <= 0) {
      next.discountValue = "Enter a valid discount greater than zero.";
    } else if (form.discountType === "percentage" && val > 100) {
      next.discountValue = "Percentage cannot exceed 100.";
    }

    const perUser = parseOptionalInt(form.perUserLimit);
    if (perUser !== null && perUser < 1) {
      next.perUserLimit = "Must be at least 1.";
    }

    const usage = parseOptionalInt(form.usageLimit);
    if (usage !== null && usage < 1) {
      next.usageLimit = "Must be at least 1 or leave blank for unlimited.";
    }

    const usedCount = parseOptionalInt(form.usedCount);
    if (usedCount !== null && usedCount < 0) {
      next.usedCount = "Used count cannot be negative.";
    }

    if (form.startDate && form.expiryDate) {
      const a = dayjs(form.startDate).startOf("day");
      const b = dayjs(form.expiryDate).startOf("day");
      if (a.isValid() && b.isValid() && b.isBefore(a)) {
        next.expiryDate = "Expiry must be on or after start date.";
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const buildPayload = () => {
    const code = form.code.trim().toUpperCase().replace(/\s/g, "");
    const discountValue = parseFloat(String(form.discountValue).trim());
    return {
      code,
      description: String(form.description).trim(),
      discountType: form.discountType,
      discountValue,
      minOrderAmount: parseOptionalDecimal(form.minOrderAmount),
      maxDiscountCap: parseOptionalDecimal(form.maxDiscountCap),
      usageLimit: parseOptionalInt(form.usageLimit),
      usedCount: parseOptionalInt(form.usedCount) ?? 0,
      perUserLimit: parseOptionalInt(form.perUserLimit) ?? 1,
      startDate: form.startDate ? dayjs(form.startDate).format("YYYY-MM-DD") : null,
      expiryDate: form.expiryDate ? dayjs(form.expiryDate).format("YYYY-MM-DD") : null,
      isActive: form.isActive,
    };
  };

  const handleCreateSubmit = async () => {
    if (!validate()) return;

    const body = buildPayload();

    try {
      await addCoupon(body).unwrap();
      success(`Coupon "${body.code}" was created.`);
      refetch();
      closeModal();
    } catch (err) {
      const msg =
        err?.data?.message ||
        err?.data?.error ||
        err?.error ||
        (typeof err?.data === "string" ? err.data : null);
      if (msg) {
        toastError(String(msg));
      } else {
        info("Confirm admin/addCoupon with your backend if this request should succeed.");
        toastError("Could not create coupon.");
      }
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ width: "100%", display: "flex", flexDirection: "column", rowGap: 2.5 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Typography sx={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em" }}>
            Coupons
          </Typography>
          <ButtonBlue size="medium" startIcon={<TbPlus size={20} />} onClick={() => setCreateOpen(true)}>
            Create code
          </ButtonBlue>
        </Box>

        <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 font-Inter">
          {[
            { label: "Total Codes", value: String(stats.total), bgColor: "bg-purple50" },
            { label: "Active", value: String(stats.active), bgColor: "bg-red50" },
            { label: "Expiring Soon", value: String(stats.expiringSoon), bgColor: "bg-green50" },
            { label: "Disabled", value: String(stats.disabled), bgColor: "bg-green200" },
          ].map((s) => (
            <StatCard
              key={s.label}
              title={s.label}
              value={s.value}
              bgColor={s.bgColor}
            />
          ))}
        </Box>

        <DataTable
          data={tableData}
          columns={TABLE_COLUMNS}
          searchPlaceholder="Search codes…"
          showFilters={false}
          showDateRange={false}
          showDownload={false}
          height={560}
          serverSidePagination
          totalRows={total}
          currentPage={page}
          pageSize={limit}
          onPageChange={(nextPage) => setPage(nextPage)}
          onPageSizeChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />

        <ModalComponent
          open={createOpen}
          onClose={closeModal}
          title="Create coupon"
          width={Math.min(720, typeof window !== "undefined" ? window.innerWidth - 48 : 720)}
          maxHeight="92vh"
          primaryAction={{
            label: "Create coupon",
            onClick: handleCreateSubmit,
            disabled: isLoading || isCouponsLoading,
            isLoading: isLoading || isCouponsLoading,
          }}
          secondaryAction={{
            label: "Cancel",
            onClick: closeModal,
            disabled: isLoading || isCouponsLoading,
          }}
        >
          <CreatePromoCodeForm form={form} errors={errors} patch={patch} discountHint={discountHint} />
        </ModalComponent>
      </Box>
    </LocalizationProvider>
  );
}
