import { useState, useEffect } from "react";
import { Box, Typography, Checkbox, Divider } from "@mui/material";
import { TbPlus } from "../../shared/icons/index";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import FiltersButton from "../../components/ui/FiltersButton";
import { useForm, Controller } from "react-hook-form";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import useToaster from "../../components/ui/Toaster";
import { useAddCancellationPolicyMutation, useGetCancellationPoliciesQuery, useUpdateCancellationPolicyMutation, useDeleteCancellationPolicyMutation } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

export default function CancellationPolicyContent() {
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

  const { data: policiesResponse, isLoading, refetch } = useGetCancellationPoliciesQuery(filterParams);
  const [addCancellationPolicy, { isLoading: isAdding }] = useAddCancellationPolicyMutation();
  const [updateCancellationPolicy, { isLoading: isUpdating }] = useUpdateCancellationPolicyMutation();
  const [deleteCancellationPolicy, { isLoading: isDeleting }] = useDeleteCancellationPolicyMutation();
  
  const isSubmitting = isAdding || isUpdating;

  const policies = policiesResponse?.data?.policies || [];
  const pagination = policiesResponse?.data?.pagination || {};
  const totalPages = pagination.pages || 1;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
      isDefault: false,
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

  // Table columns
  const columns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.1,
      minWidth: 80,
      sortable: true,
    },
    {
      field: "name",
      headerName: "Policy Name",
      flex: 0.2,
      minWidth: 150,
      sortable: true,
    },
    {
      field: "description",
      headerName: "Description",
      flex: 0.25,
      minWidth: 200,
      sortable: true,
    },
    {
      field: "isActive",
      headerName: "Status",
      flex: 0.1,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.isActive ? "success.main" : "text.secondary",
            fontWeight: 500,
          }}
        >
          {row.isActive ? "Active" : "Inactive"}
        </Typography>
      ),
    },
    {
      field: "isDefault",
      headerName: "Default",
      flex: 0.1,
      minWidth: 100,
      sortable: true,
      renderCell: (row) => (
        <Typography
          sx={{
            color: row.isDefault ? "primary.main" : "text.secondary",
            fontWeight: 500,
          }}
        >
          {row.isDefault ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Action",
      flex: 0.15,
      minWidth: 150,
      renderCell: (row) => (
        <ActionButtons
          showView={false}
          onEdit={() => handleEdit(row)}
          onDelete={() => handleDelete(row)}
        />
      ),
      sortable: false,
    },
  ];

  // Prepare table data
  const policiesData = policies?.map((policy, index) => ({
    id: policy.id,
    sl: index + 1,
    name: policy.name,
    description: policy.description,
    isActive: policy.isActive,
    isDefault: policy.isDefault,
    type: policy.type,
    createdAt: policy.createdAt ? new Date(policy.createdAt).toLocaleDateString() : "N/A",
    updatedAt: policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : "N/A",
    cancellationConfig: policy.cancellationConfig,
  })) || [];

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
      isActive: true,
      isDefault: false,
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

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    const config = policy.cancellationConfig || {};
    reset({
      name: policy.name || "",
      description: policy.description || "",
      isActive: policy.isActive ?? true,
      isDefault: policy.isDefault ?? false,
      prePickupAbsoluteCurrency: config.prePickupAbsoluteCurrency || "USD",
      prePickupAbsoluteAmount: config.prePickupAbsoluteAmount?.toString() || "",
      prePickupPercentage: config.prePickupPercentage?.toString() || "",
      prePickupFreeChargeWindowMinutes: config.prePickupFreeChargeWindowMinutes?.toString() || "",
      prePickupFirstCancellationLeniency: config.prePickupFirstCancellationLeniency ?? true,
      unprocessedAbsoluteCurrency: config.unprocessedAbsoluteCurrency || "USD",
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
      const payload = {
        name: data.name,
        description: data.description,
        isActive: data.isActive,
        isDefault: data.isDefault,
        prePickupAbsoluteCurrency: data.prePickupAbsoluteCurrency,
        prePickupAbsoluteAmount: data.prePickupAbsoluteAmount ? parseFloat(data.prePickupAbsoluteAmount) : 0,
        prePickupPercentage: data.prePickupPercentage ? parseFloat(data.prePickupPercentage) : 0,
        prePickupFreeChargeWindowMinutes: data.prePickupFreeChargeWindowMinutes ? parseInt(data.prePickupFreeChargeWindowMinutes) : 0,
        prePickupFirstCancellationLeniency: data.prePickupFirstCancellationLeniency,
        unprocessedAbsoluteCurrency: data.unprocessedAbsoluteCurrency,
        unprocessedAbsoluteAmount: data.unprocessedAbsoluteAmount ? parseFloat(data.unprocessedAbsoluteAmount) : 0,
        unprocessedPercentage: data.unprocessedPercentage ? parseFloat(data.unprocessedPercentage) : 0,
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
      {/* Action Button and Filters Button */}
      <Box className="flex items-center justify-between mb-4">
        <FiltersButton
          text="Filters"
          onClick={() => setFilterModalOpen(true)}
        />
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
      <Box sx={{ width: "100%", overflow: "auto" }}>
        <DataTable
          data={policiesData}
          columns={columns}
          height={600}
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
                    />
                    {errors.description && (
                      <Typography variant="caption" sx={{ color: "error.main", mt: 1, display: "block" }}>
                        {errors.description.message}
                      </Typography>
                    )}
                  </Box>
                )}
              />

              <Box className="flex items-center gap-4">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box className="flex items-center gap-2">
                      <Checkbox
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                      />
                      <Typography variant="body2">Active</Typography>
                    </Box>
                  )}
                />

                <Controller
                  name="isDefault"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Box className="flex items-center gap-2">
                      <Checkbox
                        checked={value}
                        onChange={(e) => onChange(e.target.checked)}
                      />
                      <Typography variant="body2">Set as Default</Typography>
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
                  />
                )}
              />

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
                  />
                )}
              />

              <Controller
                name="prePickupFirstCancellationLeniency"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">First Cancellation Leniency</Typography>
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
                    />
                  )}
                />
              </Box>

              <Box className="grid grid-cols-2 gap-4">
                <Controller
                  name="unprocessedPercentage"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <InputFieldModal
                      title="Percentage (%)"
                      placeholder="Enter percentage"
                      type="number"
                      value={value || ""}
                      onChange={(e) => onChange(e.target.value)}
                    />
                  )}
                />

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
                    />
                  )}
                />
              </Box>

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
                  />
                )}
              />

              <Controller
                name="allowCancelUnprocessed"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Allow Cancel Unprocessed</Typography>
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
                  <Checkbox
                    checked={value}
                    onChange={(e) => onChange(e.target.checked)}
                  />
                  <Typography variant="body2">Enable Customer Leniency</Typography>
                </Box>
              )}
            />
          </Box>
        </Box>
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
    </Box>
  );
}
