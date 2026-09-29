import { Badge } from "../../design-system";
import { formatDate } from "../../utilities/formatters";

const PANEL = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const ACTION_LABEL = {
  assign: "Assigned",
  reassign: "Reassigned",
  unlink: "Unlinked",
  relink: "Relinked",
  exclude: "Excluded",
  include: "Included",
};

const ACTION_TONE = {
  assign: "brand",
  reassign: "brand",
  unlink: "neutral",
  relink: "success",
  exclude: "danger",
  include: "success",
};

function formatEventLine(ev, { showCustomer } = {}) {
  const action = ACTION_LABEL[ev.action] || ev.action;
  const from = ev.fromShopName;
  const to = ev.toShopName;
  const parts = [];
  if (showCustomer && ev.customerName) parts.push(ev.customerName);
  if (from && to) parts.push(`${from} → ${to}`);
  else if (to) parts.push(`→ ${to}`);
  else if (from) parts.push(`from ${from}`);
  if (ev.wasReturningAtFromShop) parts.push("(was returning at from)");
  if (ev.wasReturningAtToShop) parts.push("(returning at to)");
  return { action, detail: parts.filter(Boolean).join(" · ") };
}

/**
 * Compact audit timeline for customer↔shop routing changes.
 */
export default function CustomerRoutingEventsPanel({
  events = [],
  title = "Routing history",
  showCustomer = false,
  emptyText = "No routing changes yet.",
}) {
  const rows = Array.isArray(events) ? events : [];

  return (
    <div style={PANEL}>
      <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>
        {title}
      </h2>
      {rows.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
          {emptyText}
        </p>
      ) : (
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((ev) => {
            const { action, detail } = formatEventLine(ev, { showCustomer });
            return (
              <div
                key={ev.id}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "8px 10px",
                  borderRadius: 10,
                  border: "1px solid var(--line, #e6e9f0)",
                  background: "var(--surface-2, #fafbfd)",
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <Badge tone={ACTION_TONE[ev.action] || "neutral"}>
                      {action}
                    </Badge>
                    <span style={{ fontSize: 13 }}>{detail || "—"}</span>
                  </span>
                  {ev.note ? (
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 4,
                      }}
                    >
                      {ev.note}
                    </span>
                  ) : null}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
