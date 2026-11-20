import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./quickOffer.css";

/** "HH:mm" in 24-hour time (00:00–23:59). */
export const TIME_24 = /^([01]\d|2[0-3]):[0-5]\d$/;

const pad = (n) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, h) => pad(h));
const MINUTES = Array.from({ length: 12 }, (_, i) => pad(i * 5));

/**
 * One 24-hour time box. Opening it shows hours (00–23) and minutes (every 5) side by side,
 * so the whole time is picked in one place — the same on every computer (browser time
 * pickers follow the computer and may show AM/PM). Picking a minute closes it; "Clear"
 * empties it (no time = the whole day). A saved time off the 5-minute step (e.g. 08:42)
 * stays in the minutes list so it is never lost.
 */
export default function TimeInput24({ value, onChange, disabled, placeholder = "--:--", "aria-label": ariaLabel = "Time" }) {
  const valid = TIME_24.test(value || "");
  const [hh, mm] = valid ? value.split(":") : ["", ""];
  const minutes = [...new Set([...MINUTES, ...(mm ? [mm] : [])])].sort();
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);

  const close = (refocus = true) => {
    setOpen(false);
    setPos(null);
    if (refocus) btnRef.current?.focus();
  };

  // Place the panel under the box (or above it when there is no room) before it is painted.
  useLayoutEffect(() => {
    if (!open) return;
    const r = btnRef.current.getBoundingClientRect();
    const h = popRef.current?.offsetHeight || 0;
    const w = popRef.current?.offsetWidth || 0;
    let top = r.bottom + 6;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 6);
    const left = Math.min(r.left, window.innerWidth - w - 12);
    setPos({ top, left });
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    // Show the chosen hour and minute without scrolling.
    popRef.current?.querySelectorAll(".is-on").forEach((el) => el.scrollIntoView({ block: "center" }));
    const outside = (e) => {
      if (!btnRef.current?.contains(e.target) && !popRef.current?.contains(e.target)) close(false);
    };
    const onScroll = (e) => {
      if (!popRef.current?.contains(e.target)) close(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape closes only this panel, not the popup the form is in.
  const onKeyDown = (e) => {
    if (e.key === "Escape" && open) {
      e.preventDefault();
      close();
    }
  };

  const cell = (v, on, onPick, label) => (
    <button
      key={v}
      type="button"
      role="option"
      aria-selected={on}
      aria-label={label}
      className={`qo-tp__cell${on ? " is-on" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onPick}
    >
      {v}
    </button>
  );

  return (
    <div className="jd-sel qo-tp" onKeyDown={onKeyDown}>
      <button
        ref={btnRef}
        type="button"
        className="jd-input jd-sel__trigger"
        aria-label={ariaLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <span className={`jd-sel__val${valid ? "" : " qo-tp__ph"}`}>{valid ? value : placeholder}</span>
        <svg className="jd-sel__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={popRef}
            className="jd-ds qo-tp__pop"
            role="dialog"
            aria-label={ariaLabel}
            onKeyDown={onKeyDown}
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, visibility: "hidden" }}
          >
            <div className="qo-tp__cols">
              <div className="qo-tp__col" role="listbox" aria-label="Hours">
                <div className="qo-tp__head">Hour</div>
                {HOURS.map((h) => cell(h, h === hh, () => onChange(`${h}:${mm || "00"}`), `${h} hours`))}
              </div>
              <div className="qo-tp__col" role="listbox" aria-label="Minutes">
                <div className="qo-tp__head">Min</div>
                {minutes.map((m) =>
                  cell(m, m === mm, () => {
                    onChange(`${hh || "00"}:${m}`);
                    close();
                  }, `${m} minutes`)
                )}
              </div>
            </div>
            <div className="qo-tp__foot">
              <button type="button" className="qo-tp__clear" onClick={() => { onChange(""); close(); }}>
                Clear
              </button>
              <button type="button" className="qo-tp__done" onClick={() => close()}>
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

/** Date + optional time → what the API takes: "YYYY-MM-DD" (whole day) or "YYYY-MM-DDTHH:mm" (UK time). */
export const dateWithTime = (date, time) => (date ? (time && TIME_24.test(time) ? `${date}T${time}` : date) : null);
