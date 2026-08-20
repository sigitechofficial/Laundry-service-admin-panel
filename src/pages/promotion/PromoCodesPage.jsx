import { useMemo, useState, useCallback } from "react";
import dayjs from "dayjs";
import {
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
} from "../../design-system";
import { PaginationBar, Toggle } from "../misc-kit";
import {
  DirectoryActions,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import useToaster from "../../components/ui/Toaster";
import { useAddCouponMutation, useGetAllCouponsQuery } from "../../store/services/api";
import { TbPlus } from "../../shared/icons/index";
import { formatDate, formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";

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
  startDate: "",
  expiryDate: "",
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

function money(amount, source) {
  return formatMoney(
    amount,
    resolveCurrencySymbol(source),
    source?.currency ?? source?.currencyCode ?? source?.currency_code
  );
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
    discountDisplay:
      body.discountType === "percentage"
        ? `${body.discountValue}%`
        : money(body.discountValue, body),
    minOrder: body.minOrderAmount != null ? money(body.minOrderAmount, body) : "—",
    maxCap: body.maxDiscountCap != null ? money(body.maxDiscountCap, body) : "—",
    usedCount: body.usedCount ?? 0,
    usageLimitLabel: usageLimit == null ? "∞" : String(usageLimit),
    perUser: String(body.perUserLimit ?? 1),
    startDate: formatDate(body.startDate),
    expiryDate: formatDate(body.expiryDate),
    expiryDateRaw: body.expiryDate,
    isActive: body.isActive,
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
  const list = Array.isArray(coupons) ? coupons : [];
  // When `data` is a bare coupon array, `.count`/`.total` are missing (and
  // `Number(0)` is finite), so fall back to the list length.
  const rawTotal =
    pagination?.total ??
    payload?.total ??
    payload?.totalCount ??
    (payloadList ? undefined : payload?.count) ??
    root?.total ??
    (Array.isArray(root) ? undefined : root?.count);
  const parsed = Number(rawTotal);
  const total =
    Number.isFinite(parsed) && !(parsed === 0 && list.length > 0)
      ? parsed
      : list.length;
  return {
    coupons: list,
    total,
  };
}

function CreatePromoCodeForm({ form, errors, patch, discountHint }) {
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        Required fields are marked. Optional fields can be left blank.
      </p>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Basic</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Code*" htmlFor="promo-code" error={errors.code}>
            <Input
              id="promo-code"
              placeholder="e.g. SUMMER20"
              value={form.code}
              onChange={(e) => patch("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
              autoComplete="off"
              error={Boolean(errors.code)}
            />
          </Field>
          <Field label="Description*" htmlFor="promo-desc" error={errors.description}>
            <Input
              id="promo-desc"
              placeholder="e.g. Get 10% off your first order"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
              autoComplete="off"
              error={Boolean(errors.description)}
            />
          </Field>
          <Field label="Active">
            <Toggle
              checked={form.isActive}
              onChange={(e) => patch("isActive", e.target.checked)}
              label={form.isActive ? "Usable when within dates and limits" : "Disabled"}
            />
          </Field>
        </div>
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Discount</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Discount type*">
            <Select
              aria-label="Discount type"
              value={form.discountType}
              onChange={(value) => patch("discountType", value)}
              options={[
                { value: "percentage", label: "Percentage (% off)" },
                { value: "flat", label: "Flat amount (off)" },
              ]}
            />
          </Field>
          <Field label="Discount value*" htmlFor="promo-value" hint={discountHint} error={errors.discountValue}>
            <Input
              id="promo-value"
              type="number"
              inputMode="decimal"
              placeholder={form.discountType === "percentage" ? "10" : "5.00"}
              value={form.discountValue}
              onChange={(e) => patch("discountValue", e.target.value)}
              min={0}
              step="0.01"
              error={Boolean(errors.discountValue)}
            />
          </Field>
        </div>
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Conditions</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Min order amount" htmlFor="promo-min" hint="Minimum cart value">
            <Input
              id="promo-min"
              type="number"
              inputMode="decimal"
              placeholder="No minimum"
              value={form.minOrderAmount}
              onChange={(e) => patch("minOrderAmount", e.target.value)}
              min={0}
              step="0.01"
            />
          </Field>
          <Field label="Max discount cap" htmlFor="promo-cap" hint="For % discounts">
            <Input
              id="promo-cap"
              type="number"
              inputMode="decimal"
              placeholder="No cap"
              value={form.maxDiscountCap}
              onChange={(e) => patch("maxDiscountCap", e.target.value)}
              min={0}
              step="0.01"
            />
          </Field>
          <Field label="Used count" htmlFor="promo-used" hint="Current redemption count" error={errors.usedCount}>
            <Input
              id="promo-used"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={form.usedCount}
              onChange={(e) => patch("usedCount", e.target.value)}
              min={0}
              step={1}
              error={Boolean(errors.usedCount)}
            />
          </Field>
        </div>
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Usage limits</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Global usage limit" htmlFor="promo-usage" error={errors.usageLimit}>
            <Input
              id="promo-usage"
              type="number"
              inputMode="numeric"
              placeholder="Unlimited"
              value={form.usageLimit}
              onChange={(e) => patch("usageLimit", e.target.value)}
              min={1}
              step={1}
              error={Boolean(errors.usageLimit)}
            />
          </Field>
          <Field label="Per user limit" htmlFor="promo-per-user" error={errors.perUserLimit}>
            <Input
              id="promo-per-user"
              type="number"
              inputMode="numeric"
              placeholder="1"
              value={form.perUserLimit}
              onChange={(e) => patch("perUserLimit", e.target.value)}
              min={1}
              step={1}
              error={Boolean(errors.perUserLimit)}
            />
          </Field>
        </div>
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Validity</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Start date" htmlFor="promo-start">
            <Input
              id="promo-start"
              type="date"
              value={form.startDate}
              onChange={(e) => patch("startDate", e.target.value)}
            />
          </Field>
          <Field label="Expiry date" htmlFor="promo-expiry" error={errors.expiryDate}>
            <Input
              id="promo-expiry"
              type="date"
              value={form.expiryDate}
              onChange={(e) => patch("expiryDate", e.target.value)}
              error={Boolean(errors.expiryDate)}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

export default function PromoCodesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState(initialPromoForm);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { success, error: toastError, info } = useToaster();
  const { data: couponsResponse, isLoading: isCouponsLoading, isError, refetch } =
    useGetAllCouponsQuery({
      page,
      limit,
      isActive: true,
    });
  const [addCoupon, { isLoading }] = useAddCouponMutation();

  const discountHint = useMemo(() => {
    if (form.discountType === "percentage") return "Percentage 0–100 (e.g. 10 for 10% off).";
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
      if (!r.expiryDateRaw || r.expiryDate === "—") return false;
      const exp = dayjs(r.expiryDateRaw);
      if (!exp.isValid()) return false;
      const days = exp.diff(now, "day");
      return days >= 0 && days <= 7;
    }).length;
    const disabled = tableRows.filter((r) => !r.isActive).length;
    return { total, active, expiringSoon, disabled };
  }, [tableRows, total]);

  const tableData = useMemo(
    () => tableRows.map((r, i) => ({ ...r, sl: (page - 1) * limit + i + 1 })),
    [tableRows, page, limit]
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
    if (perUser !== null && perUser < 1) next.perUserLimit = "Must be at least 1.";

    const usage = parseOptionalInt(form.usageLimit);
    if (usage !== null && usage < 1) next.usageLimit = "Must be at least 1 or leave blank for unlimited.";

    const usedCount = parseOptionalInt(form.usedCount);
    if (usedCount !== null && usedCount < 0) next.usedCount = "Used count cannot be negative.";

    if (form.startDate && form.expiryDate && dayjs(form.expiryDate).isBefore(dayjs(form.startDate), "day")) {
      next.expiryDate = "Expiry must be on or after start date.";
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
      startDate: form.startDate || null,
      expiryDate: form.expiryDate || null,
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
      if (msg) toastError(String(msg));
      else {
        info("Confirm admin/addCoupon with your backend if this request should succeed.");
        toastError("Could not create coupon.");
      }
    }
  };

  const columns = [
    {
      key: "code",
      header: "Code",
      render: (row) => (
        <DirectoryIdentity name={row.code} meta={row.description} />
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <DirectoryStatusPill active={row.isActive} activeLabel="Active" inactiveLabel="Off" />
      ),
    },
    {
      key: "discountDisplay",
      header: "Discount",
      render: (row) => (
        <DirectoryMetric value={row.discountDisplay} hint={row.discountLabel} />
      ),
    },
    {
      key: "usedCount",
      header: "Used",
      render: (row) => (
        <DirectoryMetric value={row.usedCount} hint={`Limit ${row.usageLimitLabel}`} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => setViewRow(row)}>
            View
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Coupons"
        description="Create and review promo codes used at checkout."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <TbPlus size={18} />
            Create code
          </Button>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total codes", value: stats.total, tone: "brand" },
          { label: "Active", value: stats.active, tone: "success" },
          { label: "Expiring soon", value: stats.expiringSoon, tone: "warning" },
          { label: "Disabled", value: stats.disabled, tone: "neutral" },
        ]}
      />

      {isError ? (
        <p style={{ color: "var(--danger)", margin: 0 }}>Could not load coupons.</p>
      ) : (
        <DirectoryTableWrap
          footer={
            <PaginationBar
              page={page}
              limit={limit}
              total={total}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next);
                setPage(1);
              }}
            />
          }
        >
          <Table
            columns={columns}
            rows={isCouponsLoading ? [] : tableData}
            rowKey={(row) => row.id}
            empty={isCouponsLoading ? "Loading coupons…" : "No coupons yet."}
          />
        </DirectoryTableWrap>
      )}

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.code || "Coupon"}
        onClose={() => setViewRow(null)}
        fields={[
          { label: "Code", value: viewRow?.code },
          { label: "Description", value: viewRow?.description },
          { label: "Type", value: viewRow?.discountLabel },
          { label: "Value", value: viewRow?.discountDisplay },
          { label: "Min order", value: viewRow?.minOrder },
          { label: "Max cap", value: viewRow?.maxCap },
          { label: "Used", value: viewRow?.usedCount },
          { label: "Global limit", value: viewRow?.usageLimitLabel },
          { label: "Per user", value: viewRow?.perUser },
          { label: "Start", value: viewRow?.startDate },
          { label: "Expiry", value: viewRow?.expiryDate },
          { label: "Status", value: viewRow?.isActive ? "Active" : "Off" },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={closeModal}
        title="Create coupon"
        primaryLabel="Create coupon"
        onPrimary={handleCreateSubmit}
        primaryDisabled={isLoading || isCouponsLoading}
        secondaryDisabled={isLoading || isCouponsLoading}
        size="xl"
      >
        <CreatePromoCodeForm form={form} errors={errors} patch={patch} discountHint={discountHint} />
      </Modal>
    </div>
  );
}
