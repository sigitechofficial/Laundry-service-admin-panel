import { useLayoutEffect, useRef, useState } from "react";
import { Button, Modal } from "../../design-system";
import styles from "./DirectoryTable.module.css";
import chrome from "./dataTableChrome.module.css";

const PILL_TONES = {
  success: chrome.dotPillSuccess,
  created: chrome.dotPillCreated,
  danger: chrome.dotPillDanger,
  warning: chrome.dotPillWarning,
  info: chrome.dotPillInfo,
  teal: chrome.dotPillTeal,
  neutral: "",
};

const METRIC_TONES = {
  brand: { bar: chrome.metricBarBrand, icon: chrome.metricIconBrand },
  danger: { bar: chrome.metricBarDanger, icon: chrome.metricIconDanger },
  navy: { bar: chrome.metricBarNavy, icon: chrome.metricIconNavy },
  warning: { bar: chrome.metricBarWarning, icon: chrome.metricIconWarning },
  success: { bar: chrome.metricBarSuccess, icon: chrome.metricIconSuccess },
  neutral: { bar: chrome.metricBarNeutral, icon: chrome.metricIconNeutral },
};

const DEFAULT_METRIC_TONES = ["brand", "navy", "success", "warning"];

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={chrome.searchIcon}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="3" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function IconRepeat() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}

function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 6v6l4 2" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

const METRIC_ICONS = {
  brand: IconUsers,
  danger: IconPlus,
  navy: IconClock,
  warning: IconClock,
  success: IconRepeat,
  neutral: IconClock,
};

export function DirectoryPanel({ children, className = "", ...rest }) {
  return (
    <section className={`${chrome.panel} ${className}`.trim()} {...rest}>
      {children}
    </section>
  );
}

export function DirectoryToolbar({ children, className = "" }) {
  return <div className={`${chrome.toolbar} ${className}`.trim()}>{children}</div>;
}

export function DirectorySearch({
  id,
  value,
  onChange,
  placeholder = "Search…",
  "aria-label": ariaLabel,
}) {
  return (
    <label className={chrome.search} htmlFor={id}>
      <SearchIcon />
      <input
        id={id}
        type="search"
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel || placeholder}
        className={chrome.searchInput}
      />
    </label>
  );
}

export function DirectoryTool({ children, active = false, as: Tag = "div", className = "", ...rest }) {
  return (
    <Tag
      className={`${chrome.tool} ${active ? chrome.toolOn : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export function DirectoryToolSelect({ children, className = "", label }) {
  return (
    <div
      className={`${chrome.tool} ${chrome.toolSelect} ${label ? chrome.toolSelectLabeled : ""} ${className}`.trim()}
    >
      {label ? <span className={chrome.toolSelectLabel}>{label}</span> : null}
      {children}
    </div>
  );
}

export function DirectoryDateInput({ id, value, onChange, "aria-label": ariaLabel, title }) {
  return (
    <input
      id={id}
      type="date"
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      aria-label={ariaLabel}
      title={title || ariaLabel}
      className={chrome.toolDate}
    />
  );
}

export function DirectoryToolbarEnd({ children }) {
  return <div className={chrome.toolbarGrow}>{children}</div>;
}

export function DirectoryClearButton({ onClick, children = "Clear" }) {
  return (
    <button type="button" className={chrome.clearBtn} onClick={onClick}>
      {children}
    </button>
  );
}

export function DirectoryMorePanel({ children }) {
  return <div className={chrome.morePanel}>{children}</div>;
}

export function DirectoryFooter({ children }) {
  return <div className={chrome.footer}>{children}</div>;
}

export function DirectoryTableWrap({ children, className = "", toolbar, footer }) {
  return (
    <section className={`${chrome.panel} ${chrome.table} ${className}`.trim()}>
      {toolbar}
      {children}
      {footer ? <DirectoryFooter>{footer}</DirectoryFooter> : null}
    </section>
  );
}

export function DirectoryFormCard({
  title,
  hint,
  actions,
  children,
  className = "",
  bodyClassName = "",
  flush = false,
  ...rest
}) {
  return (
    <section className={`${chrome.panel} ${className}`.trim()} {...rest}>
      {title || hint || actions ? (
        <div className={chrome.formHead}>
          <div>
            {title ? <h2 className={chrome.formTitle}>{title}</h2> : null}
            {hint ? <p className={chrome.formHint}>{hint}</p> : null}
          </div>
          {actions ? <div className={chrome.formActions}>{actions}</div> : null}
        </div>
      ) : null}
      <div className={`${flush ? "" : chrome.formBody} ${bodyClassName}`.trim()}>
        {children}
      </div>
    </section>
  );
}

export function DirectoryStack({ children, className = "" }) {
  return <div className={`${chrome.stack} ${className}`.trim()}>{children}</div>;
}

export function DirectoryFormGrid({ children, className = "" }) {
  return <div className={`${chrome.formGrid} ${className}`.trim()}>{children}</div>;
}

export function DirectoryListRow({ children, active = false, className = "", ...rest }) {
  return (
    <div
      className={`${chrome.listRow} ${active ? chrome.listRowOn : ""} ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}

export function DirectoryError({ children, onRetry, retryLabel = "Retry" }) {
  return (
    <div role="alert" className={chrome.error}>
      <div>{children}</div>
      {onRetry ? (
        <div style={{ marginTop: 10 }}>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function DirectoryMetrics({ items = [] }) {
  const count = items.length;
  const className = `${chrome.metrics} ${count === 3 ? chrome.metricsThree : ""}`.trim();
  return (
    <section
      className={className}
      aria-label="Summary"
      style={count === 1 ? { gridTemplateColumns: "minmax(180px, 280px)" } : undefined}
    >
      {items.map((item, index) => {
        const toneKey = item.tone || DEFAULT_METRIC_TONES[index % DEFAULT_METRIC_TONES.length];
        const tone = METRIC_TONES[toneKey] || METRIC_TONES.neutral;
        const Icon = item.icon || METRIC_ICONS[toneKey] || IconClock;
        return (
          <article key={item.label} className={chrome.metricCard}>
            <span className={`${chrome.metricBar} ${tone.bar}`} aria-hidden="true" />
            <div className={chrome.metricTop}>
              <p className={chrome.metricLabel}>{item.label}</p>
              <span className={`${chrome.metricIcon} ${tone.icon}`} aria-hidden="true">
                <Icon />
              </span>
            </div>
            <p className={chrome.metricValue}>{item.value ?? "—"}</p>
            {item.hint ? <p className={chrome.metricHint}>{item.hint}</p> : null}
          </article>
        );
      })}
    </section>
  );
}

export function DirectoryDotPill({ tone = "neutral", children }) {
  const toneClass = PILL_TONES[tone] || "";
  return (
    <span className={`${chrome.dotPill} ${toneClass}`.trim()}>
      <span className={chrome.dotPillDot} aria-hidden="true" />
      <span className={chrome.dotPillLabel}>{children}</span>
    </span>
  );
}

export function DirectoryDotPills({ items = [], maxVisible = 2 }) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return <span style={{ color: "#5c6673" }}>—</span>;
  const visible = list.slice(0, maxVisible);
  const extra = list.length - visible.length;
  return (
    <div className={chrome.dotPillStack}>
      <div className={chrome.dotPills}>
        {visible.map((item, index) => (
          <DirectoryDotPill key={item.key || `${item.label}-${index}`} tone={item.tone}>
            {item.label}
          </DirectoryDotPill>
        ))}
      </div>
      {extra > 0 ? <DirectoryDotPill tone="neutral">+{extra}</DirectoryDotPill> : null}
    </div>
  );
}

export function DirectoryStatusPill({ active, activeLabel = "Active", inactiveLabel = "Inactive" }) {
  return (
    <DirectoryDotPill tone={active ? "success" : "neutral"}>
      {active ? activeLabel : inactiveLabel}
    </DirectoryDotPill>
  );
}

const META_CLAMP_CLASS = {
  1: styles.metaClamp1,
  2: styles.metaClamp2,
  3: styles.metaClamp3,
  4: styles.metaClamp4,
  5: styles.metaClamp5,
  6: styles.metaClamp6,
};

/**
 * Optional multi-line meta clamp with Show more / Show less when content overflows.
 * Opt-in via `metaClamp` (1–6). Default remains single-line ellipsis.
 */
export function DirectoryIdentity({ name, email, meta, id, onClick, title, metaClamp }) {
  const Tag = onClick ? "button" : "div";
  const lines = Number(metaClamp);
  const clampEnabled = Number.isFinite(lines) && lines >= 1 && lines <= 6;
  const [expanded, setExpanded] = useState(false);
  const [needsToggle, setNeedsToggle] = useState(false);
  const metaRef = useRef(null);
  const emailText =
    email != null && String(email).trim() !== "" && String(email).trim() !== "-"
      ? String(email).trim()
      : "";

  useLayoutEffect(() => {
    setExpanded(false);
  }, [meta]);

  useLayoutEffect(() => {
    if (!clampEnabled || !meta) return undefined;
    const el = metaRef.current;
    if (!el) return undefined;

    const measure = () => {
      if (expanded) return;
      setNeedsToggle(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [meta, clampEnabled, expanded, lines]);

  const clampClass = clampEnabled
    ? `${styles.meta} ${styles.metaClamp} ${META_CLAMP_CLASS[lines] || styles.metaClamp3} ${
        expanded ? styles.metaExpanded : ""
      }`.trim()
    : styles.meta;

  const toggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded((prev) => !prev);
  };

  return (
    <Tag
      type={onClick ? "button" : undefined}
      className={onClick ? styles.identityBtn : styles.identity}
      onClick={onClick}
      title={title}
    >
      <span className={styles.name}>{name || "—"}</span>
      {emailText ? <span className={styles.email}>{emailText}</span> : null}
      {meta ? (
        <span ref={clampEnabled ? metaRef : undefined} className={clampClass}>
          {meta}
        </span>
      ) : null}
      {clampEnabled && needsToggle ? (
        onClick ? (
          <span
            role="button"
            tabIndex={0}
            className={styles.metaToggle}
            aria-expanded={expanded}
            onClick={toggle}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") toggle(e);
            }}
          >
            {expanded ? "Show less" : "Show more"}
          </span>
        ) : (
          <button type="button" className={styles.metaToggle} onClick={toggle} aria-expanded={expanded}>
            {expanded ? "Show less" : "Show more"}
          </button>
        )
      ) : null}
      {id != null && id !== "" ? <span className={styles.id}>ID {id}</span> : null}
    </Tag>
  );
}

export function DirectoryFlagIdentity({ flag, children }) {
  return (
    <div className={styles.flagIdentity}>
      {flag}
      {children}
    </div>
  );
}

export function DirectoryMetric({ value, hint }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricValue}>{value ?? "—"}</span>
      {hint ? <span className={styles.metricHint}>{hint}</span> : null}
    </div>
  );
}

export function DirectoryMoney({ children }) {
  return <span className={styles.money}>{children}</span>;
}

export function DirectoryMeta({ children, title }) {
  return (
    <div className={styles.meta} title={title}>
      {children}
    </div>
  );
}

export function DirectoryActions({ children, className = "", ...rest }) {
  return (
    <div className={`${styles.actions} ${className}`.trim()} {...rest}>
      {children}
    </div>
  );
}

export {
  DirectoryActionIcon,
  DirectoryActionView,
  DirectoryActionEdit,
  DirectoryActionDelete,
  DirectoryActionBlock,
} from "./DirectoryActionIcon";

export function DirectoryViewFields({ fields = [] }) {
  return (
    <dl className={styles.dl}>
      {fields
        .filter((field) => field && field.label)
        .map((field) => (
          <div key={field.label} className={styles.row}>
            <dt className={styles.label}>{field.label}</dt>
            <dd className={styles.value}>{field.value ?? "—"}</dd>
          </div>
        ))}
    </dl>
  );
}

export function DirectoryViewModal({
  open,
  title,
  fields,
  onClose,
  children,
  ...rest
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      secondaryLabel="Close"
      primaryLabel="Done"
      onPrimary={onClose}
      {...rest}
    >
      {children || <DirectoryViewFields fields={fields || []} />}
    </Modal>
  );
}

export function PageLoading({ label = "Loading…" }) {
  return (
    <p role="status" style={{ color: "var(--muted)", margin: 0 }}>
      {label}
    </p>
  );
}

export function StatusToggle({ checked, onChange, label }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer", margin: 0, position: "relative" }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        aria-label={label}
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          border: 0,
        }}
      />
      <span
        aria-hidden
        style={{
          width: 40,
          height: 22,
          borderRadius: 999,
          background: checked ? "var(--accent)" : "var(--n-300)",
          position: "relative",
          flexShrink: 0,
          transition: "background var(--dur) var(--ease)",
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 20 : 2,
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: "var(--surface)",
            transition: "left var(--dur) var(--ease)",
            boxShadow: "var(--e-1)",
          }}
        />
      </span>
    </label>
  );
}

