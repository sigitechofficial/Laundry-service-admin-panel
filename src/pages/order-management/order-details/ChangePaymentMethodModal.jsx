import { useEffect, useMemo, useState } from "react";
import { Button, Field, Modal, Select } from "../../../design-system";
import { Textarea } from "../../../design-system";
import { useChangeOrderPaymentMethodMutation } from "../../../store/services/api";
import { formatMoney } from "../../../utilities/formatters";
import useToaster from "../../../components/ui/Toaster";

function money(n, symbol = "£") {
  return formatMoney(n, symbol);
}

/** Stable reason codes so reporting can group changes (label shown to admin). */
const REASON_OPTIONS = [
  { value: "customer_requested_cash", label: "Customer asked to pay in cash" },
  { value: "customer_requested_card", label: "Customer asked to pay by card" },
  { value: "card_declined", label: "Card declined / payment failed" },
  { value: "no_card_on_file", label: "No usable card on file" },
  { value: "agent_request", label: "Shop / agent requested the change" },
  { value: "admin_correction", label: "Admin correction" },
  { value: "other", label: "Other (add a note)" },
];

function Row({ label, value, strong, tone }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        alignItems: "baseline",
        padding: "7px 0",
        borderBottom: "1px solid #eef1f6",
      }}
    >
      <div style={{ fontSize: 13, fontWeight: strong ? 700 : 500, color: "#374151" }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: strong ? 700 : 600,
          color: tone === "danger" ? "#b91c1c" : tone === "ok" ? "#047857" : "#111827",
          whiteSpace: "nowrap",
        }}
      >
        {value}
      </div>
    </div>
  );
}

/**
 * Convert how an order's outstanding balance is collected (card <-> cash),
 * with a required reason. Only touches balancePaymentMethod on the backend, so
 * it never re-prices a settled order.
 */
export default function ChangePaymentMethodModal({
  open,
  onClose,
  bookingId,
  currentMethod, // effective current balance method: "cash" | "card"
  bookedType, // original paymentType: "cash" | "card"
  amountDueNow,
  currencySymbol = "£",
  onSuccess,
}) {
  const { success, error: toastError } = useToaster();
  const [reasonCode, setReasonCode] = useState("");
  const [note, setNote] = useState("");
  const [changeMethod, { isLoading }] = useChangeOrderPaymentMethodMutation();

  const normalizedCurrent = String(currentMethod || bookedType || "card").toLowerCase();
  const target = normalizedCurrent === "cash" ? "card" : "cash";
  const isCashBooking = String(bookedType || "").toLowerCase() === "cash";

  // A pure cash booking has no card on file, so it can never be switched to card.
  const blocked = isCashBooking && target === "card";

  useEffect(() => {
    if (open) {
      setReasonCode("");
      setNote("");
    }
  }, [open, bookingId]);

  const reasonLabel = useMemo(
    () => REASON_OPTIONS.find((r) => r.value === reasonCode)?.label || "",
    [reasonCode]
  );

  const canSubmit =
    !blocked && Boolean(reasonCode) && (reasonCode !== "other" || note.trim().length > 0);

  const handleSubmit = async () => {
    if (!bookingId || !canSubmit) return;
    try {
      const res = await changeMethod({
        bookingId,
        body: {
          method: target,
          reasonCode,
          reason: reasonLabel,
          note: note.trim() || undefined,
        },
      }).unwrap();
      success(res?.message || "Payment method updated");
      onSuccess?.(res);
      onClose?.();
    } catch (err) {
      toastError(
        err?.data?.message || err?.error || err?.message || "Could not change payment method"
      );
    }
  };

  const targetLabel = target === "cash" ? "Cash (collect at delivery)" : "Card (auto-charge)";
  const currentLabel = normalizedCurrent === "cash" ? "Cash" : "Card";

  return (
    <Modal
      open={open}
      title="Change payment method"
      description={`Convert how the balance on this order is collected · ${currentLabel} → ${target === "cash" ? "Cash" : "Card"}`}
      onClose={onClose}
      size="md"
      primaryLabel={isLoading ? "Updating…" : `Switch to ${target === "cash" ? "cash" : "card"}`}
      onPrimary={handleSubmit}
      primaryDisabled={!canSubmit || isLoading}
      secondaryDisabled={isLoading}
    >
      <div style={{ display: "grid", gap: 14 }}>
        {blocked ? (
          <div
            style={{
              padding: 12,
              borderRadius: 10,
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              fontSize: 13,
            }}
          >
            This order was booked as <strong>cash</strong> — there is no card on file, so it
            cannot be switched to card. Collect the balance in cash at delivery.
          </div>
        ) : (
          <div
            style={{
              border: "1px solid #e6e9f0",
              borderRadius: 12,
              padding: "6px 12px 10px",
              background: "#fafbfc",
            }}
          >
            <Row label="Current method" value={currentLabel} />
            <Row label="New method" value={targetLabel} strong tone="ok" />
            <Row
              label="Balance to collect"
              value={amountDueNow != null ? money(amountDueNow, currencySymbol) : "—"}
              strong
            />
            <div style={{ fontSize: 12, color: "#6b7280", paddingTop: 8 }}>
              {target === "cash"
                ? "The 2-hour card auto-charge is cancelled and the agent is told to collect this amount in cash at delivery."
                : "The card auto-charge is re-armed so the customer's card is charged for the balance."}
            </div>
          </div>
        )}

        <Field label="Reason" htmlFor="pm-reason">
          <Select
            id="pm-reason"
            aria-label="Reason"
            value={reasonCode}
            onChange={(v) => setReasonCode(v?.target?.value ?? v)}
            options={REASON_OPTIONS}
            placeholder="Select a reason"
            disabled={blocked}
          />
        </Field>
        <Field
          label={reasonCode === "other" ? "Note (required)" : "Note (optional)"}
          htmlFor="pm-note"
        >
          <Textarea
            id="pm-note"
            rows={3}
            placeholder="Why is this being changed? (shown in the order's activity trail)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={blocked}
          />
        </Field>
      </div>
    </Modal>
  );
}
