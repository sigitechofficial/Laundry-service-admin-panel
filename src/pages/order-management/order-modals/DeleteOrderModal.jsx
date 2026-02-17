import { Box, Typography } from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";
import { useDeleteOrderMutation } from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";

export default function DeleteOrderModal({ open, orderId, onClose, onSuccess }) {
  const [deleteOrder, { isLoading }] = useDeleteOrderMutation();
  const { success, error } = useToaster();

  const handleClose = () => {
    onClose();
  };

  const handleDelete = async () => {
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
    <ModalComponent
      open={open}
      title="Delete Order"
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: "Delete",
        onClick: handleDelete,
        isLoading: isLoading,
      }}
    >
      <Box className="!space-y-4">
        <Typography variant="h6" fontFamily={"Switzer"}>
          Are you sure you want to delete this order?
        </Typography>
        <Typography variant="h6" fontFamily={"Switzer"} color="grey.80">
          This will permanently remove the order. This action can&apos;t be undone.
        </Typography>
      </Box>
    </ModalComponent>
  );
}
