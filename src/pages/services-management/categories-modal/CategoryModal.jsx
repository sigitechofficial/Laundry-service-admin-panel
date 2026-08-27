import { useEffect, useMemo, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Button, Field, Input, Textarea, Select, Modal } from "../../../design-system";
import useToaster from "../../../components/ui/Toaster";
import { joinMediaUrl } from "../../../utilities/formatters";
import {
  IMAGE_UPLOAD_ACCEPT,
  acceptImageFile,
} from "../../../utilities/imageUploadPolicy";
import { getApiErrorMessage } from "../../../store/services/apiErrors";
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
  return joinMediaUrl(String(path));
};

const buildCategoryFormValues = (categoryData) => ({
  name: categoryData?.name || "",
  description: normalizeEditorContent(categoryData?.description || ""),
  serviceId: categoryData?.serviceId ?? categoryData?.service?.id ?? "",
  status: categoryData?.status !== false,
  image: resolveCategoryImageUrl(
    categoryData?.CategoryImg ||
      categoryData?.categoryImg ||
      categoryData?.image ||
      categoryData?.img ||
      ""
  ),
});

function ImageField({ label, value, onChange, error }) {
  const { error: toastError } = useToaster();
  const fileInputRef = useRef(null);
  const src =
    !value ? "" : typeof value === "string" ? value : URL.createObjectURL(value);

  return (
    <Field label={label} hint="JPEG, PNG, GIF, or WebP. Max 5MB." error={error}>
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
            alt="Category preview"
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

export default function CategoryModal({ open, onClose, type, categoryData }) {
  const { success, error } = useToaster();
  const [addCategory, { isLoading: isAddCategoryLoading }] =
    useAddCategoryMutation();
  const [editCategory, { isLoading: isEditCategoryLoading }] =
    useEditCategoryMutation();
  const { data: servicesResponse } = useGetAllServicesQuery(undefined, {
    skip: !open,
  });

  const services = useMemo(
    () => servicesResponse?.data?.services || [],
    [servicesResponse?.data?.services]
  );
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
  const saving = isAddCategoryLoading || isEditCategoryLoading;

  const {
    control,
    handleSubmit,
    reset,
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
      formdata.append("status", String(Boolean(data.status)));

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
      error(
        getApiErrorMessage(
          err,
          isUpdate ? "Failed to update category" : "Failed to add category"
        )
      );
    }
  };

  return (
    <Modal
      open={open}
      title={isUpdate ? "Update Category" : "Add Category"}
      onClose={handleClose}
      secondaryLabel="Cancel"
      primaryLabel={
        saving
          ? "Saving…"
          : isUpdate
            ? "Update Category"
            : "Add Category"
      }
      onPrimary={() => {
        if (saving) return;
        handleSubmit(onSubmit, onInvalid)();
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        <Controller
          name="serviceId"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Service*" error={errors.serviceId?.message}>
              <Select
                value={value === "" || value == null ? "" : String(value)}
                onChange={(next) => onChange(next === "" ? "" : Number(next))}
                options={serviceOptions}
                placeholder="Select service for this category"
                error={!!errors.serviceId}
              />
            </Field>
          )}
        />

        <Controller
          name="image"
          control={control}
          render={({ field: { onChange, value } }) => (
            <ImageField
              label="Category Image*"
              value={value}
              onChange={onChange}
              error={errors.image?.message}
            />
          )}
        />

        <Controller
          name="name"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Name (Category)*" htmlFor="category-name" error={errors.name?.message}>
              <Input
                id="category-name"
                name="name"
                placeholder="Enter category name"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!errors.name}
              />
            </Field>
          )}
        />

        <Controller
          name="status"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Availability">
              <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  checked={Boolean(value)}
                  onChange={(e) => onChange(e.target.checked)}
                />
                Enabled in customer/agent apps
              </label>
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field
              label={isUpdate ? "Description" : "Description*"}
              error={errors.description?.message}
            >
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter category description"
                rows={5}
              />
            </Field>
          )}
        />
      </div>
    </Modal>
  );
}
