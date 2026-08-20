import { Modal } from "../../../design-system";
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

  const handleDelete = async () => {
    const resolvedId =
      typeof employeeId === "object"
        ? employeeId?.id ?? employeeId?.employeeId
        : employeeId;

    if (resolvedId == null || resolvedId === "") {
      error("Employee id is missing. Please close and try again.");
      return;
    }

    const deleteFn = forShopEmployees ? deleteAgentEmployee : deleteEmployee;
    const res = await deleteFn(resolvedId);

    if (res?.data?.status === "1") {
      onClose();
      success(res?.data?.message ?? "Employee deleted successfully.");
      onSuccess?.();
    } else {
      error(res?.error?.data?.message ?? "Failed to delete employee.");
    }
  };

  return (
    <Modal
      open={open}
      title="Delete employee"
      description="This will permanently remove the employee. This action can't be undone."
      onClose={onClose}
      onPrimary={handleDelete}
      primaryLabel={isLoading ? "Deleting…" : "Delete"}
      secondaryLabel="Cancel"
      danger
    />
  );
}
