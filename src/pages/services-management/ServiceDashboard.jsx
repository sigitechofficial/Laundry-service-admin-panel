import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import {
  useGetAllServicesQuery,
  useGetServiceWitPreferencesQuery,
  useAddServiceMutation,
  useEditServiceMutation,
} from "../../store/services/api";
import DataTable from "../../components/ui/DataTable";
import {
  TbDotsVertical,
  TbPencil,
  IoEye,
  PiHeadsetBold,
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
  const servicesCount = servicesData?.data?.servicesCount ?? {};

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
      const subCount = serviceCat?.category?.subCategories?.length ?? 0;
      rows.push({
        id: `${selectedService.id}-${serviceCat?.id}`,
        sl: sl++,
        serviceName: selectedService.name,
        category: serviceCat?.category?.name ?? "",
        description:
          (selectedService.description?.replace(/<[^>]+>/g, "") || "").slice(0, 50) +
          ((selectedService.description?.length || 0) > 50 ? "..." : ""),
        subCategoryCount: subCount,
      });
    });
    return rows;
  }, [serviceConfigData, selectedService]);

  const tableRows = useMemo(() => {
    if (!globalSearch?.trim()) return rawTableRows;
    const q = globalSearch.toLowerCase();
    return rawTableRows.filter(
      (r) =>
        r.serviceName?.toLowerCase().includes(q) ||
        r.category?.toLowerCase().includes(q) ||
        String(r.description || "").toLowerCase().includes(q)
    );
  }, [rawTableRows, globalSearch]);

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

  const columns = [
    { field: "sl", headerName: "SL", minWidth: 60 },
    { field: "serviceName", headerName: "Service name", minWidth: 140 },
    { field: "category", headerName: "Category", minWidth: 120 },
    { field: "description", headerName: "Description", minWidth: 200 },
    { field: "subCategoryCount", headerName: "Sub category count", minWidth: 140 },
  ];

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
          const count = servicesCount[service.name] ?? "—";

          return (
            <Paper
              key={service.id}
              elevation={0}
              onClick={() => setSelectedServiceId(service.id)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                px: 2.5,
                py: 1.5,
                minWidth: 220,
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
              <Box sx={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 1.5 }}>
                <Typography variant="body1" fontWeight={600} noWrap>
                  {service.name}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 24,
                    height: 20,
                    borderRadius: "50%",
                    bgcolor: isActive ? "rgba(255,255,255,0.3)" : "#EFF6FF",
                    color: isActive ? "white" : "#2563EB",
                    fontWeight: 600,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {count}
                </Typography>
              </Box>
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

      {/* Table */}
      <Box sx={{ mt: 2 }}>
        {isLoadingConfig && selectedServiceId ? (
          <MiniLoader />
        ) : (
          <DataTable
            data={tableRows}
            columns={columns}
            searchPlaceholder="Search by ID, product, or others..."
            showFilters
            showDateRange
            showDownload
            height={500}
          />
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
