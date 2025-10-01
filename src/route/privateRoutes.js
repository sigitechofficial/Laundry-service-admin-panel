import {
  Dashboard,
  LoginPage,
  ServiceManagement,
  CustomerManagement,
  CustomerDetails,
  DriverManagement,
  DriverDetails,
  ZoneManagement,
  EmployeeManagement,
  ShopManagement,
  Configurations,
  Reports,
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
  {
    path: "/customer-management/details/:id",
    element: CustomerDetails,
    resourceKey: "customer_details_Page",
  },
  {
    path: "/driver-management",
    element: DriverManagement,
    resourceKey: "driver_management_Page",
  },
  {
    path: "/driver-management/details/:id",
    element: DriverDetails,
    resourceKey: "driver_details_Page",
  },
  {
    path: "/zone-management",
    element: ZoneManagement,
    resourceKey: "zone_management_Page",
  },
  {
    path: "/employee-management",
    element: EmployeeManagement,
    resourceKey: "employee_management_Page",
  },
  {
    path: "/shop-management",
    element: ShopManagement,
    resourceKey: "shop_management_Page",
  },
  {
    path: "/configurations",
    element: Configurations,
    resourceKey: "configurations_Page",
  },
  {
    path: "/reports",
    element: Reports,
    resourceKey: "reports_Page",
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
