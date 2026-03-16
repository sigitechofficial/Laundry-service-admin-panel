import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ModalComponent from "../../../components/shared/Modal";
import InputFieldModal from "../../../components/ui/InputFieldModal";
import ImageUpload from "../../../components/ui/ImageUpload";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import useToaster from "../../../components/ui/Toaster";
import {
  useAddCategoryMutation,
  useEditCategoryMutation,
} from "../../../store/services/api";
import { categoryValidationSchema, defaultCategoryValues } from "./constants";

const normalizeEditorContent = (value = "") => {
  if (typeof value !== "string") return "";

  const html = value.trim();
  if (!html) return "";

  // If editor returned plain text, use it directly.
  if (!/[<>]/.test(html)) {
    return html.replace(/\s+/g, " ").trim();
  }

  // Convert rich text HTML to clean plain text for API payloads.
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const text = (doc.body?.textContent || "").replace(/\u00a0/g, " ");
  return text.replace(/\s+/g, " ").trim();
};

export default function CategoryModal({ open, onClose, type, categoryData }) {
  const { success, error } = useToaster();
  const [addCategory, { isLoading: isAddCategoryLoading }] =
    useAddCategoryMutation();
  const [editCategory, { isLoading: isEditCategoryLoading }] =
    useEditCategoryMutation();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(categoryValidationSchema),
    defaultValues: defaultCategoryValues,
    mode: "onChange",
  });

  const isUpdate = type === "update";

  useEffect(() => {
    if (!open) return;

    if (isUpdate && categoryData) {
      setValue("name", categoryData?.name || "");
      setValue("description", categoryData?.description || "");
      setValue(
        "image",
        categoryData?.CategoryImg ||
          categoryData?.categoryImg ||
          categoryData?.image ||
          categoryData?.img ||
          ""
      );
      return;
    }

    reset(defaultCategoryValues);
  }, [open, isUpdate, categoryData, reset, setValue]);

  const handleClose = () => {
    reset(defaultCategoryValues);
    onClose();
  };

  const onSubmit = async (data) => {
    try {
      const cleanDescription = normalizeEditorContent(data.description);
      const formdata = new FormData();
      formdata.append("name", data.name || "");
      formdata.append("description", cleanDescription);

      if (isUpdate) {
        if (data.image instanceof File) {
          formdata.append("CategoryImg", data.image);
        }
      } else {
        formdata.append("CategoryImg", data.image);
      }

      const res = isUpdate
        ? await editCategory({
            categoryId: categoryData?.id,
            body: formdata,
          }).unwrap()
        : await addCategory(formdata).unwrap();

      if (res?.status === "1") {
        success(
          isUpdate
            ? "Category updated successfully!"
            : "Category added successfully!"
        );
        handleClose();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        (isUpdate ? "Failed to update category" : "Failed to add category");
      error(errorMessage);
    }
  };

  return (
    <ModalComponent
      open={open}
      title={isUpdate ? "Update Category" : "Add Category"}
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: isUpdate ? "Update Category" : "Add Category",
        onClick: handleSubmit(onSubmit),
        isLoading: isAddCategoryLoading || isEditCategoryLoading,
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
              <RichTextEditor
                title="Description*"
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
