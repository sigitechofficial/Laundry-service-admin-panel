import dayjs from "dayjs";

/** Admin display date — matches order/invoice tables. */
export const DATE_FORMAT = "DD MMM YYYY";

/** Admin display datetime — matches `src/shared/constants` dateTimeFormat. */
export const DATE_TIME_FORMAT = "DD MMM YYYY hh:mm A";

/**
 * Single date helper for the admin panel.
 * Invalid or empty values return "—". Pass DATE_TIME_FORMAT for date+time.
 *
 * @param {string|number|Date|null|undefined} value
 * @param {string} [format]
 */
export function formatDate(value, format = DATE_FORMAT) {
  if (value == null || value === "" || value === "—") return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format(format) : String(value);
}
