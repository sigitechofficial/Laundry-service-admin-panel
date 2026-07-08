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

  const { data, isLoading, isError, error } =
    useGetBookingAssignableShopsQuery(bookingId, {
      skip: !open || !bookingId,
      refetchOnMountOrArgChange: true,
    });

  const [assignShop, { isLoading: isAssigning }] =
    useAssignBookingToShopMutation();

  const payload = data?.data ?? data ?? {};
  const shops = payload?.shops ?? [];
  const assignableShops = shops.filter((shop) => shop.canAssign);
  const hasShopList = shops.length > 0;
  const blockingError = isError && !hasShopList;
  const refreshWarning =
    isError && hasShopList
      ? error?.data?.message ||
        "Could not refresh shop list. Showing last loaded shops."
      : null;
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
      toast.error("Select a shop first.");
      return;
    }
    try {
      await assignShop({
        bookingId,
        laundryShopId: selectedShopId,
      }).unwrap();
      toast.success(
        isReassign ? "Order reassigned to shop." : "Order assigned to shop."
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to assign order.");
    }
  };

  const errorMessage =
    error?.data?.message ||
    "Could not load shops. Order may be out for pickup, completed, or invoice finalized.";
  const isPlatformClosedError =
    typeof error?.data?.message === "string" &&
    error.data.message.toLowerCase().includes("platform is closed");

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isReassign ? "Reassign order to shop" : "Assign order to shop"}
      </DialogTitle>
      <DialogContent>
        {isLoading && !hasShopList && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {blockingError && (
          <>
            <Typography color="error" sx={{ py: 2 }}>
              {errorMessage}
            </Typography>
            {isPlatformClosedError && (
              <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
                This restriction was removed in the latest backend. Deploy the
                updated API (or point admin to your local backend) and restart
                the server.
              </Alert>
            )}
          </>
        )}
        {refreshWarning && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
            {refreshWarning}
          </Alert>
        )}
        {(!isLoading || hasShopList) && !blockingError && (
          <>
            {isReassign && (
              <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
                Reassign is only allowed before the driver goes out for pickup.
                Card payments already collected stay on the order (no double
                charge).
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
                Select a different shop to reassign.
              </Typography>
            )}
            <Typography sx={{ mb: 2, fontSize: 13, color: "#64748B" }}>
              Select a shop in this zone. The assigned shop receives the order
              immediately in their active list.
            </Typography>
            {hasShopList && assignableShops.length === 0 && (
              <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
                All shops in this zone appear closed on the current schedule. You
                can still select a shop if assignment is allowed.
              </Alert>
            )}
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
                    disabled={shop.isCurrentShop}
                    onClick={() =>
                      !shop.isCurrentShop &&
                      setSelectedShopId(shop.laundryShopId)
                    }
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      border: "1px solid #E2E8F0",
                      opacity: shop.isCurrentShop ? 0.5 : 1,
                    }}
                  >
                    <ListItemText
                      primary={
                        shop.isCurrentShop
                          ? `${shop.shopName} (current)`
                          : shop.shopName
                      }
                      secondary={
                        shop.isCurrentShop
                          ? "Current shop — choose another shop"
                          : shop.isOpenNow
                            ? "Open on shop schedule — tap to select"
                            : "Closed on shop schedule — tap to select"
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
          disabled={isAssigning || !selectedShopId || (isLoading && !hasShopList)}
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
