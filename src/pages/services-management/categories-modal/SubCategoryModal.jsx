import React, { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import ModalComponent from "../../../components/shared/Modal";
import InputFieldModal from "../../../components/ui/InputFieldModal";
import RichTextEditor from "../../../components/ui/RichTextEditor";
import useToaster from "../../../components/ui/Toaster";
import {
  useAddSubCategoryMutation,
  useEditSubCategoryMutation,
} from "../../../store/services/api";
import {
  categorySubValidationSchema,
  defaultSubCategoryValues,
} from "./constants";

export default function SubCategoryModal({
  open,
  onClose,
  categoryData,
  type,
}) {
  const { success, error } = useToaster();

  const [addSubCategory, { isLoading: isAddSubCategoryLoading }] =
    useAddSubCategoryMutation();

  const [editSubCategory] = useEditSubCategoryMutation();

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

  const isUpdate = type === "update";

  const onSubmit = async (data) => {
    try {
      const formData = {
        name: data.subCategory,
        description: data.description,
        price: parseFloat(data.price),
        status: true,
        categoryId: categoryData?.id,
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
      const apiData = {
        name: data.subCategory,
        description: data.description,
        price: parseFloat(data.price),
        status: true,
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
    }
  }, [categoryData, open, setValue, isUpdate]);

  const handleClose = () => {
    reset(defaultSubCategoryValues);
    onClose();
  };

  return (
    <ModalComponent
      open={open || isUpdate}
      title={type === "update" ? "Update Sub Category" : "Add Sub Category"}
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: type === "update" ? "Update" : "Add Sub Category",
        onClick: handleSubmit(isUpdate ? UpdateSubCategory : onSubmit),
        isLoading: isAddSubCategoryLoading,
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
