/**
 * Product sidebar IA from the catalog, wired to live admin paths.
 * Parent labels stay aligned with sidebarList so labelToFeatureKey still works.
 * Parent group paths (/orders, /promotion, /shop-management, /reports) must have
 * a route or redirect — same class of gap as missing zone details.
 */

export const DS_NAV = [
  {
    section: "Overview",
    items: [{ label: "Dashboard", icon: "dashboard", path: "/" }],
  },
  {
    section: "Orders",
    items: [
      {
        label: "Order Management",
        icon: "bag",
        path: "/orders",
        children: [
          { label: "Action Required", path: "/orders/action-required", dot: "red", countKey: "actionRequiredCount", hot: true },
          { label: "All Orders", path: "/orders/all-orders", dot: "blue", countKey: "allOrderCount" },
          { label: "Complete", path: "/orders/complete-orders", dot: "green", countKey: "completedOrders" },
          { label: "Pending", path: "/orders/pending-orders", dot: "amber", countKey: "pendingOrders" },
          { label: "Cancelled", path: "/orders/cancel-orders", dot: "slate", countKey: "cancelledOrders" },
          { label: "On hold", path: "/orders/on-hold-orders", dot: "violet", countKey: "onHoldOrders" },
          { label: "Payment Failures", path: "/orders/payment-failures", dot: "red", countKey: "paymentFailuresCount" },
        ],
      },
      { label: "Customer Management", icon: "users", path: "/customer-management" },
    ],
  },
  {
    section: "Services & shops",
    items: [
      {
        label: "Service Management",
        icon: "wrench",
        path: "/services-management",
        children: [
          { label: "Service Dashboard", path: "/services-management/dashboard", icon: "dashboard" },
          { label: "Services", path: "/services-management/services", icon: "wrench" },
          { label: "Add-on Services", path: "/services-management/add-on-services", icon: "plus" },
          { label: "Repair Catalog", path: "/services-management/repair-catalog", icon: "book" },
          { label: "Categories", path: "/services-management/categories", icon: "grid" },
          { label: "Preferences", path: "/services-management/preferences", icon: "sliders" },
          { label: "Configure Services", path: "/services-management/configure-services", icon: "settings" },
        ],
      },
      {
        label: "Shop Management",
        icon: "shop",
        path: "/shop-management",
        children: [
          { label: "All Shops", path: "/shop-management/shops", icon: "shop" },
          { label: "Shop Dashboard", path: "/shop-management/dashboard", icon: "dashboard" },
          { label: "Onboarding Requests", path: "/shop-management/pending-agents", icon: "idcard" },
          { label: "Add Shop", path: "/shop-management/add-shop", icon: "plus" },
          { label: "Shop Employees", path: "/shop-management/employees", icon: "users" },
          { label: "Cash Settlement", path: "/shop-management/agent-settlement", icon: "ticket" },
        ],
      },
      { label: "Zone Record", icon: "pin", path: "/zone-management" },
      {
        label: "Countries and Cities",
        icon: "globe",
        path: "/countries-cities",
        children: [
          { label: "Countries", path: "/countries-cities/countries", icon: "globe" },
          { label: "Cities", path: "/countries-cities/cities", icon: "building" },
        ],
      },
    ],
  },
  {
    section: "People & access",
    items: [
      { label: "Driver Management", icon: "truck", path: "/driver-management" },
      { label: "Employee Management", icon: "idcard", path: "/employee-management" },
      { label: "Role and Permission", icon: "shield", path: "/role-permission" },
    ],
  },
  {
    section: "Policies",
    items: [
      {
        label: "Policies Management",
        icon: "file",
        path: "/policies-management",
        children: [
          { label: "Overall Policies", path: "/policies-management/overall-policies" },
          { label: "Cancellation Policy", path: "/policies-management/cancellation-policy" },
          { label: "No Show Policy", path: "/policies-management/no-show-policy" },
          { label: "Fail attempt settings", path: "/policies-management/fail-attempt-instructions" },
          { label: "Location compliance", path: "/policies-management/location-compliance" },
          { label: "Reschedule Policy", path: "/policies-management/reschedule-policy" },
          { label: "Operational Hours", path: "/policies-management/platform-operational-hours" },
          { label: "Runtime checks", path: "/policies-management/runtime-checks" },
        ],
      },
    ],
  },
  {
    section: "Content & growth",
    items: [
      { label: "Blogs", icon: "pen", path: "/blogs" },
      { label: "FAQ", icon: "help", path: "/faq" },
      {
        label: "Promotion",
        icon: "megaphone",
        path: "/promotion",
        children: [
          { label: "Coupons", path: "/promotion/promo-codes" },
          { label: "Banners & Offers", path: "/promotion/banners" },
        ],
      },
      { label: "Shop Reviews", icon: "star", path: "/shop-reviews" },
    ],
  },
  {
    section: "Analytics",
    items: [{ label: "Reports", icon: "chart", path: "/reports" }],
  },
  {
    section: "Communications",
    items: [
      { label: "Customer Support", icon: "headset", path: "/customer-support" },
      { label: "Notify / Call Logs", icon: "phone", path: "/notify-logs" },
      { label: "Send Notifications", icon: "send", path: "/send-notifications" },
      { label: "Alert Settings", icon: "sliders", path: "/admin-notification-settings" },
    ],
  },
  {
    section: "System",
    items: [
      { label: "Delete Account Reasons", icon: "userx", path: "/delete-account-reasons" },
      { label: "Review Reason Codes", icon: "flag", path: "/review-reason-codes" },
      { label: "Privacy Policy", icon: "file", path: "/privacy-policy" },
    ],
  },
];

export const DOT_COLOR = {
  red: "#c9403f",
  blue: "#2a63d6",
  green: "#0b8a5e",
  amber: "#b57200",
  slate: "#6b7482",
  violet: "#5f47c4",
};

export function itemMatchesPath(item, pathname) {
  if (!item?.path) return false;
  if (pathname === item.path) return true;
  if (item.path !== "/" && pathname.startsWith(`${item.path}/`)) return true;
  return false;
}

/** Child route or a nested detail under that child (e.g. /orders/all-orders/123). */
export function childMatchesPath(child, pathname) {
  if (!child?.path) return false;
  if (pathname === child.path) return true;
  if (child.path !== "/" && pathname.startsWith(`${child.path}/`)) return true;
  return false;
}

export function isGroupOpenPath(item, pathname) {
  if (itemMatchesPath(item, pathname)) return true;
  return (item.children || []).some((c) => childMatchesPath(c, pathname));
}
