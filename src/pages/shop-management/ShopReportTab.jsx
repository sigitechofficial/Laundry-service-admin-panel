import { Button, Table } from "../../design-system";
import { DirectoryMetrics } from "../directory-table/directoryTable";

/**
 * Shop report — web layout for the admin panel. Same data model as the
 * printable A4 document (shopReportDocument.js); only the presentation
 * differs. "Download PDF" hands the model to the print pipeline.
 */

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const TONE = {
  early: { bg: "#0ea5e9", label: "Early" },
  onTime: { bg: "#10b981", label: "On time" },
  late: { bg: "#ef4444", label: "Late" },
};

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function money(symbol, value) {
  return `${symbol || "£"}${num(value).toFixed(2)}`;
}

function pct(part, whole) {
  const w = num(whole);
  if (w <= 0) return 0;
  return Math.round((num(part) / w) * 100);
}

function SectionTitle({ children, hint }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden="true"
          style={{
            width: 5,
            height: 18,
            borderRadius: 3,
            background: "var(--brand, #00028B)",
            display: "inline-block",
          }}
        />
        <strong style={{ fontSize: 15 }}>{children}</strong>
      </div>
      {hint ? (
        <span className="jd-lead" style={{ margin: 0, fontSize: 12 }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function Row({ label, value, sub, strong, muted }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        padding: strong ? "10px 0" : "8px 0",
        borderBottom: "1px solid #f1f4f8",
        fontWeight: strong ? 700 : 500,
        color: muted ? "#6b7280" : "#111827",
        fontSize: 13.5,
      }}
    >
      <span>{label}</span>
      <span style={{ display: "flex", gap: 10, alignItems: "baseline", whiteSpace: "nowrap" }}>
        {sub != null ? (
          <span style={{ fontSize: 12, color: "#9ca3af", fontVariantNumeric: "tabular-nums" }}>
            {sub}
          </span>
        ) : null}
        <span style={{ fontVariantNumeric: "tabular-nums" }}>{value}</span>
      </span>
    </div>
  );
}

function IdentityChip({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 10.5,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#6b7280",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 13.5,
          fontWeight: 600,
          marginTop: 2,
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
        title={typeof value === "string" ? value : undefined}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function RatingsCard({ ratings }) {
  const count = num(ratings?.count);
  const avg = num(ratings?.avg);
  const rounded = Math.round(avg);
  const hist = ratings?.histogram || {};
  return (
    <div style={CARD}>
      <SectionTitle>Ratings &amp; reviews</SectionTitle>
      <div style={{ display: "flex", gap: 24, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <div style={{ minWidth: 120 }}>
          <div style={{ fontSize: 46, fontWeight: 800, lineHeight: 1 }}>
            {count > 0 ? avg.toFixed(1) : "—"}
          </div>
          <div style={{ color: "#f59e0b", fontSize: 18, letterSpacing: 1, marginTop: 6 }}>
            {"★".repeat(rounded)}
            <span style={{ color: "#e5e7eb" }}>{"★".repeat(Math.max(0, 5 - rounded))}</span>
          </div>
          <div className="jd-lead" style={{ margin: "4px 0 0", fontSize: 12 }}>
            {count} review{count === 1 ? "" : "s"}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          {[5, 4, 3, 2, 1].map((star) => {
            const n = num(hist[star]);
            const width = count > 0 ? Math.round((n / count) * 100) : 0;
            return (
              <div
                key={star}
                style={{ display: "flex", alignItems: "center", gap: 10, margin: "5px 0" }}
              >
                <span style={{ fontSize: 12, color: "#6b7280", width: 26 }}>{star}★</span>
                <span
                  style={{
                    flex: 1,
                    height: 9,
                    background: "#eef2f7",
                    borderRadius: 6,
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      height: "100%",
                      width: `${width}%`,
                      background: "#f59e0b",
                      borderRadius: 6,
                    }}
                  />
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: "#475569",
                    width: 28,
                    textAlign: "right",
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {n}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PunctualityCard({ title, completed, early, onTime, late }) {
  const total = num(completed);
  const parts = [
    { key: "early", n: num(early) },
    { key: "onTime", n: num(onTime) },
    { key: "late", n: num(late) },
  ];
  return (
    <div style={CARD}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
        <strong>{title}</strong>
        <span className="jd-lead" style={{ margin: 0, fontSize: 12 }}>
          {total} completed
        </span>
      </div>
      <div
        aria-hidden="true"
        style={{
          display: "flex",
          height: 12,
          borderRadius: 8,
          overflow: "hidden",
          background: "#eef2f7",
          marginTop: 14,
        }}
      >
        {total > 0
          ? parts.map((part) => (
              <span
                key={part.key}
                style={{
                  width: `${(part.n / total) * 100}%`,
                  background: TONE[part.key].bg,
                  transition: "width .2s",
                }}
              />
            ))
          : null}
      </div>
      <div style={{ marginTop: 10 }}>
        {parts.map((part) => (
          <Row
            key={part.key}
            label={
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    background: TONE[part.key].bg,
                    display: "inline-block",
                  }}
                />
                {TONE[part.key].label}
              </span>
            }
            value={part.n}
            sub={`${pct(part.n, total)}%`}
          />
        ))}
      </div>
    </div>
  );
}

export default function ShopReportTab({ model, onDownload }) {
  if (!model) return null;
  const s = model.currencySymbol;
  const o = model.orders;
  const p = model.punctuality;
  const e = model.earnings;
  const shop = model.shop;
  const wallet = model.wallet;

  const paymentRows = [
    { key: "card", channel: "Card", orders: e.cardOrders, collected: e.cardGross },
    { key: "cash", channel: "Cash", orders: e.cashOrders, collected: e.cashGross },
    {
      key: "total",
      channel: "Total",
      orders: e.cardOrders + e.cashOrders,
      collected: e.cardGross + e.cashGross,
      total: true,
    },
  ];

  const paymentColumns = [
    {
      key: "channel",
      header: "Channel",
      render: (row) => (row.total ? <strong>{row.channel}</strong> : row.channel),
    },
    {
      key: "orders",
      header: "Orders",
      align: "right",
      render: (row) => (row.total ? <strong>{row.orders}</strong> : row.orders),
    },
    {
      key: "collected",
      header: "Collected",
      align: "right",
      render: (row) =>
        row.total ? <strong>{money(s, row.collected)}</strong> : money(s, row.collected),
    },
  ];

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <strong style={{ fontSize: 16 }}>Shop report</strong>
          <p className="jd-lead" style={{ margin: "4px 0 0" }}>
            Lifetime snapshot — orders, ratings, pickup/delivery punctuality, earnings,
            payment mix and tips. Generated {model.generatedAt}.
          </p>
        </div>
        <Button onClick={onDownload}>Download PDF</Button>
      </div>

      <div style={CARD}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--brand, #00028B)",
              }}
            >
              Just Dry Cleaners · Shop report
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{shop.name}</div>
          </div>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 14,
            marginTop: 16,
            paddingTop: 16,
            borderTop: "1px solid #f1f4f8",
          }}
        >
          <IdentityChip label="Shop ID" value={String(shop.id)} />
          <IdentityChip label="Owner" value={shop.owner} />
          <IdentityChip label="Zone" value={shop.zone} />
          <IdentityChip label="Established" value={shop.established} />
          <IdentityChip label="Phone" value={shop.phone} />
          <IdentityChip label="Email" value={shop.email} />
          <div style={{ gridColumn: "1 / -1" }}>
            <IdentityChip label="Address" value={shop.address} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <SectionTitle>Orders overview</SectionTitle>
        <DirectoryMetrics
          items={[
            { label: "All orders", value: o.total, tone: "brand" },
            { label: "Pending", value: o.pending, tone: "warning" },
            { label: "Completed", value: o.completed, tone: "success" },
            { label: "Completion rate", value: `${o.completionRate}%`, tone: "navy" },
            { label: "Open / in progress", value: o.open, tone: "neutral" },
            {
              label: "Cancelled",
              value: o.cancelled,
              tone: "danger",
              hint: money(s, e.cancelledValue),
            },
            {
              label: "Refunded",
              value: o.refunded,
              tone: "danger",
              hint: money(s, e.refundedValue),
            },
            { label: "Avg. order value", value: money(s, e.avgOrderValue), tone: "navy" },
          ]}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        <RatingsCard ratings={model.ratings} />
        <div style={CARD}>
          <SectionTitle>Payment mix</SectionTitle>
          <div style={{ marginTop: 12 }}>
            <Table
              columns={paymentColumns}
              rows={paymentRows}
              rowKey={(row) => row.key}
              empty="No collected orders yet."
            />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <SectionTitle hint="Early = before the booked slot · On time = inside the window · Late = after the slot">
          Pickup &amp; delivery punctuality
        </SectionTitle>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <PunctualityCard
            title="Pickups"
            completed={p.pickupsCompleted}
            early={p.earlyPickups}
            onTime={p.onTimePickups}
            late={p.latePickups}
          />
          <PunctualityCard
            title="Deliveries"
            completed={p.deliveriesCompleted}
            early={p.earlyDeliveries}
            onTime={p.onTimeDeliveries}
            late={p.lateDeliveries}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <SectionTitle>Earnings</SectionTitle>
        <DirectoryMetrics
          items={[
            {
              label: "Gross revenue",
              value: money(s, e.grossRevenue),
              tone: "navy",
              hint: "Collected orders, net of refunds",
            },
            {
              label: "Shop net",
              value: money(s, e.shopNet),
              tone: "success",
              hint: "After commission, fees & driver pay",
            },
            {
              label: "Platform take",
              value: money(s, e.platformTake),
              tone: "warning",
              hint: "Service fee + zone commission",
            },
          ]}
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          <div style={CARD}>
            <strong>Collected by channel</strong>
            <div style={{ marginTop: 8 }}>
              <Row label="Card collected" value={money(s, e.cardGross)} sub={`${e.cardOrders} orders`} />
              <Row label="Cash collected" value={money(s, e.cashGross)} sub={`${e.cashOrders} orders`} />
              <Row
                label="Total collected"
                value={money(s, e.cardGross + e.cashGross)}
                sub={`${e.cardOrders + e.cashOrders} orders`}
                strong
              />
            </div>
          </div>
          <div style={CARD}>
            <strong>Shop earnings ledger</strong>
            <div style={{ marginTop: 8 }}>
              {wallet ? (
                <>
                  <Row
                    label="Total shop earnings (lifetime)"
                    value={money(s, wallet.totalEarnings)}
                    strong
                  />
                  <Row label="— Card earnings" value={money(s, wallet.totalEarningsCard)} />
                  <Row label="— Cash earnings" value={money(s, wallet.totalEarningsCash)} />
                  <Row label="Available in wallet" value={money(s, wallet.availableWallet)} />
                  <Row label="Withdrawn to bank" value={money(s, wallet.withdrawnToBank)} />
                  <Row label="Cash remitted to platform" value={money(s, wallet.cashRemitted)} />
                </>
              ) : (
                <p className="jd-lead" style={{ margin: "8px 0 0" }}>
                  Wallet summary unavailable for this shop.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        <SectionTitle>Tips</SectionTitle>
        <DirectoryMetrics
          items={[
            { label: "Total tips", value: money(s, e.totalTips), tone: "brand" },
            { label: "Card tips", value: money(s, e.cardTips), tone: "navy" },
            { label: "Cash tips", value: money(s, e.cashTips), tone: "success" },
            {
              label: "Extra (post-order) tips",
              value: money(s, e.extraTips),
              tone: "warning",
            },
          ]}
        />
      </div>

      <p className="jd-lead" style={{ margin: 0, fontSize: 12 }}>
        This report reflects lifetime collected activity for this shop. Figures exclude fully
        refunded and pending orders from revenue. Use Download PDF for the print-ready A4
        version.
      </p>
    </div>
  );
}
