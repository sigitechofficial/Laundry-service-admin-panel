import { useState } from "react";
import { Button } from "../../design-system";
import { LINPHONE_DOWNLOAD_URL, openLinphone } from "../../utilities/contactLinks";

/**
 * Contact action that opens the number in the Linphone desktop app.
 * If nothing takes the call (Linphone not installed), a download notice shows
 * under the buttons and the contact modal stays open.
 */
export default function LinphoneCallButton({ phone, onAfterClick, disabled }) {
  const canDial = Boolean(phone) && !disabled;
  const [status, setStatus] = useState("idle"); // idle | opening | missing

  return (
    <>
      <Button
        variant="secondary"
        disabled={!canDial || status === "opening"}
        onClick={() => {
          setStatus("opening");
          const started = openLinphone(phone, {
            onLaunched: () => {
              setStatus("idle");
              onAfterClick?.();
            },
            onMissing: () => setStatus("missing"),
          });
          if (!started) setStatus("idle");
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          borderColor: "#f26c0d",
          color: "#3c3c3b",
        }}
        title="Open number in Linphone"
      >
        <img
          src="/images/linphone-logo.png"
          alt="Linphone"
          width={400}
          height={101}
          style={{ display: "block", height: 18, width: "auto" }}
        />
        {status === "opening" ? <span>Opening…</span> : null}
      </Button>
      {status === "missing" ? (
        <div
          role="alert"
          style={{
            order: 99,
            flexBasis: "100%",
            border: "1px solid #f9c79a",
            borderRadius: 12,
            background: "#fff6ee",
            padding: 12,
            fontSize: 14,
            color: "var(--ink-2)",
          }}
        >
          <strong style={{ color: "var(--ink)" }}>Linphone is not installed on this computer.</strong>
          <div style={{ marginTop: 4 }}>
            Download Linphone for Mac or Windows, install it, then press the Linphone button again.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Button
              variant="primary"
              onClick={() => window.open(LINPHONE_DOWNLOAD_URL, "_blank", "noopener,noreferrer")}
            >
              Download Linphone
            </Button>
            <Button variant="ghost" onClick={() => setStatus("idle")}>
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
