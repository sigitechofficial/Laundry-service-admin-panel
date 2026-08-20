import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TbChevronDown } from "../../shared/icons/index";
import { TbGripVertical } from "react-icons/tb";
import {
  useCreateAddOnServiceMutation,
  useDeleteAddOnServiceMutation,
  useGetAllAddOnServicesQuery,
  useUpdateAddOnServiceMutation,
  useUpdateAddOnServicesSortOrderMutation,
  useGetAllAddOnCategoriesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useUpdateAddOnCategoryMutation,
  useUpdateAddOnCategoriesSortOrderMutation,
  useDeleteAddOnCategoryMutation,
} from "../../store/services/api";
import { Button, Field, Input, Select, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { formatAmount } from "../../utilities/formatters";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import { EmptyHint, QueryState } from "./QueryState";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryDotPills,
  DirectoryFormCard,
  DirectoryListRow,
  DirectoryMetrics,
  DirectoryMoney,
} from "../directory-table/directoryTable";

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

function reorderById(list, draggedId, targetId) {
  const ids = list.map((item) => String(item.id));
  const fromIdx = ids.indexOf(String(draggedId));
  const toIdx = ids.indexOf(String(targetId));
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return null;
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

function sortBySortOrder(list) {
  return [...list].sort(
    (a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0)
  );
}

export default function AddOnServicesCard({ triggerAdd }) {
  const { success, error } = useToaster();
  const { data, isLoading, isError, error: addOnsQueryError, refetch } = useGetAllAddOnServicesQuery();
  const {
    data: categoriesData,
    isError: categoriesError,
    error: categoriesQueryError,
    refetch: refetchCategories,
  } = useGetAllAddOnCategoriesQuery({ includeServices: false });
  const { data: itemCategoriesResponse } = useGetCategoriesQuery();
  const { data: itemSubCategoriesResponse } = useGetSubCategoriesQuery();
  const [deleteTarget, setDeleteTarget] = useState(null);

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
  const [updateCategoriesSortOrder, { isLoading: categoryReorderLoading }] =
    useUpdateAddOnCategoriesSortOrderMutation();
  const [updateServicesSortOrder, { isLoading: serviceReorderLoading }] =
    useUpdateAddOnServicesSortOrderMutation();

  const [serviceForm, setServiceForm] = useState(emptyServiceForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [expanded, setExpanded] = useState({});
  const [categoryDragOrder, setCategoryDragOrder] = useState(null);
  const [serviceOrderByCategory, setServiceOrderByCategory] = useState({});
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null);
  const [dragOverServiceKey, setDragOverServiceKey] = useState(null);
  const draggingCategoryIdRef = useRef(null);
  const draggingServiceRef = useRef({ id: null, categoryId: null });

  const reorderBusy = categoryReorderLoading || serviceReorderLoading;

  const addOnServices = useMemo(() => {
    const list = data?.data?.addOnServices || data?.data || [];
    return Array.isArray(list) ? list : [];
  }, [data]);

  const categories = useMemo(() => {
    const list =
      categoriesData?.data?.addOnCategories || categoriesData?.data || [];
    return Array.isArray(list) ? sortBySortOrder(list) : [];
  }, [categoriesData]);

  const itemCategories = useMemo(() => {
    const list = itemCategoriesResponse?.data;
    return Array.isArray(list) ? list : [];
  }, [itemCategoriesResponse]);

  const itemSubCategories = useMemo(() => {
    const list = itemSubCategoriesResponse?.data;
    return Array.isArray(list) ? list : [];
  }, [itemSubCategoriesResponse]);

  const addonLinkContext = useMemo(() => {
    const categoryById = new Map(
      itemCategories.map((category) => [String(category.id), category])
    );
    const subById = new Map(
      itemSubCategories.map((item) => [String(item.id), item])
    );
    return { categoryById, subById };
  }, [itemCategories, itemSubCategories]);

  const getAddonItemLinks = useCallback(
    (item) => {
      const ids = Array.isArray(item?.subCategoryIds) ? item.subCategoryIds : [];
      const services = [];
      ids.forEach((subId) => {
        const sub = addonLinkContext.subById.get(String(subId));
        const category = sub
          ? addonLinkContext.categoryById.get(String(sub.categoryId))
          : null;
        const serviceName =
          category?.service?.name ||
          (category?.serviceId != null ? `Service #${category.serviceId}` : null);
        if (serviceName && !services.includes(serviceName)) {
          services.push(serviceName);
        }
      });
      return { itemCount: ids.length, services };
    },
    [addonLinkContext]
  );

  useEffect(() => {
    setCategoryDragOrder(null);
  }, [categoriesData]);

  useEffect(() => {
    setServiceOrderByCategory({});
  }, [data]);

  const categoryOptions = useMemo(
    () => [
      { value: "", label: "No category" },
      ...categories.map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [categories]
  );

  const groups = useMemo(() => {
    const byId = new Map();
    const orderedCats = categoryDragOrder ?? categories;
    orderedCats.forEach((c) =>
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

    const ordered = [...byId.values()].map((group) => {
      const override = serviceOrderByCategory[group.id];
      const items = override ?? sortBySortOrder(group.items);
      return { ...group, items };
    });

    if (uncategorized.items.length > 0) {
      const override = serviceOrderByCategory[UNCATEGORIZED_KEY];
      ordered.push({
        ...uncategorized,
        items: override ?? sortBySortOrder(uncategorized.items),
      });
    }
    return ordered;
  }, [addOnServices, categories, categoryDragOrder, serviceOrderByCategory]);

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

  const handleCategoryDrop = useCallback(
    async (targetId) => {
      setDragOverCategoryId(null);
      if (reorderBusy || targetId === UNCATEGORIZED_KEY) return;
      const draggedId = draggingCategoryIdRef.current;
      draggingCategoryIdRef.current = null;
      if (!draggedId || draggedId === UNCATEGORIZED_KEY) return;

      const base = categoryDragOrder ?? categories;
      const next = reorderById(base, draggedId, targetId);
      if (!next) return;
      setCategoryDragOrder(next);

      try {
        const res = await updateCategoriesSortOrder({
          addOnCategories: next.map((c, i) => ({
            addOnCategoryId: c.id,
            sortOrder: i + 1,
          })),
        }).unwrap();
        if (!isExplicitFailure(res)) {
          success("Category order updated.");
          void refetchCategories();
        } else {
          setCategoryDragOrder(null);
          error(res?.message || "Could not save category order.");
        }
      } catch {
        setCategoryDragOrder(null);
        error("Could not save category order.");
      }
    },
    [
      reorderBusy,
      categoryDragOrder,
      categories,
      updateCategoriesSortOrder,
      refetchCategories,
      success,
      error,
    ]
  );

  const handleServiceDrop = useCallback(
    async (categoryId, targetServiceId) => {
      setDragOverServiceKey(null);
      if (reorderBusy) return;
      const { id: draggedId, categoryId: dragCat } = draggingServiceRef.current;
      draggingServiceRef.current = { id: null, categoryId: null };
      if (!draggedId || String(dragCat) !== String(categoryId)) return;

      const group = groups.find((g) => String(g.id) === String(categoryId));
      if (!group) return;
      const base = serviceOrderByCategory[categoryId] ?? group.items ?? [];
      const next = reorderById(base, draggedId, targetServiceId);
      if (!next) return;

      setServiceOrderByCategory((prev) => ({ ...prev, [categoryId]: next }));

      try {
        const res = await updateServicesSortOrder({
          addOnServices: next.map((s, i) => ({
            addOnServiceId: s.id,
            sortOrder: i + 1,
          })),
        }).unwrap();
        if (!isExplicitFailure(res)) {
          success("Add-on order updated.");
          void refetch();
        } else {
          setServiceOrderByCategory((prev) => {
            const copy = { ...prev };
            delete copy[categoryId];
            return copy;
          });
          error(res?.message || "Could not save add-on order.");
        }
      } catch {
        setServiceOrderByCategory((prev) => {
          const copy = { ...prev };
          delete copy[categoryId];
          return copy;
        });
        error("Could not save add-on order.");
      }
    },
    [
      reorderBusy,
      groups,
      serviceOrderByCategory,
      updateServicesSortOrder,
      refetch,
      success,
      error,
    ]
  );

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
        setDeleteTarget(null);
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
        setDeleteTarget(null);
        void refetchCategories();
        void refetch();
      } else {
        error(res?.message || "Could not delete category.");
      }
    } catch {
      error("Request failed. Please try again.");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.kind === "service") {
      await handleServiceDelete(deleteTarget.id);
      return;
    }
    await handleCategoryDelete(deleteTarget.id);
  };

  const renderServiceRow = (item, categoryId) => {
    const dropKey = `${categoryId}:${item.id}`;
    const isOver = dragOverServiceKey === dropKey;

    return (
      <DirectoryListRow
        key={item.id}
        active={isOver}
        onDragOver={(e) => {
          if (reorderBusy) return;
          e.preventDefault();
          setDragOverServiceKey(dropKey);
        }}
        onDragLeave={() => setDragOverServiceKey(null)}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void handleServiceDrop(categoryId, item.id);
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <span
            draggable={!reorderBusy}
            onDragStart={(e) => {
              e.stopPropagation();
              draggingServiceRef.current = {
                id: String(item.id),
                categoryId: String(categoryId),
              };
              e.dataTransfer.setData("text/addon-service", String(item.id));
              e.dataTransfer.effectAllowed = "move";
            }}
            style={{
              display: "flex",
              alignItems: "center",
              cursor: reorderBusy ? "not-allowed" : "grab",
              color: "#8a94a2",
              flexShrink: 0,
            }}
            aria-label="Drag to reorder add-on"
          >
            <TbGripVertical size={16} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
              {item.name}
            </span>
            {(() => {
              const links = getAddonItemLinks(item);
              return (
                <DirectoryDotPills
                  items={[
                    {
                      key: "items",
                      tone: links.itemCount ? "info" : "neutral",
                      label: `${links.itemCount} ${links.itemCount === 1 ? "item" : "items"}`,
                    },
                    ...links.services.map((serviceName) => ({
                      key: serviceName,
                      tone: "neutral",
                      label: serviceName,
                    })),
                  ]}
                />
              );
            })()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <DirectoryMoney>{formatAmount(item.price, null, { applyDefault: true })}</DirectoryMoney>
          <DirectoryActionEdit
            disabled={updating || reorderBusy}
            onClick={() => openEditService(item)}
          />
          <DirectoryActionDelete
            disabled={deleting || reorderBusy}
            onClick={() =>
              setDeleteTarget({
                kind: "service",
                id: item.id,
                name: item.name,
              })
            }
          />
        </div>
      </DirectoryListRow>
    );
  };

  if (isLoading || isError || categoriesError) {
    return (
      <QueryState
        loading={isLoading}
        error={addOnsQueryError || categoriesQueryError || isError || categoriesError}
        onRetry={() => {
          void refetch();
          void refetchCategories();
        }}
        errorLabel="Could not load add-on services. Please try again."
      />
    );
  }

  return (
    <div>
      <DirectoryMetrics
        items={[
          { label: "Categories", value: categories.length, tone: "brand" },
          { label: "Add-on services", value: addOnServices.length, tone: "navy" },
          {
            label: "Linked to items",
            value: addOnServices.filter((item) => (item.subCategoryIds || []).length > 0).length,
            tone: "success",
          },
        ]}
      />
    <DirectoryFormCard
      title="Add-on category → add-on"
      hint="Drag to reorder. Link an add-on category to an item from Categories so it appears in Catalog."
      flush
    >
        {groups.length === 0 ? (
          <EmptyHint>
            No categories yet. Use &quot;Manage Categories&quot; to add one.
          </EmptyHint>
        ) : (
          groups.map((group) => {
            const isUncategorized = group.id === UNCATEGORIZED_KEY;
            const isCatOver = !isUncategorized && dragOverCategoryId === group.id;

            return (
              <div key={group.id}>
                <DirectoryListRow
                  active={isCatOver}
                  onClick={() => toggleExpand(group.id)}
                  onDragOver={(e) => {
                    if (reorderBusy || isUncategorized) return;
                    e.preventDefault();
                    setDragOverCategoryId(group.id);
                  }}
                  onDragLeave={() => setDragOverCategoryId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleCategoryDrop(group.id);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {!isUncategorized ? (
                      <span
                        draggable={!reorderBusy}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          draggingCategoryIdRef.current = String(group.id);
                          e.dataTransfer.setData(
                            "text/addon-category",
                            String(group.id)
                          );
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          cursor: reorderBusy ? "not-allowed" : "grab",
                          color: "var(--faint)",
                          flexShrink: 0,
                        }}
                        aria-label="Drag to reorder category"
                      >
                        <TbGripVertical size={18} />
                      </span>
                    ) : null}
                    <div>
                      <div>{group.name}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {group.items.length} service
                        {group.items.length === 1 ? "" : "s"}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isUncategorized ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => openAddServiceForCategory(group.id)}
                      >
                        Add Service
                      </Button>
                    ) : null}
                    {!isUncategorized ? (
                      <DirectoryActionEdit
                        disabled={categoryUpdating || reorderBusy}
                        onClick={() =>
                          setCategoryForm({
                            open: true,
                            id: group.id,
                            name: group.name,
                          })
                        }
                      />
                    ) : null}
                    {!isUncategorized ? (
                      <DirectoryActionDelete
                        disabled={categoryDeleting || reorderBusy}
                        onClick={() =>
                          setDeleteTarget({
                            kind: "category",
                            id: group.id,
                            name: group.name,
                          })
                        }
                      />
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpand(group.id)}
                      aria-label={expanded[group.id] ? "Collapse" : "Expand"}
                    >
                      <TbChevronDown
                        size={18}
                        style={{
                          transform: expanded[group.id] ? "rotate(180deg)" : "none",
                          transition: "transform 0.2s",
                        }}
                      />
                    </Button>
                  </div>
                </DirectoryListRow>

                {expanded[group.id] ? (
                  <div style={{ padding: "0 16px 8px" }}>
                    {group.items.length === 0 ? (
                      <p style={{ color: "var(--muted)", fontSize: 13, margin: "8px 0" }}>
                        No services in this category yet.
                      </p>
                    ) : (
                      group.items.map((item) => renderServiceRow(item, group.id))
                    )}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
    </DirectoryFormCard>

      <Modal
        open={serviceForm.open}
        title={
          serviceForm.type === "update"
            ? "Update Add-on Service"
            : "Add Add-on Service"
        }
        onClose={closeServiceModal}
        secondaryLabel="Cancel"
        primaryLabel={
          creating || updating
            ? "Saving…"
            : serviceForm.type === "update"
              ? "Update Add-on Service"
              : "Add Add-on Service"
        }
        onPrimary={() => {
          if (creating || updating) return;
          handleServiceSave();
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Field label="Add-on Name" htmlFor="addon-name">
            <Input
              id="addon-name"
              name="name"
              placeholder="e.g. Blouse Button Resew"
              value={serviceForm.name}
              onChange={handleServiceChange}
            />
          </Field>
          <Field label="Price" htmlFor="addon-price">
            <Input
              id="addon-price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g. 19.22"
              value={serviceForm.price}
              onChange={handleServiceChange}
            />
          </Field>
          <Field label="Category">
            <Select
              value={serviceForm.addOnCategoryId}
              onChange={(v) =>
                setServiceForm((prev) => ({
                  ...prev,
                  addOnCategoryId: v == null ? "" : String(v),
                }))
              }
              options={categoryOptions}
              placeholder="No category"
            />
          </Field>
        </div>
      </Modal>

      <Modal
        open={categoryForm.open}
        title="Update Category"
        onClose={closeCategoryModal}
        secondaryLabel="Cancel"
        primaryLabel={categoryUpdating ? "Updating…" : "Update Category"}
        onPrimary={() => {
          if (categoryUpdating) return;
          handleCategorySave();
        }}
      >
        <Field label="Category Name" htmlFor="addon-category-name">
          <Input
            id="addon-category-name"
            name="categoryName"
            placeholder="e.g. Repair Blouse"
            value={categoryForm.name}
            onChange={(e) =>
              setCategoryForm((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </Field>
      </Modal>

      <ConfirmDeleteModal
        open={Boolean(deleteTarget)}
        title={
          deleteTarget?.kind === "category"
            ? "Delete add-on category"
            : "Delete add-on service"
        }
        description={
          deleteTarget?.name
            ? `Remove “${deleteTarget.name}”? This cannot be undone.`
            : "Remove this item? This cannot be undone."
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={
          deleteTarget?.kind === "category" ? categoryDeleting : deleting
        }
      />
    </div>
  );
}
