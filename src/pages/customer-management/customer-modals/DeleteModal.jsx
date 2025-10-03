import { Box, Typography } from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";
import { useDeleteCustomerMutation } from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";

export default function DeleteModal({ open, data, setModalData }) {
  const [deleteCustomer, { isLoading }] = useDeleteCustomerMutation();
  const { success } = useToaster();

  const handleClose = () => {
    setModalData({
      open: false,
      data: null,
    });
  };

  const handleDelete = async () => {
    const res = await deleteCustomer(data?.data?.id);

    if (res?.data?.status === "1") {
      handleClose();
      success(res?.data?.message);
    } else {
      success("Something went wrong!");
    }
  };

  return (
    <ModalComponent
      open={open}
      title="Delete  Customer"
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
          Are you sure you want to delete this customer
        </Typography>

        <Typography variant="h6" fontFamily={"Switzer"} color="grey.80">
          This will permanently remove {data?.data?.name} and all saved details.
          This action can’t be undone.
        </Typography>
      </Box>
    </ModalComponent>
  );
}
