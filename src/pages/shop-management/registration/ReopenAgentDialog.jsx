import { Modal } from "../../../design-system";

/**
 * Confirm sending a rejected shop back to the review queue. It stays unable to
 * log in until someone approves it; the earlier reason stays visible.
 */
export default function ReopenAgentDialog({ open, agentName, previousReason, busy, onClose, onConfirm }) {
  return (
    <Modal
      open={open}
      title="Move back to review?"
      description={`${agentName || "This shop"} goes back to Pending. It still can't log in until someone checks the registration again and approves it.`}
      onClose={onClose}
      onPrimary={onConfirm}
      primaryLabel={busy ? "Moving…" : "Move back to review"}
      secondaryLabel="Cancel"
    >
      {previousReason ? (
        <div
          style={{
            border: "1px solid var(--line, #e0e4ea)",
            background: "var(--n-25, #fafbfc)",
            borderRadius: 12,
            padding: "10px 12px",
          }}
        >
          <p style={{ margin: "0 0 2px", fontSize: 12, fontWeight: 700, color: "var(--muted, #6b7482)" }}>
            Rejected before because
          </p>
          <p style={{ margin: 0, fontSize: 14, color: "var(--ink, #0e131c)" }}>{previousReason}</p>
        </div>
      ) : null}
    </Modal>
  );
}
