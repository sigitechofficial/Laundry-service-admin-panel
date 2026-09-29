import { useEffect, useMemo, useState } from "react";
import { Badge, Button, Input, Modal } from "../../design-system";
import {
  useGetCustomerAssignableShopsQuery,
  useAssignCustomerToShopMutation,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";
import { customerShopStat } from "../order-management/returningCustomerStat";
import { getApiErrorMessage } from "../../store/services/apiErrors";

function formatDistanceKm(km) {
  if (km == null || !Number.isFinite(Number(km))) return null;
  const n = Number(km);
  if (n < 1) return `${Math.round(n * 1000)} m`;
  return `${n.toFixed(n < 10 ? 1 : 0)} km`;
}

/**
 * Assign a customer’s preferred shop (marketplace head-start).
 * Shops are ranked by distance from the customer’s last order pickup.
 */
export default function AssignCustomerShopModal({
  open,
  customerId,
  customerName,
  sourceShopId = null,
  onClose,
  onSuccess,
}) {
  const toast = useToaster();
  const [selectedShopId, setSelectedShopId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [returningOnly, setReturningOnly] = useState(false);

  const { data, isLoading, isError, error, refetch } =
    useGetCustomerAssignableShopsQuery(customerId, {
      skip: !open || !customerId,
      refetchOnMountOrArgChange: true,
    });

  const [assignShop, { isLoading: isAssigning }] =
    useAssignCustomerToShopMutation();

  const payload = data?.data ?? data ?? {};
  const shops = useMemo(
    () => (Array.isArray(payload.shops) ? payload.shops : []),
    [payload.shops]
  );

  useEffect(() => {
    if (!open) {
      setSelectedShopId(null);
      setSearchQuery("");
      setReturningOnly(false);
    }
  }, [open]);

  const filtered = useMemo(() => {
    let rows = shops;
    if (returningOnly) rows = rows.filter((s) => s.isReturning);
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((s) =>
      [s.shopName, s.zoneName, s.laundryShopId]
        .some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [shops, searchQuery, returningOnly]);

  const handleAssign = async () => {
    if (!selectedShopId || !customerId) return;
    const shop = shops.find(
      (s) => Number(s.laundryShopId) === Number(selectedShopId)
    );
    if (shop?.isExcluded) {
      const ok = window.confirm(
        `${shop.shopName} is excluded for bad experience. Assigning as preferred still skips this shop on marketplace until you Include them. Continue?`
      );
      if (!ok) return;
    }
    try {
      await assignShop({
        customerId,
        shopId: selectedShopId,
        sourceShopId: sourceShopId || undefined,
      }).unwrap();
      toast.success(
        `Assigned ${customerName || "customer"} to ${shop?.shopName || "shop"}. New orders will offer this shop first.`
      );
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not assign shop"));
    }
  };

  return (
    <Modal
      open={open}
      title="Assign preferred shop"
      description={
        customerName
          ? `Route ${customerName}’s new orders to a preferred shop first (like returning). Exclude stays separate for bad experience.`
          : "Route this customer’s new orders to a preferred shop first."
      }
      onClose={onClose}
      primaryLabel={isAssigning ? "Assigning…" : "Assign shop"}
      secondaryLabel="Cancel"
      onPrimary={() => {
        if (isAssigning || !selectedShopId) return;
        handleAssign();
      }}
      primaryDisabled={isAssigning || !selectedShopId}
    >
      <div style={{ display: "grid", gap: 12 }}>
        {payload.zoneName ? (
          <p style={{ margin: 0, fontSize: 13, color: "var(--muted)" }}>
            Zone from last order: <strong>{payload.zoneName}</strong>
            {payload.pickupHasCoords === false
              ? " · Distances unavailable (no pickup coordinates)"
              : " · Sorted nearest first"}
          </p>
        ) : null}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Input
            placeholder="Search shops…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: 160 }}
          />
          <Button
            type="button"
            size="sm"
            variant={returningOnly ? "primary" : "secondary"}
            onClick={() => setReturningOnly((v) => !v)}
          >
            Returning only
          </Button>
        </div>

        {isLoading ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            Loading shops…
          </p>
        ) : isError ? (
          <div>
            <p style={{ margin: "0 0 8px", color: "var(--danger)", fontSize: 13 }}>
              {getApiErrorMessage(error, "Could not load shops")}
            </p>
            <Button type="button" size="sm" variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
            No shops in this customer’s zone.
          </p>
        ) : (
          <div
            style={{
              maxHeight: 360,
              overflow: "auto",
              display: "grid",
              gap: 8,
            }}
          >
            {filtered.map((shop) => {
              const selected =
                Number(selectedShopId) === Number(shop.laundryShopId);
              const dist = formatDistanceKm(shop.distanceKm);
              const stat = customerShopStat({
                completed: shop.customerOrdersAtShop,
                total: shop.customerTotalOrdersAtShop,
                isReturning: shop.isReturning,
              });
              return (
                <button
                  key={shop.laundryShopId}
                  type="button"
                  disabled={shop.isAssignedShop}
                  onClick={() => setSelectedShopId(shop.laundryShopId)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: selected
                      ? "2px solid var(--accent, #20307f)"
                      : "1px solid var(--line, #e6e9f0)",
                    background: selected
                      ? "var(--brand-50, #f5f7ff)"
                      : "#fff",
                    cursor: shop.isAssignedShop ? "default" : "pointer",
                    textAlign: "left",
                    opacity: shop.isAssignedShop ? 0.7 : 1,
                  }}
                >
                  <span style={{ minWidth: 0 }}>
                    <strong style={{ fontSize: 13 }}>{shop.shopName}</strong>
                    <span
                      style={{
                        display: "block",
                        fontSize: 12,
                        color: "var(--muted)",
                        marginTop: 2,
                      }}
                    >
                      {stat?.count ||
                        `${shop.customerTotalOrdersAtShop || 0} orders`}
                      {dist ? ` · ${dist}` : ""}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        gap: 6,
                        flexWrap: "wrap",
                        marginTop: 6,
                      }}
                    >
                      {shop.isReturning ? (
                        <Badge tone="brand">Returning</Badge>
                      ) : null}
                      {shop.isAssignedShop ? (
                        <Badge tone="success">Current assignment</Badge>
                      ) : null}
                      {shop.isExcluded ? (
                        <Badge tone="danger">Excluded</Badge>
                      ) : null}
                      {shop.sameZone ? (
                        <Badge tone="neutral">Same zone</Badge>
                      ) : null}
                    </span>
                  </span>
                  {dist ? (
                    <strong style={{ fontSize: 13, whiteSpace: "nowrap" }}>
                      {dist}
                    </strong>
                  ) : null}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
