import { useState, useEffect, useMemo, useCallback } from "react";
import { TbChevronDown, TbPencil, RiDeleteBin6Line } from "../../shared/icons/index";
import {
  useAddPreferenceMutation,
  useAddPreferenceValueMutation,
  useDeletePreferenceMutation,
  useDeletePreferenceValueMutation,
  useEditPreferenceTypeMutation,
  useEditPreferenceValueMutation,
  useGetAllServicesQuery,
  useGetPreferencesQuery,
  useGetServiceWitPreferencesQuery,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import { Button, Field, Input, Select, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { EmptyHint, QueryState } from "./QueryState";
import {
  DirectoryDotPills,
  DirectoryFormCard,
  DirectoryListRow,
  DirectoryMetrics,
} from "../directory-table/directoryTable";

function readParentPreferenceTypeId(pref) {
  if (!pref || typeof pref !== "object") return "";
  const v = pref.parentPreferenceTypeId ?? pref.parentId ?? pref.parent?.id;
  if (v == null || v === "") return "";
  return Number(v);
}

function collectLinkedPreferenceIds(preferencesData) {
  const ids = new Set();
  (preferencesData || []).forEach((pref) => {
    if (pref?.id != null) ids.add(String(pref.id));
    if (pref?.preferenceTypeId != null) ids.add(String(pref.preferenceTypeId));
    (pref?.childTypes || []).forEach((child) => {
      if (child?.id != null) ids.add(String(child.id));
    });
  });
  return ids;
}

function ServicePreferenceProbe({ service, onIndex }) {
  const { data } = useGetServiceWitPreferencesQuery(service.id, {
    skip: !service.id,
  });

  useEffect(() => {
    onIndex(
      String(service.id),
      service.name,
      collectLinkedPreferenceIds(data?.data?.preferencesData)
    );
  }, [data, onIndex, service.id, service.name]);

  return null;
}

/** Wash Type must stay top-level — no parent preference. */
function isWashTypePreferenceName(name) {
  if (name == null || typeof name !== "string") return false;
  const n = name.trim().toLowerCase().replace(/\s+/g, " ");
  return n === "wash type";
}

export default function PreferencesCard({ triggerAdd }) {
  const { success, error } = useToaster();
  const preferences = useSelector((state) => state?.apiData?.preferences);

  const [addPreference, { isLoading: preferenceLoading }] =
    useAddPreferenceMutation();
  const [addPreferenceValue] = useAddPreferenceValueMutation();
  const [deletePreferenceValue, { isLoading: deletePrefValueLoading }] =
    useDeletePreferenceValueMutation();
  const [deletePreference, { isLoading: preferenceDeleteLoading }] =
    useDeletePreferenceMutation();
  const [editPreferenceValue] = useEditPreferenceValueMutation();
  const [editPreferenceType, { isLoading: editPrefTypeLoading }] =
    useEditPreferenceTypeMutation();

  const {
    isLoading,
    isError,
    error: preferencesQueryError,
    refetch: refetchPreferences,
  } = useGetPreferencesQuery();
  const { data: servicesResponse } = useGetAllServicesQuery();
  const services = servicesResponse?.data?.services ?? [];
  const [prefServiceIndex, setPrefServiceIndex] = useState({});

  const handlePreferenceIndex = useCallback((serviceId, name, ids) => {
    const nextIds = [...ids].sort();
    setPrefServiceIndex((prev) => {
      const existing = prev[serviceId];
      if (
        existing &&
        existing.name === name &&
        existing.ids.join(",") === nextIds.join(",")
      ) {
        return prev;
      }
      return { ...prev, [serviceId]: { name, ids: nextIds } };
    });
  }, []);

  const servicesByPreferenceId = useMemo(() => {
    const map = {};
    Object.values(prefServiceIndex).forEach(({ name, ids }) => {
      ids.forEach((id) => {
        if (!map[id]) map[id] = [];
        if (!map[id].includes(name)) map[id].push(name);
      });
    });
    return map;
  }, [prefServiceIndex]);

  const parentNameById = useMemo(() => {
    const map = {};
    (preferences || []).forEach((pref) => {
      map[String(pref.id)] = pref.name;
    });
    return map;
  }, [preferences]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [expandedPrefs, setExpandedPrefs] = useState({});
  const [preferenceData, setPreferenceData] = useState({
    name: "",
    preferenceId: "",
    open: false,
    valueModal: false,
    subPreference: "",
    subPreferenceId: "",
    type: "",
    parentPreferenceTypeId: "",
  });
  const [isSubmittingSubPreference, setIsSubmittingSubPreference] =
    useState(false);

  const parentSelectOptions = useMemo(() => {
    const none = [{ value: "", label: "None (top-level)" }];
    if (!preferences?.length) return none;
    const list =
      preferenceData.type === "preference" &&
      preferenceData.preferenceId !== "" &&
      preferenceData.preferenceId != null
        ? preferences.filter(
            (p) => String(p.id) !== String(preferenceData.preferenceId)
          )
        : preferences;
    return [
      ...none,
      ...list.map((p) => ({ value: String(p.id), label: p.name })),
    ];
  }, [preferences, preferenceData.type, preferenceData.preferenceId]);

  const parentSelectDisabled = isWashTypePreferenceName(preferenceData.name);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && !preferenceData.open) {
      setPreferenceData((prev) => ({
        ...prev,
        open: true,
        parentPreferenceTypeId: "",
        type: "",
        valueModal: false,
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAdd]);

  const handleToggle = (val) => {
    if (val) {
      setPreferenceData((prev) => ({
        ...prev,
        valueModal: !prev.valueModal,
      }));
    } else {
      setPreferenceData((prev) => ({
        ...prev,
        open: !prev.open,
      }));
    }
  };

  const handlePrefToggle = (prefId) => {
    setExpandedPrefs((prev) => ({
      ...prev,
      [prefId]: !prev[prefId],
    }));
  };

  const resetPreferenceData = () => {
    setPreferenceData({
      name: "",
      preferenceId: "",
      open: false,
      valueModal: false,
      subPreference: "",
      subPreferenceId: "",
      type: "",
      parentPreferenceTypeId: "",
    });
  };

  const handleAddPreference = async () => {
    try {
      const body = { name: preferenceData.name };
      if (
        !isWashTypePreferenceName(preferenceData.name) &&
        preferenceData.parentPreferenceTypeId !== "" &&
        preferenceData.parentPreferenceTypeId != null
      ) {
        body.parentPreferenceTypeId = Number(
          preferenceData.parentPreferenceTypeId
        );
      }
      let res = await addPreference(body).unwrap();
      if (res?.status === "1") {
        success("Preference added successfully!");
        handleToggle(false);
        resetPreferenceData();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to add preference");
    }
  };

  const handleEditPreference = async () => {
    try {
      let res = await editPreferenceType({
        id: preferenceData.preferenceId,
        name: preferenceData.name,
        parentPreferenceTypeId: isWashTypePreferenceName(preferenceData.name)
          ? null
          : preferenceData.parentPreferenceTypeId === "" ||
              preferenceData.parentPreferenceTypeId == null
            ? null
            : Number(preferenceData.parentPreferenceTypeId),
      }).unwrap();
      if (res?.status === "1") {
        success("Preference updated successfully!");
        handleToggle(false);
        resetPreferenceData();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to add preference");
    }
  };

  const isExplicitMutationFailure = (res) =>
    res && (res.status === "0" || res.status === 0 || res.success === false);

  const hasPreferenceValue = (prefList, prefId, rawValue) => {
    const value = String(rawValue || "").trim().toLowerCase();
    if (!value) return false;
    const pref = (prefList || []).find((p) => String(p?.id) === String(prefId));
    if (!pref || !Array.isArray(pref.preferenceValues)) return false;
    return pref.preferenceValues.some(
      (v) => String(v?.value || "").trim().toLowerCase() === value
    );
  };

  const handleAddPreferenceValue = async () => {
    const trimmed = String(preferenceData.subPreference || "").trim();
    if (!trimmed) {
      error("Enter a sub preference name.");
      return;
    }
    setIsSubmittingSubPreference(true);
    try {
      const mutationResult = await addPreferenceValue({
        value: [trimmed],
        preferenceTypeId: preferenceData.preferenceId,
      });

      if (mutationResult?.data && !isExplicitMutationFailure(mutationResult.data)) {
        success("Preference value added successfully!");
        resetPreferenceData();
      } else {
        const refetchResult = await refetchPreferences();
        const refreshedPrefs = Array.isArray(refetchResult?.data?.data)
          ? refetchResult.data.data
          : preferences;
        if (hasPreferenceValue(refreshedPrefs, preferenceData.preferenceId, trimmed)) {
          success("Preference value added successfully!");
          resetPreferenceData();
        } else {
          const errData = mutationResult?.error?.data;
          error(
            errData?.error ||
              errData?.message ||
              mutationResult?.data?.message ||
              mutationResult?.data?.error ||
              "Failed to add preference value"
          );
        }
      }
    } catch (err) {
      error(err?.data?.error || err?.data?.message || "Failed to add preference value");
    } finally {
      setIsSubmittingSubPreference(false);
    }
  };

  const handleUpdatePreferenceValue = async () => {
    if (!preferenceData.subPreferenceId) {
      error("Missing sub preference. Close the modal and try again.");
      return;
    }
    const trimmed = String(preferenceData.subPreference || "").trim();
    if (!trimmed) {
      error("Enter a sub preference name.");
      return;
    }
    setIsSubmittingSubPreference(true);
    try {
      const res = await editPreferenceValue({
        id: preferenceData.subPreferenceId,
        value: trimmed,
      }).unwrap();
      if (!isExplicitMutationFailure(res)) {
        success("Preference value updated successfully!");
        resetPreferenceData();
      } else {
        error(res?.message || res?.error || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to update preference value");
    } finally {
      setIsSubmittingSubPreference(false);
    }
  };

  const deletePref = async (id) => {
    try {
      let res = await deletePreference(id).unwrap();
      if (res.status === "1") {
        success("Preference deleted successfully");
        setDeleteTarget(null);
      } else {
        error(res?.message || "Failed to delete preference");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to delete preference");
    }
  };

  const primaryModalLoading = preferenceData.valueModal
    ? isSubmittingSubPreference
    : preferenceData.type === "preference"
      ? editPrefTypeLoading
      : preferenceLoading;

  const deletePrefValue = async (id) => {
    try {
      let res = await deletePreferenceValue(id).unwrap();
      if (res.status === "1") {
        success("Preference value deleted successfully");
        setDeleteTarget(null);
      } else {
        error(res?.message || "Failed to delete preference value");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to delete preference value");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "value") {
      await deletePrefValue(deleteTarget.id);
      return;
    }
    await deletePref(deleteTarget.id);
  };

  const closeModal = () => {
    setIsSubmittingSubPreference(false);
    handleToggle(Boolean(preferenceData.valueModal));
  };

  const handlePrimary = () => {
    if (primaryModalLoading) return;
    if (preferenceData.valueModal) {
      if (preferenceData.type === "update") handleUpdatePreferenceValue();
      else handleAddPreferenceValue();
      return;
    }
    if (preferenceData.type === "preference") handleEditPreference();
    else handleAddPreference();
  };

  const modalTitle = preferenceData.valueModal
    ? preferenceData.type === "update"
      ? "Update sub Preferences"
      : "Add sub Preferences"
    : preferenceData.type === "preference"
      ? "Update Preference"
      : "Add Preference";

  const primaryLabel = preferenceData.valueModal
    ? preferenceData.type === "update"
      ? "Update Sub Preference"
      : "Add Sub Preference"
    : preferenceData.type === "preference"
      ? "Update"
      : "Add Preference";

  const totalPrefs = preferences?.length ?? 0;
  const totalValues = (preferences || []).reduce(
    (n, pref) => n + (pref.preferenceValues?.length || 0),
    0
  );
  const linkedPreferenceCount = (preferences || []).filter(
    (pref) => (servicesByPreferenceId[String(pref.id)] || []).length > 0
  ).length;

  if (isLoading || isError) {
    return (
      <QueryState
        loading={isLoading}
        error={preferencesQueryError || isError}
        onRetry={refetchPreferences}
        errorLabel="Could not load preferences. Please try again."
      />
    );
  }

  return (
    <div>
      {services.map((service) => (
        <ServicePreferenceProbe
          key={service.id}
          service={service}
          onIndex={handlePreferenceIndex}
        />
      ))}
      <DirectoryMetrics
        items={[
          { label: "Preference types", value: totalPrefs, tone: "brand" },
          { label: "Preference values", value: totalValues, tone: "navy" },
          { label: "Linked to a service", value: linkedPreferenceCount, tone: "success" },
        ]}
      />
    <DirectoryFormCard
      title="Preferences"
      hint="Attach these types to a service in Configure. Catalog then shows them on that service."
      flush
    >
        {!preferences?.length ? (
          <EmptyHint>No preferences yet. Use Add Preference to create the first type.</EmptyHint>
        ) : null}
        {preferences?.map((preference) => (
          <div key={preference?.id}>
            <DirectoryListRow
              onClick={() => handlePrefToggle(preference?.id)}
              style={{ cursor: "pointer" }}
            >
              <span style={{ minWidth: 140, display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{preference?.name}</span>
                {(() => {
                  const parentId = readParentPreferenceTypeId(preference);
                  const usedOn = servicesByPreferenceId[String(preference?.id)] || [];
                  const parentLabel =
                    parentId !== "" ? parentNameById[String(parentId)] : "";
                  return (
                    <DirectoryDotPills
                      items={[
                        parentLabel
                          ? { key: "parent", tone: "neutral", label: `Child of ${parentLabel}` }
                          : { key: "top", tone: "neutral", label: "Top-level" },
                        ...(usedOn.length
                          ? usedOn.map((serviceName) => ({
                              key: serviceName,
                              tone: "info",
                              label: serviceName,
                            }))
                          : [{ key: "unlinked", tone: "warning", label: "Not linked to a service" }]),
                      ]}
                    />
                  );
                })()}
              </span>
              <div
                style={{ display: "flex", alignItems: "center", gap: 8 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setIsSubmittingSubPreference(false);
                    setPreferenceData((prev) => ({
                      ...prev,
                      name: preference?.name,
                      preferenceId: preference?.id,
                      type: "",
                      subPreference: "",
                      subPreferenceId: "",
                      valueModal: true,
                      open: false,
                      parentPreferenceTypeId: "",
                    }));
                  }}
                >
                  Add Sub Preference
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setPreferenceData({
                      type: "preference",
                      preferenceId: preference?.id,
                      name: preference?.name,
                      open: true,
                      parentPreferenceTypeId: isWashTypePreferenceName(
                        preference?.name
                      )
                        ? ""
                        : readParentPreferenceTypeId(preference),
                    });
                  }}
                >
                  <TbPencil size={16} />
                  Edit
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={preferenceDeleteLoading}
                  onClick={() =>
                    setDeleteTarget({
                      kind: "preference",
                      id: preference?.id,
                      name: preference?.name,
                    })
                  }
                >
                  <RiDeleteBin6Line size={14} />
                  Delete
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePrefToggle(preference?.id)}
                  aria-label={expandedPrefs[preference?.id] ? "Collapse" : "Expand"}
                >
                  <TbChevronDown
                    size={18}
                    style={{
                      transform: expandedPrefs[preference?.id]
                        ? "rotate(180deg)"
                        : "none",
                      transition: "transform 0.2s",
                    }}
                  />
                </Button>
              </div>
            </DirectoryListRow>

            {expandedPrefs[preference?.id] ? (
              <div>
                {preference?.preferenceValues?.map((option) => (
                  <DirectoryListRow key={option.value}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <input type="checkbox" defaultChecked readOnly />
                      <span>{option?.value}</span>
                    </label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setPreferenceData((prev) => ({
                            ...prev,
                            name: preference.name,
                            subPreference: option?.value,
                            preferenceId: preference?.id,
                            subPreferenceId: option?.id,
                            type: "update",
                            parentPreferenceTypeId: "",
                            valueModal: true,
                            open: false,
                          }));
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        disabled={deletePrefValueLoading}
                        onClick={() =>
                          setDeleteTarget({
                            kind: "value",
                            id: option?.id,
                            name: option?.value,
                          })
                        }
                      >
                        Delete
                      </Button>
                    </div>
                  </DirectoryListRow>
                ))}
              </div>
            ) : null}
          </div>
        ))}
    </DirectoryFormCard>

      <Modal
        open={preferenceData.open || preferenceData.valueModal}
        title={modalTitle}
        onClose={closeModal}
        secondaryLabel="Cancel"
        primaryLabel={primaryModalLoading ? "Saving…" : primaryLabel}
        onPrimary={handlePrimary}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Name (Preference Name)" htmlFor="pref-name">
            <Input
              id="pref-name"
              name="name"
              placeholder="preference"
              disabled={preferenceData.valueModal}
              value={preferenceData?.name}
              onChange={(e) => {
                const name = e.target.value;
                const wash = isWashTypePreferenceName(name);
                setPreferenceData({
                  ...preferenceData,
                  name,
                  ...(wash ? { parentPreferenceTypeId: "" } : {}),
                });
              }}
            />
          </Field>

          {!preferenceData.valueModal ? (
            <Field
              label="Parent preference"
              hint={
                parentSelectDisabled
                  ? "Not applicable (Wash Type is top-level)"
                  : undefined
              }
            >
              <Select
                value={
                  parentSelectDisabled
                    ? ""
                    : preferenceData.parentPreferenceTypeId === "" ||
                        preferenceData.parentPreferenceTypeId == null
                      ? ""
                      : String(preferenceData.parentPreferenceTypeId)
                }
                onChange={(v) =>
                  setPreferenceData({
                    ...preferenceData,
                    parentPreferenceTypeId: v === "" ? "" : Number(v),
                  })
                }
                options={parentSelectOptions}
                placeholder="Select parent preference"
                disabled={parentSelectDisabled}
              />
            </Field>
          ) : null}

          {preferenceData.valueModal ? (
            <Field label="Name (Sub Preferences)" htmlFor="sub-pref-name">
              <Input
                id="sub-pref-name"
                name="subPreference"
                placeholder="…"
                value={preferenceData?.subPreference}
                onChange={(e) => {
                  setPreferenceData({
                    ...preferenceData,
                    subPreference: e.target.value,
                  });
                }}
              />
            </Field>
          ) : null}
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === "value"
            ? "Delete preference value"
            : "Delete preference"
        }
        description={
          deleteTarget?.name
            ? `Remove “${deleteTarget.name}”? This cannot be undone.`
            : "Remove this item? This cannot be undone."
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={
          deleteTarget?.kind === "value"
            ? deletePrefValueLoading
            : preferenceDeleteLoading
        }
      />
    </div>
  );
}
