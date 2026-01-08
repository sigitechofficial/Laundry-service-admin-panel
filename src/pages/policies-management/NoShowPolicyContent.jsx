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
import { useAddNoShowPolicyMutation, useGetNoShowPoliciesQuery, useUpdateNoShowPolicyMutation, useDeleteNoShowPolicyMutation } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

export default function NoShowPolicyContent() {
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
      isActive: true,
      isDefault: false,
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
    noShowPolicyConfig: policy.noShowPolicyConfig,
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

  const handleEdit = (policy) => {
    setEditingPolicy(policy);
    const config = policy.noShowPolicyConfig || {};
    reset({
      name: policy.name || "",
      description: policy.description || "",
      isActive: policy.isActive ?? true,
      isDefault: policy.isDefault ?? false,
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
        isActive: data.isActive,
        isDefault: data.isDefault,
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
          Add No Show Policy
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
        <Box className="flex flex-col gap-6">
          {/* Basic Information */}
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

          {/* Enablement Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
              Enablement Settings
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="enableForPickup"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Enable For Pickup</Typography>
                  </Box>
                )}
              />
              <Controller
                name="enableForDelivery"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Enable For Delivery</Typography>
                  </Box>
                )}
              />
              <Controller
                name="useUnifiedFee"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Use Unified Fee</Typography>
                  </Box>
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Fee Configuration */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
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
                    bgcolor="white"
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
                    bgcolor="white"
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
                    />
                  )}
                />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Timing Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
              Timing Settings
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
                  />
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Delivery Options */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
              Delivery Options
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="pickupBagAtDoor"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Pickup Bag At Door</Typography>
                  </Box>
                )}
              />
              <Controller
                name="deliveryLeaveAtDoor"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Delivery Leave At Door</Typography>
                  </Box>
                )}
              />
              <Controller
                name="concierge"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Concierge</Typography>
                  </Box>
                )}
              />
              <Controller
                name="locker"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Locker</Typography>
                  </Box>
                )}
              />
              <Controller
                name="requirePhoto"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Require Photo</Typography>
                  </Box>
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Waiver Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
              Waiver Settings
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
                    bgcolor="white"
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
                    />
                  )}
                />
              )}
            </Box>
          </Box>

          <Divider />

          {/* Auto Forgive Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
              Auto Forgive Settings
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="autoForgiveFirstNoShow"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Auto Forgive First No-Show</Typography>
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
                  />
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* Cap Settings */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontFamily: "Switzer", fontWeight: 600 }}>
              Cap Settings
            </Typography>
            <Box className="flex flex-col gap-4">
              <Controller
                name="requirePaymentAfterCap"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Box className="flex items-center gap-2">
                    <Checkbox
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                    />
                    <Typography variant="body2">Require Payment After Cap</Typography>
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
                  />
                )}
              />
            </Box>
          </Box>
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
