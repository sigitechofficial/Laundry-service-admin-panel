import { Button } from "../../design-system";
import { openZoiper } from "../../utilities/contactLinks";

/**
 * Third contact action next to Direct Call / WhatsApp.
 * Uses the official “Tested with ZoiPer” mark for recognition.
 */
export default function ZoiperCallButton({ phone, onAfterClick, disabled }) {
  const canDial = Boolean(phone) && !disabled;

  return (
    <Button
      variant="secondary"
      disabled={!canDial}
      onClick={() => {
        if (!openZoiper(phone)) return;
        onAfterClick?.();
      }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        borderColor: "#f58220",
        color: "#c45a0a",
      }}
      title="Open number in Zoiper softphone"
    >
      <img
        src="/images/zoiper-badge.png"
        alt=""
        width={88}
        height={28}
        style={{ display: "block", height: 22, width: "auto" }}
      />
      <span>Zoiper</span>
    </Button>
  );
}
