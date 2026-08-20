import { useState, useEffect, useMemo } from "react";
import { TbTrash } from "../../shared/icons/index";
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
  formatPolicyDate,
  formatPolicyMoney,
  resolvePolicyCurrencySymbol,
} from "./policyUtils";
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

  const { data: policiesResponse, isLoading, refetch } =
    useGetReschedulePoliciesQuery(filterParams);
  const [addReschedulePolicy, { isLoading: isAdding }] =
    useAddReschedulePolicyMutation();
  const [updateReschedulePolicy, { isLoading: isUpdating }] =
    useUpdateReschedulePolicyMutation();
  const [deleteReschedulePolicy, { isLoading: isDeleting }] =
    useDeleteReschedulePolicyMutation();
  const [fetchZoneById] = useLazyGetZoneByIdQuery();
  const [fetchOverlapPolicies, { data: overlapPoliciesResponse, isFetching: overlapPoliciesLoading }] =
    useLazyGetReschedulePoliciesQuery();

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
      key: "pickupRescheduleFee",
      header: "Fee",
      render: (row) => (
        <PolicyMoney>
          {formatPolicyMoney(row.pickupRescheduleFee, row.currencySymbol, row.currency)}
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
        <DirectoryActions><Button size="sm" variant="secondary" onClick={() => handleView(row)}>View</Button><Button size="sm" variant="secondary" onClick={() => handleEdit(row)}>Edit</Button><Button size="sm" variant="danger" onClick={() => handleDelete(row)}>Delete</Button></DirectoryActions>
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
      const zone =
        policy.zone ||
        zonesList.find((z) => String(z.id) === String(policy.zoneId)) ||
        null;
      const zoneName =
        zone?.name ||
        zoneOptions.find((z) => String(z.value) === String(policy.zoneId))?.label ||
        null;
      const currencySymbol = resolvePolicyCurrencySymbol({
        zone,
        code: currency,
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
        enableForPickup: config.atPickupCourtesyCountEnabled ?? false,
        enableForDelivery: config.atDeliveryCourtesyCountEnabled ?? false,
        feeType,
        currency,
        currencySymbol,
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
        createdAt: formatPolicyDate(policy.createdAt),
        updatedAt: formatPolicyDate(policy.updatedAt),
        reschedulePolicyConfig: config,
        _rawPolicy: policy,
      };
    }) || [];

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
  });

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
  const viewingConfig =
    viewingPolicy?.rescheduleConfig || viewingPolicy?.reschedulePolicyConfig || viewingPolicy || {};
  const viewingZone =
    viewingPolicy?.zone ||
    zonesList.find((z) => String(z.id) === String(viewingPolicy?.zoneId)) ||
    null;
  const viewingZoneName =
    viewingZone?.name ||
    zoneOptions.find((z) => String(z.value) === String(viewingPolicy?.zoneId))?.label ||
    "—";
  const viewingCurrency =
    viewingConfig.atPickupAbsoluteCurrency ||
    viewingConfig.currency ||
    currencyCodeFromZone(viewingZone, currencyUnitsList);
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
              onPageChange={(newPage) => setPage(newPage)}
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
      </div>

      <Modal
        open={modalOpen}
        title={editingPolicy ? "Edit reschedule policy" : "Reschedule policy"}
        onClose={handleClose}
        size="xl"
        primaryLabel={isSubmitting ? "Saving…" : "Save"}
        secondaryLabel="Cancel"
        onPrimary={handleSubmit(onSubmit)}
        primaryDisabled={Boolean(isSubmitting)}
      >

        <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Basic Information */}
          <div>
            <h3 style={{ margin: 0 }}>
              Basic Information
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Name, description and status for this reschedule policy.
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
                      <Input placeholder={"e.g. Default Reschedule Policy"} value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={!editingPolicy} />
                    </Field>
                )}
              />
              <Controller
                name="description"
                control={control}
                rules={{ required: "Description is required" }}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Description*"}>
                      <Input placeholder={"e.g. Standard reschedule policy for customers"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
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
              <Controller
                name="currency"
                control={control}
                render={({ field: { value } }) => (
                  <Field label={"Currency"} hint={"Currency follows the selected zone. Change the zone to change currency."}>
                      <Input placeholder={watchedZoneId ? "Set from zone" : "Select zone first"} value={value ?? ""} onChange={() => {}} disabled={true} />
                    </Field>
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
              <div className="grid grid-cols-2 gap-4">
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                      <span title={"Policy is active and applicable."}>{"Active"}</span>
                    </div>
                  )}
                />
                <Controller
                  name="isDefault"
                  control={control}
                  render={({ field: { onChange, value } }) => (
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                      <span title={"Use as default reschedule policy."}>{"Default policy"}</span>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* At Pickup */}
          <div>
            <h3 style={{ margin: 0 }}>
              At Pickup
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Fees and courtesy settings when rescheduling at pickup.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="atPickupAbsoluteAmount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Absolute amount"}>
                      <Input type={"number"} placeholder={"Leave empty for none"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="atPickupPercentage"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Percentage (%)"}>
                      <Input type={"number"} placeholder={"Leave empty for none"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="atPickupCourtesyCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Courtesy count"}>
                      <Input type={"number"} placeholder={"e.g. 1"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="atPickupCourtesyCountEnabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Allow free reschedules up to courtesy count at pickup."}>{"Courtesy count enabled"}</span>
                  </div>
                )}
              />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* At Delivery */}
          <div>
            <h3 style={{ margin: 0 }}>
              At Delivery
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Fees and courtesy settings when rescheduling at delivery.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="atDeliveryAbsoluteAmount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Absolute amount"}>
                      <Input type={"number"} placeholder={"Leave empty for none"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="atDeliveryPercentage"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Percentage (%)"}>
                      <Input type={"number"} placeholder={"Leave empty for none"} value={value || ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="atDeliveryCourtesyCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Courtesy count"}>
                      <Input type={"number"} placeholder={"e.g. 1"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="atDeliveryCourtesyCountEnabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Allow free reschedules up to courtesy count at delivery."}>{"Courtesy count enabled"}</span>
                  </div>
                )}
              />
            </div>
          </div>

          <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "16px 0" }} />

          {/* Courtesy & Leniency */}
          <div>
            <h3 style={{ margin: 0 }}>
              Courtesy & Leniency
            </h3>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Global courtesy window and customer leniency.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Controller
                name="courtesyWindowDays"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Courtesy window (days)"}>
                      <Input type={"number"} placeholder={"e.g. 30"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="courtesyCapAmount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Courtesy cap amount"}>
                      <Input type={"number"} placeholder={"e.g. 15.00"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="courtesyCount"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <Field label={"Courtesy count"}>
                      <Input type={"number"} placeholder={"e.g. 1"} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
                    </Field>
                )}
              />
              <Controller
                name="customerLeniencyEnabled"
                control={control}
                render={({ field: { onChange, value } }) => (
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
                    <span title={"Apply leniency rules for reschedule."}>{"Customer leniency enabled"}</span>
                  </div>
                )}
              />
            </div>
          </div>
        </div>

      </Modal>

      <Modal
        open={overlapModalOpen}
        title={"ACTIVE RESCHEDULE POLICY IN THIS ZONE"}
        onClose={handleCloseOverlapModal}
        size={"lg"}
        primaryLabel={isAdding ? "Saving…" : "Retry saving new policy"}
        secondaryLabel={"Close"}
        onPrimary={handleRetryPendingAdd}
        primaryDisabled={Boolean(isAdding)}

      >
        <div className="flex flex-col gap-3">
          <p style={{ margin: 0, color: "var(--muted)" }}>
            Another active reschedule policy in{" "}
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
        title="View reschedule policy"
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
                value={formatPolicyMoney(
                  viewingConfig.atPickupAbsoluteAmount ?? viewingConfig.pickupRescheduleFee,
                  viewingSymbol,
                  viewingCurrency
                )}
              />
              <PolicyDetailRow
                label="Delivery fee"
                value={formatPolicyMoney(
                  viewingConfig.atDeliveryAbsoluteAmount ?? viewingConfig.deliveryRescheduleFee,
                  viewingSymbol,
                  viewingCurrency
                )}
              />
            </PolicyDetailSection>
          </PolicyDetailStack>
        ) : null}
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        title="Delete reschedule policy"
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
