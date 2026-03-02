import { useState, useEffect } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { TbCalendar, TbTrash } from "../../shared/icons/index";
import StyledCheckbox from "../../components/ui/StyledCheckbox";
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
  useUpdateReschedulePolicyMutation,
  useDeleteReschedulePolicyMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs from "dayjs";

export default function ReschedulePolicyContent({ onAddButtonRef }) {
  const { success, error: showError } = useToaster();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [filterModalOpen, setFilterModalOpen] = useState(false);

  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [isDefaultFilter, setIsDefaultFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [isActiveFilter, isDefaultFilter, limit]);

  const filterParams = {
    ...(isActiveFilter !== "" && { isActive: isActiveFilter }),
    ...(isDefaultFilter !== "" && { isDefault: isDefaultFilter }),
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

  const isSubmitting = isAdding || isUpdating;

  const policies = policiesResponse?.data?.policies || [];
  const pagination = policiesResponse?.data?.pagination || {};
  const totalPages = pagination.pages || 1;

  const rescheduleFormDefaults = {
    name: "",
    description: "",
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
    formState: { errors },
  } = useForm({
    defaultValues: rescheduleFormDefaults,
  });

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
      return {
        id: policy.id,
        sl: (pagination.page - 1) * (pagination.limit || limit) + index + 1,
        name: policy.name,
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
    reset(rescheduleFormDefaults);
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

  const onSubmit = async (data) => {
    try {
      const selectedCurrency = data.currency || "USD";
      const effectiveFromUtc = data.effectiveFrom
        ? dayjs(data.effectiveFrom).toDate().toISOString()
        : dayjs().toDate().toISOString();
      const effectiveToUtc = data.effectiveTo
        ? dayjs(data.effectiveTo).toDate().toISOString()
        : null;
      const payload = {
        name: data.name,
        description: data.description,
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
      <Box sx={{ width: "100%", overflow: "visible" }}>
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
