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
import { CheckRow, PaginationBar, Toggle } from "../misc-kit";
import useToaster from "../../components/ui/Toaster";
import {
  IMAGE_UPLOAD_ACCEPT,
  acceptImageFile,
  validateImageFile,
} from "../../utilities/imageUploadPolicy";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import {
  useCreateBannerMutation,
  useDeleteBannerMutation,
  useGetAllBannersQuery,
  useGetAllServicesQuery,
  useGetAllZonesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useUpdateBannerMutation,
} from "../../store/services/api";
import { formatDate, formatMoney, joinMediaUrl, resolveCurrencySymbol } from "../../utilities/formatters";
import {
  DirectoryActions,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";

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
  startDate: "",
  endDate: "",
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
  const banners = response?.data?.banners ?? [];
  const total =
    response?.meta?.pagination?.total ??
    response?.data?.meta?.pagination?.total ??
    response?.data?.total ??
    banners.length;
  return { banners: Array.isArray(banners) ? banners : [], total: Number(total) || 0 };
}

function parseZoneIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(Boolean);
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("[")) {
      try {
        return JSON.parse(trimmed).map(Number).filter(Boolean);
      } catch {
        /* fall through */
      }
    }
    return trimmed.split(",").map((s) => Number(s.trim())).filter(Boolean);
  }
  return [];
}

function resolveBannerImageUrl(path) {
  return joinMediaUrl(path) || null;
}

function targetLabel(banner) {
  const t = banner.targetType;
  if (t === "global") return "Global";
  if (t === "service") return `Service #${banner.targetId ?? "—"}`;
  if (t === "category") return `Category #${banner.targetId ?? "—"}`;
  if (t === "sub_category") return `Sub-Cat #${banner.targetId ?? "—"}`;
  return "—";
}

function symbolForBanner(banner, zones = []) {
  const direct = resolveCurrencySymbol(banner);
  if (direct) return direct;
  const zoneIds = parseZoneIds(banner.zoneIds);
  const pool = zoneIds.length
    ? zones.filter((z) => zoneIds.some((id) => String(z.id) === String(id)))
    : zones;
  const symbols = [...new Set(pool.map((z) => resolveCurrencySymbol(z)).filter(Boolean))];
  return symbols.length === 1 ? symbols[0] : "";
}

function offerDisplay(banner, zones = []) {
  if (banner.offerType === "free_delivery") return "Free Delivery";
  if (banner.offerType === "percentage") return `${banner.discountValue ?? "—"}%`;
  const formatted = formatMoney(
    banner.discountValue,
    symbolForBanner(banner, zones),
    banner.currency ?? banner.currencyCode
  );
  return formatted === "—" ? "—" : `${formatted} off`;
}

function offerTypeLabel(type) {
  if (type === "percentage") return "Percentage";
  if (type === "flat") return "Flat Amount";
  if (type === "free_delivery") return "Free Delivery";
  return type ?? "—";
}

function rowFromBanner(b, idx, zones = []) {
  const zoneIds = parseZoneIds(b.zoneIds);
  return {
    id: b.id ?? b._id ?? idx,
    _raw: b,
    title: b.title ?? "—",
    offerDisplay: offerDisplay(b, zones),
    offerTypeLabel: offerTypeLabel(b.offerType),
    targetDisplay: targetLabel(b),
    zonesDisplay: !zoneIds.length ? "All Zones" : `${zoneIds.length} zone(s)`,
    startDate: formatDate(b.startDate),
    endDate: formatDate(b.endDate),
    startDateRaw: b.startDate,
    endDateRaw: b.endDate,
    isActive: b.isActive,
  };
}

function BannerImageField({ value, onChange, error }) {
  const { error: toastError } = useToaster();
  const preview =
    value instanceof File ? URL.createObjectURL(value) : typeof value === "string" ? value : null;

  return (
    <Field
      label="Banner image"
      hint="JPEG, PNG, GIF, or WebP. Max 5MB. Recommended 1200×400. Leave empty to keep the current image."
      error={error}
    >
      <Input
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        onChange={(e) => {
          const file = e.target.files?.[0] || null;
          e.target.value = "";
          if (!file) {
            onChange(null);
            return;
          }
          const accepted = acceptImageFile(file, toastError);
          if (accepted) onChange(accepted);
        }}
      />
      {preview ? (
        <img
          src={preview}
          alt="Banner preview"
          style={{
            marginTop: 10,
            maxWidth: 280,
            maxHeight: 100,
            objectFit: "cover",
            borderRadius: 8,
            border: "1px solid var(--line)",
          }}
        />
      ) : null}
    </Field>
  );
}

function BannerForm({ form, errors, patch, services, categories, subCategories, zones }) {
  const filteredSubCats = useMemo(
    () =>
      form.targetCategoryId
        ? subCategories.filter(
            (sc) =>
              String(sc.categoryId ?? sc.category_id ?? sc.parentId) === String(form.targetCategoryId)
          )
        : subCategories,
    [subCategories, form.targetCategoryId]
  );

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        Fields marked * are required.
      </p>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Basic info</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Title*" htmlFor="banner-title" error={errors.title}>
            <Input
              id="banner-title"
              placeholder="e.g. Eid Special Offer"
              value={form.title}
              onChange={(e) => patch("title", e.target.value)}
              error={Boolean(errors.title)}
            />
          </Field>
          <Field label="Description" htmlFor="banner-desc">
            <Input
              id="banner-desc"
              placeholder="Short description of this offer"
              value={form.description}
              onChange={(e) => patch("description", e.target.value)}
            />
          </Field>
          <Field label="Active">
            <Toggle
              checked={form.isActive}
              onChange={(e) => patch("isActive", e.target.checked)}
              label={form.isActive ? "Active" : "Inactive"}
            />
          </Field>
          <Field label="Home screen">
            <Toggle
              checked={form.showOnHome}
              onChange={(e) => patch("showOnHome", e.target.checked)}
              label={form.showOnHome ? "Show on home screen" : "Hidden from home"}
            />
          </Field>
        </div>
      </div>

      <BannerImageField
        value={form.bannerImage}
        onChange={(file) => patch("bannerImage", file)}
        error={errors.bannerImage}
      />

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Offer details</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Offer type*">
            <Select
              aria-label="Offer type"
              value={form.offerType}
              onChange={(value) => patch("offerType", value)}
              options={OFFER_TYPES}
            />
          </Field>
          {form.offerType !== "free_delivery" ? (
            <Field label="Discount value*" htmlFor="banner-discount" error={errors.discountValue}>
              <Input
                id="banner-discount"
                type="number"
                inputMode="decimal"
                placeholder={form.offerType === "percentage" ? "e.g. 20" : "e.g. 5.00"}
                value={form.discountValue}
                onChange={(e) => patch("discountValue", e.target.value)}
                min={0}
                step="0.01"
                error={Boolean(errors.discountValue)}
              />
            </Field>
          ) : null}
          {form.offerType === "percentage" ? (
            <Field label="Max discount cap" htmlFor="banner-cap" hint="Max discount from %">
              <Input
                id="banner-cap"
                type="number"
                inputMode="decimal"
                placeholder="No cap"
                value={form.maxDiscountCap}
                onChange={(e) => patch("maxDiscountCap", e.target.value)}
                min={0}
                step="0.01"
              />
            </Field>
          ) : null}
        </div>
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Apply to</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <Field label="Target type">
            <Select
              aria-label="Target type"
              value={form.targetType}
              onChange={(value) => {
                patch("targetType", value);
                patch("targetServiceId", "");
                patch("targetCategoryId", "");
                patch("targetSubCategoryId", "");
              }}
              options={TARGET_TYPES}
            />
          </Field>
          {form.targetType === "service" ? (
            <Field label="Service*" error={errors.targetServiceId}>
              <Select
                aria-label="Service"
                value={form.targetServiceId}
                onChange={(value) => patch("targetServiceId", value)}
                options={services.map((s) => ({
                  value: String(s.id ?? s._id),
                  label: s.name ?? s.serviceName ?? s.title,
                }))}
                placeholder="Choose a service"
              />
            </Field>
          ) : null}
          {form.targetType === "category" || form.targetType === "sub_category" ? (
            <Field label="Category*" error={errors.targetCategoryId}>
              <Select
                aria-label="Category"
                value={form.targetCategoryId}
                onChange={(value) => {
                  patch("targetCategoryId", value);
                  patch("targetSubCategoryId", "");
                }}
                options={categories.map((c) => ({
                  value: String(c.id ?? c._id),
                  label: c.name ?? c.categoryName ?? c.title,
                }))}
                placeholder="Choose a category"
              />
            </Field>
          ) : null}
          {form.targetType === "sub_category" ? (
            <Field label="Sub-category*" error={errors.targetSubCategoryId}>
              <Select
                aria-label="Sub-category"
                value={form.targetSubCategoryId}
                onChange={(value) => patch("targetSubCategoryId", value)}
                options={filteredSubCats.map((sc) => ({
                  value: String(sc.id ?? sc._id),
                  label: sc.name ?? sc.subCategoryName ?? sc.title,
                }))}
                placeholder={form.targetCategoryId ? "Choose sub-category" : "Select category first"}
                disabled={!form.targetCategoryId}
              />
            </Field>
          ) : null}
        </div>
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Zone filter</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="banner-zone-mode"
              checked={form.zoneMode === "all"}
              onChange={() => {
                patch("zoneMode", "all");
                patch("zoneIds", []);
              }}
            />
            All zones
          </label>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input
              type="radio"
              name="banner-zone-mode"
              checked={form.zoneMode === "specific"}
              onChange={() => patch("zoneMode", "specific")}
            />
            Specific zones
          </label>
        </div>
        {form.zoneMode === "specific" ? (
          <Field label="Select zones*" error={errors.zoneIds}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {zones.map((z) => {
                const id = String(z.id ?? z._id);
                return (
                  <CheckRow
                    key={id}
                    checked={form.zoneIds.includes(id)}
                    onChange={() => {
                      const next = form.zoneIds.includes(id)
                        ? form.zoneIds.filter((item) => item !== id)
                        : [...form.zoneIds, id];
                      patch("zoneIds", next);
                    }}
                    label={z.name ?? z.zoneName}
                  />
                );
              })}
            </div>
          </Field>
        ) : null}
      </div>

      <div>
        <h4 style={{ margin: "0 0 12px" }}>Validity & display</h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Field label="Start date" htmlFor="banner-start">
            <Input
              id="banner-start"
              type="date"
              value={form.startDate}
              onChange={(e) => patch("startDate", e.target.value)}
            />
          </Field>
          <Field label="End date" htmlFor="banner-end" error={errors.endDate}>
            <Input
              id="banner-end"
              type="date"
              value={form.endDate}
              onChange={(e) => patch("endDate", e.target.value)}
              error={Boolean(errors.endDate)}
            />
          </Field>
          <Field label="Display order" htmlFor="banner-order">
            <Input
              id="banner-order"
              type="number"
              inputMode="numeric"
              placeholder="1"
              value={form.displayOrder}
              onChange={(e) => patch("displayOrder", e.target.value)}
              min={1}
              step={1}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editBanner, setEditBanner] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { success, error: toastError } = useToaster();

  const { data: bannersResponse, isLoading: bannersLoading, isError, refetch } =
    useGetAllBannersQuery({ page, limit });
  const { data: servicesResponse } = useGetAllServicesQuery();
  const { data: categoriesResponse } = useGetCategoriesQuery();
  const { data: subCatsResponse } = useGetSubCategoriesQuery();
  const { data: zonesResponse } = useGetAllZonesQuery();

  const [createBanner, { isLoading: creating }] = useCreateBannerMutation();
  const [updateBanner, { isLoading: updating }] = useUpdateBannerMutation();
  const [deleteBanner, { isLoading: deleting }] = useDeleteBannerMutation();

  const services = useMemo(() => extractList(servicesResponse, "services", "data"), [servicesResponse]);
  const categories = useMemo(() => extractList(categoriesResponse, "categories", "data"), [categoriesResponse]);
  const subCategories = useMemo(
    () => extractList(subCatsResponse, "subCategories", "subCat", "data"),
    [subCatsResponse]
  );
  const zones = useMemo(() => extractList(zonesResponse, "zones", "data"), [zonesResponse]);

  const { banners, total } = useMemo(() => extractBanners(bannersResponse), [bannersResponse]);

  const tableRows = useMemo(
    () => banners.map((b, i) => ({ ...rowFromBanner(b, i, zones), sl: (page - 1) * limit + i + 1 })),
    [banners, page, limit, zones]
  );

  const stats = useMemo(() => {
    const active = tableRows.filter((r) => r.isActive).length;
    const inactive = tableRows.filter((r) => !r.isActive).length;
    const now = dayjs();
    const expiringSoon = tableRows.filter((r) => {
      if (!r.endDateRaw || r.endDate === "—") return false;
      const d = dayjs(r.endDateRaw);
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
        b.targetType === "category" || b.targetType === "sub_category" ? String(b.targetId ?? "") : "",
      targetSubCategoryId: b.targetType === "sub_category" ? String(b.targetId ?? "") : "",
      zoneMode: parseZoneIds(b.zoneIds).length ? "specific" : "all",
      zoneIds: parseZoneIds(b.zoneIds).map(String),
      startDate: b.startDate ? dayjs(b.startDate).format("YYYY-MM-DD") : "",
      endDate: b.endDate ? dayjs(b.endDate).format("YYYY-MM-DD") : "",
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

    if (form.targetType === "service" && !form.targetServiceId) next.targetServiceId = "Please select a service.";
    if ((form.targetType === "category" || form.targetType === "sub_category") && !form.targetCategoryId) {
      next.targetCategoryId = "Please select a category.";
    }
    if (form.targetType === "sub_category" && !form.targetSubCategoryId) {
      next.targetSubCategoryId = "Please select a sub-category.";
    }
    if (form.zoneMode === "specific" && !form.zoneIds.length) next.zoneIds = "Select at least one zone.";
    if (form.startDate && form.endDate && dayjs(form.endDate).isBefore(dayjs(form.startDate), "day")) {
      next.endDate = "End date must be on or after start date.";
    }
    if (form.bannerImage instanceof File) {
      const imageCheck = validateImageFile(form.bannerImage);
      if (!imageCheck.ok) next.bannerImage = imageCheck.message;
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
    const zoneIds = form.zoneMode === "specific" ? form.zoneIds.map(Number).filter(Boolean) : [];
    fd.append("zoneIds", zoneIds.join(","));
    if (form.startDate) fd.append("startDate", form.startDate);
    if (form.endDate) fd.append("endDate", form.endDate);
    fd.append("displayOrder", String(parseInt(form.displayOrder, 10) || 1));
    fd.append("showOnHome", String(form.showOnHome));
    fd.append("isActive", String(form.isActive));
    if (form.bannerImage instanceof File) fd.append("bannerImage", form.bannerImage);
    return fd;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    const body = buildPayload();
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
      toastError(getApiErrorMessage(err, "Something went wrong. Please try again."));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBanner(deleteTarget.id).unwrap();
      success(`Banner "${deleteTarget.title}" deleted.`);
      refetch();
    } catch (err) {
      toastError(getApiErrorMessage(err, "Could not delete banner."));
    } finally {
      setDeleteTarget(null);
    }
  };

  const columns = [
    {
      key: "title",
      header: "Banner",
      render: (row) => (
        <DirectoryIdentity name={row.title} meta={joinMeta(row.offerDisplay, row.targetDisplay)} />
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => (
        <DirectoryStatusPill active={row.isActive} />
      ),
    },
    {
      key: "endDate",
      header: "Dates",
      render: (row) => (
        <DirectoryIdentity name={row.endDate} meta={row.startDate !== "—" ? `From ${row.startDate}` : row.zonesDisplay} />
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
          <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>
            Delete
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  const isBusy = creating || updating;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Banners & Offers"
        description="Promotional banners shown in the customer app."
        actions={<Button onClick={openCreate}>Create Banner</Button>}
      />

      <DirectoryMetrics
        items={[
          { label: "Total banners", value: stats.total, tone: "brand" },
          { label: "Active", value: stats.active, tone: "success" },
          { label: "Expiring soon", value: stats.expiringSoon, tone: "warning" },
          { label: "Inactive", value: stats.inactive, tone: "neutral" },
        ]}
      />

      {isError ? (
        <p style={{ color: "var(--danger)", margin: 0 }}>Could not load banners.</p>
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
            rows={bannersLoading ? [] : tableRows}
            rowKey={(row) => row.id}
            empty={bannersLoading ? "Loading banners…" : "No banners yet."}
          />
        </DirectoryTableWrap>
      )}

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.title || "Banner"}
        onClose={() => setViewRow(null)}
        fields={[
          { label: "Title", value: viewRow?.title },
          { label: "Description", value: viewRow?._raw?.description },
          { label: "Offer", value: viewRow?.offerDisplay },
          { label: "Type", value: viewRow?.offerTypeLabel },
          { label: "Target", value: viewRow?.targetDisplay },
          { label: "Zones", value: viewRow?.zonesDisplay },
          { label: "Start", value: viewRow?.startDate },
          { label: "End", value: viewRow?.endDate },
          { label: "Status", value: viewRow?.isActive ? "Active" : "Inactive" },
        ]}
      />

      <Modal
        open={createOpen}
        onClose={closeModal}
        title={editBanner ? "Edit Banner" : "Create Banner"}
        primaryLabel={editBanner ? "Save Changes" : "Create Banner"}
        onPrimary={handleSubmit}
        primaryDisabled={isBusy || bannersLoading}
        secondaryDisabled={isBusy}
        size="xl"
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
      </Modal>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete Banner"
        description={`Delete "${deleteTarget?.title}"? This action cannot be undone.`}
        primaryLabel={deleting ? "Deleting…" : "Delete"}
        onPrimary={handleDelete}
        primaryDisabled={deleting}
        secondaryDisabled={deleting}
        danger
      />
    </div>
  );
}
