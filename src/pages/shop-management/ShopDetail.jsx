import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Table,
  Textarea,
} from "../../design-system";
import {
  MdOutlineLocationOn,
  MdOutlinePhone,
  MdMailOutline,
} from "../../shared/icons/index";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetShopDetailsQuery,
  useGetAllEmployeesWithShopInfoQuery,
  useEditShopMutation,
  useGetShopReviewsQuery,
  useGetShopRevenueQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import ZoiperCallButton from "../../components/shared/ZoiperCallButton";
import useToaster from "../../components/ui/Toaster";
import DeleteShopModal from "./DeleteShopModal";
import dayjs from "dayjs";
import { DATE_TIME_FORMAT, formatDate, formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";
import {
  formatPhoneWithCountryCode,
  normalizeTel,
  normalizeWhatsAppDigits,
  openTel,
  openWhatsApp,
} from "../../utilities/contactLinks";
import {
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryStatusPill,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import { BlockUserButton, AnonymizeDeleteModal } from "../user-management/UserBlockActions";
import { isAccountBlocked } from "../../utilities/accountBlocked";
import ShopRoutingPolicyCard from "./ShopRoutingPolicyCard";
import ShopRevenueTab from "./ShopRevenueTab";
import ShopReportTab from "./ShopReportTab";
import { buildShopOrderFinanceColumns } from "./shopOrderFinanceColumns";
import { shopSettlementPath } from "../reports/reportUi";
import { buildShopReportModel, shopReportHtml } from "./shopReportDocument";
import { printHtmlDocument } from "../order-management/invoice/invoiceView";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const TAB_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 22,
};

const FORM_GRID = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
  gap: 16,
};

const DAY_ORDER = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const PAYOUT_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
];

const COLLECTION_OPTIONS = [
  { value: "Driver Pickup", label: "Driver Pickup" },
  { value: "Customer Drop-off", label: "Customer Drop-off" },
  { value: "Both", label: "Both" },
];

const DELIVERY_OPTIONS = [
  { value: "Driver Delivery", label: "Driver Delivery" },
  { value: "Customer Collect", label: "Customer Collect" },
  { value: "Both", label: "Both" },
];

const TABS = [
  { value: "overview", label: "Overview" },
  { value: "orders", label: "Orders" },
  { value: "revenue", label: "Revenue" },
  { value: "report", label: "Report" },
  { value: "reviews", label: "Reviews" },
  { value: "staff", label: "Staff" },
  { value: "documents", label: "Documents" },
  { value: "settings", label: "Settings" },
  { value: "services", label: "Services" },
];

// Canonical "pending" bucket — mirrors backend constants/bookingStatusIds.js
// (PENDING_EXCLUDED: Completed, On-Hold customer, Cancelled, On-Hold agent).
// Keep in sync with the shop-list pending count and admin order sidebar.
const PENDING_EXCLUDED_STATUS_IDS = [17, 18, 19, 24];
const isPendingOrder = (order) =>
  !PENDING_EXCLUDED_STATUS_IDS.includes(Number(order?.bookingStatus?.id));

const toHourMinute = (value, fallback) => {
  if (!value || typeof value !== "string") return fallback;
  const [hh = "00", mm = "00"] = value.split(":");
  return `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
};

const buildOpeningHours = (workingHours = []) => {
  const byDay = new Map(
    (Array.isArray(workingHours) ? workingHours : []).map((item) => [
      String(item?.dayOfWeek || "").toLowerCase(),
      item,
    ])
  );

  return DAY_ORDER.map((day, index) => {
    const hit = byDay.get(day.toLowerCase());
    const enabled = Boolean(hit) && hit.status !== false;
    return {
      day,
      enabled,
      start: toHourMinute(hit?.openTime, index === 5 ? "09:00" : "08:00"),
      end: toHourMinute(hit?.closeTime, index === 5 ? "15:00" : "18:00"),
    };
  });
};

function Label({ children }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "var(--muted)",
        marginBottom: 6,
      }}
    >
      {children}
    </div>
  );
}

export default function ShopDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [orderFilter, setOrderFilter] = useState("all");

  const [controls, setControls] = useState({
    visible: true,
    acceptsOrders: true,
    featured: false,
    sameDay: false,
    emailNotifications: false,
    smsAlerts: false,
  });
  const [settingsForm, setSettingsForm] = useState({
    shopName: "",
    status: "active",
    email: "",
    phone: "",
    whatsapp: "",
    website: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    country: "",
    postcode: "",
    description: "",
  });
  const [deliverySettings, setDeliverySettings] = useState({
    collectionMethod: "Driver Pickup",
    deliveryMethod: "Driver Delivery",
    leadTimeHours: 24,
    maxActiveOrders: 50,
  });
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [anonymizeModal, setAnonymizeModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [openingHours, setOpeningHours] = useState(buildOpeningHours());
  const [financeSettings, setFinanceSettings] = useState({
    commissionRate: "",
    payoutSchedule: "weekly",
    minOrderValue: "",
    cancellationFee: "",
  });
  const [isSavePanelFixed, setIsSavePanelFixed] = useState(false);
  const [savePanelMetrics, setSavePanelMetrics] = useState({
    width: 320,
    height: 0,
    left: 0,
  });
  const savePanelSlotRef = useRef(null);
  const savePanelRef = useRef(null);

  const { success, error } = useToaster();
  const { data: shopResponse, isLoading, isError, refetch } = useGetShopDetailsQuery(id, {
    skip: !id,
  });
  const { data: revenueSnapshot } = useGetShopRevenueQuery(
    { shopId: id, period: "all", page: 1, limit: 1 },
    { skip: !id }
  );
  const { data: employeesResponse } = useGetAllEmployeesWithShopInfoQuery();
  const [editShop, { isLoading: isSavingSettings }] = useEditShopMutation();

  const shopPayload = shopResponse?.data;
  const shop =
    shopPayload &&
    typeof shopPayload === "object" &&
    !Array.isArray(shopPayload) &&
    (shopPayload.id != null || shopPayload.shopName)
      ? shopPayload
      : null;
  // `shop` is the bussinessInformation row; `shop.businessInfo` is the OWNER
  // users row (alias). So biz.id = owner user id (block/unblock/anonymize),
  // and shop.id = business id (reviews, settlement, reports).
  const biz = shop?.businessInfo;
  const businessInfoId = shop?.businessInfoId || shop?.id;
  const { data: shopReviewsResponse } = useGetShopReviewsQuery(
    { businessInfoId, limit: 20, page: 1 },
    { skip: !businessInfoId }
  );
  const shopReviewRows = useMemo(() => {
    const reviews = shopReviewsResponse?.data?.reviews;
    return Array.isArray(reviews) ? reviews : [];
  }, [shopReviewsResponse?.data?.reviews]);
  const shopRatingSummary = useMemo(() => {
    if (!shopReviewRows.length) {
      return { avg: 0, count: 0, histogram: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } };
    }
    const hist = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;
    let n = 0;
    for (const r of shopReviewRows) {
      if (r.visibility && r.visibility !== "published") continue;
      const rating = Number(r.rating);
      if (rating >= 1 && rating <= 5) {
        hist[rating] += 1;
        sum += rating;
        n += 1;
      }
    }
    return {
      avg: n ? Math.round((sum / n) * 10) / 10 : 0,
      count: n,
      histogram: hist,
    };
  }, [shopReviewRows]);
  const addr = shop?.addressDb;
  const orders = useMemo(
    () => shop?.orders ?? shop?.bookingDetails ?? [],
    [shop?.bookingDetails, shop?.orders]
  );
  const shopCurrencySymbol = useMemo(
    () =>
      resolveCurrencySymbol(addr?.zone ?? shop?.zone ?? shop, {
        applyDefault: true,
      }),
    [addr?.zone, shop]
  );
  const allEmployees = useMemo(
    () => employeesResponse?.data?.employees ?? [],
    [employeesResponse?.data?.employees]
  );

  const shopName = shop?.shopName || shop?.name || "Shop";
  const shopInitials = useMemo(() => {
    const parts = String(shopName || "")
      .split(" ")
      .filter(Boolean);
    return (parts[0]?.[0] || "S") + (parts[1]?.[0] || "H");
  }, [shopName]);

  const fullAddress = [
    addr?.streetAddress,
    addr?.district,
    addr?.province,
    addr?.city?.name,
    addr?.country?.name,
  ]
    .filter(Boolean)
    .join(", ");

  const totalRevenue = orders.reduce((sum, o) => {
    const statusId = Number(o?.bookingStatusId ?? o?.bookingStatus?.id);
    if (statusId === 19 || statusId === 21) return sum;
    const title = String(o?.bookingStatus?.title || "").toLowerCase();
    if (title.includes("cancel") || title.includes("refund")) return sum;
    const collected =
      statusId === 16 ||
      statusId === 17 ||
      title.includes("complete") ||
      title.includes("out for delivery");
    if (!collected) return sum;
    const gross = Number(o?.billingDetail?.total ?? o?.orderAmount ?? 0);
    const refunded = Number(o?.refunds?.totalRefunded ?? 0);
    return sum + Math.max(0, gross - refunded);
  }, 0);
  const completedOrders = orders.filter((o) =>
    String(o?.bookingStatus?.title || "")
      .toLowerCase()
      .includes("complete")
  ).length;
  const completionRate = orders.length
    ? Math.round((completedOrders / orders.length) * 100)
    : 0;

  const recentOrders = [...orders]
    .sort((a, b) => dayjs(b?.createdAt).valueOf() - dayjs(a?.createdAt).valueOf())
    .slice(0, 4);
  const allOrders = [...orders].sort(
    (a, b) => dayjs(b?.createdAt).valueOf() - dayjs(a?.createdAt).valueOf()
  );
  const pendingOrdersList = useMemo(
    () => allOrders.filter(isPendingOrder),
    [allOrders]
  );
  // Backend aggregate is the source of truth; fall back to the fetched list.
  const pendingOrdersCount =
    addr?.PendingBookingCount != null
      ? Number(addr.PendingBookingCount) || 0
      : pendingOrdersList.length;
  const visibleOrders =
    orderFilter === "pending" ? pendingOrdersList : allOrders;

  const shopServices = useMemo(() => {
    const rows = Array.isArray(biz?.agentServices) ? biz.agentServices : [];
    return rows
      .map((row, index) => {
        const svc = row?.service ?? {};
        return {
          sl: index + 1,
          junctionId: row?.id,
          serviceId: row?.serviceId ?? svc?.id,
          name: svc?.name || "—",
          description: svc?.description || "",
          turnaround:
            svc?.timeRequired != null && String(svc.timeRequired).trim() !== ""
              ? String(svc.timeRequired)
              : row?.serviceTimeRequired || "—",
          active: row?.status !== false && svc?.status !== false,
        };
      })
      .filter((row) => row.serviceId || row.name !== "—");
  }, [biz?.agentServices]);

  const shopStaff = useMemo(() => {
    const currentShopId = String(shop?.id ?? id ?? "");
    const detailStaffSource = Array.isArray(shop?.employees)
      ? shop.employees
      : Array.isArray(shop?.shopEmployees)
        ? shop.shopEmployees
        : [];

    const detailStaff = detailStaffSource.map((emp) => ({
      id: emp?.id,
      name: [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") || emp?.name || "—",
      email: emp?.email || "—",
      phone: emp?.phoneNum || emp?.phone || "—",
      role: emp?.role?.name || emp?.role || "—",
      status: typeof emp?.status === "boolean" ? emp.status : true,
    }));

    if (detailStaff.length) return detailStaff;

    return allEmployees
      .filter((emp) => {
        const employeeShopId =
          emp?.shopInfo?.id ?? emp?.shopId ?? emp?.laundryShopId ?? emp?.shop?.id ?? null;
        return String(employeeShopId ?? "") === currentShopId;
      })
      .map((emp) => ({
        id: emp?.id,
        name: [emp?.firstName, emp?.lastName].filter(Boolean).join(" ") || "—",
        email: emp?.email || "—",
        phone: emp?.phoneNum ? `${emp?.countryCode || ""} ${emp.phoneNum}`.trim() : "—",
        role: emp?.role?.name || emp?.role || "—",
        status: Boolean(emp?.status),
      }));
  }, [allEmployees, id, shop?.employees, shop?.id, shop?.shopEmployees]);

  const monthlyData = useMemo(() => {
    const months = [];
    for (let i = 6; i >= 0; i -= 1) {
      const start = dayjs().subtract(i, "month").startOf("month");
      const end = start.endOf("month");
      const count = orders.filter((o) => {
        const d = dayjs(o?.createdAt);
        return (
          d.isValid() &&
          d.isAfter(start.subtract(1, "millisecond")) &&
          d.isBefore(end.add(1, "millisecond"))
        );
      }).length;
      months.push({
        label: start.format("MMM"),
        count,
      });
    }
    return months;
  }, [orders]);

  const maxMonth = Math.max(...monthlyData.map((m) => m.count), 1);

  useEffect(() => {
    if (!shop) return;
    setIsBlocked(isAccountBlocked(biz));
    setSettingsForm({
      shopName: shop?.shopName || shop?.name || "",
      status: shop?.status === false ? "inactive" : "active",
      email: biz?.email || shop?.email || "",
      phone: biz?.phoneNum || shop?.phone || shop?.phoneNum || "",
      whatsapp: biz?.phoneNum || shop?.phone || shop?.phoneNum || "",
      website: biz?.website || "",
      addressLine1: addr?.streetAddress || "",
      addressLine2: addr?.district || "",
      city: addr?.city?.name || "",
      country: addr?.country?.name || "",
      postcode: addr?.postalCode || addr?.postalcode || "",
      description: shop?.description || "",
    });
    setDeliverySettings((prev) => ({
      ...prev,
      collectionMethod: shop?.collectionMethod || prev.collectionMethod,
      deliveryMethod: shop?.deliveryMethod || prev.deliveryMethod,
      leadTimeHours: Number(shop?.leadTimeHours ?? prev.leadTimeHours),
      maxActiveOrders: Number(shop?.maxActiveOrders ?? prev.maxActiveOrders),
    }));
    setOpeningHours(buildOpeningHours(biz?.bussinessWorkingHours));
    setAdminNotes(shop?.adminNotes || "");
    setControls({
      visible: shop?.visible ?? true,
      acceptsOrders: shop?.acceptsOrders ?? true,
      featured: Boolean(shop?.featured),
      sameDay: Boolean(shop?.sameDay),
      emailNotifications: Boolean(shop?.emailNotifications),
      smsAlerts: Boolean(shop?.smsAlerts),
    });
    setFinanceSettings({
      commissionRate:
        shop?.commissionRate != null && shop?.commissionRate !== ""
          ? String(shop.commissionRate)
          : "",
      payoutSchedule: shop?.payoutSchedule || "weekly",
      minOrderValue:
        shop?.minOrderValue != null && shop?.minOrderValue !== ""
          ? String(shop.minOrderValue)
          : "",
      cancellationFee:
        shop?.cancellationFee != null && shop?.cancellationFee !== ""
          ? String(shop.cancellationFee)
          : "",
    });
  }, [
    addr?.city?.name,
    addr?.country?.name,
    addr?.district,
    addr?.postalCode,
    addr?.postalcode,
    addr?.streetAddress,
    biz?.bussinessWorkingHours,
    biz?.email,
    biz?.phoneNum,
    biz?.website,
    shop,
  ]);

  const handleSettingsChange = (key) => (event) => {
    setSettingsForm((prev) => ({ ...prev, [key]: event?.target?.value ?? event }));
  };
  const handleDeliverySettingsChange = (key) => (event) => {
    setDeliverySettings((prev) => ({ ...prev, [key]: event?.target?.value ?? event }));
  };
  const handleOpeningHourChange = (index, key, value) => {
    setOpeningHours((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };
  const handleFinanceSettingsChange = (key) => (event) => {
    setFinanceSettings((prev) => ({ ...prev, [key]: event?.target?.value ?? event }));
  };

  const handleSaveSettings = async () => {
    if (!shop?.id) return;
    try {
      const res = await editShop({
        id: shop.id,
        body: {
          shopName: settingsForm.shopName,
          email: settingsForm.email,
          phone: settingsForm.phone,
          address: [
            settingsForm.addressLine1,
            settingsForm.addressLine2,
            settingsForm.city,
            settingsForm.country,
            settingsForm.postcode,
          ]
            .filter(Boolean)
            .join(", "),
          website: settingsForm.website,
          description: settingsForm.description,
          adminNotes,
          collectionMethod: deliverySettings.collectionMethod,
          deliveryMethod: deliverySettings.deliveryMethod,
          leadTimeHours: Number(deliverySettings.leadTimeHours) || 0,
          maxActiveOrders: Number(deliverySettings.maxActiveOrders) || 0,
        },
      }).unwrap();
      if (res?.status === "1" || res?.status === 1) {
        success(res?.message ?? "Shop updated successfully");
        refetch();
      } else {
        error(res?.message ?? "Failed to update shop");
      }
    } catch (err) {
      error(
        err?.data?.message ??
          err?.data?.error ??
          err?.message ??
          "Failed to update shop"
      );
    }
  };

  const handleDiscardSettings = () => {
    if (!shop) return;
    setSettingsForm({
      shopName: shop?.shopName || shop?.name || "",
      status: shop?.status === false ? "inactive" : "active",
      email: biz?.email || shop?.email || "",
      phone: biz?.phoneNum || shop?.phone || shop?.phoneNum || "",
      whatsapp: biz?.phoneNum || shop?.phone || shop?.phoneNum || "",
      website: biz?.website || "",
      addressLine1: addr?.streetAddress || "",
      addressLine2: addr?.district || "",
      city: addr?.city?.name || "",
      country: addr?.country?.name || "",
      postcode: addr?.postalCode || addr?.postalcode || "",
      description: shop?.description || "",
    });
    setDeliverySettings({
      collectionMethod: shop?.collectionMethod || "Driver Pickup",
      deliveryMethod: shop?.deliveryMethod || "Driver Delivery",
      leadTimeHours: Number(shop?.leadTimeHours ?? 24),
      maxActiveOrders: Number(shop?.maxActiveOrders ?? 50),
    });
    setControls({
      visible: shop?.visible ?? true,
      acceptsOrders: shop?.acceptsOrders ?? true,
      featured: Boolean(shop?.featured),
      sameDay: Boolean(shop?.sameDay),
      emailNotifications: Boolean(shop?.emailNotifications),
      smsAlerts: Boolean(shop?.smsAlerts),
    });
    setOpeningHours(buildOpeningHours(biz?.bussinessWorkingHours));
    setFinanceSettings({
      commissionRate:
        shop?.commissionRate != null && shop?.commissionRate !== ""
          ? String(shop.commissionRate)
          : "",
      payoutSchedule: shop?.payoutSchedule || "weekly",
      minOrderValue:
        shop?.minOrderValue != null && shop?.minOrderValue !== ""
          ? String(shop.minOrderValue)
          : "",
      cancellationFee:
        shop?.cancellationFee != null && shop?.cancellationFee !== ""
          ? String(shop.cancellationFee)
          : "",
    });
    setAdminNotes(shop?.adminNotes || "");
  };

  useEffect(() => {
    if (activeTab !== "settings") {
      setIsSavePanelFixed(false);
      return;
    }

    const STICKY_BOTTOM_OFFSET = 24;
    const TOGGLE_HYSTERESIS = 14;
    let rafId = null;
    let ticking = false;

    const updateSavePanelPosition = () => {
      if (!savePanelSlotRef.current) return;

      const slotRect = savePanelSlotRef.current.getBoundingClientRect();
      const panelHeight = Math.round(savePanelRef.current?.offsetHeight || 0);
      const panelWidth = Math.round(savePanelSlotRef.current?.offsetWidth || 320);
      const panelLeft = Math.round(slotRect.left);
      const viewportBottomTarget = window.innerHeight - panelHeight - STICKY_BOTTOM_OFFSET;

      setSavePanelMetrics((prev) => {
        if (
          prev.width === panelWidth &&
          prev.height === panelHeight &&
          prev.left === panelLeft
        ) {
          return prev;
        }
        return { width: panelWidth, height: panelHeight, left: panelLeft };
      });

      setIsSavePanelFixed((prev) => {
        const shouldFix = prev
          ? slotRect.top > viewportBottomTarget - TOGGLE_HYSTERESIS
          : slotRect.top > viewportBottomTarget + TOGGLE_HYSTERESIS;
        return prev === shouldFix ? prev : shouldFix;
      });
    };

    const scheduleUpdate = () => {
      if (ticking) return;
      ticking = true;
      rafId = window.requestAnimationFrame(() => {
        updateSavePanelPosition();
        ticking = false;
      });
    };

    updateSavePanelPosition();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", scheduleUpdate);
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeTab]);

  const orderColumns = useMemo(
    () =>
      buildShopOrderFinanceColumns({
        symbol: shopCurrencySymbol,
        onOpenOrder: (row) => {
          if (row?.id) navigate(`/orders/details/${row.id}`);
        },
      }),
    [navigate, shopCurrencySymbol]
  );

  const ownerName =
    [biz?.firstName, biz?.lastName].filter(Boolean).join(" ") || "—";
  // Owner phone with its dial code ("+44 7…") so display, tel: and wa.me all
  // carry the international prefix (stored separately as users.countryCode).
  const shopPhoneRaw = formatPhoneWithCountryCode(
    biz?.countryCode || shop?.countryCode,
    biz?.phoneNum || shop?.phone || shop?.phoneNum || settingsForm.phone || ""
  );
  const shopTel = normalizeTel(shopPhoneRaw);
  const shopWhatsApp = normalizeWhatsAppDigits(shopPhoneRaw);
  const canCallShop = Boolean(shopTel || shopWhatsApp);
  const rawShopStatus = addr?.status ?? shop?.status;
  const hasShopStatus = rawShopStatus != null;
  const shopStatusActive = Boolean(rawShopStatus);
  const shopDocuments = Array.isArray(shop?.documents) ? shop.documents : [];
  const todayName = dayjs().format("dddd");
  const profileLine = [
    biz?.matchProfileOptions || shop?.matchProfileOptions,
    shop?.createdAt ? `Est. ${formatDate(shop.createdAt, "MMMM YYYY")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const reportModel = useMemo(
    () =>
      buildShopReportModel({
        shop: {
          name: shopName,
          id: shop?.id,
          owner: ownerName,
          address: fullAddress,
          phone: shopPhoneRaw || "—",
          email: biz?.email || shop?.email || "—",
          zone: addr?.zone?.name || revenueSnapshot?.data?.shop?.zoneName || "—",
          established: shop?.createdAt
            ? formatDate(shop.createdAt, "MMMM YYYY")
            : "—",
        },
        revenue: revenueSnapshot?.data || null,
        ratings: shopRatingSummary,
        currencySymbol: shopCurrencySymbol,
        ordersTotal: orders.length,
        pendingCount: pendingOrdersCount,
        completionRate,
      }),
    [
      shopName,
      shop,
      ownerName,
      fullAddress,
      shopPhoneRaw,
      biz,
      addr,
      revenueSnapshot,
      shopRatingSummary,
      shopCurrencySymbol,
      orders.length,
      pendingOrdersCount,
      completionRate,
    ]
  );

  const reportHtml = useMemo(() => shopReportHtml(reportModel), [reportModel]);

  const handleGenerateReport = () => {
    printHtmlDocument(reportHtml);
  };

  if (isLoading) return <Delay />;

  if (isError || !shop) {
    return (
      <div>
        <PageHeader
          title="Shop details"
          description="Shop profile, orders, revenue, staff, reviews, and settings"
        />
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            {isError ? "Could not load this shop." : "Shop not found."}
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
            <Button variant="secondary" onClick={() => navigate("/shop-management/shops")}>
              Back to shops
            </Button>
            {isError ? (
              <Button variant="secondary" onClick={() => refetch()}>
                Retry
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={shopName}
        description="Shop profile, orders, revenue, staff, reviews, and settings"
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => navigate("/shop-management/shops")}
            >
              Back to shops
            </Button>
            <Button
              variant="secondary"
              disabled={!canCallShop}
              onClick={() => setContactModalOpen(true)}
              title={canCallShop ? "Call or message this shop" : "No phone number on file"}
            >
              Call shop
            </Button>
            {shopSettlementPath(id) ? (
              <Button
                variant="secondary"
                onClick={() => navigate(shopSettlementPath(id))}
              >
                Cash settlement
              </Button>
            ) : null}
            <BlockUserButton
              userId={biz?.id}
              userType="agent"
              isBlocked={isBlocked}
              onSuccess={(blocked) => {
                setIsBlocked(blocked);
                refetch();
              }}
            />
            <Button variant="danger" onClick={() => setAnonymizeModal(true)}>
              Delete &amp; Anonymize
            </Button>
            <Button onClick={() => setActiveTab("settings")}>Edit Shop</Button>
          </>
        }
      />

      <AnonymizeDeleteModal
        open={anonymizeModal}
        onClose={() => setAnonymizeModal(false)}
        userId={biz?.id}
        userType="agent"
        onSuccess={() => navigate("/shop-management/shops")}
      />

      <Modal
        open={contactModalOpen}
        title="Call shop"
        description={shopName}
        onClose={() => setContactModalOpen(false)}
        hideFooter
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              background: "var(--canvas)",
              padding: 12,
              color: "var(--ink-2)",
              fontWeight: 600,
            }}
          >
            {shopPhoneRaw || "No phone number"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Button
              variant="primary"
              disabled={!shopTel}
              onClick={() => {
                if (!openTel(shopTel)) return;
                setContactModalOpen(false);
              }}
            >
              Direct call
            </Button>
            <Button
              variant="secondary"
              disabled={!shopWhatsApp}
              onClick={() => {
                if (!openWhatsApp(shopWhatsApp)) return;
                setContactModalOpen(false);
              }}
            >
              WhatsApp
            </Button>
            <ZoiperCallButton
              phone={shopTel || shopWhatsApp}
              onAfterClick={() => setContactModalOpen(false)}
            />
            <Button variant="ghost" onClick={() => setContactModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      <div
        style={{
          ...CARD,
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          marginBottom: 22,
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: 16,
            background: "var(--n-100, #EEF2FF)",
            color: "var(--brand, #00028B)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            fontWeight: 800,
          }}
        >
          {shopInitials}
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {hasShopStatus ? (
              <Badge tone={shopStatusActive ? "success" : "danger"}>
                {shopStatusActive ? "Active" : "Inactive"}
              </Badge>
            ) : null}
            <Badge tone="neutral">{`ID: ${shop?.id ?? "—"}`}</Badge>
          </div>
          {profileLine ? (
            <p className="jd-lead" style={{ margin: "8px 0 0" }}>
              {profileLine}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MdOutlineLocationOn size={14} /> {fullAddress || "Address not available"}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MdOutlinePhone size={14} /> {shopPhoneRaw || "—"}
            </span>
            {canCallShop ? (
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="border-0 bg-transparent p-0 text-[13px] font-semibold text-[#2c3ba0] hover:underline"
              >
                Call shop
              </button>
            ) : null}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MdMailOutline size={14} /> {biz?.email || "—"}
            </span>
          </div>
        </div>
      </div>

      <DirectoryMetrics
        items={[
          {
            label: "Rating",
            value: shopRatingSummary.count > 0 ? shopRatingSummary.avg.toFixed(1) : "—",
            tone: "warning",
            hint: shopRatingSummary.count ? `${shopRatingSummary.count} reviews` : undefined,
          },
          { label: "Orders", value: orders.length, tone: "brand" },
          { label: "Pending", value: pendingOrdersCount, tone: "warning" },
          {
            label: "Revenue",
            value: formatMoney(
              revenueSnapshot?.data?.period?.grossRevenue ?? totalRevenue,
              shopCurrencySymbol
            ),
            tone: "navy",
            hint: revenueSnapshot?.data?.period
              ? `${revenueSnapshot.data.period.ordersCompleted || 0} collected · open Revenue for periods`
              : "Open Revenue for 7d / 30d / monthly",
          },
          { label: "Completion", value: `${completionRate}%`, tone: "success" },
        ]}
      />
      <div style={TAB_ROW}>
        {TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={activeTab === tab.value ? "primary" : "secondary"}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.value === "reviews"
              ? `Reviews (${shopRatingSummary.count})`
              : tab.label}
          </Button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <strong>Shop information</strong>
              </div>
              <div style={FORM_GRID}>
                <div><Label>Owner</Label><div>{ownerName}</div></div>
                <div><Label>Primary email</Label><div>{biz?.email || "—"}</div></div>
                <div><Label>Phone</Label><div>{shopPhoneRaw || "—"}</div></div>
                <div><Label>WhatsApp</Label><div>{shopPhoneRaw || "—"}</div></div>
                <div><Label>Address</Label><div>{fullAddress || "—"}</div></div>
                <div><Label>Website</Label><div>{biz?.website || shop?.website || "—"}</div></div>
                <div><Label>Service radius</Label><div>{shop?.serviceRadius || "—"}</div></div>
                <div><Label>Turnaround time</Label><div>{shop?.turnAroundTime || "—"}</div></div>
                <div>
                  <Label>Min order value</Label>
                  <div>
                    {shop?.minOrderValue != null && shop?.minOrderValue !== ""
                      ? formatMoney(shop.minOrderValue, shopCurrencySymbol)
                      : "—"}
                  </div>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Label>Description</Label>
                  <p className="jd-lead" style={{ margin: 0 }}>
                    {shop?.description || "—"}
                  </p>
                </div>
              </div>
            </div>

            <div style={CARD}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <strong>Monthly orders</strong>
                  <p className="jd-lead" style={{ margin: "4px 0 0" }}>Last 7 months</p>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 150 }}>
                {monthlyData.map((m, idx) => (
                  <div key={`${m.label}-${idx}`} style={{ flex: 1, textAlign: "center" }}>
                    <div className="jd-lead">{m.count}</div>
                    <div
                      style={{
                        height: `${Math.max((m.count / maxMonth) * 100, 12)}%`,
                        minHeight: 12,
                        background: idx === monthlyData.length - 1 ? "var(--brand, #00028B)" : "var(--n-300, #A5B4FC)",
                        borderRadius: "10px 10px 0 0",
                        margin: "6px 0",
                      }}
                    />
                    <div>{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                <strong>Recent orders</strong>
                <Button size="sm" variant="ghost" onClick={() => setActiveTab("orders")}>
                  View all
                </Button>
              </div>
              <DirectoryTableWrap>
                <Table
                  columns={orderColumns}
                  rows={recentOrders}
                  rowKey={(row) => row.id}
                  empty="No orders found for this shop."
                />
              </DirectoryTableWrap>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={CARD}>
              <strong>Opening hours</strong>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {openingHours.map((row) => {
                  const time = row.enabled ? `${row.start} - ${row.end}` : "Closed";
                  const isToday = row.day === todayName;
                  return (
                    <div
                      key={row.day}
                      style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                    >
                      <span
                        style={
                          isToday
                            ? { color: "var(--brand, #00028B)", fontWeight: 700 }
                            : undefined
                        }
                      >
                        {row.day}
                      </span>
                      <span
                        style={{
                          color:
                            time === "Closed"
                              ? "var(--danger)"
                              : isToday
                                ? "var(--brand, #00028B)"
                                : "inherit",
                          fontWeight: isToday ? 700 : undefined,
                        }}
                      >
                        {time}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={CARD}>
              <strong>Activity feed</strong>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                {recentOrders.length ? (
                  recentOrders.map((order) => {
                    const status = order?.bookingStatus?.title || "Updated";
                    const title = `#${order.orderTrackId || order.id} ${status}`;
                    const when = formatDate(order?.createdAt, DATE_TIME_FORMAT);
                    return (
                      <div key={order.id || title}>
                        <div>{title}</div>
                        <p className="jd-lead" style={{ margin: "2px 0 0" }}>{when}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="jd-lead" style={{ margin: 0 }}>
                    No recent order activity for this shop.
                  </p>
                )}
              </div>
            </div>

            <div style={CARD}>
              <strong>Quick actions</strong>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                <Button variant="secondary" onClick={() => setActiveTab("settings")}>
                  Edit shop details
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "orders" && (
        <div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button
                size="sm"
                variant={orderFilter === "all" ? "primary" : "secondary"}
                onClick={() => setOrderFilter("all")}
              >
                {`All (${allOrders.length})`}
              </Button>
              <Button
                size="sm"
                variant={orderFilter === "pending" ? "primary" : "secondary"}
                onClick={() => setOrderFilter("pending")}
              >
                {`Pending (${pendingOrdersCount})`}
              </Button>
            </div>
            <Badge tone="neutral">{`${visibleOrders.length} shown`}</Badge>
          </div>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            Collection and delivery windows, pickup/delivery timing, and the money
            split (gross, shop net, platform fee + commission) match the Revenue tab.
            Service fee is platform income, not shop net.
          </p>
          <DirectoryTableWrap>
            <Table
              columns={orderColumns}
              rows={visibleOrders}
              rowKey={(row) => row.id}
              empty={
                orderFilter === "pending"
                  ? "No pending orders for this shop."
                  : "No orders found for this shop."
              }
            />
          </DirectoryTableWrap>
        </div>
      )}

      {activeTab === "revenue" && (
        <ShopRevenueTab shopId={id} fallbackSymbol={shopCurrencySymbol} />
      )}

      {activeTab === "report" && (
        <ShopReportTab model={reportModel} onDownload={handleGenerateReport} />
      )}

      {activeTab === "reviews" && (
        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div>
              <strong>Customer reviews</strong>
              <p className="jd-lead" style={{ margin: "4px 0 0" }}>
                Per-order feedback for this shop
              </p>
            </div>
            <div>
              {shopRatingSummary.count > 0
                ? `${shopRatingSummary.avg.toFixed(1)} · ${shopRatingSummary.count} reviews`
                : "No reviews yet"}
            </div>
          </div>

          {shopRatingSummary.count > 0 ? (
            <div style={{ maxWidth: 420, marginBottom: 20 }}>
              {[5, 4, 3, 2, 1].map((star) => {
                const n = shopRatingSummary.histogram[star] || 0;
                const pct = shopRatingSummary.count
                  ? Math.round((n / shopRatingSummary.count) * 100)
                  : 0;
                return (
                  <div key={star} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ width: 14 }}>{star}</span>
                    <div
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 999,
                        background: "var(--n-100)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: "var(--warning, #F59E0B)",
                        }}
                      />
                    </div>
                    <span style={{ width: 28, color: "var(--muted)" }}>{n}</span>
                  </div>
                );
              })}
            </div>
          ) : null}

          {shopReviewRows.length === 0 ? (
            <p className="jd-lead" style={{ margin: 0 }}>
              No customer reviews for this shop yet.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {shopReviewRows.map((r) => (
                <div key={r.id} style={{ ...CARD, boxShadow: "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <strong>Order {r.orderTrackId || r.bookingId}</strong>
                    <Badge tone="warning">{`${Number(r.rating) || 0} stars`}</Badge>
                  </div>
                  <p className="jd-lead" style={{ margin: "6px 0 0" }}>
                    {r.customer?.name || r.customerName || "Customer"}
                    {r.submittedAt ? ` · ${formatDate(r.submittedAt)}` : ""}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                    {(r.reasons || []).map((reason) => (
                      <Badge
                        key={`${r.id}-${reason.code}`}
                        tone={reason.sentiment === "positive" ? "success" : "danger"}
                      >
                        {reason.label || reason.code}
                      </Badge>
                    ))}
                  </div>
                  {r.comment ? <p style={{ margin: "8px 0 0" }}>{r.comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "staff" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <strong>Staff</strong>
            <Badge tone="neutral">{`${shopStaff.length} total`}</Badge>
          </div>
          <DirectoryTableWrap>
            <Table
              columns={[
                {
                  key: "name",
                  header: "Staff",
                  render: (row) => (
                    <DirectoryIdentity
                      name={row.name}
                      meta={joinMeta(row.email, row.phone)}
                      id={row.id}
                    />
                  ),
                },
                { key: "role", header: "Role" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <DirectoryStatusPill active={row.status} />,
                },
              ]}
              rows={shopStaff}
              rowKey={(row, i) => row.id || `${row.email}-${i}`}
              empty="No staff found for this shop."
            />
          </DirectoryTableWrap>
        </div>
      )}

      {activeTab === "services" && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
            <strong>Services offered by this shop</strong>
            <Badge tone="neutral">
              {`${shopServices.length} service${shopServices.length === 1 ? "" : "s"}`}
            </Badge>
          </div>
          <DirectoryTableWrap>
            <Table
              columns={[
                {
                  key: "name",
                  header: "Service",
                  render: (row) => (
                    <DirectoryIdentity
                      name={row.name}
                      meta={row.description}
                      id={row.serviceId}
                    />
                  ),
                },
                { key: "turnaround", header: "Turnaround" },
                {
                  key: "status",
                  header: "Status",
                  render: (row) => <DirectoryStatusPill active={row.active} />,
                },
              ]}
              rows={shopServices}
              rowKey={(row) => row.junctionId ?? row.serviceId}
              empty="No services assigned to this shop yet."
            />
          </DirectoryTableWrap>
        </div>
      )}

      {activeTab === "documents" && (
        <div>
          <strong style={{ display: "block", marginBottom: 16 }}>Documents</strong>
          {shopDocuments.length ? (
            <DirectoryTableWrap>
              <Table
                columns={[
                  {
                    key: "name",
                    header: "Document",
                    render: (row) => (
                      <DirectoryIdentity name={row.name || "—"} meta={row.type} id={row.id} />
                    ),
                  },
                  {
                    key: "status",
                    header: "Status",
                    render: (row) => (
                      <DirectoryDotPill>{row.status || "—"}</DirectoryDotPill>
                    ),
                  },
                ]}
                rows={shopDocuments}
                rowKey={(row, i) => row.id || `${row.name}-${i}`}
                empty="No documents are on file for this shop."
              />
            </DirectoryTableWrap>
          ) : (
            <p className="jd-lead" style={{ margin: 0 }}>
              No documents are on file for this shop.
            </p>
          )}
        </div>
      )}

      {activeTab === "settings" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={CARD}>
              <strong>Profile</strong>
              <div style={{ ...FORM_GRID, marginTop: 16 }}>
                <Field label="Shop name" htmlFor="detail-shop-name">
                  <Input
                    id="detail-shop-name"
                    value={settingsForm.shopName}
                    onChange={handleSettingsChange("shopName")}
                  />
                </Field>
                <Field label="Status">
                  <Select
                    aria-label="Status"
                    value={settingsForm.status}
                    onChange={handleSettingsChange("status")}
                    options={STATUS_OPTIONS}
                  />
                </Field>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Website" htmlFor="detail-website">
                    <Input
                      id="detail-website"
                      value={settingsForm.website}
                      onChange={handleSettingsChange("website")}
                    />
                  </Field>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Description" htmlFor="detail-description">
                    <Textarea
                      id="detail-description"
                      rows={3}
                      value={settingsForm.description}
                      onChange={handleSettingsChange("description")}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div style={CARD}>
              <strong>Contact information</strong>
              <div style={{ ...FORM_GRID, marginTop: 16 }}>
                <Field label="Email address" htmlFor="detail-email">
                  <Input
                    id="detail-email"
                    value={settingsForm.email}
                    onChange={handleSettingsChange("email")}
                  />
                </Field>
                <Field label="Phone number" htmlFor="detail-phone">
                  <Input
                    id="detail-phone"
                    value={settingsForm.phone}
                    onChange={handleSettingsChange("phone")}
                  />
                </Field>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="WhatsApp" htmlFor="detail-whatsapp">
                    <Input
                      id="detail-whatsapp"
                      value={settingsForm.whatsapp}
                      onChange={handleSettingsChange("whatsapp")}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div style={CARD}>
              <strong>Address & location</strong>
              <div style={{ ...FORM_GRID, marginTop: 16 }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Address line 1" htmlFor="detail-address-1">
                    <Input
                      id="detail-address-1"
                      value={settingsForm.addressLine1}
                      onChange={handleSettingsChange("addressLine1")}
                    />
                  </Field>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <Field label="Address line 2" htmlFor="detail-address-2">
                    <Input
                      id="detail-address-2"
                      value={settingsForm.addressLine2}
                      onChange={handleSettingsChange("addressLine2")}
                    />
                  </Field>
                </div>
                <Field label="City" htmlFor="detail-city">
                  <Input id="detail-city" value={settingsForm.city} onChange={handleSettingsChange("city")} />
                </Field>
                <Field label="Country" htmlFor="detail-country">
                  <Input
                    id="detail-country"
                    value={settingsForm.country}
                    onChange={handleSettingsChange("country")}
                  />
                </Field>
                <Field label="Postcode" htmlFor="detail-postcode">
                  <Input
                    id="detail-postcode"
                    value={settingsForm.postcode}
                    onChange={handleSettingsChange("postcode")}
                  />
                </Field>
              </div>
            </div>

            <div style={CARD}>
              <strong>Opening hours</strong>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {openingHours.map((row, index) => (
                  <div
                    key={row.day}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "140px 70px 1fr",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <span>{row.day}</span>
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={(e) =>
                        handleOpeningHourChange(index, "enabled", e.target.checked)
                      }
                      aria-label={`${row.day} open`}
                    />
                    {row.enabled ? (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8 }}>
                        <Input
                          type="time"
                          value={row.start}
                          onChange={(e) =>
                            handleOpeningHourChange(index, "start", e.target.value)
                          }
                        />
                        <span style={{ color: "var(--muted)", alignSelf: "center" }}>to</span>
                        <Input
                          type="time"
                          value={row.end}
                          onChange={(e) =>
                            handleOpeningHourChange(index, "end", e.target.value)
                          }
                        />
                      </div>
                    ) : (
                      <span style={{ color: "var(--danger)" }}>Closed</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={CARD}>
              <strong>Finance & commission</strong>
              <div style={{ ...FORM_GRID, marginTop: 16 }}>
                <Field label="Commission rate (%)" htmlFor="detail-commission">
                  <Input
                    id="detail-commission"
                    value={financeSettings.commissionRate}
                    onChange={handleFinanceSettingsChange("commissionRate")}
                  />
                </Field>
                <Field label="Payout schedule">
                  <Select
                    aria-label="Payout schedule"
                    value={financeSettings.payoutSchedule}
                    onChange={handleFinanceSettingsChange("payoutSchedule")}
                    options={PAYOUT_OPTIONS}
                  />
                </Field>
                <Field label="Minimum order value" htmlFor="detail-min-order">
                  <Input
                    id="detail-min-order"
                    value={financeSettings.minOrderValue}
                    onChange={handleFinanceSettingsChange("minOrderValue")}
                  />
                </Field>
                <Field label="Cancellation fee" htmlFor="detail-cancel-fee">
                  <Input
                    id="detail-cancel-fee"
                    value={financeSettings.cancellationFee}
                    onChange={handleFinanceSettingsChange("cancellationFee")}
                  />
                </Field>
              </div>
            </div>

            <ShopRoutingPolicyCard shopUserId={biz?.id} />

            <div style={{ ...CARD, borderColor: "var(--danger)" }}>
              <strong style={{ color: "var(--danger)" }}>Danger zone</strong>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <div>
                    <div>Delete shop</div>
                    <p className="jd-lead" style={{ margin: "4px 0 0" }}>
                      Permanently removes this shop.
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setDeleteModalOpen(true)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={CARD}>
              <strong>Settings</strong>
              <div style={{ marginTop: 12 }}>
                {[
                  { key: "visible", title: "Shop visible", sub: "Shown on customer app" },
                  { key: "acceptsOrders", title: "Accepting orders", sub: "Allow new bookings" },
                  { key: "featured", title: "Featured shop", sub: "Highlighted in search" },
                  { key: "sameDay", title: "Same-day available", sub: "Show same-day badge" },
                  { key: "emailNotifications", title: "Email notifications", sub: "Send order updates" },
                  { key: "smsAlerts", title: "SMS alerts", sub: "Text message updates" },
                ].map((item) => (
                  <div
                    key={item.key}
                    style={{
                      padding: "10px 0",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <div>
                      <div>{item.title}</div>
                      <p className="jd-lead" style={{ margin: "2px 0 0" }}>{item.sub}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(controls[item.key])}
                      onChange={(e) =>
                        setControls((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      aria-label={item.title}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div style={CARD}>
              <strong>Collection & delivery</strong>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <Field label="Collection method">
                  <Select
                    aria-label="Collection method"
                    value={deliverySettings.collectionMethod}
                    onChange={handleDeliverySettingsChange("collectionMethod")}
                    options={COLLECTION_OPTIONS}
                  />
                </Field>
                <Field label="Delivery method">
                  <Select
                    aria-label="Delivery method"
                    value={deliverySettings.deliveryMethod}
                    onChange={handleDeliverySettingsChange("deliveryMethod")}
                    options={DELIVERY_OPTIONS}
                  />
                </Field>
                <Field label="Default lead time (hours)" htmlFor="detail-lead-time">
                  <Input
                    id="detail-lead-time"
                    type="number"
                    value={deliverySettings.leadTimeHours}
                    onChange={handleDeliverySettingsChange("leadTimeHours")}
                  />
                </Field>
                <Field label="Max active orders" htmlFor="detail-max-orders">
                  <Input
                    id="detail-max-orders"
                    type="number"
                    value={deliverySettings.maxActiveOrders}
                    onChange={handleDeliverySettingsChange("maxActiveOrders")}
                  />
                </Field>
              </div>
            </div>

            <div style={CARD}>
              <strong>Admin notes</strong>
              <div style={{ marginTop: 16 }}>
                <Textarea
                  rows={4}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>

            <div style={CARD}>
              <strong>Change log</strong>
              <p className="jd-lead" style={{ margin: "12px 0 0" }}>
                No change history is available for this shop.
              </p>
            </div>

            <div ref={savePanelSlotRef}>
              {isSavePanelFixed && savePanelMetrics.height > 0 ? (
                <div style={{ height: `${savePanelMetrics.height}px` }} />
              ) : null}
              <div
                ref={savePanelRef}
                style={{
                  ...CARD,
                  position: isSavePanelFixed ? "fixed" : "static",
                  left: isSavePanelFixed ? `${savePanelMetrics.left}px` : "auto",
                  bottom: isSavePanelFixed ? 24 : "auto",
                  width: isSavePanelFixed ? `${savePanelMetrics.width}px` : "100%",
                  zIndex: isSavePanelFixed ? 1200 : 1,
                }}
              >
                <p className="jd-lead" style={{ margin: "0 0 8px" }}>
                  Ready to save your changes?
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                    {isSavingSettings ? "Saving..." : "Save all changes"}
                  </Button>
                  <Button variant="secondary" onClick={handleDiscardSettings}>
                    Discard
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeleteShopModal
        open={deleteModalOpen}
        shopData={{ id: shop?.id, name: shopName }}
        onClose={() => setDeleteModalOpen(false)}
        onShopDeleted={() => navigate("/shop-management/shops")}
      />
    </div>
  );
}
