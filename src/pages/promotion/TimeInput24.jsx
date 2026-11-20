import { Input } from "../../design-system";

/** "HH:mm" in 24-hour time (00:00–23:59). */
export const TIME_24 = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * A 24-hour time box ("09:00", "18:30"), the same on every computer: browser time pickers
 * follow the computer's settings and may show AM/PM. Typing "930" or "9:3" becomes "09:30"
 * when the box is left.
 */
export default function TimeInput24({ value, onChange, placeholder = "HH:MM", ...rest }) {
  const tidy = (raw) => {
    const digits = String(raw || "").replace(/\D/g, "").slice(0, 4);
    if (!digits) return "";
    const hh = digits.length <= 2 ? digits : digits.slice(0, digits.length - 2);
    const mm = digits.length <= 2 ? "00" : digits.slice(-2);
    const out = `${hh.padStart(2, "0")}:${mm.padStart(2, "0")}`;
    return TIME_24.test(out) ? out : raw;
  };
  return (
    <Input
      type="text"
      inputMode="numeric"
      maxLength={5}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^\d:]/g, ""))}
      onBlur={(e) => onChange(tidy(e.target.value))}
      aria-invalid={Boolean(value) && !TIME_24.test(value)}
      {...rest}
    />
  );
}

/** Date + optional time → what the API takes: "YYYY-MM-DD" (whole day) or "YYYY-MM-DDTHH:mm" (UK time). */
export const dateWithTime = (date, time) => (date ? (time && TIME_24.test(time) ? `${date}T${time}` : date) : null);
