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
} from "@mui/material";
import {
  MdOutlineLocationOn,
  MdOutlinePhone,
  MdMailOutline,
  IoChevronBackOutline,
  TbFileDescription,
  AiFillFileText,
  TbSparkles,
  TbCalendar,
} from "../../../shared/icons/index";
import { useNavigate, useParams } from "react-router-dom";
import { useEditCustomerMutation, useGetCustomerByIdQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import DeleteOrderModal from "../../order-management/order-modals/DeleteOrderModal";

const PRIMARY = "#00028B";
const PRIMARY_LIGHT = "#E0E7FF";
const CARD_SX = {
  borderRadius: "16px",
  border: "1px solid #E2E8F0",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)",
  bgcolor: "#fff",
  overflow: "hidden",
};

const labelSx = {
  fontSize: 10,
  fontWeight: 700,
  color: "#94A3B8",
  textTransform: "uppercase",
  letterSpacing: "0.09em",
  mb: 0.6,
};

const statusChipSx = (status) => {
  const s = String(status || "").toLowerCase();
  if (s.includes("complete")) return { bgcolor: "#DCFCE7", color: "#15803D" };
  if (s.includes("cancel") || s.includes("refund")) return { bgcolor: "#FEF3C7", color: "#92400E" };
  return { bgcolor: "#DBEAFE", color: "#1D4ED8" };
};

const formatDate = (value) => (value ? dayjs(value).format("D MMM YYYY") : "—");

export default function CustomerDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState("overview");
  const [searchOrders, setSearchOrders] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, orderId: null });
  const [controls, setControls] = useState({
    accountActive: true,
    emailNotif: true,
    smsNotif: true,
    marketing: false,
  });
  const [settingsForm, setSettingsForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNum: "",
    streetAddress: "",
    province: "",
  });

  const { data, isLoading, refetch } = useGetCustomerByIdQuery(id, { skip: !id });
  const [editCustomer, { isLoading: isSavingCustomer }] = useEditCustomerMutation();
  const userDetails = data?.data?.userDetails;
  const bookingDetails = data?.data?.bookingDetails ?? [];
  const user = userDetails?.user;

  useEffect(() => {
    setSettingsForm({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phoneNum: user?.phoneNum || "",
      streetAddress: userDetails?.streetAddress || "",
      province: userDetails?.province || "",
    });
  }, [user?.email, user?.firstName, user?.lastName, user?.phoneNum, userDetails?.province, userDetails?.streetAddress]);

  const fullName = `${user?.firstName || ""} ${user?.lastName || ""}`.trim() || "Customer";
  const initials = `${user?.firstName?.[0] || "C"}${user?.lastName?.[0] || "U"}`.toUpperCase();
  const fullAddress = [userDetails?.streetAddress, userDetails?.province].filter(Boolean).join(", ") || "—";

  const lifetimeSpend = bookingDetails.reduce(
    (sum, b) => sum + Number(b?.orderAmount ?? b?.billingDetail?.total ?? 0),
    0
  );

  const monthlySpend = useMemo(() => {
    const points = [];
    for (let i = 6; i >= 0; i -= 1) {
      const start = dayjs().subtract(i, "month").startOf("month");
      const end = start.endOf("month");
      const amount = bookingDetails
        .filter((b) => {
          const d = dayjs(b?.createdAt);
          return d.isValid() && d.isAfter(start.subtract(1, "millisecond")) && d.isBefore(end.add(1, "millisecond"));
        })
        .reduce((sum, b) => sum + Number(b?.orderAmount ?? b?.billingDetail?.total ?? 0), 0);
      points.push({ label: start.format("MMM"), amount: Math.round(amount) });
    }
    return points;
  }, [bookingDetails]);
  const maxSpend = Math.max(...monthlySpend.map((m) => m.amount), 1);

  const recentOrders = [...bookingDetails]
    .sort((a, b) => dayjs(b?.createdAt).valueOf() - dayjs(a?.createdAt).valueOf())
    .slice(0, 4);
  const allOrders = [...bookingDetails].sort((a, b) => dayjs(b?.createdAt).valueOf() - dayjs(a?.createdAt).valueOf());

  const filteredOrders = allOrders.filter((order) => {
    if (!searchOrders.trim()) return true;
    const q = searchOrders.toLowerCase();
    return (
      String(order?.orderTrackId || "").toLowerCase().includes(q) ||
      String(order?.bookingStatus?.title || "").toLowerCase().includes(q) ||
      String(order?.laundryShop?.name || "").toLowerCase().includes(q)
    );
  });

  const handleViewOrderDetails = (order) => {
    const orderId = order?.id;
    if (!orderId) return;
    navigate(`/orders/details/${orderId}`);
  };

  const handleSettingsChange = (key) => (event) => {
    setSettingsForm((prev) => ({ ...prev, [key]: event.target.value }));
  };

  const handleSaveCustomerSettings = async () => {
    const customerId = user?.id || userDetails?.userId;
    if (!customerId) return;
    try {
      await editCustomer({
        id: customerId,
        body: {
          firstName: settingsForm.firstName,
          lastName: settingsForm.lastName,
          email: settingsForm.email,
          phoneNum: settingsForm.phoneNum,
          streetAddress: settingsForm.streetAddress,
          province: settingsForm.province,
        },
      }).unwrap();
      refetch();
    } catch (e) {
      // Keep page responsive when API rejects payload.
    }
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
        <Box className="flex items-center gap-2.5">
          <Button
            onClick={() => navigate("/customer-management")}
            startIcon={<IoChevronBackOutline size={14} />}
            sx={{ textTransform: "none", color: "#64748B", fontSize: 13, minWidth: "auto", px: 0 }}
          >
            Customers
          </Button>
          <Typography sx={{ fontSize: 13, color: "#CBD5E1" }}>/</Typography>
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{fullName}</Typography>
        </Box>
        <Box className="flex items-center gap-2">
          <Button size="small" variant="contained" onClick={() => navigate(`/customer-management/edit/${id}`)} sx={{ textTransform: "none", bgcolor: PRIMARY, "&:hover": { bgcolor: "#00016F" } }}>
            Edit Customer
          </Button>
        </Box>
      </Paper>

      <Box
        sx={{
          px: 3,
          py: 3,
          bgcolor: "#FFFFFF",
          color: "#0F172A",
          borderBottom: "1px solid #E2E8F0",
        }}
      >
        <Box className="flex flex-col xl:flex-row xl:items-end gap-5">
          <Box sx={{ width: 88, height: 88, borderRadius: "18px", bgcolor: PRIMARY_LIGHT, color: PRIMARY, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, fontWeight: 700, border: "1px solid #C7D2FE" }}>
            {initials}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Box className="flex items-center gap-2 flex-wrap">
              <Typography sx={{ fontSize: 34, fontWeight: 700, lineHeight: 1.05 }}>{fullName}</Typography>
              <Chip size="small" label="Active" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, border: "1px solid #C7D2FE", fontWeight: 600 }} />
              <Chip size="small" label="VIP Gold" sx={{ bgcolor: "#FBBF24", color: "#78350F", fontWeight: 700 }} />
            </Box>
            <Typography sx={{ fontSize: 13, color: "#64748B", mt: 0.8 }}>
              Customer since {dayjs(userDetails?.createdAt || user?.createdAt).isValid() ? dayjs(userDetails?.createdAt || user?.createdAt).format("MMMM YYYY") : "—"} · ID: CUS-{String(userDetails?.userId || user?.id || "00000").padStart(5, "0")}
            </Typography>
            <Box className="flex flex-wrap items-center gap-4 mt-2.5">
              <Typography sx={{ fontSize: 13, display: "flex", alignItems: "center", gap: 0.7, color: "#334155" }}>
                <MdMailOutline size={14} /> {user?.email || "—"}
              </Typography>
              <Typography sx={{ fontSize: 13, display: "flex", alignItems: "center", gap: 0.7, color: "#334155" }}>
                <MdOutlinePhone size={14} /> {user?.phoneNum || "—"}
                </Typography>
              <Typography sx={{ fontSize: 13, display: "flex", alignItems: "center", gap: 0.7, color: "#334155" }}>
                <MdOutlineLocationOn size={14} /> {fullAddress}
                </Typography>
            </Box>
          </Box>
          <Box className="flex gap-2.5 flex-wrap">
            <Box sx={{ px: 2.4, py: 1.5, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", textAlign: "center", minWidth: 90 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>{bookingDetails.length}</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.3 }}>Orders</Typography>
            </Box>
            <Box sx={{ px: 2.4, py: 1.5, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", textAlign: "center", minWidth: 90 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>£{lifetimeSpend.toFixed(0)}</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.3 }}>Lifetime Spend</Typography>
            </Box>
            <Box sx={{ px: 2.4, py: 1.5, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", textAlign: "center", minWidth: 90 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>4.9</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.3 }}>Avg Rating</Typography>
            </Box>
            <Box sx={{ px: 2.4, py: 1.5, borderRadius: "12px", border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", textAlign: "center", minWidth: 90 }}>
              <Typography sx={{ fontSize: 30, fontWeight: 700, lineHeight: 1, color: "#0F172A" }}>97%</Typography>
              <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.3 }}>On-Time</Typography>
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
          <Tab value="addresses" label="Addresses" />
          <Tab value="payments" label="Payments" />
          <Tab value="reviews" label="Reviews" />
          <Tab value="settings" label="Settings" />
        </Tabs>
      </Paper>

      <Box sx={{ py: 3, px: 0 }}>
        {activeTab === "overview" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "2fr 1fr" }, gap: 2.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" }, gap: 1.5 }}>
                {[
                  { title: "Total Orders", value: bookingDetails.length, delta: "+3 mo.", icon: <TbFileDescription size={18} color={PRIMARY} /> },
                  { title: "Lifetime Spend", value: `£${lifetimeSpend.toFixed(0)}`, delta: "+£215", icon: <AiFillFileText size={18} color={PRIMARY} /> },
                  { title: "Avg Rating Given", value: "4.9", delta: "Top 5%", icon: <TbSparkles size={18} color={PRIMARY} /> },
                  { title: "Order Frequency", value: "18 days", delta: "Regular", icon: <TbCalendar size={18} color={PRIMARY} /> },
                ].map((k) => (
                  <Paper key={k.title} sx={{ ...CARD_SX, p: 1.9 }}>
                    <Box className="flex items-center justify-between mb-2.5">
                      <Box sx={{ width: 35, height: 35, borderRadius: "10px", bgcolor: PRIMARY_LIGHT, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {k.icon}
                      </Box>
                      <Chip size="small" label={k.delta} sx={{ fontSize: 10, bgcolor: "#DCFCE7", color: "#15803D" }} />
                    </Box>
                    <Typography sx={{ fontSize: 30, fontWeight: 700, color: "#0F172A", lineHeight: 1 }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#64748B", mt: 0.4 }}>{k.title}</Typography>
                  </Paper>
                ))}
              </Box>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Personal Information</Typography>
                  <Chip size="small" label={`CUS-${String(userDetails?.userId || user?.id || "00000").padStart(5, "0")}`} sx={{ bgcolor: "#F1F5F9", color: "#64748B", fontSize: 10 }} />
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2,1fr)" }, gap: 2.2 }}>
                  <Box><Typography sx={labelSx}>Full Name</Typography><Typography sx={{ fontSize: 14, color: "#1E293B", fontWeight: 600 }}>{fullName}</Typography></Box>
                  <Box><Typography sx={labelSx}>Email Address</Typography><Typography sx={{ fontSize: 14, color: "#334155" }}>{user?.email || "—"}</Typography></Box>
                  <Box><Typography sx={labelSx}>Phone</Typography><Typography sx={{ fontSize: 14, color: "#334155" }}>{user?.phoneNum || "—"}</Typography></Box>
                  <Box><Typography sx={labelSx}>Date of Birth</Typography><Typography sx={{ fontSize: 14, color: "#334155" }}>{formatDate(user?.dob)}</Typography></Box>
                  <Box><Typography sx={labelSx}>Gender</Typography><Typography sx={{ fontSize: 14, color: "#334155" }}>{user?.gender || "—"}</Typography></Box>
                  <Box><Typography sx={labelSx}>Nationality</Typography><Typography sx={{ fontSize: 14, color: "#334155" }}>{user?.nationality || "—"}</Typography></Box>
                  <Box><Typography sx={labelSx}>Primary Address</Typography><Typography sx={{ fontSize: 14, color: "#334155" }}>{fullAddress}</Typography></Box>
                  <Box><Typography sx={labelSx}>Registered On</Typography><Typography sx={{ fontSize: 14, color: "#334155" }}>{formatDate(user?.createdAt)}</Typography></Box>
                  <Box><Typography sx={labelSx}>Platform</Typography><Box className="flex gap-1.5"><Chip size="small" label="App" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontSize: 11 }} /><Chip size="small" label="Web" sx={{ bgcolor: "#F1F5F9", color: "#475569", fontSize: 11 }} /></Box></Box>
                  <Box><Typography sx={labelSx}>Preferred Shop</Typography><Typography sx={{ fontSize: 14, color: PRIMARY, fontWeight: 600 }}>{bookingDetails?.[0]?.laundryShop?.name || "—"}</Typography></Box>
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Monthly Spend</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Last 7 months</Typography>
                  </Box>
                  <Chip size="small" label="↑ 18% this month" sx={{ fontSize: 10, bgcolor: "#DCFCE7", color: "#15803D" }} />
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Box className="flex items-end gap-3" sx={{ height: 160 }}>
                    {monthlySpend.map((m, idx) => (
                      <Box key={`${m.label}-${idx}`} className="flex flex-col items-center gap-1 flex-1">
                        <Typography sx={{ fontSize: 10, color: "#94A3B8" }}>£{m.amount}</Typography>
                        <Box sx={{ width: "100%", height: `${Math.max((m.amount / maxSpend) * 100, 12)}%`, borderRadius: "10px 10px 0 0", bgcolor: idx === monthlySpend.length - 1 ? PRIMARY : "#93C5FD" }} />
                        <Typography sx={{ fontSize: 11, color: idx === monthlySpend.length - 1 ? PRIMARY : "#64748B", fontWeight: idx === monthlySpend.length - 1 ? 700 : 400 }}>{m.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Recent Orders</Typography>
                  <Button size="small" onClick={() => setActiveTab("orders")} sx={{ textTransform: "none", fontSize: 12, color: PRIMARY, fontWeight: 700 }}>View All →</Button>
                </Box>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                        {["Order ID", "Shop", "Date", "Items", "Total", "Status"].map((h) => (
                          <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F1F5F9" }}>{h}</TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentOrders.map((order) => (
                        <TableRow key={order?.id} hover>
                          <TableCell sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>#{order?.orderTrackId || order?.id}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#334155" }}>{order?.laundryShop?.name || "—"}</TableCell>
                          <TableCell sx={{ fontSize: 12, color: "#94A3B8" }}>{formatDate(order?.createdAt)}</TableCell>
                          <TableCell sx={{ fontSize: 13, color: "#475569" }}>{order?.totalItems || 0}</TableCell>
                          <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>£{Number(order?.orderAmount || 0).toFixed(2)}</TableCell>
                          <TableCell><Chip size="small" label={order?.bookingStatus?.title || "Pending"} sx={{ ...statusChipSx(order?.bookingStatus?.title), fontSize: 11, fontWeight: 700 }} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2 }}>
              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Account Controls</Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", rowGap: 2 }}>
                  {[
                    { key: "accountActive", title: "Account Active", sub: "Can log in & order" },
                    { key: "emailNotif", title: "Email Notifications", sub: "Order updates via email" },
                    { key: "smsNotif", title: "SMS Notifications", sub: "Delivery alerts via SMS" },
                    { key: "marketing", title: "Marketing Emails", sub: "Promotions & offers" },
                  ].map((item) => (
                    <Box key={item.key} className="flex items-center justify-between">
                      <Box>
                        <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#334155" }}>{item.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>{item.sub}</Typography>
                      </Box>
                      <Switch
                        checked={Boolean(controls[item.key])}
                        onChange={(e) => setControls((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: PRIMARY },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: PRIMARY },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Saved Addresses</Typography>
                  <Button size="small" onClick={() => setActiveTab("addresses")} sx={{ textTransform: "none", fontSize: 12, color: PRIMARY, fontWeight: 700 }}>View All →</Button>
                </Box>
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", rowGap: 1.2 }}>
                  <Box sx={{ p: 1.5, border: "1px solid #BFDBFE", bgcolor: "#EFF6FF", borderRadius: "12px" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#1E40AF" }}>Home · Default</Typography>
                    <Typography sx={{ fontSize: 12, color: "#475569", mt: 0.4 }}>{fullAddress}</Typography>
                  </Box>
                  <Box sx={{ p: 1.5, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", borderRadius: "12px" }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>Office</Typography>
                    <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.4 }}>No secondary address</Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Payment Methods</Typography>
                  <Button size="small" onClick={() => setActiveTab("payments")} sx={{ textTransform: "none", fontSize: 12, color: PRIMARY, fontWeight: 700 }}>View All →</Button>
                </Box>
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", rowGap: 1 }}>
                  <Box sx={{ p: 1.4, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", borderRadius: "12px" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>•••• 4821</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Visa · Default</Typography>
                  </Box>
                  <Box sx={{ p: 1.4, border: "1px solid #E2E8F0", bgcolor: "#F8FAFC", borderRadius: "12px" }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>Apple Pay</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Verified</Typography>
                  </Box>
                </Box>
              </Paper>

              <Paper sx={CARD_SX}>
                <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9" }}>
                  <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>Activity Feed</Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", rowGap: 2 }}>
                  {recentOrders.map((order, idx) => (
                    <Box key={`${order?.id}-${idx}`} className="flex gap-2.5">
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", pt: 0.7 }}>
                        <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: idx === 0 ? "#22C55E" : "#60A5FA", boxShadow: idx === 0 ? "0 0 0 4px #DCFCE7" : "0 0 0 4px #DBEAFE" }} />
                        {idx < recentOrders.length - 1 && <Box sx={{ width: 1, height: 24, bgcolor: "#E2E8F0", mt: 1 }} />}
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 13, color: "#334155" }}>Order #{order?.orderTrackId || order?.id} {order?.bookingStatus?.title || "updated"}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8", mt: 0.2 }}>{order?.createdAt ? dayjs(order.createdAt).format("D MMM YYYY, h:mm A") : "—"}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Paper>

              <Paper sx={{ ...CARD_SX, p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A", mb: 1.5 }}>Quick Actions</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", rowGap: 1 }}>
                  <Button onClick={() => navigate(`/customer-management/edit/${id}`)} sx={{ justifyContent: "flex-start", textTransform: "none", bgcolor: "#F8FAFC", color: "#475569", borderRadius: "12px", px: 1.6, py: 1.1 }}>Edit Customer</Button>
                  <Button sx={{ justifyContent: "flex-start", textTransform: "none", bgcolor: "#F8FAFC", color: "#475569", borderRadius: "12px", px: 1.6, py: 1.1 }}>Send Email</Button>
                  <Button sx={{ justifyContent: "flex-start", textTransform: "none", bgcolor: "#FEF2F2", color: "#DC2626", borderRadius: "12px", px: 1.6, py: 1.1 }}>Suspend Account</Button>
                </Box>
              </Paper>
            </Box>
          </Box>
        )}

        {activeTab === "orders" && (
          <Paper sx={CARD_SX}>
            <Box sx={{ px: 2.5, py: 1.8, borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                All Orders <Typography component="span" sx={{ fontSize: 12, color: "#94A3B8", fontWeight: 400 }}>— {allOrders.length} total</Typography>
              </Typography>
              <TextField
                size="small"
                value={searchOrders}
                onChange={(e) => setSearchOrders(e.target.value)}
                placeholder="Search orders..."
                sx={{ width: 220 }}
              />
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                    {["Order ID", "Shop", "Collection", "Delivery", "Items", "Total", "Status", "Actions"].map((h) => (
                      <TableCell key={h} sx={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #F1F5F9" }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order?.id} hover>
                      <TableCell sx={{ fontSize: 12, fontWeight: 700, color: PRIMARY }}>#{order?.orderTrackId || order?.id}</TableCell>
                      <TableCell sx={{ fontSize: 13, color: "#334155" }}>{order?.laundryShop?.name || "—"}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: "#64748B" }}>{formatDate(order?.collectionDate)}</TableCell>
                      <TableCell sx={{ fontSize: 12, color: "#64748B" }}>{formatDate(order?.deliveryDate)}</TableCell>
                      <TableCell sx={{ fontSize: 13, color: "#475569" }}>{order?.totalItems || 0}</TableCell>
                      <TableCell sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>£{Number(order?.orderAmount || 0).toFixed(2)}</TableCell>
                      <TableCell><Chip size="small" label={order?.bookingStatus?.title || "Pending"} sx={{ ...statusChipSx(order?.bookingStatus?.title), fontSize: 11, fontWeight: 700 }} /></TableCell>
                      <TableCell>
                        <Box className="flex items-center gap-1">
                          <Button
                            size="small"
                            sx={{ textTransform: "none", minWidth: 0, color: PRIMARY }}
                            onClick={() => handleViewOrderDetails(order)}
                          >
                            View
                          </Button>
                          <Button
                            size="small"
                            sx={{ textTransform: "none", minWidth: 0, color: "#DC2626" }}
                            onClick={() => setDeleteModal({ open: true, orderId: order?.id })}
                          >
                            Delete
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filteredOrders.length && (
                    <TableRow>
                      <TableCell colSpan={8} sx={{ textAlign: "center", py: 5, color: "#94A3B8", fontSize: 13 }}>
                        No matching orders found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {activeTab === "addresses" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr", xl: "1fr 1fr 1fr" }, gap: 2 }}>
            <Paper sx={{ ...CARD_SX, borderColor: "#BFDBFE", borderWidth: "2px" }}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #DBEAFE", bgcolor: "#EFF6FF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>Home</Typography>
                <Chip size="small" label="Default" sx={{ bgcolor: PRIMARY_LIGHT, color: PRIMARY, fontSize: 10, fontWeight: 700 }} />
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ ...labelSx, mb: 0.3 }}>Address</Typography>
                <Typography sx={{ fontSize: 13, color: "#334155" }}>{fullAddress}</Typography>
              </Box>
            </Paper>
            <Paper sx={CARD_SX}>
              <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid #F1F5F9", bgcolor: "#F8FAFC" }}>
                <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#475569" }}>Office</Typography>
              </Box>
              <Box sx={{ p: 2.5 }}>
                <Typography sx={{ fontSize: 13, color: "#64748B" }}>No office address available.</Typography>
              </Box>
            </Paper>
            <Paper sx={{ ...CARD_SX, borderStyle: "dashed", borderWidth: "2px", borderColor: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 220 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#94A3B8" }}>+ Add New Address</Typography>
            </Paper>
          </Box>
        )}

        {activeTab === "payments" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "2fr 1fr" }, gap: 2.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 1.5 }}>
              {[
                { title: "•••• •••• •••• 4821", sub: "Expires 09 / 2027", tag: "Default" },
                { title: "•••• •••• •••• 7734", sub: "Expires 03 / 2026", tag: "" },
                { title: "Apple Pay", sub: "iPhone · Verified", tag: "" },
              ].map((m, idx) => (
                <Paper key={`${m.title}-${idx}`} sx={{ ...CARD_SX, p: 2.2 }}>
                  <Box className="flex items-center justify-between">
                    <Box>
                      <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{m.title}</Typography>
                      <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>{m.sub}</Typography>
                    </Box>
                    {m.tag ? <Chip size="small" label={m.tag} sx={{ bgcolor: "#DCFCE7", color: "#15803D", fontWeight: 700, fontSize: 10 }} /> : null}
                  </Box>
                </Paper>
              ))}
            </Box>
            <Paper sx={{ ...CARD_SX, p: 2.5, alignSelf: "start" }}>
              <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#0F172A", mb: 1.5 }}>Transaction Summary</Typography>
              <Box className="space-y-2">
                <Box className="flex items-center justify-between"><Typography sx={{ fontSize: 13, color: "#64748B" }}>Total Spent</Typography><Typography sx={{ fontSize: 20, fontWeight: 700, color: "#1E293B" }}>£{lifetimeSpend.toFixed(2)}</Typography></Box>
                <Box className="flex items-center justify-between"><Typography sx={{ fontSize: 13, color: "#64748B" }}>Completed Orders</Typography><Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{bookingDetails.filter((b) => String(b?.bookingStatus?.title || "").toLowerCase().includes("complete")).length}</Typography></Box>
                <Box className="flex items-center justify-between"><Typography sx={{ fontSize: 13, color: "#64748B" }}>Avg Order Value</Typography><Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>£{bookingDetails.length ? (lifetimeSpend / bookingDetails.length).toFixed(2) : "0.00"}</Typography></Box>
              </Box>
            </Paper>
          </Box>
        )}

        {activeTab === "reviews" && (
          <Box sx={{ display: "flex", flexDirection: "column", rowGap: 1.5, maxWidth: 860 }}>
            {[1, 2, 3].map((r) => (
              <Paper key={r} sx={{ ...CARD_SX, p: 2.5 }}>
                <Box className="flex items-start justify-between mb-2">
                  <Box>
                    <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>Review #{r}</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Customer feedback</Typography>
                  </Box>
                  <Typography sx={{ fontSize: 13, color: "#F59E0B", fontWeight: 700 }}>★★★★★</Typography>
                </Box>
                <Typography sx={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                  Great service and timely communication. Items were delivered clean and well packed.
                </Typography>
              </Paper>
            ))}
          </Box>
        )}

        {activeTab === "settings" && (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", xl: "2fr 1fr" }, gap: 2.5 }}>
            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 1.5 }}>
              <Paper sx={{ ...CARD_SX, p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B", mb: 1.2 }}>Customer Settings</Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
                  <TextField
                    label="First Name"
                    value={settingsForm.firstName}
                    onChange={handleSettingsChange("firstName")}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Last Name"
                    value={settingsForm.lastName}
                    onChange={handleSettingsChange("lastName")}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Email"
                    value={settingsForm.email}
                    onChange={handleSettingsChange("email")}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Phone"
                    value={settingsForm.phoneNum}
                    onChange={handleSettingsChange("phoneNum")}
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Street Address"
                    value={settingsForm.streetAddress}
                    onChange={handleSettingsChange("streetAddress")}
                    size="small"
                    fullWidth
                    sx={{ gridColumn: { xs: "span 1", md: "span 2" } }}
                  />
                  <TextField
                    label="Province"
                    value={settingsForm.province}
                    onChange={handleSettingsChange("province")}
                    size="small"
                    fullWidth
                    sx={{ gridColumn: { xs: "span 1", md: "span 2" } }}
                  />
                </Box>
                <Box className="flex justify-end mt-3">
                  <Button
                    variant="contained"
                    onClick={handleSaveCustomerSettings}
                    disabled={isSavingCustomer}
                    sx={{ textTransform: "none", bgcolor: PRIMARY, "&:hover": { bgcolor: "#00016F" } }}
                  >
                    {isSavingCustomer ? "Saving..." : "Save Changes"}
                  </Button>
                </Box>
              </Paper>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 1.5 }}>
              <Paper sx={{ ...CARD_SX, p: 2.5 }}>
                <Typography sx={{ fontSize: 14, fontWeight: 600, color: "#1E293B", mb: 1.2 }}>Notification Preferences</Typography>
                <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2 }}>
                  {[
                    { key: "emailNotif", title: "Email Notifications", sub: "Order updates by email" },
                    { key: "smsNotif", title: "SMS Notifications", sub: "Delivery alerts by SMS" },
                    { key: "marketing", title: "Marketing Emails", sub: "Promotions and campaigns" },
                  ].map((item) => (
                    <Box key={item.key} className="flex items-center justify-between">
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{item.title}</Typography>
                        <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>{item.sub}</Typography>
                      </Box>
                      <Switch
                        checked={Boolean(controls[item.key])}
                        onChange={(e) => setControls((prev) => ({ ...prev, [item.key]: e.target.checked }))}
                        sx={{
                          "& .MuiSwitch-switchBase.Mui-checked": { color: PRIMARY },
                          "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: PRIMARY },
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              </Paper>
            </Box>
          </Box>
        )}
      </Box>

            <DeleteOrderModal
              open={deleteModal.open}
              orderId={deleteModal.orderId}
              onClose={() => setDeleteModal({ open: false, orderId: null })}
              onSuccess={() => refetch()}
            />
    </Box>
  );
}
