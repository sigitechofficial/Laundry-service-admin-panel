import { Badge, Button, Modal } from "../../design-system";
import { DATE_TIME_FORMAT, formatDate } from "../../utilities/formatters";
import { Delay } from "../../components/shared/Loaders";
import { useGetAgentRegistrationQuery } from "../../store/services/api";

const NONE = "Not given";

const box = {
  border: "1px solid var(--line, #E5E7EB)",
  borderRadius: 12,
  padding: 14,
  background: "var(--surface, #fff)",
};
const heading = {
  margin: "0 0 10px",
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted, #64748B)",
};
const rowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 38%) minmax(0, 1fr)",
  gap: 12,
  padding: "7px 0",
  borderTop: "1px solid var(--line-soft, #F1F5F9)",
  fontSize: 14,
};

function Section({ title, children, right }) {
  return (
    <section style={box}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <h3 style={heading}>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, mono }) {
  const empty = value == null || value === "";
  return (
    <div style={rowStyle}>
      <span style={{ color: "var(--muted, #64748B)" }}>{label}</span>
      <span
        style={{
          color: empty ? "var(--muted-2, #94A3B8)" : "var(--ink, #0F172A)",
          fontWeight: empty ? 400 : 500,
          wordBreak: "break-word",
          fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
        }}
      >
        {empty ? NONE : value}
      </span>
    </div>
  );
}

function hhmm(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return String(t);
  const ap = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 === 0 ? 12 : hour % 12}:${(m || "00").padStart(2, "0")} ${ap}`;
}

function statusBadge(status) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  return <Badge tone="warning">Waiting for review</Badge>;
}

/**
 * Everything a shop gave when it registered, for approving or rejecting it.
 */
export default function AgentRegistrationModal({ agentId, open, onClose, onApprove, onReject, busy }) {
  const { data, isFetching, isError, refetch } = useGetAgentRegistrationQuery(agentId, {
    skip: !open || !agentId,
  });
  const r = data?.data;
  const a = r?.account;
  const status = a?.approvalStatus;
  const mapLink =
    r?.address?.lat && r?.address?.lng
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${r.address.lat},${r.address.lng}`)}`
      : null;

  return (
    <Modal
      open={open}
      title={r?.shop?.name || a?.name || "Shop registration"}
      description={a?.name ? `Registered by ${a.name}` : undefined}
      onClose={onClose}
      hideFooter
      size="lg"
    >
      {isFetching && !r ? (
        <Delay />
      ) : isError ? (
        <div style={{ textAlign: "center", padding: 24 }}>
          <p style={{ margin: "0 0 12px" }}>Could not load this registration.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : r ? (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
            {statusBadge(status)}
            {r.hoursSet ? null : <Badge tone="warning">Working hours not set</Badge>}
            {r.services.some((s) => s.offered) ? null : <Badge tone="warning">No services chosen</Badge>}
            {r.shop?.payoutConnected ? <Badge tone="success">Payouts connected</Badge> : <Badge>Payouts not connected</Badge>}
          </div>

          {status === "rejected" && a?.rejectionReason ? (
            <div style={{ ...box, background: "#FEF2F2", borderColor: "#FECACA" }}>
              <p style={{ ...heading, color: "#B91C1C" }}>Rejected because</p>
              <p style={{ margin: 0, fontSize: 14, color: "#7F1D1D" }}>{a.rejectionReason}</p>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <Section title="Account">
              <Row label="Agent ID" value={a?.id} mono />
              <Row label="Name" value={a?.name} />
              <Row label="Email" value={a?.email} />
              <Row label="Phone" value={a?.phone} />
              <Row label="Registered" value={a?.registeredAt ? formatDate(a.registeredAt, DATE_TIME_FORMAT) : null} />
              <Row label="Phone verified" value={a?.verifiedAt ? formatDate(a.verifiedAt, DATE_TIME_FORMAT) : null} />
            </Section>

            <Section title="Shop">
              <Row label="Business name" value={r.shop?.name} />
              <Row
                label="Profile type"
                value={[r.shop?.profileType, r.shop?.profileOther].filter(Boolean).join(" · ")}
              />
              <Row label="Website" value={r.shop?.website} />
              <Row label="Description" value={r.shop?.description} />
              <Row label="Collection" value={r.shop?.collectionMethod} />
              <Row label="Delivery" value={r.shop?.deliveryMethod} />
              <Row label="Lead time" value={r.shop?.leadTimeHours != null ? `${r.shop.leadTimeHours} hours` : null} />
              <Row label="Max active orders" value={r.shop?.maxActiveOrders} />
            </Section>
          </div>

          <Section
            title="Shop address"
            right={
              mapLink ? (
                <a href={mapLink} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600 }}>
                  Open in Google Maps
                </a>
              ) : null
            }
          >
            <Row label="Street" value={r.address?.street} />
            <Row label="Area" value={[r.address?.district, r.address?.province].filter(Boolean).join(", ")} />
            <Row label="Postcode" value={r.address?.postcode} />
            <Row label="City / country" value={[r.address?.city, r.address?.country].filter(Boolean).join(", ")} />
            <Row label="Zone" value={r.address?.zone} />
          </Section>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
            <Section title={`Services (${r.services.filter((s) => s.offered).length})`}>
              {r.services.length ? (
                r.services.map((s) => (
                  <div key={s.name} style={{ ...rowStyle, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                    <span style={{ color: s.offered ? "var(--ink, #0F172A)" : "var(--muted-2, #94A3B8)", fontWeight: 500 }}>
                      {s.name}
                      {s.offered ? "" : " (off)"}
                    </span>
                    <span style={{ color: "var(--muted, #64748B)", whiteSpace: "nowrap" }}>
                      {s.turnaround ? `TAT ${s.turnaround}` : "TAT not given"}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "var(--muted-2, #94A3B8)" }}>{NONE}</p>
              )}
            </Section>

            <Section title="Working days & hours">
              {r.workingHours.length ? (
                r.workingHours.map((h) => (
                  <div key={h.day} style={{ ...rowStyle, gridTemplateColumns: "110px minmax(0, 1fr)" }}>
                    <span style={{ color: "var(--muted, #64748B)" }}>{h.day}</span>
                    <span style={{ fontWeight: 500, color: h.open ? "var(--ink, #0F172A)" : "var(--muted-2, #94A3B8)" }}>
                      {!h.open
                        ? "Closed"
                        : h.openTime && h.closeTime
                          ? `${hhmm(h.openTime)} – ${hhmm(h.closeTime)}`
                          : "Open · times not set"}
                    </span>
                  </div>
                ))
              ) : (
                <p style={{ margin: 0, color: "var(--muted-2, #94A3B8)" }}>{NONE}</p>
              )}
            </Section>
          </div>

          <Section title="Machinery">
            {r.machines.length ? (
              r.machines.map((m) => <Row key={m.name} label={m.name} value={m.count} />)
            ) : (
              <p style={{ margin: 0, color: "var(--muted-2, #94A3B8)" }}>{NONE}</p>
            )}
          </Section>

          {onApprove || onReject ? (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              {onReject && status !== "rejected" ? (
                <Button variant="danger" disabled={busy} onClick={onReject}>
                  Reject
                </Button>
              ) : null}
              {onApprove ? (
                <Button disabled={busy} onClick={onApprove}>
                  {status === "rejected" ? "Restore & approve" : "Approve"}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
