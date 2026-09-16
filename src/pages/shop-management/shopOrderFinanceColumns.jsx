import { Button } from "../../design-system";
import {
  formatCalendarDate,
  formatClock,
  formatMoney,
} from "../../utilities/formatters";
import {
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMoney,
} from "../directory-table/directoryTable";

const TIMING_TONE = {
  early: "info",
  on_time: "success",
  late: "warning",
};

const TIMING_LABEL = {
  early: "Early",
  on_time: "On time",
  late: "Late",
};

export function timingLabel(code) {
  return TIMING_LABEL[code] || "—";
}

/** Booking window cell: date on top, time slot stacked below. */
export function BookingWindowCell({ date, from, to }) {
  const dateText = formatCalendarDate(date);
  if (dateText === "—") return <span style={{ color: "#9ca3af" }}>—</span>;
  const start = formatClock(from);
  const end = formatClock(to);
  const timeText = start && end ? `${start} – ${end}` : start || "";
  return (
    <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
      <span style={{ fontWeight: 600 }}>{dateText}</span>
      {timeText ? (
        <span style={{ color: "#6b7280", fontSize: 12 }}>{timeText}</span>
      ) : null}
    </div>
  );
}

export function TimingPill({ value, kind }) {
  if (!value) {
    return <span style={{ color: "#9ca3af" }}>—</span>;
  }
  return (
    <DirectoryDotPill tone={TIMING_TONE[value] || "neutral"}>
      {kind === "pickup" ? "Pickup" : "Delivery"} {timingLabel(value).toLowerCase()}
    </DirectoryDotPill>
  );
}

function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (key === "completed" || key === "paid") return "success";
  if (key === "pending") return "warning";
  if (key === "failed" || key.includes("cancel") || key.includes("refund")) return "danger";
  return "neutral";
}

export function buildShopOrderFinanceColumns({
  symbol,
  onOpenOrder,
}) {
  return [
    {
      key: "order",
      header: "Order",
      render: (row) => {
        const name = `#${row.orderTrackId || row.id}`;
        const meta =
          row.customer?.firstName || row.customer?.lastName
            ? `${row.customer?.firstName || ""} ${row.customer?.lastName || ""}`.trim()
            : row.customer || "—";
        return (
          <button
            type="button"
            onClick={() => onOpenOrder?.(row)}
            style={{
              border: 0,
              background: "transparent",
              padding: 0,
              textAlign: "left",
              cursor: onOpenOrder ? "pointer" : "default",
            }}
          >
            <DirectoryIdentity name={name} meta={meta} />
          </button>
        );
      },
    },
    {
      key: "collected",
      header: "Collection",
      render: (row) => (
        <BookingWindowCell
          date={row.collectionDate}
          from={row.collectionTimeFrom}
          to={row.collectionTimeTo}
        />
      ),
    },
    {
      key: "delivery",
      header: "Delivery",
      render: (row) => (
        <BookingWindowCell
          date={row.deliveryDate}
          from={row.deliveryTimeFrom}
          to={row.deliveryTimeTo}
        />
      ),
    },
    {
      key: "timing",
      header: "Pickup / delivery",
      render: (row) => (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <TimingPill kind="pickup" value={row.pickupTiming} />
          <TimingPill kind="delivery" value={row.deliveryTiming} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => {
        const status = row.status || row?.bookingStatus?.title || "Pending";
        return <DirectoryDotPill tone={statusTone(status)}>{status}</DirectoryDotPill>;
      },
    },
    {
      key: "pay",
      header: "Pay",
      render: (row) => row.paymentType || "—",
    },
    {
      key: "gross",
      header: "Gross",
      render: (row) => (
        <DirectoryMoney>{formatMoney(row.gross ?? row.orderAmount, symbol)}</DirectoryMoney>
      ),
    },
    {
      key: "shopNet",
      header: "Shop net",
      render: (row) => <DirectoryMoney>{formatMoney(row.shopNet, symbol)}</DirectoryMoney>,
    },
    {
      key: "platform",
      header: "Platform",
      render: (row) => (
        <div>
          <DirectoryMoney>{formatMoney(row.platformTake ?? row.platformCommission, symbol)}</DirectoryMoney>
          <div style={{ fontSize: 11, color: "#6b7280" }}>
            Fee {formatMoney(row.serviceCharge, symbol)} + commission{" "}
            {formatMoney(row.platformCommission, symbol)}
          </div>
        </div>
      ),
    },
  ];
}

export function PunctualityMetrics({ stats, prefix = "" }) {
  if (!stats) return null;
  const items = [
    { label: `${prefix}On-time pickup`, value: stats.onTimePickups ?? 0, tone: "success" },
    { label: `${prefix}Early pickup`, value: stats.earlyPickups ?? 0, tone: "navy" },
    { label: `${prefix}Late pickup`, value: stats.latePickups ?? 0, tone: "warning" },
    { label: `${prefix}On-time delivery`, value: stats.onTimeDeliveries ?? 0, tone: "success" },
    { label: `${prefix}Early delivery`, value: stats.earlyDeliveries ?? 0, tone: "navy" },
    { label: `${prefix}Late delivery`, value: stats.lateDeliveries ?? 0, tone: "warning" },
  ];
  return items;
}

export function ShopOrderExportButton({ onClick, disabled }) {
  return (
    <Button size="sm" variant="secondary" onClick={onClick} disabled={disabled}>
      Export CSV
    </Button>
  );
}
