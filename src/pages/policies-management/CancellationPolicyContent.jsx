import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Divider,
  Button,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import { TbPlus, TbCalendar, TbTrash, TbFilter, TbEye } from "../../shared/icons/index";
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
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import { useSelector } from "react-redux";

function parseCancellationPoliciesPayload(response) {
  if (!response) return [];
  const inner = response.data !== undefined ? response.data : response;
  if (Array.isArray(inner)) return inner;
  if (Array.isArray(inner?.policies)) return inner.policies;
  return [];
}

function isPolicyConsideredActive(p) {
  const v = p?.isActive;
  if (v === true || v === 1) return true;
  if (v === false || v === 0) return false;
  if (v === undefined || v === null) return true;
  const s = String(v).toLowerCase();
  if (s === "0" || s === "false" || s === "no") return false;
  return s === "1" || s === "true" || s === "yes";
}

function formatPolicyBool(value) {
  return value ? "Yes" : "No";
}

function PolicyDetailRow({ label, value }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        py: 1.25,
        borderBottom: "1px solid #F1F5F9",
      }}
    >
      <Typography sx={{ fontSize: "13px", color: "grey.80", fontFamily: "Switzer", flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: "13px",
          fontWeight: 500,
          fontFamily: "Switzer",
          textAlign: "right",
          color: "grey.20",
          wordBreak: "break-word",
        }}
      >
        {value ?? "—"}
      </Typography>
    </Box>
  );
}

function PolicyDetailSection({ title, children }) {
  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 1.5, fontFamily: "Switzer", fontWeight: 600, fontSize: "15px" }}>
        {title}
      </Typography>
      <Box sx={{ bgcolor: "#FAFBFC", borderRadius: "8px", px: 2, py: 0.5 }}>{children}</Box>
    </Box>
  );
}

export default function CancellationPolicyContent() {
  const { success, error: showError } = useToaster();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [reasonsModalOpen, setReasonsModalOpen] = useState(false);
  const [cancelReasons, setCancelReasons] = useState([""]);
  const [reasonIds, setReasonIds] = useState([]); // Store IDs for deletion

  // Filter states
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [isDefaultFilter, setIsDefaultFilter] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [zoneMenuAnchor, setZoneMenuAnchor] = useState(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [togglingActiveId, setTogglingActiveId] = useState(null);
  const [overlapModalOpen, setOverlapModalOpen] = useState(false);
  const [overlapZoneId, setOverlapZoneId] = useState(null);
  const [pendingAddPayload, setPendingAddPayload] = useState(null);
  const [overlapTogglingId, setOverlapTogglingId] = useState(null);
  const [overlapPolicyFetchAll, setOverlapPolicyFetchAll] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewingPolicy, setViewingPolicy] = useState(null);

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
  const [fetchZoneById] = useLazyGetZoneByIdQuery();

  const { data: currencyUnitsPayload } = useGetUnitsDistanceAndCurrencyQuery("currency");
  const currencyUnitsRedux = useSelector((state) => state?.apiData?.units?.currency);
  const currencyUnitsList = useMemo(
    () => buildCurrencyUnitsList(currencyUnitsPayload, currencyUnitsRedux),
    [currencyUnitsPayload, currencyUnitsRedux]
  );

  const selectedZoneLabel = zoneOptions.find(
    (z) => z.value === String(selectedZoneId)
  )?.label;

  const filterParams = {
    ...(isActiveFilter !== "" && { isActive: isActiveFilter }),
    ...(isDefaultFilter !== "" && { isDefault: isDefaultFilter }),
    ...(selectedZoneId !== "" && { zoneId: selectedZoneId }),
    ...(page && { page }),
    ...(limit && { limit }),
  };

  const { data: policiesResponse, isLoading, refetch } = useGetCancellationPoliciesQuery(filterParams);
  const [addCancellationPolicy, { isLoading: isAdding }] = useAddCancellationPolicyMutation();
  const [updateCancellationPolicy, { isLoading: isUpdating }] = useUpdateCancellationPolicyMutation();
  const [deleteCancellationPolicy, { isLoading: isDeleting }] = useDeleteCancellationPolicyMutation();
  const [createReason, { isLoading: isCreatingReason }] = useCreateReasonMutation();
  const [deleteReason, { isLoading: isDeletingReason }] = useDeleteReasonMutation();
  const { data: reasonsResponse, refetch: refetchReasons } = useGetAllReasonsQuery(undefined, {
    skip: !reasonsModalOpen, // Only fetch when modal is open
  });
  const [fetchOverlapPolicies, { data: overlapPoliciesResponse, isFetching: overlapPoliciesLoading }] =
    useLazyGetCancellationPoliciesQuery();

  const isSubmitting = isAdding || isUpdating;

  const policies = policiesResponse?.data?.policies || [];
  const pagination = policiesResponse?.data?.pagination || {};
  const totalPages = pagination.pages || 1;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      zoneId: "",
      createdDate: dayjs(),
      expiryDate: null,
      isActive: true,
      isDefault: true,
      prePickupAbsoluteCurrency: "USD",
      prePickupAbsoluteAmount: "",
      prePickupPercentage: "",
      prePickupFreeChargeWindowMinutes: "",
      prePickupFirstCancellationLeniency: true,
      unprocessedAbsoluteCurrency: "USD",
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
      field: "id",
      headerName: "ID",
      flex: 0.08,
      minWidth: 80,
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
      field: "type",
      headerName: "Type",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.type || "N/A"}
        </Typography>
      ),
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
            checked={Boolean(row.isActive)}
            disabled={togglingActiveId !== null}
            onChange={(e) => handleTogglePolicyActive(row, e.target.checked)}
          />
          <Typography
            sx={{
              color: row.isActive ? "success.main" : "text.secondary",
              fontWeight: 500,
              fontSize: "13px",
            }}
          >
            {row.isActive ? "Active" : "Inactive"}
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
      field: "prePickupAbsoluteCurrency",
      headerName: "Pre-Pickup Currency",
      flex: 0.08,
      minWidth: 130,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.prePickupAbsoluteCurrency || "N/A"}
        </Typography>
      ),
    },
    {
      field: "prePickupAbsoluteAmount",
      headerName: "Pre-Pickup Amount",
      flex: 0.1,
      minWidth: 140,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.prePickupAbsoluteCurrency} {row.prePickupAbsoluteAmount || "0.00"}
        </Typography>
      ),
    },
    {
      field: "prePickupPercentage",
      headerName: "Pre-Pickup %",
      flex: 0.08,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.prePickupPercentage ? `${row.prePickupPercentage}%` : "N/A"}
        </Typography>
      ),
    },
    {
      field: "prePickupFreeChargeWindowMinutes",
      headerName: "Free Window (Mins)",
      flex: 0.1,
      minWidth: 140,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.prePickupFreeChargeWindowMinutes || "0"} min
        </Typography>
      ),
    },
    {
      field: "prePickupFirstCancellationLeniency",
      headerName: "First Cancel Leniency",
      flex: 0.12,
      minWidth: 150,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.prePickupFirstCancellationLeniency ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.prePickupFirstCancellationLeniency ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "unprocessedAbsoluteCurrency",
      headerName: "Unprocessed Currency",
      flex: 0.1,
      minWidth: 150,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.unprocessedAbsoluteCurrency || "N/A"}
        </Typography>
      ),
    },
    {
      field: "unprocessedAbsoluteAmount",
      headerName: "Unprocessed Amount",
      flex: 0.1,
      minWidth: 150,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.unprocessedAbsoluteCurrency} {row.unprocessedAbsoluteAmount || "0.00"}
        </Typography>
      ),
    },
    {
      field: "unprocessedOrderValuePercentage",
      headerName: "Unprocessed % (prepaid)",
      flex: 0.12,
      minWidth: 170,
      sortable: true,
      renderCell: (row) => {
        const pct =
          row.unprocessedOrderValuePercentage || row.unprocessedPercentage;
        return (
          <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
            {pct ? `${pct}%` : "N/A"}
          </Typography>
        );
      },
    },
    {
      field: "unprocessedAfterPickupMinutes",
      headerName: "After Pickup (Mins)",
      flex: 0.1,
      minWidth: 140,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.unprocessedAfterPickupMinutes || "0"} min
        </Typography>
      ),
    },
    {
      field: "allowCancelUnprocessed",
      headerName: "Allow Cancel",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.allowCancelUnprocessed ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.allowCancelUnprocessed ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "courtesyWindowDays",
      headerName: "Courtesy Window",
      flex: 0.1,
      minWidth: 130,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.courtesyWindowDays ? `${row.courtesyWindowDays} days` : "N/A"}
        </Typography>
      ),
    },
    {
      field: "courtesyCapAmount",
      headerName: "Courtesy Cap",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.courtesyCapAmount ? `${row.prePickupAbsoluteCurrency} ${row.courtesyCapAmount}` : "N/A"}
        </Typography>
      ),
    },
    {
      field: "courtesyCount",
      headerName: "Courtesy Count",
      flex: 0.1,
      minWidth: 130,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.courtesyCount || "0"}
        </Typography>
      ),
    },
    {
      field: "customerLeniencyEnabled",
      headerName: "Customer Leniency",
      flex: 0.1,
      minWidth: 150,
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
      field: "createdBy",
      headerName: "Created By",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.createdBy || "N/A"}
        </Typography>
      ),
    },
    {
      field: "updatedBy",
      headerName: "Updated By",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.updatedBy || "N/A"}
        </Typography>
      ),
    },
    {
      field: "deletedAt",
      headerName: "Deleted At",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.deletedAt || "N/A"}
        </Typography>
      ),
    },
    {
      field: "configId",
      headerName: "Config ID",
      flex: 0.1,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.configId || "N/A"}
        </Typography>
      ),
    },
    {
      field: "configPolicyId",
      headerName: "Config Policy ID",
      flex: 0.12,
      minWidth: 140,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.configPolicyId || "N/A"}
        </Typography>
      ),
    },
    {
      field: "configIsActive",
      headerName: "Config Active",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.configIsActive ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.configIsActive ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "configCreatedAt",
      headerName: "Config Created At",
      flex: 0.12,
      minWidth: 140,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.configCreatedAt || "N/A"}
        </Typography>
      ),
    },
    {
      field: "configUpdatedAt",
      headerName: "Config Updated At",
      flex: 0.12,
      minWidth: 140,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.configUpdatedAt || "N/A"}
        </Typography>
      ),
    },
    {
      field: "configDeletedAt",
      headerName: "Config Deleted At",
      flex: 0.12,
      minWidth: 140,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 400, fontSize: "13px" }}>
          {row.configDeletedAt || "N/A"}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.08,
      minWidth: 100,
      sortable: false,
      renderCell: (row) => (
        <Box
          component="button"
          type="button"
          onClick={() => handleView(row)}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            border: "none",
            background: "none",
            cursor: "pointer",
            color: "primary.main",
            fontWeight: 500,
            fontSize: "13px",
            fontFamily: "Switzer",
            p: 0,
            "&:hover": { opacity: 0.8 },
          }}
        >
          <TbEye size={16} />
          View
        </Box>
      ),
    },
  ];

  // Prepare table data
  const policiesData = policies?.map((policy, index) => {
    const config = policy.cancellationConfig || {};
    const zoneName =
      policy.zone?.name ||
      zoneOptions.find((z) => String(z.value) === String(policy.zoneId))?.label ||
      null;
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
        ? new Date(policy.createdAt).toLocaleDateString()
        : "N/A",
      updatedAt: policy.updatedAt
        ? new Date(policy.updatedAt).toLocaleDateString()
        : "N/A",
      deletedAt: policy.deletedAt
        ? new Date(policy.deletedAt).toLocaleDateString()
        : null,
      // Pre-Pickup Charges
      prePickupAbsoluteCurrency: config.prePickupAbsoluteCurrency || "USD",
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
        ? new Date(config.createdAt).toLocaleDateString()
        : null,
      configUpdatedAt: config.updatedAt
        ? new Date(config.updatedAt).toLocaleDateString()
        : null,
      configDeletedAt: config.deletedAt
        ? new Date(config.deletedAt).toLocaleDateString()
        : null,
      // Keep original config for edit functionality
      cancellationConfig: policy.cancellationConfig,
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
    reset({
      name: "",
      description: "",
      zoneId: selectedZoneId || "",
      createdDate: dayjs(),
      expiryDate: null,
      isActive: true,
      isDefault: true,
      prePickupAbsoluteCurrency: "USD",
      prePickupAbsoluteAmount: "",
      prePickupPercentage: "",
      prePickupFreeChargeWindowMinutes: "",
      prePickupFirstCancellationLeniency: true,
      unprocessedAbsoluteCurrency: "USD",
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

  const handleAddTestPolicies = async () => {
    const defaultZoneId = zones[0]?.id;
    if (!defaultZoneId) {
      showError("Add at least one zone before seeding test policies.");
      return;
    }
    const testPolicies = [
      {
        name: "Standard Cancellation Policy",
        description: "Standard policy for handling cancellations with moderate fees",
        zoneId: defaultZoneId,
        isActive: true,
        isDefault: false,
        prePickupAbsoluteCurrency: "USD",
        prePickupAbsoluteAmount: 10.00,
        prePickupPercentage: 5.00,
        prePickupFreeChargeWindowMinutes: 30,
        prePickupFirstCancellationLeniency: true,
        unprocessedAbsoluteCurrency: "USD",
        unprocessedAbsoluteAmount: 5.00,
        unprocessedPercentage: 3.00,
        unprocessedAfterPickupMinutes: 5,
        unprocessedOrderValuePercentage: 8.00,
        allowCancelUnprocessed: true,
        courtesyWindowDays: 3,
        courtesyCapAmount: 15.00,
        courtesyCount: 2,
        customerLeniencyEnabled: true,
      },
      {
        name: "Premium Cancellation Policy",
        description: "Premium policy with higher fees and stricter rules",
        zoneId: defaultZoneId,
        isActive: true,
        isDefault: false,
        prePickupAbsoluteCurrency: "USD",
        prePickupAbsoluteAmount: 25.00,
        prePickupPercentage: 12.00,
        prePickupFreeChargeWindowMinutes: 15,
        prePickupFirstCancellationLeniency: false,
        unprocessedAbsoluteCurrency: "USD",
        unprocessedAbsoluteAmount: 15.00,
        unprocessedPercentage: 8.00,
        unprocessedAfterPickupMinutes: 3,
        unprocessedOrderValuePercentage: 15.00,
        allowCancelUnprocessed: false,
        courtesyWindowDays: 1,
        courtesyCapAmount: 10.00,
        courtesyCount: 1,
        customerLeniencyEnabled: false,
      },
      {
        name: "Flexible Cancellation Policy",
        description: "Flexible policy with lenient rules and lower fees",
        zoneId: defaultZoneId,
        isActive: true,
        isDefault: true,
        prePickupAbsoluteCurrency: "USD",
        prePickupAbsoluteAmount: 5.00,
        prePickupPercentage: 3.00,
        prePickupFreeChargeWindowMinutes: 60,
        prePickupFirstCancellationLeniency: true,
        unprocessedAbsoluteCurrency: "USD",
        unprocessedAbsoluteAmount: 2.00,
        unprocessedPercentage: 2.00,
        unprocessedAfterPickupMinutes: 10,
        unprocessedOrderValuePercentage: 5.00,
        allowCancelUnprocessed: true,
        courtesyWindowDays: 7,
        courtesyCapAmount: 25.00,
        courtesyCount: 3,
        customerLeniencyEnabled: true,
      },
      {
        name: "Strict Cancellation Policy",
        description: "Strict policy with high fees and no leniency",
        zoneId: defaultZoneId,
        isActive: true,
        isDefault: false,
        prePickupAbsoluteCurrency: "USD",
        prePickupAbsoluteAmount: 50.00,
        prePickupPercentage: 20.00,
        prePickupFreeChargeWindowMinutes: 0,
        prePickupFirstCancellationLeniency: false,
        unprocessedAbsoluteCurrency: "USD",
        unprocessedAbsoluteAmount: 30.00,
        unprocessedPercentage: 15.00,
        unprocessedAfterPickupMinutes: 1,
        unprocessedOrderValuePercentage: 25.00,
        allowCancelUnprocessed: false,
        courtesyWindowDays: 0,
        courtesyCapAmount: 0.00,
        courtesyCount: 0,
        customerLeniencyEnabled: false,
      },
      {
        name: "Test Cancellation Policy EUR",
        description: "Test policy with EUR currency and mixed settings",
        zoneId: defaultZoneId,
        isActive: true,
        isDefault: false,
        prePickupAbsoluteCurrency: "EUR",
        prePickupAbsoluteAmount: 12.00,
        prePickupPercentage: 6.00,
        prePickupFreeChargeWindowMinutes: 20,
        prePickupFirstCancellationLeniency: true,
        unprocessedAbsoluteCurrency: "EUR",
        unprocessedAbsoluteAmount: 4.00,
        unprocessedPercentage: 4.00,
        unprocessedAfterPickupMinutes: 3,
        unprocessedOrderValuePercentage: 10.00,
        allowCancelUnprocessed: true,
        courtesyWindowDays: 3,
        courtesyCapAmount: 2.00,
        courtesyCount: 2,
        customerLeniencyEnabled: true,
      },
    ];

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const policy of testPolicies) {
        try {
          await addCancellationPolicy(policy).unwrap();
          successCount++;
        } catch (error) {
          console.error(`Error adding policy "${policy.name}":`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        success(`Successfully added ${successCount} test cancellation policies!`);
      }
      if (errorCount > 0) {
        showError(`Failed to add ${errorCount} policies. Check console for details.`);
      }

      refetch();
    } catch (error) {
      console.error("Error adding test policies:", error);
      showError("Failed to add test policies. Please try again.");
    }
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
    reset({
      name: policy.name || "",
      description: policy.description || "",
      zoneId: policy.zoneId != null ? String(policy.zoneId) : "",
      createdDate: policy.createdAt ? dayjs(policy.createdAt) : dayjs(),
      expiryDate: policy.expiry_date ? dayjs(policy.expiry_date) : null,
      isActive: true,
      isDefault: true,
      prePickupAbsoluteCurrency: config.prePickupAbsoluteCurrency || "USD",
      prePickupAbsoluteAmount: config.prePickupAbsoluteAmount?.toString() || "",
      prePickupPercentage: config.prePickupPercentage?.toString() || "",
      prePickupFreeChargeWindowMinutes: config.prePickupFreeChargeWindowMinutes
        ? (Number(config.prePickupFreeChargeWindowMinutes) / 60).toString()
        : "",
      prePickupFirstCancellationLeniency: config.prePickupFirstCancellationLeniency ?? true,
      unprocessedAbsoluteCurrency: config.unprocessedAbsoluteCurrency || "USD",
      unprocessedAbsoluteAmount: config.unprocessedAbsoluteAmount?.toString() || "",
      // Form field removed; keep empty — save syncs legacy column from order-value %.
      unprocessedPercentage: "",
      unprocessedAfterPickupMinutes: config.unprocessedAfterPickupMinutes
        ? (Number(config.unprocessedAfterPickupMinutes) / 60).toString()
        : "",
      unprocessedOrderValuePercentage: (() => {
        const orderValuePct = Number(config.unprocessedOrderValuePercentage);
        if (Number.isFinite(orderValuePct) && orderValuePct > 0) {
          return String(orderValuePct);
        }
        const legacyPct = Number(config.unprocessedPercentage);
        if (Number.isFinite(legacyPct) && legacyPct > 0) {
          return String(legacyPct);
        }
        return "";
      })(),
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

  const handleTogglePolicyActive = async (row, nextActive) => {
    if (togglingActiveId !== null) return;
    if (Boolean(row.isActive) === nextActive) return;
    setTogglingActiveId(row.id);
    try {
      await updateCancellationPolicy({
        id: row.id,
        body: { isActive: nextActive },
      }).unwrap();
      success(
        nextActive
          ? "Cancellation policy activated"
          : "Cancellation policy deactivated"
      );
      refetch();
    } catch (error) {
      console.error("Error updating policy status:", error);
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

  const onSubmit = async (data) => {
    let payload;
    try {
      payload = {
        name: data.name,
        description: data.description,
        ...(data.zoneId ? { zoneId: parseInt(data.zoneId, 10) } : {}),
        created_date: data.createdDate ? data.createdDate.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        expiry_date: data.expiryDate ? data.expiryDate.format("YYYY-MM-DD") : null,
        isActive: true,
        isDefault: true,
        prePickupAbsoluteCurrency: data.prePickupAbsoluteCurrency,
        prePickupAbsoluteAmount: data.prePickupAbsoluteAmount ? parseFloat(data.prePickupAbsoluteAmount) : 0,
        prePickupPercentage: data.prePickupPercentage ? parseFloat(data.prePickupPercentage) : 0,
        prePickupFreeChargeWindowMinutes: data.prePickupFreeChargeWindowMinutes
          ? Math.round(parseFloat(data.prePickupFreeChargeWindowMinutes) * 60)
          : 0,
        prePickupFirstCancellationLeniency: data.prePickupFirstCancellationLeniency,
        unprocessedAbsoluteCurrency: data.unprocessedAbsoluteCurrency,
        unprocessedAbsoluteAmount: data.unprocessedAbsoluteAmount ? parseFloat(data.unprocessedAbsoluteAmount) : 0,
        // One canonical %: write the same value to both columns so legacy reads stay in sync.
        unprocessedPercentage: data.unprocessedOrderValuePercentage
          ? parseFloat(data.unprocessedOrderValuePercentage)
          : 0,
        unprocessedAfterPickupMinutes: data.unprocessedAfterPickupMinutes
          ? Math.round(parseFloat(data.unprocessedAfterPickupMinutes) * 60)
          : 0,
        unprocessedOrderValuePercentage: data.unprocessedOrderValuePercentage
          ? parseFloat(data.unprocessedOrderValuePercentage)
          : 0,
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
  const viewingZoneName =
    viewingPolicy?.zone?.name ||
    zoneOptions.find((z) => String(z.value) === String(viewingPolicy?.zoneId))?.label ||
    "—";
  const viewingFreeWindowHours = viewingConfig.prePickupFreeChargeWindowMinutes
    ? (Number(viewingConfig.prePickupFreeChargeWindowMinutes) / 60).toFixed(2)
    : "0";
  const viewingUnprocessedPct =
    viewingConfig.unprocessedOrderValuePercentage || viewingConfig.unprocessedPercentage;

  if (isLoading) {
    return <Delay />;
  }

  return (
    <Box>
      {/* Action Buttons */}
      <Box className="flex items-center justify-end mb-4">
        <Box className="flex items-center gap-3">
          <ButtonBlueLight
            variant="outlined"
            bgColor="#8B5CF6"
            color="white"
            radius="8px"
            startIcon={<TbPlus size={"24px"} />}
            onClick={() => setReasonsModalOpen(true)}
            sx={{
              border: "1px solid #8B5CF6",
              "&:hover": {
                backgroundColor: "#7C3AED",
                borderColor: "#7C3AED",
              },
            }}
          >
            Manage Cancellation Reasons
          </ButtonBlueLight>
          <ButtonBlueLight
            variant="contained"
            bgColor="#10b981"
            color="white"
            radius="8px"
            onClick={handleAddTestPolicies}
            disabled={isAdding}
          >
            Add 5 Test Policies
          </ButtonBlueLight>
          <ButtonBlueLight
            variant="outlined"
            bgColor="blue.200"
            color="white"
            radius="8px"
            startIcon={<TbPlus size={"24px"} />}
            onClick={handleAdd}
          >
            Add Cancellation Policy
          </ButtonBlueLight>
        </Box>
      </Box>

      {/* Action Button */}
      <Box className="flex items-center justify-end mb-4" sx={{ display: "none" }}>
        <ButtonBlueLight
          variant="outlined"
          bgColor="blue.200"
          color="white"
          radius="8px"
          startIcon={<TbPlus size={"24px"} />}
          onClick={handleAdd}
        >
          Add Cancellation Policy
        </ButtonBlueLight>
      </Box>

      {/* Data Table */}
      <Box sx={{ width: "100%", overflow: "visible" }}>
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
        <DataTable
          data={policiesData}
          columns={columns}
          height={700}
          showFilters={false}
          stickyLeftFields={["sl", "zoneName"]}
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
        />
      </Box>

      {/* Add/Edit Modal */}
      <ModalComponent
        open={modalOpen}
        title={editingPolicy ? "EDIT CANCELLATION POLICY" : "CANCELLATION POLICY"}
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
          <Box className="flex flex-col gap-5">
            {/* Basic Information Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
                Basic Information
              </Typography>
              <Box className="flex flex-col gap-4">
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Policy name is required" }}
                  render={({ field: { onChange, value } }) => (
                    <Box>
                      <InputFieldModal
                        title="Policy Name*"
                        placeholder="Enter policy name"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Policy name/identifier. This is a required field and must be unique."
                      />
                      {errors.name && (
                        <Typography variant="caption" sx={{ color: "error.main", mt: 1, display: "block" }}>
                          {errors.name.message}
                        </Typography>
                      )}
                    </Box>
                  )}
                />

                <Controller
                  name="description"
                  control={control}
                  rules={{ required: "Description is required" }}
                  render={({ field: { onChange, value } }) => (
                    <Box>
                      <InputFieldModal
                        title="Description*"
                        placeholder="Enter policy description"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Policy description or notes. Optional field to provide additional context about the policy."
                      />
                      {errors.description && (
                        <Typography variant="caption" sx={{ color: "error.main", mt: 1, display: "block" }}>
                          {errors.description.message}
                        </Typography>
                      )}
                    </Box>
                  )}
                />

                <Controller
                  name="zoneId"
                  control={control}
                  rules={{
                    validate: (v) => {
                      if (editingPolicy) return true;
                      return v ? true : "Zone is required";
                    },
                  }}
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
                            if (!c) return;
                            const opts = {
                              shouldDirty: true,
                              shouldTouch: true,
                              shouldValidate: true,
                            };
                            setValue("prePickupAbsoluteCurrency", c, opts);
                            setValue("unprocessedAbsoluteCurrency", c, opts);
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
                        tooltipText="Zone this policy applies to. Required when adding a policy so overlaps can be detected per zone."
                      />
                      {errors.zoneId && (
                        <Typography variant="caption" sx={{ color: "error.main", mt: 1, display: "block" }}>
                          {errors.zoneId.message}
                        </Typography>
                      )}
                    </Box>
                  )}
                />

                <Box className="grid grid-cols-2 gap-4">
                  <Controller
                    name="createdDate"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <Box sx={{ width: "100%" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: "4px", mb: "8px" }}>
                          <Typography variant="body2" sx={{ color: "#374151" }}>
                            Created Date
                          </Typography>
                        </Box>
                        <DatePicker
                          value={value || dayjs()}
                          onChange={(newValue) => onChange(newValue)}
                          slotProps={{
                            textField: {
                              placeholder: "Created date",
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
                                },
                                "& .MuiPickersInputBase-root": {
                                  backgroundColor: "#F4F7FF !important",
                                  border: "none !important",
                                  boxShadow: "none !important",
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
                    name="expiryDate"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <Box sx={{ width: "100%" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: "4px", mb: "8px" }}>
                          <Typography variant="body2" sx={{ color: "#374151" }}>
                            Expiry Date
                          </Typography>
                        </Box>
                        <DatePicker
                          value={value}
                          onChange={(newValue) => onChange(newValue)}
                          slotProps={{
                            textField: {
                              placeholder: "Select expiry date",
                              fullWidth: true,
                              sx: {
                                width: "100%",
                                "& .MuiOutlinedInput-root": {
                                  height: "52px",
                                  borderRadius: "8px",
                                  backgroundColor: "#F4F7FF !important",
                                  fontFamily: "Switzer",
                                  "& fieldset": {
                                    border: "none",
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

            {/* Pre-Pickup Charges Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
                Pre-Pickup Charges
              </Typography>
              <Box className="flex flex-col gap-4">
                <Box className="grid grid-cols-2 gap-4">
                  <Controller
                    name="prePickupAbsoluteCurrency"
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

                  <Controller
                    name="prePickupAbsoluteAmount"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Absolute Amount"
                        placeholder="Enter amount"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Fixed cancellation fee amount for pre-pickup cancellations. This is a flat fee charged when a customer cancels before pickup."
                      />
                    )}
                  />
                </Box>

                <Controller
                  name="prePickupPercentage"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Percentage (%)"
                      placeholder="Enter percentage"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Percentage-based cancellation fee for pre-pickup cancellations (e.g., 5.00 for 5% of order value)."
                    />
                  )}
                />

                <Controller
                  name="prePickupFreeChargeWindowMinutes"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Free Charge Window (Hours)"
                      placeholder="Enter hours"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Time window in hours after order placement where cancellations are free. This value is converted to minutes before saving."
                    />
                  )}
                />

                <Controller
                  name="prePickupFirstCancellationLeniency"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box className="flex items-center gap-2">
                      <StyledCheckbox
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                      />
                      <LabelWithTooltip
                        label="First Cancellation Leniency"
                        tooltipText="Automatically forgive the first cancellation. When enabled, the first cancellation for each customer is automatically forgiven without charging a fee."
                      />
                    </Box>
                  )}
                />
              </Box>
            </Box>

            <Divider />

            {/* Unprocessed Order Charges Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
                Unprocessed Order Charges
              </Typography>
              <Box className="flex flex-col gap-4">
                <Box className="grid grid-cols-2 gap-4">
                  <Controller
                    name="unprocessedAbsoluteCurrency"
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

                  <Controller
                    name="unprocessedAbsoluteAmount"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Absolute Amount"
                        placeholder="Enter amount"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Fixed cancellation fee amount for unprocessed order cancellations. This is a flat fee charged when a customer cancels an unprocessed order."
                      />
                    )}
                  />
                </Box>

                <Box className="grid grid-cols-2 gap-4">
                  <Controller
                    name="unprocessedOrderValuePercentage"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Unprocessed fee % (of prepaid)"
                        placeholder="e.g. 50"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Cancellation fee after On the Way / unprocessed stage, as a percentage of prepaid (minimum order + service fee + tip). Example: 50 = keep half of prepaid."
                      />
                    )}
                  />

                  <Controller
                    name="unprocessedAfterPickupMinutes"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="After Pickup (Hours)"
                        placeholder="Enter hours"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Legacy field (hours, stored as minutes). Not used by cancel fee calc today; kept for future time-window rules after pickup."
                      />
                    )}
                  />
                </Box>

                <Controller
                  name="allowCancelUnprocessed"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box className="flex items-center gap-2">
                      <StyledCheckbox
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                      />
                      <LabelWithTooltip
                        label="Allow Cancel Unprocessed"
                        tooltipText="Allow cancellation of unprocessed orders. When enabled, customers can cancel orders that have not yet been processed."
                      />
                    </Box>
                  )}
                />
              </Box>
            </Box>

            <Divider />

            {/* Courtesy Window Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
                Courtesy Window
              </Typography>
              <Box className="flex flex-col gap-4">
                <Box className="grid grid-cols-2 gap-4">
                  <Controller
                    name="courtesyWindowDays"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Window Days"
                        placeholder="Enter days"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Time window in days for courtesy cancellations. Cancellations within this window may be eligible for courtesy waivers."
                      />
                    )}
                  />

                  <Controller
                    name="courtesyCapAmount"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Cap Amount"
                        placeholder="Enter amount"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        tooltipText="Maximum total cancellation charges per customer within the courtesy window. Once this cap is reached, additional cancellations may be waived."
                      />
                    )}
                  />
                </Box>

                <Controller
                  name="courtesyCount"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Count"
                      placeholder="Enter count"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Maximum number of courtesy cancellations allowed per customer within the courtesy window period."
                    />
                  )}
                />
              </Box>
            </Box>

            <Divider />

            {/* Customer Leniency Section */}
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
                Customer Leniency
              </Typography>
              <Controller
                name="customerLeniencyEnabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Enable Customer Leniency"
                      tooltipText="Enable customer leniency features. When enabled, the system applies leniency rules such as first cancellation forgiveness and courtesy windows."
                    />
                  </Box>
                )}
              />
            </Box>
          </Box>
        </LocalizationProvider>
      </ModalComponent>

      <ModalComponent
        open={overlapModalOpen}
        title="ACTIVE POLICY IN THIS ZONE"
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
            Another active cancellation policy in{" "}
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

      {/* View Policy Modal */}
      <ModalComponent
        open={viewModalOpen}
        title="VIEW CANCELLATION POLICY"
        onClose={handleCloseView}
        width={720}
        primaryAction={{
          label: "Close",
          onClick: handleCloseView,
        }}
      >
        {viewingPolicy && (
          <Box className="flex flex-col gap-5">
            <PolicyDetailSection title="Basic Information">
              <PolicyDetailRow label="Policy Name" value={viewingPolicy.name} />
              <PolicyDetailRow label="Description" value={viewingPolicy.description} />
              <PolicyDetailRow label="Zone" value={viewingZoneName} />
              <PolicyDetailRow label="Type" value={viewingPolicy.type || "—"} />
              <PolicyDetailRow label="Status" value={viewingPolicy.isActive ? "Active" : "Inactive"} />
              <PolicyDetailRow label="Default Policy" value={formatPolicyBool(viewingPolicy.isDefault)} />
              <PolicyDetailRow
                label="Effective From"
                value={
                  viewingPolicy.effectiveFrom
                    ? new Date(viewingPolicy.effectiveFrom).toLocaleDateString()
                    : "—"
                }
              />
              <PolicyDetailRow
                label="Effective To"
                value={
                  viewingPolicy.effectiveTo
                    ? new Date(viewingPolicy.effectiveTo).toLocaleDateString()
                    : "—"
                }
              />
              <PolicyDetailRow
                label="Created At"
                value={
                  viewingPolicy.createdAt
                    ? new Date(viewingPolicy.createdAt).toLocaleString()
                    : "—"
                }
              />
              <PolicyDetailRow
                label="Updated At"
                value={
                  viewingPolicy.updatedAt
                    ? new Date(viewingPolicy.updatedAt).toLocaleString()
                    : "—"
                }
              />
            </PolicyDetailSection>

            <PolicyDetailSection title="Pre-Pickup Charges">
              <PolicyDetailRow
                label="Currency"
                value={viewingConfig.prePickupAbsoluteCurrency || "—"}
              />
              <PolicyDetailRow
                label="Absolute Amount"
                value={
                  viewingConfig.prePickupAbsoluteAmount != null
                    ? `${viewingConfig.prePickupAbsoluteCurrency || ""} ${viewingConfig.prePickupAbsoluteAmount}`
                    : "—"
                }
              />
              <PolicyDetailRow
                label="Percentage"
                value={
                  viewingConfig.prePickupPercentage
                    ? `${viewingConfig.prePickupPercentage}%`
                    : "—"
                }
              />
              <PolicyDetailRow
                label="Free Charge Window"
                value={`${viewingFreeWindowHours} hours (${viewingConfig.prePickupFreeChargeWindowMinutes || 0} min)`}
              />
              <PolicyDetailRow
                label="First Cancellation Leniency"
                value={formatPolicyBool(viewingConfig.prePickupFirstCancellationLeniency)}
              />
            </PolicyDetailSection>

            <PolicyDetailSection title="Unprocessed Order Charges">
              <PolicyDetailRow
                label="Currency"
                value={viewingConfig.unprocessedAbsoluteCurrency || "—"}
              />
              <PolicyDetailRow
                label="Absolute Amount"
                value={
                  viewingConfig.unprocessedAbsoluteAmount != null
                    ? `${viewingConfig.unprocessedAbsoluteCurrency || ""} ${viewingConfig.unprocessedAbsoluteAmount}`
                    : "—"
                }
              />
              <PolicyDetailRow
                label="Percentage (prepaid)"
                value={viewingUnprocessedPct ? `${viewingUnprocessedPct}%` : "—"}
              />
              <PolicyDetailRow
                label="After Pickup (Minutes)"
                value={`${viewingConfig.unprocessedAfterPickupMinutes || 0} min`}
              />
              <PolicyDetailRow
                label="Allow Cancel Unprocessed"
                value={formatPolicyBool(viewingConfig.allowCancelUnprocessed)}
              />
            </PolicyDetailSection>

            <PolicyDetailSection title="Courtesy Window">
              <PolicyDetailRow
                label="Window Days"
                value={viewingConfig.courtesyWindowDays ?? "—"}
              />
              <PolicyDetailRow
                label="Cap Amount"
                value={
                  viewingConfig.courtesyCapAmount != null
                    ? `${viewingConfig.prePickupAbsoluteCurrency || ""} ${viewingConfig.courtesyCapAmount}`
                    : "—"
                }
              />
              <PolicyDetailRow label="Courtesy Count" value={viewingConfig.courtesyCount ?? "—"} />
            </PolicyDetailSection>

            <PolicyDetailSection title="Customer Leniency">
              <PolicyDetailRow
                label="Enable Customer Leniency"
                value={formatPolicyBool(viewingConfig.customerLeniencyEnabled)}
              />
            </PolicyDetailSection>
          </Box>
        )}
      </ModalComponent>

      {/* Delete Confirmation Modal */}
      <ModalComponent
        open={deleteConfirmOpen}
        title="DELETE CANCELLATION POLICY"
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
            Are you sure you want to delete the cancellation policy "{policyToDelete?.name}"?
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

      {/* Cancellation Reasons Modal */}
      <ModalComponent
        open={reasonsModalOpen}
        title="MANAGE CANCELLATION REASONS"
        onClose={handleCloseReasonsModal}
        width={600}
        primaryAction={{
          label: "Save Reasons",
          onClick: handleSubmitReasons,
          isLoading: isCreatingReason,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: handleCloseReasonsModal,
        }}
      >
        <Box className="flex flex-col gap-4">
          <Typography
            variant="body2"
            sx={{ color: "grey.80", fontFamily: "Switzer", mb: 2 }}
          >
            Add cancellation reasons that customers can select when canceling their orders.
          </Typography>

          {cancelReasons.map((reason, index) => {
            const hasId = reasonIds[index] !== null && reasonIds[index] !== undefined;
            return (
              <Box key={index} className="flex items-center gap-2">
                <Box className="flex-1">
                  <InputFieldModal
                    placeholder={`Enter cancellation reason ${index + 1}`}
                    value={reason}
                    onChange={(e) => handleReasonChange(index, e.target.value)}
                    title={index === 0 ? "Cancellation Reason" : ""}
                    disabled={hasId} // Disable editing existing reasons
                  />
                </Box>
                {(cancelReasons.length > 1 || hasId) && (
                  <Box
                    onClick={() => hasId ? handleDeleteReason(index) : handleRemoveReason(index)}
                    sx={{
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: "40px",
                      height: "52px",
                      borderRadius: "8px",
                      backgroundColor: hasId ? "#FEE2E2" : "#FEE2E2",
                      color: "#DC2626",
                      "&:hover": {
                        backgroundColor: "#FECACA",
                      },
                    }}
                    title={hasId ? "Delete from database" : "Remove from list"}
                  >
                    <TbTrash size={20} />
                  </Box>
                )}
              </Box>
            );
          })}

          <ButtonBlueLight
            variant="outlined"
            bgColor="blue.200"
            color="white"
            radius="8px"
            startIcon={<TbPlus size={"20px"} />}
            onClick={handleAddReason}
            sx={{ mt: 1 }}
          >
            Add Another Reason
          </ButtonBlueLight>
        </Box>
      </ModalComponent>
    </Box>
  );
}
