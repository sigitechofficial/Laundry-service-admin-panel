import { lazy } from "react";

export const Dashboard = lazy(() => import("../pages/dashboard/Dashboard"));

export const ServiceManagement = lazy(() =>
  import("../pages/services-management/ServiceManagement")
);

export const CustomerManagement = lazy(() =>
  import("../pages/customer-management/CustomerManagement")
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

export const ShopManagement = lazy(() =>
  import("../pages/shop-management/ShopManagement")
);
export const ShopDetails = lazy(() =>
  import("../pages/shop-management/ShopDetail")
);

export const ShopEmployee = lazy(() =>
  import("../pages/shop-management/ShopEmployee")
);

export const Configurations = lazy(() =>
  import("../pages/configurations/Configurations")
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

export const Reports = lazy(() => import("../pages/reports/Reports"));

export const LoginPage = lazy(() => import("../pages/auth/LoginPage"));
