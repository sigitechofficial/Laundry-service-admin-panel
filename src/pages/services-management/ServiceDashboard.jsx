import { useState, useEffect, useMemo, useCallback, useRef, Fragment } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  useGetAllServicesQuery,
  useGetServiceWitPreferencesQuery,
  useGetAllAddOnServicesQuery,
  useAddServiceMutation,
  useEditServiceMutation,
  useUpdateServicesSortOrderMutation,
  useUpdateCategoriesSortOrderMutation,
  useUpdateSubCategoriesSortOrderMutation,
} from "../../store/services/api";
import {
  TbDotsVertical,
  TbPencil,
  IoEye,
  PiHeadsetBold,
  TbChevronRight,
  TbChevronDown,
} from "../../shared/icons/index";
import { TbGripVertical } from "react-icons/tb";
import Search from "../../components/ui/Search";
import {
  MdLocalLaundryService,
  MdDryCleaning,
  MdCheckroom,
} from "react-icons/md";
import { TbIroning, TbTools, TbWash } from "react-icons/tb";
import { HiOutlineSparkles } from "react-icons/hi";
import ModalComponent from "../../components/shared/Modal";
import InputFieldModal from "../../components/ui/InputFieldModal";
import TextareaField from "../../components/ui/TextArea";
import ImageUpload from "../../components/ui/ImageUpload";
import useToaster from "../../components/ui/Toaster";
import { BASE_URL } from "../../utilities/URL";
import { Delay, MiniLoader } from "../../components/shared/Loaders";
import CategoryAddOnsModal from "./CategoryAddOnsModal";
import {
  buildSubCategoriesByServiceId,
  getAddOnsForCategoryRow,
  normalizeAddOnServicesList,
} from "./serviceAddOnsUtils";
import FiltersButton from "../../components/ui/FiltersButton";

// Service name patterns → icons (matches Figma laundry design intent)
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

const MAIN_TABLE_HEAD_SX = {
  fontWeight: 600,
  fontSize: 14,
  fontFamily: "Inter, sans-serif",
  color: "#101828",
  bgcolor: "#FAFAFA",
  borderBottom: "1px solid #E5E7EB",
  py: 1.5,
  px: 2,
  whiteSpace: "nowrap",
  lineHeight: 1.4,
};

const NESTED_TABLE_HEAD_SX = {
  fontWeight: 600,
  fontSize: 13,
  fontFamily: "Inter, sans-serif",
  color: "#64748B",
  bgcolor: "#F1F5F9",
  borderBottom: "1px solid #E2E8F0",
  py: 1,
  px: 1.5,
  whiteSpace: "nowrap",
};

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
    } catch {
      setCategoryOrder(null);
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
    } catch {
      setSubOrderByCategory((prev) => {
        const copy = { ...prev };
        delete copy[categoryId];
        return copy;
      });
    }
  };

  if (!filteredRows.length) {
    return (
      <Paper
        sx={{
          borderRadius: 2,
          border: "1px solid #E5E7EB",
          p: 4,
          textAlign: "center",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No categories found for this service.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        width: "100%",
        borderRadius: 2,
        border: "1px solid #E5E7EB",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <Typography
        variant="caption"
        sx={{ display: "block", px: 2, pt: 1.5, color: "#64748B", fontFamily: "Inter, sans-serif" }}
      >
        Drag the grip handle to reorder categories and sub-categories.
      </Typography>
      <Box sx={{ maxHeight: 520, overflow: "auto" }}>
        <Table
          stickyHeader
          sx={{
            width: "100%",
            minWidth: 940,
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: 44 }} />
            <col style={{ width: 48 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "12%" }} />
            <col />
            <col style={{ width: 148 }} />
            <col style={{ width: 120 }} />
          </colgroup>
          <TableHead>
            <TableRow>
              <TableCell sx={{ ...MAIN_TABLE_HEAD_SX, width: 44, px: 1 }} />
              <TableCell sx={{ ...MAIN_TABLE_HEAD_SX, width: 48, px: 1 }} />
              <TableCell sx={{ ...MAIN_TABLE_HEAD_SX, width: 56 }} align="center">
                SL
              </TableCell>
              <TableCell sx={MAIN_TABLE_HEAD_SX} align="left">
                Category
              </TableCell>
              <TableCell sx={MAIN_TABLE_HEAD_SX} align="left">
                Service
              </TableCell>
              <TableCell sx={MAIN_TABLE_HEAD_SX} align="left">
                Description
              </TableCell>
              <TableCell sx={{ ...MAIN_TABLE_HEAD_SX, width: 148 }} align="right">
                Sub-categories
              </TableCell>
              <TableCell sx={{ ...MAIN_TABLE_HEAD_SX, width: 120 }} align="center">
                Add-ons
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
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
                  ? "rgba(21, 112, 239, 0.08)"
                  : idx % 2 === 0
                    ? "#fff"
                    : "#FAFAFA";

              return (
                <Fragment key={row.id}>
                  <TableRow
                    hover
                    onDragOver={(e) => {
                      if (reorderDisabled) return;
                      e.preventDefault();
                      setDragOverCategoryId(row.id);
                    }}
                    onDragLeave={() => setDragOverCategoryId(null)}
                    onDrop={(e) => handleCategoryDrop(e, row.id)}
                    onClick={() => toggleRow(row.id)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: rowBg,
                      "&:hover": { bgcolor: "#F0F4FF" },
                    }}
                  >
                    <TableCell
                      sx={{ py: 1.5, borderBottom: "1px solid #E5E7EB", px: 0.5 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Box
                        draggable={!reorderDisabled && !searchTerm?.trim()}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/category", String(row.id));
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          cursor: reorderDisabled ? "not-allowed" : "grab",
                          color: "#94A3B8",
                          "&:active": { cursor: "grabbing" },
                        }}
                        aria-label="Drag to reorder category"
                      >
                        <TbGripVertical size={18} />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ py: 1.5, borderBottom: "1px solid #E5E7EB" }}>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRow(row.id);
                        }}
                        sx={{ color: "#64748B" }}
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? <TbChevronDown size={18} /> : <TbChevronRight size={18} />}
                      </IconButton>
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        py: 1.5,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        borderBottom: "1px solid #E5E7EB",
                      }}
                    >
                      {idx + 1}
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.5,
                        fontWeight: 600,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        color: "#101828",
                        borderBottom: "1px solid #E5E7EB",
                      }}
                    >
                      {row.category}
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.5,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        borderBottom: "1px solid #E5E7EB",
                      }}
                    >
                      {row.serviceName}
                    </TableCell>
                    <TableCell
                      sx={{
                        py: 1.5,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        color: "#64748B",
                        borderBottom: "1px solid #E5E7EB",
                        whiteSpace: "normal",
                        maxWidth: 320,
                      }}
                    >
                      {row.description}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        py: 1.5,
                        fontFamily: "Inter, sans-serif",
                        fontSize: 14,
                        color: "#64748B",
                        borderBottom: "1px solid #E5E7EB",
                      }}
                    >
                      {subItems.length}
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        py: 1.5,
                        borderBottom: "1px solid #E5E7EB",
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FiltersButton
                        text={
                          addOnCount > 0 ? `View (${addOnCount})` : "View"
                        }
                        variant="blue"
                        onClick={() =>
                          onViewAddOns?.({
                            categoryName: row.category,
                            subCategories: subItems,
                          })
                        }
                        boxShadow="none"
                        border="none"
                      />
                    </TableCell>
                  </TableRow>

                  {isOpen && (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        sx={{
                          p: 0,
                          borderBottom: "1px solid #E5E7EB",
                          bgcolor: "#F8FAFC",
                        }}
                      >
                        <Box sx={{ px: 2, py: 1.5, pl: 7 }}>
                          {subItems.length === 0 ? (
                            <Typography variant="body2" sx={{ color: "#94A3B8", fontSize: 13, py: 1 }}>
                              No sub-categories configured.
                            </Typography>
                          ) : (
                            <Table
                              size="small"
                              sx={{
                                border: "1px solid #E2E8F0",
                                borderRadius: 1,
                                overflow: "hidden",
                                bgcolor: "#fff",
                                "& .MuiTableCell-root": {
                                  fontFamily: "Inter, sans-serif",
                                  fontSize: 13,
                                  py: 1,
                                  px: 1.5,
                                  borderBottom: "1px solid #E2E8F0",
                                },
                                "& .MuiTableRow-root:last-child .MuiTableCell-root": {
                                  borderBottom: "none",
                                },
                              }}
                            >
                              <TableHead>
                                <TableRow>
                                  <TableCell sx={{ ...NESTED_TABLE_HEAD_SX, width: 40 }} />
                                  <TableCell sx={NESTED_TABLE_HEAD_SX}>Sub-category</TableCell>
                                  <TableCell sx={NESTED_TABLE_HEAD_SX} align="right">
                                    Price
                                  </TableCell>
                                  <TableCell sx={NESTED_TABLE_HEAD_SX} width={100}>
                                    Status
                                  </TableCell>
                                  <TableCell sx={NESTED_TABLE_HEAD_SX}>Description</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {subItems.map((sub, subIdx) => {
                                  const subKey = `${row.categoryId}-${sub.id}`;
                                  return (
                                    <TableRow
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
                                      sx={{
                                        bgcolor:
                                          dragOverSubKey === subKey
                                            ? "rgba(21, 112, 239, 0.08)"
                                            : "inherit",
                                      }}
                                    >
                                      <TableCell sx={{ width: 40, px: 0.5 }}>
                                        <Box
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
                                          sx={{
                                            display: "flex",
                                            color: "#94A3B8",
                                            cursor: reorderDisabled
                                              ? "not-allowed"
                                              : "grab",
                                          }}
                                          aria-label="Drag to reorder sub-category"
                                        >
                                          <TbGripVertical size={16} />
                                        </Box>
                                      </TableCell>
                                      <TableCell sx={{ color: "#101828", fontWeight: 500 }}>
                                        {sub.name ?? "—"}
                                      </TableCell>
                                      <TableCell align="right" sx={{ fontWeight: 600, color: "#000099" }}>
                                        £{Number(sub.price ?? 0).toFixed(2)}
                                      </TableCell>
                                      <TableCell>
                                        <Typography
                                          component="span"
                                          sx={{
                                            fontSize: 12,
                                            fontWeight: 600,
                                            color: sub.status ? "#059669" : "#94A3B8",
                                          }}
                                        >
                                          {sub.status ? "Active" : "Inactive"}
                                        </Typography>
                                      </TableCell>
                                      <TableCell sx={{ color: "#64748B", whiteSpace: "normal" }}>
                                        {sub.description ?? "—"}
                                      </TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Box>
    </Paper>
  );
}

export default function ServiceDashboard() {
  const navigate = useNavigate();
  const [selectedServiceId, setSelectedServiceId] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [anchorEl, setAnchorEl] = useState(null);
  const [menuServiceId, setMenuServiceId] = useState(null);
  const [serviceModal, setServiceModal] = useState({
    open: false,
    type: "add",
    id: "",
    name: "",
    description: "",
    image: "",
  });

  const { success, error } = useToaster();
  const { data: servicesData, isLoading: isLoadingServices, refetch: refetchServices } =
    useGetAllServicesQuery();
  const services = servicesData?.data?.services ?? [];

  const { data: serviceConfigData, isLoading: isLoadingConfig } =
    useGetServiceWitPreferencesQuery(selectedServiceId, {
      skip: !selectedServiceId,
    });

  const { data: addOnsResponse } = useGetAllAddOnServicesQuery();
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
          image: s.image ? BASE_URL + s.image : "",
        }));
      }
    }
  }, [serviceModal.type, serviceModal.id, orderedServices]);

  const selectedService = orderedServices?.find((s) => s.id === selectedServiceId);

  const rawTableRows = useMemo(() => {
    if (!serviceConfigData?.data?.serviceCategoriesData || !selectedService)
      return [];
    const rows = [];
    let sl = 1;
    serviceConfigData.data.serviceCategoriesData.forEach((serviceCat) => {
      const subCategories = serviceCat?.category?.subCategories ?? [];
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
  }, [serviceConfigData, selectedService]);

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
      } catch {
        setServiceDragOrder(null);
        error("Could not save service order.");
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

  const handleMenuOpen = (e, serviceId) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
    setMenuServiceId(serviceId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuServiceId(null);
  };

  const handleView = () => {
    if (menuServiceId) {
      navigate("/services-management/configure-services");
    }
    handleMenuClose();
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
        image: s.image ? BASE_URL + s.image : "",
      });
    }
    handleMenuClose();
  };

  const openAddModal = () => {
    setServiceModal({
      open: true,
      type: "add",
      id: "",
      name: "",
      description: "",
      image: "",
    });
  };

  const openEditModal = (service) => {
    if (service) {
      setServiceModal({
        open: true,
        type: "update",
        id: service.id,
        name: service.name || "",
        description: service.description || "",
        image: service.image ? BASE_URL + service.image : "",
      });
    }
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
    } catch {
      error("Something went wrong");
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
    } catch {
      error("Failed to update service");
    }
  };

  if (isLoadingServices) return <Delay />;

  return (
    <div className="w-full !space-y-6">
      {/* Header: Title, Search, Filters, Buttons - matching other tabs */}
      <Box className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-wrap">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <PiHeadsetBold size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
            Services Management
          </Typography>
        </Box>

        <Box className="flex items-center gap-x-5 flex-wrap">
          <Box sx={{ width: 320 }}>
            <Search
              placeholder="Q Search"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
            />
          </Box>
        </Box>
      </Box>

      {/* Service chips — drag grip to reorder */}
      <Typography
        variant="caption"
        sx={{ color: "#64748B", fontFamily: "Inter, sans-serif", display: "block", mb: -0.5 }}
      >
        Drag the grip on a service chip to change tab order.
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          overflowX: "auto",
          pb: 1,
          "&::-webkit-scrollbar": { height: 6 },
          "&::-webkit-scrollbar-thumb": { bgcolor: "#ccc", borderRadius: 3 },
        }}
      >
        {orderedServices?.map((service) => {
          const IconComponent = getServiceIcon(service.name);
          const isActive = selectedServiceId === service.id;

          return (
            <Paper
              key={service.id}
              elevation={0}
              onClick={() => setSelectedServiceId(service.id)}
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
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1.5,
                px: 2.5,
                py: 1.5,
                width: "fit-content",
                flexShrink: 0,
                cursor: "pointer",
                bgcolor:
                  dragOverServiceId === service.id
                    ? "rgba(21, 112, 239, 0.12)"
                    : isActive
                      ? "#000099"
                      : "white",
                color: isActive ? "white" : "grey.800",
                border: "1px solid",
                borderColor:
                  dragOverServiceId === service.id
                    ? "#1570EF"
                    : isActive
                      ? "#000099"
                      : "#E5E7EB",
                borderRadius: 2,
                boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.08)",
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: "#000099",
                  bgcolor: isActive ? "#000099" : "#F9FAFB",
                },
              }}
            >
              <Box
                draggable={!serviceReorderLoading}
                onDragStart={(e) => {
                  e.stopPropagation();
                  draggingServiceIdRef.current = service.id;
                  e.dataTransfer.setData("text/plain", String(service.id));
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={(e) => e.stopPropagation()}
                sx={{
                  display: "flex",
                  color: isActive ? "rgba(255,255,255,0.85)" : "#94A3B8",
                  cursor: serviceReorderLoading ? "not-allowed" : "grab",
                  "&:active": { cursor: "grabbing" },
                }}
                aria-label="Drag to reorder service"
              >
                <TbGripVertical size={18} />
              </Box>
              <IconComponent size={24} color={isActive ? "#fff" : "#10B981"} />
              <Typography
                variant="body1"
                fontWeight={600}
                sx={{
                  whiteSpace: "nowrap",
                  overflow: "visible",
                  textOverflow: "clip",
                }}
              >
                {service.name}
              </Typography>
              <IconButton
                size="small"
                onClick={(e) => handleMenuOpen(e, service.id)}
                sx={{ color: isActive ? "white" : "grey.600" }}
              >
                <TbDotsVertical size={18} />
              </IconButton>
            </Paper>
          );
        })}
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={handleView}>
          <IoEye size={18} style={{ marginRight: 8 }} />
          View
        </MenuItem>
        <MenuItem onClick={handleEditFromMenu}>
          <TbPencil size={18} style={{ marginRight: 8 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: "error.main" }}>
          Delete
        </MenuItem>
      </Menu>

      {/* Expandable categories table */}
      <Box sx={{ mt: 2 }}>
        {isLoadingConfig && selectedServiceId ? (
          <MiniLoader />
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
      </Box>

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

      <ModalComponent
        open={serviceModal.open}
        title={serviceModal.type === "update" ? "Update Service" : "ADD SERVICE"}
        onClose={closeServiceModal}
        secondaryAction={{ label: "Cancel", onClick: closeServiceModal }}
        primaryAction={{
          label:
            serviceModal.type === "update" ? "Update Service" : "Add Service",
          onClick:
            serviceModal.type === "update" ? handleEditService : handleAddService,
          isLoading: addServiceLoading || editServiceLoading,
        }}
      >
        <Box className="flex flex-col gap-5">
          <ImageUpload
            title="Service Image"
            value={serviceModal.image}
            onChange={(value) =>
              setServiceModal((prev) => ({ ...prev, image: value }))
            }
          />
          <InputFieldModal
            title="Service (Service name)"
            label="Service Name"
            placeholder="Service name"
            name="name"
            value={serviceModal.name}
            onChange={handleServiceFormChange}
          />
          <TextareaField
            title="Description"
            name="description"
            value={serviceModal.description}
            onChange={handleServiceFormChange}
          />
        </Box>
      </ModalComponent>
    </div>
  );
}
