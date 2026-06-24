import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Chip,
  CircularProgress,
  Box,
  Alert,
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  useGetBookingAssignableShopsQuery,
  useAssignBookingToShopMutation,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import { isReassignBooking } from "../../../shared/adminAssignGate";

export default function AssignOrderModal({
  open,
  bookingId,
  bookingSnapshot,
  onClose,
  onSuccess,
}) {
  const toast = useToaster();
  const [selectedShopId, setSelectedShopId] = useState(null);

  const { data, isLoading, isError, error } = useGetBookingAssignableShopsQuery(
    bookingId,
    { skip: !open || !bookingId }
  );

  const [assignShop, { isLoading: isAssigning }] =
    useAssignBookingToShopMutation();

  const payload = data?.data ?? data ?? {};
  const shops = payload?.shops ?? [];
  const isReassign =
    Boolean(payload?.currentLaundryShopId) ||
    isReassignBooking(bookingSnapshot);

  useEffect(() => {
    if (!open) {
      setSelectedShopId(null);
    }
  }, [open]);

  const handleAssign = async () => {
    if (!selectedShopId) {
      toast.error("Select an open shop first.");
      return;
    }
    try {
      const result = await assignShop({
        bookingId,
        laundryShopId: selectedShopId,
      }).unwrap();
      const responseData = result?.data ?? result ?? {};
      if (responseData.pendingAgentAccept) {
        toast.success(
          isReassign
            ? "Order reassigned. The shop must accept the order in their app."
            : "Order sent to shop. The agent must accept the order in their app."
        );
      } else {
        toast.success("Order assigned to shop.");
      }
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to assign order.");
    }
  };

  const errorMessage =
    error?.data?.message ||
    "Could not load shops. Order may be completed, invoice finalized, or platform closed.";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isReassign ? "Reassign order to shop" : "Assign order to shop"}
      </DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {isError && (
          <Typography color="error" sx={{ py: 2 }}>
            {errorMessage}
          </Typography>
        )}
        {!isLoading && !isError && (
          <>
            {isReassign && (
              <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
                Pickup proof photos will be cleared. Card payments already
                collected at pickup stay on the order (no double charge). The
                selected shop must accept before work continues.
              </Alert>
            )}
            <Typography sx={{ mb: 1, fontSize: 14, color: "#64748B" }}>
              Order #{payload?.orderTrackId || bookingId}
              {payload?.invoiceStatus
                ? ` · Invoice: ${payload.invoiceStatus}`
                : ""}
            </Typography>
            {payload?.currentLaundryShopId && (
              <Typography sx={{ mb: 2, fontSize: 13, color: "#475569" }}>
                Currently assigned to shop ID {payload.currentLaundryShopId}.
                Select a different open shop to reassign.
              </Typography>
            )}
            <Typography sx={{ mb: 2, fontSize: 13, color: "#64748B" }}>
              Only shops that are open right now can be selected. After you
              confirm, the shop owner receives a notification and must accept
              the order.
            </Typography>
            {shops.length === 0 ? (
              <Typography sx={{ color: "#64748B" }}>
                No shops in this zone.
              </Typography>
            ) : (
              <List dense>
                {shops.map((shop) => (
                  <ListItemButton
                    key={shop.laundryShopId}
                    selected={selectedShopId === shop.laundryShopId}
                    disabled={!shop.canAssign}
                    onClick={() =>
                      shop.canAssign && setSelectedShopId(shop.laundryShopId)
                    }
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      border: "1px solid #E2E8F0",
                      opacity: shop.canAssign ? 1 : 0.5,
                    }}
                  >
                    <ListItemText
                      primary={
                        shop.isCurrentShop
                          ? `${shop.shopName} (current)`
                          : shop.shopName
                      }
                      secondary={
                        shop.canAssign
                          ? "Open now — tap to select"
                          : shop.isCurrentShop
                            ? "Current shop — choose another shop"
                            : "Closed — cannot assign"
                      }
                    />
                    <Chip
                      size="small"
                      label={shop.isOpenNow ? "Open" : "Closed"}
                      color={shop.isOpenNow ? "success" : "default"}
                    />
                  </ListItemButton>
                ))}
              </List>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isAssigning}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={isAssigning || !selectedShopId || isLoading}
          sx={{ bgcolor: "#000099" }}
        >
          {isAssigning
            ? isReassign
              ? "Reassigning…"
              : "Assigning…"
            : isReassign
              ? "Reassign"
              : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
