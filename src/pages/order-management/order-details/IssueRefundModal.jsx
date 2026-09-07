import { useEffect, useMemo, useState } from "react";
import { Button, Field, Input, Modal, Select } from "../../../design-system";
import {
  useIssueBookingRefundMutation,
  useLazyGetRefundPreviewQuery,
  useListBookingRefundsQuery,
} from "../../../store/services/api";
import { formatMoney } from "../../../utilities/formatters";
import useToaster from "../../../components/ui/Toaster";

function money(n, symbol = "£") {
  return formatMoney(n, symbol);
}

function Row({ label, value, hint, strong }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "flex-start",
        padding: "6px 0",
        borderBottom: "1px solid #eef1f6",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: strong ? 700 : 500,
            color: "#1f2937",
          }}
        >
          {label}
        </div>
        {hint ? (
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{hint}</div>
        ) : null}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: strong ? 700 : 600,
          color: "#111827",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div
      style={{
        border: "1px solid #e6e9f0",
        borderRadius: 12,
        padding: 12,
        background: "#fafbfc",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#64748b",
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

/**
 * Enterprise Issue Refund modal with live preview breakdown.
 */
export default function IssueRefundModal({
  open,
  onClose,
  bookingId,
  currencySymbol = "£",
  onSuccess,
}) {
  const { success, error: toastError } = useToaster();
  const [mode, setMode] = useState("full");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");

  const [fetchPreview, { isFetching: previewLoading }] =
    useLazyGetRefundPreviewQuery();
  const [issueRefund, { isLoading: issuing }] = useIssueBookingRefundMutation();
  const { data: refundsResponse, refetch: refetchRefunds } =
    useListBookingRefundsQuery(bookingId, { skip: !open || !bookingId });

  const priorRefunds =
    refundsResponse?.data?.refunds ||
    refundsResponse?.refunds ||
    refundsResponse?.data ||
    [];

  const loadPreview = async (nextAmount) => {
    if (!bookingId) return;
    setPreviewError("");
    try {
      const args =
        nextAmount != null && nextAmount !== ""
          ? { bookingId, amount: nextAmount }
          : { bookingId };
      const res = await fetchPreview(args).unwrap();
      const data = res?.data ?? res;
      setPreview(data);
      if (data?.refundableNow != null && mode === "full") {
        setAmount(String(data.refundableNow));
      }
    } catch (err) {
      const msg =
        err?.data?.message || err?.error || err?.message || "Could not load refund preview";
      setPreviewError(String(msg));
      setPreview(null);
    }
  };

  useEffect(() => {
    if (!open || !bookingId) return;
    setMode("full");
    setReason("");
    setNote("");
    setAmount("");
    loadPreview();
    refetchRefunds();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, bookingId]);

  useEffect(() => {
    if (!open || !preview) return;
    if (mode === "full") {
      setAmount(String(preview.refundableNow ?? ""));
      loadPreview(preview.refundableNow);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const impact = preview?.impact;
  const economics = preview?.economics;
  const settlement = impact?.settlement;

  const canSubmit = useMemo(() => {
    if (!preview?.eligible) return false;
    if (!reason.trim()) return false;
    const n = Number(amount);
    return Number.isFinite(n) && n > 0 && n <= Number(preview.refundableNow) + 0.009;
  }, [preview, reason, amount]);

  const handleAmountBlur = () => {
    if (mode === "partial" && amount !== "") {
      loadPreview(amount);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      const body = {
        mode,
        amount: Number(amount),
        reason: reason.trim(),
        note: note.trim() || undefined,
        idempotencyKey: `admin-ui-${bookingId}-${Date.now()}`,
      };
      const res = await issueRefund({ bookingId, body }).unwrap();
      success(res?.message || "Refund issued");
      onSuccess?.(res);
      onClose?.();
    } catch (err) {
      toastError(
        String(
          err?.data?.message || err?.error || err?.message || "Refund failed"
        )
      );
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Issue refund"
      size="xl"
      primaryLabel={issuing ? "Refunding…" : "Confirm refund"}
      onPrimary={handleSubmit}
      primaryDisabled={!canSubmit || issuing || previewLoading}
      secondaryDisabled={issuing}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {previewError ? (
          <p style={{ margin: 0, color: "var(--danger)" }}>{previewError}</p>
        ) : null}

        {previewLoading && !preview ? (
          <p style={{ margin: 0, color: "var(--muted)" }}>Loading refund breakdown…</p>
        ) : null}

        {preview ? (
          <>
            {!preview.eligible ? (
              <p style={{ margin: 0, color: "var(--danger)" }}>
                {preview.eligibilityMessage || "Refund not available"}
              </p>
            ) : null}

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: 12,
              }}
            >
              <Section title="Refundable now">
                <Row
                  label="Available to refund"
                  value={money(preview.refundableNow, currencySymbol)}
                  strong
                />
                <Row
                  label="Already refunded"
                  value={money(preview.alreadyRefunded, currencySymbol)}
                />
                <Row
                  label="Payment channel"
                  value={String(preview.paymentChannel || "—").toUpperCase()}
                />
              </Section>

              <Section title="Order economics">
                <Row
                  label="Order total"
                  value={money(economics?.orderTotal, currencySymbol)}
                />
                <Row
                  label="Service fee"
                  value={money(economics?.serviceFee, currencySymbol)}
                  hint="Not in agent commission. Goes back to the customer if this refund covers the Stripe charge."
                />
                <Row
                  label="Booking tip → agent 100%"
                  value={money(economics?.bookingTip, currencySymbol)}
                />
                <Row
                  label="Extra tip → agent 100%"
                  value={money(economics?.extraTip, currencySymbol)}
                />
                <Row
                  label="Agent earning (net now)"
                  value={money(economics?.agentEarningNetNow, currencySymbol)}
                  hint={`Original ${money(economics?.agentEarningOriginal, currencySymbol)}`}
                  strong
                />
                <Row
                  label="Platform laundry share"
                  value={money(economics?.platformShareOriginal, currencySymbol)}
                />
              </Section>
            </div>

            <Section title="Charge buckets (Stripe / cash)">
              {(preview.charges || []).length === 0 &&
              !(preview.cash?.refundable > 0) ? (
                <p style={{ margin: 0, fontSize: 13, color: "#6b7280" }}>
                  No charge buckets found.
                </p>
              ) : (
                <>
                  {(preview.charges || []).map((c) => (
                    <Row
                      key={c.key}
                      label={c.label}
                      hint={`${c.kind} · ${c.status || "—"} · PI ${c.paymentIntentId || "—"}`}
                      value={`Refundable ${money(c.refundable, currencySymbol)}`}
                    />
                  ))}
                  {preview.cash?.refundable > 0 ? (
                    <Row
                      label="Cash collected"
                      hint={preview.cash.note}
                      value={`Refundable ${money(preview.cash.refundable, currencySymbol)}`}
                    />
                  ) : null}
                </>
              )}
            </Section>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              <Field label="Refund type">
                <Select
                  aria-label="Refund type"
                  value={mode}
                  onChange={(value) => setMode(value)}
                  options={[
                    { value: "full", label: "Full remaining" },
                    { value: "partial", label: "Partial amount" },
                  ]}
                />
              </Field>
              <Field label="Amount" htmlFor="refund-amount">
                <Input
                  id="refund-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  disabled={mode === "full"}
                  onChange={(e) => setAmount(e.target.value)}
                  onBlur={handleAmountBlur}
                />
              </Field>
            </div>

            <Field label="Reason*" htmlFor="refund-reason">
              <Input
                id="refund-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Damaged garment / customer goodwill"
              />
            </Field>
            <Field label="Internal note" htmlFor="refund-note">
              <Input
                id="refund-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional ops note"
              />
            </Field>

            {impact ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 12,
                }}
              >
                <Section title="Customer receives">
                  <Row
                    label="Card via Stripe"
                    value={money(impact.customerReceives?.cardViaStripe, currencySymbol)}
                    hint="Returns to the original card/bank"
                  />
                  <Row
                    label="Cash (manual)"
                    value={money(impact.customerReceives?.cashManual, currencySymbol)}
                    hint="Staff must hand cash back — Stripe not used"
                  />
                  <Row
                    label="Total"
                    value={money(impact.customerReceives?.total, currencySymbol)}
                    strong
                  />
                  <Row
                    label="Refund share of order"
                    value={`${preview.refundSharePercent || 0}%`}
                  />
                </Section>

                <Section title="Agent earnings impact">
                  <Row
                    label="Commission clawback"
                    value={`−${money(impact.agent?.commissionClawback, currencySymbol)}`}
                    hint={`${impact.agent?.commissionClawbackPercentOfNet || 0}% of net commission`}
                    strong
                  />
                  <Row
                    label="Remaining commission"
                    value={money(impact.agent?.remainingCommission, currencySymbol)}
                  />
                  <Row
                    label="Extra tip clawback"
                    value={`−${money(impact.agent?.extraTipClawback, currencySymbol)}`}
                  />
                  <Row
                    label="Cash collected reversal"
                    value={`−${money(impact.agent?.cashCollectedReversal, currencySymbol)}`}
                    hint="Reduces cash due"
                  />
                </Section>

                <Section title="Platform / settlement">
                  <Row
                    label="Platform share clawback"
                    value={`−${money(impact.platform?.platformShareClawback, currencySymbol)}`}
                  />
                  <Row
                    label="Service fee"
                    value={money(impact.platform?.serviceFeeUnchanged, currencySymbol)}
                    hint="Unchanged — platform keeps"
                  />
                  <Row
                    label="Stripe outflow"
                    value={money(impact.platform?.stripeOutflow, currencySymbol)}
                  />
                  {settlement?.before ? (
                    <>
                      <Row
                        label="Cash due (now)"
                        value={money(settlement.before.cashDueToPlatform, currencySymbol)}
                      />
                      <Row
                        label="Platform owes agent (now)"
                        value={money(settlement.before.platformOwesAgent, currencySymbol)}
                      />
                      <Row
                        label="Projected cash-due delta"
                        value={money(
                          settlement.projectedDelta?.cashDueToPlatform,
                          currencySymbol
                        )}
                      />
                      <Row
                        label="Projected payable delta"
                        value={money(
                          settlement.projectedDelta?.platformOwesAgent,
                          currencySymbol
                        )}
                      />
                    </>
                  ) : null}
                </Section>
              </div>
            ) : null}

            {(preview.allocations || []).length > 0 ? (
              <Section title="This refund will allocate">
                {preview.allocations.map((a) => (
                  <Row
                    key={`${a.key}-${a.allocate}`}
                    label={a.label}
                    hint={a.channel === "card" ? a.paymentIntentId : "Manual cash"}
                    value={money(a.allocate, currencySymbol)}
                  />
                ))}
              </Section>
            ) : null}

            {Array.isArray(priorRefunds) && priorRefunds.length > 0 ? (
              <Section title="Prior refunds on this order">
                {priorRefunds.map((r) => (
                  <Row
                    key={r.id}
                    label={`#${r.id} · ${r.mode} · ${r.channel}`}
                    hint={r.reason}
                    value={money(r.amount, currencySymbol)}
                  />
                ))}
              </Section>
            ) : null}
          </>
        ) : null}

        <p style={{ margin: 0, fontSize: 12, color: "#6b7280" }}>
          Card refunds go back through Stripe to the customer’s card. Cash refunds are
          recorded here only — return cash to the customer in person. Agent commission and
          cash settlement are adjusted by the same refund share so earnings stay accurate.
        </p>
      </div>
    </Modal>
  );
}
