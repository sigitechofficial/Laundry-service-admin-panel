import {
  Dashboard,
  LoginPage,
  ServiceManagement,
  CustomerManagement,
  CustomerDetails,
  ShopDetails,
  DriverManagement,
  DriverDetails,
  ZoneManagement,
  EmployeeManagement,
  ShopManagement,
  Configurations,
  Reports,
  EditCustomer,
  AllOrders,
  CompleteOrders,
  PendingOrders,
  CancelledOrders,
  OnHoldOrders,
  EditOrder,
  ShopEmployee
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
    path: "/shop-management/details/:id",
    element: ShopDetails,
    resourceKey: "customer_details_Page",
  },
  {
    path: "/shop-management/details/:id/shop-employee",
    element: ShopEmployee,
    resourceKey: "shop_employee_Page",
  },
  {
    path: "/customer-management/edit/:id",
    element: EditCustomer,
    resourceKey: "customer_edit_Page",
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
  {
    path: "/orders/all-orders",
    element: AllOrders,
    resourceKey: "order_all-orders_Page",
  },
  {
    path: "/orders/complete-orders",
    element: CompleteOrders,
    resourceKey: "order_complete-orders_Page",
  },
  {
    path: "/orders/pending-orders",
    element: PendingOrders,
    resourceKey: "order_pending-orders_Page",
  },
  {
    path: "/orders/cancel-orders",
    element: CancelledOrders,
    resourceKey: "order_cancel-orders_Page",
  },
  {
    path: "/orders/on-hold-orders",
    element: OnHoldOrders,
    resourceKey: "order_on-hold-orders_Page",
  },
  {
    path: "/orders/edit/:id",
    element: EditOrder,
    resourceKey: "order_edit_Page",
  },
];

export const publicRoutes = [
  {
    path: "/login",
    element: LoginPage,
    resourceKey: "login_page",
  },
];
