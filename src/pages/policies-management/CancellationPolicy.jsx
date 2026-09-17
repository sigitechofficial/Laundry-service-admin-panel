import { useState, useEffect, useMemo, useCallback } from "react";
import { TbPlus, TbTrash } from "../../shared/icons/index";
import { Button, Field, Input, Modal, PageHeader, Select, Table } from "../../design-system";
import { PaginationBar, Toggle } from "../misc-kit";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryExportButton,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import { useCsvExport } from "../../hooks/useCsvExport";
import { csvFormat } from "../../utilities/csvExport";
import {
  PolicyDetailRow,
  PolicyDetailSection,
  PolicyDetailStack,
  PolicyIdentity,
  PolicyMeta,
  PolicyMoney,
} from "./policy-ui";
import {
  formatPolicyBool,
  formatPolicyDate,
  formatPolicyDateTime,
  formatPolicyMoney,
  resolvePolicyCurrencySymbol,
} from "./policyUtils";
import { useForm, Controller } from "react-hook-form";
import useToaster from "../../components/ui/Toaster";
import {
  useAddCancellationPolicyMutation,
  useGetCancellationPoliciesQuery,
  useLazyGetCancellationPoliciesQuery,
  useUpdateCancellationPolicyMutation,
  useDeleteCancellationPolicyMutation,
  useCreateReasonMutation,
  useGetAllReasonsQuery,
  useDeleteReasonMutation,
  useGetAllZonesQuery,
  useLazyGetZoneByIdQuery,
  useGetUnitsDistanceAndCurrencyQuery,
} from "../../store/services/api";
import {
  mergedZonesList,
  currencyCodeFromZone,
  buildCurrencyUnitsList,
  unwrapZoneFromApiResponse,
} from "../../utilities/zonesList";
import { Delay } from "../../components/shared/Loaders";
import dayjs from "dayjs";
import { useSelector } from "react-redux";

/** RTK unwrap shape is usually { data: { policies, pagination } } */
function parseCancellationPoliciesPayload(response) {
  if (!response) return [];
  const inner = response.data !== undefined ? response.data : response;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.policies)) return inner.policies;
  return [];
}

const SEARCH_DEBOUNCE_MS = 400;

function minutesToHours(minutes) {
  const n = Number(minutes);
  if (!Number.isFinite(n) || n === 0) return "";
  return (n / 60).toFixed(2);
}

/** CSV columns operate on the raw API policy row plus a resolved `zoneName`. */
const CANCELLATION_CSV_COLUMNS = [
  { header: "Policy ID", key: "id" },
  { header: "Name", value: (p) => p?.name || "" },
  { header: "Description", value: (p) => p?.description || "" },
  { header: "Zone", value: (p) => p?.zoneName || "" },
  { header: "Zone ID", value: (p) => p?.zoneId ?? "" },
  { header: "Currency", value: (p) => p?.cancellationConfig?.prePickupAbsoluteCurrency || "" },
  {
    header: "Pre-pickup fee",
    value: (p) => csvFormat.money(p?.cancellationConfig?.prePickupAbsoluteAmount),
  },
  { header: "Pre-pickup %", value: (p) => p?.cancellationConfig?.prePickupPercentage ?? "" },
  {
    header: "Free window (hours)",
    value: (p) => minutesToHours(p?.cancellationConfig?.prePickupFreeChargeWindowMinutes),
  },
  {
    header: "First cancellation leniency",
    value: (p) => csvFormat.bool(p?.cancellationConfig?.prePickupFirstCancellationLeniency),
  },
  {
    header: "Unprocessed fee",
    value: (p) => csvFormat.money(p?.cancellationConfig?.unprocessedAbsoluteAmount),
  },
  {
    header: "Unprocessed % (prepaid)",
    value: (p) =>
      p?.cancellationConfig?.unprocessedOrderValuePercentage ??
      p?.cancellationConfig?.unprocessedPercentage ??
      "",
  },
  {
    header: "Allow cancel unprocessed",
    value: (p) => csvFormat.bool(p?.cancellationConfig?.allowCancelUnprocessed),
  },
  { header: "Courtesy window (days)", value: (p) => p?.cancellationConfig?.courtesyWindowDays ?? "" },
  {
    header: "Courtesy cap",
    value: (p) => csvFormat.money(p?.cancellationConfig?.courtesyCapAmount),
  },
  { header: "Courtesy count", value: (p) => p?.cancellationConfig?.courtesyCount ?? "" },
  {
    header: "Customer leniency",
    value: (p) => csvFormat.bool(p?.cancellationConfig?.customerLeniencyEnabled),
  },
  { header: "Active", value: (p) => csvFormat.bool(p?.isActive) },
  { header: "Default", value: (p) => csvFormat.bool(p?.isDefault) },
  { header: "Effective from", value: (p) => csvFormat.date(p?.effectiveFrom) },
  { header: "Effective to", value: (p) => csvFormat.date(p?.effectiveTo) },
  { header: "Created", value: (p) => csvFormat.dateTime(p?.createdAt) },
  { header: "Updated", value: (p) => csvFormat.dateTime(p?.updatedAt) },
];

/** Backend may omit isActive on list items; treat unknown as active when using isActive=1 filter */
function isPolicyConsideredActive(p) {
  const v = p?.isActive;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (v === undefined || v === null) return true;
  const s = String(v).toLowerCase();
  if (s === "0" || s === "false" || s === "no") return false;
  return s === "1" || s === "true" || s === "yes";
}

export default function CancellationPolicy() {
  const { success, error: showError } = useToaster();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [reasonsModalOpen, setReasonsModalOpen] = useState(false);
  const [cancelReasons, setCancelReasons] = useState([""]);
  const [reasonIds, setReasonIds] = useState([]); // Store IDs for deletion

  const [selectedZoneFilter, setSelectedZoneFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [overlapModalOpen, setOverlapModalOpen] = useState(false);
  const [overlapZoneId, setOverlapZoneId] = useState(null);
  const [pendingAddPayload, setPendingAddPayload] = useState(null);
  const [overlapTogglingId, setOverlapTogglingId] = useState(null);
  const [overlapPolicyFetchAll, setOverlapPolicyFetchAll] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState(null);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedZoneFilter, debouncedSearch, limit]);

  /** Filter params shared by the paged query and the CSV export. */
  const listFilterParams = useMemo(
    () => ({
      ...(selectedZoneFilter !== "" && { zoneId: selectedZoneFilter }),
      ...(debouncedSearch && { search: debouncedSearch }),
    }),
    [selectedZoneFilter, debouncedSearch]
  );

  const filterParams = {
    ...listFilterParams,
    ...(page && { page }),
    ...(limit && { limit }),
  };

  const { data: policiesResponse, isLoading, isFetching, refetch } =
    useGetCancellationPoliciesQuery(filterParams);
  const [fetchPoliciesForExport] = useLazyGetCancellationPoliciesQuery();
  const [addCancellationPolicy, { isLoading: isAdding }] = useAddCancellationPolicyMutation();
  const [updateCancellationPolicy, { isLoading: isUpdating }] = useUpdateCancellationPolicyMutation();
  const [deleteCancellationPolicy, { isLoading: isDeleting }] = useDeleteCancellationPolicyMutation();
  const { data: zonesQueryData } = useGetAllZonesQuery();
  const [fetchZoneById] = useLazyGetZoneByIdQuery();
  const { data: currencyUnitsPayload } = useGetUnitsDistanceAndCurrencyQuery("currency");
  const zonesReduxNode = useSelector((state) => state?.apiData?.zones);
  const currencyUnitsRedux = useSelector((state) => state?.apiData?.units?.currency);
  const zonesList = useMemo(
    () => mergedZonesList(zonesQueryData, zonesReduxNode),
    [zonesQueryData, zonesReduxNode]
  );
  const zoneOptions = useMemo(
    () => zonesList.map((z) => ({ value: String(z.id), label: z.name })),
    [zonesList]
  );
  const currencyUnitsList = useMemo(
    () => buildCurrencyUnitsList(currencyUnitsPayload, currencyUnitsRedux),
    [currencyUnitsPayload, currencyUnitsRedux]
  );
  const [createReason, { isLoading: isCreatingReason }] = useCreateReasonMutation();
  const [deleteReason] = useDeleteReasonMutation();
  const { data: reasonsResponse, refetch: refetchReasons } = useGetAllReasonsQuery(undefined, {
    skip: !reasonsModalOpen, // Only fetch when modal is open
  });
  const [fetchOverlapPolicies, { data: overlapPoliciesResponse, isFetching: overlapPoliciesLoading }] =
    useLazyGetCancellationPoliciesQuery();

  const isSubmitting = isAdding || isUpdating;

  const policies = policiesResponse?.data?.policies || [];
  const pagination = policiesResponse?.data?.pagination || {};
  const totalRows = Number(pagination.totalRecords ?? pagination.total ?? 0) || 0;
  const hasListFilters = Boolean(selectedZoneFilter || searchInput.trim());

  const resolveZoneNameForCsv = useCallback(
    (policy) =>
      policy?.zone?.name ||
      zonesList.find((z) => String(z.id) === String(policy?.zoneId))?.name ||
      "",
    [zonesList]
  );

  const mapPolicyToCsvRow = useCallback(
    (policy) => ({ ...policy, zoneName: resolveZoneNameForCsv(policy) }),
    [resolveZoneNameForCsv]
  );

  const fetchAllForExport = useCallback(async () => {
    // `false` → never serve the export from a cached page response.
    const res = await fetchPoliciesForExport(
      { ...listFilterParams, export: true },
      false
    ).unwrap();
    return {
      rows: res?.data?.policies || [],
      pagination: res?.data?.pagination || null,
    };
  }, [fetchPoliciesForExport, listFilterParams]);

  const csvFilenameFilters = useMemo(
    () => ({
      zone: zoneOptions.find((z) => String(z.value) === String(selectedZoneFilter))?.label || "",
      search: debouncedSearch,
    }),
    [zoneOptions, selectedZoneFilter, debouncedSearch]
  );

  const csv = useCsvExport({
    filenameBase: "cancellation-policies",
    columns: CANCELLATION_CSV_COLUMNS,
    fetchAll: fetchAllForExport,
    filenameFilters: csvFilenameFilters,
    mapRow: mapPolicyToCsvRow,
  });

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      zoneId: "",
      effectiveFrom: dayjs(),
      effectiveTo: null,
      isActive: true,
      isDefault: true,
      currency: "USD", // Single general currency for entire policy
      prePickupFeeType: "absolute", // New key: "absolute" or "percentage"
      prePickupFeeValue: "", // New field: stores the value
      prePickupAbsoluteAmount: "",
      prePickupPercentage: "",
      prePickupFreeChargeWindowMinutes: "",
      prePickupFirstCancellationLeniency: true,
      unprocessedFeeType: "absolute", // New key: "absolute" or "percentage"
      unprocessedFeeValue: "", // New field: stores the value
      unprocessedAbsoluteAmount: "",
      unprocessedPercentage: "",
      unprocessedAfterPickupMinutes: "",
      unprocessedOrderValuePercentage: "",
      allowCancelUnprocessed: true,
      courtesyWindowDays: "",
      courtesyCapAmount: "",
      courtesyCount: "",
      customerLeniencyEnabled: true,
    },
  });

  // Watch the fee types to show/hide appropriate inputs
  const prePickupFeeType = watch("prePickupFeeType");
  const unprocessedFeeType = watch("unprocessedFeeType");
  const watchedZoneId = watch("zoneId");

  const columns = [
    {
      key: "name",
      header: "Policy",
      render: (row) => (
        <PolicyIdentity
          primary={row.name || `Policy #${row.id}`}
          secondary={row.zoneName || "No zone"}
        />
      ),
    },
    {
      key: "isActive",
      header: "Status",
      render: (row) => <DirectoryStatusPill active={row.isActive} />,
    },
    {
      key: "prePickupAbsoluteAmount",
      header: "Fee",
      render: (row) => (
        <PolicyMoney>
          {formatPolicyMoney(row.prePickupAbsoluteAmount, row.currencySymbol, row.prePickupAbsoluteCurrency)}
        </PolicyMoney>
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (row) => <PolicyMeta>{row.updatedAt || "—"}</PolicyMeta>,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => handleView(row)} />
          <DirectoryActionEdit onClick={() => handleEdit(row._rawPolicy || row)} />
          <DirectoryActionDelete onClick={() => handleDelete(row._rawPolicy || row)} />
        </DirectoryActions>
      ),
    },
  ];

  // Prepare table data
  const policiesData = policies?.map((policy, index) => {
    const config = policy.cancellationConfig || {};
    const zone =
      policy.zone ||
      zonesList.find((z) => String(z.id) === String(policy.zoneId)) ||
      null;
    const zoneName =
      zone?.name ||
      zoneOptions.find((z) => String(z.value) === String(policy.zoneId))?.label ||
      null;
    const currencyCode =
      config.prePickupAbsoluteCurrency ||
      config.unprocessedAbsoluteCurrency ||
      currencyCodeFromZone(zone, currencyUnitsList);
    const currencySymbol = resolvePolicyCurrencySymbol({
      zone,
      code: currencyCode,
      currencyUnits: currencyUnitsList,
    });
    return {
      id: policy.id,
      sl: (pagination.page - 1) * pagination.limit + index + 1,
      name: policy.name,
      type: policy.type,
      description: policy.description,
      zoneId: policy.zoneId ?? null,
      zoneName,
      isActive: policy.isActive,
      isDefault: policy.isDefault,
      createdBy: policy.createdBy,
      updatedBy: policy.updatedBy,
      createdAt: policy.createdAt
        ? formatPolicyDate(policy.createdAt)
        : "N/A",
      updatedAt: policy.updatedAt
        ? formatPolicyDate(policy.updatedAt)
        : "N/A",
      deletedAt: policy.deletedAt
        ? formatPolicyDate(policy.deletedAt)
        : null,
      // Pre-Pickup Charges
      currencySymbol,
      prePickupAbsoluteCurrency: config.prePickupAbsoluteCurrency || currencyCode || "",
      prePickupAbsoluteAmount: config.prePickupAbsoluteAmount || "0.00",
      prePickupPercentage: config.prePickupPercentage || null,
      prePickupFreeChargeWindowMinutes: config.prePickupFreeChargeWindowMinutes || 0,
      prePickupFirstCancellationLeniency: config.prePickupFirstCancellationLeniency ?? false,
      // Unprocessed Order Charges
      unprocessedAbsoluteCurrency: config.unprocessedAbsoluteCurrency || "USD",
      unprocessedAbsoluteAmount: config.unprocessedAbsoluteAmount || "0.00",
      unprocessedPercentage: config.unprocessedPercentage || null,
      unprocessedAfterPickupMinutes: config.unprocessedAfterPickupMinutes || 0,
      unprocessedOrderValuePercentage: config.unprocessedOrderValuePercentage || null,
      allowCancelUnprocessed: config.allowCancelUnprocessed ?? false,
      // Courtesy Window
      courtesyWindowDays: config.courtesyWindowDays || null,
      courtesyCapAmount: config.courtesyCapAmount || null,
      courtesyCount: config.courtesyCount || 0,
      // Customer Leniency
      customerLeniencyEnabled: config.customerLeniencyEnabled ?? false,
      // Config metadata
      configId: config.id,
      configPolicyId: config.policyId,
      configIsActive: config.isActive,
      configCreatedAt: config.createdAt
        ? formatPolicyDate(config.createdAt)
        : null,
      configUpdatedAt: config.updatedAt
        ? formatPolicyDate(config.updatedAt)
        : null,
      configDeletedAt: config.deletedAt
        ? formatPolicyDate(config.deletedAt)
        : null,
      // Keep original config for edit functionality
      cancellationConfig: policy.cancellationConfig,
      _rawPolicy: policy,
    };
  }) || [];

  // Function to generate next version number
  const getNextVersionName = () => {
    if (!policies || policies.length === 0) {
      return "Version 1";
    }

    // Extract version numbers from existing policy names
    const versionNumbers = policies
      .map((policy) => {
        const name = policy.name || "";
        // Match patterns like "Version 1", "Version 1.01", "Version 1.02", etc.
        const match = name.match(/Version\s+(\d+)(?:\.(\d+))?/i);
        if (match) {
          const major = parseInt(match[1], 10);
          const minor = match[2] ? parseInt(match[2], 10) : 0;
          return { major, minor, full: parseFloat(`${major}.${minor.toString().padStart(2, "0")}`) };
        }
        return null;
      })
      .filter((v) => v !== null)
      .sort((a, b) => b.full - a.full);

    if (versionNumbers.length === 0) {
      return "Version 1";
    }

    // Get the highest version
    const highest = versionNumbers[0];

    // If highest is a whole number (like 1.00), start with 1.01
    if (highest.minor === 0) {
      return `Version ${highest.major}.01`;
    }

    // Otherwise, increment the minor version
    const nextMinor = highest.minor + 1;
    return `Version ${highest.major}.${nextMinor.toString().padStart(2, "0")}`;
  };

  const handleAdd = () => {
    setEditingPolicy(null);
    const nextVersionName = getNextVersionName();
    reset({
      name: nextVersionName,
      description: "",
      zoneId: selectedZoneFilter || "",
      effectiveFrom: dayjs(),
      effectiveTo: null,
      isActive: true,
      isDefault: true,
      currency: "USD",
      prePickupFeeType: "absolute",
      prePickupFeeValue: "",
      prePickupAbsoluteAmount: "",
      prePickupPercentage: "",
      prePickupFreeChargeWindowMinutes: "",
      prePickupFirstCancellationLeniency: true,
      unprocessedFeeType: "absolute",
      unprocessedFeeValue: "",
      unprocessedAbsoluteAmount: "",
      unprocessedPercentage: "",
      unprocessedAfterPickupMinutes: "",
      unprocessedOrderValuePercentage: "",
      allowCancelUnprocessed: true,
      courtesyWindowDays: "",
      courtesyCapAmount: "",
      courtesyCount: "",
      customerLeniencyEnabled: true,
    });
    setModalOpen(true);
  };

  const handleView = (row) => {
    const policy = row._rawPolicy || policies.find((p) => p.id === row.id);
    if (!policy) return;
    setViewingPolicy(policy);
    setViewModalOpen(true);
  };

  const handleCloseView = () => {
    setViewModalOpen(false);
    setViewingPolicy(null);
  };

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    const config = policy.cancellationConfig || {};

    // Determine fee type based on existing data (prefer percentage if both exist)
    const hasPercentage = config.prePickupPercentage && parseFloat(config.prePickupPercentage) > 0;
    const hasAbsolute = config.prePickupAbsoluteAmount && parseFloat(config.prePickupAbsoluteAmount) > 0;
    const feeType = hasPercentage ? "percentage" : (hasAbsolute ? "absolute" : "absolute");
    const feeValue = hasPercentage
      ? config.prePickupPercentage?.toString()
      : (hasAbsolute ? config.prePickupAbsoluteAmount?.toString() : "");

    reset({
      name: policy.name || "",
      description: policy.description || "",
      zoneId: policy.zoneId ? String(policy.zoneId) : "",
      effectiveFrom: policy.effectiveFrom
        ? dayjs(policy.effectiveFrom)
        : (policy.createdAt ? dayjs(policy.createdAt) : dayjs()),
      effectiveTo: policy.effectiveTo
        ? dayjs(policy.effectiveTo)
        : (policy.expiry_date ? dayjs(policy.expiry_date) : null),
      isActive: policy.isActive ?? true,
      isDefault: policy.isDefault ?? true,
      currency: config.prePickupAbsoluteCurrency || config.unprocessedAbsoluteCurrency || "USD",
      prePickupFeeType: feeType,
      prePickupFeeValue: feeValue,
      prePickupAbsoluteAmount: config.prePickupAbsoluteAmount?.toString() || "",
      prePickupPercentage: config.prePickupPercentage?.toString() || "",
      prePickupFreeChargeWindowMinutes: config.prePickupFreeChargeWindowMinutes
        ? (Number(config.prePickupFreeChargeWindowMinutes) / 60).toString()
        : "",
      prePickupFirstCancellationLeniency: config.prePickupFirstCancellationLeniency ?? true,
      // Determine fee type from absolute vs prepaid-% (canonical = order value %, legacy = unprocessedPercentage)
      unprocessedFeeType: (() => {
        const orderValuePct = parseFloat(config.unprocessedOrderValuePercentage);
        const legacyPct = parseFloat(config.unprocessedPercentage);
        const hasPercentage =
          (Number.isFinite(orderValuePct) && orderValuePct > 0) ||
          (Number.isFinite(legacyPct) && legacyPct > 0);
        const hasAbsolute =
          config.unprocessedAbsoluteAmount &&
          parseFloat(config.unprocessedAbsoluteAmount) > 0;
        return hasPercentage ? "percentage" : hasAbsolute ? "absolute" : "absolute";
      })(),
      unprocessedFeeValue: (() => {
        const orderValuePct = parseFloat(config.unprocessedOrderValuePercentage);
        const legacyPct = parseFloat(config.unprocessedPercentage);
        if (Number.isFinite(orderValuePct) && orderValuePct > 0) {
          return String(orderValuePct);
        }
        if (Number.isFinite(legacyPct) && legacyPct > 0) {
          return String(legacyPct);
        }
        const hasAbsolute =
          config.unprocessedAbsoluteAmount &&
          parseFloat(config.unprocessedAbsoluteAmount) > 0;
        return hasAbsolute ? config.unprocessedAbsoluteAmount?.toString() : "";
      })(),
      unprocessedAbsoluteAmount: config.unprocessedAbsoluteAmount?.toString() || "",
      unprocessedPercentage: "",
      unprocessedAfterPickupMinutes: config.unprocessedAfterPickupMinutes
        ? (Number(config.unprocessedAfterPickupMinutes) / 60).toString()
        : "",
      unprocessedOrderValuePercentage: "",
      allowCancelUnprocessed: config.allowCancelUnprocessed ?? true,
      courtesyWindowDays: config.courtesyWindowDays?.toString() || "",
      courtesyCapAmount: config.courtesyCapAmount?.toString() || "",
      courtesyCount: config.courtesyCount?.toString() || "",
      customerLeniencyEnabled: config.customerLeniencyEnabled ?? true,
    });
    setModalOpen(true);
  };

  const handleDelete = (policy) => {
    setPolicyToDelete(policy);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!policyToDelete) return;

    try {
      await deleteCancellationPolicy(policyToDelete.id).unwrap();
      success("Cancellation policy deleted successfully!");
      setDeleteConfirmOpen(false);
      setPolicyToDelete(null);
      refetch();
    } catch (error) {
      console.error("Error deleting cancellation policy:", error);
      showError(error?.data?.message || "Failed to delete cancellation policy. Please try again.");
      setDeleteConfirmOpen(false);
      setPolicyToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setPolicyToDelete(null);
  };

  const handleCloseOverlapModal = () => {
    setOverlapModalOpen(false);
    setPendingAddPayload(null);
    setOverlapZoneId(null);
    setOverlapTogglingId(null);
    setOverlapPolicyFetchAll(false);
  };

  const refetchOverlapPoliciesList = () => {
    if (overlapZoneId == null) return;
    fetchOverlapPolicies({
      zoneId: String(overlapZoneId),
      limit: 50,
      page: 1,
      ...(overlapPolicyFetchAll ? {} : { isActive: "1" }),
    });
  };

  const handleOverlapPolicyToggle = async (policy, nextActive) => {
    if (overlapTogglingId !== null) return;
    if (isPolicyConsideredActive(policy) === nextActive) return;
    setOverlapTogglingId(policy.id);
    try {
      await updateCancellationPolicy({
        id: policy.id,
        body: { isActive: nextActive },
      }).unwrap();
      success(
        nextActive
          ? "Policy activated"
          : "Policy deactivated. You can retry saving the new policy."
      );
      refetch();
      refetchOverlapPoliciesList();
    } catch (error) {
      console.error("Error updating overlapping policy:", error);
      showError(
        error?.data?.message || "Failed to update policy status. Please try again."
      );
    } finally {
      setOverlapTogglingId(null);
    }
  };

  const handleRetryPendingAdd = async () => {
    if (!pendingAddPayload) return;
    try {
      await addCancellationPolicy(pendingAddPayload).unwrap();
      success("Cancellation policy added successfully!");
      handleCloseOverlapModal();
      setModalOpen(false);
      reset();
      setEditingPolicy(null);
      refetch();
    } catch (error) {
      console.error("Error retrying add cancellation policy:", error);
      const status = error?.status ?? error?.data?.statusCode;
      const msg = String(error?.data?.message || error?.data?.error || "");
      if (status === 409 && /overlap/i.test(msg) && overlapZoneId != null) {
        showError(
          msg || "Still overlapping — turn off Active for the policies listed below, then try again."
        );
        refetchOverlapPoliciesList();
      } else {
        showError(
          error?.data?.message ||
            "Failed to add cancellation policy. Please try again."
        );
      }
    }
  };

  const onSubmit = async (data) => {
    let payload;
    try {
      const effectiveFromUtc = data.effectiveFrom
        ? dayjs(data.effectiveFrom).toDate().toISOString()
        : dayjs().toDate().toISOString();
      const effectiveToUtc = data.effectiveTo
        ? dayjs(data.effectiveTo).toDate().toISOString()
        : null;

      // Determine which field to set based on fee type
      const prePickupAbsoluteAmount = data.prePickupFeeType === "absolute" && data.prePickupFeeValue
        ? parseFloat(data.prePickupFeeValue)
        : 0;
      const prePickupPercentage = data.prePickupFeeType === "percentage" && data.prePickupFeeValue
        ? parseFloat(data.prePickupFeeValue)
        : null;

      // Determine which field to set for unprocessed orders based on fee type
      const unprocessedAbsoluteAmount =
        data.unprocessedFeeType === "absolute" && data.unprocessedFeeValue
          ? parseFloat(data.unprocessedFeeValue)
          : 0;
      // Single prepaid % — store on both columns so legacy / canonical stay aligned
      const unprocessedPct =
        data.unprocessedFeeType === "percentage" && data.unprocessedFeeValue
          ? parseFloat(data.unprocessedFeeValue)
          : 0;

      payload = {
        name: data.name,
        description: data.description,
        zoneId: data.zoneId ? parseInt(data.zoneId, 10) : null,
        effectiveFrom: effectiveFromUtc,
        effectiveTo: effectiveToUtc,
        isActive: !!data.isActive,
        isDefault: !!data.isDefault,
        prePickupAbsoluteCurrency: data.currency,
        prePickupAbsoluteAmount: prePickupAbsoluteAmount,
        prePickupPercentage: prePickupPercentage,
        prePickupFreeChargeWindowMinutes: data.prePickupFreeChargeWindowMinutes
          ? Math.round(parseFloat(data.prePickupFreeChargeWindowMinutes) * 60)
          : 0,
        prePickupFirstCancellationLeniency: data.prePickupFirstCancellationLeniency,
        unprocessedAbsoluteCurrency: data.currency,
        unprocessedAbsoluteAmount: unprocessedAbsoluteAmount,
        unprocessedPercentage: unprocessedPct || null,
        unprocessedAfterPickupMinutes: data.unprocessedAfterPickupMinutes
          ? Math.round(parseFloat(data.unprocessedAfterPickupMinutes) * 60)
          : 0,
        unprocessedOrderValuePercentage: unprocessedPct || 0,
        allowCancelUnprocessed: data.allowCancelUnprocessed,
        courtesyWindowDays: data.courtesyWindowDays ? parseInt(data.courtesyWindowDays) : 0,
        courtesyCapAmount: data.courtesyCapAmount ? parseFloat(data.courtesyCapAmount) : 0,
        courtesyCount: data.courtesyCount ? parseInt(data.courtesyCount) : 0,
        customerLeniencyEnabled: data.customerLeniencyEnabled,
      };

      if (editingPolicy) {
        await updateCancellationPolicy({ id: editingPolicy.id, body: payload }).unwrap();
        success("Cancellation policy updated successfully!");
      } else {
        await addCancellationPolicy(payload).unwrap();
        success("Cancellation policy added successfully!");
      }

      setModalOpen(false);
      reset();
      setEditingPolicy(null);
      refetch();
    } catch (error) {
      console.error("Error saving cancellation policy:", error);
      const status = error?.status ?? error?.data?.statusCode;
      const msg = String(error?.data?.message || error?.data?.error || "");
      const isOverlapConflict =
        !editingPolicy &&
        status === 409 &&
        /overlap/i.test(msg) &&
        payload &&
        payload.zoneId != null;

      if (isOverlapConflict) {
        setPendingAddPayload(payload);
        setOverlapZoneId(payload.zoneId);
        setOverlapPolicyFetchAll(false);
        setOverlapModalOpen(true);
        fetchOverlapPolicies({
          zoneId: String(payload.zoneId),
          isActive: "1",
          limit: 50,
          page: 1,
        });
        return;
      }

      showError(error?.data?.message || `Failed to ${editingPolicy ? "update" : "add"} cancellation policy. Please try again.`);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingPolicy(null);
    reset();
  };

  // Cancellation Reasons Management
  const handleAddReason = () => {
    setCancelReasons([...cancelReasons, ""]);
    setReasonIds([...reasonIds, null]); // New reason has no ID
  };

  const handleRemoveReason = (index) => {
    if (cancelReasons.length > 1) {
      const newReasons = cancelReasons.filter((_, i) => i !== index);
      const newIds = reasonIds.filter((_, i) => i !== index);
      setCancelReasons(newReasons);
      setReasonIds(newIds);
    }
  };

  const handleDeleteReason = async (index) => {
    const reasonId = reasonIds[index];

    // If it's a new reason (no ID), just remove it from the list
    if (!reasonId) {
      handleRemoveReason(index);
      return;
    }

    try {
      await deleteReason(reasonId).unwrap();
      success("Cancellation reason deleted successfully!");
      // Remove from local state
      handleRemoveReason(index);
      // Refresh the list
      refetchReasons();
    } catch (error) {
      console.error("Error deleting cancellation reason:", error);
      showError(error?.data?.message || "Failed to delete cancellation reason. Please try again.");
    }
  };

  const handleReasonChange = (index, value) => {
    const newReasons = [...cancelReasons];
    newReasons[index] = value;
    setCancelReasons(newReasons);
    // Keep the ID when editing
  };

  const handleSubmitReasons = async () => {
    try {
      // Filter out empty reasons
      const validReasons = cancelReasons.filter((reason) => reason.trim() !== "");

      if (validReasons.length === 0) {
        showError("Please add at least one cancellation reason");
        return;
      }

      // Use single format if only one reason, array format if multiple
      const payload = validReasons.length === 1
        ? { cancelReason: validReasons[0] }
        : { cancelReasons: validReasons };

      try {
        await createReason(payload).unwrap();
        success("Cancellation reasons saved successfully!");
        refetchReasons(); // Refresh the reasons list
        // Keep modal open to show updated reasons
      } catch (error) {
        // Handle 409 conflict error (all reasons already exist)
        if (error?.status === 409 || error?.data?.statusCode === 409) {
          showError(error?.data?.message || "All reasons already exist in the database");
          // Still refresh to show current reasons
          refetchReasons();
        } else {
          throw error; // Re-throw other errors
        }
      }
    } catch (error) {
      console.error("Error creating cancellation reasons:", error);
      // Handle 409 conflict error (all reasons already exist)
      if (error?.status === 409 || error?.data?.statusCode === 409) {
        showError(error?.data?.message || "All reasons already exist in the database");
        // Still refresh to show current reasons
        refetchReasons();
      } else {
        showError(error?.data?.message || "Failed to create cancellation reasons. Please try again.");
      }
    }
  };

  const handleCloseReasonsModal = () => {
    setReasonsModalOpen(false);
    setCancelReasons([""]);
    setReasonIds([null]);
  };

  // Load existing reasons when modal opens
  useEffect(() => {
    if (reasonsModalOpen && reasonsResponse?.data) {
      // Handle both single reason and array of reasons
      let existingReasons = [];
      let existingIds = [];

      if (Array.isArray(reasonsResponse.data)) {
        // If data is an array
        reasonsResponse.data.forEach(item => {
          let reasonText = '';
          let reasonId = null;

          if (typeof item === 'string') {
            reasonText = item;
          } else if (item.cancelReason) {
            reasonText = item.cancelReason;
            reasonId = item.id || item._id || null;
          } else if (item.reason) {
            reasonText = item.reason;
            reasonId = item.id || item._id || null;
          } else if (item.name) {
            reasonText = item.name;
            reasonId = item.id || item._id || null;
          }

          if (reasonText) {
            existingReasons.push(reasonText);
            existingIds.push(reasonId);
          }
        });
      } else if (reasonsResponse.data.cancelReason) {
        // Single reason object
        existingReasons = [reasonsResponse.data.cancelReason];
        existingIds = [reasonsResponse.data.id || reasonsResponse.data._id || null];
      } else if (reasonsResponse.data.cancelReasons) {
        // Array of reasons in object
        existingReasons = reasonsResponse.data.cancelReasons;
        existingIds = reasonsResponse.data.cancelReasons.map((_, index) =>
          reasonsResponse.data.ids?.[index] || null
        );
      } else if (typeof reasonsResponse.data === 'string') {
        // Single reason string
        existingReasons = [reasonsResponse.data];
        existingIds = [null];
      }

      if (existingReasons.length > 0) {
        setCancelReasons(existingReasons);
        setReasonIds(existingIds);
      } else {
        setCancelReasons([""]);
        setReasonIds([null]);
      }
    } else if (reasonsModalOpen) {
      // If modal opens but no data yet, keep empty or fetch
      setCancelReasons([""]);
      setReasonIds([null]);
    }
  }, [reasonsModalOpen, reasonsResponse]);

  const overlapPoliciesRaw = parseCancellationPoliciesPayload(overlapPoliciesResponse);
  const overlapPoliciesList = overlapPolicyFetchAll
    ? overlapPoliciesRaw
    : overlapPoliciesRaw.filter(isPolicyConsideredActive);
  const overlapZoneLabel =
    overlapZoneId != null
      ? zoneOptions.find((z) => String(z.value) === String(overlapZoneId))?.label ||
        `Zone #${overlapZoneId}`
      : "";

  const viewingConfig = viewingPolicy?.cancellationConfig || {};
  const viewingZone =
    viewingPolicy?.zone ||
    zonesList.find((z) => String(z.id) === String(viewingPolicy?.zoneId)) ||
    null;
  const viewingZoneName =
    viewingZone?.name ||
    zoneOptions.find((z) => String(z.value) === String(viewingPolicy?.zoneId))?.label ||
    "—";
  const viewingCurrencyCode =
    viewingConfig.prePickupAbsoluteCurrency ||
    viewingConfig.unprocessedAbsoluteCurrency ||
    currencyCodeFromZone(viewingZone, currencyUnitsList);
  const viewingCurrencySymbol = resolvePolicyCurrencySymbol({
    zone: viewingZone,
    code: viewingCurrencyCode,
    currencyUnits: currencyUnitsList,
  });
  const viewingFreeWindowHours = viewingConfig.prePickupFreeChargeWindowMinutes
    ? (Number(viewingConfig.prePickupFreeChargeWindowMinutes) / 60).toFixed(2)
    : "0";
  const viewingUnprocessedPct =
    viewingConfig.unprocessedOrderValuePercentage || viewingConfig.unprocessedPercentage;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        title="Cancellation Policy"
        description="Fees and windows when a customer cancels pickup or delivery."
        actions={
          <>
            <Button variant="secondary" onClick={() => setReasonsModalOpen(true)}>
              <TbPlus size={18} />
              Manage cancellation reasons
            </Button>
            <Button onClick={handleAdd}>
              <TbPlus size={18} />
              Add cancellation policy
            </Button>
          </>
        }
      />
      {/* Data Table */}
          {isLoading ? (
            <Delay />
          ) : (
            <DirectoryTableWrap
              toolbar={
                <DirectoryToolbar>
                  <DirectorySearch
                    id="cancellation-policy-search"
                    value={searchInput}
                    onChange={setSearchInput}
                    placeholder="Search policy name, description or zone…"
                  />
                  <DirectoryToolSelect>
                    <Select
                      aria-label="Filter by zone"
                      value={selectedZoneFilter}
                      onChange={setSelectedZoneFilter}
                      options={[{ value: "", label: "All zones" }, ...zoneOptions]}
                      placeholder="All zones"
                    />
                  </DirectoryToolSelect>
                  <DirectoryToolbarEnd>
                    {hasListFilters ? (
                      <DirectoryClearButton
                        onClick={() => {
                          setSelectedZoneFilter("");
                          setSearchInput("");
                          setDebouncedSearch("");
                          setPage(1);
                        }}
                      />
                    ) : null}
                    {isFetching ? <span className="jd-field__hint">Refreshing…</span> : null}
                    <DirectoryExportButton
                      onClick={csv.run}
                      loading={csv.isExporting}
                      count={totalRows}
                    />
                  </DirectoryToolbarEnd>
                </DirectoryToolbar>
              }
              footer={
                <PaginationBar
                  page={page}
                  limit={limit}
                  total={totalRows}
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
                rows={policiesData}
                rowKey={(row, i) => row.id ?? row.sl ?? i}
                empty={hasListFilters ? "No policies match these filters" : "No policies yet"}
                stickyLeft={1}
              />
            </DirectoryTableWrap>
          )}

          {/* Add/Edit Modal */}
          <Modal
        open={modalOpen}
        title={editingPolicy ? "EDIT CANCELLATION POLICY" : "CANCELLATION POLICY"}
        onClose={handleClose}
        size={"xl"}
        primaryLabel={isSubmitting ? "Saving…" : "Save"}
        secondaryLabel={"Cancel"}
        onPrimary={handleSubmit(onSubmit)}
        primaryDisabled={Boolean(isSubmitting)}

      >

              <div className="flex flex-col gap-5">
                {/* Basic Information Section */}
                <div>
                  <h3 style={{ margin: 0 }}>
                    Basic Information
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Configure the fundamental settings for this cancellation policy, including name, description, and activation status.
                  </p>
                  <div className="flex flex-col gap-4">
                    <Controller
                      name="name"
                      control={control}
                      rules={{ required: "Policy name is required" }}
                      render={({ field: { onChange, value } }) => (
                        <div>
                          <Field label={"Policy Name*"}>
                      <Input placeholder={"Enter policy name"} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={!editingPolicy} />
                    </Field>
                          {errors.name && (
                            <p style={{ margin: 0, color: "var(--danger-700)" }}>
                              {errors.name.message}
                            </p>
                          )}
                        </div>
                      )}
                    />

                    <Controller
                      name="description"
                      control={control}
                      rules={{ required: "Description is required" }}
                      render={({ field: { onChange, value } }) => (
                        <div>
                          <Field label={"Description*"} hint={"Policy description or notes. Optional field to provide additional context about the policy."}>
                      <Input placeholder={"Enter policy description"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                          {errors.description && (
                            <p style={{ margin: 0, color: "var(--danger-700)" }}>
                              {errors.description.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                    <Controller
                      name="zoneId"
                      control={control}
                      rules={{ required: "Zone is required" }}
                      render={({ field: { onChange, value } }) => (
                        <div>
                          <Field label={"Zone*"} hint={"Select which zone this cancellation policy applies to."}>
                      <Select aria-label={"Zone*"} value={value || ""} onChange={(next) => ((e) => {
                              const newZoneId = String(e?.target?.value ?? e ?? "");
                              onChange(newZoneId);
                              if (!newZoneId) return;
                              const z = zonesList.find((zone) => String(zone.id) === String(newZoneId));
                              let code = currencyCodeFromZone(z, currencyUnitsList);
                              const apply = (c) => {
                                if (c) {
                                  setValue("currency", c, {
                                    shouldDirty: true,
                                    shouldTouch: true,
                                    shouldValidate: true,
                                  });
                                }
                              };
                              if (code) {
                                apply(code);
                                return;
                              }
                              fetchZoneById(newZoneId)
                                .unwrap()
                                .then((res) => {
                                  const detail = unwrapZoneFromApiResponse(res);
                                  apply(currencyCodeFromZone(detail, currencyUnitsList));
                                })
                                .catch(() => {});
                            })({ target: { value: next } })} options={zoneOptions} placeholder={"Select zone"} />
                    </Field>
                          {errors.zoneId && (
                            <p style={{ margin: 0, color: "var(--danger-700)" }}>
                              {errors.zoneId.message}
                            </p>
                          )}
                        </div>
                      )}
                    />
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field: { value } }) => (
                        <Field label={"Currency"} hint={"Currency follows the selected zone. Change the zone to change currency."}>
                      <Input placeholder={watchedZoneId ? "Set from zone" : "Select zone first"} value={value ?? ""} onChange={() => {}} disabled={true} />
                    </Field>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="effectiveFrom"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <div>
                            <div>
                              <p style={{ margin: 0 }}>
                                Effective From
                              </p>
                            </div>
                            <Input type="date" value={value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : ""} onChange={(e) => onChange(e.target.value ? dayjs(e.target.value) : null)} />
                          </div>
                        )}
                      />
                      <Controller
                        name="effectiveTo"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <div>
                            <div>
                              <p style={{ margin: 0 }}>
                                Effective To
                              </p>
                            </div>
                            <Input type="date" value={value && dayjs(value).isValid() ? dayjs(value).format("YYYY-MM-DD") : ""} onChange={(e) => onChange(e.target.value ? dayjs(e.target.value) : null)} />
                          </div>
                        )}
                      />
                      <Controller
                        name="isActive"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                            <span title={"Set whether this policy is active."}>{"Active"}</span>
                          </div>
                        )}
                      />
                      <Controller
                        name="isDefault"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <div className="flex items-center gap-2">
                            <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                            <span title={"Set whether this is the default cancellation policy."}>{"Default policy"}</span>
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

                {/* Pre-Pickup Charges Section */}
                <div>
                  <h3 style={{ margin: 0 }}>
                    Pre-Pickup Charges
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Define cancellation fees and policies for orders that are cancelled before the pickup has occurred. Set absolute amounts, percentages, free charge windows, and first cancellation leniency.
                  </p>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="prePickupFeeType"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Field label={"Fee Type"} hint={"Choose between a fixed amount (Absolute) or a percentage of the order value (Percentage)."}>
                      <Select aria-label={"Fee Type"} value={value} onChange={(next) => ((e) => {
                              onChange(e.target.value);
                              // Clear the fee value when switching types
                              reset({
                                ...watch(),
                                prePickupFeeType: e.target.value,
                                prePickupFeeValue: "",
                              });
                            })({ target: { value: next } })} options={[
                              { value: "absolute", label: "Absolute Amount" },
                              { value: "percentage", label: "Percentage (%)" },
                            ]} placeholder={"Select fee type"} />
                    </Field>
                        )}
                      />
                      <Controller
                        name="prePickupFeeValue"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Field label={prePickupFeeType === "absolute" ? "Absolute Amount" : "Percentage (%)"} hint={prePickupFeeType === "absolute"
                                ? "Fixed cancellation fee amount for pre-pickup cancellations. This is a flat fee charged when a customer cancels before pickup."
                                : "Percentage-based cancellation fee for pre-pickup cancellations (e.g., 5.00 for 5% of order value)."}>
                      <Input type={"number"} placeholder={prePickupFeeType === "absolute" ? "Enter amount" : "Enter percentage"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name="prePickupFreeChargeWindowMinutes"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <Field label={"Free Charge Window (Hours)"} hint={"Time window in hours after order placement where cancellations are free. This value is converted to minutes before saving."}>
                      <Input type={"number"} placeholder={"Enter hours"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                      )}
                    />

                    <Controller
                      name="prePickupFirstCancellationLeniency"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                          <span title={"Automatically forgive the first cancellation. When enabled, the first cancellation for each customer is automatically forgiven without charging a fee."}>{"First Cancellation Leniency"}</span>
                        </div>
                      )}
                    />
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

                {/* Unprocessed Order Charges Section */}
                <div>
                  <h3 style={{ margin: 0 }}>
                    Unprocessed Order Charges
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Configure cancellation fees for orders that have been picked up but not yet processed. Set charges based on time after pickup, order value percentage, and cancellation permissions.
                  </p>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="unprocessedFeeType"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Field label={"Fee Type"} hint={"Choose a fixed amount (Absolute) or a percentage of prepaid (Percentage). Prepaid = minimum order + service fee + tip."}>
                      <Select aria-label={"Fee Type"} value={value} onChange={(next) => ((e) => {
                              const next = e.target.value;
                              onChange(next);
                              // Clear the fee value when switching types; order-value % only applies to percentage fee type
                              reset({
                                ...watch(),
                                unprocessedFeeType: next,
                                unprocessedFeeValue: "",
                                ...(next === "absolute" && { unprocessedOrderValuePercentage: "" }),
                              });
                            })({ target: { value: next } })} options={[
                              { value: "absolute", label: "Absolute Amount" },
                              { value: "percentage", label: "Percentage (%)" },
                            ]} placeholder={"Select fee type"} />
                    </Field>
                        )}
                      />
                      <Controller
                        name="unprocessedFeeValue"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Field label={unprocessedFeeType === "absolute"
                                ? "Absolute Amount"
                                : "Unprocessed fee % (of prepaid)"} hint={unprocessedFeeType === "absolute"
                                ? "Fixed cancellation fee for unprocessed / On the Way cancellations."
                                : "Percentage of prepaid (minimum order + service fee + tip). Example: 50 = keep half of prepaid. This is the only % used by cancel fee."}>
                      <Input type={"number"} placeholder={unprocessedFeeType === "absolute"
                                ? "Enter amount"
                                : "e.g. 50"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name="unprocessedAfterPickupMinutes"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <Field label={"After Pickup (Hours)"} hint={"Legacy field (hours, stored as minutes). Not used by cancel fee calc today."}>
                      <Input type={"number"} placeholder={"Enter hours"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                      )}
                    />

                    <Controller
                      name="allowCancelUnprocessed"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <div className="flex items-center gap-2">
                          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                          <span title={"Allow cancellation of unprocessed orders. When enabled, customers can cancel orders that have not yet been processed."}>{"Allow Cancel Unprocessed"}</span>
                        </div>
                      )}
                    />
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

                {/* Courtesy Window Section */}
                <div>
                  <h3 style={{ margin: 0 }}>
                    Courtesy Window
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Set up a grace period where customers can cancel orders with reduced or waived fees. Configure the time window, maximum charge cap, and number of allowed courtesy cancellations.
                  </p>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Controller
                        name="courtesyWindowDays"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Field label={"Window Days"} hint={"Time window in days for courtesy cancellations. Cancellations within this window may be eligible for courtesy waivers."}>
                      <Input type={"number"} placeholder={"Enter days"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                        )}
                      />

                      <Controller
                        name="courtesyCapAmount"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <Field label={"Cap Amount"} hint={"Maximum total cancellation charges per customer within the courtesy window. Once this cap is reached, additional cancellations may be waived."}>
                      <Input type={"number"} placeholder={"Enter amount"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                        )}
                      />
                    </div>

                    <Controller
                      name="courtesyCount"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <Field label={"Count"} hint={"Maximum number of courtesy cancellations allowed per customer within the courtesy window period."}>
                      <Input type={"number"} placeholder={"Enter count"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                      )}
                    />
                  </div>
                </div>

                <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

                {/* Customer Leniency Section */}
                <div>
                  <h3 style={{ margin: 0 }}>
                    Customer Leniency
                  </h3>
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    Enable customer-friendly leniency features such as first cancellation forgiveness and courtesy windows to provide a better customer experience while managing cancellation policies.
                  </p>
                  <Controller
                    name="customerLeniencyEnabled"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <div className="flex items-center gap-2">
                        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                        <span title={"Enable customer leniency features. When enabled, the system applies leniency rules such as first cancellation forgiveness and courtesy windows."}>{"Enable Customer Leniency"}</span>
                      </div>
                    )}
                  />
                </div>
              </div>

          </Modal>

          <Modal
        open={overlapModalOpen}
        title={"ACTIVE POLICY IN THIS ZONE"}
        onClose={handleCloseOverlapModal}
        size={"lg"}
        primaryLabel={isAdding ? "Saving…" : "Retry saving new policy"}
        secondaryLabel={"Close"}
        onPrimary={handleRetryPendingAdd}
        primaryDisabled={Boolean(isAdding)}

      >
            <div className="flex flex-col gap-3">
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Another active cancellation policy in{" "}
                <span style={{ margin: 0 }}>
                  {overlapZoneLabel || "this zone"}
                </span>{" "}
                overlaps the dates you chose. Deactivate it below, then retry saving your new policy.
              </p>
              {overlapPoliciesLoading ? (
                <div>
                  <span className="jd-field__hint">Loading…</span>
                </div>
              ) : overlapPoliciesList.length === 0 ? (
                <div className="flex flex-col gap-2">
                  <p style={{ margin: 0, color: "var(--muted)" }}>
                    {overlapPolicyFetchAll
                      ? "No policies were returned for this zone. Check the zone or try again later."
                      : "We could not list active policies for this zone. Load all policies for the zone below, then switch off Active on the overlapping policy."}
                  </p>
                  {!overlapPolicyFetchAll && overlapZoneId != null && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setOverlapPolicyFetchAll(true);
                        fetchOverlapPolicies({
                          zoneId: String(overlapZoneId),
                          limit: 50,
                          page: 1,
                        });
                      }}
                    >
                      Load all policies in this zone
                    </Button>
                  )}
                  {overlapPolicyFetchAll && overlapZoneId != null && (
                    <Button variant="ghost" size="sm" onClick={refetchOverlapPoliciesList}>
                      Refresh list
                    </Button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {overlapPoliciesList.map((policy) => {
                    const from =
                      policy.effectiveFrom || policy.created_date || policy.createdAt;
                    const to = policy.effectiveTo || policy.expiry_date || policy.expiryDate;
                    const fromLabel = from ? formatPolicyDate(from) : "—";
                    const toLabel = to ? formatPolicyDate(to) : "Open-ended";
                    return (
                      <div>
                        <div>
                          <p style={{ margin: 0 }}>
                            {policy.name || `Policy #${policy.id}`}
                          </p>
                          <p style={{ margin: 0, color: "var(--muted)" }}>
                            ID {policy.id} · {fromLabel} → {toLabel}
                          </p>
                        </div>
                        <div>
                          <Toggle checked={isPolicyConsideredActive(policy)} onChange={(e) =>
                              handleOverlapPolicyToggle(policy, e.target.checked)} disabled={overlapTogglingId !== null} />
                          <p style={{ margin: 0, color: "var(--muted)" }}>
                            {isPolicyConsideredActive(policy) ? "Active" : "Inactive"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Modal>

          <Modal
            open={viewModalOpen}
            title="View cancellation policy"
            onClose={handleCloseView}
            size="xl"
            primaryLabel="Close"
            secondaryLabel="Close"
            onPrimary={handleCloseView}
          >
            {viewingPolicy ? (
              <PolicyDetailStack>
                <PolicyDetailSection title="Identity">
                  <PolicyDetailRow label="Policy name" value={viewingPolicy.name} />
                  <PolicyDetailRow label="Policy ID" value={viewingPolicy.id} />
                  <PolicyDetailRow label="Description" value={viewingPolicy.description} />
                  <PolicyDetailRow label="Zone" value={viewingZoneName} />
                  <PolicyDetailRow label="Zone ID" value={viewingPolicy.zoneId ?? "—"} />
                  <PolicyDetailRow label="Status" value={viewingPolicy.isActive ? "Active" : "Inactive"} />
                  <PolicyDetailRow label="Default policy" value={formatPolicyBool(viewingPolicy.isDefault)} />
                  <PolicyDetailRow label="Effective from" value={formatPolicyDate(viewingPolicy.effectiveFrom)} />
                  <PolicyDetailRow label="Effective to" value={formatPolicyDate(viewingPolicy.effectiveTo)} />
                  <PolicyDetailRow label="Created at" value={formatPolicyDateTime(viewingPolicy.createdAt)} />
                  <PolicyDetailRow label="Updated at" value={formatPolicyDateTime(viewingPolicy.updatedAt)} />
                </PolicyDetailSection>
                <PolicyDetailSection title="Pre-pickup charges">
                  <PolicyDetailRow
                    label="Currency"
                    value={
                      viewingCurrencySymbol
                        ? `${viewingConfig.prePickupAbsoluteCurrency || viewingCurrencyCode || ""} (${viewingCurrencySymbol})`.trim()
                        : viewingConfig.prePickupAbsoluteCurrency || "—"
                    }
                  />
                  <PolicyDetailRow
                    label="Absolute amount"
                    value={formatPolicyMoney(
                      viewingConfig.prePickupAbsoluteAmount,
                      viewingCurrencySymbol,
                      viewingConfig.prePickupAbsoluteCurrency
                    )}
                  />
                  <PolicyDetailRow
                    label="Percentage"
                    value={viewingConfig.prePickupPercentage ? `${viewingConfig.prePickupPercentage}%` : "—"}
                  />
                  <PolicyDetailRow
                    label="Free charge window"
                    value={`${viewingFreeWindowHours} hours (${viewingConfig.prePickupFreeChargeWindowMinutes || 0} min)`}
                  />
                  <PolicyDetailRow
                    label="First cancellation leniency"
                    value={formatPolicyBool(viewingConfig.prePickupFirstCancellationLeniency)}
                  />
                </PolicyDetailSection>
                <PolicyDetailSection title="Unprocessed order charges">
                  <PolicyDetailRow
                    label="Absolute amount"
                    value={formatPolicyMoney(
                      viewingConfig.unprocessedAbsoluteAmount,
                      viewingCurrencySymbol,
                      viewingConfig.unprocessedAbsoluteCurrency
                    )}
                  />
                  <PolicyDetailRow
                    label="Percentage (prepaid)"
                    value={viewingUnprocessedPct ? `${viewingUnprocessedPct}%` : "—"}
                  />
                  <PolicyDetailRow
                    label="Allow cancel unprocessed"
                    value={formatPolicyBool(viewingConfig.allowCancelUnprocessed)}
                  />
                </PolicyDetailSection>
                <PolicyDetailSection title="Courtesy & leniency">
                  <PolicyDetailRow label="Window days" value={viewingConfig.courtesyWindowDays ?? "—"} />
                  <PolicyDetailRow
                    label="Cap amount"
                    value={formatPolicyMoney(
                      viewingConfig.courtesyCapAmount,
                      viewingCurrencySymbol,
                      viewingConfig.prePickupAbsoluteCurrency
                    )}
                  />
                  <PolicyDetailRow
                    label="Enable customer leniency"
                    value={formatPolicyBool(viewingConfig.customerLeniencyEnabled)}
                  />
                </PolicyDetailSection>
              </PolicyDetailStack>
            ) : null}
          </Modal>

          <Modal
            open={deleteConfirmOpen}
            title="Delete cancellation policy"
            description={`Are you sure you want to delete “${policyToDelete?.name || "this policy"}”? This cannot be undone.`}
            onClose={handleCancelDelete}
            size="sm"
            primaryLabel={isDeleting ? "Deleting…" : "Delete"}
            secondaryLabel="Cancel"
            onPrimary={handleConfirmDelete}
            primaryDisabled={isDeleting}
            danger
          />

          {/* Cancellation Reasons Modal */}
          <Modal
        open={reasonsModalOpen}
        title={"MANAGE CANCELLATION REASONS"}
        onClose={handleCloseReasonsModal}
        size={"md"}
        primaryLabel={isCreatingReason ? "Saving…" : "Save Reasons"}
        secondaryLabel={"Cancel"}
        onPrimary={handleSubmitReasons}
        primaryDisabled={Boolean(isCreatingReason)}

      >
            <div className="flex flex-col gap-4">
              <p style={{ margin: 0, color: "var(--muted)" }}>
                Add cancellation reasons that customers can select when canceling their orders.
              </p>

              {cancelReasons.map((reason, index) => {
                const hasId = reasonIds[index] !== null && reasonIds[index] !== undefined;
                return (
                  <div
                    key={hasId ? `reason-${reasonIds[index]}` : `new-reason-${index}`}
                    className="flex items-center gap-2"
                  >
                    <div className="flex-1">
                      <Field label={index === 0 ? "Cancellation Reason" : ""}>
                      <Input placeholder={`Enter cancellation reason ${index + 1}`} value={reason} onChange={(e) => handleReasonChange(index, e.target.value)} disabled={hasId} />
                    </Field>
                    </div>
                    {(cancelReasons.length > 1 || hasId) && (
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => (hasId ? handleDeleteReason(index) : handleRemoveReason(index))}
                        title={hasId ? "Delete from database" : "Remove from list"}
                      >
                        <TbTrash size={16} />
                      </Button>
                    )}
                  </div>
                );
              })}

              <Button onClick={handleAddReason}>
                Add Another Reason
              </Button>
            </div>
          </Modal>
        </div>
  );
}

