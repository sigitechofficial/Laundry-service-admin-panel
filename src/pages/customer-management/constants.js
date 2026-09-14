import * as yup from "yup";
import { PHONE_HINT, isValidCustomerPhone } from "../../utilities/customerPhone";

export const editCustomerSchema = yup.object().shape({
  firstName: yup
    .string()
    .required("First name is required")
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/, "First name should only contain letters"),
  lastName: yup
    .string()
    .required("Last name is required")
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters")
    .matches(/^[a-zA-Z\s'-]+$/, "Last name should only contain letters"),
  email: yup
    .string()
    .required("Email is required")
    .email("Please enter a valid email address")
    .max(100, "Email must be less than 100 characters"),
  phoneNum: yup
    .string()
    .required("Phone number is required")
    .test("phone", PHONE_HINT, (value) => isValidCustomerPhone(value)),
  password: yup
    .string()
    .transform((value) => value || "")
    .test("min", "Password must be at least 6 characters", (value) => !value || value.length >= 6)
    .max(100, "Password must be less than 100 characters"),
  confirmPassword: yup
    .string()
    .transform((value) => value || "")
    .when("password", {
      is: (password) => Boolean(password && String(password).length > 0),
      then: (schema) =>
        schema
          .required("Confirm the new password")
          .oneOf([yup.ref("password")], "Passwords must match"),
      otherwise: (schema) => schema.optional(),
    }),
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
