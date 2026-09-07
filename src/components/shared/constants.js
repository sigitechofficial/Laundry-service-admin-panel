import {
  TbLayoutBoard,
  FaRegRectangleList,
  LuUsersRound,
  PiHeadsetBold,
  MdOutlineStore,
  MdOutlineLocationOn,
  MdOutlinePhone,
  MdNotificationsNone,
  IconFingerHold,
  RiUserSettingsLine,
  TbSettings,
  TbReportSearch,
  TbFileDescription,
  TbHelp,
  BsCardList,
  TbX,
  TbSparkles,
  TbTrash,
} from "../../shared/icons/index";

export const sidebarList = [
  {
    label: "Dashboard",
    Icon: TbLayoutBoard,
    path: "/",
    size: "26px",
  },
  {
    label: "Order Management",
    Icon: FaRegRectangleList,
    path: "/orders",
    size: "24px",
    children: [
      {
        label: "Action Required",
        path: "/orders/action-required",
        size: "24px",
      },
      {
        label: "All Orders",
        path: "/orders/all-orders",
        size: "24px",
      },
      {
        label: "Complete",
        path: "/orders/complete-orders",
        size: "22px",
      },
      {
        label: "Pending",
        path: "/orders/pending-orders",
        size: "24px",
      },
      {
        label: "Cancelled",
        path: "/orders/cancel-orders",
        size: "24px",
      },
      {
        label: "On hold",
        path: "/orders/on-hold-orders",
        size: "24px",
      },
      {
        label: "Payment Failures",
        path: "/orders/payment-failures",
        size: "24px",
      },
    ],
  },
  {
    label: "Customer Management",
    Icon: LuUsersRound,
    path: "/customer-management",
    size: "24px",
  },
  {
    label: "Service Management",
    Icon: PiHeadsetBold,
    path: "/services-management",
    size: "23px",
    children: [
      {
        label: "Service Dashboard",
        path: "/services-management/dashboard",
        size: "22px",
      },
      {
        label: "Services",
        path: "/services-management/services",
        size: "22px",
      },
      {
        label: "Add-on Services",
        path: "/services-management/add-on-services",
        size: "22px",
      },
      {
        label: "Repair Catalog",
        path: "/services-management/repair-catalog",
        size: "22px",
      },
      {
        label: "Categories",
        path: "/services-management/categories",
        size: "24px",
      },
      {
        label: "Preferences",
        path: "/services-management/preferences",
        size: "24px",
      },
      {
        label: "Configure Services",
        path: "/services-management/configure-services",
        size: "24px",
      },
    ],
  },
  {
    label: "Shop Management",
    Icon: MdOutlineStore,
    path: "/shop-management",
    size: "24px",
    children: [
      {
        label: "Shop Dashboard",
        path: "/shop-management/dashboard",
        size: "22px",
      },
      {
        label: "Shops",
        path: "/shop-management/shops",
        size: "24px",
      },
      {
        label: "Agent Approvals",
        path: "/shop-management/pending-agents",
        size: "24px",
      },
      {
        label: "Cash Settlement",
        path: "/shop-management/agent-settlement",
        size: "24px",
      },
      {
        label: "Add Shop",
        path: "/shop-management/add-shop",
        size: "24px",
      },
      {
        label: "Shop Employees",
        path: "/shop-management/employees",
        size: "24px",
      },
    ],
  },
  {
    label: "Zone Record",
    Icon: LuUsersRound,
    path: "/zone-management",
    size: "24px",
    children: [
      {
        label: "Zones",
        path: "/zone-management",
        size: "24px",
      },
      {
        label: "Zone Catalog",
        path: "/zone-management/catalog",
        size: "24px",
      },
    ],
  },
  {
    label: "Countries and Cities",
    Icon: MdOutlineLocationOn,
    path: "/countries-cities",
    size: "24px",
    children: [
      {
        label: "Countries",
        path: "/countries-cities/countries",
        size: "24px",
      },
      {
        label: "Cities",
        path: "/countries-cities/cities",
        size: "24px",
      },
    ],
  },
  {
    label: "Policies Management",
    Icon: BsCardList,
    path: "/policies-management",
    size: "24px",
    children: [
      {
        label: "Overall Policies",
        path: "/policies-management/overall-policies",
        size: "24px",
      },
      {
        label: "Cancellation Policy",
        path: "/policies-management/cancellation-policy",
        size: "24px",
      },
      {
        label: "No Show Policy",
        path: "/policies-management/no-show-policy",
        size: "24px",
      },
      {
        label: "Fail attempt settings",
        path: "/policies-management/fail-attempt-instructions",
        size: "24px",
      },
      {
        label: "Location compliance",
        path: "/policies-management/location-compliance",
        size: "24px",
      },
      {
        label: "Reschedule Policy",
        path: "/policies-management/reschedule-policy",
        size: "24px",
      },
      {
        label: "Operational Hours",
        path: "/policies-management/platform-operational-hours",
        size: "24px",
      },
      {
        label: "Runtime checks",
        path: "/policies-management/runtime-checks",
        size: "24px",
      },
    ],
  },
  {
    label: "Driver Management",
    Icon: MdOutlineStore,
    path: "/driver-management",
    size: "24px",
  },
  {
    label: "Employee Management",
    Icon: RiUserSettingsLine,
    path: "/employee-management",
    size: "24px",
  },
  {
    label: "Role and Permission",
    Icon: IconFingerHold,
    path: "/role-permission",
    size: "24px",
  },
  {
    label: "Blogs",
    Icon: TbFileDescription,
    path: "/blogs",
    size: "24px",
  },
  {
    label: "FAQ",
    Icon: TbHelp,
    path: "/faq",
    size: "24px",
  },
  {
    label: "Promotion",
    Icon: TbSparkles,
    path: "/promotion",
    size: "24px",
    children: [
      {
        label: "Coupons",
        path: "/promotion/promo-codes",
        size: "24px",
      },
      {
        label: "Banners & Offers",
        path: "/promotion/banners",
        size: "24px",
      },
    ],
  },
  {
    label: "Reports",
    Icon: TbReportSearch,
    path: "/reports",
    size: "24px",
  },
  {
    label: "Customer Support",
    Icon: PiHeadsetBold,
    path: "/customer-support",
    size: "23px",
  },
  {
    label: "Notify / Call Logs",
    Icon: MdOutlinePhone,
    path: "/notify-logs",
    size: "23px",
  },
  {
    label: "Send Notifications",
    Icon: MdNotificationsNone,
    path: "/send-notifications",
    size: "23px",
  },
  {
    label: "Alert Settings",
    Icon: TbSettings,
    path: "/admin-notification-settings",
    size: "23px",
  },
  {
    label: "Delete Account Reasons",
    Icon: TbTrash,
    path: "/delete-account-reasons",
    size: "23px",
  },
  {
    label: "Review Reason Codes",
    Icon: TbSparkles,
    path: "/review-reason-codes",
    size: "23px",
  },
  {
    label: "Shop Reviews",
    Icon: BsCardList,
    path: "/shop-reviews",
    size: "23px",
  },
];

/** Map sidebar labels to API feature keys (camelCase), same rules as RolePermission.toFeatureKey */
export function labelToFeatureKey(value = "") {
  const cleaned = String(value).replace(/[^a-zA-Z0-9\s]/g, " ").trim();
  if (!cleaned) return "";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    const token = parts[0];
    return token.charAt(0).toLowerCase() + token.slice(1);
  }
  return parts
    .map((part, idx) => {
      const lower = part.toLowerCase();
      return idx === 0 ? lower : lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join("");
}

/** Parent sidebar sections only (no nested sub-routes) for permission picker (value = parent path). */
export function getSidebarPermissionSelectOptions() {
  return sidebarList
    .filter((item) => item.path)
    .map((item) => ({
      value: item.path,
      menuLabel: item.label,
      featureKey: labelToFeatureKey(item.label),
    }));
}

export const bottomMenuItem = [
  {
    label: "Privacy Policy",
    Icon: FaRegRectangleList,
    path: "/privacy-policy",
    size: "24px",
  },
  {
    label: "Logout",
    Icon: TbSettings,
    path: "/auth/login",
    size: "26px",
  },
];

export const getInitialSubmenuOpen = () => {
  try {
    const stored =
      typeof window !== "undefined" && localStorage.getItem("submenuOpen");
    if (stored) return JSON.parse(stored);
  } catch {
    /* ignore invalid stored submenu state */
  }

  const pathname =
    typeof window !== "undefined" ? window.location.pathname : "";
  const init = {};
  sidebarList.forEach((item) => {
    if (item.children) {
      const isUnderParent =
        pathname === item.path ||
        (item.path && pathname.startsWith(item.path + "/"));
      const matchesChild = item.children.some((c) => pathname === c.path);
      if (isUnderParent || matchesChild) init[item.label] = true;
    }
  });
  return init;
};
