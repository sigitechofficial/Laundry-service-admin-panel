import React, { useEffect, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ModalComponent from "../../../components/shared/Modal";
import InputFieldModal from "../../../components/ui/InputFieldModal";
import ImageUpload from "../../../components/ui/ImageUpload";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import SelectField from "../../../components/ui/SelectField";
import useToaster from "../../../components/ui/Toaster";
import { BASE_URL } from "../../../utilities/URL";
import {
  useAddCategoryMutation,
  useEditCategoryMutation,
  useGetAllServicesQuery,
} from "../../../store/services/api";
import {
  categoryValidationSchema,
  categoryUpdateValidationSchema,
  defaultCategoryValues,
} from "./constants";

const normalizeEditorContent = (value = "") => {
  if (typeof value !== "string") return "";

  const html = value.trim();
  if (!html) return "";

  if (!/[<>]/.test(html)) {
    return html.replace(/\s+/g, " ").trim();
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const text = (doc.body?.textContent || "").replace(/\u00a0/g, " ");
  return text.replace(/\s+/g, " ").trim();
};

const resolveCategoryImageUrl = (path) => {
  if (!path) return "";
  if (path instanceof File) return path;
  const value = String(path);
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }
  if (value.startsWith("blob:") || value.startsWith("data:")) {
    return value;
  }
  return `${BASE_URL}${value.replace(/^\//, "")}`;
};

const buildCategoryFormValues = (categoryData) => ({
  name: categoryData?.name || "",
  description: categoryData?.description || "",
  serviceId: categoryData?.serviceId ?? categoryData?.service?.id ?? "",
  image: resolveCategoryImageUrl(
    categoryData?.CategoryImg ||
      categoryData?.categoryImg ||
      categoryData?.image ||
      categoryData?.img ||
      ""
  ),
});

export default function CategoryModal({ open, onClose, type, categoryData }) {
  const { success, error } = useToaster();
  const [addCategory, { isLoading: isAddCategoryLoading }] =
    useAddCategoryMutation();
  const [editCategory, { isLoading: isEditCategoryLoading }] =
    useEditCategoryMutation();
  const { data: servicesResponse } = useGetAllServicesQuery(undefined, {
    skip: !open,
  });

  const services = servicesResponse?.data?.services || [];
  const serviceOptions = useMemo(
    () =>
      services.map((svc) => ({
        label: svc.name,
        value: String(svc.id),
      })),
    [services]
  );

  const isUpdate = type === "update";
  const validationSchema = isUpdate
    ? categoryUpdateValidationSchema
    : categoryValidationSchema;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: defaultCategoryValues,
    mode: "onChange",
  });

  useEffect(() => {
    if (!open) return;

    if (isUpdate && categoryData) {
      reset(buildCategoryFormValues(categoryData));
      return;
    }

    reset(defaultCategoryValues);
  }, [open, isUpdate, categoryData, reset]);

  const handleClose = () => {
    reset(defaultCategoryValues);
    onClose();
  };

  const onInvalid = (formErrors) => {
    const firstError = Object.values(formErrors)[0];
    const message =
      firstError?.message || "Please fix the highlighted fields before saving.";
    error(message);
  };

  const onSubmit = async (data) => {
    try {
      const cleanDescription = normalizeEditorContent(data.description);
      const formdata = new FormData();
      formdata.append("name", data.name || "");
      formdata.append("description", cleanDescription);
      formdata.append("serviceId", String(data.serviceId));

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
        onClick: handleSubmit(onSubmit, onInvalid),
        isLoading: isAddCategoryLoading || isEditCategoryLoading,
      }}
    >
      <Box className="flex flex-col gap-5">
        <Controller
          name="serviceId"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <SelectField
                title="Service*"
                value={value === "" || value == null ? "" : String(value)}
                onChange={(e) => {
                  const next = e.target.value;
                  onChange(next === "" ? "" : Number(next));
                }}
                options={serviceOptions}
                placeholder="Select service for this category"
                fullWidth
                bgcolor="grey.60"
              />
              {errors.serviceId && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.serviceId.message}
                </Typography>
              )}
            </Box>
          )}
        />

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
                title={isUpdate ? "Description" : "Description*"}
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
