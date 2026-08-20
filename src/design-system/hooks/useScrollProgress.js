import { useCallback, useEffect, useRef, useState } from "react";

export function computeScrollProgress(el) {
  if (!el) return 0;
  const max = el.scrollHeight - el.clientHeight;
  if (max <= 1) return 0;
  return Math.min(100, Math.max(0, (el.scrollTop / max) * 100));
}

function canScrollY(el) {
  if (!el || el.nodeType !== 1) return false;
  const { overflowY } = window.getComputedStyle(el);
  return overflowY === "auto" || overflowY === "scroll";
}

/** Prefer the root when it overflows; otherwise the largest overflowing descendant. */
export function findPrimaryScrollTarget(root) {
  if (!root) return null;
  if (root.scrollHeight - root.clientHeight > 1) return root;

  let best = root;
  let bestMax = 0;
  for (const el of root.querySelectorAll("*")) {
    if (!canScrollY(el)) continue;
    const max = el.scrollHeight - el.clientHeight;
    if (max > bestMax) {
      bestMax = max;
      best = el;
    }
  }
  return best;
}

/**
 * Vertical read-progress for a scroll root. Recalcs on scroll, resize,
 * open (enabled), and content mutations. Used by the design-system Modal.
 */
export default function useScrollProgress(enabled) {
  const rootRef = useRef(null);
  const targetRef = useRef(null);
  const [progress, setProgress] = useState(0);

  const apply = useCallback((el) => {
    const next = computeScrollProgress(el);
    setProgress((prev) => (prev === next ? prev : next));
  }, []);

  const resolve = useCallback(() => {
    const root = rootRef.current;
    if (!root) {
      targetRef.current = null;
      setProgress(0);
      return;
    }
    const target = findPrimaryScrollTarget(root);
    targetRef.current = target;
    apply(target);
  }, [apply]);

  useEffect(() => {
    if (!enabled) {
      targetRef.current = null;
      setProgress(0);
      return undefined;
    }

    const root = rootRef.current;
    if (!root) return undefined;

    const ro = new ResizeObserver(() => measure());

    const measure = () => {
      resolve();
      const target = targetRef.current;
      if (target && target !== root) ro.observe(target);
    };

    measure();

    const onScroll = (event) => {
      const t = event.target;
      if (!(t instanceof HTMLElement)) return;
      if (t !== root && !root.contains(t)) return;
      if (t !== root && !canScrollY(t)) return;
      targetRef.current = t;
      apply(t);
    };

    root.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", measure);
    ro.observe(root);

    const mo = new MutationObserver(measure);
    mo.observe(root, { childList: true, subtree: true, characterData: true });

    const frame = window.requestAnimationFrame(measure);

    return () => {
      window.cancelAnimationFrame(frame);
      root.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", measure);
      ro.disconnect();
      mo.disconnect();
    };
  }, [enabled, apply, resolve]);

  return { ref: rootRef, targetRef, progress, update: resolve };
}
