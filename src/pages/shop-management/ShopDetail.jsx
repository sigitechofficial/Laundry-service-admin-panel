import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Tabs,
  Tab,
  Chip,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  MenuItem,
  Rating,
  LinearProgress,
  Stack,
} from "@mui/material";
import {
  MdOutlineLocationOn,
  MdOutlinePhone,
  MdMailOutline,
  IoChevronBackOutline,
  TbSparkles,
  BsCardList,
  AiFillFileText,
  TbCirclePlus,
} from "../../shared/icons/index";
import { useNavigate, useParams } from "react-router-dom";
import {
  useGetShopDetailsQuery,
  useGetAllEmployeesWithShopInfoQuery,
  useEditShopMutation,
  useGetShopReviewsQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import dayjs from "dayjs";

const CARD_SX = {
  borderRadius: "16px",
  border: "1px solid #E2E8F0",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
  overflow: "hidden",
  bgcolor: "#fff",
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
    return {
      day,
      enabled: Boolean(hit),
      start: toHourMinute(hit?.openTime, index === 5 ? "09:00" : "08:00"),
      end: toHourMinute(hit?.closeTime, index === 5 ? "15:00" : "18:00"),
    };
  });
};

const Label = ({ children }) => (
  <Typography
    sx={{
      fontSize: 10,
      fontWeight: 700,
      color: "#94A3B8",
      textTransform: "uppercase",
      letterSpacing: "0.09em",
      mb: 0.7,
    }}
  >
    {children}
  </Typography>
);

export default function ShopDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");

  const [controls, setControls] = useState({
    visible: true,
    acceptsOrders: true,
    featured: false,
    sameDay: true,
    emailNotifications: true,
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
  const [adminNotes, setAdminNotes] = useState(
    "Long-standing partner. Environmental health cert follow-up required."
  );
  const [openingHours, setOpeningHours] = useState(buildOpeningHours());
  const [financeSettings, setFinanceSettings] = useState({
    commissionRate: "12",
    payoutSchedule: "weekly",
    minOrderValue: "15.00",
    cancellationFee: "3.00",
  });
  const [isSavePanelFixed, setIsSavePanelFixed] = useState(false);
  const [savePanelMetrics, setSavePanelMetrics] = useState({
    width: 320,
    height: 0,
    left: 0,
  });
  const savePanelSlotRef = useRef(null);
  const savePanelRef = useRef(null);

  const { data: shopResponse, isLoading, refetch } = useGetShopDetailsQuery(id, {
    skip: !id,
  });
  const { data: employeesResponse } = useGetAllEmployeesWithShopInfoQuery();
  const [editShop, { isLoading: isSavingSettings }] = useEditShopMutation();

  const shop = shopResponse?.data ?? shopResponse;
  const biz = shop?.businessInfo;
  const businessInfoId = biz?.id || shop?.businessInfoId || shop?.id;
  const { data: shopReviewsResponse } = useGetShopReviewsQuery(
    { businessInfoId, limit: 20, page: 1 },
    { skip: !businessInfoId }
  );
  // Admin list endpoint returns { reviews, pagination }; public shop endpoint returns summary+reviews.
  // Prefer filtered admin inbox shape; fall back if backend adds summary later.
  const shopReviewsPayload = shopReviewsResponse?.data || {};
  const shopReviewRows = Array.isArray(shopReviewsPayload.reviews)
    ? shopReviewsPayload.reviews
    : [];
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
  const orders = shop?.orders ?? shop?.bookingDetails ?? [];
  const allEmployees = employeesResponse?.data?.employees ?? [];

  const shopName = shop?.shopName || "Laundry Shop";
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

  const totalRevenue = orders.reduce(
    (sum, o) => sum + Number(o?.orderAmount ?? o?.billingDetail?.total ?? 0),
    0
  );
  const completedOrders = orders.filter((o) =>
    String(o?.bookingStatus?.title || "")
      .toLowerCase()
      .includes("complete")
  ).length;
  const completionRate = orders.length
    ? Math.round((completedOrders / orders.length) * 100)
    : 0;

  const kpi = [
    { label: "Avg Rating", value: "4.8", delta: "+0.2", icon: <TbSparkles size={16} color="#1D4ED8" /> },
    { label: "Total Orders", value: orders.length.toLocaleString(), delta: "+12%", icon: <BsCardList size={16} color="#1D4ED8" /> },
    { label: "Revenue", value: `£${(totalRevenue / 1000).toFixed(1)}k`, delta: "+8%", icon: <AiFillFileText size={16} color="#1D4ED8" /> },
    { label: "Completion", value: `${completionRate}%`, delta: "+1%", icon: <TbCirclePlus size={16} color="#1D4ED8" /> },
  ];

  const recentOrders = [...orders]
    .sort((a, b) => dayjs(b?.createdAt).valueOf() - dayjs(a?.createdAt).valueOf())
    .slice(0, 4);
  const allOrders = [...orders].sort((a, b) => dayjs(b?.createdAt).valueOf() - dayjs(a?.createdAt).valueOf());

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
        return d.isValid() && d.isAfter(start.subtract(1, "millisecond")) && d.isBefore(end.add(1, "millisecond"));
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
      postcode: addr?.postalCode || "",
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
    setAdminNotes(
      shop?.adminNotes ||
        "Long-standing partner. Environmental health cert follow-up required."
    );
    setFinanceSettings((prev) => ({
      ...prev,
      minOrderValue: String(shop?.minOrderValue ?? prev.minOrderValue),
      commissionRate: String(shop?.commissionRate ?? prev.commissionRate),
    }));
  }, [addr?.city?.name, addr?.country?.name, addr?.district, addr?.postalCode, addr?.streetAddress, biz?.bussinessWorkingHours, biz?.email, biz?.phoneNum, biz?.website, shop]);

  const handleSettingsChange = (key) => (event) => {
    setSettingsForm((prev) => ({ ...prev, [key]: event.target.value }));
  };
  const handleDeliverySettingsChange = (key) => (event) => {
    setDeliverySettings((prev) => ({ ...prev, [key]: event.target.value }));
  };
  const handleOpeningHourChange = (index, key, value) => {
    setOpeningHours((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [key]: value } : row))
    );
  };
  const handleFinanceSettingsChange = (key) => (event) => {
    setFinanceSettings((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSaveSettings = async () => {
    if (!shop?.id) return;
    try {
      await editShop({
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
      refetch();
    } catch (e) {
      // Keep page interactive when API responds with validation errors.
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
      postcode: addr?.postalCode || "",
      description: shop?.description || "",
    });
    setDeliverySettings({
      collectionMethod: shop?.collectionMethod || "Driver Pickup",
      deliveryMethod: shop?.deliveryMethod || "Driver Delivery",
      leadTimeHours: Number(shop?.leadTimeHours ?? 24),
      maxActiveOrders: Number(shop?.maxActiveOrders ?? 50),
    });
    setControls({
      visible: true,
      acceptsOrders: true,
      featured: false,
      sameDay: true,
      emailNotifications: true,
      smsAlerts: false,
    });
    setOpeningHours(buildOpeningHours(biz?.bussinessWorkingHours));
    setFinanceSettings({
      commissionRate: String(shop?.commissionRate ?? 12),
      payoutSchedule: "weekly",
      minOrderValue: String(shop?.minOrderValue ?? "15.00"),
      cancellationFee: "3.00",
    });
    setAdminNotes(
      shop?.adminNotes ||
        "Long-standing partner. Environmental health cert follow-up required."
    );
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

  if (isLoading) return <Delay />;

  return (
    <Box sx={{ width: "100%", bgcolor: "#F8FAFC", borderRadius: "12px", overflow: "hidden" }}>
      <Paper
        square
        sx={{
          borderBottom: "1px solid #E2E8F0",
          px: 3,
          py: 1.2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box className="flex items-center gap-3">
          <Button
                  onClick={() => navigate("/shop-management")}
            startIcon={<IoChevronBackOutline size={14} />}
            sx={{ textTransform: "none", color: "#64748B", fontSize: 13, minWidth: "auto", px: 0 }}
          >
            Shops
          </Button>
          <Typography sx={{ fontSize: 13, color: "#CBD5E1" }}>/</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#334155" }}>{shopName}</Typography>
        </Box>
        <Box className="flex items-center gap-2">
          <Button
            variant="outlined"
            size="small"
            sx={{ textTransform: "none", bgcolor: "#F1F5F9", borderColor: "#E2E8F0", color: "#475569" }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            size="small"
            sx={{ textTransform: "none", bgcolor: "#00028B", "&:hover": { bgcolor: "#00016F" } }}
          >
            Edit Shop
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          px: 3,
          py: 3,
          color: "#0F172A",
          bgcolor: "#FFFFFF",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <Box className="flex flex-col xl:flex-row xl:items-end gap-5">
          <Box sx={{ width: 84, height: 84, borderRadius: "16px", bgcolor: "#E0E7FF", color: "#00028B", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 700 }}>
            {shopInitials}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box className="flex items-center gap-2 flex-wrap">
              <Typography sx={{ fontSize: 36, fontWeight: 700, lineHeight: 1 }}>{shopName}</Typography>
              <Chip size="small" label="Active" sx={{ bgcolor: "#E0E7FF", color: "#00028B", fontWeight: 600 }} />
              <Chip size="small" label="Pro Plan" sx={{ bgcolor: "#FBBF24", color: "#78350F", fontWeight: 700 }} />
            </Box>
            <Typography sx={{ fontSize: 13, color: "#64748B", mt: 0.6 }}>Premium laundry & dry cleaning · Est. January 2021</Typography>
            <Box className="flex items-center gap-4 flex-wrap mt-2">
              <Typography sx={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 0.8 }}>
                <MdOutlineLocationOn size={14} /> {fullAddress || "Address not available"}
              </Typography>
              <Typography sx={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 0.8 }}>
                <MdOutlinePhone size={14} /> {biz?.phoneNum || "—"}
                </Typography>
              <Typography sx={{ fontSize: 13, color: "#334155", display: "flex", alignItems: "center", gap: 0.8 }}>
                <MdMailOutline size={14} /> {biz?.email || "—"}
                </Typography>
            </Box>
          </Box>
          <Box className="flex gap-2.5 flex-wrap">
            <Box sx={{ px: 2.4, py: 1.6, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
              <Typography sx={{ fontSize: 31, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>
                {shopRatingSummary.count > 0 ? shopRatingSummary.avg.toFixed(1) : "—"}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.4 }}>
                Rating{shopRatingSummary.count > 0 ? ` (${shopRatingSummary.count})` : ""}
              </Typography>
            </Box>
            <Box sx={{ px: 2.4, py: 1.6, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
              <Typography sx={{ fontSize: 31, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>{orders.length}</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.4 }}>Orders</Typography>
            </Box>
            <Box sx={{ px: 2.4, py: 1.6, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
              <Typography sx={{ fontSize: 31, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>£{(totalRevenue / 1000).toFixed(1)}k</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.4 }}>Revenue</Typography>
            </Box>
            <Box sx={{ px: 2.4, py: 1.6, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC" }}>
              <Typography sx={{ fontSize: 31, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>{completionRate}%</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.4 }}>Completion</Typography>
            </Box>
          </Box>
        </Box>
      </Box>

      <Paper square elevation={0} sx={{ borderBottom: "1px solid #E2E8F0", boxShadow: "none" }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          sx={{ px: 2, minHeight: 44, "& .MuiTab-root": { minHeight: 44, textTransform: "none", fontSize: 13, fontWeight: 500 } }}
        >
          <Tab value="overview" label="Overview" />
          <Tab value="orders" label="Orders" />
          <Tab value="reviews" label={`Reviews (${shopRatingSummary.count})`} />
          <Tab value="staff" label="Staff" />
          <Tab value="documents" label="Documents" />
          <Tab value="settings" label="Settings" />
          <Tab value="services" label="Services" />
        </Tabs>
      </Paper>

      <Box sx={{ py: 3, px: 0 }}>
        {activeTab === "reviews" && (
          <Paper sx={{ ...CARD_SX, p: 2.5 }}>
            <Box className="flex items-center justify-between flex-wrap gap-3" sx={{ mb: 2 }}>
              <Box>
                <Typography sx={{ fontSize: 18, fontWeight: 700 }}>Customer reviews</Typography>
                <Typography sx={{ fontSize: 13, color: "#64748B" }}>
                  Per-order feedback for this shop
                </Typography>
              </Box>
              <Box className="flex items-center gap-2">
                <Rating value={shopRatingSummary.avg || 0} precision={0.1} readOnly />
                <Typography sx={{ fontSize: 14, color: "#334155" }}>
                  {shopRatingSummary.count > 0
                    ? `${shopRatingSummary.avg.toFixed(1)} · ${shopRatingSummary.count} reviews`
                    : "No reviews yet"}
                </Typography>
              </Box>
            </Box>

            {shopRatingSummary.count > 0 && (
              <Box sx={{ mb: 2.5, maxWidth: 420 }}>
                {[5, 4, 3, 2, 1].map((star) => {
                  const n = shopRatingSummary.histogram[star] || 0;
                  const pct = shopRatingSummary.count
                    ? Math.round((n / shopRatingSummary.count) * 100)
                    : 0;
                  return (
                    <Box key={star} className="flex items-center gap-2" sx={{ mb: 0.8 }}>
                      <Typography sx={{ width: 14, fontSize: 12 }}>{star}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={pct}
                        sx={{ flex: 1, height: 6, borderRadius: 4 }}
                      />
                      <Typography sx={{ width: 28, fontSize: 12, color: "#64748B" }}>{n}</Typography>
                    </Box>
                  );
                })}
              </Box>
            )}

            {shopReviewRows.length === 0 ? (
              <Typography sx={{ color: "#64748B", fontSize: 14 }}>
                No customer reviews for this shop yet.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {shopReviewRows.map((r) => (
                  <Box
                    key={r.id}
                    sx={{
                      p: 1.75,
                      border: "1px solid #E2E8F0",
                      borderRadius: "12px",
                      bgcolor: "#F8FAFC",
                    }}
                  >
                    <Box className="flex items-center justify-between gap-2 flex-wrap">
                      <Typography sx={{ fontSize: 13, fontWeight: 600 }}>
                        Order {r.orderTrackId || r.bookingId}
                      </Typography>
                      <Rating value={Number(r.rating) || 0} size="small" readOnly />
                    </Box>
                    <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.5 }}>
                      {r.customer?.name || r.customerName || "Customer"}
                      {r.submittedAt
                        ? ` · ${dayjs(r.submittedAt).format("DD MMM YYYY")}`
                        : ""}
                    </Typography>
                    <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 1 }}>
                      {(r.reasons || []).map((reason) => (
                        <Chip
                          key={`${r.id}-${reason.code}`}
                          size="small"
                          variant="outlined"
                          color={reason.sentiment === "positive" ? "success" : "error"}
                          label={reason.label || reason.code}
                        />
                      ))}
                    </Stack>
                    {r.comment ? (
                      <Typography sx={{ fontSize: 13, color: "#334155", mt: 1 }}>
                        {r.comment}
                      </Typography>
                    ) : null}
                  </Box>
                ))}
              </Stack>
            )}
          </Paper>
        )}

        {activeTab === "overview" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "2fr 1fr" }, gap: 2.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" }, gap: 1.5 }}>
                {kpi.map((item) => (
                  <Paper key={item.label} sx={{ ...CARD_SX, p: 1.9 }}>
                    <Box className="flex items-center justify-between mb-2">
                      <Box
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "10px",
                          bgcolor: "#E0E7FF",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Chip size="small" label={item.delta} sx={{ fontSize: 10, bgcolor: "#E0E7FF", color: "#00028B" }} />
                    </Box>
                    <Typography sx={{ fontSize: 30, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{item.value}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.5 }}>{item.label}</Typography>
                  </Paper>
                ))}
              </Box>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Shop Information</Typography>
                  <Chip size="small" label={`ID: SH-${String(shop?.id || "00000").padStart(5, "0")}`} sx={{ bgcolor: "#F1F5F9", color: "#64748B", fontSize: 10 }} />
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2.2 }}>
                  <Box><Label>Owner</Label><Typography sx={{ fontSize: 14, color: "#1E293B", fontWeight: 500 }}>{shopName}</Typography></Box>
                  <Box><Label>Primary Email</Label><Typography sx={{ fontSize: 14, color: "#334155" }}>{biz?.email || "—"}</Typography></Box>
                  <Box><Label>Phone</Label><Typography sx={{ fontSize: 14, color: "#334155" }}>{biz?.phoneNum || "—"}</Typography></Box>
                  <Box><Label>WhatsApp</Label><Typography sx={{ fontSize: 14, color: "#334155" }}>{biz?.phoneNum || "—"}</Typography></Box>
                  <Box><Label>Address</Label><Typography sx={{ fontSize: 14, color: "#334155" }}>{fullAddress || "—"}</Typography></Box>
                  <Box><Label>Website</Label><Typography sx={{ fontSize: 14, color: "#00028B" }}>{biz?.website || "pristinelaundry.co.uk"}</Typography></Box>
                  <Box><Label>Service Radius</Label><Typography sx={{ fontSize: 14, color: "#334155" }}>{shop?.serviceRadius || "8 km"}</Typography></Box>
                  <Box><Label>Turnaround Time</Label><Typography sx={{ fontSize: 14, color: "#334155" }}>{shop?.turnAroundTime || "24–48 hours"}</Typography></Box>
                  <Box><Label>Min Order Value</Label><Typography sx={{ fontSize: 14, color: "#334155" }}>£{shop?.minOrderValue || "15.00"}</Typography></Box>
                  <Box>
                    <Label>Payment Methods</Label>
                    <Box className="flex gap-1.5 flex-wrap">
                      {["Card", "Apple Pay", "Cash"].map((p) => (
                        <Chip key={p} size="small" label={p} sx={{ bgcolor: "#F1F5F9", color: "#64748B", fontSize: 11 }} />
                      ))}
                    </Box>
                  </Box>
                  <Box>
                    <Label>Description</Label>
                    <Typography sx={{ fontSize: 14, color: "#475569", lineHeight: 1.45 }}>
                      {shop?.description ||
                        "Professional laundry, dry cleaning and ironing service serving Central London with same-day express options available."}
                    </Typography>
                  </Box>
                  <Box>
                    <Label>Tags</Label>
                    <Box className="flex gap-1.5 flex-wrap">
                      {["Dry Clean", "Express", "Premium"].map((t) => (
                        <Chip
                          key={t}
                          size="small"
                          label={t}
                          sx={{ bgcolor: "#E0E7FF", color: "#00028B", border: "1px solid #C7D2FE", fontSize: 11 }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Monthly Orders</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Last 7 months</Typography>
                  </Box>
                  <Chip size="small" label="↑ 12% this month" sx={{ fontSize: 10, bgcolor: "#E0E7FF", color: "#00028B" }} />
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Box className="flex items-end gap-3" sx={{ height: 150 }}>
                    {monthlyData.map((m, idx) => (
                      <Box key={`${m.label}-${idx}`} className="flex flex-col items-center gap-1 flex-1">
                        <Typography sx={{ fontSize: 10, color: "#94A3B8" }}>{m.count}</Typography>
                        <Box
                          sx={{
                            width: "100%",
                            height: `${Math.max((m.count / maxMonth) * 100, 12)}%`,
                            borderRadius: "10px 10px 0 0",
                            bgcolor: idx === monthlyData.length - 1 ? "#00028B" : "#A5B4FC",
                          }}
                        />
                        <Typography sx={{ fontSize: 11, color: idx === monthlyData.length - 1 ? "#00028B" : "#64748B", fontWeight: idx === monthlyData.length - 1 ? 700 : 400 }}>{m.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Recent Orders</Typography>
                  <Button size="small" onClick={() => setActiveTab("orders")} sx={{ textTransform: "none", fontSize: 12, color: "#00028B", fontWeight: 700 }}>
                    View All →
                  </Button>
              </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                        {["Order ID", "Customer", "Date", "Items", "Total", "Status"].map((h) => (
                          <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F1F5F9" }}>
                            {h}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map((order) => {
                        const status = String(order?.bookingStatus?.title || "Pending");
                        const completed = status.toLowerCase().includes("complete");
                        const cancelled = status.toLowerCase().includes("cancel");
                        return (
                          <TableRow key={order?.id} hover>
                            <TableCell sx={{ fontSize: 12, fontWeight: 700, color: "#00028B" }}>#{order?.orderTrackId || order?.id}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: "#334155" }}>
                              {`${order?.customer?.firstName || ""} ${order?.customer?.lastName || ""}`.trim() || "—"}
                            </TableCell>
                            <TableCell sx={{ fontSize: 12, color: "#94A3B8" }}>{order?.createdAt ? dayjs(order.createdAt).format("D MMM YYYY") : "—"}</TableCell>
                            <TableCell sx={{ fontSize: 13, color: "#475569" }}>{order?.totalItems || 0} items</TableCell>
                            <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>£{Number(order?.orderAmount || 0).toFixed(2)}</TableCell>
                            <TableCell>
                              <Chip
                                size="small"
                                label={status}
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  bgcolor: completed ? "#E0E7FF" : cancelled ? "#FEE2E2" : "#FEF9C3",
                                  color: completed ? "#00028B" : cancelled ? "#B91C1C" : "#92400E",
                                }}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2 }}>
              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Opening Hours</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  {openingHours.map((row, index) => {
                    const time = row.enabled ? `${row.start} - ${row.end}` : "Closed";
                    const highlight = index === 0;
                    const dayLabel = index === 0 ? `${row.day.slice(0, 3)} Today` : row.day;
                    return (
                    <Box
                      key={row.day}
                      className="flex items-center justify-between"
                      sx={{
                        px: 1.4,
                        py: 0.9,
                        borderRadius: "10px",
                        bgcolor: highlight ? "#EEF2FF" : "transparent",
                        border: highlight ? "1px solid #C7D2FE" : "none",
                      }}
                    >
                      <Typography sx={{ fontSize: 13, color: highlight ? "#00028B" : "#475569", fontWeight: highlight ? 600 : 400 }}>{dayLabel}</Typography>
                      <Typography sx={{ fontSize: 13, color: time === "Closed" ? "#EF4444" : highlight ? "#00028B" : "#475569", fontWeight: time === "Closed" ? 600 : 500 }}>
                        {time}
                      </Typography>
                    </Box>
                  );
                  })}
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Activity Feed</Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", rowGap: 2 }}>
                  {[
                    ["#201-169595 completed", "Today, 11:32 AM", "#00028B"],
                    ["New 5-star review posted", "Yesterday, 3:14 PM", "#60A5FA"],
                    ["Business licence expiring in 14 days", "3 Mar, 9:00 AM", "#FBBF24"],
                    ["Upgraded to Pro Plan", "1 Mar, 10:00 AM", "#CBD5E1"],
                  ].map((a, idx) => (
                    <Box key={`${a[0]}-${idx}`} className="flex gap-2.5">
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.7 }}>
                        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: a[2], boxShadow: `0 0 0 4px ${a[2]}22` }} />
                        {idx < 3 && <Box sx={{ width: 1, height: 26, bgcolor: "#E2E8F0", mt: 1 }} />}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 13, color: "#334155" }}>{a[0]}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.2 }}>{a[1]}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Paper sx={{ ...CARD_SX, p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A", mb: 1.5 }}>
                  Quick Actions
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", rowGap: 1 }}>
                  <Button sx={{ justifyContent: "flex-start", textTransform: "none", bgcolor: "#F8FAFC", color: "#475569", borderRadius: "12px", px: 1.6, py: 1.1 }}>
                    Edit Shop Details
                  </Button>
                  <Button sx={{ justifyContent: "flex-start", textTransform: "none", bgcolor: "#F8FAFC", color: "#475569", borderRadius: "12px", px: 1.6, py: 1.1 }}>
                    Message Owner
                  </Button>
                  <Button sx={{ justifyContent: "flex-start", textTransform: "none", bgcolor: "#FEF2F2", color: "#DC2626", borderRadius: "12px", px: 1.6, py: 1.1 }}>
                    Suspend Shop
                  </Button>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {activeTab === "orders" && (
          <Paper sx={CARD_SX}>
            <Box
              sx={{
                px: 2.5,
                py: 1.8,
                borderBottom: "1px solid #F1F5F9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                Orders
              </Typography>
              <Chip
                size="small"
                label={`${allOrders.length} total`}
                sx={{ bgcolor: "#F1F5F9", color: "#475569", fontSize: 10 }}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    {["Order ID", "Customer", "Date", "Items", "Total", "Status"].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#94A3B8",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allOrders.length ? (
                    allOrders.map((order) => {
                      const status = String(order?.bookingStatus?.title || "Pending");
                      const completed = status.toLowerCase().includes("complete");
                      const cancelled = status.toLowerCase().includes("cancel");
                      return (
                        <TableRow key={order?.id} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 700, color: "#00028B" }}>
                            #{order?.orderTrackId || order?.id}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#334155" }}>
                            {`${order?.customer?.firstName || ""} ${order?.customer?.lastName || ""}`.trim() || "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 12, color: "#94A3B8" }}>
                            {order?.createdAt ? dayjs(order.createdAt).format("D MMM YYYY") : "—"}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#475569" }}>{order?.totalItems || 0} items</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                            £{Number(order?.orderAmount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={status}
                              sx={{
                                fontSize: 11,
                                fontWeight: 700,
                                bgcolor: completed ? "#E0E7FF" : cancelled ? "#FEE2E2" : "#FEF9C3",
                                color: completed ? "#00028B" : cancelled ? "#B91C1C" : "#92400E",
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ fontSize: 13, color: "#94A3B8", py: 5, textAlign: "center" }}>
                        No orders found for this shop.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {activeTab === "staff" && (
          <Paper sx={CARD_SX}>
            <Box
              sx={{
                px: 2.5,
                py: 1.8,
                borderBottom: "1px solid #F1F5F9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                Staff
              </Typography>
              <Chip
                size="small"
                label={`${shopStaff.length} total`}
                sx={{ bgcolor: "#F1F5F9", color: "#475569", fontSize: 10 }}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    {["Name", "Email", "Phone", "Role", "Status"].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#94A3B8",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shopStaff.length ? (
                    shopStaff.map((staff, idx) => (
                      <TableRow key={`${staff.id || staff.email}-${idx}`} hover>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                          {staff.name}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#334155" }}>{staff.email}</TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#475569" }}>{staff.phone}</TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#334155" }}>{staff.role}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={staff.status ? "Active" : "Inactive"}
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: staff.status ? "#E0E7FF" : "#F1F5F9",
                              color: staff.status ? "#00028B" : "#64748B",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} sx={{ fontSize: 13, color: "#94A3B8", py: 5, textAlign: "center" }}>
                        No staff found for this shop.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {activeTab === "settings" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" }, gap: 2.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2 }}>
              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#00028B" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Profile
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <TextField label="Shop Name *" value={settingsForm.shopName} onChange={handleSettingsChange("shopName")} fullWidth size="small" />
                  <TextField select label="Status" value={settingsForm.status} onChange={handleSettingsChange("status")} fullWidth size="small">
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </TextField>
                  <TextField label="Website" value={settingsForm.website} onChange={handleSettingsChange("website")} fullWidth size="small" sx={{ gridColumn: { xs: "span 1", md: "span 2" } }} />
                  <TextField label="Description" value={settingsForm.description} onChange={handleSettingsChange("description")} fullWidth multiline minRows={3} sx={{ gridColumn: { xs: "span 1", md: "span 2" } }} />
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#60A5FA" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Contact Information
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <TextField label="Email Address *" value={settingsForm.email} onChange={handleSettingsChange("email")} fullWidth size="small" />
                  <TextField label="Phone Number *" value={settingsForm.phone} onChange={handleSettingsChange("phone")} fullWidth size="small" />
                  <TextField label="WhatsApp" value={settingsForm.whatsapp} onChange={handleSettingsChange("whatsapp")} fullWidth size="small" sx={{ gridColumn: { xs: "span 1", md: "span 2" } }} />
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#00028B" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Address & Location
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <TextField label="Address Line 1 *" value={settingsForm.addressLine1} onChange={handleSettingsChange("addressLine1")} fullWidth size="small" sx={{ gridColumn: { xs: "span 1", md: "span 2" } }} />
                  <TextField label="Address Line 2" value={settingsForm.addressLine2} onChange={handleSettingsChange("addressLine2")} fullWidth size="small" sx={{ gridColumn: { xs: "span 1", md: "span 2" } }} />
                  <TextField label="City" value={settingsForm.city} onChange={handleSettingsChange("city")} fullWidth size="small" />
                  <TextField label="Country" value={settingsForm.country} onChange={handleSettingsChange("country")} fullWidth size="small" />
                  <TextField label="Postcode" value={settingsForm.postcode} onChange={handleSettingsChange("postcode")} fullWidth size="small" />
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#F59E0B" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Opening Hours
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", rowGap: 1.3 }}>
                  {openingHours.map((row, index) => (
                    <Box key={row.day} sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "140px 70px 1fr" }, gap: 1.5, alignItems: "center" }}>
                      <Typography sx={{ fontSize: 12, color: "#475569" }}>{row.day}</Typography>
                      <Switch
                        checked={row.enabled}
                        onChange={(e) => handleOpeningHourChange(index, "enabled", e.target.checked)}
                        sx={{
                          width: 44,
                          height: 24,
                          p: 0,
                          "& .MuiSwitch-switchBase": {
                            p: 0.4,
                            transitionDuration: "220ms",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked": {
                            transform: "translateX(20px)",
                            color: "#FFFFFF",
                          },
                          "& .MuiSwitch-thumb": {
                            boxShadow: "0 1px 2px rgba(15,23,42,0.35)",
                            width: 18,
                            height: 18,
                          },
                          "& .MuiSwitch-track": {
                            borderRadius: "999px",
                            backgroundColor: "#CBD5E1",
                            opacity: 1,
                            transition: "background-color 220ms ease",
                          },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                            backgroundColor: "#00028B",
                            opacity: 1,
                          },
                        }}
                      />
                      {row.enabled ? (
                        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 24px 1fr", gap: 1, alignItems: "center" }}>
                          <TextField type="time" size="small" value={row.start} onChange={(e) => handleOpeningHourChange(index, "start", e.target.value)} />
                          <Typography sx={{ textAlign: "center", color: "#94A3B8", fontSize: 12 }}>to</Typography>
                          <TextField type="time" size="small" value={row.end} onChange={(e) => handleOpeningHourChange(index, "end", e.target.value)} />
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: 12, color: "#EF4444" }}>Closed</Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#A78BFA" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Finance & Commission
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <TextField size="small" label="Commission Rate (%)" value={financeSettings.commissionRate} onChange={handleFinanceSettingsChange("commissionRate")} />
                  <TextField select size="small" label="Payout Schedule" value={financeSettings.payoutSchedule} onChange={handleFinanceSettingsChange("payoutSchedule")}>
                    <MenuItem value="weekly">Weekly</MenuItem>
                    <MenuItem value="biweekly">Biweekly</MenuItem>
                    <MenuItem value="monthly">Monthly</MenuItem>
                  </TextField>
                  <TextField size="small" label="Minimum Order Value" value={financeSettings.minOrderValue} onChange={handleFinanceSettingsChange("minOrderValue")} />
                  <TextField size="small" label="Cancellation Fee" value={financeSettings.cancellationFee} onChange={handleFinanceSettingsChange("cancellationFee")} />
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#94A3B8" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Media Assets
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3,1fr)" }, gap: 1.2 }}>
                  {["Shopfront", "Interior", "Equipment"].map((label) => (
                    <Box key={label} sx={{ border: "1px dashed #CBD5E1", borderRadius: "10px", py: 2.4, px: 1.2, textAlign: "center", bgcolor: "#F8FAFC" }}>
                      <Typography sx={{ fontSize: 12, color: "#475569", mb: 0.4 }}>{label}</Typography>
                      <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Add Photo</Typography>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Paper sx={{ ...CARD_SX, borderColor: "#FECACA" }}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #FEE2E2" }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "#DC2626" }} />
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#B91C1C", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                      Danger Zone
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", rowGap: 1.2 }}>
                  <Box sx={{ p: 1.5, border: "1px solid #FECACA", bgcolor: "#FEF2F2", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.2 }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#991B1B" }}>Suspend Shop</Typography>
                      <Typography sx={{ fontSize: 11, color: "#B91C1C" }}>Temporarily disables new orders.</Typography>
                    </Box>
                    <Button variant="outlined" size="small" sx={{ textTransform: "none", color: "#B91C1C", borderColor: "#FCA5A5" }}>Suspend</Button>
                  </Box>
                  <Box sx={{ p: 1.5, border: "1px solid #FECACA", bgcolor: "#FEF2F2", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1.2 }}>
                    <Box>
                      <Typography sx={{ fontSize: 12, fontWeight: 600, color: "#991B1B" }}>Delete Shop</Typography>
                      <Typography sx={{ fontSize: 11, color: "#B91C1C" }}>Permanently removes this shop.</Typography>
                    </Box>
                    <Button variant="outlined" size="small" sx={{ textTransform: "none", color: "#B91C1C", borderColor: "#FCA5A5" }}>Delete</Button>
                  </Box>
                </Box>
              </Paper>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2 }}>
              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Settings</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  {[
                    { key: "visible", title: "Shop Visible", sub: "Shown on customer app" },
                    { key: "acceptsOrders", title: "Accepting Orders", sub: "Allow new bookings" },
                    { key: "featured", title: "Featured Shop", sub: "Highlighted in search" },
                    { key: "sameDay", title: "Same-Day Available", sub: "Show same-day badge" },
                    { key: "emailNotifications", title: "Email Notifications", sub: "Send order updates" },
                    { key: "smsAlerts", title: "SMS Alerts", sub: "Text message updates" },
                  ].map((item) => (
                    <Box key={item.key} sx={{ py: 1.2, display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F1F5F9" }}>
                      <Box>
                        <Typography sx={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>{item.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>{item.sub}</Typography>
                      </Box>
                      <Switch
                        checked={Boolean(controls[item.key])}
                        onChange={(e) => setControls((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#1D4ED8" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#1D4ED8" },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Collection & Delivery</Typography>
                </Box>
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", rowGap: 1.5 }}>
                  <TextField
                    select
                    size="small"
                    label="Collection Method"
                    value={deliverySettings.collectionMethod}
                    onChange={handleDeliverySettingsChange("collectionMethod")}
                  >
                    <MenuItem value="Driver Pickup">Driver Pickup</MenuItem>
                    <MenuItem value="Customer Drop-off">Customer Drop-off</MenuItem>
                    <MenuItem value="Both">Both</MenuItem>
                  </TextField>
                  <TextField
                    select
                    size="small"
                    label="Delivery Method"
                    value={deliverySettings.deliveryMethod}
                    onChange={handleDeliverySettingsChange("deliveryMethod")}
                  >
                    <MenuItem value="Driver Delivery">Driver Delivery</MenuItem>
                    <MenuItem value="Customer Collect">Customer Collect</MenuItem>
                    <MenuItem value="Both">Both</MenuItem>
                  </TextField>
                  <TextField
                    size="small"
                    type="number"
                    label="Default Lead Time (hours)"
                    value={deliverySettings.leadTimeHours}
                    onChange={handleDeliverySettingsChange("leadTimeHours")}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Max Active Orders"
                    value={deliverySettings.maxActiveOrders}
                    onChange={handleDeliverySettingsChange("maxActiveOrders")}
                  />
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Admin Notes</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  <TextField
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    multiline
                    minRows={4}
                    fullWidth
                    size="small"
                  />
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Change Log</Typography>
                </Box>
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", rowGap: 1.4 }}>
                  {[
                    ["Commission updated to 12%", "Admin · 01 Mar 2025", "#00028B"],
                    ["Plan upgraded to Pro Partner", "Admin · 15 Jan 2025", "#60A5FA"],
                    ["Opening hours modified", "Shop Owner · 10 Nov 2024", "#F59E0B"],
                    ["Shop profile created", "Admin · 12 Jan 2023", "#94A3B8"],
                  ].map(([title, sub, color], idx) => (
                    <Box key={`${title}-${idx}`} sx={{ display: "flex", gap: 1.2 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, mt: "6px", flexShrink: 0 }} />
                      <Box>
                        <Typography sx={{ fontSize: 12, color: "#334155" }}>{title}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>{sub}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Box ref={savePanelSlotRef}>
                {isSavePanelFixed && savePanelMetrics.height > 0 && (
                  <Box sx={{ height: `${savePanelMetrics.height}px` }} />
                )}
                <Paper
                  ref={savePanelRef}
                  sx={{
                    ...CARD_SX,
                    borderColor: "#C7D2FE",
                    position: isSavePanelFixed ? "fixed" : "static",
                    left: isSavePanelFixed ? `${savePanelMetrics.left}px` : "auto",
                    bottom: isSavePanelFixed ? 24 : "auto",
                    width: isSavePanelFixed ? `${savePanelMetrics.width}px` : "100%",
                    zIndex: isSavePanelFixed ? 1200 : 1,
                  }}
                >
                  <Box sx={{ p: 2, display: "flex", flexDirection: "column", rowGap: 1 }}>
                    <Typography sx={{ fontSize: 11, color: "#64748B" }}>Ready to save your changes?</Typography>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      sx={{ textTransform: "none", bgcolor: "#00028B", "&:hover": { bgcolor: "#00016F" } }}
                    >
                      {isSavingSettings ? "Saving..." : "Save All Changes"}
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleDiscardSettings}
                      sx={{ textTransform: "none", borderColor: "#E2E8F0", color: "#475569" }}
                    >
                      Discard
                    </Button>
                  </Box>
                </Paper>
              </Box>
            </Box>
          </Box>
        )}

        {activeTab === "services" && (
          <Paper sx={CARD_SX}>
            <Box
              sx={{
                px: 2.5,
                py: 1.8,
                borderBottom: "1px solid #F1F5F9",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                Services offered by this shop
              </Typography>
              <Chip
                size="small"
                label={`${shopServices.length} service${shopServices.length === 1 ? "" : "s"}`}
                sx={{ bgcolor: "#F1F5F9", color: "#475569", fontSize: 10 }}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    {["#", "Service", "Service ID", "Turnaround", "Status"].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#94A3B8",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          borderBottom: "1px solid #F1F5F9",
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {shopServices.length ? (
                    shopServices.map((row) => (
                      <TableRow key={row.junctionId ?? row.serviceId} hover>
                        <TableCell sx={{ fontSize: 12, color: "#64748B" }}>{row.sl}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                            {row.name}
                          </Typography>
                          {row.description ? (
                            <Typography
                              className="line-clamp-2"
                              sx={{ fontSize: 11, color: "#94A3B8", mt: 0.3 }}
                            >
                              {row.description}
                            </Typography>
                          ) : null}
                        </TableCell>
                        <TableCell sx={{ fontSize: 12, fontWeight: 600, color: "#00028B" }}>
                          {row.serviceId ?? "—"}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#475569" }}>{row.turnaround}</TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={row.active ? "Active" : "Inactive"}
                            sx={{
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: row.active ? "#E0E7FF" : "#F1F5F9",
                              color: row.active ? "#00028B" : "#64748B",
                            }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        sx={{ fontSize: 13, color: "#94A3B8", py: 5, textAlign: "center" }}
                      >
                        No services assigned to this shop yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {activeTab !== "overview" &&
          activeTab !== "orders" &&
          activeTab !== "staff" &&
          activeTab !== "settings" &&
          activeTab !== "services" && (
          <Paper sx={{ ...CARD_SX, p: 3 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 600, color: "#0F172A" }}>
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} section
            </Typography>
            <Typography sx={{ fontSize: 13, color: "#64748B", mt: 0.6 }}>
              The structure is aligned to the provided mock. This tab can be expanded with exact per-row data when needed.
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}
