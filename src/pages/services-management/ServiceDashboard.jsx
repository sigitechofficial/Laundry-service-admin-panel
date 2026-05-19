import { useState, useEffect, useMemo, Fragment } from "react";
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
  useAddServiceMutation,
  useEditServiceMutation,
} from "../../store/services/api";
import {
  TbDotsVertical,
  TbPencil,
  IoEye,
  PiHeadsetBold,
  TbChevronRight,
  TbChevronDown,
} from "../../shared/icons/index";
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

function ServiceCategoriesExpandableTable({ rows, searchTerm }) {
  const [expanded, setExpanded] = useState({});

  const filteredRows = useMemo(() => {
    if (!searchTerm?.trim()) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter(
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
  }, [rows, searchTerm]);

  useEffect(() => {
    if (!searchTerm?.trim()) return;
    const q = searchTerm.toLowerCase();
    setExpanded((prev) => {
      const next = { ...prev };
      filteredRows.forEach((r) => {
        if (r.subCategories?.some((sub) => String(sub?.name || "").toLowerCase().includes(q))) {
          next[r.id] = true;
        }
      });
      return next;
    });
  }, [searchTerm, filteredRows]);

  const toggleRow = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
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
      <Box sx={{ maxHeight: 520, overflow: "auto" }}>
        <Table
          stickyHeader
          sx={{
            width: "100%",
            minWidth: 900,
            tableLayout: "fixed",
          }}
        >
          <colgroup>
            <col style={{ width: 48 }} />
            <col style={{ width: 56 }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "14%" }} />
            <col />
            <col style={{ width: 148 }} />
          </colgroup>
          <TableHead>
            <TableRow>
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
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredRows.map((row, idx) => {
              const isOpen = Boolean(expanded[row.id]);
              const subItems = row.subCategories ?? [];
              const rowBg = idx % 2 === 0 ? "#fff" : "#FAFAFA";

              return (
                <Fragment key={row.id}>
                  <TableRow
                    hover
                    onClick={() => toggleRow(row.id)}
                    sx={{
                      cursor: "pointer",
                      bgcolor: rowBg,
                      "&:hover": { bgcolor: "#F0F4FF" },
                    }}
                  >
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
                      {row.sl}
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
                  </TableRow>

                  {isOpen && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
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
                                {subItems.map((sub, subIdx) => (
                                  <TableRow key={sub.id ?? `${sub.name}-${subIdx}`}>
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
                                ))}
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

  const [addService, { isLoading: addServiceLoading }] = useAddServiceMutation();
  const [editService, { isLoading: editServiceLoading }] =
    useEditServiceMutation();

  useEffect(() => {
    if (services?.length && !selectedServiceId) {
      setSelectedServiceId(services[0]?.id);
    }
  }, [services, selectedServiceId]);

  useEffect(() => {
    if (serviceModal.type === "update" && serviceModal.id) {
      const s = services?.find((sv) => sv.id === serviceModal.id);
      if (s) {
        setServiceModal((prev) => ({
          ...prev,
          name: s.name || "",
          description: s.description || "",
          image: s.image ? BASE_URL + s.image : "",
        }));
      }
    }
  }, [serviceModal.type, serviceModal.id, services]);

  const selectedService = services?.find((s) => s.id === selectedServiceId);

  const rawTableRows = useMemo(() => {
    if (!serviceConfigData?.data?.serviceCategoriesData || !selectedService)
      return [];
    const rows = [];
    let sl = 1;
    serviceConfigData.data.serviceCategoriesData.forEach((serviceCat) => {
      const subCategories = serviceCat?.category?.subCategories ?? [];
      const categoryDescription = serviceCat?.category?.description ?? "";
      rows.push({
        id: `${selectedService.id}-${serviceCat?.id}`,
        sl: sl++,
        serviceName: selectedService.name,
        category: serviceCat?.category?.name ?? "",
        description: categoryDescription.replace(/<[^>]+>/g, "") || "—",
        subCategories,
      });
    });
    return rows;
  }, [serviceConfigData, selectedService]);

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
    const s = services?.find((sv) => sv.id === menuServiceId);
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

      {/* Service Category Cards */}
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
        {services?.map((service) => {
          const IconComponent = getServiceIcon(service.name);
          const isActive = selectedServiceId === service.id;

          return (
            <Paper
              key={service.id}
              elevation={0}
              onClick={() => setSelectedServiceId(service.id)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 2,
                px: 2.5,
                py: 1.5,
                width: "fit-content",
                flexShrink: 0,
                cursor: "pointer",
                bgcolor: isActive ? "#000099" : "white",
                color: isActive ? "white" : "grey.800",
                border: "1px solid",
                borderColor: isActive ? "#000099" : "#E5E7EB",
                borderRadius: 2,
                boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.08)",
                transition: "all 0.2s",
                "&:hover": { borderColor: "#000099", bgcolor: isActive ? "#000099" : "#F9FAFB" },
              }}
            >
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
          <ServiceCategoriesExpandableTable rows={rawTableRows} searchTerm={globalSearch} />
        )}
      </Box>

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
