import { Badge, Modal } from "../../design-system";

/**
 * Confirm assigning a specific shop as the customer's preferred shop.
 */
export default function ConfirmAssignShopModal({
  open,
  shop,
  customerName,
  activeAssignment = null,
  isLoading = false,
  onClose,
  onConfirm,
}) {
  const shopName = shop?.shopName || "this shop";
  const previous = activeAssignment?.shopName;
  const sameShop =
    activeAssignment &&
    Number(activeAssignment.shopAddressId) === Number(shop?.shopId);

  return (
    <Modal
      open={open}
      title="Assign preferred shop?"
      description={
        customerName ? `${customerName} → ${shopName}` : shopName
      }
      onClose={onClose}
      primaryLabel={isLoading ? "Assigning…" : "Assign shop"}
      secondaryLabel="Cancel"
      primaryDisabled={isLoading || !shop || sameShop}
      onPrimary={() => {
        if (isLoading || !shop || sameShop) return;
        onConfirm?.(shop);
      }}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {shop?.isReturning ? <Badge tone="brand">Returning</Badge> : null}
          {shop?.isExcluded ? <Badge tone="danger">Excluded</Badge> : null}
          {sameShop ? <Badge tone="success">Already assigned</Badge> : null}
        </div>

        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--brand-50, #f5f7ff)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ display: "block", marginBottom: 8 }}>
            What happens next
          </strong>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li style={{ marginBottom: 4 }}>
              New orders get a <strong>first offer</strong> at{" "}
              <strong>{shopName}</strong> (same idea as a returning customer).
            </li>
            {previous && !sameShop ? (
              <li style={{ marginBottom: 4 }}>
                Preferred assignment moves from <strong>{previous}</strong> →{" "}
                <strong>{shopName}</strong>.
              </li>
            ) : null}
            <li style={{ marginBottom: 4 }}>
              If {shopName} declines or cannot take the job, the order
              broadcasts to other shops in the zone.
            </li>
            <li style={{ marginBottom: 4 }}>
              <strong>Exclude is separate</strong> — excluded shops stay blocked
              on marketplace even after assign.
            </li>
            {shop?.isExcluded ? (
              <li style={{ marginBottom: 4, color: "var(--danger)" }}>
                This shop is currently Excluded. Marketplace will still skip it
                until you Include it.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </Modal>
  );
}
