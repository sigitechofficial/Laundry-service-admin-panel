import { lazy } from "react";

export const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));

export const ServiceManagement = lazy(() =>
  import("../pages/services-management/ServiceManagement")
);
export const ServicesPage = lazy(() =>
  import("../pages/services-management/ServicesPage")
);
export const AddOnServicesPage = lazy(() =>
  import("../pages/services-management/AddOnServicesPage")
);
export const CategoriesPage = lazy(() =>
  import("../pages/services-management/CategoriesPage")
);
export const PreferencesPage = lazy(() =>
  import("../pages/services-management/PreferencesPage")
);
export const ServiceDashboardPage = lazy(() =>
  import("../pages/services-management/ServiceDashboardPage")
);
export const ConfigureServicesPage = lazy(() =>
  import("../pages/services-management/ConfigureServicesPage")
);

export const CustomerManagement = lazy(() =>
  import("../pages/customer-management/CustomerManagement")
);

export const CustomerSupport = lazy(() =>
  import("../pages/customer-support/CustomerSupport")
);

export const DeleteAccountReasons = lazy(() =>
  import("../pages/delete-account-reasons/DeleteAccountReasons")
);

export const CustomerDetails = lazy(() =>
  import("../pages/customer-management/customer-details/CustomerDetails")
);

export const EditCustomer = lazy(() =>
  import("../pages/customer-management/edit-customer/EditCustomer")
);

export const DriverManagement = lazy(() =>
  import("../pages/driver-management/DriverManagement")
);

export const DriverDetails = lazy(() =>
  import("../pages/driver-management/driver-details/DriverDetails")
);

export const ZoneManagement = lazy(() =>
  import("../pages/zone-management/Zone")
);

export const EmployeeManagement = lazy(() =>
  import("../pages/employee-management/EmployeeManagement")
);

export const EmployeeDetails = lazy(() =>
  import("../pages/employee-management/employee-details/EmployeeDetails")
);

export const EditEmployee = lazy(() =>
  import("../pages/employee-management/edit-employee/EditEmployee")
);

export const ShopManagement = lazy(() =>
  import("../pages/shop-management/ShopManagement")
);
export const ShopDashboardPage = lazy(() =>
  import("../pages/shop-management/ShopDashboardPage")
);
export const ShopsPage = lazy(() =>
  import("../pages/shop-management/ShopsPage")
);
export const AddShopPage = lazy(() =>
  import("../pages/shop-management/AddShopPage")
);
export const ShopEmployeesPage = lazy(() =>
  import("../pages/shop-management/ShopEmployeesPage")
);
export const PendingAgentsPage = lazy(() =>
  import("../pages/shop-management/PendingAgentsPage")
);
export const ShopDetails = lazy(() =>
  import("../pages/shop-management/ShopDetail")
);
export const ShopManagementLayout = lazy(() =>
  import("../pages/shop-management/ShopManagementLayout")
);

export const RolePermission = lazy(() =>
  import("../pages/role-permission/RolePermission")
);

export const AllOrders = lazy(() =>
  import("../pages/order-management/all-orders/AllOrders")
);

export const CompleteOrders = lazy(() =>
  import("../pages/order-management/complete-orders/CompleteOrders")
);
export const PendingOrders = lazy(() =>
  import("../pages/order-management/pending-orders/PendingOrders")
);

export const CancelledOrders = lazy(() =>
  import("../pages/order-management/cancelled-orders/CancelledOrder")
);

export const OnHoldOrders = lazy(() =>
  import("../pages/order-management/on-hold-orders/OnHoldOrders")
);

export const EditOrder = lazy(() =>
  import("../pages/order-management/edit-order/EditOrder")
);
export const OrderDetails = lazy(() =>
  import("../pages/order-management/order-details/OrderDetailsPage")
);

export const Reports = lazy(() => import("../pages/reports/Reports"));
export const ReportsLayout = lazy(() => import("../pages/reports/ReportsLayout"));
export const TopServicesReport = lazy(() => import("../pages/reports/TopServicesReport"));
export const HourlyReport = lazy(() => import("../pages/reports/HourlyReport"));
export const OnHoldReport = lazy(() => import("../pages/reports/OnHoldReport"));
export const ServiceDemandReport = lazy(() => import("../pages/reports/ServiceDemandReport"));
export const TopPerformingShopsReport = lazy(() => import("../pages/reports/TopPerformingShopsReport"));
export const DailyEarningReport = lazy(() => import("../pages/reports/DailyEarningReport"));

export const Blogs = lazy(() => import("../pages/blogs/Blogs"));

export const FAQ = lazy(() => import("../pages/faq/FAQ"));

export const CountriesAndCities = lazy(() =>
  import("../pages/countries-cities/CountriesAndCities")
);

export const CountriesPage = lazy(() =>
  import("../pages/countries-cities/CountriesPage")
);

export const CitiesPage = lazy(() =>
  import("../pages/countries-cities/CitiesPage")
);

export const PoliciesManagement = lazy(() =>
  import("../pages/policies-management/PoliciesManagement")
);

export const CancellationPolicy = lazy(() =>
  import("../pages/policies-management/CancellationPolicy")
);

export const OverallPolicies = lazy(() =>
  import("../pages/policies-management/OverallPolicies")
);

export const NoShowPolicy = lazy(() =>
  import("../pages/policies-management/NoShowPolicy")
);

export const ReschedulePolicy = lazy(() =>
  import("../pages/policies-management/ReschedulePolicy")
);

export const PlatformOperationalHours = lazy(() =>
  import("../pages/policies-management/PlatformOperationalHours")
);

export const PromoCodesPage = lazy(() =>
  import("../pages/promotion/PromoCodesPage")
);

export const BannersPage = lazy(() =>
  import("../pages/promotion/BannersPage")
);

export const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
