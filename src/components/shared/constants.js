import {
  TbLayoutBoard,
  FaRegRectangleList,
  LuUsersRound,
  PiHeadsetBold,
  MdOutlineStore,
  MdOutlineLocationOn,
  TbCirclePlus,
  TbCircleX,
  IconFingerHold,
  RiUserSettingsLine,
  TbDeviceIpadHorizontalCog,
  TbSettings,
  TbReportSearch,
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
        label: "All Order",
        path: "/orders/all-orders",
        size: "24px",
        Icon: TbCirclePlus,
      },
      {
        label: "Complete",
        path: "/orders/complete-orders",
        size: "22px",
        Icon: FaRegRectangleList,
      },
      {
        label: "Pending",
        path: "/orders/pending-orders",
        size: "24px",
        Icon: TbCirclePlus,
      },
      {
        label: "Cancelled",
        path: "/orders/cancel-orders",
        size: "24px",
        Icon: TbCircleX,
      },
      {
        label: "On hold",
        path: "/orders/on-hold-orders",
        size: "24px",
        Icon: IconFingerHold,
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
    // children: [
    //   {
    //     label: "Preference Management",
    //     path: "/orders/admins",
    //     size: "24px",
    //     Icon: TbCirclePlus,
    //   },
    //   {
    //     label: "Service Type",
    //     path: "/orders/customers",
    //     size: "22px",
    //     Icon: FaRegRectangleList,
    //   },
    //   {
    //     label: "Category Managenemt",
    //     path: "/orders/customers",
    //     size: "24px",
    //     Icon: TbCirclePlus,
    //   },
    //   {
    //     label: "Employee Management",
    //     path: "/orders/customers",
    //     size: "24px",
    //     Icon: RiUserSettingsLine,
    //   },
    // ],
  },
  {
    label: "Shop Management",
    Icon: MdOutlineStore,
    path: "/shop-management",
    size: "24px",
  },
  {
    label: "Zone Record",
    Icon: LuUsersRound,
    path: "/zone-management",
    size: "24px",
  },
  {
    label: "Countries and Cities",
    Icon: MdOutlineLocationOn,
    path: "/countries-cities",
    size: "24px",
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
    label: "Configuration",
    Icon: TbDeviceIpadHorizontalCog,
    path: "/configurations",
    size: "24px",
    // children: [
    //   {
    //     label: "Schedule policy",
    //     path: "/orders/admins",
    //     size: "24px",
    //     Icon: TbCirclePlus,
    //   },
    //   {
    //     label: "Reschedule policy",
    //     path: "/orders/customers",
    //     size: "22px",
    //     Icon: FaRegRectangleList,
    //   },
    //   {
    //     label: "Cancellation policy",
    //     path: "/orders/customers",
    //     size: "24px",
    //     Icon: TbCirclePlus,
    //   },
    //   {
    //     label: "No show policy",
    //     path: "/orders/customers",
    //     size: "24px",
    //     Icon: TbCircleX,
    //   },
    // ],
  },
  {
    label: "Reports",
    Icon: TbReportSearch,
    path: "/reports",
    size: "24px",
  },
];

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
  } catch (e) {}

  const init = {};
  sidebarList.forEach((item) => {
    if (
      item.children &&
      item.children.some((c) => location.pathname === c.path)
    ) {
      init[item.label] = true;
    }
  });
  return init;
};
