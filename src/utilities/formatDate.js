import dayjs from "dayjs";

/** Admin display date — matches order/invoice tables. */
export const DATE_FORMAT = "DD MMM YYYY";

/** Admin display datetime — matches `src/shared/constants` dateTimeFormat (24-hour). */
export const DATE_TIME_FORMAT = "DD MMM YYYY HH:mm";

function trimStr(value) {
  return value == null ? "" : String(value).trim();
}

/** True for calendar dates without a real clock time (avoids fake 00:00). */
export function isDateOnlyValue(value) {
  const raw = trimStr(value);
  if (!raw) return false;
  return /^\d{4}-\d{2}-\d{2}(?:[ T]00:00(?::00)?(?:\.0+)?(?:Z)?)?$/.test(raw);
}

/**
 * Single date helper for the admin panel.
 * Invalid or empty values return "—". Pass DATE_TIME_FORMAT for date+time.
 *
 * @param {string|number|Date|null|undefined} value
 * @param {string} [format]
 */
export function formatDate(value, format = DATE_FORMAT) {
  if (value == null || value === "" || value === "—") return "—";
  if (isDateOnlyValue(value) && (format.includes("HH") || format.includes("mm"))) {
    return formatCalendarDate(value, DATE_FORMAT);
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(format) : String(value);
}

/** Format a DATE / DATEONLY as a local calendar day (no UTC midnight shift). */
export function formatCalendarDate(value, format = DATE_FORMAT) {
  if (value == null || value === "" || value === "—") return "—";
  const match = trimStr(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return dayjs(
      new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    ).format(format);
  }
  return formatDate(value, format);
}

export function formatClock(value) {
  const raw = trimStr(value);
  if (!raw) return "";
  const hm = raw.match(/^(\d{1,2}):(\d{2})/);
  if (hm) return `${hm[1].padStart(2, "0")}:${hm[2]}`;
  return "";
}

/** Collection/delivery window: `15 Sep 2026, 09:00 – 11:00`. */
export function formatBookingWindow(dateValue, timeFrom, timeTo) {
  const dateText = formatCalendarDate(dateValue);
  if (dateText === "—") return "—";
  const from = formatClock(timeFrom);
  const to = formatClock(timeTo);
  if (from && to) return `${dateText}, ${from} – ${to}`;
  if (from) return `${dateText}, ${from}`;
  return dateText;
}
