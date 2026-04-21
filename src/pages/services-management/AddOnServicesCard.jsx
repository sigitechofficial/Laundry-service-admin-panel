import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Box, IconButton, List, ListItem, Typography } from "@mui/material";
import { RiDeleteBin6Line, TbPencil } from "../../shared/icons/index";
import { TbGripVertical } from "react-icons/tb";
import {
  useCreateAddOnServiceMutation,
  useDeleteAddOnServiceMutation,
  useGetAllAddOnServicesQuery,
  useUpdateAddOnServiceMutation,
} from "../../store/services/api";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import { MiniLoader } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";

const emptyForm = {
  open: false,
  id: "",
  name: "",
  price: "",
  type: "add",
};

/** £ prefix like product pricing (e.g. £2.5); trims unnecessary trailing zeros. */
function formatGbp(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return "£0";
  const fixed = n.toFixed(2);
  const trimmed = fixed.replace(/\.?0+$/, "");
  return `£${trimmed}`;
}

export default function AddOnServicesCard({ triggerAdd }) {
  const { success, error } = useToaster();
  const { data, isLoading, refetch } = useGetAllAddOnServicesQuery();
  const [createAddOnService, { isLoading: creating }] =
    useCreateAddOnServiceMutation();
  const [updateAddOnService, { isLoading: updating }] =
    useUpdateAddOnServiceMutation();
  const [deleteAddOnService, { isLoading: deleting }] =
    useDeleteAddOnServiceMutation();

  const [form, setForm] = useState(emptyForm);
  const [dragOrder, setDragOrder] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const addOnServices = useMemo(() => {
    const list = data?.data?.addOnServices || data?.data || [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const serviceList = dragOrder ?? addOnServices;

  useEffect(() => {
    setDragOrder(null);
  }, [addOnServices]);

  // Open only when the page header increments triggerAdd (same pattern as ServicesCard).
  // Do not depend on form.open — after close, triggerAdd is still > 0 and would reopen the modal.
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && !form.open) {
      setForm((prev) => ({ ...prev, open: true, type: "add" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAdd]);

  const closeModal = () => {
    setForm({ ...emptyForm });
  };

  /** Backend may return status "1" or only a data payload on success. */
  const isExplicitFailure = (res) =>
    res &&
    (res.status === "0" ||
      res.status === 0 ||
      res.success === false);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleEditClick = (item) => {
    setForm({
      open: true,
      id: item.id,
      name: item.name || "",
      price: item.price ?? "",
      type: "update",
    });
  };

  const handleSave = async () => {
    const trimmedName = String(form.name || "").trim();
    const price = Number(form.price);

    if (!trimmedName) {
      error("Add-on service name is required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      error("Enter a valid price.");
      return;
    }

    try {
      if (form.type === "update" && form.id) {
        const res = await updateAddOnService({
          addOnServiceId: form.id,
          body: { name: trimmedName, price },
        }).unwrap();
        if (!isExplicitFailure(res)) {
          success("Add-on service updated.");
          closeModal();
          void refetch();
          return;
        }
        error(res?.message || "Could not update add-on service.");
        return;
      }

      const res = await createAddOnService({
        name: trimmedName,
        price,
      }).unwrap();
      if (!isExplicitFailure(res)) {
        success("Add-on service created.");
        closeModal();
        void refetch();
        return;
      }
      error(res?.message || "Could not create add-on service.");
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await deleteAddOnService(id).unwrap();
      if (res?.status === "1") {
        success("Add-on service deleted.");
        void refetch();
      } else {
        error(res?.message || "Could not delete add-on service.");
      }
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const handleDragStart = useCallback((e, addOnServiceId) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(addOnServiceId));
  }, []);

  const handleDragOverItem = useCallback((e, addOnServiceId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(addOnServiceId);
  }, []);

  const handleDragLeaveItem = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDropOnItem = useCallback(
    (e, targetId) => {
      e.preventDefault();
      setDragOverId(null);
      const draggedId = e.dataTransfer.getData("text/plain");
      if (!draggedId || draggedId === String(targetId)) return;
      const base = dragOrder ?? addOnServices ?? [];
      if (!base.length) return;
      const ids = base.map((s) => String(s.id));
      const fromIdx = ids.indexOf(draggedId);
      const toIdx = ids.indexOf(String(targetId));
      if (fromIdx === -1 || toIdx === -1) return;
      const next = [...base];
      const [removed] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, removed);
      setDragOrder(next);
    },
    [dragOrder, addOnServices]
  );

  if (isLoading) return <MiniLoader />;

  return (
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
            Add-on Services
          </Typography>
          <Typography
            variant="caption"
            sx={{ display: "block", color: "#64748B", mt: 0.5 }}
          >
            Drag and drop to visually reorder add-on services.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ p: "12px" }}>
        <List sx={{ p: "0 8px" }}>
          {serviceList.map((item) => (
            <ListItem
              key={item.id}
              onDragOver={(e) => handleDragOverItem(e, item.id)}
              onDragLeave={handleDragLeaveItem}
              onDrop={(e) => handleDropOnItem(e, item.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                py: "8px",
                px: "16px",
                my: "8px",
                bgcolor:
                  dragOverId === item.id ? "rgba(21, 112, 239, 0.12)" : "blue.10",
                borderRadius: "4px",
                border:
                  dragOverId === item.id
                    ? "1px dashed #1570EF"
                    : "1px solid transparent",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}
              >
                <Box
                  component="span"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    cursor: "grab",
                    color: "#94A3B8",
                    flexShrink: 0,
                    "&:active": { cursor: "grabbing" },
                  }}
                  aria-label="Drag to reorder add-on service"
                >
                  <TbGripVertical size={20} />
                </Box>
                <Typography variant="body1" noWrap sx={{ flex: 1 }}>
                  {item.name}
                </Typography>
              </Box>

              <Box className="flex items-center gap-3">
                <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600 }}>
                  {formatGbp(item.price)}
                </Typography>
                <IconButton
                  disabled={updating}
                  onClick={() => handleEditClick(item)}
                  size="small"
                >
                  <TbPencil size="20px" />
                </IconButton>

                <IconButton
                  disabled={deleting}
                  onClick={() => handleDelete(item.id)}
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

      <ModalComponent
        open={form.open}
        title={form.type === "update" ? "Update Add-on Service" : "Add Add-on Service"}
        onClose={closeModal}
        secondaryAction={{ label: "Cancel", onClick: closeModal }}
        primaryAction={{
          label:
            form.type === "update" ? "Update Add-on Service" : "Add Add-on Service",
          onClick: handleSave,
          isLoading: creating || updating,
        }}
      >
        <Box className="flex flex-col gap-5">
          <InputFieldModal
            title="Add-on Name"
            label="Name"
            placeholder="e.g. Starch"
            name="name"
            value={form.name}
            onChange={handleChange}
          />
          <InputFieldModal
            title="Price (£)"
            label="Price (£)"
            placeholder="e.g. 2.5"
            name="price"
            type="number"
            value={form.price}
            onChange={handleChange}
          />
        </Box>
      </ModalComponent>
    </Box>
  );
}
