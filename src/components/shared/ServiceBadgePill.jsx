import { FaLeaf } from "react-icons/fa";

/** Same green as the customer/shop apps' service badge. */
const SERVICE_BADGE_COLORS = { bg: "#E6F4EA", fg: "#1B6B3A", line: "#A8D5B5" };

/**
 * Green pill with a leaf for a premium service (badge set in admin, e.g.
 * "Premium · Eco"). Shows [label] (service name or badge text).
 */
export default function ServiceBadgePill({ label, title, size = 11 }) {
  if (!label) return null;
  return (
    <span
      title={title || label}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        maxWidth: "100%",
        padding: "1px 8px",
        borderRadius: 6,
        border: `1px solid ${SERVICE_BADGE_COLORS.line}`,
        background: SERVICE_BADGE_COLORS.bg,
        color: SERVICE_BADGE_COLORS.fg,
        fontSize: size,
        fontWeight: 600,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <FaLeaf aria-hidden="true" style={{ flex: "none", fontSize: size - 1 }} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </span>
  );
}
