import { Badge } from "../../../design-system";
import { formatDate, joinMediaUrl } from "../../../utilities/formatters";

const WHEN = "DD MMM YYYY · HH:mm";

/** Customer's answer as a badge: waiting, clean it, or return uncleaned. */
function answerBadge(item) {
  if (!item.customerAnswered) return <Badge tone="warning">Waiting for customer</Badge>;
  return item.customerKeeps ? (
    <Badge tone="success">Clean it · customer accepts risk</Badge>
  ) : (
    <Badge tone="danger">Return uncleaned · off the bill</Badge>
  );
}

function Step({ label, at, done }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          flex: "none",
          background: done ? "#2563EB" : "#CBD5E1",
        }}
      />
      <span style={{ fontSize: 12, color: done ? "#0F172A" : "#94A3B8", whiteSpace: "nowrap" }}>
        {label}
        {at ? ` · ${formatDate(at, WHEN)}` : done ? "" : " · pending"}
      </span>
    </div>
  );
}

/**
 * The shop's on-hold items for one order: what was found, the customer's
 * answer and when each step happened.
 */
export default function OnHoldItemsList({ items }) {
  const list = Array.isArray(items) ? items : [];
  if (!list.length) {
    return (
      <p style={{ margin: 0, color: "#64748B", fontSize: 13 }}>
        No items have been put on hold on this order.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      {list.map((item) => {
        const name = [item.serviceName, item.itemName].filter(Boolean).join(" · ") || "Item";
        const photo = item.photo ? joinMediaUrl(item.photo) : null;
        return (
          <div
            key={item.id}
            style={{
              padding: 12,
              borderRadius: 10,
              border: "1px solid #E5E7EB",
              background: item.customerAnswered ? "#F8FAFC" : "#FFFBEB",
              opacity: item.handledByShop ? 0.75 : 1,
            }}
          >
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              {photo ? (
                <a href={photo} target="_blank" rel="noreferrer" title="Open photo" style={{ flex: "none" }}>
                  <img
                    src={photo}
                    alt={`Photo of ${name}`}
                    style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8, border: "1px solid #E5E7EB", display: "block" }}
                  />
                </a>
              ) : null}
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: "#0F172A" }}>
                    {name}
                    {item.pieces > 1 ? (
                      <span style={{ fontWeight: 500, color: "#64748B" }}> · {item.pieces} pieces</span>
                    ) : null}
                  </p>
                  {answerBadge(item)}
                </div>
                {item.risk ? (
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#92400E" }}>
                    <strong>Risk:</strong> {item.risk}
                  </p>
                ) : null}
                {item.shopNote ? (
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#334155" }}>
                    <strong>Shop's note:</strong> {item.shopNote}
                  </p>
                ) : null}
                {item.customerNote ? (
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#1D4ED8" }}>
                    <strong>Customer's note:</strong> {item.customerNote}
                  </p>
                ) : null}
                {item.handledByShop ? (
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>
                    Taken off the invoice by the shop.
                  </p>
                ) : null}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 14px", marginTop: 8 }}>
                  <Step label="Put on hold" at={item.heldAt} done />
                  <Step label="Customer answered" at={item.respondedAt} done={item.customerAnswered} />
                  <Step label="Shop resolved" at={item.resolvedAt} done={Boolean(item.resolvedAt)} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
