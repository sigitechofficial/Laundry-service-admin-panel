import { useState, useEffect } from "react";
import { Box, Typography, Divider } from "@mui/material";
import { TbPlus, TbCalendar, TbTrash } from "../../shared/icons/index";
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
      pickupRescheduleFee: "",
      deliveryRescheduleFee: "",
      percentageFee: "",
      cutoffHoursBeforePickup: "",
      maxRescheduleCount: "",
    },
  });

  const useUnifiedFee = watch("useUnifiedFee");
  const feeType = watch("feeType");

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
      headerName: "Pickup Fee",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency} {row.pickupRescheduleFee || "0.00"}
        </Typography>
      ),
    },
    {
      field: "deliveryRescheduleFee",
      headerName: "Delivery Fee",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.currency} {row.deliveryRescheduleFee || "0.00"}
        </Typography>
      ),
    },
    {
      field: "cutoffHoursBeforePickup",
      headerName: "Cutoff (Hours)",
      flex: 0.08,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.cutoffHoursBeforePickup || "0"} hrs
        </Typography>
      ),
    },
    {
      field: "maxRescheduleCount",
      headerName: "Max Reschedules",
      flex: 0.1,
      minWidth: 120,
      sortable: true,
      renderCell: (row) => (
        <Typography sx={{ fontWeight: 500, fontSize: "13px" }}>
          {row.maxRescheduleCount || "0"}
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
      const config = policy.reschedulePolicyConfig || {};
      return {
        id: policy.id,
        sl: (pagination.page - 1) * (pagination.limit || limit) + index + 1,
        name: policy.name,
        description: policy.description,
        isActive: policy.isActive,
        isDefault: policy.isDefault,
        enableForPickup: config.enableForPickup ?? false,
        enableForDelivery: config.enableForDelivery ?? false,
        feeType: config.feeType || "N/A",
        currency: config.currency || "USD",
        pickupRescheduleFee: config.pickupRescheduleFee || "0.00",
        deliveryRescheduleFee: config.deliveryRescheduleFee || "0.00",
        cutoffHoursBeforePickup: config.cutoffHoursBeforePickup || 0,
        maxRescheduleCount: config.maxRescheduleCount || 0,
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
      pickupRescheduleFee: "",
      deliveryRescheduleFee: "",
      percentageFee: "",
      cutoffHoursBeforePickup: "",
      maxRescheduleCount: "",
    });
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
    const config = policy.reschedulePolicyConfig || policy;
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
      pickupRescheduleFee: config.pickupRescheduleFee?.toString() || "",
      deliveryRescheduleFee: config.deliveryRescheduleFee?.toString() || "",
      percentageFee: config.percentageFee?.toString() || "",
      cutoffHoursBeforePickup:
        config.cutoffHoursBeforePickup?.toString() || "",
      maxRescheduleCount: config.maxRescheduleCount?.toString() || "",
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
      const payload = {
        name: data.name,
        description: data.description,
        expiry_date: data.expiryDate
          ? data.expiryDate.format("YYYY-MM-DD")
          : null,
        isActive: true,
        isDefault: true,
        enableForPickup: data.enableForPickup,
        enableForDelivery: data.enableForDelivery,
        useUnifiedFee: data.useUnifiedFee,
        feeType: data.feeType,
        currency: data.currency,
        pickupRescheduleFee: data.pickupRescheduleFee
          ? parseFloat(data.pickupRescheduleFee)
          : 0,
        deliveryRescheduleFee: data.deliveryRescheduleFee
          ? parseFloat(data.deliveryRescheduleFee)
          : 0,
        percentageFee: data.percentageFee ? parseFloat(data.percentageFee) : 0,
        cutoffHoursBeforePickup: data.cutoffHoursBeforePickup
          ? parseInt(data.cutoffHoursBeforePickup)
          : 0,
        maxRescheduleCount: data.maxRescheduleCount
          ? parseInt(data.maxRescheduleCount)
          : 1,
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
        title={editingPolicy ? "EDIT RESCHEDULE POLICY" : "RESCHEDULE POLICY"}
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
            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}
              >
                Basic Information
              </Typography>
              <Typography
                variant="body2"
                sx={{ mb: 2, color: "grey.80", fontFamily: "Switzer", fontSize: "12px" }}
              >
                Configure the fundamental settings for this reschedule policy.
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
                    />
                  )}
                />
                <Box className="grid grid-cols-2 gap-4">
                  <Controller
                    name="createdDate"
                    control={control}
                    render={({ field: { value } }) => (
                      <Box sx={{ width: "100%" }}>
                        <Typography variant="body2" sx={{ color: "#374151", mb: "8px" }}>
                          Created Date
                        </Typography>
                        <DatePicker
                          value={value || dayjs()}
                          disabled
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              sx: {
                                width: "100%",
                                "& .MuiOutlinedInput-root": {
                                  height: "52px",
                                  borderRadius: "8px",
                                  backgroundColor: "#F4F7FF !important",
                                },
                              },
                            },
                          }}
                          slots={{
                            openPickerIcon: () => (
                              <TbCalendar size={20} style={{ color: "#6B7280" }} />
                            ),
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
                        <Typography variant="body2" sx={{ color: "#374151", mb: "8px" }}>
                          Expiry Date
                        </Typography>
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
                                },
                              },
                            },
                          }}
                          slots={{
                            openPickerIcon: () => (
                              <TbCalendar size={20} style={{ color: "#6B7280" }} />
                            ),
                          }}
                        />
                      </Box>
                    )}
                  />
                </Box>
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}
              >
                Enablement Settings
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
                        tooltipText="Enable reschedule policy for pickup orders."
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
                        tooltipText="Enable reschedule policy for delivery orders."
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
                        tooltipText="Use the same fee for both pickup and delivery reschedules."
                      />
                    </Box>
                  )}
                />
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}
              >
                Fee Configuration
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
                    />
                  )}
                />
                {!useUnifiedFee && (
                  <>
                    <Controller
                      name="pickupRescheduleFee"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <InputFieldModal
                          title="Pickup Reschedule Fee"
                          placeholder="Enter pickup reschedule fee"
                          type="number"
                          value={value || ""}
                          onChange={(e) => onChange(e.target.value)}
                        />
                      )}
                    />
                    <Controller
                      name="deliveryRescheduleFee"
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <InputFieldModal
                          title="Delivery Reschedule Fee"
                          placeholder="Enter delivery reschedule fee"
                          type="number"
                          value={value || ""}
                          onChange={(e) => onChange(e.target.value)}
                        />
                      )}
                    />
                  </>
                )}
                {useUnifiedFee && (
                  <Controller
                    name="pickupRescheduleFee"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <InputFieldModal
                        title="Reschedule Fee"
                        placeholder="Enter reschedule fee"
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                      />
                    )}
                  />
                )}
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
                      />
                    )}
                  />
                )}
              </Box>
            </Box>

            <Divider />

            <Box>
              <Typography
                variant="h6"
                sx={{ mb: 1, fontFamily: "Switzer", fontWeight: 600 }}
              >
                Reschedule Settings
              </Typography>
              <Box className="flex flex-col gap-4">
                <Controller
                  name="cutoffHoursBeforePickup"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Cutoff Hours Before Pickup"
                      placeholder="Enter cutoff hours (reschedule free within this window)"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Hours before pickup within which customer can reschedule without fee."
                    />
                  )}
                />
                <Controller
                  name="maxRescheduleCount"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Max Reschedule Count"
                      placeholder="Enter max reschedules per order"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                      tooltipText="Maximum number of times a customer can reschedule a single order."
                    />
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
