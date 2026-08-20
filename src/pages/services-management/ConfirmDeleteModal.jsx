import { Modal } from "../../design-system";

export default function ConfirmDeleteModal({
  open,
  title = "Delete?",
  description,
  onClose,
  onConfirm,
  loading = false,
  primaryLabel = "Delete",
}) {
  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={onClose}
      onPrimary={() => {
        if (loading) return;
        onConfirm?.();
      }}
      primaryLabel={loading ? "Deleting…" : primaryLabel}
      secondaryLabel="Cancel"
      danger
      primaryDisabled={loading}
    />
  );
}
