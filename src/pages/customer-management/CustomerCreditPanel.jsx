import { useState } from "react";
import { Badge, Button, Field, Input, Modal, Textarea } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { formatDate } from "../../utilities/formatters";
import { useGetCustomerCreditQuery, useAdjustCustomerCreditMutation } from "../../store/services/api";

const PANEL = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const TYPE = {
  EARN: { label: "Cashback", tone: "success" },
  RESTORE: { label: "Returned (refund)", tone: "success" },
  ADJUST: { label: "Adjustment", tone: "brand" },
  SPEND: { label: "Used on order", tone: "neutral" },
  REVERSE: { label: "Cashback taken back", tone: "danger" },
  EXPIRE: { label: "Expired", tone: "neutral" },
};

const money = (n) => `${Number(n) < 0 ? "−" : ""}£${Math.abs(Number(n || 0)).toFixed(2)}`;

/**
 * Customer credit (cashback): balance, what is held on unpaid orders, history, and a
 * reasoned manual adjustment (platform admins only — the API refuses zone staff).
 */
export default function CustomerCreditPanel({ customerId }) {
  const { error: showError, success } = useToaster();
  const [page, setPage] = useState(1);
  const { data, isFetching, isError } = useGetCustomerCreditQuery({ customerId, page }, { skip: !customerId });
  const [adjustCredit, { isLoading: saving }] = useAdjustCustomerCreditMutation();
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [requestId, setRequestId] = useState("");
  const credit = data?.data;

  const startAdjust = (dir) => {
    setDirection(dir);
    setAmount("");
    setReason("");
    // One id per opened form: a double click or retry is applied once.
    setRequestId(`${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    setOpen(true);
  };

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0 && reason.trim().length > 0;

  const save = async () => {
    try {
      await adjustCredit({
        customerId,
        amount: direction === "add" ? value : -value,
        reason: reason.trim(),
        requestId,
      }).unwrap();
      success(direction === "add" ? "Credit added" : "Credit removed");
      setOpen(false);
    } catch (err) {
      showError(getApiErrorMessage(err, "Could not change the credit"));
    }
  };

  if (isError) return <div style={PANEL}><p style={{ margin: 0, color: "#b42318" }}>Could not load credit.</p></div>;
  if (!credit) return <div style={PANEL}><p style={{ margin: 0 }}>{isFetching ? "Loading…" : ""}</p></div>;

  const entries = credit.history?.entries || [];
  const total = credit.history?.total || 0;
  const pages = Math.max(1, Math.ceil(total / (credit.history?.limit || 20)));

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={PANEL}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)", textTransform: "uppercase", letterSpacing: 0.4, fontWeight: 700 }}>Credit balance</p>
            <p style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 800 }}>{money(credit.balance)}</p>
            <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2)" }}>
              {credit.held > 0 ? `${money(credit.held)} held on unpaid orders · ` : ""}
              {credit.expiringSoon
                ? `${money(credit.expiringSoon.amount)} expires ${formatDate(credit.expiringSoon.expiresAt)}`
                : credit.expiryDays
                  ? `Credit expires ${credit.expiryDays} days after it is earned`
                  : "Credit does not expire"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={() => startAdjust("remove")} disabled={!(credit.balance > 0)}>
              Remove credit
            </Button>
            <Button size="sm" onClick={() => startAdjust("add")}>Add credit</Button>
          </div>
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 12, color: "var(--ink-2)" }}>
          Cashback is added after delivery and used automatically on the customer's next invoice.
        </p>
      </div>

      <div style={PANEL}>
        <h2 style={{ margin: "0 0 12px", fontSize: 16, fontWeight: 700 }}>History</h2>
        {entries.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ink-2)" }}>No credit yet.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-2)", fontSize: 12 }}>
                  <th style={{ padding: "6px 8px" }}>Date</th>
                  <th style={{ padding: "6px 8px" }}>Type</th>
                  <th style={{ padding: "6px 8px" }}>Details</th>
                  <th style={{ padding: "6px 8px", textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => {
                  const t = TYPE[e.type] || { label: e.type, tone: "neutral" };
                  return (
                    <tr key={e.id} style={{ borderTop: "1px solid #eef0f4" }}>
                      <td style={{ padding: "8px", whiteSpace: "nowrap" }}>{formatDate(e.createdAt)}</td>
                      <td style={{ padding: "8px" }}>
                        <Badge tone={t.tone}>{e.type === "SPEND" && e.status === "HELD" ? "Held for order" : t.label}</Badge>
                      </td>
                      <td style={{ padding: "8px", color: "var(--ink-2)" }}>
                        {e.description || "—"}
                        {e.reason ? ` · ${e.reason}` : ""}
                        {e.remainingAmount != null && e.remainingAmount !== e.amount && e.amount > 0 ? ` · ${money(e.remainingAmount)} left` : ""}
                      </td>
                      <td style={{ padding: "8px", textAlign: "right", fontWeight: 600, color: e.amount < 0 ? "#b42318" : "#067647", whiteSpace: "nowrap" }}>
                        {e.amount > 0 ? "+" : ""}{money(e.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 12 }}>
            <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
            <span style={{ alignSelf: "center", fontSize: 13 }}>{page} / {pages}</span>
            <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={direction === "add" ? "Add credit" : "Remove credit"}
        primaryLabel={saving ? "Saving…" : direction === "add" ? "Add credit" : "Remove credit"}
        onPrimary={save}
        primaryDisabled={!valid || saving}
        danger={direction === "remove"}
        closeOnBackdrop={false}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <Field label="Amount (£)" hint={direction === "remove" ? `Up to ${money(credit.balance)}` : "Up to £1,000"}>
            <Input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 5.00" />
          </Field>
          <Field label="Reason (saved with the change)">
            <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Goodwill for late delivery" />
          </Field>
          {direction === "add" && credit.expiryDays ? (
            <p style={{ margin: 0, fontSize: 12, color: "var(--ink-2)" }}>Added credit expires in {credit.expiryDays} days.</p>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
