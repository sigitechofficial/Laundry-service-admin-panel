import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  List,
  ListItem,
  Collapse,
} from "@mui/material";
import { RiDeleteBin6Line, TbPencil } from "../../shared/icons/index";
import {
  useAddServiceMutation,
  useDeleteServiceMutation,
  useEditServiceMutation,
  useGetAllServicesQuery,
} from "../../store/services/api";
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
  const services = useSelector((state) => state?.apiData?.services);
  const { isLoading } = useGetAllServicesQuery();
  const [deletService, { isLoading: deleteLoading }] =
    useDeleteServiceMutation();
  const [add, setAdd] = useState({
    image: "",
    name: "",
    description: "",
    open: false,
    type: "",
    servicesId: "",
    id: "",
  });

  const [addService, { isLoading: addServiceLoading }] =
    useAddServiceMutation();

  const [editService, { isLoading: editServiceLoading }] =
    useEditServiceMutation();

  // Handle form data population for update modal
  useEffect(() => {
    if (add.type === "update" && add.id) {
      const serviceToEdit = services?.find((service) => service.id === add.id);
      if (serviceToEdit) {
        setAdd((prev) => ({
          ...prev,
          name: serviceToEdit.name || "",
          description: serviceToEdit.description || "",
          image: BASE_URL + serviceToEdit.image || "",
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

  const handleToggle = () => {
    if (add.open) {
      // Reset form when closing
      setAdd({
        image: "",
        name: "",
        description: "",
        open: false,
        type: "",
        servicesId: "",
        id: "",
      });
    } else {
      // Just open the modal for add
      setAdd((prev) => ({ ...prev, open: true, type: "add" }));
    }
  };

  const handleUpdateClick = (service) => {
    setAdd({
      open: true,
      type: "update",
      id: service.id,
      name: service.name || "",
      description: service.description || "",
      image: service.serviceImg || "", // Load existing image
      servicesId: service.id,
    });
  };

  const handleChange = (e) => {
    setAdd((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAddService = async () => {
    const formData = new FormData();
    formData.append("name", add.name);
    formData.append("description", add.description);
    formData.append("serviceImg", add.image);

    let res = await addService(formData).unwrap();
    if (res?.status === "1") {
      handleToggle();
    } else {
      error("Something went wrong");
    }
  };

  const handleEditService = async () => {
    try {
      const formData = new FormData();
      formData.append("name", add.name);
      formData.append("description", add.description);

      if (add.image && typeof add.image !== "string") {
        formData.append("serviceImg", add.image);
      }

      let res = await editService({ id: add.id, body: formData }).unwrap();
      if (res?.status === "1") {
        handleToggle();
        success("Service updated successfully!");
      } else {
        error("Something went wrong");
      }
    } catch (error) {
      console.error("Error updating service:", error);
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
      </Box>

      {/* Content */}
      <Collapse in={true}>
        <Box sx={{ p: "12px" }}>
          <List sx={{ p: "0 8px" }}>
            {services?.map((service) => (
              <ListItem
                key={service.id}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  py: "8px",
                  px: "16px",
                  my: "8px",
                  bgcolor: "blue.10",
                  borderRadius: "4px",
                }}
              >
                {/* <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}> */}
                <Typography variant="body1">{service.name}</Typography>
                {/* </Box> */}

                <Box className="flex items-center">
                  <IconButton
                    disabled={editServiceLoading}
                    onClick={() => handleUpdateClick(service)}
                    size="small"
                  >
                    <TbPencil size="20px" />
                  </IconButton>

                  <IconButton
                    disabled={deleteLoading}
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
              setAdd((prev) => ({
                ...prev,
                image: value,
              }))
            }
          />

          <InputFieldModal
            title="Service (Service name)"
            label="Service Name"
            placeholder={"Service name"}
            name="name"
            value={add.name}
            onChange={handleChange}
          />

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
