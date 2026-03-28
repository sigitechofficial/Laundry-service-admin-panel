import * as yup from "yup";

/** Used in login payloads when FCM `dvToken` cannot be obtained. */
export const FALLBACK_DV_TOKEN = "no-fcm-token";

export const loginSchema = yup
  .object({
    email: yup
      .string()
      .email("Invalid email format")
      .required("Email is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
  })
  .required();
