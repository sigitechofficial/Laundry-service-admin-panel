import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Collapse,
  IconButton,
  List,
  ListItem,
  Typography,
} from "@mui/material";
import {
  RiDeleteBin6Line,
  TbChevronDown,
  TbPencil,
} from "../../shared/icons/index";
import {
  useCreateAddOnServiceMutation,
  useDeleteAddOnServiceMutation,
  useGetAllAddOnServicesQuery,
  useUpdateAddOnServiceMutation,
  useGetAllAddOnCategoriesQuery,
  useUpdateAddOnCategoryMutation,
  useDeleteAddOnCategoryMutation,
} from "../../store/services/api";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import SelectField from "../../components/ui/SelectField";
import { MiniLoader } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import { formatGbp } from "../../utils/formatGbp";

const emptyServiceForm = {
  open: false,
  id: "",
  name: "",
  price: "",
  addOnCategoryId: "",
  type: "add",
};

const emptyCategoryForm = {
  open: false,
  id: "",
  name: "",
};

const UNCATEGORIZED_KEY = "uncategorized";

const isExplicitFailure = (res) =>
  res && (res.status === "0" || res.status === 0 || res.success === false);

export default function AddOnServicesCard({ triggerAdd }) {
  const { success, error } = useToaster();
  const { data, isLoading, refetch } = useGetAllAddOnServicesQuery();
  const { data: categoriesData, refetch: refetchCategories } =
    useGetAllAddOnCategoriesQuery({ includeServices: false });

  const [createAddOnService, { isLoading: creating }] =
    useCreateAddOnServiceMutation();
  const [updateAddOnService, { isLoading: updating }] =
    useUpdateAddOnServiceMutation();
  const [deleteAddOnService, { isLoading: deleting }] =
    useDeleteAddOnServiceMutation();
  const [updateCategory, { isLoading: categoryUpdating }] =
    useUpdateAddOnCategoryMutation();
  const [deleteCategory, { isLoading: categoryDeleting }] =
    useDeleteAddOnCategoryMutation();

  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [expanded, setExpanded] = useState({});

  const addOnServices = useMemo(() => {
    const list = data?.data?.addOnServices || data?.data || [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const categories = useMemo(() => {
    const list =
      categoriesData?.data?.addOnCategories || categoriesData?.data || [];
    return Array.isArray(list) ? list : [];
  }, [categoriesData]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: String(c.id), label: c.name })),
    [categories]
  );

  // Build accordion groups: every category (even empty) + uncategorized bucket.
  const groups = useMemo(() => {
    const byId = new Map();
    categories.forEach((c) =>
      byId.set(String(c.id), { id: String(c.id), name: c.name, items: [] })
    );
    const uncategorized = {
      id: UNCATEGORIZED_KEY,
      name: "Uncategorized",
      items: [],
    };

    addOnServices.forEach((svc) => {
      const catId =
        svc.addOnCategoryId != null ? String(svc.addOnCategoryId) : null;
      if (catId && byId.has(catId)) byId.get(catId).items.push(svc);
      else uncategorized.items.push(svc);
    });

    const ordered = [...byId.values()];
    if (uncategorized.items.length > 0) ordered.push(uncategorized);
    return ordered;
  }, [addOnServices, categories]);

  // Header "Add Add-on" button trigger -> open blank add-on form.
  useEffect(() => {
    if (triggerAdd && triggerAdd > 0 && !serviceForm.open) {
      setServiceForm({ ...emptyServiceForm, open: true, type: "add" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triggerAdd]);

  const toggleExpand = (id) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const closeServiceModal = () => setServiceForm({ ...emptyServiceForm });
  const closeCategoryModal = () => setCategoryForm({ ...emptyCategoryForm });

  const handleServiceChange = (e) =>
    setServiceForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const openAddServiceForCategory = (categoryId) =>
    setServiceForm({
      ...emptyServiceForm,
      open: true,
      type: "add",
      addOnCategoryId: categoryId ? String(categoryId) : "",
    });

  const openEditService = (item) =>
    setServiceForm({
      open: true,
      id: item.id,
      name: item.name || "",
      price: item.price ?? "",
      addOnCategoryId:
        item.addOnCategoryId != null ? String(item.addOnCategoryId) : "",
      type: "update",
    });

  const handleServiceSave = async () => {
    const trimmedName = String(serviceForm.name || "").trim();
    const price = Number(serviceForm.price);

    if (!trimmedName) {
      error("Add-on service name is required.");
      return;
    }
    if (Number.isNaN(price) || price < 0) {
      error("Enter a valid price.");
      return;
    }

    const addOnCategoryId =
      serviceForm.addOnCategoryId === ""
        ? null
        : Number(serviceForm.addOnCategoryId);

    try {
      if (serviceForm.type === "update" && serviceForm.id) {
        const res = await updateAddOnService({
          addOnServiceId: serviceForm.id,
          body: { name: trimmedName, price, addOnCategoryId },
        }).unwrap();
        if (!isExplicitFailure(res)) {
          success("Add-on service updated.");
          closeServiceModal();
          void refetch();
          return;
        }
        error(res?.message || "Could not update add-on service.");
        return;
      }

      const res = await createAddOnService({
        name: trimmedName,
        price,
        addOnCategoryId,
      }).unwrap();
      if (!isExplicitFailure(res)) {
        success("Add-on service created.");
        closeServiceModal();
        void refetch();
        return;
      }
      error(res?.message || "Could not create add-on service.");
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const handleServiceDelete = async (id) => {
    try {
      const res = await deleteAddOnService(id).unwrap();
      if (res?.status === "1" || !isExplicitFailure(res)) {
        success("Add-on service deleted.");
        void refetch();
      } else {
        error(res?.message || "Could not delete add-on service.");
      }
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const handleCategorySave = async () => {
    const trimmed = String(categoryForm.name || "").trim();
    if (!trimmed) {
      error("Category name is required.");
      return;
    }
    try {
      const res = await updateCategory({
        addOnCategoryId: categoryForm.id,
        body: { name: trimmed },
      }).unwrap();
      if (!isExplicitFailure(res)) {
        success("Category updated.");
        closeCategoryModal();
        void refetchCategories();
      } else {
        error(res?.message || "Could not update category.");
      }
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const handleCategoryDelete = async (id) => {
    try {
      const res = await deleteCategory(id).unwrap();
      if (!isExplicitFailure(res)) {
        success("Category deleted.");
        void refetchCategories();
        void refetch();
      } else {
        error(res?.message || "Could not delete category.");
      }
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const renderServiceRow = (item) => (
    <Box
      key={item.id}
      className="flex items-center justify-between py-2 px-3 mb-2!"
      sx={{ borderBottom: "1px solid #E4E7EC" }}
    >
      <Typography variant="body2" fontFamily="Inter">
        {item.name}
      </Typography>
      <Box className="flex items-center gap-3">
        <Typography variant="body2" sx={{ color: "#334155", fontWeight: 600 }}>
          {formatGbp(item.price)}
        </Typography>
        <IconButton
          disabled={updating}
          onClick={() => openEditService(item)}
          size="small"
          sx={{ color: "#00028B" }}
        >
          <TbPencil size="18px" />
        </IconButton>
        <IconButton
          disabled={deleting}
          onClick={() => handleServiceDelete(item.id)}
          size="small"
          sx={{ color: "#EF4444" }}
        >
          <RiDeleteBin6Line size="18px" />
        </IconButton>
      </Box>
    </Box>
  );

  if (isLoading) return <MiniLoader />;

  return (
    <Box
      sx={{
        bgcolor: "white",
        borderRadius: "12px",
        border: "1px solid #E4E7EC",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{ borderBottom: "1px solid #E4E7EC" }}
        className="flex items-center justify-between gap-4 px-4! py-5! bg-blue10"
      >
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            fontSize: "18px",
            color: "#101828",
            fontFamily: "Inter, sans-serif",
          }}
        >
          Add-on Categories & Services
        </Typography>
      </Box>

      <Box sx={{ p: "16px" }}>
        <List sx={{ p: "0 8px" }}>
          {groups.length === 0 ? (
            <Typography variant="body2" sx={{ color: "#64748B", p: "8px" }}>
              No categories yet. Use "Manage Categories" to add one.
            </Typography>
          ) : (
            groups.map((group) => {
              const isUncategorized = group.id === UNCATEGORIZED_KEY;
              return (
                <Box key={group.id}>
                  <ListItem
                    onClick={() => toggleExpand(group.id)}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: "8px",
                      px: "16px",
                      my: "4px",
                      bgcolor: "blue.10",
                      borderRadius: "4px",
                      cursor: "pointer",
                      "&:hover": { bgcolor: "blue.20" },
                    }}
                  >
                    <Box>
                      <Typography variant="body1">{group.name}</Typography>
                      <Typography variant="caption" color="grey.40">
                        {group.items.length} service
                        {group.items.length === 1 ? "" : "s"}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "8px",
                      }}
                    >
                      {!isUncategorized && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAddServiceForCategory(group.id);
                          }}
                          className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-1 rounded-lg font-medium text-xs transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center h-9 min-w-[120px]"
                        >
                          Add Service
                        </button>
                      )}
                      {!isUncategorized && (
                        <IconButton
                          size="small"
                          sx={{ color: "#00028B" }}
                          disabled={categoryUpdating}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCategoryForm({
                              open: true,
                              id: group.id,
                              name: group.name,
                            });
                          }}
                        >
                          <TbPencil size="18px" />
                        </IconButton>
                      )}
                      {!isUncategorized && (
                        <IconButton
                          size="small"
                          sx={{ color: "#EF4444" }}
                          disabled={categoryDeleting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCategoryDelete(group.id);
                          }}
                        >
                          <RiDeleteBin6Line size="20px" />
                        </IconButton>
                      )}
                      <IconButton
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpand(group.id);
                        }}
                        size="small"
                        sx={{
                          color: "#667085",
                          transform: expanded[group.id]
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}
                      >
                        <TbChevronDown size="20px" color="black" />
                      </IconButton>
                    </Box>
                  </ListItem>

                  <Collapse in={Boolean(expanded[group.id])}>
                    <Box sx={{ pl: "16px", pb: "8px" }}>
                      {group.items.length === 0 ? (
                        <Typography
                          variant="caption"
                          color="grey.40"
                          sx={{ display: "block", py: "8px", px: "3px" }}
                        >
                          No services in this category yet.
                        </Typography>
                      ) : (
                        group.items.map((item) => renderServiceRow(item))
                      )}
                    </Box>
                  </Collapse>
                </Box>
              );
            })
          )}
        </List>
      </Box>

      {/* Add / Edit add-on service */}
      <ModalComponent
        open={serviceForm.open}
        title={
          serviceForm.type === "update"
            ? "Update Add-on Service"
            : "Add Add-on Service"
        }
        onClose={closeServiceModal}
        secondaryAction={{ label: "Cancel", onClick: closeServiceModal }}
        primaryAction={{
          label:
            serviceForm.type === "update"
              ? "Update Add-on Service"
              : "Add Add-on Service",
          onClick: handleServiceSave,
          isLoading: creating || updating,
        }}
      >
        <Box className="flex flex-col gap-5">
          <InputFieldModal
            title="Add-on Name"
            placeholder="e.g. Blouse Button Resew"
            name="name"
            value={serviceForm.name}
            onChange={handleServiceChange}
          />
          <InputFieldModal
            title="Price (£)"
            placeholder="e.g. 2.5"
            name="price"
            type="number"
            value={serviceForm.price}
            onChange={handleServiceChange}
          />
          <SelectField
            title="Category"
            placeholder="No category"
            value={serviceForm.addOnCategoryId}
            onChange={(e) =>
              setServiceForm((prev) => ({
                ...prev,
                addOnCategoryId: e.target.value,
              }))
            }
            options={categoryOptions}
          />
        </Box>
      </ModalComponent>

      {/* Edit category */}
      <ModalComponent
        open={categoryForm.open}
        title="Update Category"
        onClose={closeCategoryModal}
        secondaryAction={{ label: "Cancel", onClick: closeCategoryModal }}
        primaryAction={{
          label: "Update Category",
          onClick: handleCategorySave,
          isLoading: categoryUpdating,
        }}
      >
        <Box className="flex flex-col gap-5">
          <InputFieldModal
            title="Category Name"
            placeholder="e.g. Repair Blouse"
            name="categoryName"
            value={categoryForm.name}
            onChange={(e) =>
              setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Box>
      </ModalComponent>
    </Box>
  );
}
