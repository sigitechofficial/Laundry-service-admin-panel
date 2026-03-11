import { useEffect, useMemo, useState } from "react";
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
    email: "",
    phone: "",
    address: "",
    website: "",
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

  const { data: shopResponse, isLoading, refetch } = useGetShopDetailsQuery(id, {
    skip: !id,
  });
  const { data: employeesResponse } = useGetAllEmployeesWithShopInfoQuery();
  const [editShop, { isLoading: isSavingSettings }] = useEditShopMutation();

  const shop = shopResponse?.data ?? shopResponse;
  const biz = shop?.businessInfo;
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
    const serviceSources = [
      ...(Array.isArray(shop?.services) ? shop.services : []),
      ...(Array.isArray(shop?.serviceDetails) ? shop.serviceDetails : []),
      ...(Array.isArray(shop?.shopServices) ? shop.shopServices : []),
      ...(Array.isArray(shop?.serviceTimes) ? shop.serviceTimes : []),
      ...(Array.isArray(biz?.services) ? biz.services : []),
      ...(Array.isArray(shop?.laundryServices) ? shop.laundryServices : []),
    ];

    const mapped = serviceSources
      .map((s) => {
        const serviceId = s?.serviceId ?? s?.id ?? s?._id ?? s?.service?.id ?? null;
        const serviceName =
          s?.name ??
          s?.serviceName ??
          s?.title ??
          s?.type ??
          s?.service?.name ??
          s?.service?.serviceName ??
          (serviceId ? `Service ${serviceId}` : null);
        return {
          id: serviceId ?? serviceName,
          name: serviceName,
          timeRequired: s?.serviceTimeRequired ?? s?.timeRequired ?? s?.hoursRequired ?? "—",
          price: s?.price ?? s?.amount ?? s?.rate ?? s?.service?.price ?? null,
        };
      })
      .filter((s) => s.name);

    const fromOrders = orders
      .map((o) => o?.serviceType)
      .filter(Boolean)
      .map((serviceType) => ({
        id: serviceType,
        name: serviceType,
        timeRequired: "—",
        price: null,
      }));

    const uniqueMap = new Map();
    [...mapped, ...fromOrders].forEach((service) => {
      const key = String(service.id ?? service.name);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, service);
      }
    });

    return Array.from(uniqueMap.values());
  }, [biz?.services, orders, shop?.laundryServices, shop?.serviceDetails, shop?.serviceTimes, shop?.services, shop?.shopServices]);

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
      email: biz?.email || shop?.email || "",
      phone: biz?.phoneNum || shop?.phone || shop?.phoneNum || "",
      address: fullAddress || "",
      website: biz?.website || "",
      description: shop?.description || "",
    });
    setDeliverySettings((prev) => ({
      ...prev,
      collectionMethod: shop?.collectionMethod || prev.collectionMethod,
      deliveryMethod: shop?.deliveryMethod || prev.deliveryMethod,
      leadTimeHours: Number(shop?.leadTimeHours ?? prev.leadTimeHours),
      maxActiveOrders: Number(shop?.maxActiveOrders ?? prev.maxActiveOrders),
    }));
    setAdminNotes(
      shop?.adminNotes ||
        "Long-standing partner. Environmental health cert follow-up required."
    );
  }, [biz?.email, biz?.phoneNum, biz?.website, fullAddress, shop]);

  const handleSettingsChange = (key) => (event) => {
    setSettingsForm((prev) => ({ ...prev, [key]: event.target.value }));
  };
  const handleDeliverySettingsChange = (key) => (event) => {
    setDeliverySettings((prev) => ({ ...prev, [key]: event.target.value }));
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
          address: settingsForm.address,
          website: settingsForm.website,
          description: settingsForm.description,
          adminNotes,
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
      email: biz?.email || shop?.email || "",
      phone: biz?.phoneNum || shop?.phone || shop?.phoneNum || "",
      address: fullAddress || "",
      website: biz?.website || "",
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
    setAdminNotes(
      shop?.adminNotes ||
        "Long-standing partner. Environmental health cert follow-up required."
    );
  };

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
              <Typography sx={{ fontSize: 31, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>4.8</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.4 }}>Rating</Typography>
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
          <Tab value="services" label="Services" />
          <Tab value="staff" label="Staff" />
          <Tab value="reviews" label="Reviews" />
          <Tab value="documents" label="Documents" />
          <Tab value="settings" label="Settings" />
        </Tabs>
      </Paper>

      <Box sx={{ py: 3, px: 0 }}>
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
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Shop Controls</Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", rowGap: 2 }}>
                  {[
                    { key: "visible", title: "Visibility", sub: "Visible in app listings" },
                    { key: "acceptsOrders", title: "Accept Orders", sub: "Taking new bookings" },
                    { key: "featured", title: "Featured", sub: "Promoted in search" },
                    { key: "sameDay", title: "Same-Day Service", sub: "Express orders enabled" },
                  ].map((item) => (
                    <Box key={item.key} className="flex items-center justify-between">
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#334155" }}>{item.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>{item.sub}</Typography>
                      </Box>
                      <Switch
                        checked={Boolean(controls[item.key])}
                        onChange={(e) =>
                          setControls((prev) => ({ ...prev, [item.key]: e.target.checked }))
                        }
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: "#1D4ED8" },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#1D4ED8" },
                        }}
                      />
                    </Box>
                  ))}
                  <Box sx={{ borderTop: "1px solid #F1F5F9", pt: 2 }}>
                    <Box className="flex items-center gap-2">
                      <Box sx={{ width: 32, height: 32, borderRadius: "10px", bgcolor: "#E0E7FF" }} />
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#334155" }}>
                          Identity Verified
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>15 Jan 2021</Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Paper sx={{ p: 1.5, bgcolor: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "12px", boxShadow: "none" }}>
                    <Box className="flex items-center justify-between">
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#92400E" }}>Pro Plan</Typography>
                        <Typography sx={{ fontSize: 11, color: "#B45309" }}>12% commission rate</Typography>
                      </Box>
                      <Button size="small" sx={{ textTransform: "none", fontSize: 11, color: "#00028B", fontWeight: 700 }}>
                        Change
                      </Button>
                    </Box>
                  </Paper>
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Opening Hours</Typography>
                </Box>
                <Box sx={{ p: 2 }}>
                  {[
                    ["Mon Today", "8:00 - 18:00", true],
                    ["Tuesday", "8:00 - 18:00"],
                    ["Wednesday", "8:00 - 18:00"],
                    ["Thursday", "8:00 - 18:00"],
                    ["Friday", "8:00 - 18:00"],
                    ["Saturday", "9:00 - 15:00"],
                    ["Sunday", "Closed"],
                  ].map(([day, time, highlight]) => (
                    <Box
                      key={day}
                      className="flex items-center justify-between"
                      sx={{
                        px: 1.4,
                        py: 0.9,
                        borderRadius: "10px",
                        bgcolor: highlight ? "#EEF2FF" : "transparent",
                        border: highlight ? "1px solid #C7D2FE" : "none",
                      }}
                    >
                      <Typography sx={{ fontSize: 13, color: highlight ? "#00028B" : "#475569", fontWeight: highlight ? 600 : 400 }}>{day}</Typography>
                      <Typography sx={{ fontSize: 13, color: time === "Closed" ? "#EF4444" : highlight ? "#00028B" : "#475569", fontWeight: time === "Closed" ? 600 : 500 }}>
                        {time}
                      </Typography>
                    </Box>
                  ))}
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
                Services
              </Typography>
              <Chip
                size="small"
                label={`${shopServices.length} total`}
                sx={{ bgcolor: "#F1F5F9", color: "#475569", fontSize: 10 }}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    {["Service", "Time Required", "Price"].map((h) => (
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
                    shopServices.map((service, idx) => (
                      <TableRow key={`${service.id}-${idx}`} hover>
                        <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>
                          {service.name}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#475569" }}>
                          {service.timeRequired === "—" ? "—" : `${service.timeRequired}h`}
                        </TableCell>
                        <TableCell sx={{ fontSize: 13, color: "#334155" }}>
                          {service.price == null ? "—" : `£${Number(service.price).toFixed(2)}`}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ fontSize: 13, color: "#94A3B8", py: 5, textAlign: "center" }}>
                        No services configured for this shop.
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
                  Shop Profile
                </Typography>
              </Box>
              <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                <TextField label="Shop Name *" value={settingsForm.shopName} onChange={handleSettingsChange("shopName")} fullWidth size="small" />
                <TextField label="Email Address *" value={settingsForm.email} onChange={handleSettingsChange("email")} fullWidth size="small" />
                <TextField label="Phone Number *" value={settingsForm.phone} onChange={handleSettingsChange("phone")} fullWidth size="small" />
                <TextField label="Website" value={settingsForm.website} onChange={handleSettingsChange("website")} fullWidth size="small" />
                <TextField label="Address *" value={settingsForm.address} onChange={handleSettingsChange("address")} fullWidth size="small" sx={{ gridColumn: { xs: "span 1", md: "span 2" } }} />
                <TextField label="Description" value={settingsForm.description} onChange={handleSettingsChange("description")} fullWidth multiline minRows={4} sx={{ gridColumn: { xs: "span 1", md: "span 2" } }} />
              </Box>
            </Paper>

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

              <Paper sx={{ ...CARD_SX, borderColor: "#C7D2FE" }}>
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
        )}

        {activeTab !== "overview" && activeTab !== "orders" && activeTab !== "services" && activeTab !== "staff" && activeTab !== "settings" && (
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
