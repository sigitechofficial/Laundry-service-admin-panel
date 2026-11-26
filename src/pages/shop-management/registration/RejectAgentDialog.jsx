import { useEffect, useState } from "react";
import { Field, Modal, Textarea } from "../../../design-system";
import { REJECTION_REASONS } from "./registrationFormat";

/**
 * Reject a shop's registration: one or more listed reasons (a note is required
 * for "Other"). The backend emails the shop the reasons and note.
 * onConfirm({ reasons, note }) should return a promise; the dialog stays open
 * if it throws.
 */
export default function RejectAgentDialog({ open, agentName, busy, onClose, onConfirm }) {
  const [reasons, setReasons] = useState([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReasons([]);
      setNote("");
      setError("");
    }
  }, [open]);

  const toggle = (reason) => {
    setError("");
    setReasons((prev) => (prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]));
  };

  const submit = async () => {
    const trimmed = note.trim();
    if (!reasons.length) {
      setError("Choose at least one reason.");
      return;
    }
    if (reasons.includes("Other") && !trimmed) {
      setError('Add a note explaining "Other".');
      return;
    }
    await onConfirm?.({ reasons, note: trimmed || undefined });
  };

  return (
    <Modal
      open={open}
      title="Reject Agent"
      description={`Reject ${agentName || "this shop"}? They're emailed the reasons below and see a rejection message when they try to log in.`}
      onClose={onClose}
      onPrimary={submit}
      primaryLabel={busy ? "Rejecting…" : "Reject and email agent"}
      secondaryLabel="Cancel"
      danger
      closeOnBackdrop={false}
    >
      <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 6 }}>
        <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Reasons (choose one or more)</legend>
        {REJECTION_REASONS.map((reason) => (
          <label
            key={reason}
            style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer", lineHeight: 1.4 }}
          >
            <input
              type="checkbox"
              checked={reasons.includes(reason)}
              onChange={() => toggle(reason)}
              style={{ marginTop: 3 }}
            />
            <span>{reason}</span>
          </label>
        ))}
      </fieldset>
      <div style={{ marginTop: 14 }}>
        <Field
          label={reasons.includes("Other") ? "Note (required for Other)" : "Note (optional)"}
          hint="Included in the email to the agent"
          htmlFor="reject-note"
        >
          <Textarea
            id="reject-note"
            rows={3}
            maxLength={400}
            placeholder="Please send a photo of the shop front and your business registration."
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              setError("");
            }}
          />
        </Field>
      </div>
      {error ? (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "var(--danger, #B91C1C)" }}>
          {error}
        </p>
      ) : null}
    </Modal>
  );
}
