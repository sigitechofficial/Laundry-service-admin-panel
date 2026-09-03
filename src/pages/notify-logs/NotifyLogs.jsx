import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Field,
  Modal,
  Select,
  Table,
} from "../../design-system";
import { useGetNotifyLogsQuery } from "../../store/services/api";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";

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

function channelTone(channel) {
  const k = String(channel || "").toLowerCase();
  if (k === "sms") return { label: "SMS", tone: "info" };
  if (k === "push") return { label: "Push", tone: "info" };
  if (k === "call") return { label: "Call", tone: "warning" };
  return { label: channel || "N/A", tone: "neutral" };
}

function sessionStatusTone(status) {
  const k = String(status || "").toLowerCase();
  if (k === "active") return { label: "Active", tone: "success" };
  if (k === "closed") return { label: "Closed", tone: "neutral" };
  if (k === "expired") return { label: "Expired", tone: "warning" };
  return { label: status || "Unknown", tone: "neutral" };
}

function twilioTone(status) {
  const k = String(status || "").toLowerCase();
  if (["delivered", "sent", "queued", "accepted", "sending"].includes(k))
    return { label: status, tone: "success" };
  if (["undelivered", "failed", "canceled", "cancelled"].includes(k))
    return { label: status, tone: "danger" };
  return { label: status || "N/A", tone: "neutral" };
}

function legTone(leg) {
  const k = String(leg || "").toLowerCase();
  if (k === "pickup") return { label: "Pickup", tone: "info" };
  if (k === "delivery") return { label: "Delivery", tone: "info" };
  return { label: leg || "N/A", tone: "neutral" };
}

function outcomeTone(outcome) {
  const k = String(outcome || "").toLowerCase();
  if (["completed", "answered"].includes(k)) return { label: outcome, tone: "success" };
  if (["no answer", "busy", "failed", "canceled"].includes(k))
    return { label: outcome, tone: "danger" };
  if (["replaced", "expired (no call)", "booking missing"].includes(k))
    return { label: outcome, tone: "warning" };
  return { label: outcome || "N/A", tone: "neutral" };
}

function formatDuration(seconds) {
  if (seconds == null || seconds === "" || Number.isNaN(Number(seconds))) return "N/A";
  const total = Math.max(0, Math.trunc(Number(seconds)));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function humanCloseReason(reason) {
  if (!reason) return "N/A";
  const map = {
    call_completed: "Call completed",
    call_no_answer: "No answer",
    call_busy: "Busy",
    call_failed: "Failed",
    call_canceled: "Canceled",
    call_cancelled: "Canceled",
    replaced: "Replaced by newer call",
    ttl_expired: "Expired (no call placed)",
    booking_missing: "Booking missing",
  };
  return map[String(reason).toLowerCase()] || String(reason);
}

function StatusBadge({ label, tone }) {
  return <DirectoryDotPill tone={tone}>{label}</DirectoryDotPill>;
}

function ModalSectionHeader({ title }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 12px",
        background: "var(--canvas)",
        borderRadius: "var(--r-sm)",
        marginBottom: 10,
        borderLeft: "3px solid var(--accent)",
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: 12,
          color: "var(--accent)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {title}
      </span>
    </div>
  );
}

function InfoRow({ label, value, badge }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "120px 1fr",
        gap: 8,
        padding: "8px 0",
        borderBottom: "1px dashed var(--line)",
      }}
    >
      <span
        style={{
          fontSize: 12,
          fontWeight: 600,
          color: "var(--muted)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          paddingTop: 2,
        }}
      >
        {label}
      </span>
      {badge ? (
        badge
      ) : (
        <span style={{ fontSize: 14, fontWeight: 500, wordBreak: "break-all" }}>
          {display(value)}
        </span>
      )}
    </div>
  );
}

function SectionCard({ children }) {
  return (
    <div
      style={{
        background: "var(--canvas)",
        border: "1px solid var(--line)",
        borderRadius: "var(--r-md)",
        padding: "8px 14px",
        marginBottom: 14,
      }}
    >
      {children}
    </div>
  );
}

const PAGE_SIZES = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));
const LEG_OPTIONS = [
  { value: "", label: "All" },
  { value: "pickup", label: "Pickup" },
  { value: "delivery", label: "Delivery" },
];
// Calls live in the "Dialer Call Sessions" tab, so the notifications channel
// filter only covers messaging channels (push / SMS).
const CHANNEL_OPTIONS = [
  { value: "", label: "All" },
  { value: "push", label: "Push" },
  { value: "sms", label: "SMS" },
];
const SESSION_STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "closed", label: "Closed" },
  { value: "expired", label: "Expired" },
];

export default function NotifyLogs() {
  const [tab, setTab] = useState("notifications");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [bookingIdInput, setBookingIdInput] = useState("");
  const [agentUserIdInput, setAgentUserIdInput] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [agentUserId, setAgentUserId] = useState("");
  const [channel, setChannel] = useState("");
  const [leg, setLeg] = useState("");
  const [sessionStatus, setSessionStatus] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [detailModal, setDetailModal] = useState({ open: false, kind: null, row: null });

  useEffect(() => {
    const handle = setTimeout(() => {
      setBookingId(bookingIdInput.trim());
      setAgentUserId(agentUserIdInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handle);
  }, [bookingIdInput, agentUserIdInput]);

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

  const { data, isLoading, isFetching, isError, refetch } = useGetNotifyLogsQuery(queryArgs);

  const notifications = data?.data?.notifications;
  const callSessions  = data?.data?.callSessions;

  const openDetail  = (kind, row) => setDetailModal({ open: true, kind, row });
  const closeDetail = () => setDetailModal({ open: false, kind: null, row: null });
  const resetPage   = () => setPage(1);

  const updateDate = (part, value) => {
    setDateRange((prev) => {
      const next = {
        startDate: part === "startDate" ? value || null : prev?.startDate || null,
        endDate: part === "endDate" ? value || null : prev?.endDate || null,
      };
      if (!next.startDate && !next.endDate) return null;
      return next;
    });
    resetPage();
  };

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
        outcome: row.outcome || "—",
        duration: formatDuration(row.callDurationSec),
        agent: userLabel(row.agent),
        customer: userLabel(row.customer),
        customerPhone: fullPhone(row.customerCountryCode, row.customerPhone),
        raw: row,
      })),
    [callSessions, page, limit]
  );

  const notifCols = [
    {
      key: "sentAt",
      header: "Sent",
      render: (row) => {
        const parts = [];
        if (row.channel && row.channel !== "—") parts.push(row.channel);
        if (row.leg && row.leg !== "—") parts.push(legTone(row.leg).label);
        return <DirectoryIdentity name={row.sentAt} meta={parts.join(" · ") || undefined} />;
      },
    },
    {
      key: "bookingId",
      header: "Booking",
      render: (row) => (
        <DirectoryIdentity
          name={row.bookingId !== "—" ? `#${row.bookingId}` : "—"}
          meta={row.orderTrackId !== "—" ? row.orderTrackId : undefined}
        />
      ),
    },
    {
      key: "leg",
      header: "Leg",
      render: (row) => <StatusBadge {...legTone(row.leg !== "—" ? row.leg : null)} />,
    },
    {
      key: "twilioStatus",
      header: "Status",
      render: (row) => <StatusBadge {...twilioTone(row.twilioStatus)} />,
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => <DirectoryIdentity name={row.customer} meta={row.agent !== "N/A" ? row.agent : undefined} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => openDetail("notification", row.raw)} />
        </DirectoryActions>
      ),
    },
  ];

  const sessionCols = [
    {
      key: "createdAt",
      header: "Created",
      render: (row) => (
        <DirectoryIdentity name={row.createdAt} meta={row.leg !== "—" ? row.leg : undefined} />
      ),
    },
    {
      key: "bookingId",
      header: "Booking",
      render: (row) => (
        <DirectoryIdentity
          name={row.bookingId !== "—" ? `#${row.bookingId}` : "—"}
          meta={row.orderTrackId !== "—" ? row.orderTrackId : undefined}
        />
      ),
    },
    {
      key: "leg",
      header: "Leg",
      render: (row) => <StatusBadge {...legTone(row.leg !== "—" ? row.leg : null)} />,
    },
    {
      key: "outcome",
      header: "Outcome",
      render: (row) =>
        row.outcome !== "—" ? (
          <StatusBadge {...outcomeTone(row.outcome)} />
        ) : (
          <span style={{ color: "var(--muted)" }}>—</span>
        ),
    },
    {
      key: "duration",
      header: "Duration",
      render: (row) => (
        <span style={{ fontVariantNumeric: "tabular-nums" }}>
          {row.duration !== "N/A" ? row.duration : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge {...sessionStatusTone(row.status)} />,
    },
    {
      key: "customer",
      header: "Customer",
      render: (row) => <DirectoryIdentity name={row.customer} meta={row.agent !== "N/A" ? row.agent : undefined} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => openDetail("session", row.raw)} />
        </DirectoryActions>
      ),
    },
  ];

  const totalRows = tab === "sessions"
    ? Number(callSessions?.total || 0)
    : Number(notifications?.total || 0);

  const totalPages = Math.max(1, Math.ceil(totalRows / limit) || 1);
  const startIndex = totalRows === 0 ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, totalRows);

  const detail   = detailModal.row;
  const agent    = detail?.agent;
  const customer = detail?.customer;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          borderBottom: "1px solid var(--line)",
          paddingBottom: 8,
        }}
      >
        <Button
          variant={tab === "notifications" ? "primary" : "ghost"}
          onClick={() => { setTab("notifications"); resetPage(); }}
        >
          Push / SMS Notifications
        </Button>
        <Button
          variant={tab === "sessions" ? "primary" : "ghost"}
          onClick={() => { setTab("sessions"); resetPage(); }}
        >
          Dialer Call Sessions
        </Button>
      </div>

      <DirectoryMetrics
        items={[
          {
            label: tab === "sessions" ? "Call sessions" : "Notifications",
            value: totalRows,
            tone: "brand",
          },
        ]}
      />

      {isError ? (
        <div>
          <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>
            Could not load notify logs. Check your connection and try again.
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <div style={{ color: "var(--muted)", padding: 28, textAlign: "center" }}>
          Loading…
        </div>
      ) : (
        <DirectoryTableWrap
          toolbar={
            <DirectoryToolbar>
              <DirectorySearch
                id="notify-booking-id"
                value={bookingIdInput}
                onChange={setBookingIdInput}
                placeholder="Booking ID…"
                aria-label="Booking ID"
              />
              <DirectorySearch
                id="notify-agent-id"
                value={agentUserIdInput}
                onChange={setAgentUserIdInput}
                placeholder="Agent user ID…"
                aria-label="Agent user ID"
              />
              <DirectoryToolSelect>
                <Select
                  aria-label="Leg"
                  value={leg}
                  onChange={(value) => { setLeg(value); resetPage(); }}
                  options={LEG_OPTIONS}
                />
              </DirectoryToolSelect>
              {tab === "notifications" ? (
                <DirectoryToolSelect>
                  <Select
                    aria-label="Channel"
                    value={channel}
                    onChange={(value) => { setChannel(value); resetPage(); }}
                    options={CHANNEL_OPTIONS}
                  />
                </DirectoryToolSelect>
              ) : (
                <DirectoryToolSelect>
                  <Select
                    aria-label="Session Status"
                    value={sessionStatus}
                    onChange={(value) => { setSessionStatus(value); resetPage(); }}
                    options={SESSION_STATUS_OPTIONS}
                  />
                </DirectoryToolSelect>
              )}
              <DirectoryDateInput
                id="notify-start-date"
                value={dateRange?.startDate ? dayjs(dateRange.startDate).format("YYYY-MM-DD") : ""}
                onChange={(value) => updateDate("startDate", value)}
                aria-label="Start date"
                title="Start date"
              />
              <DirectoryDateInput
                id="notify-end-date"
                value={dateRange?.endDate ? dayjs(dateRange.endDate).format("YYYY-MM-DD") : ""}
                onChange={(value) => updateDate("endDate", value)}
                aria-label="End date"
                title="End date"
              />
              {bookingIdInput || agentUserIdInput || channel || leg || sessionStatus || dateRange ? (
                <DirectoryToolbarEnd>
                  <DirectoryClearButton
                    onClick={() => {
                      setBookingIdInput("");
                      setAgentUserIdInput("");
                      setChannel("");
                      setLeg("");
                      setSessionStatus("");
                      setDateRange(null);
                      resetPage();
                    }}
                  />
                </DirectoryToolbarEnd>
              ) : null}
            </DirectoryToolbar>
          }
          footer={
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 12,
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span className="jd-field__hint">
                {startIndex} - {endIndex} of {totalRows}
                {isFetching && !isLoading ? " · Refreshing…" : ""}
              </span>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="jd-field__hint">
                  Page {page} of {totalPages}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= totalPages || totalRows === 0}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
              <Field label="Results per page">
                <div style={{ minWidth: 100 }}>
                  <Select
                    aria-label="Results per page"
                    value={limit}
                    onChange={(value) => { setLimit(Number(value)); resetPage(); }}
                    options={PAGE_SIZES}
                  />
                </div>
              </Field>
            </div>
          }
        >
          <Table
            columns={tab === "sessions" ? sessionCols : notifCols}
            rows={tab === "sessions" ? sessionRows : notificationRows}
            rowKey={(row) => row.id}
            empty={tab === "sessions" ? "No call sessions" : "No notification logs"}
            stickyLeft={2}
          />
        </DirectoryTableWrap>
      )}

      <Modal
        open={detailModal.open}
        onClose={closeDetail}
        title={detailModal.kind === "session" ? "Call Session Detail" : "Notify Log Detail"}
        secondaryLabel="Close"
        primaryLabel="Done"
        onPrimary={closeDetail}
      >
        {detail ? (
          <div style={{ maxHeight: "58vh", overflow: "auto" }}>
            <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid var(--line)" }}>
              <strong style={{ fontSize: 16 }}>
                {detail.orderTrackId ? `Order: ${detail.orderTrackId}` : `Booking #${display(detail.bookingId)}`}
              </strong>
              <p className="jd-field__hint" style={{ margin: "6px 0 10px" }}>
                Log ID: {display(detail.id)}  ·  Booking ID: {display(detail.bookingId)}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <StatusBadge {...legTone(detail.leg)} />
                {detailModal.kind === "notification" ? (
                  <>
                    <StatusBadge {...channelTone(detail.channel)} />
                    <StatusBadge {...twilioTone(detail.twilioStatus)} />
                  </>
                ) : (
                  <StatusBadge {...sessionStatusTone(detail.status)} />
                )}
              </div>
            </div>

            <ModalSectionHeader title="Agent" />
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

            <ModalSectionHeader title="Customer" />
            <SectionCard>
              <InfoRow label="Name"         value={userLabel(customer)} />
              <InfoRow label="User ID"      value={detail.customerId || customer?.id} />
              <InfoRow label="Email"        value={customer?.email} />
              <InfoRow label="Phone (full)" value={fullPhone(detail.customerCountryCode || customer?.countryCode, detail.customerPhone || customer?.phoneNum)} />
            </SectionCard>

            {detailModal.kind === "notification" ? (
              <>
                <ModalSectionHeader title="Notification Details" />
                <SectionCard>
                  <InfoRow label="Channel"    badge={<StatusBadge {...channelTone(detail.channel)} />} />
                  <InfoRow label="Attempt #"  value={detail.attemptId} />
                  <InfoRow label="To (masked)"  value={detail.toMasked} />
                  <InfoRow label="From number"  value={detail.fromNumber} />
                  <InfoRow label="Twilio SID"   value={detail.twilioSid} />
                  <InfoRow label="Twilio status" badge={<StatusBadge {...twilioTone(detail.twilioStatus)} />} />
                  <InfoRow label="Sent at"      value={fmt(detail.sentAt)} />
                  <InfoRow label="Delivered at" value={fmt(detail.deliveredAt)} />
                  <InfoRow label="Created at"   value={fmt(detail.createdAt)} />
                </SectionCard>
                {detail.bodyPreview && detail.bodyPreview !== "N/A" && (
                  <>
                    <ModalSectionHeader title="Message" />
                    <div
                      style={{
                        background: "var(--canvas)",
                        border: "1px solid var(--line)",
                        borderRadius: "var(--r-md)",
                        padding: "12px 16px",
                        marginBottom: 14,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        lineHeight: 1.6,
                      }}
                    >
                      {detail.bodyPreview}
                    </div>
                  </>
                )}
              </>
            ) : (
              <>
                <ModalSectionHeader title="Call Session" />
                <SectionCard>
                  <InfoRow label="Status"           badge={<StatusBadge {...sessionStatusTone(detail.status)} />} />
                  {detail.outcome ? (
                    <InfoRow label="Outcome"        badge={<StatusBadge {...outcomeTone(detail.outcome)} />} />
                  ) : (
                    <InfoRow label="Outcome"        value="N/A" />
                  )}
                  <InfoRow label="Duration"         value={formatDuration(detail.callDurationSec)} />
                  <InfoRow label="Agent phone"      value={detail.agentPhoneE164} />
                  <InfoRow label="Created at"       value={fmt(detail.createdAt)} />
                  <InfoRow label="Connected at"     value={fmt(detail.connectedAt)} />
                  <InfoRow label="Ended at"         value={fmt(detail.endedAt)} />
                  <InfoRow label="Expires at"       value={fmt(detail.expiresAt)} />
                  <InfoRow label="Closed at"        value={fmt(detail.closedAt)} />
                  <InfoRow label="Close reason"     value={humanCloseReason(detail.closeReason)} />
                  <InfoRow label="Call SID"         value={detail.callSid} />
                  <InfoRow label="Updated at"       value={fmt(detail.updatedAt)} />
                </SectionCard>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: "grid", placeItems: "center", minHeight: 160, color: "var(--muted)" }}>
            No log data available
          </div>
        )}
      </Modal>
    </div>
  );
}
