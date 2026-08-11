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
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  useGetBookingAssignableShopsQuery,
  useAssignBookingToShopMutation,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import Search from "../../../components/ui/Search";
import { isReassignBooking } from "../../../shared/adminAssignGate";

function formatTimeHm(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return raw;
  return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
}

function shopDayHoursLabel(shop) {
  const day = shop?.todayDayOfWeek || null;
  const open = formatTimeHm(shop?.todayOpenTime);
  const close = formatTimeHm(shop?.todayCloseTime);

  if (day && open && close && shop?.todayScheduleActive !== false) {
    return `${day} ${open} – ${close}`;
  }
  if (day) {
    return `${day} · Closed today`;
  }
  return null;
}

function shopPrimaryLabel(shop) {
  const name = shop?.isCurrentShop
    ? `${shop.shopName} (current)`
    : shop?.shopName || "Shop";
  const hours = shopDayHoursLabel(shop);
  return hours ? `${name} · ${hours}` : name;
}

function pickupSecondaryLabel(payload, bookingSnapshot, isCurrentShop) {
  if (isCurrentShop) {
    return "Current shop — choose another shop";
  }

  const collectionDate =
    payload?.collectionDate || bookingSnapshot?.collectionDate;
  const timeFrom =
    payload?.collectionTimeFrom || bookingSnapshot?.collectionTimeFrom;
  const timeTo =
    payload?.collectionTimeTo || bookingSnapshot?.collectionTimeTo;

  const datePart = dayjs(collectionDate).isValid()
    ? dayjs(collectionDate).format("ddd DD MMM")
    : null;
  const from = formatTimeHm(timeFrom);
  const to = formatTimeHm(timeTo);

  if (datePart && from && to) {
    return `Pickup: ${datePart} · ${from} – ${to}`;
  }
  if (datePart && from) {
    return `Pickup: ${datePart} · ${from}`;
  }
  if (from && to) {
    return `Pickup: ${from} – ${to}`;
  }
  return "Pickup time unavailable";
}

export default function AssignOrderModal({
  open,
  bookingId,
  bookingSnapshot,
  onClose,
  onSuccess,
}) {
  const toast = useToaster();
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading, isError, error } =
    useGetBookingAssignableShopsQuery(bookingId, {
      skip: !open || !bookingId,
      refetchOnMountOrArgChange: true,
    });

  const [assignShop, { isLoading: isAssigning }] =
    useAssignBookingToShopMutation();

  const payload = data?.data ?? data ?? {};
  const shops = payload?.shops ?? [];
  const zoneLabel =
    payload?.zoneName ||
    bookingSnapshot?.zone?.name ||
    bookingSnapshot?.zoneName ||
    null;
  const zoneId = payload?.zoneId ?? bookingSnapshot?.zoneId ?? null;
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

  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return shops;
    return shops.filter((shop) => {
      const name = String(shop.shopName || "").toLowerCase();
      const id = String(shop.laundryShopId || "");
      return name.includes(q) || id.includes(q);
    });
  }, [shops, searchQuery]);

  useEffect(() => {
    if (!open) {
      setSelectedShopId(null);
      setSearchQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (
      selectedShopId &&
      !filteredShops.some((s) => s.laundryShopId === selectedShopId)
    ) {
      setSelectedShopId(null);
    }
  }, [filteredShops, selectedShopId]);

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
            <Box
              sx={{
                mb: 2,
                px: 1.5,
                py: 1,
                borderRadius: 1,
                bgcolor: "#F8FAFC",
                border: "1px solid #E2E8F0",
              }}
            >
              <Typography sx={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>
                Zone: {zoneLabel || (zoneId != null ? `ID ${zoneId}` : "Unknown")}
              </Typography>
              <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.25 }}>
                Only shops in this order&apos;s zone are listed
                {hasShopList ? ` (${shops.length})` : ""}.
              </Typography>
            </Box>
            {payload?.currentLaundryShopId && (
              <Typography sx={{ mb: 2, fontSize: 13, color: "#475569" }}>
                Currently assigned to shop ID {payload.currentLaundryShopId}.
                Select a different shop to reassign.
              </Typography>
            )}
            <Typography sx={{ mb: 1.5, fontSize: 13, color: "#64748B" }}>
              Select a shop. The assigned shop receives the order immediately in
              their active list.
            </Typography>
            {hasShopList && (
              <Box sx={{ mb: 1.5 }}>
                <Search
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search shops by name or ID…"
                />
              </Box>
            )}
            {hasShopList && assignableShops.length === 0 && (
              <Alert severity="info" sx={{ mb: 2, fontSize: 13 }}>
                All shops in this zone appear closed on the current schedule. You
                can still select a shop if assignment is allowed.
              </Alert>
            )}
            {shops.length === 0 ? (
              <Typography sx={{ color: "#64748B" }}>
                No active shops in this zone.
              </Typography>
            ) : filteredShops.length === 0 ? (
              <Typography sx={{ color: "#64748B", py: 1 }}>
                No shops match “{searchQuery.trim()}”.
              </Typography>
            ) : (
              <List
                dense
                sx={{
                  maxHeight: 360,
                  overflowY: "auto",
                  pr: 0.5,
                }}
              >
                {filteredShops.map((shop) => (
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
                      primary={shopPrimaryLabel(shop)}
                      secondary={pickupSecondaryLabel(
                        payload,
                        bookingSnapshot,
                        shop.isCurrentShop
                      )}
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
