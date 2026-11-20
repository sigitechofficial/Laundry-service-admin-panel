/**
 * Whether a campaign lets its promotions run for new orders — the same rule as the API
 * (services/promotions/campaignRules.js):
 *   active status, inside its start/end days (UK days, both included), budget not used up.
 * The API sends `stopReason` / `campaignStopReason` (it also counts budget held by unpaid
 * orders); without them, the rule is worked out here from the campaign row.
 */

export const CAMPAIGN_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "archived", label: "Archived" },
];

/** A promotion cannot be put into a campaign in these statuses. */
export const CLOSED_CAMPAIGN_STATUSES = ["completed", "archived"];
/** These switch the campaign off: they also stop promotions already held by booked orders. */
export const SWITCH_OFF_STATUSES = ["paused", "archived"];

export const campaignStatusLabel = (s) => CAMPAIGN_STATUS_OPTIONS.find((o) => o.value === s)?.label || s || "—";

/** Today's calendar day in the UK, 'YYYY-MM-DD'. */
export function ukToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

const dayOf = (v) => (v ? String(v).slice(0, 10) : null);

/** Pence the campaign has given away: paid + held by unpaid orders (when the API sends it). */
export const budgetTakenMinor = (c) => Number(c?.usedBudgetMinor || 0) + Number(c?.heldBudgetMinor || 0);

/** Pence left, or null with no budget. */
export function budgetLeftMinor(c) {
  if (!c || c.budgetMinor == null) return null;
  if (c.budgetLeftMinor != null) return Number(c.budgetLeftMinor);
  return Math.max(0, Number(c.budgetMinor) - budgetTakenMinor(c));
}

/** Why the campaign stops its promotions for new orders, or null when it runs. */
export function campaignStopReason(c, now = new Date()) {
  if (!c) return null;
  if (c.stopReason !== undefined) return c.stopReason;
  if (c.status !== "active") return "CAMPAIGN_NOT_ACTIVE";
  const today = ukToday(now);
  const start = dayOf(c.startDate);
  const end = dayOf(c.endDate);
  if (start && today < start) return "CAMPAIGN_NOT_STARTED";
  if (end && today > end) return "CAMPAIGN_ENDED";
  if (budgetLeftMinor(c) === 0) return "CAMPAIGN_BUDGET_EXHAUSTED";
  return null;
}

/** Short, admin-facing words for a stop reason. */
export function stopReasonText(reason, campaign) {
  switch (reason) {
    case "CAMPAIGN_NOT_ACTIVE":
      return campaign?.status === "draft" ? "Campaign is a draft" : `Campaign is ${campaignStatusLabel(campaign?.status).toLowerCase()}`;
    case "CAMPAIGN_NOT_STARTED": return "Campaign has not started";
    case "CAMPAIGN_ENDED": return "Campaign has ended";
    case "CAMPAIGN_BUDGET_EXHAUSTED": return "Campaign budget used up";
    default: return null;
  }
}

export const poundsFromMinor = (minor) => (minor == null || minor === "" ? "—" : `£${(Number(minor) / 100).toFixed(2)}`);

/** Promotions that new orders can use now (live status), i.e. the ones a campaign change affects. */
export const LIVE_PROMOTION_STATUSES = ["active", "scheduled"];
