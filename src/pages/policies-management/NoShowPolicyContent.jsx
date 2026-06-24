import { useState, useEffect, useMemo } from "react";
import { Box, Typography, Divider, Button, Menu, MenuItem, Tooltip, CircularProgress } from "@mui/material";
import { TbPlus, TbCalendar, TbFilter } from "../../shared/icons/index";
import StyledCheckbox from "../../components/ui/StyledCheckbox";
import ChangeStatus from "../../components/ui/Switch";
import LabelWithTooltip from "../../components/ui/LabelWithTooltip";
import DataTable from "../../components/ui/DataTable";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import { useForm, Controller } from "react-hook-form";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import useToaster from "../../components/ui/Toaster";
import {
  useAddNoShowPolicyMutation,
  useGetNoShowPoliciesQuery,
  useLazyGetNoShowPoliciesQuery,
  useUpdateNoShowPolicyMutation,
  useDeleteNoShowPolicyMutation,
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
export default function NoShowPolicyContent({
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
  
  // Filter states
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
  // Reset page to 1 when filters change
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

  const { data: policiesResponse, isLoading, refetch } = useGetNoShowPoliciesQuery(filterParams);
  const [addNoShowPolicy, { isLoading: isAdding }] = useAddNoShowPolicyMutation();
  const [updateNoShowPolicy, { isLoading: isUpdating }] = useUpdateNoShowPolicyMutation();
  const [deleteNoShowPolicy, { isLoading: isDeleting }] = useDeleteNoShowPolicyMutation();
  const [fetchOverlapPolicies, { data: overlapPoliciesResponse, isFetching: overlapPoliciesLoading }] =
    useLazyGetNoShowPoliciesQuery();

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
      enableForPickup: true,
      enableForDelivery: true,
      useUnifiedFee: true,
      feeType: "absolute",
      currency: "USD",
      pickupNoShowFee: "",
      deliveryNoShowFee: "",
      storageFeePerDay: "",
      percentageFee: "",
      graceMinutesOnSite: "",
      driverLateSLA: "",
      callsMinutes: "",
      smsMinutes: "",
      // Delivery Options section removed from UI
      waiverType: "absolute",
      absoluteWaiverAmount: "",
      percentageWaiverAmount: "",
      autoForgiveFirstNoShow: true,
      autoForgiveCount: "",
      autoForgivePeriod: "",
      requirePaymentAfterCap: true,
      perCustomerCap: "",
      capWindowDays: "",
    },
  });

  const useUnifiedFee = watch("useUnifiedFee");
  const feeType = watch("feeType");
  const waiverType = watch("waiverType");
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

  // Table columns
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
      field: "pickupNoShowFee",
      headerName: "Pickup Fee",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency} {row.pickupNoShowFee || "0.00"}
        </Typography>
      ),
    },
    {
      field: "deliveryNoShowFee",
      headerName: "Delivery Fee",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency} {row.deliveryNoShowFee || "0.00"}
        </Typography>
      ),
    },
    {
      field: "storageFeePerDay",
      headerName: "Storage Fee/Day",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency} {row.storageFeePerDay || "0.00"}
        </Typography>
      ),
    },
    {
      field: "percentageFee",
      headerName: "Percentage Fee",
      flex: 0.08,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.percentageFee ? `${row.percentageFee}%` : "N/A"}
        </Typography>
      ),
    },
    {
      field: "graceMinutesOnSite",
      headerName: "Grace Mins",
      flex: 0.07,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.graceMinutesOnSite || "0"} min
        </Typography>
      ),
    },
    {
      field: "driverLateSLA",
      headerName: "Driver SLA",
      flex: 0.08,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.driverLateSLA || "0"} min
        </Typography>
      ),
    },
    {
      field: "callsMinutes",
      headerName: "Calls Mins",
      flex: 0.07,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.callsMinutes || "0"} min
        </Typography>
      ),
    },
    {
      field: "smsMinutes",
      headerName: "SMS Mins",
      flex: 0.07,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.smsMinutes || "0"} min
        </Typography>
      ),
    },
    // Delivery Options columns removed
    {
      field: "waiverType",
      headerName: "Waiver Type",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            textTransform: "capitalize",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.waiverType || "N/A"}
        </Typography>
      ),
    },
    {
      field: "absoluteWaiverAmount",
      headerName: "Abs Waiver",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.absoluteWaiverAmount
            ? `${row.currency} ${row.absoluteWaiverAmount}`
            : "N/A"}
        </Typography>
      ),
    },
    {
      field: "percentageWaiverAmount",
      headerName: "% Waiver",
      flex: 0.08,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.percentageWaiverAmount
            ? `${row.percentageWaiverAmount}%`
            : "N/A"}
        </Typography>
      ),
    },
    {
      field: "autoForgiveFirstNoShow",
      headerName: "Auto Forgive",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.autoForgiveFirstNoShow
              ? "success.main"
              : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.autoForgiveFirstNoShow ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "autoForgiveCount",
      headerName: "Forgive Count",
      flex: 0.09,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.autoForgiveCount || "0"}
        </Typography>
      ),
    },
    {
      field: "autoForgivePeriod",
      headerName: "Forgive Period",
      flex: 0.09,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.autoForgivePeriod ? `${row.autoForgivePeriod} days` : "N/A"}
        </Typography>
      ),
    },
    {
      field: "requirePaymentAfterCap",
      headerName: "Payment After Cap",
      flex: 0.1,
      minWidth: 130,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.requirePaymentAfterCap
              ? "success.main"
              : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.requirePaymentAfterCap ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "perCustomerCap",
      headerName: "Per Customer Cap",
      flex: 0.1,
      minWidth: 130,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.perCustomerCap || "0"}
        </Typography>
      ),
    },
    {
      field: "capWindowDays",
      headerName: "Cap Window",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.capWindowDays ? `${row.capWindowDays} days` : "N/A"}
        </Typography>
      ),
    },
    {
      field: "useUnifiedFee",
      headerName: "Unified Fee",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.useUnifiedFee ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.useUnifiedFee ? "Yes" : "No"}
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
  ];

  // Prepare table data
  const policiesData = policies?.map((policy, index) => {
    const config = policy.noShowPolicyConfig || {};
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
      type: policy.type,
      createdAt: policy.createdAt
        ? new Date(policy.createdAt).toLocaleDateString()
        : "N/A",
      updatedAt: policy.updatedAt
        ? new Date(policy.updatedAt).toLocaleDateString()
        : "N/A",
      // Enablement Settings
      enableForPickup: config.enableForPickup ?? false,
      enableForDelivery: config.enableForDelivery ?? false,
      useUnifiedFee: config.useUnifiedFee ?? false,
      // Fee Configuration
      feeType: config.feeType || "N/A",
      currency: config.currency || "USD",
      pickupNoShowFee: config.pickupNoShowFee || "0.00",
      deliveryNoShowFee: config.deliveryNoShowFee || "0.00",
      storageFeePerDay: config.storageFeePerDay || "0.00",
      percentageFee: config.percentageFee || null,
      // Timing Settings
      graceMinutesOnSite: config.graceMinutesOnSite || 0,
      driverLateSLA: config.driverLateSLA || 0,
      callsMinutes: config.callsMinutes || 0,
      smsMinutes: config.smsMinutes || 0,
      // Delivery Options (removed)
      // Waiver Settings
      waiverType: config.waiverType || "N/A",
      absoluteWaiverAmount: config.absoluteWaiverAmount || null,
      percentageWaiverAmount: config.percentageWaiverAmount || null,
      // Auto Forgive Settings
      autoForgiveFirstNoShow: config.autoForgiveFirstNoShow ?? false,
      autoForgiveCount: config.autoForgiveCount || 0,
      autoForgivePeriod: config.autoForgivePeriod || null,
      // Cap Settings
      requirePaymentAfterCap: config.requirePaymentAfterCap ?? false,
      perCustomerCap: config.perCustomerCap || 0,
      capWindowDays: config.capWindowDays || null,
      // Keep original config for edit functionality
      noShowPolicyConfig: policy.noShowPolicyConfig,
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
    reset({
      name: nextVersionName,
      description: "",
      zoneId: "",
      effectiveFrom: dayjs(),
      effectiveTo: null,
      isActive: true,
      isDefault: true,
      enableForPickup: true,
      enableForDelivery: true,
      useUnifiedFee: true,
      feeType: "absolute",
      currency: "USD",
      pickupNoShowFee: "",
      deliveryNoShowFee: "",
      storageFeePerDay: "",
      percentageFee: "",
      graceMinutesOnSite: "",
      driverLateSLA: "",
      callsMinutes: "",
      smsMinutes: "",
      // Delivery Options section removed from UI
      waiverType: "absolute",
      absoluteWaiverAmount: "",
      percentageWaiverAmount: "",
      autoForgiveFirstNoShow: true,
      autoForgiveCount: "",
      autoForgivePeriod: "",
      requirePaymentAfterCap: true,
      perCustomerCap: "",
      capWindowDays: "",
    });
    setModalOpen(true);
  };

  // Expose add handler to parent via ref
  useEffect(() => {
    if (onAddButtonRef) {
      onAddButtonRef.current = handleAdd;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onAddButtonRef]);

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    const config = policy.noShowPolicyConfig || {};
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
      enableForPickup: config.enableForPickup ?? true,
      enableForDelivery: config.enableForDelivery ?? true,
      useUnifiedFee: config.useUnifiedFee ?? true,
      feeType: config.feeType || "absolute",
      currency: config.currency || "USD",
      pickupNoShowFee: config.pickupNoShowFee?.toString() || "",
      deliveryNoShowFee: config.deliveryNoShowFee?.toString() || "",
      storageFeePerDay: config.storageFeePerDay?.toString() || "",
      percentageFee: config.percentageFee?.toString() || "",
      graceMinutesOnSite: config.graceMinutesOnSite?.toString() || "",
      driverLateSLA: config.driverLateSLA?.toString() || "",
      callsMinutes: config.callsMinutes?.toString() || "",
      smsMinutes: config.smsMinutes?.toString() || "",
      // Delivery Options section removed from UI
      waiverType: config.waiverType || "absolute",
      absoluteWaiverAmount: config.absoluteWaiverAmount?.toString() || "",
      percentageWaiverAmount: config.percentageWaiverAmount?.toString() || "",
      autoForgiveFirstNoShow: config.autoForgiveFirstNoShow ?? true,
      autoForgiveCount: config.autoForgiveCount?.toString() || "",
      autoForgivePeriod: config.autoForgivePeriod?.toString() || "",
      requirePaymentAfterCap: config.requirePaymentAfterCap ?? true,
      perCustomerCap: config.perCustomerCap?.toString() || "",
      capWindowDays: config.capWindowDays?.toString() || "",
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
      await deleteNoShowPolicy(policyToDelete.id).unwrap();
      success("No-show policy deleted successfully!");
      setDeleteConfirmOpen(false);
      setPolicyToDelete(null);
      refetch();
    } catch (error) {
      console.error("Error deleting no-show policy:", error);
      showError(error?.data?.message || "Failed to delete no-show policy. Please try again.");
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
      await updateNoShowPolicy({
        id: row.id,
        body: { isActive: nextActive },
      }).unwrap();
      success(
        nextActive ? "No-show policy activated" : "No-show policy deactivated"
      );
      refetch();
    } catch (error) {
      console.error("Error updating no-show policy status:", error);
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
      await updateNoShowPolicy({
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
      console.error("Error updating overlapping no-show policy:", error);
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
      await addNoShowPolicy(pendingAddPayload).unwrap();
      success("No-show policy added successfully!");
      handleCloseOverlapModal();
      setModalOpen(false);
      reset();
      setEditingPolicy(null);
      refetch();
    } catch (error) {
      console.error("Error retrying add no-show policy:", error);
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
            "Failed to add no-show policy. Please try again."
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

      payload = {
        name: data.name,
        description: data.description,
        zoneId: data.zoneId ? parseInt(String(data.zoneId), 10) : null,
        effectiveFrom: effectiveFromUtc,
        effectiveTo: effectiveToUtc,
        isActive: !!data.isActive,
        isDefault: !!data.isDefault,
        enableForPickup: data.enableForPickup,
        enableForDelivery: data.enableForDelivery,
        useUnifiedFee: data.useUnifiedFee,
        feeType: data.feeType,
        currency: data.currency,
        pickupNoShowFee: data.pickupNoShowFee ? parseFloat(data.pickupNoShowFee) : 0,
        deliveryNoShowFee: data.deliveryNoShowFee ? parseFloat(data.deliveryNoShowFee) : 0,
        storageFeePerDay: data.storageFeePerDay ? parseFloat(data.storageFeePerDay) : 0,
        percentageFee: data.percentageFee ? parseFloat(data.percentageFee) : 0,
        graceMinutesOnSite: data.graceMinutesOnSite ? parseInt(data.graceMinutesOnSite) : 0,
        driverLateSLA: data.driverLateSLA ? parseInt(data.driverLateSLA) : 0,
        callsMinutes: data.callsMinutes ? parseInt(data.callsMinutes) : 0,
        smsMinutes: data.smsMinutes ? parseInt(data.smsMinutes) : 0,
        // Delivery Options removed from UI (not sent)
        waiverType: data.waiverType,
        absoluteWaiverAmount: data.absoluteWaiverAmount ? parseFloat(data.absoluteWaiverAmount) : 0,
        percentageWaiverAmount: data.percentageWaiverAmount ? parseFloat(data.percentageWaiverAmount) : 0,
        autoForgiveFirstNoShow: data.autoForgiveFirstNoShow,
        autoForgiveCount: data.autoForgiveCount ? parseInt(data.autoForgiveCount) : 0,
        autoForgivePeriod: data.autoForgivePeriod ? parseInt(data.autoForgivePeriod) : 0,
        requirePaymentAfterCap: data.requirePaymentAfterCap,
        perCustomerCap: data.perCustomerCap ? parseInt(data.perCustomerCap) : 0,
        capWindowDays: data.capWindowDays ? parseInt(data.capWindowDays) : 0,
      };

      if (editingPolicy) {
        await updateNoShowPolicy({ id: editingPolicy.id, body: payload }).unwrap();
        success("No-show policy updated successfully!");
      } else {
        await addNoShowPolicy(payload).unwrap();
        success("No-show policy added successfully!");
      }

      setModalOpen(false);
      reset();
      setEditingPolicy(null);
      refetch();
    } catch (error) {
      console.error("Error saving no-show policy:", error);
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
          `Failed to ${editingPolicy ? "update" : "add"} no-show policy. Please try again.`
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
      {/* Data Table */}
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
          onPageChange={(newPage) => {
            setPage(newPage);
          }}
          onPageSizeChange={(newPageSize) => {
            setLimit(newPageSize);
            setPage(1);
          }}
          onFiltersClick={() => setFilterModalOpen(true)}
          stickyLeftFields={["sl", "zoneName"]}
        />
      </Box>

      {/* Add/Edit Modal */}
      <ModalComponent
        open={modalOpen}
        title={editingPolicy ? "EDIT NO SHOW POLICY" : "NO SHOW POLICY"}
        onClose={handleClose}
        width={800}
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
          <Box className="flex flex-col gap-6">
          {/* Basic Information */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Configure the fundamental settings for this no-show policy, including name, description, and activation status.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="name"
                control={control}
                rules={{ required: "Policy name is required" }}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Policy Name*"
                    placeholder="Enter policy name"
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
                    placeholder="Enter description"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    error={errors.description?.message}
                    tooltipText="Policy description or notes. Optional field to provide additional context about the policy."
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
              <Box className="grid grid-cols-2 gap-4">
                <Controller
                  name="effectiveFrom"
                  control={control}
                  render={({ field: { value } }) => (
                    <Box sx={{ width: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: "4px", mb: "8px" }}>
                        <Typography variant="body2" sx={{ color: "#374151" }}>
                          Effective From
                        </Typography>
                      </Box>
                      <DatePicker
                        value={value || dayjs()}
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
                                "&:hover fieldset": {
                                  border: "none !important",
                                },
                                "&.Mui-focused fieldset": {
                                  border: "none !important",
                                },
                                "&.Mui-disabled": {
                                  backgroundColor: "#F3F4F6 !important",
                                  border: "none !important",
                                  boxShadow: "none !important",
                                },
                              },
                              "& .MuiPickersInputBase-root": {
                                backgroundColor: "#F4F7FF !important",
                                border: "none !important",
                                boxShadow: "none !important",
                                "&.Mui-disabled": {
                                  backgroundColor: "#F3F4F6 !important",
                                  border: "none !important",
                                  boxShadow: "none !important",
                                },
                              },
                              "& .MuiInputBase-input": {
                                fontFamily: "Switzer",
                                fontSize: "16px",
                                color: "#374151",
                                backgroundColor: "transparent",
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
                                "& fieldset": {
                                  border: "1px solid #D0D5DD",
                                },
                              },
                              "& .MuiPickersInputBase-root": {
                                backgroundColor: "#F4F7FF !important",
                              },
                              "& .MuiInputBase-input": {
                                fontFamily: "Switzer",
                                fontSize: "16px",
                                color: "#374151",
                                backgroundColor: "transparent",
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
            </Box>
          </Box>

          <Divider />

          {/* Enablement Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Enablement Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Specify which order types this no-show policy applies to. Enable the policy for pickup orders, delivery orders, or both, and choose whether to use unified fees.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="enableForPickup"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Enable For Pickup"
                      tooltipText="Enable no-show policy for pickup orders. When enabled, this policy will apply to pickup order no-shows."
                    />
                  </Box>
                )}
              />
              <Controller
                name="enableForDelivery"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Enable For Delivery"
                      tooltipText="Enable no-show policy for delivery orders. When enabled, this policy will apply to delivery order no-shows."
                    />
                  </Box>
                )}
              />
              <Controller
                name="useUnifiedFee"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Use Unified Fee"
                      tooltipText="Use unified fee for both pickup and delivery. When enabled, the same fee amount applies to both pickup and delivery no-shows."
                    />
                  </Box>
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Fee Configuration */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Fee Configuration
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Define the fee structure for no-show charges. Set absolute amounts, percentage-based fees, storage fees, and choose between unified or separate fees for pickup and delivery.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="feeType"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <SelectField
                    title="Fee Type"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={[
                      { value: "absolute", label: "Absolute" },
                      { value: "percentage", label: "Percentage" },
                    ]}
                    placeholder="Select Fee Type"
                    fullWidth
                    tooltipText="Fee calculation type. Choose 'Absolute' for fixed amount fees or 'Percentage' for percentage-based fees."
                  />
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
              {!useUnifiedFee && (
                <>
                  <Controller
                    name="pickupNoShowFee"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Pickup No-Show Fee"
                        placeholder="Enter pickup no-show fee"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="No-show fee for pickup orders in absolute amount. Default: 15.00"
                      />
                    )}
                  />
                  <Controller
                    name="deliveryNoShowFee"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Delivery No-Show Fee"
                        placeholder="Enter delivery no-show fee"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="No-show fee for delivery orders in absolute amount. Default: 20.00"
                      />
                    )}
                  />
                </>
              )}
              {useUnifiedFee && (
                <Controller
                  name="pickupNoShowFee"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="No-Show Fee"
                      placeholder="Enter no-show fee"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Unified no-show fee applied to both pickup and delivery orders when 'Use Unified Fee' is enabled."
                    />
                  )}
                />
              )}
              <Controller
                name="storageFeePerDay"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Storage Fee Per Day"
                    placeholder="Enter storage fee per day"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Daily storage fee for unclaimed orders. This fee is charged per day for orders that remain unclaimed. Default: 1.00"
                  />
                )}
              />
              {feeType === "percentage" && (
                <Controller
                  name="percentageFee"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Percentage Fee (%)"
                      placeholder="Enter percentage fee"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Percentage fee (e.g., 5.00 for 5%). Used when Fee Type is 'Percentage' or 'Both'."
                    />
                  )}
                />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Timing Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Timing Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Configure time-based rules for no-show detection. Set grace periods, driver SLA thresholds, and waiting times for calls and SMS notifications before a no-show is declared.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="graceMinutesOnSite"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Grace Minutes On Site"
                    placeholder="Enter grace minutes"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Minutes to wait before no-show applies. The driver will wait this many minutes before considering it a no-show. Default: 15"
                  />
                )}
              />
              <Controller
                name="driverLateSLA"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Driver Late SLA (Minutes)"
                    placeholder="Enter driver late SLA"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Driver late SLA in minutes - auto-waive if exceeded. If the driver arrives later than this time, the no-show fee is automatically waived. Default: 30"
                  />
                )}
              />
              <Controller
                name="callsMinutes"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Calls Minutes"
                    placeholder="Enter calls minutes"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Minutes to wait before no-show applies for calls. Time to wait after making a call before considering it a no-show. Default: 5"
                  />
                )}
              />
              <Controller
                name="smsMinutes"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="SMS Minutes"
                    placeholder="Enter SMS minutes"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Minutes to wait before no-show applies for SMS. Time to wait after sending an SMS before considering it a no-show. Default: 5"
                  />
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Waiver Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Waiver Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Configure automatic fee waivers based on order value or absolute amounts. Set thresholds that automatically waive no-show fees for smaller orders or specific conditions.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="waiverType"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <SelectField
                    title="Waiver Type"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={[
                      { value: "absolute", label: "Absolute" },
                      { value: "percentage", label: "Percentage" },
                    ]}
                    placeholder="Select Waiver Type"
                    fullWidth
                    tooltipText="Waiver calculation type. Choose 'Absolute' for fixed amount waivers or 'Percentage' for percentage-based waivers."
                  />
                )}
              />
              {waiverType === "absolute" && (
                <Controller
                  name="absoluteWaiverAmount"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Absolute Waiver Amount"
                      placeholder="Enter absolute waiver amount"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Absolute amount for auto-waive. Used when Waiver Type is 'Absolute' or 'Both'. Orders below this amount will have fees automatically waived."
                    />
                  )}
                />
              )}
              {waiverType === "percentage" && (
                <Controller
                  name="percentageWaiverAmount"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Percentage Waiver Amount (%)"
                      placeholder="Enter percentage waiver amount"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Percentage of order value for auto-waive (e.g., 5.00 for 5%). Used when Waiver Type is 'Percentage' or 'Both'."
                    />
                  )}
                />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Auto Forgive Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Auto Forgive Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Automatically forgive no-show fees for customers within specified limits. Configure how many no-shows to forgive, over what time period, to provide leniency for occasional issues.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="autoForgiveFirstNoShow"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Auto Forgive First No-Show"
                      tooltipText="Automatically forgive first no-show. When enabled, the first no-show for each customer is automatically forgiven without charging a fee. Default: true"
                    />
                  </Box>
                )}
              />
              <Controller
                name="autoForgiveCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Auto Forgive Count"
                    placeholder="Enter auto forgive count"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Number of no-shows to auto-forgive. The system will automatically forgive this many no-shows per customer within the auto-forgive period. Default: 1"
                  />
                )}
              />
              <Controller
                name="autoForgivePeriod"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Auto Forgive Period (Days)"
                    placeholder="Enter auto forgive period"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Period in days for auto-forgive. No-shows within this period will be automatically forgiven up to the auto-forgive count. Default: 30"
                  />
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Cap Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Cap Settings
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Set maximum limits on no-show charges per customer. Configure the maximum number of charges allowed within a time window and whether payment is required after reaching the cap.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="requirePaymentAfterCap"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Require Payment After Cap"
                      tooltipText="Require payment after cap is reached. When enabled, customers must pay outstanding fees before placing new orders once they reach the per-customer cap. Default: true"
                    />
                  </Box>
                )}
              />
              <Controller
                name="perCustomerCap"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Per Customer Cap"
                    placeholder="Enter per customer cap"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Maximum charges per customer. The maximum number of no-show fees that can be charged to a single customer within the cap window. Default: 3"
                  />
                )}
              />
              <Controller
                name="capWindowDays"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <InputFieldModal
                    title="Cap Window (Days)"
                    placeholder="Enter cap window days"
                    type="number"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    tooltipText="Window in days for cap calculation. The time period within which the per-customer cap is calculated. Default: 90"
                  />
                )}
              />
            </Box>
          </Box>
        </Box>
        </LocalizationProvider>
      </ModalComponent>

      <ModalComponent
        open={overlapModalOpen}
        title="ACTIVE NO-SHOW POLICY IN THIS ZONE"
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
            Another active no-show policy in{" "}
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

      {/* Delete Confirmation Modal */}
      <ModalComponent
        open={deleteConfirmOpen}
        title="DELETE NO SHOW POLICY"
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
          <Typography
            variant="body1"
            sx={{ color: "grey.80", fontFamily: "Switzer" }}
          >
            Are you sure you want to delete the no-show policy "{policyToDelete?.name}"?
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "error.main", fontFamily: "Switzer" }}
          >
            This action cannot be undone.
          </Typography>
        </Box>
      </ModalComponent>

      {/* Filter Modal */}
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
