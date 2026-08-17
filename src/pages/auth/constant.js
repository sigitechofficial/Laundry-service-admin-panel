import * as yup from "yup";

/** Used in login payloads when FCM `dvToken` cannot be obtained. */
export const FALLBACK_DV_TOKEN = "no-fcm-token";

export const loginSchema = yup
  .object({
    email: yup
      .string()
      .trim()
      .required("Email is required")
      .email("Invalid email format"),
    password: yup
      .string()
      .required("Password is required")
      .min(6, "Password must be at least 6 characters"),
    rememberMe: yup.boolean().default(false),
  })
  .required();
