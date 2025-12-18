import { Box, Typography } from "@mui/material";
import ModalComponent from "../../components/shared/Modal";
import { useDeleteDriverMutation } from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";

export default function DeleteDriverModal({ open, driverData, onClose, onDriverDeleted }) {
  const [deleteDriver, { isLoading }] = useDeleteDriverMutation();
  const { success, error } = useToaster();

  const handleClose = () => {
    onClose();
  };

  const handleDelete = async () => {
    if (!driverData?.id) {
      error("Driver data is missing");
      return;
    }

    try {
      const res = await deleteDriver(driverData.id).unwrap();

      if (res?.status === "1") {
        handleClose();
        success(res?.message || "Driver deleted successfully!");
        // Call the callback to refetch drivers list
        if (onDriverDeleted) {
          onDriverDeleted();
        }
      } else {
        error(res?.message || "Failed to delete driver");
      }
    } catch (err) {
      console.error("Delete driver error:", err);
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        "Failed to delete driver";
      error(errorMessage);
    }
  };

  const driverName = driverData 
    ? `${driverData.firstName || ""} ${driverData.lastName || ""}`.trim() 
    : "this driver";

  return (
    <ModalComponent
      open={open}
      title="Delete Driver"
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
          Are you sure you want to delete this driver?
        </Typography>

        <Typography variant="h6" fontFamily={"Switzer"} color="grey.80">
          This will permanently remove {driverName} and all saved details.
          This action can't be undone.
        </Typography>
      </Box>
    </ModalComponent>
  );
}


