import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Badge, Field, Input, Textarea, Modal } from "../../../design-system";
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
  const saving = isAddSubCategoryLoading || isEditSubCategoryLoading;

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
        body: apiData,
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

      setValue(
        "description",
        isUpdate ? normalizeEditorContent(categoryData?.description || "") : ""
      );
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
    <Modal
      open={open}
      title={type === "update" ? "Update Sub Category" : "Add Sub Category"}
      onClose={handleClose}
      secondaryLabel="Cancel"
      primaryLabel={
        saving ? "Saving…" : type === "update" ? "Update" : "Add Sub Category"
      }
      onPrimary={() => {
        if (saving) return;
        handleSubmit(isUpdate ? UpdateSubCategory : onSubmit)();
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
          name="category"
          control={control}
          render={({ field: { value } }) => (
            <Field label="Category" htmlFor="parent-category">
              <Input
                id="parent-category"
                name="category"
                placeholder="Category"
                value={value}
                disabled
              />
            </Field>
          )}
        />

        <Controller
          name="subCategory"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field
              label="Sub Category"
              htmlFor="sub-category-name"
              error={errors.subCategory?.message}
            >
              <Input
                id="sub-category-name"
                name="subCategory"
                placeholder="Sub category name"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!errors.subCategory}
              />
            </Field>
          )}
        />

        <Controller
          name="addOnCategoryIds"
          control={control}
          render={({ field: { onChange, value } }) => {
            const selected = Array.isArray(value) ? value : [];
            return (
              <Field label="Add-on / Repair Categories">
                {addOnCategoryOptions.length === 0 ? (
                  <p style={{ color: "var(--muted)", margin: 0 }}>
                    No add-on categories available
                  </p>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                      maxHeight: 200,
                      overflowY: "auto",
                      padding: 12,
                      background: "var(--canvas)",
                      border: "1px solid var(--line)",
                      borderRadius: "var(--r-md)",
                    }}
                  >
                    {addOnCategoryOptions.map((opt) => {
                      const checked = selected.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              onChange(
                                checked
                                  ? selected.filter((id) => id !== opt.value)
                                  : [...selected, opt.value]
                              );
                            }}
                          />
                          <span>{opt.label}</span>
                          {checked ? <Badge tone="brand">Linked</Badge> : null}
                        </label>
                      );
                    })}
                  </div>
                )}
              </Field>
            );
          }}
        />

        <Controller
          name="price"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Price" htmlFor="sub-price" error={errors.price?.message}>
              <Input
                id="sub-price"
                type="number"
                name="price"
                placeholder="Enter price"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!errors.price}
              />
            </Field>
          )}
        />

        <Controller
          name="unitCount"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field
              label="Unit count"
              htmlFor="unit-count"
              error={errors.unitCount?.message}
            >
              <Input
                id="unit-count"
                type="number"
                name="unitCount"
                placeholder="e.g. items per unit"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                error={!!errors.unitCount}
              />
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          render={({ field: { onChange, value } }) => (
            <Field label="Description" error={errors.description?.message}>
              <Textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Enter description"
                rows={5}
              />
            </Field>
          )}
        />
      </div>
    </Modal>
  );
}
