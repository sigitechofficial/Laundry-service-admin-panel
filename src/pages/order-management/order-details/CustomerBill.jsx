/**
 * The customer's bill as the server built it (paymentSummary.bill): laundry to
 * "Left to pay", with a note when a discount came out smaller than the offer.
 * Same lines and wording as the customer and agent apps.
 */
const money = (sym, n) => `${sym}${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

export default function CustomerBill({ bill }) {
  if (!bill || !Array.isArray(bill.lines) || !bill.lines.length) return null;
  const sym = bill.currencySymbol || "£";
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", background: "#fff" }}>
      <p style={{ margin: "0 0 6px", fontSize: 12, fontWeight: 600, letterSpacing: 0.4, textTransform: "uppercase", color: "#64748B" }}>
        Customer bill
      </p>
      {bill.lines.map((l) => (
        <div
          key={l.key}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            padding: "5px 0",
            fontSize: 13.5,
            fontWeight: l.strong ? 700 : 400,
            color: "#0F172A",
            borderTop: l.strong ? "1px solid #F1F5F9" : "none",
          }}
        >
          <span>{l.label}</span>
          <span style={{ color: l.sign === "-" ? "#15803D" : "#0F172A", whiteSpace: "nowrap" }}>
            {l.sign === "-" ? "−" : l.sign === "+" ? "+" : ""}
            {money(sym, l.amount)}
          </span>
        </div>
      ))}
      <p
        style={{
          margin: "8px 0 0",
          fontSize: 13,
          fontWeight: 600,
          color: bill.nothingToPay ? "#15803D" : "#B45309",
        }}
      >
        {bill.status}
      </p>
      {bill.note ? (
        <p
          style={{
            margin: "8px 0 0",
            fontSize: 12.5,
            lineHeight: 1.45,
            color: "#1E3A8A",
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          {bill.note}
        </p>
      ) : null}
    </div>
  );
}
