import * as yup from "yup";

// Validation schema
export const editCustomerSchema = yup.object().shape({
  firstName: yup
    .string()
    .required("First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .matches(/^[a-zA-Z\s]+$/, "First name should only contain letters"),
  lastName: yup
    .string()
    .required("Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters")
    .matches(/^[a-zA-Z\s]+$/, "Last name should only contain letters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address")
    .max(100, "Email must be less than 100 characters"),
  phoneNum: yup
    .string()
    .required("Phone number is required")
    .matches(
      /^[+]?[1-9][\d]{0,2}[\s]?[(]?[\d]{1,3}[)]?[-\s.]?[\d]{4,6}[-\s.]?[\d]{4,6}$/,
      "Please enter a valid phone number"
    ),
  password: yup
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(100, "Password must be less than 100 characters")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    ),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password"), null], "Passwords must match")
    .required("Please confirm your password"),
});

export const editCustomerDefaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNum: "",
  password: "",
  confirmPassword: "",
  status: "",
};
