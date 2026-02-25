import { useState, useEffect } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { BsCardList, TbPlus, TbCalendar, TbTrash } from "../../shared/icons/index";
import DataTable from "../../components/ui/DataTable";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import FiltersButton from "../../components/ui/FiltersButton";
import { useForm, Controller } from "react-hook-form";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import useToaster from "../../components/ui/Toaster";
import { useAddCancellationPolicyMutation, useGetCancellationPoliciesQuery, useUpdateCancellationPolicyMutation, useDeleteCancellationPolicyMutation, useCreateReasonMutation, useGetAllReasonsQuery, useDeleteReasonMutation } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import StyledCheckbox from "../../components/ui/StyledCheckbox";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";
import LabelWithTooltip from "../../components/ui/LabelWithTooltip";

export default function CancellationPolicy() {
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
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [isActiveFilter, isDefaultFilter, limit]);

  const filterParams = {
    ...(isActiveFilter !== "" && { isActive: isActiveFilter }),
    ...(isDefaultFilter !== "" && { isDefault: isDefaultFilter }),
    ...(page && { page }),
    ...(limit && { limit }),
  };

  const { data: policiesResponse, isLoading, refetch } = useGetCancellationPoliciesQuery(filterParams);
  const [addCancellationPolicy, { isLoading: isAdding }] = useAddCancellationPolicyMutation();
  const [updateCancellationPolicy, { isLoading: isUpdating }] = useUpdateCancellationPolicyMutation();
  const [deleteCancellationPolicy, { isLoading: isDeleting }] = useDeleteCancellationPolicyMutation();
  const [createReason, { isLoading: isCreatingReason }] = useCreateReasonMutation();
  const [deleteReason] = useDeleteReasonMutation();
  const { data: reasonsResponse, refetch: refetchReasons } = useGetAllReasonsQuery(undefined, {
    skip: !reasonsModalOpen, // Only fetch when modal is open
  });

  const isSubmitting = isAdding || isUpdating;

  const policies = policiesResponse?.data?.policies || [];
  const pagination = policiesResponse?.data?.pagination || {};
  const totalPages = pagination.pages || 1;

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      createdDate: dayjs(),
      expiryDate: null,
      isActive: true,
      isDefault: true,
      currency: "USD", // Single general currency for entire policy
      prePickupFeeType: "absolute", // New field: "absolute" or "percentage"
      prePickupFeeValue: "", // New field: stores the value
      prePickupAbsoluteAmount: "",
      prePickupPercentage: "",
      prePickupFreeChargeWindowMinutes: "",
      prePickupFirstCancellationLeniency: true,
      unprocessedFeeType: "absolute", // New field: "absolute" or "percentage"
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
      field: "description",
      headerName: "Description",
      flex: 0.15,
      minWidth: 180,
      sortable: true,
    },
    {
      field: "isActive",
      headerName: "Status",
      flex: 0.08,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.isActive ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
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
      field: "unprocessedPercentage",
      headerName: "Unprocessed %",
      flex: 0.1,
      minWidth: 130,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.unprocessedPercentage ? `${row.unprocessedPercentage}%` : "N/A"}
        </Typography>
      ),
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
      field: "unprocessedOrderValuePercentage",
      headerName: "Order Value %",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.unprocessedOrderValuePercentage ? `${row.unprocessedOrderValuePercentage}%` : "N/A"}
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
  ];

  // Prepare table data
  const policiesData = policies?.map((policy, index) => {
    const config = policy.cancellationConfig || {};
    return {
      id: policy.id,
      sl: (pagination.page - 1) * pagination.limit + index + 1,
      name: policy.name,
      type: policy.type,
      description: policy.description,
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
    };
  }) || [];

  useEffect(() => {
    if (policies.length > 0) {
      refetch();
    }
  }, []);

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
      createdDate: dayjs(),
      expiryDate: null,
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
      createdDate: policy.createdAt ? dayjs(policy.createdAt) : dayjs(),
      expiryDate: policy.expiry_date ? dayjs(policy.expiry_date) : null,
      isActive: true,
      isDefault: true,
      currency: config.prePickupAbsoluteCurrency || config.unprocessedAbsoluteCurrency || "USD",
      prePickupFeeType: feeType,
      prePickupFeeValue: feeValue,
      prePickupAbsoluteAmount: config.prePickupAbsoluteAmount?.toString() || "",
      prePickupPercentage: config.prePickupPercentage?.toString() || "",
      prePickupFreeChargeWindowMinutes: config.prePickupFreeChargeWindowMinutes?.toString() || "",
      prePickupFirstCancellationLeniency: config.prePickupFirstCancellationLeniency ?? true,
      // Determine fee type based on existing data (prefer percentage if both exist)
      unprocessedFeeType: (() => {
        const hasPercentage = config.unprocessedPercentage && parseFloat(config.unprocessedPercentage) > 0;
        const hasAbsolute = config.unprocessedAbsoluteAmount && parseFloat(config.unprocessedAbsoluteAmount) > 0;
        return hasPercentage ? "percentage" : (hasAbsolute ? "absolute" : "absolute");
      })(),
      unprocessedFeeValue: (() => {
        const hasPercentage = config.unprocessedPercentage && parseFloat(config.unprocessedPercentage) > 0;
        const hasAbsolute = config.unprocessedAbsoluteAmount && parseFloat(config.unprocessedAbsoluteAmount) > 0;
        return hasPercentage
          ? config.unprocessedPercentage?.toString()
          : (hasAbsolute ? config.unprocessedAbsoluteAmount?.toString() : "");
      })(),
      unprocessedAbsoluteAmount: config.unprocessedAbsoluteAmount?.toString() || "",
      unprocessedPercentage: config.unprocessedPercentage?.toString() || "",
      unprocessedAfterPickupMinutes: config.unprocessedAfterPickupMinutes?.toString() || "",
      unprocessedOrderValuePercentage: config.unprocessedOrderValuePercentage?.toString() || "",
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

  const onSubmit = async (data) => {
    try {
      // Determine which field to set based on fee type
      const prePickupAbsoluteAmount = data.prePickupFeeType === "absolute" && data.prePickupFeeValue
        ? parseFloat(data.prePickupFeeValue)
        : 0;
      const prePickupPercentage = data.prePickupFeeType === "percentage" && data.prePickupFeeValue
        ? parseFloat(data.prePickupFeeValue)
        : null;

      // Determine which field to set for unprocessed orders based on fee type
      const unprocessedAbsoluteAmount = data.unprocessedFeeType === "absolute" && data.unprocessedFeeValue
        ? parseFloat(data.unprocessedFeeValue)
        : 0;
      const unprocessedPercentage = data.unprocessedFeeType === "percentage" && data.unprocessedFeeValue
        ? parseFloat(data.unprocessedFeeValue)
        : null;

      const payload = {
        name: data.name,
        description: data.description,
        created_date: data.createdDate ? data.createdDate.format("YYYY-MM-DD") : dayjs().format("YYYY-MM-DD"),
        expiry_date: data.expiryDate ? data.expiryDate.format("YYYY-MM-DD") : null,
        isActive: true,
        isDefault: true,
        prePickupAbsoluteCurrency: data.currency,
        prePickupAbsoluteAmount: prePickupAbsoluteAmount,
        prePickupPercentage: prePickupPercentage,
        prePickupFreeChargeWindowMinutes: data.prePickupFreeChargeWindowMinutes ? parseInt(data.prePickupFreeChargeWindowMinutes) : 0,
        prePickupFirstCancellationLeniency: data.prePickupFirstCancellationLeniency,
        unprocessedAbsoluteCurrency: data.currency,
        unprocessedAbsoluteAmount: unprocessedAbsoluteAmount,
        unprocessedPercentage: unprocessedPercentage,
        unprocessedAfterPickupMinutes: data.unprocessedAfterPickupMinutes ? parseInt(data.unprocessedAfterPickupMinutes) : 0,
        unprocessedOrderValuePercentage: data.unprocessedOrderValuePercentage ? parseFloat(data.unprocessedOrderValuePercentage) : 0,
        allowCancelUnprocessed: data.allowCancelUnprocessed,
        courtesyWindowDays: data.courtesyWindowDays ? parseInt(data.courtesyWindowDays) : 0,
        courtesyCapAmount: data.courtesyCapAmount ? parseFloat(data.courtesyCapAmount) : 0,
        courtesyCount: data.courtesyCount ? parseInt(data.courtesyCount) : 0,
        customerLeniencyEnabled: data.customerLeniencyEnabled,
      };

      if (editingPolicy) {
        // Update existing policy
        await updateCancellationPolicy({ id: editingPolicy.id, body: payload }).unwrap();
        success("Cancellation policy updated successfully!");
      } else {
        // Add new policy
        await addCancellationPolicy(payload).unwrap();
        success("Cancellation policy added successfully!");
      }

      setModalOpen(false);
      reset();
      setEditingPolicy(null);
      refetch();
    } catch (error) {
      console.error("Error saving cancellation policy:", error);
      showError(error?.data?.message || `Failed to ${editingPolicy ? 'update' : 'add'} cancellation policy. Please try again.`);
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

  const currencyOptions = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
  ];

  return (
    <Box>
          {/* Header Section */}
          <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Cancellation Policy
              </Typography>
            </Box>

            <Box className="flex items-center gap-x-3">
              <FiltersButton
                text="Filters"
                onClick={() => setFilterModalOpen(true)}
              />
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


          {/* Data Table */}
          {isLoading ? (
            <Delay />
          ) : (
            <Box sx={{ width: "100%", overflow: "auto" }}>
              <DataTable
                data={policiesData}
                columns={columns}
                height={600}
              />
            </Box>
          )}

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
                  <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
                    Basic Information
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
                    Configure the fundamental settings for this cancellation policy, including name, description, and activation status.
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
                            disabled={!editingPolicy} // Disable when adding new policy (not editing)
                            tooltipText={editingPolicy ? "Policy name/identifier. This is a required field and must be unique." : "Policy name is auto-generated and cannot be edited."}
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
                      name="currency"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <SelectField
                          title="Currency"
                          value={value}
                          onChange={(e) => onChange(e.target.value)}
                          options={currencyOptions}
                          placeholder="Select currency"
                          fullWidth
                          tooltipText="Currency for all cancellation charges (Pre-Pickup and Unprocessed). Select once to apply across the policy."
                        />
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
                  <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
                    Pre-Pickup Charges
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
                    Define cancellation fees and policies for orders that are cancelled before the pickup has occurred. Set absolute amounts, percentages, free charge windows, and first cancellation leniency.
                  </Typography>
                  <Box className="flex flex-col gap-4">
                    <Box className="grid grid-cols-2 gap-4">
                      <Controller
                        name="prePickupFeeType"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <SelectField
                            title="Fee Type"
                            value={value}
                            onChange={(e) => {
                              onChange(e.target.value);
                              // Clear the fee value when switching types
                              reset({
                                ...watch(),
                                prePickupFeeType: e.target.value,
                                prePickupFeeValue: "",
                              });
                            }}
                            options={[
                              { value: "absolute", label: "Absolute Amount" },
                              { value: "percentage", label: "Percentage (%)" },
                            ]}
                            placeholder="Select fee type"
                            fullWidth
                            tooltipText="Choose between a fixed amount (Absolute) or a percentage of the order value (Percentage)."
                          />
                        )}
                      />
                      <Controller
                        name="prePickupFeeValue"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <InputFieldModal
                            title={prePickupFeeType === "absolute" ? "Absolute Amount" : "Percentage (%)"}
                            placeholder={prePickupFeeType === "absolute" ? "Enter amount" : "Enter percentage"}
                            type="number"
                            value={value || ""}
                            onChange={(e) => onChange(e.target.value)}
                            tooltipText={
                              prePickupFeeType === "absolute"
                                ? "Fixed cancellation fee amount for pre-pickup cancellations. This is a flat fee charged when a customer cancels before pickup."
                                : "Percentage-based cancellation fee for pre-pickup cancellations (e.g., 5.00 for 5% of order value)."
                            }
                          />
                        )}
                      />
                    </Box>

                    <Controller
                      name="prePickupFreeChargeWindowMinutes"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <InputFieldModal
                          title="Free Charge Window (Minutes)"
                          placeholder="Enter minutes"
                          type="number"
                          value={value || ""}
                          onChange={(e) => onChange(e.target.value)}
                          tooltipText="Time window in minutes after order placement where cancellations are free. Cancellations within this window will not incur any charges."
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
                  <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
                    Unprocessed Order Charges
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
                    Configure cancellation fees for orders that have been picked up but not yet processed. Set charges based on time after pickup, order value percentage, and cancellation permissions.
                  </Typography>
                  <Box className="flex flex-col gap-4">
                    <Box className="grid grid-cols-2 gap-4">
                      <Controller
                        name="unprocessedFeeType"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <SelectField
                            title="Fee Type"
                            value={value}
                            onChange={(e) => {
                              onChange(e.target.value);
                              // Clear the fee value when switching types
                              reset({
                                ...watch(),
                                unprocessedFeeType: e.target.value,
                                unprocessedFeeValue: "",
                              });
                            }}
                            options={[
                              { value: "absolute", label: "Absolute Amount" },
                              { value: "percentage", label: "Percentage (%)" },
                            ]}
                            placeholder="Select fee type"
                            fullWidth
                            tooltipText="Choose between a fixed amount (Absolute) or a percentage of the order value (Percentage)."
                          />
                        )}
                      />
                      <Controller
                        name="unprocessedFeeValue"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <InputFieldModal
                            title={unprocessedFeeType === "absolute" ? "Absolute Amount" : "Percentage (%)"}
                            placeholder={unprocessedFeeType === "absolute" ? "Enter amount" : "Enter percentage"}
                            type="number"
                            value={value || ""}
                            onChange={(e) => onChange(e.target.value)}
                            tooltipText={
                              unprocessedFeeType === "absolute"
                                ? "Fixed cancellation fee amount for unprocessed order cancellations. This is a flat fee charged when a customer cancels an unprocessed order."
                                : "Percentage-based cancellation fee for unprocessed orders (e.g., 5.00 for 5% of order value)."
                            }
                          />
                        )}
                      />
                    </Box>

                    <Controller
                      name="unprocessedAfterPickupMinutes"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <InputFieldModal
                          title="After Pickup (Minutes)"
                          placeholder="Enter minutes"
                          type="number"
                          value={value || ""}
                          onChange={(e) => onChange(e.target.value)}
                          tooltipText="Time window in minutes after pickup where cancellations are allowed. Cancellations after this window may have different charges or restrictions."
                        />
                      )}
                    />

                    <Controller
                      name="unprocessedOrderValuePercentage"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <InputFieldModal
                          title="Order Value Percentage (%)"
                          placeholder="Enter percentage"
                          type="number"
                          value={value || ""}
                          onChange={(e) => onChange(e.target.value)}
                          tooltipText="Percentage of order value used for calculating cancellation fees for unprocessed orders (e.g., 10.00 for 10% of order value)."
                        />
                      )}
                    />

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
                  <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
                    Courtesy Window
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
                    Set up a grace period where customers can cancel orders with reduced or waived fees. Configure the time window, maximum charge cap, and number of allowed courtesy cancellations.
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
                  <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
                    Customer Leniency
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
                    Enable customer-friendly leniency features such as first cancellation forgiveness and courtesy windows to provide a better customer experience while managing cancellation policies.
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

