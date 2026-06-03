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
} from "@mui/material";
import { useEffect, useState } from "react";
import {
  useGetBookingAssignableShopsQuery,
  useAssignBookingToShopMutation,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";

export default function AssignOrderModal({ open, bookingId, onClose, onSuccess }) {
  const toast = useToaster();
  const [selectedShopId, setSelectedShopId] = useState(null);

  const { data, isLoading, isError } = useGetBookingAssignableShopsQuery(
    bookingId,
    { skip: !open || !bookingId }
  );

  const [assignShop, { isLoading: isAssigning }] =
    useAssignBookingToShopMutation();

  const payload = data?.data ?? data ?? {};
  const shops = payload?.shops ?? [];

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
      await assignShop({
        bookingId,
        laundryShopId: selectedShopId,
      }).unwrap();
      toast.success("Order assigned to shop.");
      onSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || "Failed to assign order.");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign order to shop</DialogTitle>
      <DialogContent>
        {isLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {isError && (
          <Typography color="error" sx={{ py: 2 }}>
            Could not load shops. Only expired, unassigned orders can be assigned
            while platform and shop are open.
          </Typography>
        )}
        {!isLoading && !isError && (
          <>
            <Typography sx={{ mb: 2, fontSize: 14, color: "#64748B" }}>
              Order #{payload?.orderTrackId || bookingId} — only shops that are
              open right now can be selected.
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
                      primary={shop.shopName}
                      secondary={
                        shop.canAssign
                          ? "Open now — tap to select"
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
          {isAssigning ? "Assigning…" : "Assign"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
