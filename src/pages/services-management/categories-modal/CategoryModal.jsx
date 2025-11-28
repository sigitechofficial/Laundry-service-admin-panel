import React from "react";
import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ModalComponent from "../../../components/shared/Modal";
import InputFieldModal from "../../../components/ui/InputFieldModal";
import ImageUpload from "../../../components/ui/ImageUpload";
import TextareaField from "../../../components/ui/TextArea";
import useToaster from "../../../components/ui/Toaster";
import { useAddCategoryMutation } from "../../../store/services/api";
import { categoryValidationSchema, defaultCategoryValues } from "./constants";

export default function CategoryModal({ open, onClose }) {
  const { success, error } = useToaster();
  const [addCategory, { isLoading: isAddCategoryLoading }] =
    useAddCategoryMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(categoryValidationSchema),
    defaultValues: defaultCategoryValues,
    mode: "onChange",
  });

  const handleClose = () => {
    reset(defaultCategoryValues);
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      // Debug: Check if form data has values
      console.log("Form data from react-hook-form:", data);
      console.log("Name:", data.name);
      console.log("Description:", data.description);
      console.log("Image:", data.image);
      console.log("Image type:", typeof data.image);
      console.log("Is image File?", data.image instanceof File);

      const formdata = new FormData();
      formdata.append("name", data.name || "");
      formdata.append("description", data.description || "");
      formdata.append("CategoryImg", data.image);

      // Properly inspect FormData contents
      console.log("FormData contents:");
      for (let [key, value] of formdata.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, {
            name: value.name,
            size: value.size,
            type: value.type,
          });
        } else {
          console.log(`${key}:`, value);
        }
      }

      const res = await addCategory(formdata).unwrap();
      if (res?.status === "1") {
        success("Category added successfully!");
        handleClose();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      // Log full error for debugging
      console.error("Category add error:", err);
      console.error("Error data:", err?.data);
      console.error("Error status:", err?.status);
      console.error("Error message:", err?.data?.message);

      // Show detailed error message
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        "Failed to add category";
      error(errorMessage);
    }
  };

  return (
    <ModalComponent
      open={open}
      title="Add Category"
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: "Add Category",
        onClick: handleSubmit(onSubmit),
        isLoading: isAddCategoryLoading,
      }}
    >
      <Box className="flex flex-col gap-5">
        <Controller
          name="image"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <ImageUpload
                title="Category Image*"
                value={value}
                name="image"
                onChange={onChange}
              />
              {errors.image && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.image.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="name"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Name (Category)*"
                label="Category Name"
                placeholder="Enter category name"
                name="name"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.name && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.name.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <TextareaField
                title="Description*"
                name="description"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter category description"
              />
              {errors.description && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.description.message}
                </Typography>
              )}
            </Box>
          )}
        />
      </Box>
    </ModalComponent>
  );
}
