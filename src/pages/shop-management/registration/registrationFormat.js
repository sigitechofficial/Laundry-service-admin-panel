/** Shared constants and formatting for the registration review, shop visit pages and Registration tab. */
export const NONE = "Not given";

export const card = {
  border: "1px solid var(--line, #E5E7EB)",
  borderRadius: 14,
  padding: 16,
  background: "var(--surface, #fff)",
  minWidth: 0,
};
export const heading = {
  margin: 0,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--muted, #64748B)",
};
export const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
  gap: 14,
};

/** "09:00:00" -> "9:00 AM" */
export function hhmm(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hour = parseInt(h, 10);
  if (Number.isNaN(hour)) return String(t);
  return `${hour % 12 === 0 ? 12 : hour % 12}:${(m || "00").padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

/** "Thu 26 Nov 2026, 14:05" in the viewer's clock. */
export function whenText(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export const RECOMMENDATION = {
  approve: { label: "Recommend approval", tone: "success" },
  needs_changes: { label: "Needs changes", tone: "warning" },
  reject: { label: "Recommend rejection", tone: "danger" },
};
export const CHECK_RESULT = {
  good: { label: "Good", tone: "success" },
  needs_work: { label: "Needs work", tone: "warning" },
  poor: { label: "Poor", tone: "danger" },
  na: { label: "N/A", tone: "neutral" },
};
export const YES_PARTLY_NO = {
  yes: { label: "Yes", tone: "success" },
  partly: { label: "Partly", tone: "warning" },
  no: { label: "No", tone: "danger" },
};


/** Same list as the backend (AGENT_REJECTION_REASONS); "Other" needs a note. */
export const REJECTION_REASONS = [
  "Business details are incomplete or incorrect",
  "Shop address could not be verified",
  "Shop is outside our service areas",
  "Services offered do not match what we need",
  "Not enough machinery or capacity",
  "Working hours do not fit our collection and delivery times",
  "Turnaround times are too long",
  "Contact details could not be verified",
  "Duplicate or existing account",
  "Other",
];

/** Page links. [from] tells the visit pages where "Back" goes. */
export const visitPaths = {
  create: (agentId, from) => `/shop-management/agents/${agentId}/visits/new${from ? `?from=${from}` : ""}`,
  report: (agentId, visitId, from) =>
    `/shop-management/agents/${agentId}/visits/${visitId}${from ? `?from=${from}` : ""}`,
  registration: (agentId) => `/shop-management/pending-agents/${agentId}`,
};

/** Where "Back" / "Cancel" go from the visit pages: the registration review or the shop's Registration tab. */
export function backPath(from, agentId) {
  const m = /^shop-(\d+)$/.exec(String(from || ""));
  if (m) return `/shop-management/details/${m[1]}?tab=registration`;
  return visitPaths.registration(agentId);
}
