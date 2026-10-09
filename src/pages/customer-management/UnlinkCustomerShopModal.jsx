import { openOrdersNotice } from "./openOrdersNotice";
import { useState } from "react";
import { Modal } from "../../design-system";
import { useClearCustomerShopAssignmentMutation } from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";
import { getApiErrorMessage } from "../../store/services/apiErrors";

/**
 * Unlink admin preferred-shop assignment.
 * mode=relink → natural returning shop; mode=unlink → broadcast (exclusions stay).
 */
export default function UnlinkCustomerShopModal({
  open,
  customerId,
  customerName,
  assignedShopName,
  onClose,
  onSuccess,
}) {
  const toast = useToaster();
  const [mode, setMode] = useState("unlink");
  const [clearAssignment, { isLoading }] =
    useClearCustomerShopAssignmentMutation();

  const handleConfirm = async () => {
    if (!customerId) return;
    try {
      const res = await clearAssignment({
        customerId,
        mode,
      }).unwrap();
      const data = res?.data ?? res;
      if (mode === "relink") {
        toast.success(
          data?.activeAssignment?.shopName
            ? `Relinked to ${data.activeAssignment.shopName}.`
            : data?.note ||
                "Assignment cleared; natural returning shop will drive preferred routing."
        );
      } else {
        toast.success(
          "Unlinked. New orders first go to the shop where this customer last completed an order (if any), then to all zone shops. Excluded shops stay skipped."
        );
      }
      const notice = openOrdersNotice(data?.openOrders);
      if (notice) toast.warning(notice);
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not update assignment"));
    }
  };

  return (
    <Modal
      open={open}
      title="Unlink preferred shop"
      description={
        customerName
          ? `Remove the admin preferred-shop link for ${customerName}${
              assignedShopName ? ` (${assignedShopName})` : ""
            }.`
          : "Remove the admin preferred-shop link."
      }
      onClose={onClose}
      primaryLabel={isLoading ? "Saving…" : "Confirm"}
      secondaryLabel="Cancel"
      onPrimary={() => {
        if (isLoading) return;
        handleConfirm();
      }}
      primaryDisabled={isLoading}
    >
      <div style={{ display: "grid", gap: 12 }}>
        <div
          style={{
            padding: 12,
            borderRadius: 10,
            border: "1px solid var(--line)",
            background: "var(--surface-2, #fafbfd)",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          <strong style={{ display: "block", marginBottom: 6 }}>
            Right now
          </strong>
          {assignedShopName ? (
            <>
              New orders get the <strong>first offer</strong> at{" "}
              <strong>{assignedShopName}</strong>. Unlinking stops that.
            </>
          ) : (
            "There is no preferred assignment to clear."
          )}
        </div>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: 12,
            borderRadius: 10,
            border:
              mode === "relink"
                ? "2px solid var(--accent, #20307f)"
                : "1px solid var(--line)",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="unlink-mode"
            checked={mode === "relink"}
            onChange={() => setMode("relink")}
            style={{ marginTop: 3 }}
          />
          <span>
            <strong style={{ fontSize: 13 }}>
              Relink to natural returning shop
            </strong>
            <span
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              After this: the shop with most completed orders for this customer
              (not excluded) becomes the preferred shop again. Excluded shops
              stay blocked.
            </span>
          </span>
        </label>

        <label
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: 12,
            borderRadius: 10,
            border:
              mode === "unlink"
                ? "2px solid var(--accent, #20307f)"
                : "1px solid var(--line)",
            cursor: "pointer",
          }}
        >
          <input
            type="radio"
            name="unlink-mode"
            checked={mode === "unlink"}
            onChange={() => setMode("unlink")}
            style={{ marginTop: 3 }}
          />
          <span>
            <strong style={{ fontSize: 13 }}>Fully unlink (no preferred)</strong>
            <span
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--muted)",
                marginTop: 4,
              }}
            >
              After this: no admin preferred shop. New orders follow returning
              history, then broadcast to zone shops. Excluded shops still never
              get marketplace offers.
            </span>
          </span>
        </label>
      </div>
    </Modal>
  );
}
