import { isValidElement, useEffect, useRef, useState } from "react";

/** Close the nearest FilterDetails menu from an option click. */
export function closeFilterMenu(target) {
  const root =
    typeof target?.closest === "function" ? target.closest("[data-filter-menu]") : null;
  root?.dispatchEvent(new CustomEvent("filter-menu-close"));
}

/**
 * One-click filter/sort menus. Native <details> + React state fought each other
 * (first click opened then React reset it), so this is a controlled button popover.
 */
export default function FilterDetails({
  summary,
  children,
  className = "group relative",
  panelClassName,
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onClose = () => setOpen(false);
    el.addEventListener("filter-menu-close", onClose);
    return () => el.removeEventListener("filter-menu-close", onClose);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerClass = isValidElement(summary) ? summary.props.className : "";
  const triggerKids = isValidElement(summary) ? summary.props.children : summary;

  return (
    <div
      ref={wrapRef}
      className={className}
      data-filter-menu=""
      data-open={open ? "true" : undefined}
    >
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        {triggerKids}
      </button>
      {open ? <div className={panelClassName}>{children}</div> : null}
    </div>
  );
}
