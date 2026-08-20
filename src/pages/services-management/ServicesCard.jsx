import { useState, useEffect, useCallback, useRef } from "react";
import { TbGripVertical } from "react-icons/tb";
import {
  useAddServiceMutation,
  useDeleteServiceMutation,
  useEditServiceMutation,
  useGetAllServicesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useUpdateServicesSortOrderMutation,
} from "../../store/services/api";
import { useDispatch, useSelector } from "react-redux";
import { setServices } from "../../store/services/apiReducer";
import { Button, Field, Input, Textarea, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { formatAmount, joinMediaUrl } from "../../utilities/formatters";
import {
  IMAGE_UPLOAD_ACCEPT,
  acceptImageFile,
} from "../../utilities/imageUploadPolicy";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { EmptyHint, QueryState } from "./QueryState";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryListRow,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";

function ImageField({ label, value, onChange }) {
  const { error: toastError } = useToaster();
  const fileInputRef = useRef(null);
  const src =
    !value ? "" : typeof value === "string" ? value : URL.createObjectURL(value);

  return (
    <Field label={label} hint="JPEG, PNG, GIF, or WebP. Max 5MB.">
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        style={{
          width: "100%",
          cursor: "pointer",
          borderRadius: "var(--r-md)",
          background: "var(--canvas)",
          border: "1px dashed var(--line-2)",
          padding: 16,
          textAlign: "center",
          color: "var(--muted)",
          font: "inherit",
        }}
      >
        {src ? (
          <img
            src={src}
            alt="Service preview"
            style={{
              maxHeight: 150,
              maxWidth: "100%",
              borderRadius: "var(--r-sm)",
              objectFit: "cover",
              display: "block",
              margin: "0 auto",
            }}
          />
        ) : (
          "Upload image"
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept={IMAGE_UPLOAD_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          const accepted = acceptImageFile(file, toastError);
          if (accepted) onChange(accepted);
        }}
      />
      {value ? (
        <div style={{ marginTop: 8, textAlign: "center" }}>
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        </div>
      ) : null}
    </Field>
  );
}

export default function ServicesCard({ triggerAdd }) {
  const { success, error } = useToaster();
  const dispatch = useDispatch();
  const services = useSelector((state) => state?.apiData?.services);
  const { isLoading, isError, error: servicesQueryError, refetch } = useGetAllServicesQuery();
  const { data: categoriesResponse } = useGetCategoriesQuery();
  const { data: subCategoriesResponse } = useGetSubCategoriesQuery();
  const allCategories = Array.isArray(categoriesResponse?.data)
    ? categoriesResponse.data
    : [];
  const allSubCategories = Array.isArray(subCategoriesResponse?.data)
    ? subCategoriesResponse.data
    : [];
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [updateServicesSortOrder, { isLoading: reorderLoading }] =
    useUpdateServicesSortOrderMutation();
  const [dragOrder, setDragOrder] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [deletService, { isLoading: deleteLoading }] =
    useDeleteServiceMutation();
  const emptyForm = {
    image: "",
    name: "",
    description: "",
    open: false,
    type: "",
    servicesId: "",
    id: "",
    turnaroundTime: "",
    pricedByWeight: false,
    basePrice: "",
    baseWeightKg: "",
    additionalPricePerKg: "",
    numberOfBags: false,
    numberOfItems: false,
    washBleedDisclaimerEnabled: false,
  };

  const [add, setAdd] = useState(emptyForm);

  const [addService, { isLoading: addServiceLoading }] =
    useAddServiceMutation();

  const [editService, { isLoading: editServiceLoading }] =
    useEditServiceMutation();

  const formatTurnaroundTime = (value) => {
    if (value == null || value === "") return "";
    return String(value);
  };

  const handleTurnaroundChange = (e) => {
    const digitsOnly = e.target.value.replace(/\D/g, "");
    setAdd((prev) => ({ ...prev, turnaroundTime: digitsOnly }));
  };

  const appendTimeRequired = (formData) => {
    formData.append("timeRequired", String(add.turnaroundTime ?? ""));
  };

  const parseServiceFlag = (value) =>
    value === true || value === "true" || value === 1 || value === "1";

  const appendQuantityOptions = (formData) => {
    formData.append("numberOfBags", String(Boolean(add.numberOfBags)));
    formData.append("numberOfItems", String(Boolean(add.numberOfItems)));
    formData.append(
      "washBleedDisclaimerEnabled",
      String(Boolean(add.washBleedDisclaimerEnabled))
    );
  };

  useEffect(() => {
    if (add.type === "update" && add.id) {
      const serviceToEdit = services?.find((service) => service.id === add.id);
      if (serviceToEdit) {
        const pricedByWeightApi =
          serviceToEdit.pricingBasis === "weight" ||
          serviceToEdit.pricingBasis === "WEIGHT";
        const hasPricing =
          pricedByWeightApi ||
          serviceToEdit.basePrice != null ||
          serviceToEdit.baseWeightKg != null ||
          serviceToEdit.additionalPricePerKg != null;
        setAdd((prev) => ({
          ...prev,
          name: serviceToEdit.name || "",
          description: serviceToEdit.description || "",
          image: joinMediaUrl(serviceToEdit.image),
          turnaroundTime: formatTurnaroundTime(
            serviceToEdit.timeRequired ?? serviceToEdit.turnaroundTime
          ),
          pricedByWeight: hasPricing,
          basePrice: serviceToEdit.basePrice ?? "",
          baseWeightKg: serviceToEdit.baseWeightKg ?? "",
          additionalPricePerKg: serviceToEdit.additionalPricePerKg ?? "",
          numberOfBags: parseServiceFlag(serviceToEdit.numberOfBags),
          numberOfItems: parseServiceFlag(serviceToEdit.numberOfItems),
          washBleedDisclaimerEnabled: parseServiceFlag(
            serviceToEdit.washBleedDisclaimerEnabled
          ),
        }));
      }
    }
  }, [add.type, add.id, services]);

  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && !add.open) {
      setAdd((prev) => ({ ...prev, open: true, type: "add" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAdd]);

  useEffect(() => {
    setDragOrder(null);
  }, [services]);

  useEffect(() => {
    const clearDragOver = () => setDragOverId(null);
    window.addEventListener("dragend", clearDragOver);
    return () => window.removeEventListener("dragend", clearDragOver);
  }, []);

  const serviceList = dragOrder ?? services ?? [];

  const handleDragStart = useCallback((e, serviceId) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(serviceId));
  }, []);

  const handleDragOverItem = useCallback((e, serviceId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(serviceId);
  }, []);

  const handleDragLeaveItem = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDropOnItem = useCallback(
    async (e, targetId) => {
      e.preventDefault();
      setDragOverId(null);
      const draggedId = e.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === String(targetId)) return;
      const base = dragOrder ?? services ?? [];
      if (!base.length) return;
      const ids = base.map((s) => String(s.id));
      const fromIdx = ids.indexOf(draggedId);
      const toIdx = ids.indexOf(String(targetId));
      if (fromIdx === -1 || toIdx === -1) return;
      const next = [...base];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      setDragOrder(next);
      try {
        await updateServicesSortOrder({
          services: next.map((s, i) => ({
            serviceId: Number(s.id),
            sortOrder: i + 1,
          })),
        }).unwrap();
        dispatch(setServices(next));
        setDragOrder(null);
        success("Service order updated.");
        void refetch();
      } catch (err) {
        setDragOrder(null);
        error(getApiErrorMessage(err, "Could not save order. Please try again."));
      }
    },
    [
      dragOrder,
      services,
      dispatch,
      error,
      refetch,
      updateServicesSortOrder,
      success,
    ]
  );

  const handleToggle = () => {
    if (add.open) {
      setAdd(emptyForm);
    } else {
      setAdd((prev) => ({ ...prev, open: true, type: "add" }));
    }
  };

  const handleUpdateClick = (service) => {
    const pricedByWeightApi =
      service.pricingBasis === "weight" || service.pricingBasis === "WEIGHT";
    const hasPricing =
      pricedByWeightApi ||
      service.basePrice != null ||
      service.baseWeightKg != null ||
      service.additionalPricePerKg != null;
    setAdd({
      open: true,
      type: "update",
      id: service.id,
      name: service.name || "",
      description: service.description || "",
      image: service.serviceImg || "",
      servicesId: service.id,
      turnaroundTime: formatTurnaroundTime(
        service.timeRequired ?? service.turnaroundTime
      ),
      pricedByWeight: hasPricing,
      basePrice: service.basePrice ?? "",
      baseWeightKg: service.baseWeightKg ?? "",
      additionalPricePerKg: service.additionalPricePerKg ?? "",
      numberOfBags: parseServiceFlag(service.numberOfBags),
      numberOfItems: parseServiceFlag(service.numberOfItems),
      washBleedDisclaimerEnabled: parseServiceFlag(
        service.washBleedDisclaimerEnabled
      ),
    });
  };

  const handleChange = (e) => {
    setAdd((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddService = async () => {
    if (!add.name.trim()) {
      error("Service name is required.");
      return;
    }
    if (add.pricedByWeight) {
      if (!add.basePrice || isNaN(Number(add.basePrice))) {
        error("Enter a valid base price.");
        return;
      }
      if (!add.baseWeightKg || isNaN(Number(add.baseWeightKg))) {
        error("Enter a valid base weight (kg).");
        return;
      }
    }

    const formData = new FormData();
    formData.append("name", add.name);
    formData.append("description", add.description);
    formData.append("serviceImg", add.image);
    formData.append("pricingBasis", add.pricedByWeight ? "weight" : "item");
    appendTimeRequired(formData);
    appendQuantityOptions(formData);
    if (add.pricedByWeight) {
      formData.append("basePrice", add.basePrice);
      formData.append("baseWeightKg", add.baseWeightKg);
    }

    try {
      let res = await addService(formData).unwrap();
      if (res?.status === "1") {
        handleToggle();
        void refetch();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Failed to add service"));
    }
  };

  const handleEditService = async () => {
    try {
      if (!add.name.trim()) {
        error("Service name is required.");
        return;
      }
      if (add.pricedByWeight) {
        if (!add.basePrice || isNaN(Number(add.basePrice))) {
          error("Enter a valid base price.");
          return;
        }
        if (!add.baseWeightKg || isNaN(Number(add.baseWeightKg))) {
          error("Enter a valid base weight (kg).");
          return;
        }
      }

      const formData = new FormData();
      formData.append("name", add.name);
      formData.append("description", add.description);
      formData.append("pricingBasis", add.pricedByWeight ? "weight" : "item");
      if (add.image instanceof File) {
        formData.append("serviceImg", add.image);
      } else if (add.image === null) {
        formData.append("deleteImage", "true");
      }
      appendTimeRequired(formData);
      appendQuantityOptions(formData);
      if (add.pricedByWeight) {
        formData.append("basePrice", add.basePrice);
        formData.append("baseWeightKg", add.baseWeightKg);
      }

      let res = await editService({ id: add.id, body: formData }).unwrap();
      if (res?.status === "1") {
        handleToggle();
        success("Service updated successfully!");
        void refetch();
      } else {
        error("Something went wrong");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Failed to update service"));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    try {
      const res = await deletService(deleteTarget.id).unwrap();
      if (res.status === "1") {
        success("Service deleted successfully");
        setDeleteTarget(null);
        void refetch();
      } else {
        error(res?.message || "Could not delete service.");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Could not delete service."));
    }
  };

  const saving = addServiceLoading || editServiceLoading;
  const totalServices = services?.length ?? 0;
  const weightPriced = (services || []).filter(
    (service) =>
      service.pricingBasis === "weight" || service.pricingBasis === "WEIGHT"
  ).length;

  if (isLoading || isError) {
    return (
      <QueryState
        loading={isLoading}
        error={servicesQueryError || isError}
        onRetry={refetch}
        errorLabel="Could not load services. Please try again."
      />
    );
  }

  return (
    <div>
      <DirectoryMetrics
        items={[
          { label: "Total services", value: totalServices, tone: "brand" },
          { label: "Priced by weight", value: weightPriced, tone: "navy" },
          {
            label: "Priced by item",
            value: Math.max(0, totalServices - weightPriced),
            tone: "success",
          },
        ]}
      />
    <DirectoryTableWrap>
        {serviceList.length === 0 ? (
          <EmptyHint>No services yet. Use Add Service to create the first catalog item.</EmptyHint>
        ) : (
        serviceList.map((service) => {
          const categoryCount = allCategories.filter(
            (category) =>
              String(category.serviceId ?? category.service?.id) ===
              String(service.id)
          ).length;
          const categoryIds = new Set(
            allCategories
              .filter(
                (category) =>
                  String(category.serviceId ?? category.service?.id) ===
                  String(service.id)
              )
              .map((category) => String(category.id))
          );
          const itemCount = allSubCategories.filter((item) =>
            categoryIds.has(String(item.categoryId))
          ).length;
          const pricedByWeight =
            service.pricingBasis === "weight" || service.pricingBasis === "WEIGHT";
          return (
          <DirectoryListRow
            key={service.id}
            active={dragOverId === service.id}
            onDragOver={(e) => handleDragOverItem(e, service.id)}
            onDragLeave={handleDragLeaveItem}
            onDrop={(e) => handleDropOnItem(e, service.id)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <span
                draggable={!reorderLoading}
                onDragStart={(e) => handleDragStart(e, service.id)}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: reorderLoading ? "not-allowed" : "grab",
                  color: "#8a94a2",
                  flexShrink: 0,
                }}
                aria-label="Drag to reorder service"
              >
                <TbGripVertical size={20} />
              </span>
              <DirectoryIdentity
                name={service.name}
                meta={`${categoryCount} ${categoryCount === 1 ? "category" : "categories"} · ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
              />
              <DirectoryDotPill tone={pricedByWeight ? "info" : "neutral"}>
                {pricedByWeight ? "By weight" : "By item"}
              </DirectoryDotPill>
              {pricedByWeight && service.basePrice != null ? (
                <DirectoryMoney>{formatAmount(service.basePrice, null, { applyDefault: true })}</DirectoryMoney>
              ) : null}
            </div>

            <DirectoryActions>
              <DirectoryActionEdit
                disabled={editServiceLoading || reorderLoading}
                onClick={() => handleUpdateClick(service)}
              />
              <DirectoryActionDelete
                disabled={deleteLoading || reorderLoading}
                onClick={() =>
                  setDeleteTarget({ id: service.id, name: service.name })
                }
              />
            </DirectoryActions>
          </DirectoryListRow>
          );
        })
        )}
    </DirectoryTableWrap>

      <Modal
        open={add.open}
        title={add.type === "update" ? "Update Service" : "Add Service"}
        onClose={handleToggle}
        secondaryLabel="Cancel"
        primaryLabel={
          saving
            ? add.type === "update"
              ? "Updating…"
              : "Adding…"
            : add.type === "update"
              ? "Update Service"
              : "Add Service"
        }
        onPrimary={() => {
          if (saving) return;
          if (add.type === "update") handleEditService();
          else handleAddService();
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ImageField
            label="Service Image"
            value={add.image}
            onChange={(value) => setAdd((prev) => ({ ...prev, image: value }))}
          />

          <Field label="Service Name" htmlFor="service-name">
            <Input
              id="service-name"
              name="name"
              placeholder="Service name"
              value={add.name}
              onChange={handleChange}
            />
          </Field>

          <Field label="Turnaround Time (Days)" htmlFor="turnaround-time">
            <Input
              id="turnaround-time"
              name="turnaroundTime"
              placeholder="e.g. 2"
              inputMode="numeric"
              pattern="[0-9]*"
              value={add.turnaroundTime}
              onChange={handleTurnaroundChange}
            />
          </Field>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={add.pricedByWeight}
              onChange={(e) =>
                setAdd((prev) => ({
                  ...prev,
                  pricedByWeight: e.target.checked,
                  basePrice: "",
                  baseWeightKg: "",
                  additionalPricePerKg: "",
                }))
              }
            />
            Priced by weight (e.g. 18.85 / 6 kg in zone currency)
          </label>

          {add.pricedByWeight ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                padding: 16,
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
                background: "var(--canvas)",
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--muted)" }}>
                Weight Pricing Details
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <Field label="Base Price" htmlFor="base-price">
                  <Input
                    id="base-price"
                    name="basePrice"
                    type="number"
                    placeholder="e.g. 18.85"
                    value={add.basePrice}
                    onChange={handleChange}
                  />
                </Field>
                <Field label="Base Weight (kg)" htmlFor="base-weight">
                  <Input
                    id="base-weight"
                    name="baseWeightKg"
                    type="number"
                    placeholder="e.g. 6"
                    value={add.baseWeightKg}
                    onChange={handleChange}
                  />
                </Field>
              </div>
              {add.basePrice && add.baseWeightKg ? (
                <div style={{ color: "var(--ink-2)", fontSize: 14 }}>
                  Preview:{" "}
                  <strong>
                    {formatAmount(add.basePrice, null, { applyDefault: true })} / {add.baseWeightKg} kg
                  </strong>
                </div>
              ) : null}
            </div>
          ) : null}

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={add.numberOfBags}
                onChange={(e) =>
                  setAdd((prev) => ({ ...prev, numberOfBags: e.target.checked }))
                }
              />
              Number of bags
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={add.numberOfItems}
                onChange={(e) =>
                  setAdd((prev) => ({ ...prev, numberOfItems: e.target.checked }))
                }
              />
              Number of items
            </label>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                checked={add.washBleedDisclaimerEnabled}
                onChange={(e) =>
                  setAdd((prev) => ({
                    ...prev,
                    washBleedDisclaimerEnabled: e.target.checked,
                  }))
                }
              />
              Mixed wash colour-bleed disclaimer
            </label>
          </div>

          <Field label="Description" htmlFor="service-description">
            <Textarea
              id="service-description"
              name="description"
              value={add.description}
              onChange={handleChange}
            />
          </Field>
        </div>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title="Delete service"
        description={
          deleteTarget?.name
            ? `Remove “${deleteTarget.name}” from the catalog? This cannot be undone.`
            : "Remove this service from the catalog?"
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  );
}
