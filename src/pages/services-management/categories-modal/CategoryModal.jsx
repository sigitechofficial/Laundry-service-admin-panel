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
    formState: { errors, isValid },
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
      const formdata = new FormData();
      formdata.append("name", data.name);
      formdata.append("description", data.description);
      formdata.append("CategoryImg", data.image);

      const res = await addCategory(formdata).unwrap();
      if (res?.status === "1") {
        success("Category added successfully!");
        handleClose();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to add category");
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
