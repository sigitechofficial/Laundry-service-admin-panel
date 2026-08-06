import React, { useEffect } from "react";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  Chip,
} from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ModalComponent from "../../../components/shared/Modal";
import InputFieldModal from "../../../components/ui/InputFieldModal";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import useToaster from "../../../components/ui/Toaster";
import {
  useAddSubCategoryMutation,
  useEditSubCategoryMutation,
  useGetAllAddOnCategoriesQuery,
} from "../../../store/services/api";
import {
  categorySubValidationSchema,
  defaultSubCategoryValues,
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

export default function SubCategoryModal({
  open,
  onClose,
  categoryData,
  type,
}) {
  const { success, error } = useToaster();

  const [addSubCategory, { isLoading: isAddSubCategoryLoading }] =
    useAddSubCategoryMutation();

  const [editSubCategory, { isLoading: isEditSubCategoryLoading }] =
    useEditSubCategoryMutation();

  const { data: addOnCategoriesData } = useGetAllAddOnCategoriesQuery({
    includeServices: false,
  });

  const addOnCategoryOptions = (() => {
    const list =
      addOnCategoriesData?.data?.addOnCategories ||
      addOnCategoriesData?.data ||
      [];
    return Array.isArray(list)
      ? list.map((c) => ({ value: String(c.id), label: c.name }))
      : [];
  })();

  const addOnCategoryLabel = (id) =>
    addOnCategoryOptions.find((o) => o.value === String(id))?.label || id;

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(categorySubValidationSchema),
    defaultValues: defaultSubCategoryValues,
    mode: "onChange",
  });

  const isUpdate = open && type === "update";

  const onSubmit = async (data) => {
    try {
      const cleanDescription = normalizeEditorContent(data.description);
      const formData = {
        name: data.subCategory,
        description: cleanDescription,
        price: parseFloat(data.price),
        unitCount: Number.parseInt(String(data.unitCount || 1), 10) || 1,
        status: true,
        categoryId: categoryData?.id,
        addOnCategoryIds: (data.addOnCategoryIds || []).map((id) => Number(id)),
      };

      const res = await addSubCategory([formData]).unwrap();
      if (res?.status === "1") {
        success("Sub-category added successfully!");
        handleClose();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to add sub-category");
    }
  };

  
  const UpdateSubCategory = async (data) => {
    try {
      const cleanDescription = normalizeEditorContent(data.description);
      const apiData = {
        name: data.subCategory,
        description: cleanDescription,
        price: parseFloat(data.price),
        unitCount: Number.parseInt(String(data.unitCount || 1), 10) || 1,
        status: true,
        addOnCategoryIds: (data.addOnCategoryIds || []).map((id) => Number(id)),
      };

      const res = await editSubCategory({
        subCatId: categoryData?.subCatId || categoryData?.id,
        body: apiData
      }).unwrap();
      
      if (res?.status === "1") {
        success("Sub-category updated successfully!");
        handleClose();
      } else {
        error(res?.message || "Something went wrong");
      }
    } catch (err) {
      error(err?.data?.message || "Failed to update sub-category");
    }
  };

  useEffect(() => {
    if (categoryData) {
      const categoryName = isUpdate
        ? categoryData?.categoryName
        : categoryData?.name;
      setValue("category", categoryName || "");

      const subCategoryName = isUpdate ? categoryData?.name : "";
      setValue("subCategory", subCategoryName || "");

      setValue("description", isUpdate ? categoryData?.description || "" : "");
      setValue("price", categoryData?.price || "");
      setValue(
        "unitCount",
        isUpdate
          ? categoryData?.unitCount ?? categoryData?.unit_count ?? 1
          : 1
      );

      const linkedAddOnCategories = isUpdate
        ? categoryData?.addOnCategories
        : null;
      const linkedIds = Array.isArray(linkedAddOnCategories)
        ? linkedAddOnCategories.map((c) => String(c.id))
        : [];
      setValue("addOnCategoryIds", linkedIds);
    }
  }, [categoryData, open, setValue, isUpdate]);

  const handleClose = () => {
    reset(defaultSubCategoryValues);
    onClose();
  };

  return (
    <ModalComponent
      open={open}
      title={type === "update" ? "Update Sub Category" : "Add Sub Category"}
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: type === "update" ? "Update" : "Add Sub Category",
        onClick: handleSubmit(isUpdate ? UpdateSubCategory : onSubmit),
        isLoading: isAddSubCategoryLoading || isEditSubCategoryLoading,
      }}
    >
      <Box className="flex flex-col gap-5">
        <Controller
          name="category"
          control={control}
          render={({ field: { value } }) => (
            <Box>
              <InputFieldModal
                title="Category"
                label="Category Name"
                placeholder="Category"
                name="category"
                value={value}
                disabled={true}
              />
            </Box>
          )}
        />

        <Controller
          name="subCategory"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Sub Category"
                name="subCategory"
                placeholder="Sub category name"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.subCategory && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.subCategory.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="addOnCategoryIds"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <Typography
                variant="body2"
                sx={{ color: "#374151", mb: "8px" }}
              >
                Add-on / Repair Categories
              </Typography>
              <FormControl fullWidth size="small">
                <Select
                  multiple
                  displayEmpty
                  value={Array.isArray(value) ? value : []}
                  onChange={(e) =>
                    onChange(
                      typeof e.target.value === "string"
                        ? e.target.value.split(",")
                        : e.target.value
                    )
                  }
                  renderValue={(selected) => {
                    if (!selected || selected.length === 0) {
                      return (
                        <Typography sx={{ color: "#9CA3AF" }}>
                          No add-on categories
                        </Typography>
                      );
                    }
                    return (
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                        {selected.map((id) => (
                          <Chip
                            key={id}
                            label={addOnCategoryLabel(id)}
                            size="small"
                          />
                        ))}
                      </Box>
                    );
                  }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 320 } } }}
                  sx={{
                    bgcolor: "#F4F7FF",
                    borderRadius: "8px",
                    fontFamily: "Switzer",
                    "& fieldset": { border: "none" },
                    "& .MuiSelect-select": { minHeight: "36px", py: "8px" },
                  }}
                >
                  {addOnCategoryOptions.length === 0 ? (
                    <MenuItem disabled value="">
                      No categories available
                    </MenuItem>
                  ) : (
                    addOnCategoryOptions.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        <Checkbox
                          checked={
                            Array.isArray(value) &&
                            value.indexOf(opt.value) > -1
                          }
                        />
                        <ListItemText primary={opt.label} />
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Box>
          )}
        />

        <Controller
          name="price"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Price"
                type="number"
                name="price"
                placeholder="Enter price"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.price && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.price.message}
                </Typography>
              )}
            </Box>
          )}
        />

        <Controller
          name="unitCount"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Box>
              <InputFieldModal
                title="Unit count"
                type="number"
                name="unitCount"
                placeholder="e.g. items per unit"
                value={value}
                onChange={(e) => onChange(e.target.value)}
              />
              {errors.unitCount && (
                <Typography
                  variant="caption"
                  sx={{ color: "error.main", mt: 1, display: "block" }}
                >
                  {errors.unitCount.message}
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
                title="Description"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter description"
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
