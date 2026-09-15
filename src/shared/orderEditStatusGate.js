/**
 * When admin can open **Edit invoice**: from **Agent Added the Services** (9)
 * onward — that is when invoice lines / add-ons exist — plus any booking that
 * already has an invoice draft or finalized invoice.
 *
 * Seed IDs: 9 Agent Added, 10 Invoice Generated … 17 Completed.
 * Side statuses (on hold / issue) stay editable if an invoice already exists.
 */

import { isInvoiceIssued } from "./invoiceLifecycle";

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

const AGENT_ADDED_SERVICES_ID = 9;
const COMPLETED_ID = 17;
const CANCELLED_ID = 19;
const REFUNDED_ID = 21;
const RETURN_TO_PROCESSING_ID = 20;

/** Pickup / transit — invoice lines are not ready yet. */
const PRE_INVOICE_EXACT = new Set(
  [
    "in transit to facility",
    "delivered laundry to shop",
  ].map((s) => normalizeStatusTitle(s))
);

function isExplicitlyPreInvoiceExact(key) {
  if (PRE_INVOICE_EXACT.has(key)) return true;
  if (key === "in transit" || key.startsWith("in transit ")) return true;
  if (key === "pending" || key === "new" || key === "order created") return true;
  if (key === "confirmed" || key === "awaiting collection") return true;
  return false;
}

function isInvoiceOrLaterByKeywords(key) {
  if (!key) return false;

  if (key.includes("agent added")) return true;
  if (key.includes("invoice generated")) return true;
  if (key.includes("invoice") && key.includes("generat")) return true;

  if (/\bprocessing\b/.test(key)) return true;

  if (key.includes("out for delivery")) return true;
  if (key.includes("driver reached")) return true;
  if (key.includes("delivery failed")) return true;
  if (key === "delivered" || key.startsWith("delivered ")) return true;

  if (key.includes("at facility")) return true;
  if (/\bcompleted\b/.test(key)) return true;
  if (/\bcomplete\b/.test(key) && !key.includes("incomplete")) return true;

  return false;
}

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
  ["delivered"],
];

const PIPELINE_INDEX_FIRST_EDITABLE = 2;

function rankByExactPipeline(key) {
  for (let i = 0; i < STATUS_GROUPS.length; i++) {
    for (const label of STATUS_GROUPS[i]) {
      if (key === label) return i;
    }
  }
  return -1;
}

function canEditByStatusId(sid) {
  const n = Number(sid);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n === CANCELLED_ID || n === REFUNDED_ID) return false;
  if (n >= AGENT_ADDED_SERVICES_ID && n <= COMPLETED_ID) return true;
  if (n === RETURN_TO_PROCESSING_ID) return true;
  return null;
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
 * Index of first editable status (Agent Added / Invoice Generated) in the API list.
 */
export function getFirstEditableStatusIndexFromApi(statuses) {
  const arr = Array.isArray(statuses) ? statuses : [];
  let idx = arr.findIndex((s) => {
    const t = normalizeStatusTitle(s?.title);
    return t.includes("agent added") || t.includes("invoice generated") ||
      (t.includes("invoice") && t.includes("generat"));
  });
  if (idx === -1) {
    idx = arr.findIndex((s) => Number(s?.id) === AGENT_ADDED_SERVICES_ID);
  }
  return idx;
}

/**
 * @param {object} booking raw booking from list/detail API
 * @param {Array<{ id: unknown, title?: string }>} [statuses] from `useGetAllOrderStatusesQuery` → `.data`
 */
/** True when the page should wait (status list / title not loaded yet). */
export function isEditGatePending(booking, statuses) {
  if (!booking) return true;
  if (isInvoiceIssued(booking)) return false;
  if (resolveOrderStatusTitle(booking)) return false;
  const sid =
    booking?.bookingStatusId ??
    booking?.bookingStatus?.id ??
    booking?.booking_status_id;
  if (canEditByStatusId(sid) !== null) return false;
  return !Array.isArray(statuses) || statuses.length === 0;
}

export function canEditOrderFromBooking(booking, statuses) {
  if (!booking) return false;

  if (isInvoiceIssued(booking)) {
    const sid =
      booking?.bookingStatusId ??
      booking?.bookingStatus?.id ??
      booking?.booking_status_id;
    const blocked = canEditByStatusId(sid);
    if (blocked === false) return false;
    return true;
  }

  const title = resolveOrderStatusTitle(booking);
  if (title && canEditOrderByStatusTitle(title)) return true;

  const sid =
    booking?.bookingStatusId ??
    booking?.bookingStatus?.id ??
    booking?.booking_status_id;
  const byId = canEditByStatusId(sid);
  if (byId === true) return true;
  if (byId === false) return false;

  if (sid == null || sid === "") return false;
  if (!Array.isArray(statuses) || statuses.length === 0) return false;

  const firstIdx = getFirstEditableStatusIndexFromApi(statuses);
  if (firstIdx < 0) return false;

  const curIdx = statuses.findIndex((s) => String(s.id) === String(sid));
  if (curIdx === -1) return false;
  return curIdx >= firstIdx;
}
