import {
  Dashboard,
  LoginPage,
  ServiceManagement,
  CustomerManagement,
} from "../routes/AsyncComponent";

export const privateRoutes = [
  { path: "/", element: Dashboard, resourceKey: "dashboard_Page" },
  {
    path: "/services-management",
    element: ServiceManagement,
    resourceKey: "services_management_Page",
  },
  {
    path: "/customer-management",
    element: CustomerManagement,
    resourceKey: "customer_management_Page",
  },
];
export const publicRoutes = [
  {
    path: "/login",
    element: LoginPage,
    resourceKey: "login_page",
  },
  // {
  //   path: "/login",
  //   element: LoginPage,
  //   resourceKey: "Login_Page",
  // },
  // {
  //   path: "/signup",
  //   element: SignupPage,
  //   resourceKey: "Signup_Page",
  // },
  // {
  //   path: "/forgot-password",
  // },
];
