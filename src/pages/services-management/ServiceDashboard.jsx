import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import {
  useGetAllServicesQuery,
  useGetServiceWitPreferencesQuery,
  useGetAllAddOnServicesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useGetPreferencesQuery,
  useAddServiceMutation,
  useEditServiceMutation,
  useUpdateServicesSortOrderMutation,
  useUpdateCategoriesSortOrderMutation,
  useUpdateSubCategoriesSortOrderMutation,
} from "../../store/services/api";
import { IoEye, TbPencil, TbChevronRight, TbChevronDown } from "../../shared/icons/index";
import { TbGripVertical } from "react-icons/tb";
import {
  MdLocalLaundryService,
  MdDryCleaning,
  MdCheckroom,
} from "react-icons/md";
import { TbIroning, TbTools, TbWash } from "react-icons/tb";
import { HiOutlineSparkles } from "react-icons/hi";
import {
  Button,
  Field,
  Input,
  Textarea,
  Modal,
} from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { formatAmount, joinMediaUrl } from "../../utilities/formatters";
import {
  IMAGE_UPLOAD_ACCEPT,
  acceptImageFile,
} from "../../utilities/imageUploadPolicy";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import CategoryAddOnsModal from "./CategoryAddOnsModal";
import { EmptyHint, QueryState } from "./QueryState";
import {
  DirectoryDotPill,
  DirectoryMetrics,
  DirectoryPanel,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import CatalogChrome from "./catalogChrome";
import CategoryModal from "./categories-modal/CategoryModal";
import ConfigureModal from "./configure-modal/ConfigureModal";
import {
  buildSubCategoriesByServiceId,
  getAddOnsForCategoryRow,
  normalizeAddOnServicesList,
} from "./serviceAddOnsUtils";

const SERVICE_ICONS = [
  { pattern: /wash\s*&\s*fold|wash and fold|fold/i, icon: MdLocalLaundryService },
  { pattern: /wash\s*&\s*iron|wash and iron|ironing/i, icon: TbIroning },
  { pattern: /dry\s*clean|dryclean/i, icon: MdDryCleaning },
  { pattern: /press\s*only|pressing/i, icon: TbIroning },
  { pattern: /repair|alteration/i, icon: TbTools },
  { pattern: /alteration/i, icon: MdCheckroom },
  { pattern: /stain\s*removal|spot/i, icon: HiOutlineSparkles },
  { pattern: /washing|wash/i, icon: TbWash },
  { pattern: /iron/i, icon: TbIroning },
  { pattern: /clean/i, icon: MdDryCleaning },
];

function getServiceIcon(name) {
  const text = String(name || "").toLowerCase();
  const match = SERVICE_ICONS.find(({ pattern }) => pattern.test(text));
  return match?.icon || MdLocalLaundryService;
}

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

function ServiceCategoriesExpandableTable({
  rows,
  searchTerm,
  addOnsList,
  subCategoriesByServiceId,
  onViewAddOns,
  onReorderCategories,
  onReorderSubCategories,
  reorderDisabled = false,
}) {
  const { error: toastReorderError } = useToaster();
  const [expanded, setExpanded] = useState({});
  const [categoryOrder, setCategoryOrder] = useState(null);
  const [subOrderByCategory, setSubOrderByCategory] = useState({});
  const [dragOverCategoryId, setDragOverCategoryId] = useState(null);
  const [dragOverSubKey, setDragOverSubKey] = useState(null);

  useEffect(() => {
    setCategoryOrder(null);
    setSubOrderByCategory({});
  }, [rows]);

  const baseRows = categoryOrder ?? rows;

  const filteredRows = useMemo(() => {
    if (!searchTerm?.trim()) return baseRows;
    const q = searchTerm.toLowerCase();
    return baseRows.filter(
      (r) =>
        r.category?.toLowerCase().includes(q) ||
        r.serviceName?.toLowerCase().includes(q) ||
        String(r.description || "")
          .toLowerCase()
          .includes(q) ||
        r.subCategories?.some((sub) =>
          String(sub?.name || "")
            .toLowerCase()
            .includes(q)
        )
    );
  }, [baseRows, searchTerm]);

  useEffect(() => {
    if (!searchTerm?.trim()) return;
    const q = searchTerm.toLowerCase();
    setExpanded((prev) => {
      const next = { ...prev };
      filteredRows.forEach((r) => {
        if (
          r.subCategories?.some((sub) =>
            String(sub?.name || "")
              .toLowerCase()
              .includes(q)
          )
        ) {
          next[r.id] = true;
        }
      });
      return next;
    });
  }, [searchTerm, filteredRows]);

  const toggleRow = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getSubItems = (row) =>
    subOrderByCategory[row.categoryId] ?? row.subCategories ?? [];

  const handleCategoryDrop = async (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverCategoryId(null);
    const draggedId = e.dataTransfer.getData("text/category");
    if (!draggedId || reorderDisabled) return;
    const next = reorderById(baseRows, draggedId, targetId);
    if (!next) return;
    setCategoryOrder(next);
    try {
      await onReorderCategories?.(next);
    } catch (err) {
      setCategoryOrder(null);
      toastReorderError(getApiErrorMessage(err, "Could not save category order."));
    }
  };

  const handleSubDrop = async (e, categoryId, targetSubId) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSubKey(null);
    const draggedId = e.dataTransfer.getData("text/subcategory");
    const dragCategoryId = e.dataTransfer.getData("text/subcategory-category");
    if (
      !draggedId ||
      String(dragCategoryId) !== String(categoryId) ||
      reorderDisabled
    ) {
      return;
    }
    const row = baseRows.find((r) => String(r.categoryId) === String(categoryId));
    if (!row) return;
    const current = getSubItems(row);
    const next = reorderById(current, draggedId, targetSubId);
    if (!next) return;
    setSubOrderByCategory((prev) => ({ ...prev, [categoryId]: next }));
    try {
      await onReorderSubCategories?.(categoryId, next);
    } catch (err) {
      setSubOrderByCategory((prev) => {
        const copy = { ...prev };
        delete copy[categoryId];
        return copy;
      });
      toastReorderError(getApiErrorMessage(err, "Could not save sub-category order."));
    }
  };

  if (!filteredRows.length) {
    return (
      <DirectoryTableWrap>
        <EmptyHint>No categories found for this service.</EmptyHint>
      </DirectoryTableWrap>
    );
  }

  return (
    <DirectoryTableWrap>
      <p style={{ margin: 0, padding: "12px 16px 0", color: "#5c6673", fontSize: 13 }}>
        Drag the grip handle to reorder categories and sub-categories.
      </p>
      <div style={{ maxHeight: 520, overflow: "auto" }}>
        <table className="jd-tbl" style={{ minWidth: 940 }}>
          <thead>
            <tr>
              <th style={{ width: 44 }} />
              <th style={{ width: 48 }} />
              <th>SL</th>
              <th>Category</th>
              <th>Service</th>
              <th>Description</th>
              <th>Sub-categories</th>
              <th>Add-ons</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row, idx) => {
              const isOpen = Boolean(expanded[row.id]);
              const subItems = getSubItems(row);
              const addOnCount = getAddOnsForCategoryRow(
                { ...row, subCategories: subItems },
                addOnsList,
                subCategoriesByServiceId
              ).length;
              const rowBg =
                dragOverCategoryId === row.id
                  ? "var(--accent-tint)"
                  : undefined;

              return (
                <Fragment key={row.id}>
                  <tr
                    onDragOver={(e) => {
                      if (reorderDisabled) return;
                      e.preventDefault();
                      setDragOverCategoryId(row.id);
                    }}
                    onDragLeave={() => setDragOverCategoryId(null)}
                    onDrop={(e) => handleCategoryDrop(e, row.id)}
                    onClick={() => toggleRow(row.id)}
                    style={{ cursor: "pointer", background: rowBg }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <span
                        draggable={!reorderDisabled && !searchTerm?.trim()}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/category", String(row.id));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        style={{
                          display: "inline-flex",
                          color: "var(--faint)",
                          cursor: reorderDisabled ? "not-allowed" : "grab",
                        }}
                        aria-label="Drag to reorder category"
                      >
                        <TbGripVertical size={18} />
                      </span>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(row.id);
                        }}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? <TbChevronDown size={18} /> : <TbChevronRight size={18} />}
                      </Button>
                    </td>
                    <td>{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{row.category}</td>
                    <td>{row.serviceName}</td>
                    <td style={{ color: "var(--muted)", maxWidth: 320 }}>
                      {row.description}
                    </td>
                    <td>{subItems.length}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          onViewAddOns?.({
                            categoryName: row.category,
                            subCategories: subItems,
                          })
                        }
                      >
                        {addOnCount > 0 ? `View (${addOnCount})` : "View"}
                      </Button>
                    </td>
                  </tr>

                  {isOpen ? (
                    <tr>
                      <td colSpan={8} style={{ background: "var(--canvas)", padding: 16 }}>
                        {subItems.length === 0 ? (
                          <p style={{ color: "var(--faint)", margin: 0, fontSize: 13 }}>
                            No sub-categories configured.
                          </p>
                        ) : (
                          <table className="jd-tbl">
                            <thead>
                              <tr>
                                <th style={{ width: 40 }} />
                                <th>Sub-category</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Description</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subItems.map((sub, subIdx) => {
                                const subKey = `${row.categoryId}-${sub.id}`;
                                return (
                                  <tr
                                    key={sub.id ?? `${sub.name}-${subIdx}`}
                                    onDragOver={(e) => {
                                      if (reorderDisabled) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setDragOverSubKey(subKey);
                                    }}
                                    onDragLeave={() => setDragOverSubKey(null)}
                                    onDrop={(e) =>
                                      handleSubDrop(e, row.categoryId, sub.id)
                                    }
                                    style={{
                                      background:
                                        dragOverSubKey === subKey
                                          ? "var(--accent-tint)"
                                          : undefined,
                                    }}
                                  >
                                    <td>
                                      <span
                                        draggable={!reorderDisabled}
                                        onDragStart={(e) => {
                                          e.stopPropagation();
                                          e.dataTransfer.setData(
                                            "text/subcategory",
                                            String(sub.id)
                                          );
                                          e.dataTransfer.setData(
                                            "text/subcategory-category",
                                            String(row.categoryId)
                                          );
                                          e.dataTransfer.effectAllowed = "move";
                                        }}
                                        style={{
                                          display: "inline-flex",
                                          color: "var(--faint)",
                                          cursor: reorderDisabled
                                            ? "not-allowed"
                                            : "grab",
                                        }}
                                        aria-label="Drag to reorder sub-category"
                                      >
                                        <TbGripVertical size={16} />
                                      </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>
                                      {sub.name ?? "—"}
                                    </td>
                                    <td>{formatAmount(sub.price, null, { applyDefault: true })}</td>
                                    <td>
                                      <DirectoryDotPill tone={sub.status ? "success" : "neutral"}>
                                        {sub.status ? "Active" : "Inactive"}
                                      </DirectoryDotPill>
                                    </td>
                                    <td style={{ color: "var(--muted)" }}>
                                      {sub.description ?? "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </DirectoryTableWrap>
  );
}

export default function ServiceDashboard() {
  const navigate = useNavigate();
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [menuServiceId, setMenuServiceId] = useState(null);
  const [serviceModal, setServiceModal] = useState({
    open: false,
    type: "add",
    id: "",
    name: "",
    description: "",
    image: "",
  });
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [configureOpen, setConfigureOpen] = useState(false);

  const { success, error } = useToaster();
  const {
    data: servicesData,
    isLoading: isLoadingServices,
    isError: isServicesError,
    error: servicesQueryError,
    refetch: refetchServices,
  } = useGetAllServicesQuery();
  const services = useMemo(
    () => servicesData?.data?.services ?? [],
    [servicesData?.data?.services]
  );

  const {
    data: serviceConfigData,
    isLoading: isLoadingConfig,
    isError: isConfigError,
    error: configQueryError,
    refetch: refetchConfig,
  } = useGetServiceWitPreferencesQuery(selectedServiceId, {
    skip: !selectedServiceId,
  });

  const { data: addOnsResponse } = useGetAllAddOnServicesQuery();
  const { data: categoriesResponse } = useGetCategoriesQuery();
  const { data: subCategoriesResponse } = useGetSubCategoriesQuery();
  const { data: preferencesResponse } = useGetPreferencesQuery();
  const addOnsList = useMemo(
    () => normalizeAddOnServicesList(addOnsResponse),
    [addOnsResponse]
  );
  const subCategoriesByServiceId = useMemo(
    () =>
      buildSubCategoriesByServiceId(
        serviceConfigData?.data?.serviceCategoriesData
      ),
    [serviceConfigData?.data?.serviceCategoriesData]
  );

  const [addOnsModal, setAddOnsModal] = useState({
    open: false,
    categoryName: "",
    subCategories: [],
  });

  const [addService, { isLoading: addServiceLoading }] = useAddServiceMutation();
  const [editService, { isLoading: editServiceLoading }] =
    useEditServiceMutation();
  const [updateServicesSortOrder, { isLoading: serviceReorderLoading }] =
    useUpdateServicesSortOrderMutation();
  const [updateCategoriesSortOrder, { isLoading: categoryReorderLoading }] =
    useUpdateCategoriesSortOrderMutation();
  const [updateSubCategoriesSortOrder, { isLoading: subReorderLoading }] =
    useUpdateSubCategoriesSortOrderMutation();

  const [serviceDragOrder, setServiceDragOrder] = useState(null);
  const [dragOverServiceId, setDragOverServiceId] = useState(null);
  const draggingServiceIdRef = useRef(null);

  useEffect(() => {
    setServiceDragOrder(null);
  }, [servicesData]);

  const orderedServices = serviceDragOrder ?? services;

  useEffect(() => {
    if (orderedServices?.length && !selectedServiceId) {
      setSelectedServiceId(orderedServices[0]?.id);
    }
  }, [orderedServices, selectedServiceId]);

  useEffect(() => {
    if (serviceModal.type === "update" && serviceModal.id) {
      const s = orderedServices?.find((sv) => sv.id === serviceModal.id);
      if (s) {
        setServiceModal((prev) => ({
          ...prev,
          name: s.name || "",
          description: s.description || "",
          image: joinMediaUrl(s.image),
        }));
      }
    }
  }, [serviceModal.type, serviceModal.id, orderedServices]);

  useEffect(() => {
    if (!menuServiceId) return;
    const close = () => setMenuServiceId(null);
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [menuServiceId]);

  const selectedService = orderedServices?.find((s) => s.id === selectedServiceId);

  const allCategories = Array.isArray(categoriesResponse?.data)
    ? categoriesResponse.data
    : [];
  const allSubCategories = useMemo(
    () =>
      Array.isArray(subCategoriesResponse?.data)
        ? subCategoriesResponse.data
        : [],
    [subCategoriesResponse?.data]
  );
  const subCategoryById = useMemo(() => {
    const map = new Map();
    allSubCategories.forEach((item) => {
      if (item?.id != null) map.set(String(item.id), item);
    });
    return map;
  }, [allSubCategories]);

  const rawTableRows = useMemo(() => {
    if (!serviceConfigData?.data?.serviceCategoriesData || !selectedService)
      return [];
    const rows = [];
    let sl = 1;
    serviceConfigData.data.serviceCategoriesData.forEach((serviceCat) => {
      const subCategories = (serviceCat?.category?.subCategories ?? []).map(
        (sub) => {
          const full = subCategoryById.get(String(sub?.id));
          return {
            ...sub,
            addOnCategories:
              full?.addOnCategories ?? sub?.addOnCategories ?? [],
            excludedAddOnCategories:
              full?.excludedAddOnCategories ??
              sub?.excludedAddOnCategories ??
              [],
            inheritedAddOnCategories:
              full?.inheritedAddOnCategories ??
              sub?.inheritedAddOnCategories ??
              [],
          };
        }
      );
      const categoryDescription = serviceCat?.category?.description ?? "";
      const categoryId =
        serviceCat?.category?.id ?? serviceCat?.categoryId ?? null;
      rows.push({
        id: `${selectedService.id}-${serviceCat?.id}`,
        categoryId,
        sl: sl++,
        serviceName: selectedService.name,
        category: serviceCat?.category?.name ?? "",
        description: categoryDescription.replace(/<[^>]+>/g, "") || "—",
        subCategories,
      });
    });
    return rows;
  }, [serviceConfigData, selectedService, subCategoryById]);

  const linkedAddOnCount = useMemo(() => {
    if (!rawTableRows?.length) return 0;
    const ids = new Set();
    rawTableRows.forEach((row) => {
      getAddOnsForCategoryRow(
        row,
        addOnsList,
        subCategoriesByServiceId
      ).forEach((addon) => ids.add(addon.id));
    });
    return ids.size;
  }, [rawTableRows, addOnsList, subCategoriesByServiceId]);

  const subCategoryCount = useMemo(
    () =>
      rawTableRows.reduce(
        (count, row) => count + (row.subCategories?.length || 0),
        0
      ),
    [rawTableRows]
  );

  const allPreferences = Array.isArray(preferencesResponse?.data)
    ? preferencesResponse.data
    : [];
  const linkedPreferences = serviceConfigData?.data?.preferencesData || [];

  const handleReorderCategories = useCallback(
    async (orderedRows) => {
      const payload = orderedRows
        .filter((r) => r.categoryId != null)
        .map((r, i) => ({
          categoryId: r.categoryId,
          sortOrder: i + 1,
        }));
      if (!payload.length) return;
      const res = await updateCategoriesSortOrder({
        serviceId: selectedServiceId,
        categories: payload,
      }).unwrap();
      if (res?.status === "1") {
        success("Category order updated.");
      } else {
        throw new Error(res?.message || "Failed");
      }
    },
    [selectedServiceId, updateCategoriesSortOrder, success]
  );

  const handleReorderSubCategories = useCallback(
    async (_categoryId, orderedSubs) => {
      const payload = orderedSubs
        .filter((s) => s?.id != null)
        .map((s, i) => ({
          subCategoryId: s.id,
          sortOrder: i + 1,
        }));
      if (!payload.length) return;
      const res = await updateSubCategoriesSortOrder({
        serviceId: selectedServiceId,
        subCategories: payload,
      }).unwrap();
      if (res?.status === "1") {
        success("Sub-category order updated.");
      } else {
        throw new Error(res?.message || "Failed");
      }
    },
    [selectedServiceId, updateSubCategoriesSortOrder, success]
  );

  const handleServiceChipDrop = useCallback(
    async (targetId) => {
      setDragOverServiceId(null);
      const draggedId = draggingServiceIdRef.current;
      draggingServiceIdRef.current = null;
      const base = serviceDragOrder ?? services ?? [];
      const next = reorderById(base, draggedId, targetId);
      if (!next) return;
      setServiceDragOrder(next);
      try {
        const res = await updateServicesSortOrder({
          services: next.map((s, i) => ({
            serviceId: s.id,
            sortOrder: i + 1,
          })),
        }).unwrap();
        if (res?.status === "1") {
          success("Service order updated.");
          refetchServices();
        } else {
          setServiceDragOrder(null);
          error(res?.message || "Could not save service order.");
        }
      } catch (err) {
        setServiceDragOrder(null);
        error(getApiErrorMessage(err, "Could not save service order."));
      }
    },
    [
      serviceDragOrder,
      services,
      updateServicesSortOrder,
      refetchServices,
      success,
      error,
    ]
  );

  const handleView = () => {
    if (menuServiceId) {
      navigate("/services-management/configure-services");
    }
    setMenuServiceId(null);
  };

  const handleEditFromMenu = () => {
    const s = orderedServices?.find((sv) => sv.id === menuServiceId);
    if (s) {
      setServiceModal({
        open: true,
        type: "update",
        id: s.id,
        name: s.name || "",
        description: s.description || "",
        image: joinMediaUrl(s.image),
      });
    }
    setMenuServiceId(null);
  };

  const closeServiceModal = () => {
    setServiceModal({
      open: false,
      type: "add",
      id: "",
      name: "",
      description: "",
      image: "",
    });
  };

  const handleServiceFormChange = (e) => {
    const { name, value } = e.target;
    setServiceModal((prev) => ({ ...prev, [name]: value }));
  };

  const handleAddService = async () => {
    const formData = new FormData();
    formData.append("name", serviceModal.name);
    formData.append("description", serviceModal.description);
    formData.append("serviceImg", serviceModal.image);
    try {
      const res = await addService(formData).unwrap();
      if (res?.status === "1") {
        success("Service added successfully!");
        closeServiceModal();
        refetchServices();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Something went wrong"));
    }
  };

  const handleEditService = async () => {
    try {
      const formData = new FormData();
      formData.append("name", serviceModal.name);
      formData.append("description", serviceModal.description);
      if (serviceModal.image instanceof File) {
        formData.append("serviceImg", serviceModal.image);
      } else if (serviceModal.image === null) {
        formData.append("deleteImage", "true");
      }
      const res = await editService({
        id: serviceModal.id,
        body: formData,
      }).unwrap();
      if (res?.status === "1") {
        success("Service updated successfully!");
        closeServiceModal();
        refetchServices();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(getApiErrorMessage(err, "Failed to update service"));
    }
  };

  const saving = addServiceLoading || editServiceLoading;

  const openAddService = () =>
    setServiceModal({
      open: true,
      type: "add",
      id: "",
      name: "",
      description: "",
      image: "",
    });

  if (isLoadingServices || isServicesError) {
    return (
      <CatalogChrome
        section="overview"
        title="Service catalog"
        description="Services → categories → items, with add-ons and preferences in context"
      >
        <QueryState
          loading={isLoadingServices}
          error={servicesQueryError || isServicesError}
          onRetry={refetchServices}
          errorLabel="Could not load services. Please try again."
        />
      </CatalogChrome>
    );
  }

  return (
    <CatalogChrome
      section="overview"
      title="Service catalog"
      description="One workspace for the customer catalog. Select a service to see its categories, items, add-ons, and preferences."
      breadcrumb={[
        "Catalog",
        selectedService?.name || "Select a service",
        selectedService
          ? `${rawTableRows.length} ${rawTableRows.length === 1 ? "category" : "categories"} · ${subCategoryCount} ${subCategoryCount === 1 ? "item" : "items"}`
          : null,
      ].filter(Boolean)}
      actions={
        <>
          <div style={{ minWidth: 220 }}>
            <Field htmlFor="service-dash-search">
              <Input
                id="service-dash-search"
                placeholder="Search categories or items"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </Field>
          </div>
          <Button variant="secondary" onClick={() => setConfigureOpen(true)}>
            Configure
          </Button>
          <Button onClick={openAddService}>Add Service</Button>
        </>
      }
    >
      <DirectoryMetrics
        items={[
          { label: "Services", value: orderedServices?.length ?? 0, tone: "brand" },
          { label: "Categories", value: allCategories.length, tone: "navy" },
          { label: "Items", value: allSubCategories.length, tone: "success" },
          { label: "Add-ons", value: addOnsList.length, tone: "warning" },
          { label: "Preferences", value: allPreferences.length, tone: "neutral" },
          { label: "On this service", value: rawTableRows.length, tone: "brand" },
        ]}
      />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "start",
        }}
      >
        <DirectoryPanel style={{ flex: "0 1 280px", minWidth: 240 }}>
          <div style={{ padding: "16px", borderBottom: "1px solid #e6e9f0" }}>
            <div style={{ fontWeight: 700, color: "#0e131c" }}>Services</div>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "#5c6673" }}>
              Drag the grip to set customer tab order.
            </p>
          </div>
          <div style={{ padding: 8 }}>
            {!orderedServices?.length ? (
              <EmptyHint>No services yet. Use Add Service to create the first catalog item.</EmptyHint>
            ) : null}
            {orderedServices?.map((service) => {
              const IconComponent = getServiceIcon(service.name);
              const isActive = selectedServiceId === service.id;
              const isOver = dragOverServiceId === service.id;
              const serviceCatCount = allCategories.filter(
                (cat) =>
                  String(cat.serviceId ?? cat.service?.id) === String(service.id)
              ).length;

              return (
                <div
                  key={service.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isActive}
                  aria-label={`Select ${service.name}`}
                  onClick={() => setSelectedServiceId(service.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedServiceId(service.id);
                    }
                  }}
                  onDragOver={(e) => {
                    if (serviceReorderLoading) return;
                    e.preventDefault();
                    setDragOverServiceId(service.id);
                  }}
                  onDragLeave={() => setDragOverServiceId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleServiceChipDrop(service.id);
                  }}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 12px",
                    marginBottom: 4,
                    cursor: "pointer",
                    background: isOver
                      ? "var(--accent-tint)"
                      : isActive
                        ? "var(--accent)"
                        : "transparent",
                    color: isActive ? "var(--on-accent)" : "var(--ink)",
                    borderRadius: "var(--r-md)",
                    border: isOver ? "1px dashed var(--brand-500)" : "1px solid transparent",
                  }}
                >
                  <span
                    draggable={!serviceReorderLoading}
                    onDragStart={(e) => {
                      e.stopPropagation();
                      draggingServiceIdRef.current = service.id;
                      e.dataTransfer.setData("text/plain", String(service.id));
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      color: isActive ? "rgba(255,255,255,0.85)" : "var(--faint)",
                      cursor: serviceReorderLoading ? "not-allowed" : "grab",
                    }}
                    aria-label="Drag to reorder service"
                  >
                    <TbGripVertical size={18} />
                  </span>
                  <IconComponent size={18} color={isActive ? "#fff" : "var(--success-700)"} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {service.name}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: isActive ? "rgba(255,255,255,0.8)" : "var(--muted)",
                      }}
                    >
                      {serviceCatCount} {serviceCatCount === 1 ? "category" : "categories"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={isActive ? "secondary" : "ghost"}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuServiceId((prev) =>
                        prev === service.id ? null : service.id
                      );
                    }}
                  >
                    ⋯
                  </Button>
                  {menuServiceId === service.id ? (
                    <div
                      role="menu"
                      onMouseDown={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute",
                        right: 8,
                        top: "100%",
                        zIndex: 20,
                        minWidth: 140,
                        padding: 6,
                        background: "var(--surface)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-md)",
                        boxShadow: "var(--e-3)",
                      }}
                    >
                      <Button variant="ghost" size="sm" onClick={handleView}>
                        <IoEye size={16} />
                        Configure
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleEditFromMenu}>
                        <TbPencil size={16} />
                        Edit
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </DirectoryPanel>

        <div style={{ flex: "1 1 480px", minWidth: 0 }}>
          {selectedService ? (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "flex-start",
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: 18, color: "var(--ink)" }}>
                  {selectedService.name}
                </div>
                <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: 13 }}>
                  {rawTableRows.length}{" "}
                  {rawTableRows.length === 1 ? "category" : "categories"} ·{" "}
                  {subCategoryCount} {subCategoryCount === 1 ? "item" : "items"} ·{" "}
                  {linkedAddOnCount} {linkedAddOnCount === 1 ? "add-on" : "add-ons"} ·{" "}
                  {linkedPreferences.length}{" "}
                  {linkedPreferences.length === 1 ? "preference" : "preferences"}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setCategoryModalOpen(true)}
                >
                  Add Category
                </Button>
                <Button size="sm" onClick={() => setConfigureOpen(true)}>
                  Link prefs &amp; categories
                </Button>
              </div>
            </div>
          ) : null}

          {linkedPreferences.length ? (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginBottom: 12,
                padding: 12,
                background: "var(--canvas)",
                border: "1px solid var(--line)",
                borderRadius: "var(--r-lg)",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "var(--muted)",
                  alignSelf: "center",
                }}
              >
                Preferences
              </span>
              {linkedPreferences.map((pref) => (
                <DirectoryDotPill key={pref?.id ?? pref?.preferenceTypeId} tone="info">
                  {pref?.name || pref?.preferenceType?.name || "Preference"}
                </DirectoryDotPill>
              ))}
            </div>
          ) : selectedService ? (
            <p style={{ margin: "0 0 12px", color: "var(--muted)", fontSize: 13 }}>
              No preferences linked. Use Configure to attach preference types to this service.
            </p>
          ) : null}

          {isLoadingConfig || isConfigError ? (
            <QueryState
              loading={isLoadingConfig}
              error={configQueryError || isConfigError}
              onRetry={refetchConfig}
              errorLabel="Could not load categories for this service."
            />
          ) : (
            <ServiceCategoriesExpandableTable
              rows={rawTableRows}
              searchTerm={globalSearch}
              addOnsList={addOnsList}
              subCategoriesByServiceId={subCategoriesByServiceId}
              onViewAddOns={({ categoryName, subCategories }) =>
                setAddOnsModal({ open: true, categoryName, subCategories })
              }
              onReorderCategories={handleReorderCategories}
              onReorderSubCategories={handleReorderSubCategories}
              reorderDisabled={
                categoryReorderLoading || subReorderLoading || Boolean(globalSearch?.trim())
              }
            />
          )}
        </div>
      </div>

      <CategoryModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        type=""
        categoryData={
          selectedServiceId
            ? { serviceId: selectedServiceId, service: selectedService }
            : {}
        }
      />

      <ConfigureModal
        open={configureOpen}
        onClose={() => setConfigureOpen(false)}
        selectedServiceId={selectedServiceId}
      />

      <CategoryAddOnsModal
        open={addOnsModal.open}
        onClose={() =>
          setAddOnsModal({ open: false, categoryName: "", subCategories: [] })
        }
        categoryName={addOnsModal.categoryName}
        subCategories={addOnsModal.subCategories}
        addOnsList={addOnsList}
        subCategoriesByServiceId={subCategoriesByServiceId}
      />

      <Modal
        open={serviceModal.open}
        title={serviceModal.type === "update" ? "Update Service" : "Add Service"}
        onClose={closeServiceModal}
        secondaryLabel="Cancel"
        primaryLabel={
          saving
            ? serviceModal.type === "update"
              ? "Updating…"
              : "Adding…"
            : serviceModal.type === "update"
              ? "Update Service"
              : "Add Service"
        }
        onPrimary={() => {
          if (saving) return;
          if (serviceModal.type === "update") handleEditService();
          else handleAddService();
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <ImageField
            label="Service Image"
            value={serviceModal.image}
            onChange={(value) =>
              setServiceModal((prev) => ({ ...prev, image: value }))
            }
          />
          <Field label="Service Name" htmlFor="dash-service-name">
            <Input
              id="dash-service-name"
              name="name"
              placeholder="Service name"
              value={serviceModal.name}
              onChange={handleServiceFormChange}
            />
          </Field>
          <Field label="Description" htmlFor="dash-service-description">
            <Textarea
              id="dash-service-description"
              name="description"
              value={serviceModal.description}
              onChange={handleServiceFormChange}
            />
          </Field>
        </div>
      </Modal>
    </CatalogChrome>
  );
}
