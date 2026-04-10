import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Collapse,
  Switch,
  FormControlLabel,
} from "@mui/material";
import { RiDeleteBin6Line, TbPencil } from "../../shared/icons/index";
import { TbGripVertical } from "react-icons/tb";
import {
  useAddServiceMutation,
  useDeleteServiceMutation,
  useEditServiceMutation,
  useGetAllServicesQuery,
  useUpdateServicesSortOrderMutation,
} from "../../store/services/api";
import { useDispatch } from "react-redux";
import { setServices } from "../../store/services/apiReducer";
import { Delay, MiniLoader } from "../../components/shared/Loaders";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import TextareaField from "../../components/ui/TextArea";
import ImageUpload from "../../components/ui/ImageUpload";
import { useSelector } from "react-redux";
import useToaster from "../../components/ui/Toaster";
import { BASE_URL } from "../../utilities/URL";

export default function ServicesCard({ triggerAdd }) {
  const { success, error } = useToaster();
  const dispatch = useDispatch();
  const services = useSelector((state) => state?.apiData?.services);
  const { isLoading, refetch } = useGetAllServicesQuery();
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
  };

  const [add, setAdd] = useState(emptyForm);

  const [addService, { isLoading: addServiceLoading }] =
    useAddServiceMutation();

  const [editService, { isLoading: editServiceLoading }] =
    useEditServiceMutation();

  // Handle form data population for update modal
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
          image: BASE_URL + serviceToEdit.image || "",
          turnaroundTime:
            serviceToEdit.timeRequired ??
            serviceToEdit.turnaroundTime ??
            "",
          pricedByWeight: hasPricing,
          basePrice: serviceToEdit.basePrice ?? "",
          baseWeightKg: serviceToEdit.baseWeightKg ?? "",
          additionalPricePerKg: serviceToEdit.additionalPricePerKg ?? "",
        }));
      }
    }
  }, [add.type, add.id, services]);

  // Handle external trigger to open add modal
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
      } catch {
        setDragOrder(null);
        error("Could not save order. Please try again.");
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
      turnaroundTime: service.timeRequired ?? service.turnaroundTime ?? "",
      pricedByWeight: hasPricing,
      basePrice: service.basePrice ?? "",
      baseWeightKg: service.baseWeightKg ?? "",
      additionalPricePerKg: service.additionalPricePerKg ?? "",
    });
  };

  const handleChange = (e) => {
    setAdd((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddService = async () => {
    if (!add.name.trim()) { error("Service name is required."); return; }
    if (add.pricedByWeight) {
      if (!add.basePrice || isNaN(Number(add.basePrice))) { error("Enter a valid base price."); return; }
      if (!add.baseWeightKg || isNaN(Number(add.baseWeightKg))) { error("Enter a valid base weight (kg)."); return; }
    }

    const formData = new FormData();
    formData.append("name", add.name);
    formData.append("description", add.description);
    formData.append("serviceImg", add.image);
    formData.append("pricingBasis", add.pricedByWeight ? "weight" : "item");
    if (add.turnaroundTime) {
      formData.append("timeRequired", add.turnaroundTime);
    }
    if (add.pricedByWeight) {
      formData.append("basePrice", add.basePrice);
      formData.append("baseWeightKg", add.baseWeightKg);
    }

    let res = await addService(formData).unwrap();
    if (res?.status === "1") {
      handleToggle();
    } else {
      error("Something went wrong");
    }
  };

  const handleEditService = async () => {
    try {
      if (!add.name.trim()) { error("Service name is required."); return; }
      if (add.pricedByWeight) {
        if (!add.basePrice || isNaN(Number(add.basePrice))) { error("Enter a valid base price."); return; }
        if (!add.baseWeightKg || isNaN(Number(add.baseWeightKg))) { error("Enter a valid base weight (kg)."); return; }
      }

      const formData = new FormData();
      formData.append("name", add.name);
      formData.append("description", add.description);
      formData.append("pricingBasis", add.pricedByWeight ? "weight" : "item");
      if (add.image && typeof add.image !== "string") {
        formData.append("serviceImg", add.image);
      }
      if (add.turnaroundTime) {
        formData.append("timeRequired", add.turnaroundTime);
      }
      if (add.pricedByWeight) {
        formData.append("basePrice", add.basePrice);
        formData.append("baseWeightKg", add.baseWeightKg);
      }

      let res = await editService({ id: add.id, body: formData }).unwrap();
      if (res?.status === "1") {
        handleToggle();
        success("Service updated successfully!");
      } else {
        error("Something went wrong");
      }
    } catch (err) {
      console.error("Error updating service:", err);
      error("Failed to update service");
    }
  };

  const handleDelete = async (id) => {
    let res = await deletService(id).unwrap();

    if (res.status === "1") {
      success("Service deleted successfully");
    }
  };

  return isLoading ? (
    <MiniLoader />
  ) : (
    <Box
      className="w-full"
      sx={{
        bgcolor: "white",
        borderRadius: "12px",
        border: "1px solid #E4E7EC",
        overflow: "hidden",
        fontFamily: "Inter",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          p: "16px 20px",
          borderBottom: "1px solid #E4E7EC",
          bgcolor: "blue.10",
        }}
      >
        <Box>
          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
              fontSize: "18px",
              color: "#101828",
              fontFamily: "Inter, sans-serif",
            }}
          >
            Services
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", color: "#64748B", mt: 0.5 }}
          >
            Drag using the handle to set the order shown to customers.
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      <Collapse in={true}>
        <Box sx={{ p: "12px" }}>
          <List sx={{ p: "0 8px" }}>
            {serviceList.map((service) => (
              <ListItem
                key={service.id}
                onDragOver={(e) => handleDragOverItem(e, service.id)}
                onDragLeave={handleDragLeaveItem}
                onDrop={(e) => handleDropOnItem(e, service.id)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  py: "8px",
                  px: "16px",
                  my: "8px",
                  bgcolor:
                    dragOverId === service.id ? "rgba(21, 112, 239, 0.12)" : "blue.10",
                  borderRadius: "4px",
                  border:
                    dragOverId === service.id
                      ? "1px dashed #1570EF"
                      : "1px solid transparent",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                  <Box
                    component="span"
                    draggable={!reorderLoading}
                    onDragStart={(e) => handleDragStart(e, service.id)}
                    onClick={(e) => e.stopPropagation()}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      cursor: reorderLoading ? "not-allowed" : "grab",
                      color: "#94A3B8",
                      flexShrink: 0,
                      "&:active": { cursor: "grabbing" },
                    }}
                    aria-label="Drag to reorder service"
                  >
                    <TbGripVertical size={20} />
                  </Box>
                  <Typography variant="body1" noWrap sx={{ flex: 1 }}>
                    {service.name}
                  </Typography>
                </Box>

                <Box className="flex items-center">
                  <IconButton
                    disabled={editServiceLoading || reorderLoading}
                    onClick={() => handleUpdateClick(service)}
                    size="small"
                  >
                    <TbPencil size="20px" />
                  </IconButton>

                  <IconButton
                    disabled={deleteLoading || reorderLoading}
                    onClick={() => handleDelete(service.id)}
                    size="small"
                    sx={{
                      color: "#EF4444",
                      "&:hover": {
                        bgcolor: "#FEF2F2",
                      },
                    }}
                  >
                    <RiDeleteBin6Line size="16px" />
                  </IconButton>
                </Box>
              </ListItem>
            ))}
          </List>
        </Box>
      </Collapse>

      <ModalComponent
        open={add.open}
        title={add.type === "update" ? "Update Service" : "ADD SERVICE"}
        onClose={handleToggle}
        secondaryAction={{ label: "Cancel", onClick: handleToggle }}
        primaryAction={{
          label: add.type === "update" ? "Update Service" : "Add Service",
          onClick: add.type === "update" ? handleEditService : handleAddService,
          isLoading: addServiceLoading || editServiceLoading,
        }}
      >
        <Box className="flex flex-col gap-5">
          <ImageUpload
            title="Service Image"
            value={add.image}
            onChange={(value) =>
              setAdd((prev) => ({ ...prev, image: value }))
            }
          />

          <InputFieldModal
            title="Service (Service name)"
            label="Service Name"
            placeholder="Service name"
            name="name"
            value={add.name}
            onChange={handleChange}
          />

          {/* Turnaround time */}
          <InputFieldModal
            title="Turnaround Time (Days)"
            placeholder="e.g. 2-3 days"
            name="turnaroundTime"
            value={add.turnaroundTime}
            onChange={handleChange}
          />

          {/* Weight-based pricing toggle */}
          <Box>
            <FormControlLabel
              control={
                <Switch
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
                  color="primary"
                />
              }
              label={
                <Typography variant="body2" sx={{ color: "#374151", fontWeight: 500 }}>
                  Priced by weight (e.g. £18.85 / 6 kg)
                </Typography>
              }
            />
          </Box>

          {/* Weight-pricing detail fields */}
          {add.pricedByWeight && (
            <Box className="flex flex-col gap-5 px-5 py-4 rounded-xl border-0">
              <Typography variant="body2" sx={{ color: "#6B7280", fontWeight: 600, fontSize: "13px" }}>
                Weight Pricing Details
              </Typography>

              <Box className="flex gap-4">
                <Box className="flex-1">
                  <InputFieldModal
                    title="Base Price (£)"
                    placeholder="e.g. 18.85"
                    name="basePrice"
                    type="number"
                    value={add.basePrice}
                    onChange={handleChange}
                  />
                </Box>
                <Box className="flex-1">
                  <InputFieldModal
                    title="Base Weight (kg)"
                    placeholder="e.g. 6"
                    name="baseWeightKg"
                    type="number"
                    value={add.baseWeightKg}
                    onChange={handleChange}
                  />
                </Box>
              </Box>

              {/* Live preview */}
              {add.basePrice && add.baseWeightKg && (
                <Box className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg border border-[#D1D5DB]">
                  <Typography variant="body2" sx={{ color: "#374151" }}>
                    Preview:
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#1D4ED8", fontWeight: 600 }}>
                    £{Number(add.basePrice).toFixed(2)} / {add.baseWeightKg} kg
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          <TextareaField
            title="Description"
            name="description"
            value={add.description}
            onChange={handleChange}
          />
        </Box>
      </ModalComponent>
    </Box>
  );
}
