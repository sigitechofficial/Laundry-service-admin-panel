/**
 * When to show **Edit** on order rows: from **Invoice Generated** onward (same as dropdown order).
 * Uses status **title** (flexible matching) and optionally **bookingStatusId** + API status list order.
 */

function normalizeStatusTitle(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Pull a human-readable status from various API shapes. */
export function resolveOrderStatusTitle(booking) {
  if (!booking) return "";
  const bs =
    booking.bookingStatus ??
    booking.BookingStatus ??
    booking.booking_status;
  if (typeof bs === "string") return bs.trim();
  const nested = bs?.title ?? bs?.name ?? bs?.status;
  if (nested) return String(nested).trim();
  return (
    booking.statusTitle ??
    booking.bookingStatusTitle ??
    booking.status?.title ??
    ""
  )
    .toString()
    .trim();
}

/** Pre-invoice steps — block edit only on **exact** normalized titles (no substring on "not in transit…"). */
const PRE_INVOICE_EXACT = new Set(
  [
    "in transit to facility",
    "delivered laundry to shop",
    "agent added the services",
  ].map((s) => normalizeStatusTitle(s))
);

function isExplicitlyPreInvoiceExact(key) {
  if (PRE_INVOICE_EXACT.has(key)) return true;
  if (key === "in transit" || key.startsWith("in transit ")) return true;
  if (key === "pending" || key === "new" || key === "order created") return true;
  return false;
}

/**
 * Liberal match for "invoice generated **or later**" stages when API wording varies
 * (e.g. "Completed", "Order Complete", "Processing at facility").
 */
function isInvoiceOrLaterByKeywords(key) {
  if (!key) return false;

  if (key.includes("invoice generated")) return true;
  if (key.includes("invoice") && key.includes("generat")) return true;

  if (/\bprocessing\b/.test(key)) return true;

  if (key.includes("out for delivery")) return true;
  if (key.includes("driver reached")) return true;
  if (key.includes("delivery failed")) return true;

  if (key.includes("at facility")) return true;
  if (/\bcompleted\b/.test(key)) return true;
  if (/\bcomplete\b/.test(key) && !key.includes("incomplete")) return true;

  return false;
}

/** Exact pipeline (normalized) — tertiary fallback. */
const STATUS_GROUPS = [
  ["in transit to facility"],
  ["delivered laundry to shop"],
  ["agent added the services"],
  ["invoice generated"],
  ["processing"],
  ["completed (at facility)", "completed at facility", "completed"],
  ["out for delivery"],
  ["driver reached"],
  ["delivery failed"],
];

const PIPELINE_INDEX_FIRST_EDITABLE = 3;

function rankByExactPipeline(key) {
  for (let i = 0; i < STATUS_GROUPS.length; i++) {
    for (const label of STATUS_GROUPS[i]) {
      if (key === label) return i;
    }
  }
  return -1;
}

/**
 * @param {string} [statusTitle]
 * @returns {boolean}
 */
export function canEditOrderByStatusTitle(statusTitle) {
  const key = normalizeStatusTitle(statusTitle);
  if (!key) return false;

  if (isExplicitlyPreInvoiceExact(key)) return false;
  if (isInvoiceOrLaterByKeywords(key)) return true;

  const rank = rankByExactPipeline(key);
  if (rank >= 0) return rank >= PIPELINE_INDEX_FIRST_EDITABLE;

  return false;
}

/**
 * Index of first "Invoice Generated" (or closest) in `admin/allOrderStatuses` array order.
 */
export function getFirstEditableStatusIndexFromApi(statuses) {
  const arr = Array.isArray(statuses) ? statuses : [];
  let idx = arr.findIndex((s) => {
    const t = normalizeStatusTitle(s?.title);
    return t.includes("invoice generated") || (t.includes("invoice") && t.includes("generat"));
  });
  if (idx === -1) {
    idx = arr.findIndex((s) => normalizeStatusTitle(s?.title) === "invoice generated");
  }
  return idx;
}

/**
 * @param {object} booking raw booking from list/detail API
 * @param {Array<{ id: unknown, title?: string }>} [statuses] from `useGetAllOrderStatusesQuery` → `.data`
 */
export function canEditOrderFromBooking(booking, statuses) {
  const title = resolveOrderStatusTitle(booking);
  if (title && canEditOrderByStatusTitle(title)) return true;

  const sid =
    booking?.bookingStatusId ??
    booking?.bookingStatus?.id ??
    booking?.booking_status_id;
  if (sid == null || sid === "") return false;
  if (!Array.isArray(statuses) || statuses.length === 0) return false;

  const firstIdx = getFirstEditableStatusIndexFromApi(statuses);
  if (firstIdx < 0) return false;

  const curIdx = statuses.findIndex((s) => String(s.id) === String(sid));
  if (curIdx === -1) return false;
  return curIdx >= firstIdx;
}
