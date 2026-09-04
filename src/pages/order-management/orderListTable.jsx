import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Modal } from "../../design-system";
import { formatDate } from "../../utilities/formatters";
import styles from "./orderList.module.css";

/** Shared blue link used by order id, shop name, and customer name. */
export const ORDER_LIST_LINK_CLASS =
  "whitespace-nowrap border-0 bg-transparent p-0 font-mono text-[13px] font-semibold text-[#2c3ba0] hover:underline";

const PLACEHOLDER_NAMES = new Set(["—", "No shop assigned"]);

export function EntityNameLink({ to, children, className = ORDER_LIST_LINK_CLASS }) {
  if (!to) {
    return (
      <div className="truncate text-[13px] font-semibold text-[#0e131c]">
        {children}
      </div>
    );
  }

  return (
    <Link
      to={to}
      className={`${className} block max-w-full truncate`}
      onClick={(event) => event.stopPropagation()}
    >
      {children}
    </Link>
  );
}

export function LabelValue({
  label,
  value,
  muted = false,
  active = false,
  tone = "pickup",
}) {
  if (!value || value === "—") {
    return (
      <div className="text-xs leading-5 text-[#8a94a2]">
        {label}: —
      </div>
    );
  }

  const accent =
    tone === "delivery"
      ? { color: "#5f47c4", bg: "#efeafe" }
      : { color: "#2a63d6", bg: "#e8effe" };

  return (
    <div
      className={`text-xs leading-5 ${muted && !active ? "text-[#8a94a2]" : "text-[#38424f]"} ${
        active ? "mt-1 rounded-md px-1.5 py-0.5 font-semibold" : ""
      }`}
      style={active ? { color: accent.color, background: accent.bg } : undefined}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: active ? accent.color : undefined }}>
        {label}
      </span>
      <span className="mx-1 text-[#8a94a2]">·</span>
      {value}
    </div>
  );
}

export function StackedCell({
  primary,
  secondary,
  title,
  emptySecondary = "No services listed",
  tags = false,
  mono = false,
}) {
  return (
    <div className="min-w-0 max-w-[280px] leading-snug" title={title}>
      {primary ? (
        <div className={`text-[13px] font-semibold text-[#0e131c] ${mono ? "font-mono tabular-nums" : ""}`}>
          {primary}
        </div>
      ) : (
        <div className="text-[13px] text-[#8a94a2]">No shop assigned</div>
      )}
      {secondary && tags ? (
        <div className="mt-1.5 flex max-w-[280px] flex-wrap gap-[5px]">
          {String(secondary)
            .split(/[,|]/)
            .map((item) => item.trim())
            .filter(Boolean)
            .map((item) => (
              <span
                key={item}
                className="whitespace-nowrap rounded-md border border-[#e6e9f0] bg-[#f4f5f8] px-2 py-px text-[11px] font-medium text-[#38424f]"
              >
                {item}
              </span>
            ))}
        </div>
      ) : secondary ? (
        <div className="mt-0.5 line-clamp-2 text-[12.5px] text-[#5c6673]">{secondary}</div>
      ) : (
        <div className="mt-0.5 text-xs text-[#8a94a2]">{emptySecondary}</div>
      )}
    </div>
  );
}

export function OrderIdLink({ id, label, navigate }) {
  return (
    <button
      type="button"
      onClick={() => navigate(`/orders/details/${id}`)}
      className={ORDER_LIST_LINK_CLASS}
    >
      #{label}
    </button>
  );
}

export function DateTimeStack({ value, title }) {
  if (!value) return "—";
  return (
    <div title={title}>
      <div className="font-mono text-[13px] font-semibold tabular-nums text-[#0e131c]">
        {formatDate(value, "DD MMM YYYY")}
      </div>
      <div className="mt-0.5 text-[12.5px] text-[#5c6673]">{formatDate(value, "HH:mm")}</div>
    </div>
  );
}

/** Name (primary) + phone muted underneath — same stack as Order placed. */
export function CustomerNamePhone({ name, phone, title, nameTo }) {
  const displayName = name || "—";
  const displayPhone = phone || "—";
  const hover =
    title ||
    [displayName, displayPhone].filter((value) => value && value !== "—").join("\n") ||
    undefined;
  const linkTo =
    nameTo && displayName && !PLACEHOLDER_NAMES.has(displayName) ? nameTo : null;
  const [contactOpen, setContactOpen] = useState(false);
  const hasPhone = Boolean(displayPhone && displayPhone !== "—");

  const { telPhone, whatsappPhone } = useMemo(() => {
    const raw = String(displayPhone || "");
    const trimmed = raw.trim();
    const tel = trimmed.replace(/[^+\d]/g, "");
    const wa = tel.replace(/\D/g, "");
    return {
      telPhone: tel,
      whatsappPhone: wa,
    };
  }, [displayPhone]);

  const handleOpenContact = () => {
    if (!hasPhone) return;
    setContactOpen(true);
  };

  const handleCall = () => {
    if (!telPhone) return;
    window.location.href = `tel:${telPhone}`;
    setContactOpen(false);
  };

  const handleWhatsApp = () => {
    if (!whatsappPhone) return;
    // wa.me opens WhatsApp app when installed, otherwise falls back to web.
    window.open(`https://wa.me/${whatsappPhone}`, "_blank", "noopener,noreferrer");
    setContactOpen(false);
  };

  return (
    <>
      <div className="min-w-0 max-w-[200px] leading-snug" title={hover}>
        <EntityNameLink to={linkTo}>{displayName}</EntityNameLink>
        {hasPhone ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              handleOpenContact();
            }}
            className="mt-0.5 truncate border-0 bg-transparent p-0 text-[14px] text-[var(--ink-2)] hover:underline"
          >
            {displayPhone}
          </button>
        ) : (
          <div className="mt-0.5 truncate text-[14px] text-[var(--ink-2)]">
            {displayPhone}
          </div>
        )}
      </div>
      <Modal
        open={contactOpen}
        title="Contact customer"
        description={displayName !== "—" ? displayName : undefined}
        onClose={() => setContactOpen(false)}
        hideFooter
      >
        <div className="space-y-3">
          <div className="rounded-lg border border-[var(--line)] bg-[var(--canvas)] p-3 text-sm text-[var(--ink-2)]">
            {displayPhone}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              onClick={handleCall}
              disabled={!telPhone}
            >
              Direct Call
            </Button>
            <Button
              variant="secondary"
              onClick={handleWhatsApp}
              disabled={!whatsappPhone}
            >
              WhatsApp
            </Button>
            <Button
              variant="ghost"
              onClick={() => setContactOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

const PILL_TONE_CLS = {
  success: styles.dotPillSuccess,
  created: styles.dotPillCreated,
  danger: styles.dotPillDanger,
  warning: styles.dotPillWarning,
  info: styles.dotPillInfo,
  teal: styles.dotPillTeal,
  neutral: styles.dotPill,
};

const REASON_PILL_TONE = {
  payment_failed: "danger",
  on_hold: "danger",
  needs_assignment: "warning",
  overdue_pickup: "warning",
  pickup_reschedule: "info",
  overdue_delivery: "warning",
  delivery_failed: "danger",
};

/** Shared status / hold / why-needed pill: leading dot, 13px, rounded-full. */
export function DotPill({
  label,
  tone = "neutral",
  title,
  as: Tag = "span",
  onClick,
  className = "",
}) {
  const toneCls = tone !== "neutral" ? PILL_TONE_CLS[tone] : "";

  return (
    <Tag
      type={Tag === "button" ? "button" : undefined}
      onClick={onClick}
      title={title}
      className={`${styles.dotPill} ${toneCls || ""} ${className}`.trim()}
    >
      <span className={styles.dotPillDot} aria-hidden />
      <span className={styles.dotPillLabel}>{label || "—"}</span>
    </Tag>
  );
}

/** Cap at 2 + “+N”; stacked so each reason gets a full line. */
export function ReasonPills({ keys = [], labels = [] }) {
  const items = (keys || []).map((key, index) => ({
    key: String(key),
    label: labels[index] || key,
  }));
  const visible = items.slice(0, 2);
  const extra = items.length - visible.length;
  const full = items.map((item) => item.label).join(", ");

  if (!items.length) {
    return <span className="text-[13px] text-[#8a94a2]">—</span>;
  }

  return (
    <div className={styles.dotPills} title={full}>
      {visible.map((item) => (
        <DotPill
          key={item.key}
          label={item.label}
          tone={REASON_PILL_TONE[item.key] || "neutral"}
          title={item.label}
        />
      ))}
      {extra > 0 ? <DotPill label={`+${extra}`} tone="neutral" /> : null}
    </div>
  );
}

export function ServicePills({ names = [], shopName }) {
  const list = (Array.isArray(names) ? names : String(names || "").split(/[,|]/))
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  const visible = list.slice(0, 2);
  const extra = list.length - visible.length;
  const full = [shopName, list.join(", ")].filter(Boolean).join("\n");

  if (!list.length) {
    return <div className="mt-0.5 text-xs text-[#8a94a2]">No services listed</div>;
  }

  return (
    <div className="mt-1.5 flex max-w-[280px] flex-wrap items-center gap-1" title={full}>
      {visible.map((item) => (
        <span
          key={item}
          className="max-w-full truncate whitespace-nowrap rounded-md border border-[#e6e9f0] bg-[#f4f5f8] px-2 py-px text-[11px] font-medium text-[#38424f]"
        >
          {item}
        </span>
      ))}
      {extra > 0 ? (
        <span className="shrink-0 whitespace-nowrap rounded-md border border-[#e6e9f0] bg-[#eef1f6] px-2 py-px text-[11px] font-semibold text-[#5c6673]">
          +{extra}
        </span>
      ) : null}
    </div>
  );
}

export function ItemsBadge({ count }) {
  return (
    <span className="inline-grid h-[26px] min-w-[30px] place-items-center rounded-lg bg-[#eef1f6] px-2 text-[12.5px] font-semibold tabular-nums text-[#38424f]">
      {count ?? "—"}
    </span>
  );
}

function compactSlot(raw, timeFrom) {
  if (raw == null || raw === "" || raw === "—") return "—";
  const datePart = formatDate(raw, "DD MMM");
  if (datePart === "—") return String(raw);
  // Prefer the dedicated TIME slot. Never invent HH:mm from a date-only value
  // (midnight UTC → local "05:00" in PK, which made every row look identical).
  if (timeFrom) {
    const hm = String(timeFrom).trim().slice(0, 5);
    return hm ? `${datePart} · ${hm}` : datePart;
  }
  return datePart;
}

export function PickupDropCell({ pickup, drop, pickupTime, dropTime, title }) {
  return (
    <div className="flex flex-col gap-2" title={title}>
      <div className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-[#38424f]">
        <span className="rounded-[5px] bg-[#e8effe] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[#2a63d6]">
          Pick
        </span>
        <span className="font-mono">{compactSlot(pickup, pickupTime)}</span>
      </div>
      <div className="flex items-center gap-2 whitespace-nowrap text-[12.5px] text-[#38424f]">
        <span className="rounded-[5px] bg-[#efeafe] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[#5f47c4]">
          Drop
        </span>
        <span className="font-mono">{compactSlot(drop, dropTime)}</span>
      </div>
    </div>
  );
}

const STATUS_PILLS = [
  { test: /deliver/, tone: "teal" },
  { test: /complete/, tone: "success" },
  { test: /cancel|fail|hold/, tone: "danger" },
  { test: /process|pending|waiting|invoice|facility/, tone: "warning" },
  { test: /new|created|confirm/, tone: "created" },
];

export function StatusDotPill({ title, extra }) {
  const value = String(title || "").toLowerCase();
  const match = STATUS_PILLS.find((item) => item.test.test(value));
  return (
    <div className={styles.dotPillStack}>
      <DotPill label={title || "—"} tone={match?.tone || "neutral"} title={title} />
      {extra}
    </div>
  );
}

