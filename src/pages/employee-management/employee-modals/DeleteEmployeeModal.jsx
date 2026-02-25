import { Box, Typography } from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";
import {
  useDeleteAdminEmployeeMutation,
  useDeleteAgentEmployeeMutation,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";

export default function DeleteEmployeeModal({
  open,
  employeeId,
  onClose,
  onSuccess,
  forShopEmployees = false,
}) {
  const [deleteEmployee, { isLoading: isDeletingAdmin }] = useDeleteAdminEmployeeMutation();
  const [deleteAgentEmployee, { isLoading: isDeletingAgent }] = useDeleteAgentEmployeeMutation();
  const isLoading = isDeletingAdmin || isDeletingAgent;
  const { success, error } = useToaster();

  const handleClose = () => {
    onClose();
  };

  const handleDelete = async () => {
    if (employeeId == null) return;
    const deleteFn = forShopEmployees ? deleteAgentEmployee : deleteEmployee;
    const res = await deleteFn(employeeId);

    if (res?.data?.status === "1") {
      handleClose();
      success(res?.data?.message ?? "Employee deleted successfully.");
      onSuccess?.();
    } else {
      error(res?.error?.data?.message ?? "Failed to delete employee.");
    }
  };

  return (
    <ModalComponent
      open={open}
      title="Delete Employee"
      onClose={handleClose}
      secondaryAction={{
        label: "Cancel",
        onClick: handleClose,
      }}
      primaryAction={{
        label: "Delete",
        onClick: handleDelete,
        isLoading,
      }}
    >
      <Box className="!space-y-4">
        <Typography variant="h6" fontFamily={"Switzer"}>
          Are you sure you want to delete this employee?
        </Typography>
        <Typography variant="h6" fontFamily={"Switzer"} color="grey.80">
          This will permanently remove the employee. This action can&apos;t be undone.
        </Typography>
      </Box>
    </ModalComponent>
  );
}
