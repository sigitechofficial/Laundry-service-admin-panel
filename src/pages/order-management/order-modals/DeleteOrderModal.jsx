import { Modal } from "../../../design-system";
import { useDeleteOrderMutation } from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";

export default function DeleteOrderModal({ open, orderId, onClose, onSuccess }) {
  const [deleteOrder, { isLoading }] = useDeleteOrderMutation();
  const { success, error } = useToaster();

  const handleClose = () => {
    onClose();
  };

  const handleDelete = async () => {
    if (isLoading) return;
    const res = await deleteOrder(orderId);

    if (res?.data?.status === "1") {
      handleClose();
      success(res?.data?.message ?? "Order deleted successfully.");
      onSuccess?.();
    } else {
      error(res?.error?.data?.message ?? "Failed to delete order.");
    }
  };

  return (
    <Modal
      open={open}
      title="Delete Order"
      onClose={handleClose}
      secondaryLabel="Cancel"
      primaryLabel={isLoading ? "Deleting…" : "Delete"}
      onPrimary={handleDelete}
      primaryDisabled={isLoading}
      danger
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <p style={{ margin: 0, fontWeight: 600 }}>
          Are you sure you want to delete this order?
        </p>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          This will permanently remove the order. This action can&apos;t be undone.
        </p>
      </div>
    </Modal>
  );
}
