import { Modal } from "../../design-system";
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

  const handleDelete = async () => {
    if (!shopData?.id) {
      error("Shop data is missing");
      return;
    }

    try {
      const res = await deleteShop(shopData.id).unwrap();

      if (res?.status === "1") {
        onClose();
        success(res?.message || "Shop deleted successfully!");
        onShopDeleted?.();
      } else {
        error(res?.message || "Failed to delete shop");
      }
    } catch (err) {
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
    <Modal
      open={open}
      title="Delete Shop"
      description={`This will permanently remove ${shopName} and all saved details. This action can't be undone.`}
      onClose={onClose}
      onPrimary={handleDelete}
      primaryLabel={isLoading ? "Deleting…" : "Delete"}
      secondaryLabel="Cancel"
      danger
    />
  );
}
