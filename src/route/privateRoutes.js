import {
  Dashboard,
  LoginPage,
  ServiceManagement,
  ServicesPage,
  CategoriesPage,
  PreferencesPage,
  ConfigureServicesPage,
  CustomerManagement,
  CustomerDetails,
  ShopDetails,
  DriverManagement,
  DriverDetails,
  ZoneManagement,
  EmployeeManagement,
  ShopManagement,
  ShopDashboardPage,
  ShopsPage,
  AddShopPage,
  ShopEmployeesPage,
  Configurations,
  Reports,
  EditCustomer,
  AllOrders,
  CompleteOrders,
  PendingOrders,
  CancelledOrders,
  OnHoldOrders,
  EditOrder,
  ShopEmployee,
  CountriesAndCities,
  CountriesPage,
  CitiesPage,
  PoliciesManagement,
  CancellationPolicy,
  OverallPolicies,
  NoShowPolicy
} from "../routes/AsyncComponent";

export const privateRoutes = [
  { path: "/", element: Dashboard, resourceKey: "dashboard_Page" },
  {
    path: "/services-management",
    element: ServiceManagement,
    resourceKey: "services_management_Page",
  },
  {
    path: "/services-management/services",
    element: ServicesPage,
    resourceKey: "services_page",
  },
  {
    path: "/services-management/categories",
    element: CategoriesPage,
    resourceKey: "categories_page",
  },
  {
    path: "/services-management/preferences",
    element: PreferencesPage,
    resourceKey: "preferences_page",
  },
  {
    path: "/services-management/configure-services",
    element: ConfigureServicesPage,
    resourceKey: "configure_services_page",
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
    path: "/shop-management/dashboard",
    element: ShopDashboardPage,
    resourceKey: "shop_dashboard_Page",
  },
  {
    path: "/shop-management/shops",
    element: ShopsPage,
    resourceKey: "shops_Page",
  },
  {
    path: "/shop-management/add-shop",
    element: AddShopPage,
    resourceKey: "add_shop_Page",
  },
  {
    path: "/shop-management/employees",
    element: ShopEmployeesPage,
    resourceKey: "shop_employees_Page",
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
  {
    path: "/countries-cities",
    element: CountriesAndCities,
    resourceKey: "countries_cities_Page",
  },
  {
    path: "/countries-cities/countries",
    element: CountriesPage,
    resourceKey: "countries_page",
  },
  {
    path: "/countries-cities/cities",
    element: CitiesPage,
    resourceKey: "cities_page",
  },
  {
    path: "/policies-management",
    element: PoliciesManagement,
    resourceKey: "policies_management_page",
  },
  {
    path: "/policies-management/overall-policies",
    element: OverallPolicies,
    resourceKey: "overall_policies_page",
  },
  {
    path: "/policies-management/cancellation-policy",
    element: CancellationPolicy,
    resourceKey: "cancellation_policy_page",
  },
  {
    path: "/policies-management/no-show-policy",
    element: NoShowPolicy,
    resourceKey: "no_show_policy_page",
  },
];

export const publicRoutes = [
  {
    path: "/login",
    element: LoginPage,
    resourceKey: "login_page",
  },
];
