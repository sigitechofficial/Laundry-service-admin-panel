import { useMemo, useState } from "react";
import { Badge, Button } from "../../design-system";
import { useGetShopLiveOpsQuery } from "../../store/services/api";
import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const SUBTAB = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 14,
};

const MUTED = { fontSize: 12, color: "var(--muted)", lineHeight: 1.45 };

function formatKm(km) {
  if (km == null || Number.isNaN(Number(km))) return "—";
  const n = Number(km);
  if (n < 1) return `${Math.round(n * 1000)} m`;
  return `${n.toFixed(n < 10 ? 1 : 0)} km`;
}

function formatSlotTime(from, to) {
  const f = from ? String(from).slice(0, 5) : "—";
  const t = to ? String(to).slice(0, 5) : "—";
  return `${f}–${t}`;
}

function personName(u) {
  if (!u) return "—";
  const n = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return n || u.email || "—";
}

function addressLine(addr) {
  if (!addr) return "—";
  return (
    [addr.streetAddress, addr.district, addr.province]
      .filter(Boolean)
      .join(", ") || "—"
  );
}

function CapacityBanner({ capacity }) {
  if (!capacity || capacity.enabled !== true) {
    return (
      <div style={{ ...CARD, marginBottom: 14 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>Accept capacity</div>
        <p style={MUTED}>Rolling accept limit is not enabled for this shop.</p>
      </div>
    );
  }
  const atCap = Boolean(capacity.atCapacity);
  const resetLabel = capacity.resetsAt
    ? dayjs(capacity.resetsAt).format("h:mm A")
    : null;
  return (
    <div
      style={{
        ...CARD,
        marginBottom: 14,
        borderColor: atCap ? "#fdba74" : "#e6e9f0",
        background: atCap ? "#fff7ed" : "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>
            Accept capacity
          </div>
          <p style={{ ...MUTED, margin: 0 }}>
            <strong>{capacity.used ?? 0}</strong> / {capacity.limit ?? "—"}{" "}
            accepted · <strong>{capacity.remaining ?? 0}</strong> left
            {capacity.windowMinutes != null
              ? ` · ${capacity.windowMinutes} min window`
              : null}
          </p>
          {atCap ? (
            <p style={{ ...MUTED, margin: "6px 0 0", color: "#9a3412" }}>
              {capacity.limit === 0
                ? "Marketplace accepts blocked (limit 0)."
                : resetLabel
                  ? `At capacity — can accept again around ${resetLabel}.`
                  : "At capacity — wait for the rolling window."}
            </p>
          ) : null}
        </div>
        <Badge tone={atCap ? "warning" : "success"}>
          {atCap ? "At capacity" : "Can accept"}
        </Badge>
      </div>
    </div>
  );
}

function OrderRow({ order, lane, onOpen }) {
  const statusTitle =
    order?.displayStatus?.title || order?.bookingStatus?.title || "—";
  const track = order?.orderTrackId || order?.ordertrackId || order?.id;
  const isPickup = lane === "pickup" || (Number(order?.bookingStatusId) || 0) <= 7;
  const timeLabel = isPickup
    ? formatSlotTime(order.collectionTimeFrom, order.collectionTimeTo)
    : formatSlotTime(order.deliveryTimeFrom, order.deliveryTimeTo);
  const addr = isPickup ? order.pickupAddress : order.dropOffAddress;

  return (
    <button
      type="button"
      onClick={() => onOpen(order.id)}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid #eef0f5",
        background: "#fafbfd",
        cursor: "pointer",
        marginBottom: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 6,
        }}
      >
        <div style={{ fontWeight: 700, fontSize: 13 }}>
          #{track}
          {order.stopRank != null ? (
            <span style={{ marginLeft: 8, color: "var(--accent, #20307f)" }}>
              Stop {order.stopRank}
              {order.legKm != null ? ` · ${formatKm(order.legKm)}` : ""}
            </span>
          ) : order.distanceKm != null ? (
            <span style={{ marginLeft: 8, color: "var(--muted)" }}>
              {formatKm(order.distanceKm)} from shop
            </span>
          ) : null}
        </div>
        <Badge>{statusTitle}</Badge>
      </div>
      <div style={{ ...MUTED, marginBottom: 4 }}>
        {timeLabel} · {personName(order.customer)}
      </div>
      <div style={MUTED}>{addressLine(addr)}</div>
      {(order.driver || order.deliveryDriver) && (
        <div style={{ ...MUTED, marginTop: 4 }}>
          Pickup driver: {personName(order.driver)} · Delivery:{" "}
          {personName(order.deliveryDriver)}
        </div>
      )}
    </button>
  );
}

function SlotBlock({ slot, onOpen }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginBottom: 10 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 12px",
          borderRadius: 10,
          border: "1px solid #e6e9f0",
          background: "#fff",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        <span>{slot.slot}</span>
        <span>{slot.bookingCount}</span>
      </button>
      {open
        ? (slot.bookings || []).map((b) => (
            <div key={b.id} style={{ marginTop: 8, paddingLeft: 4 }}>
              <OrderRow order={b} onOpen={onOpen} />
            </div>
          ))
        : null}
    </div>
  );
}

/**
 * Admin mirror of the agent Today/Tomorrow board for one shop.
 * Sorted shop-nearest (same fallback the agent app uses without GPS).
 */
export default function ShopLiveOpsTab({ shopUserId }) {
  const navigate = useNavigate();
  const [day, setDay] = useState("today");
  const [lane, setLane] = useState("pickup");

  const { data, isLoading, isFetching, isError, refetch, error } =
    useGetShopLiveOpsQuery(
      { shopUserId, day },
      {
        skip: !shopUserId,
        pollingInterval: 20000,
      }
    );

  const payload = data?.data ?? data;
  const counts = payload?.counts;
  const board = payload?.board;
  const list = useMemo(() => {
    if (!board) return [];
    if (lane === "all") return board.all || [];
    if (lane === "drop") return board.drop || [];
    if (lane === "slots") return [];
    if (lane === "orders") return board.orders || [];
    return board.pickup || [];
  }, [board, lane]);

  const openOrder = (id) => {
    if (id == null) return;
    navigate(`/orders/details/${id}`);
  };

  if (!shopUserId) {
    return (
      <div style={CARD}>
        <p style={MUTED}>Shop owner id missing — cannot load live ops.</p>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 12,
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Live ops</div>
          <p style={{ ...MUTED, margin: "4px 0 0" }}>
            Same Today / Tomorrow pickup · delivery · slots view as the agent
            app. Sorted from the shop location (Stop 1 / Stop 2). Auto-refreshes
            every 20s.
            {payload?.dayDate ? ` · ${payload.dayDate}` : ""}
            {payload?.sortBasis === "shop_nearest_route"
              ? " · shop-nearest route"
              : payload?.sortBasis
                ? " · date order (no shop GPS)"
                : ""}
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      <CapacityBanner capacity={payload?.capacity} />

      <div style={SUBTAB}>
        {[
          { id: "today", label: `Today (${counts?.today ?? "—"})` },
          { id: "tomorrow", label: `Tomorrow (${counts?.tomorrow ?? "—"})` },
        ].map((t) => (
          <Button
            key={t.id}
            variant={day === t.id ? "primary" : "secondary"}
            onClick={() => {
              setDay(t.id);
              if (lane === "orders") setLane("pickup");
            }}
          >
            {t.label}
          </Button>
        ))}
        <Button
          variant={lane === "orders" ? "primary" : "secondary"}
          onClick={() => setLane("orders")}
        >
          Active orders ({counts?.orders ?? "—"})
        </Button>
      </div>

      {lane !== "orders" ? (
        <div style={SUBTAB}>
          {[
            { id: "pickup", label: `Pickup (${counts?.dayPickup ?? 0})` },
            { id: "drop", label: `Drop (${counts?.dayDrop ?? 0})` },
            { id: "all", label: `All (${counts?.dayAll ?? 0})` },
            {
              id: "slots",
              label: `Slots (${board?.slots?.length ?? 0})`,
            },
          ].map((t) => (
            <Button
              key={t.id}
              variant={lane === t.id ? "primary" : "secondary"}
              onClick={() => setLane(t.id)}
            >
              {t.label}
            </Button>
          ))}
        </div>
      ) : null}

      <div style={CARD}>
        {isLoading ? (
          <p style={MUTED}>Loading live board…</p>
        ) : isError ? (
          <p style={{ ...MUTED, color: "#b91c1c" }}>
            Could not load live ops
            {error?.data?.message || error?.error
              ? `: ${error?.data?.message || error?.error}`
              : "."}{" "}
            Deploy the API route <code>GET /admin/shopLiveOps/:shopUserId</code>{" "}
            if this is 404.
          </p>
        ) : lane === "slots" ? (
          (board?.slots || []).length === 0 ? (
            <p style={MUTED}>No slot bookings for this day.</p>
          ) : (
            (board?.slots || []).map((s) => (
              <SlotBlock key={s.slot} slot={s} onOpen={openOrder} />
            ))
          )
        ) : list.length === 0 ? (
          <p style={MUTED}>No bookings in this lane.</p>
        ) : (
          list.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              lane={lane === "orders" ? undefined : lane}
              onOpen={openOrder}
            />
          ))
        )}
      </div>
    </div>
  );
}
