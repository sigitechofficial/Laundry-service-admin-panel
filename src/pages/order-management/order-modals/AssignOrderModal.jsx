import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Chip,
  CircularProgress,
  Box,
  Alert,
  Stack,
  Radio,
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

function shopHoursLabel(shop) {
  const day = shop?.todayDayOfWeek || null;
  const open = formatTimeHm(shop?.todayOpenTime);
  const close = formatTimeHm(shop?.todayCloseTime);

  if (day && open && close && shop?.todayScheduleActive !== false) {
    return `Today (${day}): ${open} – ${close}`;
  }
  if (day) {
    return `Today (${day}): closed`;
  }
  return "Hours unavailable";
}

function formatPickupLabel(payload, bookingSnapshot) {
  const collectionDate =
    payload?.collectionDate || bookingSnapshot?.collectionDate;
  const timeFrom =
    payload?.collectionTimeFrom || bookingSnapshot?.collectionTimeFrom;
  const timeTo =
    payload?.collectionTimeTo || bookingSnapshot?.collectionTimeTo;

  const datePart = dayjs(collectionDate).isValid()
    ? dayjs(collectionDate).format("ddd D MMM")
    : null;
  const from = formatTimeHm(timeFrom);
  const to = formatTimeHm(timeTo);

  if (datePart && from && to) return `${datePart}, ${from} – ${to}`;
  if (datePart && from) return `${datePart}, ${from}`;
  if (from && to) return `${from} – ${to}`;
  return null;
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
  const pickupLabel = formatPickupLabel(payload, bookingSnapshot);
  const orderRef = payload?.orderTrackId || bookingId;

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

  const selectedShop = shops.find((s) => s.laundryShopId === selectedShopId);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        {isReassign ? "Reassign shop" : "Assign shop"}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {isLoading && !hasShopList && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}

        {blockingError && (
          <Typography color="error" sx={{ py: 2 }}>
            {errorMessage}
          </Typography>
        )}

        {refreshWarning && (
          <Alert severity="warning" sx={{ mb: 2, fontSize: 13 }}>
            {refreshWarning}
          </Alert>
        )}

        {(!isLoading || hasShopList) && !blockingError && (
          <Stack spacing={2}>
            {isReassign && (
              <Alert severity="warning" sx={{ fontSize: 13 }}>
                Reassign only before the driver goes out for pickup. Card
                payments already collected stay on the order.
              </Alert>
            )}

            {/* Order + zone context — once, not repeated per shop */}
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                bgcolor: "#F8FAFC",
                border: "1px solid #E2E8F0",
              }}
            >
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                justifyContent="space-between"
              >
                <Box>
                  <Typography
                    sx={{ fontSize: 11, color: "#64748B", fontWeight: 600, letterSpacing: 0.4 }}
                  >
                    ORDER
                  </Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                    #{orderRef}
                  </Typography>
                  {pickupLabel && (
                    <Typography sx={{ fontSize: 13, color: "#475569", mt: 0.25 }}>
                      Pickup {pickupLabel}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ textAlign: { sm: "right" } }}>
                  <Typography
                    sx={{ fontSize: 11, color: "#64748B", fontWeight: 600, letterSpacing: 0.4 }}
                  >
                    ZONE
                  </Typography>
                  <Typography sx={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                    {zoneLabel ||
                      (zoneId != null ? `Zone #${zoneId}` : "Unknown zone")}
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.25 }}>
                    {shops.length} shop{shops.length === 1 ? "" : "s"} in this zone
                  </Typography>
                </Box>
              </Stack>
            </Box>

            {payload?.currentLaundryShopId && (
              <Typography sx={{ fontSize: 13, color: "#475569" }}>
                Currently assigned to shop #{payload.currentLaundryShopId}. Pick
                a different shop to reassign.
              </Typography>
            )}

            {hasShopList && (
              <Search
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shop name…"
              />
            )}

            {shops.length === 0 ? (
              <Alert severity="info">No active shops in this zone.</Alert>
            ) : filteredShops.length === 0 ? (
              <Typography sx={{ color: "#64748B", py: 1 }}>
                No shops match “{searchQuery.trim()}”.
              </Typography>
            ) : (
              <Stack
                spacing={1}
                sx={{ maxHeight: 380, overflowY: "auto", pr: 0.5 }}
              >
                {filteredShops.map((shop) => {
                  const selected = selectedShopId === shop.laundryShopId;
                  const disabled = shop.isCurrentShop;
                  return (
                    <Box
                      key={shop.laundryShopId}
                      onClick={() =>
                        !disabled && setSelectedShopId(shop.laundryShopId)
                      }
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1,
                        p: 1.5,
                        borderRadius: 1.5,
                        border: selected
                          ? "2px solid #000099"
                          : "1px solid #E2E8F0",
                        bgcolor: selected
                          ? "rgba(0, 0, 153, 0.04)"
                          : "#fff",
                        cursor: disabled ? "not-allowed" : "pointer",
                        opacity: disabled ? 0.55 : 1,
                        transition: "border-color 0.15s, background 0.15s",
                        "&:hover": disabled
                          ? undefined
                          : {
                              borderColor: selected ? "#000099" : "#94A3B8",
                            },
                      }}
                    >
                      <Radio
                        checked={selected}
                        disabled={disabled}
                        size="small"
                        sx={{ mt: -0.25, p: 0.5 }}
                        tabIndex={-1}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          justifyContent="space-between"
                        >
                          <Typography
                            sx={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "#0F172A",
                              lineHeight: 1.3,
                            }}
                          >
                            {shop.shopName || `Shop #${shop.laundryShopId}`}
                            {shop.isCurrentShop ? " (current)" : ""}
                          </Typography>
                          <Chip
                            size="small"
                            label={shop.isOpenNow ? "Open" : "Closed"}
                            color={shop.isOpenNow ? "success" : "default"}
                            sx={{ height: 22, fontSize: 11, flexShrink: 0 }}
                          />
                        </Stack>
                        <Typography
                          sx={{ fontSize: 12.5, color: "#64748B", mt: 0.5 }}
                        >
                          {shopHoursLabel(shop)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Stack>
            )}

            {selectedShop && (
              <Typography sx={{ fontSize: 13, color: "#334155" }}>
                Selected: <strong>{selectedShop.shopName}</strong>
              </Typography>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={isAssigning} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAssign}
          disabled={
            isAssigning || !selectedShopId || (isLoading && !hasShopList)
          }
          sx={{ bgcolor: "#000099", textTransform: "none", minWidth: 120 }}
        >
          {isAssigning
            ? isReassign
              ? "Reassigning…"
              : "Assigning…"
            : isReassign
              ? "Reassign shop"
              : "Assign shop"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
