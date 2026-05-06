import { useState, useEffect, useMemo } from "react";
import { Box, Typography, Divider, Button, Menu, MenuItem, Tooltip, CircularProgress } from "@mui/material";
import { TbCalendar, TbTrash, TbFilter } from "../../shared/icons/index";
import StyledCheckbox from "../../components/ui/StyledCheckbox";
import ChangeStatus from "../../components/ui/Switch";
import LabelWithTooltip from "../../components/ui/LabelWithTooltip";
import DataTable from "../../components/ui/DataTable";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import { useForm, Controller } from "react-hook-form";
import useToaster from "../../components/ui/Toaster";
import {
  useAddReschedulePolicyMutation,
  useGetReschedulePoliciesQuery,
  useLazyGetReschedulePoliciesQuery,
  useUpdateReschedulePolicyMutation,
  useDeleteReschedulePolicyMutation,
  useGetAllZonesQuery,
  useLazyGetZoneByIdQuery,
  useGetUnitsDistanceAndCurrencyQuery,
} from "../../store/services/api";
import { parsePoliciesListPayload, isPolicyConsideredActive } from "../../utilities/policyOverlapHelpers";
import {
  mergedZonesList,
  currencyCodeFromZone,
  buildCurrencyUnitsList,
  unwrapZoneFromApiResponse,
} from "../../utilities/zonesList";
import { Delay } from "../../components/shared/Loaders";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useSelector } from "react-redux";

export default function ReschedulePolicyContent({
  onAddButtonRef,
  zoneId: externalZoneId,
  onZoneIdChange,
  showZoneFilter = true,
}) {
  const { success, error: showError } = useToaster();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [isDefaultFilter, setIsDefaultFilter] = useState("");
  const [selectedZoneIdLocal, setSelectedZoneIdLocal] = useState("");
  const selectedZoneId =
    externalZoneId !== undefined ? externalZoneId : selectedZoneIdLocal;
  const setSelectedZoneId =
    typeof onZoneIdChange === "function" ? onZoneIdChange : setSelectedZoneIdLocal;
  const [zoneMenuAnchor, setZoneMenuAnchor] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [togglingActiveId, setTogglingActiveId] = useState(null);
  const [overlapModalOpen, setOverlapModalOpen] = useState(false);
  const [overlapZoneId, setOverlapZoneId] = useState(null);
  const [pendingAddPayload, setPendingAddPayload] = useState(null);
  const [overlapTogglingId, setOverlapTogglingId] = useState(null);
  const [overlapPolicyFetchAll, setOverlapPolicyFetchAll] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [isActiveFilter, isDefaultFilter, selectedZoneId, limit]);

  const { data: zonesQueryData } = useGetAllZonesQuery(undefined, {
    refetchOnMountOrArgChange: false,
  });
  const zonesReduxNode = useSelector((state) => state?.apiData?.zones);
  const zonesList = useMemo(
    () => mergedZonesList(zonesQueryData, zonesReduxNode),
    [zonesQueryData, zonesReduxNode]
  );
  const zoneOptions =
    zonesList.map((z) => ({ value: String(z.id), label: z.name })) || [];
  const selectedZoneLabel = zoneOptions.find((z) => z.value === String(selectedZoneId))?.label;

  const [fetchZoneById] = useLazyGetZoneByIdQuery();

  const { data: currencyUnitsPayload } = useGetUnitsDistanceAndCurrencyQuery("currency");
  const currencyUnitsRedux = useSelector((state) => state?.apiData?.units?.currency);
  const currencyUnitsList = useMemo(
    () => buildCurrencyUnitsList(currencyUnitsPayload, currencyUnitsRedux),
    [currencyUnitsPayload, currencyUnitsRedux]
  );

  const filterParams = {
    ...(isActiveFilter !== "" && { isActive: isActiveFilter }),
    ...(isDefaultFilter !== "" && { isDefault: isDefaultFilter }),
    ...(selectedZoneId !== "" && { zoneId: selectedZoneId }),
    ...(page && { page }),
    ...(limit && { limit }),
  };

  const { data: policiesResponse, isLoading, refetch } =
    useGetReschedulePoliciesQuery(filterParams);
  const [addReschedulePolicy, { isLoading: isAdding }] =
    useAddReschedulePolicyMutation();
  const [updateReschedulePolicy, { isLoading: isUpdating }] =
    useUpdateReschedulePolicyMutation();
  const [deleteReschedulePolicy, { isLoading: isDeleting }] =
    useDeleteReschedulePolicyMutation();
  const [fetchOverlapPolicies, { data: overlapPoliciesResponse, isFetching: overlapPoliciesLoading }] =
    useLazyGetReschedulePoliciesQuery();

  const isSubmitting = isAdding || isUpdating;

  const policies = policiesResponse?.data?.policies || [];
  const pagination = policiesResponse?.data?.pagination || {};
  const totalPages = pagination.pages || 1;

  const getNextVersionName = () => {
    const versions = policies
      .map((p) => String(p?.name || ""))
      .map((name) => {
        const m = name.match(/version\s+(\d+)(?:\.(\d+))?/i);
        if (!m) return null;
        const major = parseInt(m[1], 10);
        const minor = m[2] ? parseInt(m[2], 10) : 0;
        if (Number.isNaN(major) || Number.isNaN(minor)) return null;
        return { major, minor, full: major * 100 + minor };
      })
      .filter(Boolean)
      .sort((a, b) => b.full - a.full);

    if (versions.length === 0) return "Version 1";
    const highest = versions[0];
    if (highest.minor === 0) return `Version ${highest.major}.01`;
    const nextMinor = highest.minor + 1;
    return `Version ${highest.major}.${nextMinor.toString().padStart(2, "0")}`;
  };

  const rescheduleFormDefaults = {
    name: "",
    description: "",
    zoneId: "",
    effectiveFrom: dayjs(),
    effectiveTo: null,
    isActive: true,
    isDefault: false,
    currency: "USD",
    atPickupAbsoluteAmount: "",
    atPickupPercentage: "",
    atPickupCourtesyCount: 1,
    atPickupCourtesyCountEnabled: true,
    atDeliveryAbsoluteAmount: "",
    atDeliveryPercentage: "",
    atDeliveryCourtesyCount: 1,
    atDeliveryCourtesyCountEnabled: true,
    courtesyWindowDays: 30,
    courtesyCapAmount: 15,
    courtesyCount: 1,
    customerLeniencyEnabled: true,
  };

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: rescheduleFormDefaults,
  });

  const watchedZoneId = watch("zoneId");

  const currencyOptions = useMemo(() => {
    const base = [
      { value: "USD", label: "USD" },
      { value: "EUR", label: "EUR" },
      { value: "GBP", label: "GBP" },
    ];
    const z = zonesList.find((zone) => String(zone.id) === String(watchedZoneId));
    const code = currencyCodeFromZone(z, currencyUnitsList);
    if (code && !base.some((o) => o.value === code)) {
      return [...base, { value: code, label: code }];
    }
    return base;
  }, [zonesList, watchedZoneId, currencyUnitsList]);

  const columns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.05,
      minWidth: 60,
      sortable: true,
    },
    {
      field: "name",
      headerName: "Policy Name",
      flex: 0.12,
      minWidth: 150,
      sortable: true,
    },
    {
      field: "zoneName",
      headerName: "Zone",
      flex: 0.12,
      minWidth: 160,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.zoneName || "—"}
        </Typography>
      ),
    },
    {
      field: "description",
      headerName: "Description",
      flex: 0.15,
      minWidth: 180,
      sortable: true,
    },
    {
      field: "policyStatusAction",
      headerName: "Status / Action",
      flex: 0.11,
      minWidth: 160,
      sortable: false,
      renderCell: (row) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ChangeStatus
            width="45px"
            checked={isPolicyConsideredActive(row)}
            disabled={togglingActiveId !== null}
            onChange={(e) => handleTogglePolicyActive(row, e.target.checked)}
          />
          <Typography
            sx={{
              color: isPolicyConsideredActive(row) ? "success.main" : "text.secondary",
              fontWeight: 500,
              fontSize: "13px",
            }}
          >
            {isPolicyConsideredActive(row) ? "Active" : "Inactive"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "isDefault",
      headerName: "Default",
      flex: 0.08,
      minWidth: 80,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.isDefault ? "primary.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.isDefault ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "enableForPickup",
      headerName: "Pickup",
      flex: 0.07,
      minWidth: 70,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.enableForPickup ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.enableForPickup ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "enableForDelivery",
      headerName: "Delivery",
      flex: 0.07,
      minWidth: 80,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.enableForDelivery ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.enableForDelivery ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "feeType",
      headerName: "Fee Type",
      flex: 0.08,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            textTransform: "capitalize",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.feeType || "N/A"}
        </Typography>
      ),
    },
    {
      field: "currency",
      headerName: "Currency",
      flex: 0.07,
      minWidth: 80,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency || "N/A"}
        </Typography>
      ),
    },
    {
      field: "pickupRescheduleFee",
      headerName: "Pickup Amount",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency} {row.pickupRescheduleFee ?? "—"}
        </Typography>
      ),
    },
    {
      field: "atPickupPercentage",
      headerName: "Pickup %",
      flex: 0.06,
      minWidth: 80,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.atPickupPercentage !== "" && row.atPickupPercentage != null ? `${row.atPickupPercentage}%` : "—"}
        </Typography>
      ),
    },
    {
      field: "deliveryRescheduleFee",
      headerName: "Delivery Amount",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency} {row.deliveryRescheduleFee ?? "—"}
        </Typography>
      ),
    },
    {
      field: "atDeliveryPercentage",
      headerName: "Delivery %",
      flex: 0.06,
      minWidth: 80,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.atDeliveryPercentage !== "" && row.atDeliveryPercentage != null ? `${row.atDeliveryPercentage}%` : "—"}
        </Typography>
      ),
    },
    {
      field: "courtesyWindowDays",
      headerName: "Courtesy Window (days)",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.courtesyWindowDays ?? "—"}
        </Typography>
      ),
    },
    {
      field: "courtesyCapAmount",
      headerName: "Courtesy Cap",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.courtesyCapAmount ?? "—"}
        </Typography>
      ),
    },
    {
      field: "courtesyCount",
      headerName: "Courtesy Count",
      flex: 0.08,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.courtesyCount ?? row.maxRescheduleCount ?? "0"}
        </Typography>
      ),
    },
    {
      field: "customerLeniencyEnabled",
      headerName: "Leniency",
      flex: 0.06,
      minWidth: 80,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.customerLeniencyEnabled ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.customerLeniencyEnabled ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "createdAt",
      headerName: "Created At",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.createdAt || "N/A"}
        </Typography>
      ),
    },
    {
      field: "updatedAt",
      headerName: "Updated At",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.updatedAt || "N/A"}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.08,
      minWidth: 120,
      sortable: false,
      renderCell: (row) => (
        <Box className="flex items-center gap-2">
          <Box
            component="span"
            sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
            onClick={() => handleEdit(row)}
          >
            <Typography
              variant="body2"
              sx={{ color: "primary.main", fontWeight: 500 }}
            >
              Edit
            </Typography>
          </Box>
          <Box
            component="span"
            sx={{ cursor: "pointer", "&:hover": { opacity: 0.8 } }}
            onClick={() => handleDelete(row)}
          >
            <TbTrash size={18} color="#EF4444" />
          </Box>
        </Box>
      ),
    },
  ];

  const policiesData =
    policies?.map((policy, index) => {
      const config = policy.rescheduleConfig || policy.reschedulePolicyConfig || policy;
      const currency =
        config.atPickupAbsoluteCurrency ||
        config.atDeliveryAbsoluteCurrency ||
        config.currency ||
        "USD";
      const pickupFee =
        config.atPickupAbsoluteAmount ?? config.pickupRescheduleFee ?? 0;
      const deliveryFee =
        config.atDeliveryAbsoluteAmount ?? config.deliveryRescheduleFee ?? 0;
      const feeType =
        config.atPickupPercentage != null && config.atPickupPercentage !== "" ||
        config.atDeliveryPercentage != null && config.atDeliveryPercentage !== ""
          ? "percentage"
          : "absolute";
      const zoneName =
        policy.zone?.name ||
        zoneOptions.find((z) => String(z.value) === String(policy.zoneId))?.label ||
        null;
      return {
        id: policy.id,
        sl: (pagination.page - 1) * (pagination.limit || limit) + index + 1,
        name: policy.name,
        zoneId: policy.zoneId ?? null,
        zoneName,
        description: policy.description,
        isActive: policy.isActive,
        isDefault: policy.isDefault,
        enableForPickup: config.atPickupCourtesyCountEnabled ?? false,
        enableForDelivery: config.atDeliveryCourtesyCountEnabled ?? false,
        feeType,
        currency,
        pickupRescheduleFee: pickupFee,
        deliveryRescheduleFee: deliveryFee,
        atPickupAbsoluteAmount: config.atPickupAbsoluteAmount ?? "",
        atPickupPercentage: config.atPickupPercentage ?? "",
        atDeliveryAbsoluteAmount: config.atDeliveryAbsoluteAmount ?? "",
        atDeliveryPercentage: config.atDeliveryPercentage ?? "",
        courtesyWindowDays: config.courtesyWindowDays ?? 0,
        courtesyCapAmount: config.courtesyCapAmount ?? "",
        courtesyCount: config.courtesyCount ?? 0,
        customerLeniencyEnabled: config.customerLeniencyEnabled ?? false,
        maxRescheduleCount: config.courtesyCount ?? 0,
        createdAt: policy.createdAt
          ? new Date(policy.createdAt).toLocaleDateString()
          : "N/A",
        updatedAt: policy.updatedAt
          ? new Date(policy.updatedAt).toLocaleDateString()
          : "N/A",
        reschedulePolicyConfig: config,
        _rawPolicy: policy,
      };
    }) || [];

  useEffect(() => {
    if (policies.length > 0) {
      refetch();
    }
  }, []);

  const handleAdd = () => {
    setEditingPolicy(null);
    const nextVersionName = getNextVersionName();
    reset({ ...rescheduleFormDefaults, name: nextVersionName, zoneId: "" });
    setModalOpen(true);
  };

  useEffect(() => {
    if (onAddButtonRef) {
      onAddButtonRef.current = handleAdd;
    }
  }, [onAddButtonRef]);

  const handleEdit = (row) => {
    const policy = row._rawPolicy || policies.find((p) => p.id === row.id) || row;
    setEditingPolicy(policy);
    const config = policy.rescheduleConfig || policy.reschedulePolicyConfig || policy;
    const selectedCurrency =
      config.atPickupAbsoluteCurrency ||
      config.atDeliveryAbsoluteCurrency ||
      config.currency ||
      "USD";
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
      isDefault: policy.isDefault ?? false,
      currency: selectedCurrency,
      atPickupAbsoluteAmount:
        config.atPickupAbsoluteAmount != null ? String(config.atPickupAbsoluteAmount) : "",
      atPickupPercentage:
        config.atPickupPercentage != null ? String(config.atPickupPercentage) : "",
      atPickupCourtesyCount: config.atPickupCourtesyCount ?? 1,
      atPickupCourtesyCountEnabled: config.atPickupCourtesyCountEnabled ?? true,
      atDeliveryAbsoluteAmount:
        config.atDeliveryAbsoluteAmount != null ? String(config.atDeliveryAbsoluteAmount) : "",
      atDeliveryPercentage:
        config.atDeliveryPercentage != null ? String(config.atDeliveryPercentage) : "",
      atDeliveryCourtesyCount: config.atDeliveryCourtesyCount ?? 1,
      atDeliveryCourtesyCountEnabled: config.atDeliveryCourtesyCountEnabled ?? true,
      courtesyWindowDays: config.courtesyWindowDays ?? 30,
      courtesyCapAmount: config.courtesyCapAmount ?? 15,
      courtesyCount: config.courtesyCount ?? 1,
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
      await deleteReschedulePolicy(policyToDelete.id).unwrap();
      success("Reschedule policy deleted successfully!");
      setDeleteConfirmOpen(false);
      setPolicyToDelete(null);
      refetch();
    } catch (error) {
      console.error("Error deleting reschedule policy:", error);
      showError(
        error?.data?.message ||
          "Failed to delete reschedule policy. Please try again."
      );
      setDeleteConfirmOpen(false);
      setPolicyToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmOpen(false);
    setPolicyToDelete(null);
  };

  const handleTogglePolicyActive = async (row, nextActive) => {
    if (togglingActiveId !== null) return;
    if (isPolicyConsideredActive(row) === nextActive) return;
    setTogglingActiveId(row.id);
    try {
      await updateReschedulePolicy({
        id: row.id,
        body: { isActive: nextActive },
      }).unwrap();
      success(
        nextActive
          ? "Reschedule policy activated"
          : "Reschedule policy deactivated"
      );
      refetch();
    } catch (error) {
      console.error("Error updating reschedule policy status:", error);
      showError(
        error?.data?.message ||
          "Failed to update policy status. Please try again."
      );
    } finally {
      setTogglingActiveId(null);
    }
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
      await updateReschedulePolicy({
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
      console.error("Error updating overlapping reschedule policy:", error);
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
      await addReschedulePolicy(pendingAddPayload).unwrap();
      success("Reschedule policy added successfully!");
      handleCloseOverlapModal();
      setModalOpen(false);
      reset();
      setEditingPolicy(null);
      refetch();
    } catch (error) {
      console.error("Error retrying add reschedule policy:", error);
      const status = error?.status ?? error?.data?.statusCode;
      const msg = String(error?.data?.message || error?.data?.error || "");
      if (status === 409 && /overlap/i.test(msg) && overlapZoneId != null) {
        showError(
          msg ||
            "Still overlapping — turn off Active for the policies listed below, then try again."
        );
        refetchOverlapPoliciesList();
      } else {
        showError(
          error?.data?.message ||
            "Failed to add reschedule policy. Please try again."
        );
      }
    }
  };

  const onSubmit = async (data) => {
    let payload;
    try {
      const selectedCurrency = data.currency || "USD";
      const effectiveFromUtc = data.effectiveFrom
        ? dayjs(data.effectiveFrom).toDate().toISOString()
        : dayjs().toDate().toISOString();
      const effectiveToUtc = data.effectiveTo
        ? dayjs(data.effectiveTo).toDate().toISOString()
        : null;
      payload = {
        name: data.name,
        description: data.description,
        zoneId: data.zoneId ? parseInt(String(data.zoneId), 10) : null,
        effectiveFrom: effectiveFromUtc,
        effectiveTo: effectiveToUtc,
        isActive: !!data.isActive,
        isDefault: !!data.isDefault,
        atPickupAbsoluteCurrency: selectedCurrency,
        atPickupAbsoluteAmount:
          data.atPickupAbsoluteAmount !== ""
            ? parseFloat(data.atPickupAbsoluteAmount)
            : null,
        atPickupPercentage:
          data.atPickupPercentage !== ""
            ? parseFloat(data.atPickupPercentage)
            : null,
        atPickupCourtesyCount: Number(data.atPickupCourtesyCount) || 1,
        atPickupCourtesyCountEnabled: !!data.atPickupCourtesyCountEnabled,
        atDeliveryAbsoluteCurrency: selectedCurrency,
        atDeliveryAbsoluteAmount:
          data.atDeliveryAbsoluteAmount !== ""
            ? parseFloat(data.atDeliveryAbsoluteAmount)
            : null,
        atDeliveryPercentage:
          data.atDeliveryPercentage !== ""
            ? parseFloat(data.atDeliveryPercentage)
            : null,
        atDeliveryCourtesyCount: Number(data.atDeliveryCourtesyCount) || 1,
        atDeliveryCourtesyCountEnabled: !!data.atDeliveryCourtesyCountEnabled,
        courtesyWindowDays: Number(data.courtesyWindowDays) || 30,
        courtesyCapAmount: Number(data.courtesyCapAmount) || 15.0,
        courtesyCount: Number(data.courtesyCount) || 1,
        customerLeniencyEnabled: !!data.customerLeniencyEnabled,
      };

      if (editingPolicy) {
        await updateReschedulePolicy({
          id: editingPolicy.id,
          body: payload,
        }).unwrap();
        success("Reschedule policy updated successfully!");
      } else {
        await addReschedulePolicy(payload).unwrap();
        success("Reschedule policy added successfully!");
      }

      setModalOpen(false);
      reset();
      setEditingPolicy(null);
      refetch();
    } catch (error) {
      console.error("Error saving reschedule policy:", error);
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

      showError(
        error?.data?.message ||
          `Failed to ${
            editingPolicy ? "update" : "add"
          } reschedule policy. Please try again.`
      );
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingPolicy(null);
    reset();
  };

  const overlapPoliciesRaw = parsePoliciesListPayload(overlapPoliciesResponse);
  const overlapPoliciesList = overlapPolicyFetchAll
    ? overlapPoliciesRaw
    : overlapPoliciesRaw.filter(isPolicyConsideredActive);
  const overlapZoneLabel =
    overlapZoneId != null
      ? zoneOptions.find((z) => String(z.value) === String(overlapZoneId))?.label ||
        `Zone #${overlapZoneId}`
      : "";

  if (isLoading) {
    return <Delay />;
  }

  return (
    <Box>
      <Box sx={{ width: "100%", overflow: "visible" }}>
        {showZoneFilter && (
          <Box
            className="flex items-center gap-3 flex-wrap"
            sx={{ mb: 2, justifyContent: "flex-end" }}
          >
            <Tooltip
              title={
                selectedZoneLabel
                  ? `Zone: ${selectedZoneLabel}`
                  : "Filter by zone"
              }
            >
              <Button
                variant="outlined"
                onClick={(e) => setZoneMenuAnchor(e.currentTarget)}
                startIcon={<TbFilter size={18} />}
                sx={{
                  height: 40,
                  minWidth: 0,
                  px: 1.5,
                  borderRadius: "8px",
                  textTransform: "none",
                  fontFamily: "Inter",
                  bgcolor: "white",
                  border: selectedZoneId
                    ? "2px solid #000099"
                    : "1px solid #E5E7EB",
                  color: selectedZoneId ? "#000099" : "#64748B",
                  "&:hover": {
                    bgcolor: "#F8FAFC",
                    borderColor: selectedZoneId ? "#000099" : "#CBD5E1",
                  },
                  "& .MuiButton-startIcon": { mr: 0.5 },
                }}
              >
                Zone
              </Button>
            </Tooltip>
            <Menu
              anchorEl={zoneMenuAnchor}
              open={Boolean(zoneMenuAnchor)}
              onClose={() => setZoneMenuAnchor(null)}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              PaperProps={{
                sx: { minWidth: 220, borderRadius: 2, mt: 1 },
              }}
            >
              <MenuItem
                onClick={() => {
                  setSelectedZoneId("");
                  setZoneMenuAnchor(null);
                }}
                selected={selectedZoneId === ""}
              >
                All zones
              </MenuItem>
              {zoneOptions.map((z) => (
                <MenuItem
                  key={z.value}
                  onClick={() => {
                    setSelectedZoneId(z.value);
                    setZoneMenuAnchor(null);
                  }}
                  selected={String(selectedZoneId) === String(z.value)}
                >
                  {z.label}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        )}
        <DataTable
          data={policiesData}
          columns={columns}
          height={700}
          serverSidePagination={true}
          totalRows={pagination.total || 0}
          currentPage={page}
          pageSize={limit}
          onPageChange={(newPage) => setPage(newPage)}
          onPageSizeChange={(newPageSize) => {
            setLimit(newPageSize);
            setPage(1);
          }}
          onFiltersClick={() => setFilterModalOpen(true)}
          stickyLeftFields={["sl", "zoneName"]}
        />
      </Box>

      <ModalComponent
        open={modalOpen}
        title={editingPolicy ? "EDIT RESCHEDULE POLICY" : "ADD RESCHEDULE POLICY"}
        onClose={handleClose}
        width={900}
        primaryAction={{
          label: "Save",
          onClick: handleSubmit(onSubmit),
          isLoading: isSubmitting,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: handleClose,
        }}
      >
        <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Box className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Name, description and status for this reschedule policy.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="name"
                control={control}
                rules={{ required: "Policy name is required" }}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Policy Name*"
                    placeholder="e.g. Default Reschedule Policy"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    error={errors.name?.message}
                    disabled={!editingPolicy}
                    tooltipText={
                      editingPolicy
                        ? "Policy name/identifier. This is a required field and must be unique."
                        : "Policy name is auto-generated and cannot be edited."
                    }
                  />
                )}
              />
              <Controller
                name="description"
                control={control}
                rules={{ required: "Description is required" }}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Description*"
                    placeholder="e.g. Standard reschedule policy for customers"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    error={errors.description?.message}
                  />
                )}
              />
              <Controller
                name="zoneId"
                control={control}
                rules={{ required: "Zone is required" }}
                render={({ field: { onChange, value } }) => (
                  <Box>
                    <SelectField
                      title="Zone*"
                      value={value || ""}
                      onChange={(e) => {
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
                      }}
                      options={zoneOptions}
                      placeholder="Select zone"
                      fullWidth
                      tooltipText="Select which zone this policy applies to."
                    />
                    {errors.zoneId && (
                      <Typography
                        variant="caption"
                        sx={{ color: "error.main", mt: 1, display: "block" }}
                      >
                        {errors.zoneId.message}
                      </Typography>
                    )}
                  </Box>
                )}
              />
              <Controller
                name="currency"
                control={control}
                render={({ field: { value } }) => (
                  <InputFieldModal
                    title="Currency"
                    value={value ?? ""}
                    onChange={() => {}}
                    placeholder={watchedZoneId ? "Set from zone" : "Select zone first"}
                    disabled
                    tooltipText="Currency follows the selected zone. Change the zone to change currency."
                  />
                )}
              />
              <Box className="grid grid-cols-2 gap-4">
                <Controller
                  name="effectiveFrom"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box sx={{ width: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: "4px", mb: "8px" }}>
                        <Typography variant="body2" sx={{ color: "#374151" }}>
                          Effective From
                        </Typography>
                      </Box>
                      <DatePicker
                        value={value || dayjs()}
                        onChange={(newValue) => onChange(newValue)}
                        slotProps={{
                          textField: {
                            placeholder: "Select effective from",
                            fullWidth: true,
                            sx: {
                              width: "100%",
                              "& .MuiOutlinedInput-root": {
                                height: "52px",
                                borderRadius: "8px",
                                backgroundColor: "#F4F7FF !important",
                                fontFamily: "Switzer",
                                border: "none !important",
                                boxShadow: "none !important",
                                "& fieldset": {
                                  border: "none !important",
                                  display: "none",
                                },
                              },
                            },
                          },
                        }}
                        slots={{
                          openPickerIcon: () => <TbCalendar size={20} style={{ color: "#6B7280" }} />,
                        }}
                      />
                    </Box>
                  )}
                />
                <Controller
                  name="effectiveTo"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box sx={{ width: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: "4px", mb: "8px" }}>
                        <Typography variant="body2" sx={{ color: "#374151" }}>
                          Effective To
                        </Typography>
                      </Box>
                      <DatePicker
                        value={value}
                        onChange={(newValue) => onChange(newValue)}
                        slotProps={{
                          textField: {
                            placeholder: "Select effective to",
                            fullWidth: true,
                            sx: {
                              width: "100%",
                              "& .MuiOutlinedInput-root": {
                                height: "52px",
                                borderRadius: "8px",
                                backgroundColor: "#F4F7FF !important",
                                fontFamily: "Switzer",
                                border: "none !important",
                                boxShadow: "none !important",
                                "& fieldset": {
                                  border: "none !important",
                                  display: "none",
                                },
                              },
                            },
                          },
                        }}
                        slots={{
                          openPickerIcon: () => <TbCalendar size={20} style={{ color: "#6B7280" }} />,
                        }}
                      />
                    </Box>
                  )}
                />
              </Box>
              <Box className="grid grid-cols-2 gap-4">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box className="flex items-center gap-2">
                      <StyledCheckbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />
                      <LabelWithTooltip label="Active" tooltipText="Policy is active and applicable." />
                    </Box>
                  )}
                />
                <Controller
                  name="isDefault"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box className="flex items-center gap-2">
                      <StyledCheckbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />
                      <LabelWithTooltip label="Default policy" tooltipText="Use as default reschedule policy." />
                    </Box>
                  )}
                />
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* At Pickup */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              At Pickup
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Fees and courtesy settings when rescheduling at pickup.
            </Typography>
            <Box className="grid grid-cols-2 gap-4">
              <Controller
                name="atPickupAbsoluteAmount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Absolute amount"
                    placeholder="Leave empty for none"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="atPickupPercentage"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Percentage (%)"
                    placeholder="Leave empty for none"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="atPickupCourtesyCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Courtesy count"
                    placeholder="e.g. 1"
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="atPickupCourtesyCountEnabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />
                    <LabelWithTooltip label="Courtesy count enabled" tooltipText="Allow free reschedules up to courtesy count at pickup." />
                  </Box>
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* At Delivery */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              At Delivery
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Fees and courtesy settings when rescheduling at delivery.
            </Typography>
            <Box className="grid grid-cols-2 gap-4">
              <Controller
                name="atDeliveryAbsoluteAmount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Absolute amount"
                    placeholder="Leave empty for none"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="atDeliveryPercentage"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Percentage (%)"
                    placeholder="Leave empty for none"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="atDeliveryCourtesyCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Courtesy count"
                    placeholder="e.g. 1"
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="atDeliveryCourtesyCountEnabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />
                    <LabelWithTooltip label="Courtesy count enabled" tooltipText="Allow free reschedules up to courtesy count at delivery." />
                  </Box>
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Courtesy & Leniency */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Courtesy & Leniency
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Global courtesy window and customer leniency.
            </Typography>
            <Box className="grid grid-cols-2 gap-4">
              <Controller
                name="courtesyWindowDays"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Courtesy window (days)"
                    placeholder="e.g. 30"
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="courtesyCapAmount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Courtesy cap amount"
                    placeholder="e.g. 15.00"
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="courtesyCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Courtesy count"
                    placeholder="e.g. 1"
                    type="number"
                    value={value ?? ""}
                    onChange={(e) => onChange(e.target.value)}
                  />
                )}
              />
              <Controller
                name="customerLeniencyEnabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox checked={!!value} onChange={(e) => onChange(e.target.checked)} />
                    <LabelWithTooltip label="Customer leniency enabled" tooltipText="Apply leniency rules for reschedule." />
                  </Box>
                )}
              />
            </Box>
          </Box>
        </Box>
        </LocalizationProvider>
      </ModalComponent>

      <ModalComponent
        open={overlapModalOpen}
        title="ACTIVE RESCHEDULE POLICY IN THIS ZONE"
        onClose={handleCloseOverlapModal}
        width={640}
        primaryAction={{
          label: "Retry saving new policy",
          onClick: handleRetryPendingAdd,
          isLoading: isAdding,
        }}
        secondaryAction={{
          label: "Close",
          onClick: handleCloseOverlapModal,
        }}
      >
        <Box className="flex flex-col gap-3">
          <Typography variant="body2" sx={{ color: "grey.80", fontFamily: "Switzer" }}>
            Another active reschedule policy in{" "}
            <Typography component="span" sx={{ fontWeight: 600 }}>
              {overlapZoneLabel || "this zone"}
            </Typography>{" "}
            overlaps the dates you chose. Deactivate it below, then retry saving your new policy.
          </Typography>
          {overlapPoliciesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={32} />
            </Box>
          ) : overlapPoliciesList.length === 0 ? (
            <Box className="flex flex-col gap-2">
              <Typography variant="body2" color="text.secondary">
                {overlapPolicyFetchAll
                  ? "No policies were returned for this zone. Check the zone or try again later."
                  : "We could not list active policies for this zone. Load all policies for the zone below, then switch off Active on the overlapping policy."}
              </Typography>
              {!overlapPolicyFetchAll && overlapZoneId != null && (
                <Button
                  variant="outlined"
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
                <Button variant="text" size="small" onClick={refetchOverlapPoliciesList}>
                  Refresh list
                </Button>
              )}
            </Box>
          ) : (
            <Box className="flex flex-col gap-2">
              {overlapPoliciesList.map((policy) => {
                const from =
                  policy.effectiveFrom || policy.created_date || policy.createdAt;
                const to = policy.effectiveTo || policy.expiry_date || policy.expiryDate;
                const fromLabel = from ? new Date(from).toLocaleDateString() : "—";
                const toLabel = to ? new Date(to).toLocaleDateString() : "Open-ended";
                return (
                  <Box
                    key={policy.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      flexWrap: "wrap",
                      p: 1.5,
                      borderRadius: 1,
                      bgcolor: "grey.50",
                      border: "1px solid",
                      borderColor: "grey.200",
                    }}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "14px" }}>
                        {policy.name || `Policy #${policy.id}`}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        ID {policy.id} · {fromLabel} → {toLabel}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <ChangeStatus
                        width="45px"
                        checked={isPolicyConsideredActive(policy)}
                        disabled={overlapTogglingId !== null}
                        onChange={(e) =>
                          handleOverlapPolicyToggle(policy, e.target.checked)
                        }
                      />
                      <Typography
                        sx={{
                          fontSize: "13px",
                          fontWeight: 500,
                          color: isPolicyConsideredActive(policy)
                            ? "success.main"
                            : "text.secondary",
                        }}
                      >
                        {isPolicyConsideredActive(policy) ? "Active" : "Inactive"}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </ModalComponent>

      <ModalComponent
        open={deleteConfirmOpen}
        title="DELETE RESCHEDULE POLICY"
        onClose={handleCancelDelete}
        width={500}
        primaryAction={{
          label: "Delete",
          onClick: handleConfirmDelete,
          isLoading: isDeleting,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: handleCancelDelete,
        }}
      >
        <Box className="flex flex-col gap-4">
          <Typography variant="body1" sx={{ color: "grey.80", fontFamily: "Switzer" }}>
            Are you sure you want to delete the reschedule policy "
            {policyToDelete?.name}"?
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "error.main", fontFamily: "Switzer" }}
          >
            This action cannot be undone.
          </Typography>
        </Box>
      </ModalComponent>

      <ModalComponent
        open={filterModalOpen}
        title="FILTERS"
        onClose={() => setFilterModalOpen(false)}
        width={600}
        primaryAction={{
          label: "Apply",
          onClick: () => {
            setFilterModalOpen(false);
            refetch();
          },
        }}
        secondaryAction={{
          label: "Reset",
          onClick: () => {
            setIsActiveFilter("");
            setIsDefaultFilter("");
            setPage(1);
            setLimit(10);
          },
        }}
      >
        <Box className="flex flex-col gap-4">
          <Box>
            <SelectField
              title="Status"
              value={isActiveFilter}
              onChange={(e) => setIsActiveFilter(e.target.value)}
              options={[
                { value: "", label: "All Status" },
                { value: "1", label: "Active" },
                { value: "0", label: "Inactive" },
              ]}
              placeholder="Select Status"
              fullWidth
              bgcolor="grey.60"
            />
          </Box>
          <Box>
            <SelectField
              title="Default"
              value={isDefaultFilter}
              onChange={(e) => setIsDefaultFilter(e.target.value)}
              options={[
                { value: "", label: "All Default" },
                { value: "1", label: "Default" },
                { value: "0", label: "Not Default" },
              ]}
              placeholder="Select Default"
              fullWidth
              bgcolor="grey.60"
            />
          </Box>
        </Box>
      </ModalComponent>
    </Box>
  );
}
