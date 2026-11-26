import { Badge } from "../../../design-system";
import { DATE_TIME_FORMAT, formatDate } from "../../../utilities/formatters";
import { Empty, Row, Section } from "./registrationUi";
import { grid2, hhmm } from "./registrationFormat";

/**
 * Everything a shop gave when it registered: account, shop, address, services
 * with turnaround, working hours, machinery and payouts. [r] is the
 * GET /admin/agents/:agentId/registration payload.
 */
export default function RegistrationDetails({ r }) {
  if (!r) return null;
  const a = r.account || {};
  const mapLink =
    r.address?.lat && r.address?.lng
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${r.address.lat},${r.address.lng}`)}`
      : null;
  const offered = (r.services || []).filter((s) => s.offered);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {a.approvalStatus === "approved" ? (
          <Badge tone="success">Approved</Badge>
        ) : a.approvalStatus === "rejected" ? (
          <Badge tone="danger">Rejected</Badge>
        ) : (
          <Badge tone="warning">Waiting for review</Badge>
        )}
        {r.hoursSet ? null : <Badge tone="warning">Working hours not set</Badge>}
        {offered.length ? null : <Badge tone="warning">No services chosen</Badge>}
        {r.shop?.payoutConnected ? <Badge tone="success">Payouts connected</Badge> : <Badge>Payouts not connected</Badge>}
        {r.visits?.count ? (
          <Badge tone="brand">{r.visits.count} shop visit{r.visits.count > 1 ? "s" : ""}</Badge>
        ) : (
          <Badge>Not visited yet</Badge>
        )}
      </div>

      {a.approvalStatus === "rejected" && a.rejectionReason ? (
        <section
          style={{ border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 14, padding: 16 }}
        >
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: "#B91C1C" }}>
            REJECTED BECAUSE
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "#7F1D1D" }}>{a.rejectionReason}</p>
        </section>
      ) : null}

      <div style={grid2}>
        <Section title="Account">
          <Row label="Agent ID" value={a.id} mono />
          <Row label="Owner name" value={a.name} />
          <Row label="Email" value={a.email} />
          <Row label="Phone" value={a.phone} />
          <Row label="Registered" value={a.registeredAt ? formatDate(a.registeredAt, DATE_TIME_FORMAT) : null} />
          <Row label="Phone verified" value={a.verifiedAt ? formatDate(a.verifiedAt, DATE_TIME_FORMAT) : null} />
        </Section>

        <Section title="Shop">
          <Row label="Business name" value={r.shop?.name} />
          <Row label="Profile type" value={[r.shop?.profileType, r.shop?.profileOther].filter(Boolean).join(" · ")} />
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

      <div style={grid2}>
        <Section title={`Services offered (${offered.length})`}>
          {(r.services || []).length ? (
            r.services.map((s) => (
              <Row
                key={s.name}
                columns="minmax(0, 1fr) auto"
                label={`${s.name}${s.offered ? "" : " (switched off)"}`}
                value={s.turnaround ? `TAT ${s.turnaround}` : "TAT not given"}
              />
            ))
          ) : (
            <Empty />
          )}
        </Section>

        <Section title="Working days & hours">
          {(r.workingHours || []).length ? (
            r.workingHours.map((h) => (
              <Row
                key={h.day}
                columns="110px minmax(0, 1fr)"
                label={h.day}
                value={
                  !h.open
                    ? "Closed"
                    : h.openTime && h.closeTime
                      ? `${hhmm(h.openTime)} – ${hhmm(h.closeTime)}`
                      : "Open · times not set"
                }
              />
            ))
          ) : (
            <Empty />
          )}
        </Section>
      </div>

      <Section title="Machinery (as registered)">
        {(r.machines || []).length ? (
          r.machines.map((m) => <Row key={m.name} label={m.name} value={m.count} />)
        ) : (
          <Empty />
        )}
      </Section>
    </div>
  );
}
