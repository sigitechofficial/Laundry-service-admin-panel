import { Badge } from "../../../design-system";
import { NONE, card, heading } from "./registrationFormat";

const rowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(120px, 38%) minmax(0, 1fr)",
  gap: 12,
  padding: "8px 0",
  borderTop: "1px solid var(--line-soft, #F1F5F9)",
  fontSize: 14,
};
export function Section({ title, right, children, style }) {
  return (
    <section style={{ ...card, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <h3 style={heading}>{title}</h3>
        {right}
      </div>
      {children}
    </section>
  );
}

export function Row({ label, value, mono, columns }) {
  const empty = value == null || value === "";
  return (
    <div style={{ ...rowStyle, ...(columns ? { gridTemplateColumns: columns } : null) }}>
      <span style={{ color: "var(--muted, #64748B)" }}>{label}</span>
      <span
        style={{
          color: empty ? "var(--muted-2, #94A3B8)" : "var(--ink, #0F172A)",
          fontWeight: empty ? 400 : 500,
          wordBreak: "break-word",
          fontFamily: mono ? "var(--font-mono, monospace)" : undefined,
        }}
      >
        {empty ? NONE : value}
      </span>
    </div>
  );
}

export function Empty({ children = NONE }) {
  return <p style={{ margin: 0, color: "var(--muted-2, #94A3B8)", fontSize: 14 }}>{children}</p>;
}

export function ToneBadge({ map, value }) {
  const m = map[value];
  return m ? <Badge tone={m.tone}>{m.label}</Badge> : <Badge>{NONE}</Badge>;
}

export function Stars({ value }) {
  const n = Number(value) || 0;
  if (!n) return <span style={{ color: "var(--muted-2, #94A3B8)", fontSize: 13 }}>No rating</span>;
  return (
    <span aria-label={`${n} out of 5`} style={{ color: "#F59E0B", letterSpacing: 1, fontSize: 15 }}>
      {"★".repeat(n)}
      <span style={{ color: "#E2E8F0" }}>{"★".repeat(5 - n)}</span>
    </span>
  );
}
