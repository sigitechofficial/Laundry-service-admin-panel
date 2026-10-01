import { useEffect, useState } from "react";
import { Badge, Field, Input, Modal } from "../../design-system";

/**
 * Professional exclude / include confirmation for a customer↔shop pair.
 * Explains where new marketplace orders will go after the change.
 */
export default function ExcludeCustomerShopModal({
  open,
  shop,
  customerName,
  activeAssignment = null,
  returningShops = [],
  isLoading = false,
  onClose,
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const isExcluded = Boolean(shop?.isExcluded);
  const shopName = shop?.shopName || "this shop";

  useEffect(() => {
    if (!open) {
      setReason("");
      return;
    }
    setReason(
      isExcluded
        ? ""
        : shop?.exclusionReason || "Customer not satisfied with this shop"
    );
  }, [open, isExcluded, shop?.exclusionReason]);

  const preferredName = activeAssignment?.shopName || null;
  const otherReturning = (returningShops || []).filter(
    (s) => Number(s.shopId) !== Number(shop?.shopId) && !s.isExcluded
  );

  const afterExcludeLines = (() => {
    const lines = [
      `New marketplace orders will never be offered to ${shopName}.`,
    ];
    if (preferredName && Number(activeAssignment?.shopAddressId) !== Number(shop?.shopId)) {
      lines.push(
        `Preferred shop stays ${preferredName} — that shop still gets the first offer.`
      );
    } else if (preferredName && Number(activeAssignment?.shopAddressId) === Number(shop?.shopId)) {
      lines.push(
        `Warning: ${shopName} is also the preferred/assigned shop. Marketplace will still skip it until you Include or Assign a different shop.`
      );
    } else if (otherReturning.length) {
      lines.push(
        `If eligible, preferred offer can go to returning shops such as ${otherReturning
          .slice(0, 2)
          .map((s) => s.shopName)
          .join(", ")}${otherReturning.length > 2 ? "…" : ""}.`
      );
    } else {
      lines.push(
        "With no preferred assignment, new orders broadcast to other shops in the zone (excluding blocked ones)."
      );
    }
    lines.push("Admin can still manually assign an existing order to this shop.");
    return lines;
  })();

  const afterIncludeLines = [
    `${shopName} can receive marketplace orders again.`,
    preferredName
      ? `Preferred shop remains ${preferredName} unless you change it.`
      : "Routing follows returning history, then zone broadcast.",
  ];

  return (
    <Modal
      open={open}
      title={isExcluded ? "Include shop again?" : "Exclude shop?"}
      description={
        customerName
          ? `${customerName} · ${shopName}`
          : shopName
      }
      onClose={onClose}
      primaryLabel={
        isLoading
          ? "Saving…"
          : isExcluded
            ? "Include shop"
            : "Exclude shop"
      }
      secondaryLabel="Cancel"
      danger={!isExcluded}
      primaryDisabled={isLoading || !shop}
      onPrimary={() => {
        if (isLoading || !shop) return;
        onConfirm?.({
          shop,
          reason: isExcluded ? undefined : reason.trim() || undefined,
          include: isExcluded,
        });
      }}
    >
      <div style={{ display: "grid", gap: 14 }}>
        <div
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Badge tone={isExcluded ? "danger" : "neutral"}>
            {isExcluded ? "Currently excluded" : "Currently allowed"}
          </Badge>
          {shop?.isReturning ? <Badge tone="brand">Returning</Badge> : null}
          {shop?.isAssignedShop ? <Badge tone="success">Assigned</Badge> : null}
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid var(--line, #e6e9f0)",
            background: isExcluded ? "var(--brand-50, #f5f7ff)" : "#FEF2F2",
          }}
        >
          <strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
            What changes for new orders
          </strong>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.5 }}>
            {(isExcluded ? afterIncludeLines : afterExcludeLines).map((line) => (
              <li key={line} style={{ marginBottom: 4 }}>
                {line}
              </li>
            ))}
          </ul>
        </div>

        {!isExcluded ? (
          <Field
            label="Reason (optional)"
            hint="Shown in routing history so other admins know why"
            htmlFor="exclude-shop-reason"
          >
            <Input
              id="exclude-shop-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer not satisfied with this shop"
            />
          </Field>
        ) : (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            Include does not change preferred assignment. Use Assign / Unlink
            separately if you need to change where orders go first.
          </p>
        )}
      </div>
    </Modal>
  );
}
