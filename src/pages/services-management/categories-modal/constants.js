import * as yup from "yup";

// Validation schema for category form
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
  image: yup
    .mixed()
    .required("Category image is required")
    .test("fileSize", "Image size must be less than 5MB", (value) => {
      if (!value) return false;
      if (typeof value === "string") return true;
      return value && value.size <= 5 * 1024 * 1024;
    })
    .test(
      "fileType",
      "Only image files are allowed (jpg, jpeg, png, gif)",
      (value) => {
        if (!value) return false;
        if (typeof value === "string") return true;
        return (
          value &&
          ["image/jpeg", "image/jpg", "image/png", "image/gif"].includes(
            value.type
          )
        );
      }
    ),
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
    .required("Description is required")
    .min(10, "Description must be at least 10 characters")
    .max(500, "Description must not exceed 500 characters")
    .trim(),
  price: yup
    .number()
    .typeError("Price must be a number")
    .required("Price is required")
    .positive("Price must be a positive number")
    .min(1, "Price must be at least 1"),
});
// Default form values
export const defaultCategoryValues = {
  name: "",
  description: "",
  image: "",
};

export const defaultSubCategoryValues = {
  category: "",
  subCategory: "",
  description: "",
  price: "",
};
