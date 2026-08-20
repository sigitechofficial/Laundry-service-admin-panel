import { Badge, Button, Field, Select } from "../design-system";

export function Notice({ tone = "info", children }) {
  const tones = {
    info: { background: "var(--info-bg)", color: "var(--info)" },
    warning: { background: "var(--warning-bg)", color: "var(--warning-700)" },
    danger: { background: "var(--danger-bg)", color: "var(--danger-700)" },
    success: { background: "var(--success-bg)", color: "var(--success-700)" },
  };
  return (
    <div
      style={{
        ...tones[tone],
        padding: "12px 14px",
        borderRadius: "var(--r-md)",
        fontSize: 14.5,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

export function Toggle({ checked, onChange, label, disabled }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        userSelect: "none",
        margin: 0,
        position: "relative",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={onChange}
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
            background: "#fff",
            transition: "left var(--dur) var(--ease)",
            boxShadow: "var(--e-1)",
          }}
        />
      </span>
      {label}
    </label>
  );
}

export function CheckRow({ checked, onChange, label, disabled }) {
  return (
    <label
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        margin: 0,
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={onChange}
      />
      <span>{label}</span>
    </label>
  );
}

export function TabBar({ value, onChange, tabs }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        borderBottom: "1px solid var(--line)",
        paddingBottom: 8,
      }}
    >
      {tabs.map((tab) => (
        <Button
          key={tab.value}
          variant={String(value) === String(tab.value) ? "primary" : "ghost"}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}

export function PaginationBar({
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  pageSizes = [
    { value: 10, label: "10" },
    { value: 20, label: "20" },
    { value: 50, label: "50" },
  ],
}) {
  const totalPages = Math.max(1, Math.ceil((total || 0) / (limit || 10)) || 1);
  const startIndex = !total ? 0 : (page - 1) * limit + 1;
  const endIndex = Math.min(page * limit, total || 0);
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span className="jd-field__hint">
        {startIndex} - {endIndex} of {total || 0}
      </span>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Button
          size="sm"
          variant="secondary"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Previous
        </Button>
        <span className="jd-field__hint">
          Page {page} of {totalPages}
        </span>
        <Button
          size="sm"
          variant="secondary"
          disabled={page >= totalPages || !total}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
      {onLimitChange ? (
        <Field label="Results per page">
          <div style={{ minWidth: 100 }}>
            <Select
              aria-label="Results per page"
              value={limit}
              onChange={(value) => onLimitChange(Number(value))}
              options={pageSizes}
            />
          </div>
        </Field>
      ) : null}
    </div>
  );
}

export function StatusBadge({ active, onLabel = "Active", offLabel = "Inactive" }) {
  return <Badge tone={active ? "success" : "neutral"}>{active ? onLabel : offLabel}</Badge>;
}
