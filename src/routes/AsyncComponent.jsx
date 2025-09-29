import { lazy } from "react";

export const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));

export const ServiceManagement = lazy(() =>
  import("../pages/services-management/ServiceManagement")
);

export const CustomerManagement = lazy(() =>
  import("../pages/customer-management/CustomerManagement")
);

export const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
