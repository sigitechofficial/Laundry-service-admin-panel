import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

function Chevron() {
  return (
    <svg className="jd-sel__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function Check() {
  return (
    <svg className="jd-sel__ck" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 12l5 5L20 6" />
    </svg>
  );
}

function indexOfValue(options, value) {
  const i = options.findIndex((o) => String(o.value) === String(value));
  return i < 0 ? 0 : i;
}

/**
 * Catalog popover select — not a native <select>, not MUI Select.
 * The menu is portaled with .jd-ds so tokens still apply outside the page island.
 */
export default function Select({
  id,
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled,
  error,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
}) {
  const uid = useId();
  const listId = `${uid}-list`;
  const wrapRef = useRef(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  const searchRef = useRef("");
  const searchTimer = useRef(0);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => indexOfValue(options, value));
  const [pos, setPos] = useState({ top: 0, left: 0, width: 200 });

  const selected = options.find((o) => String(o.value) === String(value));

  function place() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let top = r.bottom + 8;
    let left = r.left;
    const width = Math.max(r.width, 200);
    const popH = popRef.current?.offsetHeight || 0;
    const popW = popRef.current?.offsetWidth || width;
    if (top + popH > window.innerHeight - 12) top = Math.max(12, r.top - popH - 8);
    if (left + popW > window.innerWidth - 12) left = Math.max(12, window.innerWidth - popW - 12);
    setPos({ top, left, width });
  }

  function close() {
    setOpen(false);
    searchRef.current = "";
  }

  function pick(index) {
    const opt = options[index];
    if (!opt) return;
    onChange?.(opt.value);
    close();
    btnRef.current?.focus();
  }

  function move(delta) {
    if (!options.length) return;
    setActive((cur) => {
      const next = (cur + delta + options.length) % options.length;
      return next;
    });
  }

  function typeahead(char) {
    window.clearTimeout(searchTimer.current);
    searchRef.current += char.toLowerCase();
    searchTimer.current = window.setTimeout(() => {
      searchRef.current = "";
    }, 500);
    const q = searchRef.current;
    const idx = options.findIndex((o) => String(o.label).toLowerCase().startsWith(q));
    if (idx >= 0) {
      setActive(idx);
      if (!open) setOpen(true);
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    place();
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target) || popRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onScroll = (e) => {
      if (e.target.closest?.(".jd-ds-sel-pop")) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = popRef.current?.querySelector(`[data-sel-i="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  useEffect(() => () => window.clearTimeout(searchTimer.current), []);

  const activeId = options[active] ? `${uid}-opt-${active}` : undefined;

  const pop = open
    ? createPortal(
        <div
          ref={popRef}
          className="jd-ds jd-ds-sel-pop"
          role="listbox"
          id={listId}
          style={{ top: pos.top, left: pos.left, minWidth: pos.width }}
        >
          {options.map((o, i) => {
            const on = String(o.value) === String(value);
            return (
              <div
                key={`${String(o.value)}-${i}`}
                id={`${uid}-opt-${i}`}
                data-sel-i={i}
                role="option"
                aria-selected={on}
                className={`jd-sel__opt${on ? " is-on" : ""}${i === active ? " is-active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(i)}
              >
                {o.label}
                {on ? <Check /> : null}
              </div>
            );
          })}
        </div>,
        document.body
      )
    : null;

  return (
    <div className={`jd-sel${open ? " is-open" : ""}`} ref={wrapRef}>
      <button
        ref={btnRef}
        id={id}
        type="button"
        className={`jd-input jd-sel__trigger${error ? " is-error" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open ? activeId : undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid ?? Boolean(error)}
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          if (open) {
            setOpen(false);
            return;
          }
          setActive(indexOfValue(options, value));
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Escape") {
            if (open) {
              e.preventDefault();
              close();
            }
            return;
          }
          if (e.key === "Tab") {
            if (open) close();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            if (!open) {
              setActive(indexOfValue(options, value));
              setOpen(true);
            } else move(1);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            if (!open) {
              setActive(indexOfValue(options, value));
              setOpen(true);
            } else move(-1);
            return;
          }
          if (e.key === "Home") {
            if (!open) return;
            e.preventDefault();
            setActive(0);
            return;
          }
          if (e.key === "End") {
            if (!open || !options.length) return;
            e.preventDefault();
            setActive(options.length - 1);
            return;
          }
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!open) {
              setActive(indexOfValue(options, value));
              setOpen(true);
            } else pick(active);
            return;
          }
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            typeahead(e.key);
          }
        }}
      >
        <span className="jd-sel__val">{selected ? selected.label : placeholder}</span>
        <Chevron />
      </button>
      {pop}
    </div>
  );
}
