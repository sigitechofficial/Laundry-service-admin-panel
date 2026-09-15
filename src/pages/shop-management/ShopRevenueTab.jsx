import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Table } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import { useGetShopRevenueQuery } from "../../store/services/api";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import {
  DATE_TIME_FORMAT,
  formatBookingWindow,
  formatDate,
  formatMoney,
} from "../../utilities/formatters";
import {
  DirectoryDateInput,
  DirectoryDotPill,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { downloadReportCsv, shopSettlementPath } from "../reports/reportUi.js";
import { buildShopOrderFinanceColumns, PunctualityMetrics } from "./shopOrderFinanceColumns";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "last_7_days", label: "Last 7 days" },
  { value: "last_30_days", label: "Last 30 days" },
  { value: "this_week", label: "This week" },
  { value: "this_month", label: "This month" },
  { value: "this_year", label: "This year" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom" },
];

const LOG_TABS = [
  { value: "orders", label: "Orders" },
  { value: "withdrawals", label: "Withdrawals" },
  { value: "payouts", label: "Payouts" },
  { value: "remittances", label: "Cash remitted" },
];

function money(value, symbol) {
  return formatMoney(value, symbol);
}

function deltaHint(pct) {
  if (pct == null) return "No prior period";
  const n = Number(pct);
  if (!Number.isFinite(n)) return undefined;
  if (n === 0) return "Flat vs previous period";
  return `${n > 0 ? "+" : ""}${n}% vs previous period`;
}

function statusTone(status) {
  const key = String(status || "").toLowerCase();
  if (key === "completed" || key === "paid") return "success";
  if (key === "pending") return "warning";
  if (key === "failed") return "danger";
  return "neutral";
}

function Line({ label, value, hint, strong, tone }) {
  const valueColor =
    tone === "in"
      ? "#065f46"
      : tone === "out"
        ? "#92400e"
        : tone === "muted"
          ? "#6b7280"
          : "#111827";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: strong ? "10px 0" : "7px 0",
        borderBottom: strong ? "1px solid #e6e9f0" : "1px solid #f1f4f8",
        fontWeight: strong ? 700 : 500,
      }}
    >
      <div>
        <div>{label}</div>
        {hint ? (
          <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{hint}</div>
        ) : null}
      </div>
      <div
        style={{
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
          color: valueColor,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#6b7280",
          marginTop: 12,
        }}
      >
        {title}
      </div>
      {subtitle ? (
        <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{subtitle}</div>
      ) : null}
    </div>
  );
}

function HighlightStat({ label, value, hint, tone = "navy" }) {
  const bg =
    tone === "success"
      ? "#ecfdf5"
      : tone === "warning"
        ? "#fffbeb"
        : "#eef2ff";
  const border =
    tone === "success"
      ? "#a7f3d0"
      : tone === "warning"
        ? "#fde68a"
        : "#c7d2fe";
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: bg,
        border: `1px solid ${border}`,
        marginTop: 10,
      }}
    >
      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>
        {value}
      </div>
      {hint ? (
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{hint}</div>
      ) : null}
    </div>
  );
}

export default function ShopRevenueTab({ shopId, fallbackSymbol = "£" }) {
  const navigate = useNavigate();
  const [period, setPeriod] = useState("this_month");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [logTab, setLogTab] = useState("orders");

  const queryArgs = useMemo(() => {
    const params = { shopId, period, page, limit: 20 };
    if (period === "custom") {
      params.startDate = startDate;
      params.endDate = endDate;
    }
    return params;
  }, [endDate, page, period, shopId, startDate]);

  const skipCustom = period === "custom" && (!startDate || !endDate);
  const { data, isLoading, isError, error, refetch, isFetching } = useGetShopRevenueQuery(
    queryArgs,
    { skip: !shopId || skipCustom }
  );

  const payload = data?.data || {};
  const symbol = payload.currency?.symbol || fallbackSymbol;
  const periodTotals = payload.period || {};
  const lifetime = payload.lifetime || {};
  const vs = periodTotals.vsPrevious || {};
  const balances = payload.balances;
  const walletStatus = payload.walletStatus || {};
  const lastEvents = payload.lastEvents || {};
  const periodFinance = payload.periodFinance || {};
  const series = Array.isArray(payload.series) ? payload.series : [];
  const orders = Array.isArray(payload.orders) ? payload.orders : [];
  const pagination = payload.ordersPagination || { page: 1, totalPages: 0, total: 0 };
  const logs = payload.logs || {};
  const filters = payload.filters || {};
  const maxBar = Math.max(1, ...series.map((row) => Number(row.grossRevenue) || 0));
  const totalEarnings =
    balances?.totalEarnings != null ? balances.totalEarnings : lifetime.shopNet;
  const availableBalance = balances?.availableWallet;
  const withdrawnLifetime = balances?.withdrawnToBank;

  const orderColumns = useMemo(
    () =>
      buildShopOrderFinanceColumns({
        symbol,
        onOpenOrder: (row) => {
          if (row?.id) navigate(`/orders/details/${row.id}`);
        },
      }),
    [navigate, symbol]
  );

  const ledgerColumns = useMemo(
    () => [
      {
        key: "when",
        header: "Date & time",
        render: (row) => formatDate(row.createdAt, DATE_TIME_FORMAT),
      },
      {
        key: "amount",
        header: "Amount",
        render: (row) => (
          <DirectoryMoney>
            {row.type === "debit" ? "−" : "+"}
            {money(row.amount, symbol)}
          </DirectoryMoney>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <DirectoryDotPill tone={statusTone(row.status)}>{row.status || "—"}</DirectoryDotPill>
        ),
      },
      {
        key: "ref",
        header: "Reference",
        render: (row) => row.stripeTransferId || row.orderTrackId || row.description || "—",
      },
      {
        key: "note",
        header: "Note",
        render: (row) => row.failureReason || row.description || "—",
      },
    ],
    [symbol]
  );

  const exportCurrent = () => {
    if (logTab === "orders") {
      downloadReportCsv(
        `shop-${shopId}-orders-${filters.period || period}.csv`,
        [
          { key: "orderTrackId", header: "Order" },
          {
            key: "collectionWindow",
            header: "Collection",
            value: (row) =>
              formatBookingWindow(
                row.collectionDate,
                row.collectionTimeFrom,
                row.collectionTimeTo
              ),
          },
          {
            key: "deliveryWindow",
            header: "Delivery",
            value: (row) =>
              formatBookingWindow(
                row.deliveryDate,
                row.deliveryTimeFrom,
                row.deliveryTimeTo
              ),
          },
          { key: "pickupTiming", header: "Pickup timing" },
          { key: "deliveryTiming", header: "Delivery timing" },
          { key: "status", header: "Status" },
          { key: "customer", header: "Customer" },
          { key: "paymentType", header: "Pay" },
          { key: "gross", header: "Gross" },
          { key: "shopNet", header: "Shop net" },
          { key: "serviceCharge", header: "Service fee (platform)" },
          { key: "platformCommission", header: "Commission (platform)" },
          { key: "platformTake", header: "Platform total" },
        ],
        orders
      );
      return;
    }
    const rows = logs[logTab] || [];
    downloadReportCsv(
      `shop-${shopId}-${logTab}-${filters.period || period}.csv`,
      [
        { key: "createdAt", header: "Date" },
        { key: "amount", header: "Amount" },
        { key: "status", header: "Status" },
        { key: "stripeTransferId", header: "Stripe" },
        { key: "description", header: "Note" },
      ],
      rows
    );
  };

  if (isLoading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        <Delay />
        <p className="jd-lead">Loading shop revenue…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div style={CARD}>
        <p className="jd-lead" style={{ margin: "0 0 12px" }}>
          {getApiErrorMessage(error, "Could not load shop revenue.")}
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const ledgerRows =
    logTab === "withdrawals"
      ? logs.withdrawals || []
      : logTab === "payouts"
        ? logs.payouts || []
        : logTab === "remittances"
          ? logs.remittances || []
          : [];

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {PERIODS.map((item) => (
          <Button
            key={item.value}
            size="sm"
            variant={period === item.value ? "primary" : "secondary"}
            onClick={() => {
              setPeriod(item.value);
              setPage(1);
            }}
          >
            {item.label}
          </Button>
        ))}
        {isFetching ? <span className="jd-lead">Updating…</span> : null}
      </div>

      {period === "custom" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <DirectoryDateInput
            id="shop-rev-from"
            value={startDate}
            onChange={(value) => {
              setStartDate(value);
              setPage(1);
            }}
            aria-label="From date"
          />
          <DirectoryDateInput
            id="shop-rev-to"
            value={endDate}
            onChange={(value) => {
              setEndDate(value);
              setPage(1);
            }}
            aria-label="To date"
          />
          {skipCustom ? (
            <span className="jd-lead">Pick both dates to load the range.</span>
          ) : null}
        </div>
      ) : null}

      <p className="jd-lead" style={{ margin: 0 }}>
        {filters.startDate && filters.endDate
          ? `Collected ${filters.startDate} to ${filters.endDate}. Lifetime earnings and wallet balances below are live, not date-filtered.`
          : "All collected orders. Lifetime earnings and wallet balances below are live, not date-filtered."}
      </p>

      <DirectoryMetrics
        items={[
          {
            label: "Total earnings",
            value: money(totalEarnings, symbol),
            tone: "success",
            hint:
              balances?.totalEarnings != null
                ? "Lifetime commission (paid orders)"
                : "Lifetime shop net from collected orders",
          },
          {
            label: "Available balance",
            value:
              availableBalance == null ? "—" : money(availableBalance, symbol),
            tone: "navy",
            hint: balances?.canWithdraw
              ? "Ready to withdraw"
              : balances
                ? "Waiting on Connect / min amount"
                : "No owner wallet",
          },
          {
            label: "Withdrawn",
            value:
              withdrawnLifetime == null ? "—" : money(withdrawnLifetime, symbol),
            tone: "brand",
            hint: lastEvents.lastWithdrawAt
              ? `Last ${formatDate(lastEvents.lastWithdrawAt, DATE_TIME_FORMAT)}`
              : "Lifetime bank transfers",
          },
          {
            label: "Period shop net",
            value: money(periodTotals.shopNet, symbol),
            tone: "warning",
            hint: deltaHint(vs.shopNetPct),
          },
          {
            label: "Period gross",
            value: money(periodTotals.grossRevenue, symbol),
            tone: "navy",
            hint: deltaHint(vs.grossRevenuePct),
          },
          {
            label: "Collected orders",
            value: periodTotals.ordersCompleted ?? 0,
            tone: "brand",
            hint: deltaHint(vs.ordersPct),
          },
          {
            label: "Avg order",
            value: money(periodTotals.avgOrderValue, symbol),
            tone: "warning",
          },
          {
            label: "Platform take",
            value: money(periodTotals.platformTake, symbol),
            tone: "navy",
            hint: "Service fee + zone commission (admin)",
          },
          {
            label: "Refunded",
            value: money(periodTotals.refundedValue, symbol),
            tone: "danger",
            hint: periodTotals.refundedOrders
              ? `${periodTotals.refundedOrders} order${periodTotals.refundedOrders === 1 ? "" : "s"} with customer refunds`
              : "Customer refunds in this period",
          },
        ]}
      />
      {payload.punctuality ? (
        <>
          <p className="jd-lead" style={{ margin: 0 }}>
            Pickup and delivery timing in this date range. Early = before the booked
            slot, on time = inside the window, late = after the slot.
          </p>
          <DirectoryMetrics
            items={
              PunctualityMetrics({
                stats: payload.punctuality,
                prefix: "",
              }) || []
            }
          />
        </>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
        <div style={CARD}>
          <strong>Period breakdown</strong>
          <p className="jd-lead" style={{ margin: "6px 0 0" }}>
            What customers paid in this date range, and how that splits between shop, platform, and drivers.
          </p>

          <HighlightStat
            label="Shop net this period"
            value={money(periodTotals.shopNet, symbol)}
            hint={deltaHint(vs.shopNetPct) || "After platform fee, commission & driver pay"}
            tone="success"
          />
          <HighlightStat
            label="Platform take this period"
            value={money(periodTotals.platformTake, symbol)}
            hint="Service fee + zone commission — admin revenue, not shop income"
            tone="warning"
          />

          <SectionTitle
            title="Customer paid"
            subtitle="Gross amounts from collected orders"
          />
          <Line label="Laundry / services" value={money(periodTotals.laundrySubtotal, symbol)} tone="in" />
          <Line
            label="Service fee (customer paid)"
            value={money(periodTotals.serviceCharge, symbol)}
            hint="This amount is kept by the platform, not the shop"
          />
          <Line label="Booking tips" value={money(periodTotals.bookingTips, symbol)} />
          <Line label="Extra tips after delivery" value={money(periodTotals.extraTips, symbol)} />
          <Line label="Card gross" value={money(periodTotals.cardGross, symbol)} />
          <Line label="Cash gross" value={money(periodTotals.cashGross, symbol)} />

          <SectionTitle
            title="Platform (admin)"
            subtitle="Service fee and commission stay with the platform"
          />
          <Line label="Service fee" value={money(periodTotals.serviceCharge, symbol)} tone="in" />
          <Line
            label="Zone commission"
            value={money(periodTotals.platformCommission, symbol)}
            tone="in"
          />
          <Line
            label="Platform take"
            value={money(periodTotals.platformTake, symbol)}
            strong
          />

          <SectionTitle
            title="Taken out of shop net"
            subtitle="Deductions before the shop share"
          />
          <Line label="Discounts" value={`−${money(periodTotals.discount, symbol)}`} tone="out" />
          <Line
            label="Driver pay"
            value={`−${money(periodTotals.driverEarnings, symbol)}`}
            tone="out"
          />

          <SectionTitle title="Other in this range" />
          <Line label="Reschedule charges" value={money(periodTotals.rescheduleCharge, symbol)} />
          <Line
            label="Cancelled (not revenue)"
            value={money(periodTotals.cancelledValue, symbol)}
            hint={`${periodTotals.cancelledOrders || 0} orders`}
            tone="muted"
          />
          <Line
            label="Open orders still in progress"
            value={periodTotals.openOrders ?? 0}
            hint="Not counted in collected revenue yet"
            tone="muted"
          />

          <SectionTitle
            title="Money moved in this range"
            subtitle="Wallet / settlement activity during the selected dates"
          />
          <Line label="Withdrawn" value={money(periodFinance.withdrawn, symbol)} />
          <Line label="Payouts released" value={money(periodFinance.payoutsReleased, symbol)} />
          <Line
            label="Cash remitted"
            value={money(periodFinance.cashRemitted, symbol)}
            strong
          />
          <Line
            label="Lifetime collected net"
            value={money(lifetime.shopNet, symbol)}
            hint={`${lifetime.ordersCompleted || 0} collected orders all-time`}
            strong
          />
        </div>

        <div style={CARD}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <strong>Live wallet & settlement</strong>
              <p className="jd-lead" style={{ margin: "6px 0 0" }}>
                Current balances — not filtered by the period chips above.
              </p>
            </div>
            {shopSettlementPath(shopId) ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(shopSettlementPath(shopId))}
              >
                Open settlement
              </Button>
            ) : null}
          </div>
          {balances ? (
            <div>
              <HighlightStat
                label="Available to withdraw"
                value={money(balances.availableWallet, symbol)}
                hint={
                  lastEvents.lastWithdrawAt
                    ? `Last withdraw ${formatDate(lastEvents.lastWithdrawAt, DATE_TIME_FORMAT)}`
                    : balances.canWithdraw
                      ? "Ready for agent withdrawal request"
                      : "Waiting on Connect / min amount"
                }
                tone="success"
              />

              <SectionTitle title="Earnings" subtitle="Lifetime shop commission" />
              <Line
                label="Total earnings"
                value={money(balances.totalEarnings, symbol)}
                hint={`Cash ${money(balances.totalEarningsCash, symbol)} · Card ${money(balances.totalEarningsCard, symbol)}`}
                strong
              />
              <Line
                label="Still owed by platform"
                value={money(balances.stillOwedByPlatform, symbol)}
                hint="Card earnings not released to the wallet yet"
                tone="out"
              />
              <Line
                label="Released to wallet"
                value={money(balances.releasedToWallet, symbol)}
                hint={
                  lastEvents.lastPayoutAt
                    ? `Last payout ${formatDate(lastEvents.lastPayoutAt, DATE_TIME_FORMAT)}`
                    : "No admin payout yet"
                }
              />

              <SectionTitle title="Withdrawals" />
              <Line label="Pending withdrawal" value={money(balances.pendingWithdrawals, symbol)} />
              <Line
                label="Withdrawn to bank"
                value={money(balances.withdrawnToBank, symbol)}
              />

              <SectionTitle title="Cash with shop" subtitle="Cash orders & remittances" />
              <Line
                label="Cash still due to platform"
                value={money(balances.cashDueToPlatform, symbol)}
                hint={
                  lastEvents.lastCashRemittedAt
                    ? `Last remitted ${formatDate(lastEvents.lastCashRemittedAt, DATE_TIME_FORMAT)}`
                    : "No cash remittance yet"
                }
              />
              <Line
                label="Pending remittance"
                value={money(balances.cashPendingRemittance, symbol)}
              />
              <Line label="Cash in till" value={money(balances.cashInTill, symbol)} />

              <SectionTitle title="Payout account" />
              <Line
                label="Stripe Connect"
                value={balances.connectAccountConnected ? "Connected" : "Not connected"}
                tone={balances.connectAccountConnected ? "in" : "out"}
                strong
              />
            </div>
          ) : (
            <p className="jd-lead" style={{ margin: "12px 0 0" }}>
              {walletStatus.error
                ? `Wallet could not be loaded: ${walletStatus.error}`
                : walletStatus.hasOwner === false
                  ? "No shop-owner account is linked to this shop yet."
                  : "No shop-owner wallet is linked to this shop yet."}
            </p>
          )}
        </div>
      </div>

      <div style={CARD}>
        <strong>Collected revenue by day</strong>
        <p className="jd-lead" style={{ margin: "6px 0 0" }}>
          Daily shop gross from collected orders in the selected period.
        </p>
        {series.length ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160, marginTop: 16, overflowX: "auto" }}>
            {series.map((row) => (
              <div key={row.date} style={{ minWidth: 28, flex: "1 0 28px", textAlign: "center" }}>
                <div className="jd-lead" style={{ fontSize: 11 }}>
                  {money(row.grossRevenue, symbol)}
                </div>
                <div
                  title={`${row.date}: ${money(row.grossRevenue, symbol)} · ${row.ordersCompleted} orders`}
                  style={{
                    height: `${Math.max((Number(row.grossRevenue) / maxBar) * 100, 8)}%`,
                    minHeight: 8,
                    background: "var(--brand, #00028B)",
                    borderRadius: "8px 8px 0 0",
                    margin: "6px 0",
                  }}
                />
                <div style={{ fontSize: 10, color: "#6b7280" }}>{String(row.date || "").slice(5)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              marginTop: 16,
              padding: "28px 16px",
              borderRadius: 12,
              background: "#f8fafc",
              border: "1px dashed #d1d5db",
              textAlign: "center",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600 }}>No collected orders in this range</p>
            <p className="jd-lead" style={{ margin: "8px 0 0" }}>
              Try Last 30 days or All time — only collected (completed) orders appear here.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        {LOG_TABS.map((tab) => (
          <Button
            key={tab.value}
            size="sm"
            variant={logTab === tab.value ? "primary" : "secondary"}
            onClick={() => setLogTab(tab.value)}
          >
            {tab.label}
            {tab.value !== "orders"
              ? ` (${(logs[tab.value] || []).length})`
              : pagination.total
                ? ` (${pagination.total})`
                : ""}
          </Button>
        ))}
        <Button size="sm" variant="secondary" onClick={exportCurrent}>
          Export CSV
        </Button>
      </div>

      {logTab === "orders" ? (
        <DirectoryTableWrap
          footer={
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <p className="jd-lead" style={{ margin: 0 }}>
                Page {pagination.page || 1} of {pagination.totalPages || 1} ({pagination.total || 0} orders)
                {" · "}Collection and delivery windows, pickup/delivery timing, and platform
                take (fee + commission) match the shop Orders tab.
              </p>
              <Button
                size="sm"
                variant="secondary"
                disabled={(pagination.page || 1) <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={(pagination.page || 1) >= (pagination.totalPages || 1)}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          }
        >
          <Table
            columns={orderColumns}
            rows={orders}
            rowKey={(row) => row.id}
            empty="No collected orders in this range."
          />
        </DirectoryTableWrap>
      ) : (
        <DirectoryTableWrap>
          <Table
            columns={ledgerColumns}
            rows={ledgerRows}
            rowKey={(row) => row.id}
            empty={
              logTab === "withdrawals"
                ? "No withdrawals in this range."
                : logTab === "payouts"
                  ? "No admin payouts in this range."
                  : "No cash remittances in this range."
            }
          />
        </DirectoryTableWrap>
      )}

      <p className="jd-lead" style={{ margin: 0 }}>
        {payload.definitions?.totalEarnings ||
          "Total earnings are lifetime shop commission. Period chips only change collected order stats, the chart, and logs."}{" "}
        {payload.definitions?.withdrawn ||
          "Admin payout releases card earnings into the wallet. The agent withdraws to Stripe Connect after that."}
      </p>
    </div>
  );
}
