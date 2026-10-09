/**
 * Shared pieces for the money-moving settlement modals (Cash Settlement list
 * and the shop settlement detail page), so both screens explain an action the
 * same way: who it is for, the live figure, the amount, and what is left after.
 */

/** Wraps a control so its tooltip still shows while the control is disabled. */
export function DisabledReason({ reason, children }) {
  if (!reason) return children;
  return (
    <span title={reason} style={{ display: "inline-flex" }}>
      {children}
    </span>
  );
}

/** Label / value lines at the top of a money modal. */
export function SettlementFigures({ rows }) {
  const visible = (rows || []).filter(Boolean);
  if (!visible.length) return null;
  return (
    <div
      style={{
        border: "1px solid #e6e9f0",
        borderRadius: 12,
        background: "#f8fafc",
        padding: "6px 12px",
      }}
    >
      {visible.map((row, index) => (
        <div
          key={row.label}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            padding: "7px 0",
            borderTop: index === 0 ? "none" : "1px solid #eef1f5",
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: row.strong ? 700 : 500, color: "#1f2937" }}>
              {row.label}
            </div>
            {row.hint ? (
              <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2, lineHeight: 1.4 }}>
                {row.hint}
              </div>
            ) : null}
          </div>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: row.strong ? 800 : 600,
              color: row.tone === "warning" ? "#92400e" : row.tone === "success" ? "#065f46" : "#111827",
              whiteSpace: "nowrap",
              fontVariantNumeric: "tabular-nums",
              textAlign: "right",
            }}
          >
            {row.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Second confirmation for actions that send real money to Stripe Connect. */
export function RealMoneyCheck({ id, checked, onChange, disabled }) {
  return (
    <label
      htmlFor={id}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        fontSize: 13,
        color: "#78350f",
        cursor: disabled ? "default" : "pointer",
        lineHeight: 1.45,
      }}
    >
      <input
        id={id}
        type="checkbox"
        checked={Boolean(checked)}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        style={{ marginTop: 2 }}
      />
      <span>
        <strong>I understand this sends real money now.</strong> The Stripe Connect transfer
        starts as soon as I press the button and cannot be undone from here.
      </span>
    </label>
  );
}

/** Notice shown instead of an amount field when the cash due is already submitted. */
export function AlreadySubmittedNotice({ children }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 12,
        border: "1px solid #bfdbfe",
        background: "#eff6ff",
        fontSize: 13,
        color: "#1e3a8a",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

/** Agent note / admin note / reviewed lines for a remittance row. */
export function RemittanceNotes({ row, formatReviewed }) {
  const agentNote = row?.note || null;
  const adminNote = row?.adminNote || null;
  const fallback = !agentNote && !adminNote ? row?.description || null : null;
  return (
    <div style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, minWidth: 0 }}>
      {agentNote ? (
        <div>
          <span style={{ color: "#6b7280" }}>Agent note: </span>
          {agentNote}
        </div>
      ) : null}
      {adminNote ? (
        <div>
          <span style={{ color: "#6b7280" }}>Admin note: </span>
          {adminNote}
        </div>
      ) : null}
      {fallback ? <div>{fallback}</div> : null}
      {!agentNote && !adminNote && !fallback ? <div>—</div> : null}
      {row?.reviewedAt ? (
        <div style={{ color: "#6b7280" }}>Reviewed {formatReviewed(row.reviewedAt)}</div>
      ) : null}
    </div>
  );
}
