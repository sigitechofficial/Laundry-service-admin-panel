import { Badge } from "../../design-system";
import { formatDate } from "../../utilities/formatters";

const PANEL = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const ACTION_TONE = {
  assign: "brand",
  reassign: "brand",
  unlink: "neutral",
  relink: "success",
  exclude: "danger",
  include: "success",
};

const ACTION_LABEL = {
  assign: "Assigned",
  reassign: "Reassigned",
  unlink: "Unlinked",
  relink: "Relinked",
  exclude: "Excluded",
  include: "Included",
};

/**
 * Human-readable routing change for admins.
 * Answers: which shop lost orders / which shop gets them / what marketplace does.
 */
function describeEvent(ev, { showCustomer } = {}) {
  const from = ev.fromShopName;
  const to = ev.toShopName;
  const who = showCustomer && ev.customerName ? `${ev.customerName}: ` : "";

  switch (ev.action) {
    case "assign":
      return {
        title: `${who}Preferred shop set → ${to || "shop"}`,
        breakdown: [
          to
            ? `New orders are offered to ${to} first (preferred / returning-style head-start).`
            : "Preferred shop was set.",
          from
            ? `Previous preferred shop was ${from}.`
            : "There was no previous preferred assignment.",
          "If that shop cannot take the job, the order goes to other shops in the zone (except excluded ones).",
        ],
      };
    case "reassign":
      return {
        title: `${who}Preferred shop moved: ${from || "—"} → ${to || "—"}`,
        breakdown: [
          from && to
            ? `Orders no longer get the first offer at ${from}; they go to ${to} first.`
            : "Preferred assignment changed.",
          to
            ? `${to} now acts like this customer’s preferred shop for new bookings.`
            : null,
          "Excluded shops stay blocked regardless of this change.",
        ].filter(Boolean),
      };
    case "unlink":
      return {
        title: `${who}Preferred assignment cleared${from ? ` (was ${from})` : ""}`,
        breakdown: [
          from
            ? `${from} is no longer the admin-preferred shop.`
            : "Preferred override removed.",
          "New orders follow natural returning history, then zone broadcast.",
          "Excluded shops still never receive marketplace offers.",
        ],
      };
    case "relink":
      return {
        title: `${who}Relinked to natural returning shop${
          to ? `: ${to}` : ""
        }`,
        breakdown: [
          from && to && from !== to
            ? `Preferred offer moved from ${from} → ${to}.`
            : to
              ? `Routing follows ${to} as the natural returning / last-completed shop.`
              : "Override cleared so history drives preferred routing again.",
          "Exclusions are unchanged.",
        ],
      };
    case "exclude":
      return {
        title: `${who}Blocked marketplace → ${to || "shop"}`,
        breakdown: [
          to
            ? `New marketplace orders will not be offered to ${to}.`
            : "Shop excluded from marketplace routing.",
          "Preferred / returning offers skip this shop; zone broadcast also skips it.",
          "Admin can still manually assign an existing order to this shop.",
          ev.note ? `Reason: ${ev.note}` : null,
        ].filter(Boolean),
      };
    case "include":
      return {
        title: `${who}Unblocked marketplace → ${from || "shop"}`,
        breakdown: [
          from
            ? `${from} can receive marketplace orders again.`
            : "Shop included for marketplace routing again.",
          "Preferred assignment (if any) is unchanged — use Assign / Unlink to change that.",
        ],
      };
    default:
      return {
        title: `${who}${ACTION_LABEL[ev.action] || ev.action}`,
        breakdown: [
          from && to ? `${from} → ${to}` : to ? `→ ${to}` : from ? `from ${from}` : null,
          ev.note || null,
        ].filter(Boolean),
      };
  }
}

/**
 * Audit timeline with clear from→to routing breakdown.
 */
export default function CustomerRoutingEventsPanel({
  events = [],
  title = "Routing history",
  showCustomer = false,
  emptyText = "No routing changes yet.",
  activeAssignment = null,
}) {
  const rows = Array.isArray(events) ? events : [];

  return (
    <div style={PANEL}>
      <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 700 }}>
        {title}
      </h2>
      <p style={{ margin: "0 0 14px", fontSize: 13, color: "var(--muted)", lineHeight: 1.45 }}>
        {activeAssignment?.shopName ? (
          <>
            Right now, new orders get the <strong>first offer</strong> at{" "}
            <strong>{activeAssignment.shopName}</strong>. Excluded shops never
            get marketplace offers. Everything below is the change log.
          </>
        ) : (
          <>
            No admin preferred shop right now — new orders follow returning
            history, then zone broadcast (skipping excluded shops). Change log
            below.
          </>
        )}
      </p>
      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
          {emptyText}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {rows.map((ev) => {
            const { title: eventTitle, breakdown } = describeEvent(ev, {
              showCustomer,
            });
            return (
              <div
                key={ev.id}
                style={{
                  padding: "12px 12px",
                  borderRadius: 10,
                  border: "1px solid var(--line, #e6e9f0)",
                  background: "var(--surface-2, #fafbfd)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                      minWidth: 0,
                    }}
                  >
                    <Badge tone={ACTION_TONE[ev.action] || "neutral"}>
                      {ACTION_LABEL[ev.action] || ev.action}
                    </Badge>
                    <strong style={{ fontSize: 13 }}>{eventTitle}</strong>
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ev.createdAt ? formatDate(ev.createdAt) : "—"}
                  </span>
                </div>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 12.5,
                    color: "var(--ink-2, #374151)",
                    lineHeight: 1.5,
                  }}
                >
                  {breakdown.map((line) => (
                    <li key={line} style={{ marginBottom: 2 }}>
                      {line}
                    </li>
                  ))}
                </ul>
                {(ev.wasReturningAtFromShop || ev.wasReturningAtToShop) && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    {ev.wasReturningAtFromShop
                      ? `Was returning at ${ev.fromShopName || "from shop"}. `
                      : ""}
                    {ev.wasReturningAtToShop
                      ? `Returning history at ${ev.toShopName || "to shop"}.`
                      : ""}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
