import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
  Divider,
} from "@mui/material";
import dayjs from "dayjs";
import DataTable from "../../components/ui/DataTable";
import ModalComponent from "../../components/shared/Modal";
import { Delay } from "../../components/shared/Loaders";
import { useGetNotifyLogsQuery } from "../../store/services/api";

// ─── helpers ──────────────────────────────────────────────────────────────────

function userLabel(user) {
  if (!user) return "N/A";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || `#${user.id}` || "N/A";
}

function fullPhone(countryCode, phone) {
  if (!phone) return "N/A";
  const cc = countryCode ? String(countryCode).trim() : "";
  const num = String(phone).trim();
  if (!cc) return num;
  if (num.startsWith("+")) return num;
  return `${cc}${num.replace(/^0+/, "")}`;
}

function fmt(value) {
  if (!value) return "N/A";
  return dayjs(value).format("DD MMM YYYY, HH:mm:ss");
}

function display(value) {
  if (value == null || value === "") return "N/A";
  return String(value);
}

// ─── badge helpers ────────────────────────────────────────────────────────────

function channelChip(channel) {
  const k = String(channel || "").toLowerCase();
  if (k === "sms")  return { label: "SMS",  bg: "#E6F0FF", color: "#000099" };
  if (k === "push") return { label: "Push", bg: "#EDE9FE", color: "#5B21B6" };
  if (k === "call") return { label: "Call", bg: "#FFEDD5", color: "#9A3412" };
  return { label: channel || "N/A", bg: "#F1F5F9", color: "#64748B" };
}

function sessionStatusChip(status) {
  const k = String(status || "").toLowerCase();
  if (k === "active")  return { label: "Active",  bg: "#DFF5FA", color: "#01C7B8" };
  if (k === "closed")  return { label: "Closed",  bg: "#F1F5F9", color: "#64748B" };
  if (k === "expired") return { label: "Expired", bg: "#FEF3C7", color: "#92400E" };
  return { label: status || "Unknown", bg: "#F1F5F9", color: "#64748B" };
}

function twilioChip(status) {
  const k = String(status || "").toLowerCase();
  if (["delivered", "sent", "queued", "accepted", "sending"].includes(k))
    return { label: status, bg: "#39BE7B33", color: "#379465" };
  if (["undelivered", "failed", "canceled", "cancelled"].includes(k))
    return { label: status, bg: "#FFE2E2", color: "#F53939" };
  return { label: status || "N/A", bg: "#F1F5F9", color: "#64748B" };
}

function legChip(leg) {
  const k = String(leg || "").toLowerCase();
  if (k === "pickup")   return { label: "Pickup",   bg: "#E8E5FF", color: "#5B21B6" };
  if (k === "delivery") return { label: "Delivery", bg: "#E6F0FF", color: "#000099" };
  return { label: leg || "N/A", bg: "#F1F5F9", color: "#64748B" };
}

function PillBadge({ label, bg, color }) {
  return (
    <Chip
      label={label}
      size="small"
      sx={{
        bgcolor: bg,
        color: color,
        fontFamily: "Switzer",
        fontWeight: 600,
        fontSize: 12,
        height: 24,
        borderRadius: "6px",
        textTransform: "capitalize",
        "& .MuiChip-label": { px: "10px" },
      }}
    />
  );
}

// ─── modal sub-components ─────────────────────────────────────────────────────

function ModalSectionHeader({ title, icon }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1.25,
        bgcolor: "#F1F5F9",
        borderRadius: "8px",
        mb: 2,
        borderLeft: "3px solid #000099",
      }}
    >
      {icon && (
        <Typography sx={{ fontSize: 15, lineHeight: 1 }}>{icon}</Typography>
      )}
      <Typography
        sx={{
          fontFamily: "Switzer",
          fontWeight: 700,
          fontSize: 13,
          color: "#000099",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}

function InfoRow({ label, value, badge }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        gap: 1,
        py: 0.75,
        borderBottom: "1px dashed #E2E8F0",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Typography
        sx={{
          fontFamily: "Switzer",
          fontSize: 12,
          fontWeight: 600,
          color: "#8F95B2",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          pt: "2px",
        }}
      >
        {label}
      </Typography>
      {badge ? (
        badge
      ) : (
        <Typography
          sx={{
            fontFamily: "Switzer",
            fontSize: 14,
            fontWeight: 500,
            color: "#1E293B",
            wordBreak: "break-all",
          }}
        >
          {display(value)}
        </Typography>
      )}
    </Box>
  );
}

function SectionCard({ children }) {
  return (
    <Box
      sx={{
        bgcolor: "#FAFAFA",
        border: "1px solid #E2E8F0",
        borderRadius: "10px",
        px: 2,
        py: 1.5,
        mb: 2,
      }}
    >
      {children}
    </Box>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function NotifyLogs() {
  const [tab, setTab] = useState("notifications");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [bookingId, setBookingId] = useState("");
  const [agentUserId, setAgentUserId] = useState("");
  const [channel, setChannel] = useState("");
  const [leg, setLeg] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, kind: null, row: null });

  const queryArgs = useMemo(() => {
    const params = { type: tab === "sessions" ? "sessions" : "notifications", page, limit };
    if (bookingId.trim()) params.bookingId = bookingId.trim();
    if (agentUserId.trim()) params.agentUserId = agentUserId.trim();
    if (leg) params.leg = leg;
    if (tab === "notifications" && channel) params.channel = channel;
    if (tab === "sessions" && sessionStatus) params.sessionStatus = sessionStatus;
    if (dateRange?.startDate) params.startDate = dayjs(dateRange.startDate).format("YYYY-MM-DD");
    if (dateRange?.endDate) params.endDate = dayjs(dateRange.endDate).format("YYYY-MM-DD");
    return params;
  }, [tab, page, limit, bookingId, agentUserId, channel, leg, sessionStatus, dateRange]);

  const { data, isLoading, isFetching } = useGetNotifyLogsQuery(queryArgs);

  const notifications = data?.data?.notifications;
  const callSessions  = data?.data?.callSessions;

  const openDetail  = (kind, row) => setDetailModal({ open: true, kind, row });
  const closeDetail = () => setDetailModal({ open: false, kind: null, row: null });
  const resetPage   = () => setPage(1);

  const notificationRows = useMemo(
    () =>
      (notifications?.rows || []).map((row, i) => ({
        id: `n-${row.id}`,
        sl: (page - 1) * limit + i + 1,
        sentAt: fmt(row.sentAt),
        bookingId: row.bookingId ?? "—",
        orderTrackId: row.orderTrackId || "—",
        leg: row.leg || "—",
        channel: row.channel || "—",
        agent: userLabel(row.agent),
        customer: userLabel(row.customer),
        customerPhone: fullPhone(row.customerCountryCode, row.customerPhone),
        twilioStatus: row.twilioStatus || "—",
        raw: row,
      })),
    [notifications, page, limit]
  );

  const sessionRows = useMemo(
    () =>
      (callSessions?.rows || []).map((row, i) => ({
        id: `s-${row.id}`,
        sl: (page - 1) * limit + i + 1,
        createdAt: fmt(row.createdAt),
        bookingId: row.bookingId ?? "—",
        orderTrackId: row.orderTrackId || "—",
        leg: row.leg || "—",
        status: row.status || "—",
        agent: userLabel(row.agent),
        customer: userLabel(row.customer),
        customerPhone: fullPhone(row.customerCountryCode, row.customerPhone),
        raw: row,
      })),
    [callSessions, page, limit]
  );

  const actionCol = (kind) => ({
    field: "actions",
    headerName: "",
    flex: 0.12,
    minWidth: 90,
    sortable: false,
    renderCell: (row) => (
      <Button
        size="small"
        variant="outlined"
        onClick={() => openDetail(kind, row.raw)}
        sx={{
          textTransform: "none",
          fontFamily: "Switzer",
          fontWeight: 600,
          fontSize: 12,
          borderRadius: "6px",
          borderColor: "#000099",
          color: "#000099",
          minWidth: 62,
          height: 30,
          "&:hover": { borderColor: "#000066", bgcolor: "#E6F0FF" },
        }}
      >
        View
      </Button>
    ),
  });

  const notifCols = [
    { field: "sl",           headerName: "SL",             flex: 0.07, minWidth: 50  },
    { field: "sentAt",       headerName: "Sent At",        flex: 0.2,  minWidth: 155 },
    { field: "bookingId",    headerName: "Booking",        flex: 0.1,  minWidth: 80  },
    { field: "orderTrackId", headerName: "Track ID",       flex: 0.16, minWidth: 120 },
    { field: "leg",          headerName: "Leg",            flex: 0.1,  minWidth: 80  },
    { field: "channel",      headerName: "Channel",        flex: 0.1,  minWidth: 80  },
    { field: "agent",        headerName: "Agent",          flex: 0.16, minWidth: 120 },
    { field: "customer",     headerName: "Customer",       flex: 0.16, minWidth: 120 },
    { field: "customerPhone",headerName: "Customer Phone", flex: 0.16, minWidth: 130 },
    { field: "twilioStatus", headerName: "Status",         flex: 0.12, minWidth: 100 },
    actionCol("notification"),
  ];

  const sessionCols = [
    { field: "sl",           headerName: "SL",             flex: 0.07, minWidth: 50  },
    { field: "createdAt",    headerName: "Created",        flex: 0.2,  minWidth: 155 },
    { field: "bookingId",    headerName: "Booking",        flex: 0.1,  minWidth: 80  },
    { field: "orderTrackId", headerName: "Track ID",       flex: 0.16, minWidth: 120 },
    { field: "leg",          headerName: "Leg",            flex: 0.1,  minWidth: 80  },
    { field: "status",       headerName: "Status",         flex: 0.1,  minWidth: 90  },
    { field: "agent",        headerName: "Agent",          flex: 0.16, minWidth: 120 },
    { field: "customer",     headerName: "Customer",       flex: 0.16, minWidth: 120 },
    { field: "customerPhone",headerName: "Customer Phone", flex: 0.16, minWidth: 130 },
    actionCol("session"),
  ];

  const totalRows = tab === "sessions"
    ? Number(callSessions?.total || 0)
    : Number(notifications?.total || 0);

  const detail   = detailModal.row;
  const agent    = detail?.agent;
  const customer = detail?.customer;

  return (
    <Box className="!space-y-4">
      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => { setTab(v); resetPage(); }}
        sx={{
          borderBottom: "1px solid #E2E8F0",
          "& .MuiTab-root": { fontFamily: "Switzer", fontWeight: 600, textTransform: "none", color: "#8F95B2" },
          "& .Mui-selected": { color: "#000099 !important" },
          "& .MuiTabs-indicator": { bgcolor: "#000099" },
        }}
      >
        <Tab label="Push / SMS Notifications" value="notifications" />
        <Tab label="Dialer Call Sessions"      value="sessions" />
      </Tabs>

      {/* ── Filters ── */}
      <Box className="flex flex-wrap gap-3 items-center">
        <TextField
          size="small"
          label="Booking ID"
          value={bookingId}
          onChange={(e) => { setBookingId(e.target.value); resetPage(); }}
          sx={{ width: 140 }}
        />
        <TextField
          size="small"
          label="Agent User ID"
          value={agentUserId}
          onChange={(e) => { setAgentUserId(e.target.value); resetPage(); }}
          sx={{ width: 140 }}
        />
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Leg</InputLabel>
          <Select label="Leg" value={leg} onChange={(e) => { setLeg(e.target.value); resetPage(); }}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="pickup">Pickup</MenuItem>
            <MenuItem value="delivery">Delivery</MenuItem>
          </Select>
        </FormControl>
        {tab === "notifications" ? (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Channel</InputLabel>
            <Select label="Channel" value={channel} onChange={(e) => { setChannel(e.target.value); resetPage(); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="push">Push</MenuItem>
              <MenuItem value="sms">SMS</MenuItem>
              <MenuItem value="call">Call</MenuItem>
            </Select>
          </FormControl>
        ) : (
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Session Status</InputLabel>
            <Select label="Session Status" value={sessionStatus} onChange={(e) => { setSessionStatus(e.target.value); resetPage(); }}>
              <MenuItem value="">All</MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="closed">Closed</MenuItem>
              <MenuItem value="expired">Expired</MenuItem>
            </Select>
          </FormControl>
        )}
      </Box>

      {/* ── Table ── */}
      {isLoading ? (
        <Delay />
      ) : (
        <DataTable
          data={tab === "sessions" ? sessionRows : notificationRows}
          columns={tab === "sessions" ? sessionCols : notifCols}
          showFilters={false}
          showDownload={false}
          searchPlaceholder="Filter above…"
          showDateRange
          dateRangeValue={dateRange}
          onDateRangeChange={(next) => { setDateRange(next); resetPage(); }}
          serverSidePagination
          totalRows={totalRows}
          currentPage={page}
          pageSize={limit}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setLimit(size); resetPage(); }}
          height={620}
        />
      )}
      {isFetching && !isLoading && (
        <Typography sx={{ fontFamily: "Switzer", fontSize: 12, color: "#8F95B2" }}>
          Refreshing…
        </Typography>
      )}

      {/* ─────────────────────── Detail Modal ─────────────────────── */}
      <ModalComponent
        open={detailModal.open}
        onClose={closeDetail}
        title={detailModal.kind === "session" ? "Call Session Detail" : "Notify Log Detail"}
        width={680}
        secondaryAction={{ label: "Close", onClick: closeDetail }}
      >
        {detail ? (
          <Box>
            {/* ── Hero header ── */}
            <Box
              sx={{
                background: "linear-gradient(135deg, #000099 0%, #1a1aff 100%)",
                borderRadius: "12px",
                px: 3,
                py: 2.5,
                mb: 3,
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* decorative circles */}
              <Box sx={{ position:"absolute", top:-30, right:-30, width:120, height:120, borderRadius:"50%", bgcolor:"rgba(255,255,255,0.06)", pointerEvents:"none" }} />
              <Box sx={{ position:"absolute", bottom:-40, right:80, width:90, height:90, borderRadius:"50%", bgcolor:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />

              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography sx={{ fontFamily:"Switzer", fontWeight:700, fontSize:18, color:"#fff", mb:0.5 }}>
                  {detail.orderTrackId ? `Order: ${detail.orderTrackId}` : `Booking #${display(detail.bookingId)}`}
                </Typography>
                <Typography sx={{ fontFamily:"Switzer", fontSize:12, color:"rgba(255,255,255,0.7)", mb:1.5 }}>
                  Log ID: {display(detail.id)} &nbsp;·&nbsp; Booking ID: {display(detail.bookingId)}
                </Typography>
                <Box sx={{ display:"flex", flexWrap:"wrap", gap:1 }}>
                  <PillBadge {...legChip(detail.leg)} />
                  {detailModal.kind === "notification" ? (
                    <>
                      <PillBadge {...channelChip(detail.channel)} />
                      <PillBadge {...twilioChip(detail.twilioStatus)} />
                    </>
                  ) : (
                    <PillBadge {...sessionStatusChip(detail.status)} />
                  )}
                </Box>
              </Box>
            </Box>

            {/* ── Agent ── */}
            <ModalSectionHeader title="Agent" icon="👤" />
            <SectionCard>
              <InfoRow label="Name"    value={userLabel(agent)} />
              <InfoRow label="User ID" value={detail.agentUserId || agent?.id} />
              <InfoRow label="Email"   value={agent?.email} />
              <InfoRow
                label={detailModal.kind === "session" ? "Dialer phone" : "Phone"}
                value={
                  detailModal.kind === "session"
                    ? detail.agentPhoneE164 || fullPhone(agent?.countryCode, agent?.phoneNum)
                    : fullPhone(agent?.countryCode, agent?.phoneNum)
                }
              />
            </SectionCard>

            {/* ── Customer ── */}
            <ModalSectionHeader title="Customer" icon="👗" />
            <SectionCard>
              <InfoRow label="Name"         value={userLabel(customer)} />
              <InfoRow label="User ID"      value={detail.customerId || customer?.id} />
              <InfoRow label="Email"        value={customer?.email} />
              <InfoRow label="Phone (full)" value={fullPhone(detail.customerCountryCode || customer?.countryCode, detail.customerPhone || customer?.phoneNum)} />
            </SectionCard>

            {/* ── Notification / Session details ── */}
            {detailModal.kind === "notification" ? (
              <>
                <ModalSectionHeader title="Notification Details" icon="📨" />
                <SectionCard>
                  <InfoRow label="Channel"    badge={<PillBadge {...channelChip(detail.channel)} />} />
                  <InfoRow label="Attempt #"  value={detail.attemptId} />
                  <InfoRow label="To (masked)"  value={detail.toMasked} />
                  <InfoRow label="From number"  value={detail.fromNumber} />
                  <InfoRow label="Twilio SID"   value={detail.twilioSid} />
                  <InfoRow label="Twilio status" badge={<PillBadge {...twilioChip(detail.twilioStatus)} />} />
                  <InfoRow label="Sent at"      value={fmt(detail.sentAt)} />
                  <InfoRow label="Created at"   value={fmt(detail.createdAt)} />
                </SectionCard>
                {detail.bodyPreview && detail.bodyPreview !== "N/A" && (
                  <>
                    <ModalSectionHeader title="Message" icon="💬" />
                    <Box
                      sx={{
                        bgcolor: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: "10px",
                        px: 2.5,
                        py: 2,
                        mb: 2,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: "Switzer",
                          fontSize: 14,
                          color: "#1E293B",
                          lineHeight: 1.6,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {detail.bodyPreview}
                      </Typography>
                    </Box>
                  </>
                )}
              </>
            ) : (
              <>
                <ModalSectionHeader title="Call Session" icon="📞" />
                <SectionCard>
                  <InfoRow label="Status"           badge={<PillBadge {...sessionStatusChip(detail.status)} />} />
                  <InfoRow label="Agent phone"      value={detail.agentPhoneE164} />
                  <InfoRow label="Expires at"       value={fmt(detail.expiresAt)} />
                  <InfoRow label="Closed at"        value={fmt(detail.closedAt)} />
                  <InfoRow label="Close reason"     value={detail.closeReason} />
                  <InfoRow label="Created at"       value={fmt(detail.createdAt)} />
                  <InfoRow label="Updated at"       value={fmt(detail.updatedAt)} />
                </SectionCard>
              </>
            )}
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <Typography variant="body1" fontFamily="Switzer" color="grey.600">
              No log data available
            </Typography>
          </Box>
        )}
      </ModalComponent>
    </Box>
  );
}
