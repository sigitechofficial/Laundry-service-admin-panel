import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import DsScope from "../DsScope";
import useScrollProgress from "../hooks/useScrollProgress";
import Button from "./Button";

const SIZES = ["sm", "md", "lg", "xl"];
const MAX_HEIGHTS = {
  "80vh": "jd-modal--mh-80",
};
const EXIT_MS = 200;
const EXIT_MS_REDUCED = 80;
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function focusableIn(root) {
  if (!root) return [];
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (el.getAttribute("aria-hidden") === "true") return false;
    return !el.closest("[inert]");
  });
}

export default function Modal({
  open,
  title,
  description,
  children,
  onClose,
  primaryLabel = "Confirm",
  secondaryLabel = "Cancel",
  onPrimary,
  danger,
  hideFooter = false,
  hideHeader = false,
  primaryDisabled = false,
  secondaryDisabled = false,
  size,
  maxHeight,
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef(null);
  const restoreFocusRef = useRef(null);
  // Keep latest onClose without re-running the focus-trap effect (unstable
  // inline handlers would otherwise steal focus back to the first field on every parent render).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const [present, setPresent] = useState(() => Boolean(open));
  const [shown, setShown] = useState(false);
  const hasBody = Boolean(children);
  const {
    ref: bodyRef,
    targetRef,
    progress,
  } = useScrollProgress(Boolean(open && present && hasBody));

  useEffect(() => {
    if (open) {
      setPresent(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (open || !present) return undefined;
    const ms = prefersReducedMotion() ? EXIT_MS_REDUCED : EXIT_MS;
    const timer = window.setTimeout(() => setPresent(false), ms);
    return () => window.clearTimeout(timer);
  }, [open, present]);

  useEffect(() => {
    if (!open || !present) return undefined;
    const root = dialogRef.current;
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusInitial = () => {
      const first = focusableIn(dialogRef.current)[0];
      (first || dialogRef.current)?.focus();
    };
    const frame = requestAnimationFrame(focusInitial);

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "PageDown" ||
        e.key === "PageUp" ||
        e.key === "Home" ||
        e.key === "End"
      ) {
        if (e.target?.closest?.("input, textarea, select, [contenteditable='true'], .jd-sel")) {
          return;
        }
        const scroller = targetRef.current || bodyRef.current;
        if (scroller) {
          const max = scroller.scrollHeight - scroller.clientHeight;
          if (max > 1) {
            const page = scroller.clientHeight;
            const step = 48;
            let next = scroller.scrollTop;
            if (e.key === "ArrowDown") next += step;
            else if (e.key === "ArrowUp") next -= step;
            else if (e.key === "PageDown") next += page;
            else if (e.key === "PageUp") next -= page;
            else if (e.key === "Home") next = 0;
            else next = max;
            e.preventDefault();
            scroller.scrollTop = Math.min(max, Math.max(0, next));
            return;
          }
        }
      }
      if (e.key !== "Tab") return;
      const nodes = focusableIn(dialogRef.current);
      if (!nodes.length) {
        e.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || (root && !root.contains(active))) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || (root && !root.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      const prev = restoreFocusRef.current;
      restoreFocusRef.current = null;
      if (prev && document.contains(prev)) prev.focus();
    };
    // Only re-run when the dialog opens/closes. bodyRef/targetRef are stable;
    // onClose is read via onCloseRef so parent re-renders do not re-focus the first field.
  }, [open, present, bodyRef, targetRef]);

  const handleScrimTransitionEnd = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== "opacity") return;
    if (!open) setPresent(false);
  };

  if (!present) return null;

  const widthClass = SIZES.includes(size) ? ` jd-modal--${size}` : "";
  const maxHeightClass = MAX_HEIGHTS[maxHeight] ? ` ${MAX_HEIGHTS[maxHeight]}` : "";
  const labelledBy = !hideHeader && title ? titleId : undefined;
  const describedBy = !hideHeader && description ? descId : undefined;

  return createPortal(
    <DsScope
      className={`jd-modal-scrim${shown ? " is-open" : ""}`}
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
      onTransitionEnd={handleScrimTransitionEnd}
    >
      <div
        ref={dialogRef}
        className={`jd-modal${widthClass}${maxHeightClass}`}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        aria-label={!labelledBy ? title : undefined}
      >
        {!hideHeader && (title || description) ? (
          <div className="jd-modal__h">
            {title ? <h3 id={titleId}>{title}</h3> : null}
            {description ? <p id={descId}>{description}</p> : null}
          </div>
        ) : null}
        <div
          className="jd-modal__progress"
          role="progressbar"
          aria-label="Scroll progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span className="jd-modal__progress-fill" style={{ width: `${progress}%` }} />
        </div>
        {children ? (
          <div ref={bodyRef} className="jd-modal__b">
            {children}
          </div>
        ) : null}
        {!hideFooter ? (
          <div className="jd-modal__f">
            <Button variant="secondary" onClick={onClose} disabled={secondaryDisabled}>
              {secondaryLabel}
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              onClick={onPrimary || onClose}
              disabled={primaryDisabled}
            >
              {primaryLabel}
            </Button>
          </div>
        ) : null}
      </div>
    </DsScope>,
    document.body
  );
}
