import { useEffect, useMemo, useState } from "react";
import { Badge, Input, Modal } from "../../../design-system";
import {
  useGetBookingAssignableShopsQuery,
  useAssignBookingToShopMutation,
  useGetAllZonesQuery,
  useGetZoneByIdQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import { isReassignBooking } from "../../../shared/adminAssignGate";
import {
  zonesArrayFromGetZonesResponse,
  unwrapZoneFromApiResponse,
} from "../../../utilities/zonesList";
import { formatDate } from "../../../utilities/formatters";

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

  const datePart = collectionDate
    ? formatDate(collectionDate, "ddd D MMM")
    : null;
  const dateLabel = datePart && datePart !== "—" ? datePart : null;
  const from = formatTimeHm(timeFrom);
  const to = formatTimeHm(timeTo);

  if (dateLabel && from && to) return `${dateLabel}, ${from} – ${to}`;
  if (dateLabel && from) return `${dateLabel}, ${from}`;
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
  const [returningOnly, setReturningOnly] = useState(false);

  const { data, isLoading, isError, error } =
    useGetBookingAssignableShopsQuery(bookingId, {
      skip: !open || !bookingId,
      refetchOnMountOrArgChange: true,
    });

  const [assignShop, { isLoading: isAssigning }] =
    useAssignBookingToShopMutation();

  const payload = data?.data ?? data ?? {};
  const zoneId = payload?.zoneId ?? bookingSnapshot?.zoneId ?? null;

  const { data: zonesRes } = useGetAllZonesQuery(undefined, {
    skip: !open,
  });
  const { data: zoneByIdRes } = useGetZoneByIdQuery(zoneId, {
    skip: !open || zoneId == null || zoneId === "",
  });

  const zoneLabel = useMemo(() => {
    const fromPayload =
      payload?.zoneName ||
      bookingSnapshot?.zone?.name ||
      bookingSnapshot?.zoneName ||
      null;
    if (fromPayload && String(fromPayload).trim()) {
      return String(fromPayload).trim();
    }

    const zones = zonesArrayFromGetZonesResponse(zonesRes);
    const fromList = zones.find(
      (z) => String(z?.id ?? z?.zoneId) === String(zoneId)
    );
    const listName = fromList?.name ?? fromList?.zoneName;
    if (listName && String(listName).trim()) {
      return String(listName).trim();
    }

    const byId = unwrapZoneFromApiResponse(zoneByIdRes);
    const byIdName = byId?.name ?? byId?.zoneName;
    if (byIdName && String(byIdName).trim()) {
      return String(byIdName).trim();
    }

    return null;
  }, [
    payload?.zoneName,
    bookingSnapshot?.zone?.name,
    bookingSnapshot?.zoneName,
    zonesRes,
    zoneByIdRes,
    zoneId,
  ]);

  // Hard filter: only shops that belong to this order's zone.
  const shops = useMemo(() => {
    const list = Array.isArray(payload?.shops) ? payload.shops : [];
    if (zoneId == null) return list;
    return list.filter(
      (shop) =>
        shop?.zoneId == null || Number(shop.zoneId) === Number(zoneId)
    );
  }, [payload?.shops, zoneId]);
  const hasShopList = shops.length > 0;
  const blockingError = isError && !hasShopList;
  const refreshWarning =
    isError && hasShopList
      ? error?.data?.message ||
        "Could not refresh shop list. Showing last loaded shops."
      : null;
  const isReassign = isReassignBooking({
    ...bookingSnapshot,
    bookingStatusId:
      payload?.bookingStatusId ?? bookingSnapshot?.bookingStatusId,
  });
  const pickupLabel = formatPickupLabel(payload, bookingSnapshot);
  const orderRef = payload?.orderTrackId || bookingId;
  const zoneDisplay =
    zoneLabel && zoneId != null
      ? `${zoneLabel} (#${zoneId})`
      : zoneLabel
        ? zoneLabel
        : zoneId != null
          ? `Zone #${zoneId}`
          : "Unknown zone";

  const returningShopCount = useMemo(
    () => shops.filter((shop) => shop.isReturningCustomerAtShop).length,
    [shops]
  );

  const filteredShops = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return shops.filter((shop) => {
      if (returningOnly && !shop.isReturningCustomerAtShop) return false;
      if (!q) return true;
      const name = String(shop.shopName || "").toLowerCase();
      const id = String(shop.laundryShopId || "");
      return name.includes(q) || id.includes(q);
    });
  }, [shops, searchQuery, returningOnly]);

  useEffect(() => {
    if (!open) {
      setSelectedShopId(null);
      setSearchQuery("");
      setReturningOnly(false);
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
    <Modal
      open={open}
      onClose={onClose}
      title={isReassign ? "Reassign shop" : "Assign shop"}
      size="md"
      secondaryLabel="Cancel"
      secondaryDisabled={isAssigning}
      primaryLabel={
        isAssigning
          ? isReassign
            ? "Reassigning…"
            : "Assigning…"
          : isReassign
            ? "Reassign shop"
            : "Assign shop"
      }
      onPrimary={handleAssign}
      primaryDisabled={
        isAssigning || !selectedShopId || (isLoading && !hasShopList)
      }
    >
      {isLoading && !hasShopList ? (
        <p style={{ margin: 0, textAlign: "center", color: "var(--muted)", padding: "28px 0" }}>
          Loading shops…
        </p>
      ) : null}

      {blockingError ? (
        <p style={{ margin: 0, color: "var(--danger)", padding: "12px 0" }}>
          {errorMessage}
        </p>
      ) : null}

      {refreshWarning ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: "var(--r-md)",
            background: "var(--warning-bg)",
            color: "var(--warning-700)",
            fontSize: 13,
          }}
        >
          {refreshWarning}
        </div>
      ) : null}

      {(!isLoading || hasShopList) && !blockingError ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {isReassign ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--r-md)",
                background: "var(--warning-bg)",
                color: "var(--warning-700)",
                fontSize: 13,
              }}
            >
              Reassign only before the driver goes out for pickup. Card
              payments already collected stay on the order.
            </div>
          ) : null}

          <div
            style={{
              padding: 14,
              borderRadius: "var(--r-lg)",
              background: "var(--canvas)",
              border: "1px solid var(--line)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.4 }}>
                  ORDER
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>#{orderRef}</div>
                {pickupLabel ? (
                  <div style={{ fontSize: 13, color: "var(--ink-2)", marginTop: 2 }}>
                    Pickup {pickupLabel}
                  </div>
                ) : null}
              </div>
              <div>
                <div style={{ fontSize: 11, color: "var(--muted)", fontWeight: 600, letterSpacing: 0.4 }}>
                  ZONE
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{zoneDisplay}</div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {shops.length} shop{shops.length === 1 ? "" : "s"} in this zone
                </div>
              </div>
            </div>
          </div>

          {payload?.currentLaundryShopId ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>
              Currently assigned to shop #{payload.currentLaundryShopId}. Pick
              a different shop to reassign.
            </p>
          ) : null}

          {hasShopList ? (
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shop name…"
              aria-label="Search shop name"
            />
          ) : null}

          {hasShopList ? (
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--ink-2)",
                cursor: returningShopCount ? "pointer" : "not-allowed",
                opacity: returningShopCount ? 1 : 0.55,
              }}
            >
              <input
                type="checkbox"
                checked={returningOnly}
                disabled={!returningShopCount}
                onChange={(e) => setReturningOnly(e.target.checked)}
              />
              Returning customers only
              {returningShopCount ? ` (${returningShopCount})` : ""}
            </label>
          ) : null}

          {shops.length === 0 ? (
            <div
              style={{
                padding: "10px 12px",
                borderRadius: "var(--r-md)",
                background: "var(--info-bg)",
                color: "var(--info-600)",
                fontSize: 13,
              }}
            >
              No active shops in this zone.
            </div>
          ) : filteredShops.length === 0 ? (
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {returningOnly
                ? "No shops where this customer is a returning customer."
                : `No shops match “${searchQuery.trim()}”.`}
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
              {filteredShops.map((shop) => {
                const selected = selectedShopId === shop.laundryShopId;
                const disabled = shop.isCurrentShop;
                return (
                  <button
                    key={shop.laundryShopId}
                    type="button"
                    disabled={disabled}
                    onClick={() =>
                      !disabled && setSelectedShopId(shop.laundryShopId)
                    }
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 10,
                      padding: 12,
                      borderRadius: "var(--r-lg)",
                      border: selected
                        ? "2px solid var(--accent)"
                        : "1px solid var(--line)",
                      background: selected ? "var(--accent-tint)" : "var(--surface)",
                      cursor: disabled ? "not-allowed" : "pointer",
                      opacity: disabled ? 0.55 : 1,
                      textAlign: "left",
                    }}
                  >
                    <input
                      type="radio"
                      checked={selected}
                      disabled={disabled}
                      readOnly
                      tabIndex={-1}
                      style={{ marginTop: 3 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                          {shop.shopName || `Shop #${shop.laundryShopId}`}
                          {shop.isCurrentShop ? " (current)" : ""}
                        </div>
                        <Badge tone={shop.isOpenNow ? "success" : "neutral"}>
                          {shop.isOpenNow ? "Open" : "Closed"}
                        </Badge>
                      </div>
                      <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>
                        {shopHoursLabel(shop)}
                      </div>
                      {shop.isReturningCustomerAtShop ? (
                        <div style={{ marginTop: 6 }}>
                          <Badge tone="brand">
                            Returning · {shop.customerOrdersAtShop} completed order
                            {shop.customerOrdersAtShop === 1 ? "" : "s"} here
                          </Badge>
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {selectedShop ? (
            <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)" }}>
              Selected: <strong>{selectedShop.shopName}</strong>
            </p>
          ) : null}
        </div>
      ) : null}
    </Modal>
  );
}
