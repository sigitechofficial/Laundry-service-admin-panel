import { Badge } from "../../../design-system";
import DsIcon from "../../../design-system/icons";
import { DATE_TIME_FORMAT, formatDate } from "../../../utilities/formatters";
import { RECOMMENDATION, dayHours, hh24, initials, tatTone, weekSummary, whenText } from "./registrationFormat";
import "./registration.css";

const NONE = "Not given";
const DAY_SHORT = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

function Card({ title, sub, right, children, className = "" }) {
  return (
    <section className={`reg-card ${className}`.trim()}>
      {title ? (
        <div className="reg-card__head">
          <div style={{ minWidth: 0 }}>
            <h3 className="reg-card__title">{title}</h3>
            {sub ? <p className="reg-card__sub">{sub}</p> : null}
          </div>
          {right}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function Dl({ rows, className = "" }) {
  return (
    <dl className={`reg-dl ${className}`.trim()}>
      {rows.map(([label, value]) => {
        const empty = value == null || value === "";
        return (
          <div className="reg-dl__row" key={label}>
            <dt>{label}</dt>
            <dd className={empty ? "is-empty" : undefined}>{empty ? NONE : value}</dd>
          </div>
        );
      })}
    </dl>
  );
}

function CheckIcon({ kind }) {
  return (
    <span className={`reg-check__icon reg-check__icon--${kind}`} aria-hidden>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {kind === "ok" ? <path d="M5 12.5 10 17 19 7" /> : kind === "warn" ? <path d="M12 6v7M12 18h.01" /> : <path d="M6 12h12" />}
      </svg>
    </span>
  );
}

function StatusBadge({ status }) {
  if (status === "approved") return <Badge tone="success">Approved</Badge>;
  if (status === "rejected") return <Badge tone="danger">Rejected</Badge>;
  return <Badge tone="warning">Waiting for review</Badge>;
}

/**
 * Everything a shop gave when it registered, laid out for review: a summary
 * header, what is ready / missing, services with turnaround, the week's hours,
 * machinery, shop profile, owner and address. [r] is the
 * GET /admin/agents/:agentId/registration payload.
 */
export default function RegistrationDetails({ r }) {
  if (!r) return null;
  const a = r.account || {};
  const shop = r.shop || {};
  const addr = r.address || {};
  const services = r.services || [];
  const offered = services.filter((s) => s.offered);
  const noTat = offered.filter((s) => !s.turnaround);
  const hours = r.workingHours || [];
  const week = weekSummary(hours);
  const machines = r.machines || [];
  const visits = r.visits || {};
  const shopName = shop.name || a.name || "Shop";

  const mapLink =
    addr.lat && addr.lng
      ? `https://www.google.com/maps?q=${encodeURIComponent(`${addr.lat},${addr.lng}`)}`
      : addr.street || addr.postcode
        ? `https://www.google.com/maps?q=${encodeURIComponent([addr.street, addr.postcode, addr.city].filter(Boolean).join(", "))}`
        : null;
  const addressLines = [
    addr.street,
    [addr.district, addr.province].filter(Boolean).join(", "),
    [addr.city, addr.postcode].filter(Boolean).join(" "),
    addr.country,
  ].filter(Boolean);

  const profileFields = [
    ["Website", shop.website],
    ["Description", shop.description],
    ["Collection", shop.collectionMethod],
    ["Delivery", shop.deliveryMethod],
    ["Lead time", shop.leadTimeHours != null ? `${shop.leadTimeHours} hours` : null],
    ["Max active orders", shop.maxActiveOrders],
  ];
  const givenProfile = profileFields.filter(([, v]) => v != null && v !== "");
  const missingProfile = profileFields.filter(([, v]) => v == null || v === "");

  const checks = [
    {
      label: "Phone verified",
      ok: Boolean(a.verifiedAt),
      detail: a.verifiedAt ? formatDate(a.verifiedAt, DATE_TIME_FORMAT) : "Not verified yet",
    },
    {
      label: "Shop address and zone",
      ok: Boolean(addr.street && addr.postcode && addr.zone),
      detail: !addr.street ? "No shop address" : addr.zone ? `In zone ${addr.zone}` : "Address is outside every zone",
    },
    {
      label: "Services and turnaround",
      ok: offered.length > 0 && noTat.length === 0,
      detail: !offered.length
        ? "No services chosen"
        : noTat.length
          ? `${noTat.length} service${noTat.length > 1 ? "s" : ""} without a turnaround`
          : `${offered.length} service${offered.length > 1 ? "s" : ""}, all with a turnaround`,
    },
    {
      label: "Working hours",
      ok: Boolean(r.hoursSet) && week.unset === 0 && week.openDays > 0,
      detail: !week.openDays
        ? "No open days"
        : week.unset
          ? `${week.unset} open day${week.unset > 1 ? "s" : ""} without times`
          : `${week.openDays} days · ${week.hours} hours a week`,
    },
    {
      label: "Machinery",
      ok: machines.length > 0,
      detail: machines.length ? `${machines.length} machine type${machines.length > 1 ? "s" : ""}` : "None given",
    },
    {
      label: "Shop profile details",
      ok: missingProfile.length === 0,
      detail: `${givenProfile.length} of ${profileFields.length} given`,
    },
    {
      label: "Payout account",
      ok: Boolean(shop.payoutConnected),
      detail: shop.payoutConnected ? "Connected" : "Not connected yet",
    },
  ];
  const ready = checks.filter((c) => c.ok).length;
  const pct = Math.round((ready / checks.length) * 100);

  return (
    <div className="reg">
      {/* Summary */}
      <section className="reg-card reg-hero">
        <div className="reg-hero__top">
          <div className="reg-avatar" aria-hidden>
            {initials(shopName)}
          </div>
          <div className="reg-hero__id">
            <h2 className="reg-hero__name">{shopName}</h2>
            <p className="reg-hero__meta">
              {shop.profileType ? <span>{[shop.profileType, shop.profileOther].filter(Boolean).join(" · ")}</span> : null}
            </p>
            <p className="reg-hero__meta">
              {addr.postcode || addr.city ? (
                <span>
                  <DsIcon name="pin" size={14} />
                  {[addr.city, addr.postcode].filter(Boolean).join(" ")}
                  {addr.zone ? ` · Zone ${addr.zone}` : ""}
                </span>
              ) : null}
              {a.name ? (
                <span>
                  <DsIcon name="users" size={14} />
                  {a.name}
                </span>
              ) : null}
              {a.registeredAt ? <span>Registered {formatDate(a.registeredAt, DATE_TIME_FORMAT)}</span> : null}
            </p>
            <div className="reg-hero__badges">
              <StatusBadge status={a.approvalStatus} />
              {a.approvalStatus === "pending" && a.rejectionReason ? <Badge tone="danger">Previously rejected</Badge> : null}
              <Badge tone={ready === checks.length ? "success" : "neutral"}>
                {ready} of {checks.length} checks ready
              </Badge>
              {visits.latest?.recommendation ? (
                <Badge tone={RECOMMENDATION[visits.latest.recommendation]?.tone || "neutral"}>
                  Last visit: {RECOMMENDATION[visits.latest.recommendation]?.label || visits.latest.recommendation}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        <div className="reg-kpis">
          <div className="reg-kpi">
            <p className="reg-kpi__label">Services</p>
            <p className="reg-kpi__value">{offered.length}</p>
            <p className="reg-kpi__note">
              {services.length > offered.length ? `${services.length - offered.length} switched off` : "All switched on"}
            </p>
          </div>
          <div className="reg-kpi">
            <p className="reg-kpi__label">Open a week</p>
            <p className="reg-kpi__value">{week.openDays ? `${week.hours} h` : "—"}</p>
            <p className="reg-kpi__note">{week.openDays} of 7 days</p>
          </div>
          <div className="reg-kpi">
            <p className="reg-kpi__label">Machinery</p>
            <p className="reg-kpi__value">{machines.length}</p>
            <p className="reg-kpi__note">{machines.length === 1 ? "type" : "types"} registered</p>
          </div>
          <div className="reg-kpi">
            <p className="reg-kpi__label">Shop visits</p>
            <p className="reg-kpi__value">{visits.count || 0}</p>
            <p className="reg-kpi__note">
              {visits.latest ? `Last ${whenText(visits.latest.visitedAt)}` : "Not visited yet"}
            </p>
          </div>
        </div>
      </section>

      {a.approvalStatus === "pending" && a.rejectionReason ? (
        <div className="reg-alert reg-alert--warn" role="note">
          <CheckIcon kind="warn" />
          <div>
            <p className="reg-alert__title">Previously rejected · moved back to review</p>
            <p className="reg-alert__text">
              Rejected before because: {String(a.rejectionReason).replace(/\.$/, "")}. Check this has been fixed before approving.
            </p>
          </div>
        </div>
      ) : null}

      {a.approvalStatus === "rejected" && a.rejectionReason ? (
        <div className="reg-alert" role="note">
          <CheckIcon kind="warn" />
          <div>
            <p className="reg-alert__title">Rejected because</p>
            <p className="reg-alert__text">{a.rejectionReason}</p>
          </div>
        </div>
      ) : null}

      <div className="reg-layout">
        <div className="reg-main">
          <Card
            title="Services and turnaround"
            sub={
              offered.length
                ? `${offered.length} offered${services.length > offered.length ? ` · ${services.length - offered.length} switched off` : ""}`
                : "The shop has not chosen any services"
            }
          >
            {services.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="reg-table">
                  <thead>
                    <tr>
                      <th>Service</th>
                      <th className="num">Turnaround</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map((s) => (
                      <tr key={s.name}>
                        <td>
                          <span className={`reg-svc${s.offered ? "" : " reg-svc--off"}`}>
                            <span className="reg-svc__dot" aria-hidden />
                            {s.name}
                            {s.offered ? null : <Badge>Switched off</Badge>}
                          </span>
                        </td>
                        <td className="num">
                          <Badge tone={tatTone(s.turnaround)}>{s.turnaround || "Not given"}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="reg-empty">{NONE}</p>
            )}
          </Card>

          <Card
            title="Opening hours"
            sub={
              week.openDays
                ? `Open ${week.openDays} day${week.openDays > 1 ? "s" : ""} · ${week.hours} hours a week${week.unset ? ` · ${week.unset} without times` : ""}`
                : "No opening hours set"
            }
          >
            {hours.length ? (
              <div className="reg-week">
                {hours.map((h) => {
                  const n = dayHours(h);
                  const cls = !h.open ? " reg-day--closed" : n == null ? " reg-day--unset" : "";
                  return (
                    <div key={h.day} className={`reg-day${cls}`}>
                      <p className="reg-day__name">{DAY_SHORT[h.day] || h.day}</p>
                      <p className="reg-day__time">
                        {!h.open ? (
                          "Closed"
                        ) : n == null ? (
                          "Times not set"
                        ) : (
                          <>
                            {hh24(h.openTime)}
                            <br />
                            {hh24(h.closeTime)}
                          </>
                        )}
                      </p>
                      {h.open && n != null ? <p className="reg-day__hrs">{n} h</p> : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="reg-empty">{NONE}</p>
            )}
          </Card>

          <Card title="Machinery" sub="As the shop registered it (number of machines)">
            {machines.length ? (
              <div className="reg-machines">
                {machines.map((m) => (
                  <div key={m.name} className="reg-machine">
                    <span className="reg-machine__count">{m.count || "—"}</span>
                    <span className="reg-machine__name">{m.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="reg-empty">{NONE}</p>
            )}
          </Card>

          <Card title="Shop profile" sub={`${givenProfile.length} of ${profileFields.length} details given`}>
            <Dl
              className="reg-grid2"
              rows={[
                ["Business name", shop.name],
                ["Profile type", [shop.profileType, shop.profileOther].filter(Boolean).join(" · ")],
                ...givenProfile,
              ]}
            />
            {missingProfile.length ? (
              <div className="reg-missing">
                <span>Not given:</span>
                {missingProfile.map(([label]) => (
                  <Badge key={label}>{label}</Badge>
                ))}
              </div>
            ) : null}
          </Card>
        </div>

        <aside className="reg-aside">
          <Card title="Review readiness" sub={`${ready} of ${checks.length} ready`}>
            <div className={`reg-progress${ready === checks.length ? " reg-progress--done" : ""}`} aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </div>
            <ul className="reg-checks">
              {checks.map((c) => (
                <li key={c.label} className="reg-check">
                  <CheckIcon kind={c.ok ? "ok" : "warn"} />
                  <div style={{ minWidth: 0 }}>
                    <p className="reg-check__label">{c.label}</p>
                    <p className="reg-check__detail">{c.detail}</p>
                  </div>
                </li>
              ))}
              <li className="reg-check">
                <CheckIcon kind={visits.count ? "ok" : "opt"} />
                <div style={{ minWidth: 0 }}>
                  <p className="reg-check__label">Shop visit</p>
                  <p className="reg-check__detail">
                    {visits.count ? `${visits.count} recorded` : "Optional · not visited yet"}
                  </p>
                </div>
              </li>
            </ul>
          </Card>

          <Card title="Owner and contact">
            <Dl
              rows={[
                ["Name", a.name],
                ["Email", a.email],
                ["Phone", a.phone],
                ["Agent ID", a.id != null ? `#${a.id}` : null],
                ["Registered", a.registeredAt ? formatDate(a.registeredAt, DATE_TIME_FORMAT) : null],
              ]}
            />
          </Card>

          <Card
            title="Shop address"
            right={
              mapLink ? (
                <a className="reg-link" href={mapLink} target="_blank" rel="noreferrer">
                  Open in Google Maps
                </a>
              ) : null
            }
          >
            {addressLines.length ? (
              <address className="reg-address">
                {addressLines.map((l) => (
                  <div key={l}>{l}</div>
                ))}
              </address>
            ) : (
              <p className="reg-empty">{NONE}</p>
            )}
            <Dl rows={[["Zone", addr.zone]]} />
          </Card>
        </aside>
      </div>
    </div>
  );
}
