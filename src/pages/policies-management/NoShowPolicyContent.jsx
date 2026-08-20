import { useState, useEffect, useMemo } from "react";
import { Button, Field, Input, Modal, Select, Table } from "../../design-system";
import { PaginationBar, Toggle } from "../misc-kit";
import {
  DirectoryActions,
  DirectoryClearButton,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
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
  formatPolicyMoney,
  resolvePolicyCurrencySymbol,
} from "./policyUtils";
import { useForm, Controller } from "react-hook-form";
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
  
  // Filter states
  const [isActiveFilter, setIsActiveFilter] = useState("");
  const [isDefaultFilter, setIsDefaultFilter] = useState("");
  const [selectedZoneIdLocal, setSelectedZoneIdLocal] = useState("");
  const selectedZoneId =
    externalZoneId !== undefined ? externalZoneId : selectedZoneIdLocal;
  const setSelectedZoneId =
    typeof onZoneIdChange === "function" ? onZoneIdChange : setSelectedZoneIdLocal;
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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
  const [fetchZoneById] = useLazyGetZoneByIdQuery();
  const [fetchOverlapPolicies, { data: overlapPoliciesResponse, isFetching: overlapPoliciesLoading }] =
    useLazyGetNoShowPoliciesQuery();

  const isSubmitting = isAdding || isUpdating;

  const policies = policiesResponse?.data?.policies || [];
  const pagination = policiesResponse?.data?.pagination || {};

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
      render: (row) => (
        <DirectoryStatusPill active={isPolicyConsideredActive(row)} />
      ),
    },
    {
      key: "pickupNoShowFee",
      header: "Fee",
      render: (row) => (
        <PolicyMoney>
          {formatPolicyMoney(row.pickupNoShowFee, row.currencySymbol, row.currency)}
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
        <DirectoryActions><Button size="sm" variant="secondary" onClick={() => handleView(row)}>View</Button><Button size="sm" variant="secondary" onClick={() => handleEdit(row._rawPolicy || row)}>Edit</Button><Button size="sm" variant="danger" onClick={() => handleDelete(row._rawPolicy || row)}>Delete</Button></DirectoryActions>
      ),
    },
  ];

  // Prepare table data
  const policiesData = policies?.map((policy, index) => {
    const config = policy.noShowPolicyConfig || {};
    const zone =
      policy.zone ||
      zonesList.find((z) => String(z.id) === String(policy.zoneId)) ||
      null;
    const zoneName =
      zone?.name ||
      zoneOptions.find((z) => String(z.value) === String(policy.zoneId))?.label ||
      null;
    const currencyCode = config.currency || currencyCodeFromZone(zone, currencyUnitsList);
    const currencySymbol = resolvePolicyCurrencySymbol({
      zone,
      code: currencyCode,
      currencyUnits: currencyUnitsList,
    });
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
        ? formatPolicyDate(policy.createdAt)
        : "N/A",
      updatedAt: policy.updatedAt
        ? formatPolicyDate(policy.updatedAt)
        : "N/A",
      // Enablement Settings
      enableForPickup: config.enableForPickup ?? false,
      enableForDelivery: config.enableForDelivery ?? false,
      useUnifiedFee: config.useUnifiedFee ?? false,
      // Fee Configuration
      feeType: config.feeType || "N/A",
      currency: config.currency || currencyCode || "",
      currencySymbol,
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
      _rawPolicy: policy,
    };
  }) || [];

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
  const viewingConfig = viewingPolicy?.noShowPolicyConfig || {};
  const viewingZone =
    viewingPolicy?.zone ||
    zonesList.find((z) => String(z.id) === String(viewingPolicy?.zoneId)) ||
    null;
  const viewingZoneName =
    viewingZone?.name ||
    zoneOptions.find((z) => String(z.value) === String(viewingPolicy?.zoneId))?.label ||
    "—";
  const viewingCurrency = viewingConfig.currency || currencyCodeFromZone(viewingZone, currencyUnitsList);
  const viewingSymbol = resolvePolicyCurrencySymbol({
    zone: viewingZone,
    code: viewingCurrency,
    currencyUnits: currencyUnitsList,
  });

  if (isLoading) {
    return <Delay />;
  }

  return (
    <div>
      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            {showZoneFilter ? (
              <DirectoryToolSelect>
                <Select
                  aria-label="Filter by zone"
                  value={selectedZoneId}
                  onChange={setSelectedZoneId}
                  options={[{ value: "", label: "All zones" }, ...zoneOptions]}
                  placeholder="All zones"
                />
              </DirectoryToolSelect>
            ) : null}
            <DirectoryToolSelect>
              <Select
                aria-label="Status"
                value={isActiveFilter}
                onChange={setIsActiveFilter}
                options={[
                  { value: "", label: "All status" },
                  { value: "1", label: "Active" },
                  { value: "0", label: "Inactive" },
                ]}
                placeholder="All status"
              />
            </DirectoryToolSelect>
            <DirectoryToolSelect>
              <Select
                aria-label="Default"
                value={isDefaultFilter}
                onChange={setIsDefaultFilter}
                options={[
                  { value: "", label: "All default" },
                  { value: "1", label: "Default" },
                  { value: "0", label: "Not default" },
                ]}
                placeholder="All default"
              />
            </DirectoryToolSelect>
            {isActiveFilter || isDefaultFilter || selectedZoneId ? (
              <DirectoryToolbarEnd>
                <DirectoryClearButton
                  onClick={() => {
                    setIsActiveFilter("");
                    setIsDefaultFilter("");
                    setSelectedZoneId("");
                  }}
                />
              </DirectoryToolbarEnd>
            ) : null}
          </DirectoryToolbar>
        }
        footer={
          <PaginationBar
            page={page}
            limit={limit}
            total={pagination.total || 0}
            onPageChange={(newPage) => {
              setPage(newPage);
            }}
            onLimitChange={(newPageSize) => {
              setLimit(newPageSize);
              setPage(1);
            }}
          />
        }
      >
        <Table
          columns={columns}
          rows={policiesData}
          rowKey={(row, i) => row.id ?? row.sl ?? i}
          empty="No policies yet"
          stickyLeft={1}
        />
      </DirectoryTableWrap>

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        title={editingPolicy ? "EDIT NO SHOW POLICY" : "NO SHOW POLICY"}
        onClose={handleClose}
        size={"xl"}
        primaryLabel={isSubmitting ? "Saving…" : "Save"}
        secondaryLabel={"Cancel"}
        onPrimary={handleSubmit(onSubmit)}
        primaryDisabled={Boolean(isSubmitting)}

      >

          <div className="flex flex-col gap-6">
          {/* Basic Information */}
          <div>
            <h3 style={{ margin: 0 }}>
              Basic Information
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Configure the fundamental settings for this no-show policy, including name, description, and activation status.
            </p>
            <div className="flex flex-col gap-4">
              <Controller
                name="name"
                control={control}
                rules={{ required: "Policy name is required" }}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Policy Name*"} hint={editingPolicy
                        ? "Policy name/identifier. This is a required field and must be unique."
                        : "Policy name is auto-generated and cannot be edited."}>
                      <Input placeholder={"Enter policy name"} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={!editingPolicy} />
                    </Field>
                )}
              />
              <Controller
                name="description"
                control={control}
                rules={{ required: "Description is required" }}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Description*"} hint={"Policy description or notes. Optional field to provide additional context about the policy."}>
                      <Input placeholder={"Enter description"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="zoneId"
                control={control}
                rules={{ required: "Zone is required" }}
                render={({ field: { onChange, value } }) => (
                  <div>
                    <Field label={"Zone*"} hint={"Select which zone this policy applies to."}>
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
              </div>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* Enablement Settings */}
          <div>
            <h3 style={{ margin: 0 }}>
              Enablement Settings
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Specify which order types this no-show policy applies to. Enable the policy for pickup orders, delivery orders, or both, and choose whether to use unified fees.
            </p>
            <div className="flex flex-col gap-4">
              <Controller
                name="enableForPickup"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Enable no-show policy for pickup orders. When enabled, this policy will apply to pickup order no-shows."}>{"Enable For Pickup"}</span>
                  </div>
                )}
              />
              <Controller
                name="enableForDelivery"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Enable no-show policy for delivery orders. When enabled, this policy will apply to delivery order no-shows."}>{"Enable For Delivery"}</span>
                  </div>
                )}
              />
              <Controller
                name="useUnifiedFee"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Use unified fee for both pickup and delivery. When enabled, the same fee amount applies to both pickup and delivery no-shows."}>{"Use Unified Fee"}</span>
                  </div>
                )}
              />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* Fee Configuration */}
          <div>
            <h3 style={{ margin: 0 }}>
              Fee Configuration
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Define the fee structure for no-show charges. Set absolute amounts, percentage-based fees, storage fees, and choose between unified or separate fees for pickup and delivery.
            </p>
            <div className="flex flex-col gap-4">
              <Controller
                name="feeType"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Fee Type"} hint={"Fee calculation type. Choose 'Absolute' for fixed amount fees or 'Percentage' for percentage-based fees."}>
                      <Select aria-label={"Fee Type"} value={value} onChange={(next) => ((e) => onChange(e.target.value))({ target: { value: next } })} options={[
                      { value: "absolute", label: "Absolute" },
                      { value: "percentage", label: "Percentage" },
                    ]} placeholder={"Select Fee Type"} />
                    </Field>
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
              {!useUnifiedFee && (
                <>
                  <Controller
                    name="pickupNoShowFee"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <Field label={"Pickup No-Show Fee"} hint={"No-show fee for pickup orders in absolute amount. Default: 15.00"}>
                      <Input type={"number"} placeholder={"Enter pickup no-show fee"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                    )}
                  />
                  <Controller
                    name="deliveryNoShowFee"
                    control={control}
                    render={({ field: { onChange, value } }) => (
                      <Field label={"Delivery No-Show Fee"} hint={"No-show fee for delivery orders in absolute amount. Default: 20.00"}>
                      <Input type={"number"} placeholder={"Enter delivery no-show fee"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                    )}
                  />
                </>
              )}
              {useUnifiedFee && (
                <Controller
                  name="pickupNoShowFee"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Field label={"No-Show Fee"} hint={"Unified no-show fee applied to both pickup and delivery orders when 'Use Unified Fee' is enabled."}>
                      <Input type={"number"} placeholder={"Enter no-show fee"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                  )}
                />
              )}
              <Controller
                name="storageFeePerDay"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Storage Fee Per Day"} hint={"Daily storage fee for unclaimed orders. This fee is charged per day for orders that remain unclaimed. Default: 1.00"}>
                      <Input type={"number"} placeholder={"Enter storage fee per day"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              {feeType === "percentage" && (
                <Controller
                  name="percentageFee"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Field label={"Percentage Fee (%)"} hint={"Percentage fee (e.g., 5.00 for 5%). Used when Fee Type is 'Percentage' or 'Both'."}>
                      <Input type={"number"} placeholder={"Enter percentage fee"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                  )}
                />
              )}
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* Timing Settings */}
          <div>
            <h3 style={{ margin: 0 }}>
              Timing Settings
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Configure time-based rules for no-show detection. Set grace periods, driver SLA thresholds, and waiting times for calls and SMS notifications before a no-show is declared.
            </p>
            <div className="flex flex-col gap-4">
              <Controller
                name="graceMinutesOnSite"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Grace Minutes On Site"} hint={"Minutes to wait before no-show applies. The driver will wait this many minutes before considering it a no-show. Default: 15"}>
                      <Input type={"number"} placeholder={"Enter grace minutes"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="driverLateSLA"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Driver Late SLA (Minutes)"} hint={"Driver late SLA in minutes - auto-waive if exceeded. If the driver arrives later than this time, the no-show fee is automatically waived. Default: 30"}>
                      <Input type={"number"} placeholder={"Enter driver late SLA"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="callsMinutes"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Calls Minutes"} hint={"Minutes to wait before no-show applies for calls. Time to wait after making a call before considering it a no-show. Default: 5"}>
                      <Input type={"number"} placeholder={"Enter calls minutes"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="smsMinutes"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"SMS Minutes"} hint={"Minutes to wait before no-show applies for SMS. Time to wait after sending an SMS before considering it a no-show. Default: 5"}>
                      <Input type={"number"} placeholder={"Enter SMS minutes"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* Waiver Settings */}
          <div>
            <h3 style={{ margin: 0 }}>
              Waiver Settings
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Configure automatic fee waivers based on order value or absolute amounts. Set thresholds that automatically waive no-show fees for smaller orders or specific conditions.
            </p>
            <div className="flex flex-col gap-4">
              <Controller
                name="waiverType"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Waiver Type"} hint={"Waiver calculation type. Choose 'Absolute' for fixed amount waivers or 'Percentage' for percentage-based waivers."}>
                      <Select aria-label={"Waiver Type"} value={value} onChange={(next) => ((e) => onChange(e.target.value))({ target: { value: next } })} options={[
                      { value: "absolute", label: "Absolute" },
                      { value: "percentage", label: "Percentage" },
                    ]} placeholder={"Select Waiver Type"} />
                    </Field>
                )}
              />
              {waiverType === "absolute" && (
                <Controller
                  name="absoluteWaiverAmount"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Field label={"Absolute Waiver Amount"} hint={"Absolute amount for auto-waive. Used when Waiver Type is 'Absolute' or 'Both'. Orders below this amount will have fees automatically waived."}>
                      <Input type={"number"} placeholder={"Enter absolute waiver amount"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                  )}
                />
              )}
              {waiverType === "percentage" && (
                <Controller
                  name="percentageWaiverAmount"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <Field label={"Percentage Waiver Amount (%)"} hint={"Percentage of order value for auto-waive (e.g., 5.00 for 5%). Used when Waiver Type is 'Percentage' or 'Both'."}>
                      <Input type={"number"} placeholder={"Enter percentage waiver amount"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                  )}
                />
              )}
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* Auto Forgive Settings */}
          <div>
            <h3 style={{ margin: 0 }}>
              Auto Forgive Settings
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Automatically forgive no-show fees for customers within specified limits. Configure how many no-shows to forgive, over what time period, to provide leniency for occasional issues.
            </p>
            <div className="flex flex-col gap-4">
              <Controller
                name="autoForgiveFirstNoShow"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Automatically forgive first no-show. When enabled, the first no-show for each customer is automatically forgiven without charging a fee. Default: true"}>{"Auto Forgive First No-Show"}</span>
                  </div>
                )}
              />
              <Controller
                name="autoForgiveCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Auto Forgive Count"} hint={"Number of no-shows to auto-forgive. The system will automatically forgive this many no-shows per customer within the auto-forgive period. Default: 1"}>
                      <Input type={"number"} placeholder={"Enter auto forgive count"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="autoForgivePeriod"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Auto Forgive Period (Days)"} hint={"Period in days for auto-forgive. No-shows within this period will be automatically forgiven up to the auto-forgive count. Default: 30"}>
                      <Input type={"number"} placeholder={"Enter auto forgive period"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* Cap Settings */}
          <div>
            <h3 style={{ margin: 0 }}>
              Cap Settings
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Set maximum limits on no-show charges per customer. Configure the maximum number of charges allowed within a time window and whether payment is required after reaching the cap.
            </p>
            <div className="flex flex-col gap-4">
              <Controller
                name="requirePaymentAfterCap"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Require payment after cap is reached. When enabled, customers must pay outstanding fees before placing new orders once they reach the per-customer cap. Default: true"}>{"Require Payment After Cap"}</span>
                  </div>
                )}
              />
              <Controller
                name="perCustomerCap"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Per Customer Cap"} hint={"Maximum charges per customer. The maximum number of no-show fees that can be charged to a single customer within the cap window. Default: 3"}>
                      <Input type={"number"} placeholder={"Enter per customer cap"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="capWindowDays"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Cap Window (Days)"} hint={"Window in days for cap calculation. The time period within which the per-customer cap is calculated. Default: 90"}>
                      <Input type={"number"} placeholder={"Enter cap window days"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
            </div>
          </div>
        </div>

      </Modal>

      <Modal
        open={overlapModalOpen}
        title={"ACTIVE NO-SHOW POLICY IN THIS ZONE"}
        onClose={handleCloseOverlapModal}
        size={"lg"}
        primaryLabel={isAdding ? "Saving…" : "Retry saving new policy"}
        secondaryLabel={"Close"}
        onPrimary={handleRetryPendingAdd}
        primaryDisabled={Boolean(isAdding)}

      >
        <div className="flex flex-col gap-3">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Another active no-show policy in{" "}
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
        title="View no-show policy"
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
              <PolicyDetailRow label="Status" value={viewingPolicy.isActive ? "Active" : "Inactive"} />
              <PolicyDetailRow label="Effective from" value={formatPolicyDate(viewingPolicy.effectiveFrom)} />
              <PolicyDetailRow label="Effective to" value={formatPolicyDate(viewingPolicy.effectiveTo)} />
            </PolicyDetailSection>
            <PolicyDetailSection title="Fees">
              <PolicyDetailRow label="Currency" value={viewingCurrency || "—"} />
              <PolicyDetailRow
                label="Pickup fee"
                value={formatPolicyMoney(viewingConfig.pickupNoShowFee, viewingSymbol, viewingCurrency)}
              />
              <PolicyDetailRow
                label="Delivery fee"
                value={formatPolicyMoney(viewingConfig.deliveryNoShowFee, viewingSymbol, viewingCurrency)}
              />
              <PolicyDetailRow
                label="Storage fee / day"
                value={formatPolicyMoney(viewingConfig.storageFeePerDay, viewingSymbol, viewingCurrency)}
              />
              <PolicyDetailRow label="Unified fee" value={formatPolicyBool(viewingConfig.useUnifiedFee)} />
            </PolicyDetailSection>
          </PolicyDetailStack>
        ) : null}
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        title="Delete no-show policy"
        description={`Are you sure you want to delete “${policyToDelete?.name || "this policy"}”? This cannot be undone.`}
        onClose={handleCancelDelete}
        size="sm"
        primaryLabel={isDeleting ? "Deleting…" : "Delete"}
        secondaryLabel="Cancel"
        onPrimary={handleConfirmDelete}
        primaryDisabled={isDeleting}
        danger
      />

    </div>
  );
}
