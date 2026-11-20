/** "HH:mm" in 24-hour time (00:00–23:59). */
export const TIME_24 = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Date + optional time → what the API takes: "YYYY-MM-DD" (whole day) or "YYYY-MM-DDTHH:mm" (UK time). */
export const dateWithTime = (date, time) => (date ? (time && TIME_24.test(time) ? `${date}T${time}` : date) : null);
