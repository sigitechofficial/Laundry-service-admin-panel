import * as yup from "yup";
import {
  IMAGE_UPLOAD_MESSAGES,
  validateImageFile,
} from "../../../utilities/imageUploadPolicy";

const imageFieldSchema = (requiredMessage) =>
  yup
    .mixed()
    .nullable()
    .test("imageRequired", requiredMessage, (value) => {
      if (value == null || value === "") return false;
      return true;
    })
    .test("imagePolicy", IMAGE_UPLOAD_MESSAGES.size, function (value) {
      if (value == null || value === "") return true;
      const result = validateImageFile(value, { allowExistingUrl: true });
      if (result.ok) return true;
      return this.createError({ message: result.message });
    });

const serviceIdFieldSchema = yup
  .number()
  .transform((value, originalValue) => {
    if (originalValue === "" || originalValue == null) return undefined;
    const parsed = Number(originalValue);
    return Number.isNaN(parsed) ? undefined : parsed;
  })
  .typeError("Please select a service")
  .required("Service is required")
  .positive("Please select a service");

// Validation schema for category form (create)
export const categoryValidationSchema = yup.object().shape({
  name: yup
    .string()
    .required("Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must not exceed 50 characters")
    .trim(),
  description: yup
    .string()
    .required("Description is required")
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must not exceed 500 characters")
    .trim(),
  serviceId: serviceIdFieldSchema,
  image: imageFieldSchema("Category image is required"),
});

// Update: description optional; keep existing image path if not re-uploaded
export const categoryUpdateValidationSchema = yup.object().shape({
  name: yup
    .string()
    .required("Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must not exceed 50 characters")
    .trim(),
  description: yup
    .string()
    .max(500, "Description must not exceed 500 characters")
    .transform((value) => (value == null ? "" : value))
    .optional(),
  serviceId: serviceIdFieldSchema,
  image: imageFieldSchema("Category image is required"),
});
export const categorySubValidationSchema = yup.object().shape({
  subCategory: yup
    .string()
    .required("Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must not exceed 50 characters")
    .trim(),
  description: yup
    .string()
    .max(500, "Description must not exceed 500 characters")
    .transform((value) => (value == null ? "" : value))
    .optional(),
  price: yup
    .number()
    .typeError("Price must be a number")
    .required("Price is required")
    .positive("Price must be a positive number")
    .min(1, "Price must be at least 1"),
  unitCount: yup
    .number()
    .typeError("Unit count must be a number")
    .required("Unit count is required")
    .integer("Unit count must be a whole number")
    .min(1, "Unit count must be at least 1"),
});
// Default form values
export const defaultCategoryValues = {
  name: "",
  description: "",
  image: "",
  serviceId: "",
  status: true,
};

export const defaultSubCategoryValues = {
  category: "",
  subCategory: "",
  description: "",
  price: "",
  unitCount: 1,
  addOnCategoryIds: [],
  excludedAddOnCategoryIds: [],
  status: true,
};
