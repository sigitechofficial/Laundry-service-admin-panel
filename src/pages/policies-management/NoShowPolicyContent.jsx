import { useState, useEffect } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { TbPlus, TbCalendar } from "../../shared/icons/index";
import StyledCheckbox from "../../components/ui/StyledCheckbox";
import LabelWithTooltip from "../../components/ui/LabelWithTooltip";
import DataTable from "../../components/ui/DataTable";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import { useForm, Controller } from "react-hook-form";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import useToaster from "../../components/ui/Toaster";
import { useAddNoShowPolicyMutation, useGetNoShowPoliciesQuery, useUpdateNoShowPolicyMutation, useDeleteNoShowPolicyMutation } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

export default function NoShowPolicyContent({ onAddButtonRef }) {
  const { success, error: showError } = useToaster();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  
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

  const { data: policiesResponse, isLoading, refetch } = useGetNoShowPoliciesQuery(filterParams);
  const [addNoShowPolicy, { isLoading: isAdding }] = useAddNoShowPolicyMutation();
  const [updateNoShowPolicy, { isLoading: isUpdating }] = useUpdateNoShowPolicyMutation();
  const [deleteNoShowPolicy, { isLoading: isDeleting }] = useDeleteNoShowPolicyMutation();
  
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
      pickupBagAtDoor: true,
      deliveryLeaveAtDoor: true,
      concierge: true,
      locker: true,
      requirePhoto: true,
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
    {
      field: "pickupBagAtDoor",
      headerName: "Bag At Door",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.pickupBagAtDoor ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.pickupBagAtDoor ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "deliveryLeaveAtDoor",
      headerName: "Leave At Door",
      flex: 0.09,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.deliveryLeaveAtDoor ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.deliveryLeaveAtDoor ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "concierge",
      headerName: "Concierge",
      flex: 0.08,
      minWidth: 90,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.concierge ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.concierge ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "locker",
      headerName: "Locker",
      flex: 0.07,
      minWidth: 70,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.locker ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.locker ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "requirePhoto",
      headerName: "Require Photo",
      flex: 0.09,
      minWidth: 110,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.requirePhoto ? "success.main" : "text.secondary",
            fontWeight: 500,
            fontSize: "13px",
          }}
        >
          {row.requirePhoto ? "Yes" : "No"}
        </Typography>
      ),
    },
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
    return {
      id: policy.id,
      sl: (pagination.page - 1) * pagination.limit + index + 1,
      name: policy.name,
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
      // Delivery Options
      pickupBagAtDoor: config.pickupBagAtDoor ?? false,
      deliveryLeaveAtDoor: config.deliveryLeaveAtDoor ?? false,
      concierge: config.concierge ?? false,
      locker: config.locker ?? false,
      requirePhoto: config.requirePhoto ?? false,
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
    reset({
      name: "",
      description: "",
      createdDate: dayjs(),
      expiryDate: null,
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
      pickupBagAtDoor: true,
      deliveryLeaveAtDoor: true,
      concierge: true,
      locker: true,
      requirePhoto: true,
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

  // Expose handleAdd function to parent via ref
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
      createdDate: policy.createdAt ? dayjs(policy.createdAt) : dayjs(),
      expiryDate: policy.expiry_date ? dayjs(policy.expiry_date) : null,
      isActive: true,
      isDefault: true,
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
      pickupBagAtDoor: config.pickupBagAtDoor ?? true,
      deliveryLeaveAtDoor: config.deliveryLeaveAtDoor ?? true,
      concierge: config.concierge ?? true,
      locker: config.locker ?? true,
      requirePhoto: config.requirePhoto ?? true,
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

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        expiry_date: data.expiryDate ? data.expiryDate.format("YYYY-MM-DD") : null,
        isActive: true,
        isDefault: true,
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
        pickupBagAtDoor: data.pickupBagAtDoor,
        deliveryLeaveAtDoor: data.deliveryLeaveAtDoor,
        concierge: data.concierge,
        locker: data.locker,
        requirePhoto: data.requirePhoto,
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
      showError(error?.data?.message || `Failed to ${editingPolicy ? 'update' : 'add'} no-show policy. Please try again.`);
    }
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditingPolicy(null);
    reset();
  };

  const currencyOptions = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
  ];

  if (isLoading) {
    return <Delay />;
  }

  return (
    <Box>
      {/* Data Table */}
      <Box sx={{ width: "100%", overflow: "visible" }}>
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
                    tooltipText="Policy name/identifier. This is a required field and must be unique."
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
              <Box className="grid grid-cols-2 gap-4">
                <Controller
                  name="createdDate"
                  control={control}
                  render={({ field: { value } }) => (
                    <Box sx={{ width: "100%" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: "4px", mb: "8px" }}>
                        <Typography variant="body2" sx={{ color: "#374151" }}>
                          Created Date
                        </Typography>
                      </Box>
                      <DatePicker
                        value={value || dayjs()}
                        disabled
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
                render={({ field: { onChange, value } }) => (
                  <SelectField
                    title="Currency"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    options={currencyOptions}
                    placeholder="Select Currency"
                    fullWidth
                    tooltipText="Currency code for the fee amounts (e.g., USD, EUR, GBP)."
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

          {/* Delivery Options */}
          <Box>
            <Typography variant="h6" sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}>
              Delivery Options
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}>
              Enable unattended delivery and pickup options to provide flexibility for customers. Configure options such as leaving items at door, concierge service, lockers, and photo requirements.
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="pickupBagAtDoor"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Pickup Bag At Door"
                      tooltipText="Allow pickup bag at door. When enabled, customers can leave their bag at the door for pickup."
                    />
                  </Box>
                )}
              />
              <Controller
                name="deliveryLeaveAtDoor"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Delivery Leave At Door"
                      tooltipText="Allow delivery to be left at door. When enabled, deliveries can be left at the door without customer presence."
                    />
                  </Box>
                )}
              />
              <Controller
                name="concierge"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Concierge"
                      tooltipText="Allow concierge service. When enabled, concierge services are available for unattended deliveries."
                    />
                  </Box>
                )}
              />
              <Controller
                name="locker"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Locker"
                      tooltipText="Allow locker service. When enabled, deliveries can be placed in lockers for customer pickup."
                    />
                  </Box>
                )}
              />
              <Controller
                name="requirePhoto"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <StyledCheckbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <LabelWithTooltip
                      label="Require Photo"
                      tooltipText="Require photo proof for unattended deliveries. When enabled, drivers must provide a photo as proof of delivery."
                    />
                  </Box>
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
