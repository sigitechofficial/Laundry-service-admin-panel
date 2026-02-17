import { Box, Typography } from "@mui/material";
import ModalComponent from "../../components/shared/Modal";
import { useDeleteShopMutation } from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";

export default function DeleteShopModal({
  open,
  shopData,
  onClose,
  onShopDeleted,
}) {
  const [deleteShop, { isLoading }] = useDeleteShopMutation();
  const { success, error } = useToaster();

  const handleClose = () => {
    onClose();
  };

  const handleDelete = async () => {
    if (!shopData?.id) {
      error("Shop data is missing");
      return;
    }

    try {
      const res = await deleteShop(shopData.id).unwrap();

      if (res?.status === "1") {
        handleClose();
        success(res?.message || "Shop deleted successfully!");
        if (onShopDeleted) {
          onShopDeleted();
        }
      } else {
        error(res?.message || "Failed to delete shop");
      }
    } catch (err) {
      console.error("Delete shop error:", err);
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        "Failed to delete shop";
      error(errorMessage);
    }
  };

  const shopName = shopData?.name ?? shopData?.shopName ?? "this shop";

  return (
    <ModalComponent
      open={open}
      title="Delete Shop"
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: "Delete",
        onClick: handleDelete,
        isLoading: isLoading,
        sx: {
          bgcolor: "#DC2626",
          color: "white",
          "&:hover": {
            bgcolor: "#B91C1C",
          },
        },
      }}
    >
      <Box className="!space-y-4">
        <Typography variant="h6" fontFamily={"Switzer"}>
          Are you sure you want to delete this shop?
        </Typography>

        <Typography variant="h6" fontFamily={"Switzer"} color="grey.80">
          This will permanently remove {shopName} and all saved details. This
          action can&apos;t be undone.
        </Typography>
      </Box>
    </ModalComponent>
  );
}
