// Services Management Constants
import * as yup from "yup";

export const SERVICES_LIST = [
  { id: 1, name: "Washing", color: "#1570EF" },
  { id: 2, name: "Ironing", color: "#F59E0B" },
  { id: 3, name: "Repairing", color: "#EF4444" },
  { id: 4, name: "Dry Cleaning", color: "#10B981" },
];

export const CONFIGURE_SERVICE_OPTIONS = [
  { value: "washing", label: "Washing" },
  { value: "ironing", label: "Ironing" },
  { value: "repairing", label: "Repairing" },
  { value: "dry-cleaning", label: "Dry Cleaning" },
];

export const AVAILABLE_PREFERENCES = [
  { id: 1, name: "Temperature", checked: true },
  { id: 2, name: "Detergent Type", checked: true },
  { id: 3, name: "Starch Level", checked: true },
  { id: 4, name: "Iron Temperature", checked: true },
];

export const APPLICABLE_ITEM_TYPES = {
  tops: [
    { id: 1, name: "Shirts", checked: true },
    { id: 2, name: "Coat", checked: true },
    { id: 3, name: "Tank Top", checked: true },
  ],
  bottoms: [
    { id: 4, name: "Jeans", checked: true },
    { id: 5, name: "Cargo pants", checked: true },
    { id: 6, name: "Shorts", checked: true },
  ],
};

export const ITEM_CATEGORIES = [
  {
    id: 1,
    name: "Top",
    count: 4,
    items: [
      { id: 1, name: "Shirt", service: "Dry cleaning", price: 3.4 },
      { id: 2, name: "Shirt", service: "Dry cleaning", price: 3.4 },
      { id: 3, name: "Shirt", service: "Dry cleaning", price: 3.4 },
      { id: 4, name: "Shirt", service: "Dry cleaning", price: 3.4 },
    ],
  },
  {
    id: 2,
    name: "Bottom",
    count: 2,
    items: [
      { id: 5, name: "Jeans", service: "Washing", price: 2.5 },
      { id: 6, name: "Shorts", service: "Ironing", price: 1.8 },
    ],
  },
];

export const PREFERENCE_TYPES = [
  {
    id: 1,
    name: "Temperature",
    options: [
      { value: "20c", label: "20°C" },
      { value: "40c", label: "40°C" },
      { value: "60c", label: "60°C" },
      { value: "80c", label: "80°C" },
    ],
  },
  {
    id: 2,
    name: "Detergent Type",
    options: [
      { value: "eco", label: "Eco-friendly" },
      { value: "standard", label: "Standard" },
      { value: "sensitive", label: "Sensitive skin" },
    ],
  },
  {
    id: 3,
    name: "Starch Level",
    options: [
      { value: "none", label: "None" },
      { value: "light", label: "Light" },
      { value: "medium", label: "Medium" },
      { value: "heavy", label: "Heavy" },
    ],
  },
];

export const schema = yup
  .object({
    name: yup.string().required("Name is required"),
    email: yup
      .string()
      .email("Invalid email format")
      .required("Email is required"),
    age: yup
      .number()
      .min(18, "You must be at least 18")
      .required("Age is required"),
    password: yup
      .string()
      .min(6, "Password must be at least 6 characters")
      .required("Password is required"),
    confirmPassword: yup
      .string()
      .oneOf([yup.ref("password"), null], "Passwords must match")
      .required("Confirm password is required"),
  })
  .required();
