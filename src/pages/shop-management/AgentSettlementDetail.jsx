import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Field, Input, Modal, PageHeader, Table, Textarea } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import { DATE_TIME_FORMAT, formatAmount, formatDate } from "../../utilities/formatters";
import { CSV_EXPORT_MAX_ROWS, csvFormat } from "../../utilities/csvExport";
import { useCsvExport } from "../../hooks/useCsvExport";
import {
  DirectoryDotPill,
  DirectoryExportButton,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import {
  useGetAgentSettlementDetailQuery,
  useLazyGetAgentSettlementDetailQuery,
  useRecordAgentPayoutMutation,
  useRecordCashSettlementMutation,
} from "../../store/services/api";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { shopDetailPath, shopSettlementPath } from "../reports/reportUi";
import ShopPayoutAccountCard from "./ShopPayoutAccountCard";
import {
  AlreadySubmittedNotice,
  DisabledReason,
  RealMoneyCheck,
  SettlementFigures,
} from "./settlementActionParts";
import {
  NO_STRIPE_REASON,
  cashStillToRecord,
  figureAfter,
  parseSettlementAmount,
  settlementErrorMessage,
} from "./settlementMoney";

const CARD = {
  padding: 20,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const TAB_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 16,
};

const PAGE_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
  marginTop: 16,
};

const LEDGER_TONE = {
  cash_collected: "warning",
  cash_refunded: "info",
  cash_remitted: "success",
  booking_commission: "navy",
  commission_clawback: "danger",
  extra_tip: "success",
  extra_tip_clawback: "danger",
  admin_settlement: "neutral",
  agent_payout: "success",
  agent_withdrawal: "warning",
  payout: "neutral",
  customer_refund: "info",
};

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  failed: "neutral",
};

function money(amount, source) {
  return formatAmount(amount, source, { applyDefault: true });
}

const PENDING_REMITTANCES_PATH = "/shop-management/agent-settlement?tab=remittances";
const EMPTY_ACTION = { open: false, type: null, amount: "", note: "", confirmedReal: false };

/** Server caps: ledgerLimit ≤ 200, ordersLimit ≤ 100 (agentWalletService). */
const LEDGER_EXPORT_PAGE_SIZE = 200;
const ORDERS_EXPORT_PAGE_SIZE = 100;

const LEDGER_CSV_COLUMNS = [
  { header: "Date", value: (r) => csvFormat.dateTime(r.createdAt) },
  { header: "Type", value: (r) => r.label || r.referenceType || "" },
  { header: "Description", value: (r) => r.description || "" },
  { header: "Order", value: (r) => (r.bookingId ? r.orderTrackId || r.bookingId : "") },
  { header: "Money in", value: (r) => csvFormat.money(r.moneyIn) },
  { header: "Money out", value: (r) => csvFormat.money(r.moneyOut) },
  {
    header: "Balance after",
    value: (r) => csvFormat.money(r.balanceAfter ?? r.settlementBalanceAfter),
  },
  { header: "Status", value: (r) => r.status || "" },
];

const ORDERS_CSV_COLUMNS = [
  { header: "Date", value: (r) => csvFormat.dateTime(r.completedAt) },
  { header: "Order", value: (r) => r.orderTrackId || r.bookingId || "" },
  {
    header: "Channel",
    value: (r) => (r.mixed ? "Mixed" : r.channel === "cash" ? "Cash" : "Card"),
  },
  { header: "Order total", value: (r) => csvFormat.money(r.orderTotal) },
  { header: "Laundry / services", value: (r) => csvFormat.money(r.laundry) },
  { header: "Shop share", value: (r) => csvFormat.money(r.laundryCommission) },
  { header: "Booking tip", value: (r) => csvFormat.money(r.bookingTip) },
  { header: "Platform fee", value: (r) => csvFormat.money(r.serviceFee) },
  { header: "Admin commission", value: (r) => csvFormat.money(r.platformShare) },
  {
    header: "Admin take",
    value: (r) =>
      csvFormat.money(r.platformTake ?? Number(r.serviceFee || 0) + Number(r.platformShare || 0)),
  },
  {
    header: "Agent earning",
    value: (r) => csvFormat.money(r.isFullyRefunded ? 0 : r.commissionNet ?? r.commissionAmount),
  },
  { header: "Commission clawback", value: (r) => csvFormat.money(r.commissionClawbackAmount) },
  { header: "Extra tip", value: (r) => csvFormat.money(r.extraTipNet ?? r.extraTipAmount) },
  { header: "Extra tip clawback", value: (r) => csvFormat.money(r.extraTipClawbackAmount) },
  {
    header: "Cash collected",
    value: (r) => (r.channel === "cash" ? csvFormat.money(r.cashNet ?? r.cashCollectedAmount) : ""),
  },
  { header: "Cash refunded", value: (r) => csvFormat.money(r.cashRefundedAmount) },
  { header: "Fully refunded", value: (r) => csvFormat.bool(r.isFullyRefunded) },
];

/** One "who owes whom" figure with its one-line explanation. */
function OweLine({ title, text, extra, tone }) {
  const color = tone === "warning" ? "#92400e" : "#065f46";
  return (
    <div style={{ minWidth: 0 }}>
      <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}>
        {title}
      </p>
      <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#4b5563", lineHeight: 1.5 }}>{text}</p>
      {extra ? (
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>{extra}</p>
      ) : null}
    </div>
  );
}

function Line({ label, value, hint, strong, tone }) {
  const color = tone === "danger" ? "#c9403f" : tone === "success" ? "#1a8f5e" : "#111827";
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        padding: "7px 0",
        borderBottom: "1px solid #f1f4f8",
        alignItems: "flex-start",
      }}
    >
      <div>
        <div style={{ fontSize: 13, fontWeight: strong ? 700 : 500, color: "#1f2937" }}>{label}</div>
        {hint ? <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>{hint}</div> : null}
      </div>
      <div style={{ fontSize: 13, fontWeight: strong ? 700 : 600, color, whiteSpace: "nowrap" }}>
        {value}
      </div>
    </div>
  );
}

/** Receipt-style card — mirrors the agent app's order summary blocks. */
const RECEIPT_TONES = {
  plain: { bg: "#fff", border: "#e6e9f0", title: "#111827", text: "#1f2937", muted: "#6b7280" },
  success: { bg: "#ecfdf5", border: "#a7f3d0", title: "#065f46", text: "#065f46", muted: "#047857" },
  info: { bg: "#eff6ff", border: "#bfdbfe", title: "#1d4ed8", text: "#1e3a8a", muted: "#3b82f6" },
};

function ReceiptCard({ title, badge, note, tone = "plain", children }) {
  const t = RECEIPT_TONES[tone] || RECEIPT_TONES.plain;
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 14,
        border: `1px solid ${t.border}`,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.title }}>{title}</div>
        {badge ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: "3px 9px",
              borderRadius: 999,
              border: `1px solid ${t.border}`,
              background: tone === "plain" ? "#f8fafc" : "#fff",
              color: t.text,
            }}
          >
            {badge}
          </span>
        ) : null}
      </div>
      {note ? (
        <p style={{ margin: "6px 0 0", fontSize: 12, color: t.muted, lineHeight: 1.5 }}>{note}</p>
      ) : null}
      <div style={{ marginTop: 8 }}>{children}</div>
    </div>
  );
}

function ReceiptRow({ label, hint, value, strong, tone = "plain", negative }) {
  const t = RECEIPT_TONES[tone] || RECEIPT_TONES.plain;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 12,
        padding: strong ? "9px 0 2px" : "6px 0",
        borderTop: strong ? `1px solid ${t.border}` : "none",
        marginTop: strong ? 4 : 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: strong ? 700 : 500, color: t.text }}>{label}</div>
        {hint ? <div style={{ fontSize: 11.5, color: t.muted, marginTop: 1 }}>{hint}</div> : null}
      </div>
      <div
        style={{
          fontSize: strong ? 14.5 : 13.5,
          fontWeight: strong ? 800 : 600,
          color: negative ? "#b45309" : t.text,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {negative ? "−" : ""}
        {value}
      </div>
    </div>
  );
}

function ReceiptHighlight({ label, value, pill, sub, tone = "info" }) {
  const t = RECEIPT_TONES[tone] || RECEIPT_TONES.plain;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: t.title }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              background: tone === "success" ? "#059669" : "#1d4ed8",
              color: "#fff",
              fontWeight: 800,
              fontSize: 16,
              padding: "6px 12px",
              borderRadius: 10,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {value}
          </span>
          {pill ? (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                padding: "3px 9px",
                borderRadius: 999,
                border: `1px solid ${t.border}`,
                background: "#fff",
                color: t.text,
              }}
            >
              {pill}
            </span>
          ) : null}
        </div>
      </div>
      {sub ? <p style={{ margin: "8px 0 0", fontSize: 12.5, color: t.muted }}>{sub}</p> : null}
    </div>
  );
}

/**
 * Calculation row: operator column (+ − = ±) so admin can re-do the arithmetic
 * by hand. `op="eq"` rows are subtotals (bold, ruled, tinted).
 */
const STEP_OPS = { add: "+", sub: "−", eq: "=", pm: "±", none: "" };
const STEP_OP_COLOR = { add: "#047857", sub: "#b45309", eq: "#111827", pm: "#4b5563", none: "transparent" };

function StepRow({ op = "none", label, hint, value, highlight, tone = "plain", muted }) {
  const t = RECEIPT_TONES[tone] || RECEIPT_TONES.plain;
  const isEq = op === "eq";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "18px minmax(0, 1fr) auto",
        alignItems: "flex-start",
        columnGap: 10,
        padding: isEq ? "9px 8px" : "6px 8px",
        margin: isEq ? "4px -8px 0" : "0 -8px",
        borderTop: isEq ? `1px solid ${highlight ? "#c7d2fe" : t.border}` : "none",
        background: highlight ? "#eef2ff" : isEq ? "rgba(15, 23, 42, 0.035)" : "transparent",
        borderRadius: isEq ? 8 : 0,
        opacity: muted ? 0.75 : 1,
      }}
    >
      <span
        aria-hidden
        style={{
          fontSize: 14,
          fontWeight: 800,
          lineHeight: "18px",
          color: STEP_OP_COLOR[op] || "#4b5563",
          fontVariantNumeric: "tabular-nums",
          textAlign: "center",
        }}
      >
        {STEP_OPS[op] ?? ""}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: isEq ? 700 : 500, color: highlight ? "#1e1b4b" : t.text, lineHeight: "18px" }}>
          {label}
        </div>
        {hint ? <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, lineHeight: 1.4 }}>{hint}</div> : null}
      </div>
      <div
        style={{
          fontSize: isEq ? 14.5 : 13.5,
          fontWeight: isEq ? 800 : 600,
          color: op === "sub" ? "#b45309" : highlight ? "#312e81" : t.text,
          whiteSpace: "nowrap",
          fontVariantNumeric: "tabular-nums",
          lineHeight: "18px",
        }}
      >
        {op === "sub" ? "−" : ""}
        {value}
      </div>
    </div>
  );
}

function StepCard({ eyebrow, eyebrowColor = "#64748b", title, headline, headlineColor, note, tone = "plain", children, footer }) {
  const t = RECEIPT_TONES[tone] || RECEIPT_TONES.plain;
  return (
    <div
      style={{
        ...CARD,
        marginBottom: 0,
        border: `1px solid ${t.border}`,
        background: t.bg,
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
      }}
    >
      {eyebrow ? (
        <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: eyebrowColor, textTransform: "uppercase" }}>
          {eyebrow}
        </p>
      ) : null}
      {title ? <div style={{ fontSize: 14, fontWeight: 700, color: t.title }}>{title}</div> : null}
      {headline != null ? (
        <p style={{ margin: "0 0 10px", fontSize: 28, fontWeight: 800, color: headlineColor || t.title, fontVariantNumeric: "tabular-nums" }}>
          {headline}
        </p>
      ) : null}
      {note ? <p style={{ margin: "0 0 8px", fontSize: 12, color: t.muted, lineHeight: 1.5 }}>{note}</p> : null}
      <div>{children}</div>
      {footer ? <div style={{ marginTop: 12 }}>{footer}</div> : null}
    </div>
  );
}

function FootStat({ label, value }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "#6b7280" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1f2937", fontVariantNumeric: "tabular-nums" }}>{value}</div>
    </div>
  );
}

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const r2 = (v) => Math.round(num(v) * 100) / 100;

/** Normalise the settlement report so older API payloads still reconcile. */
function normalizeReport(report) {
  if (!report) return null;
  const laundry = num(report.laundry);
  const serviceFee = num(report.serviceFee);
  const bookingTips = num(report.bookingTips);
  const discount = num(report.discount);
  const refunded = num(report.refunded);
  const gross = num(report.gross);
  const orderTotal =
    report.orderTotal != null
      ? num(report.orderTotal)
      : r2(Math.max(laundry + serviceFee + bookingTips, gross + discount));
  const customersPaidNet =
    report.customersPaidNet != null
      ? num(report.customersPaidNet)
      : report.orderTotal != null
        ? r2(Math.max(0, orderTotal - discount - refunded))
        : gross;
  const shopNet = num(report.shopNet);
  const platformCommission = num(report.platformCommission);
  const driverEarnings = num(report.driverEarnings);
  const rescheduleCharges = num(report.rescheduleCharges);
  const splitTotal = r2(shopNet + platformCommission + serviceFee + driverEarnings + rescheduleCharges);
  return {
    ordersPaid: Number(report.ordersPaid || 0),
    laundry,
    serviceFee,
    bookingTips,
    orderTotal,
    discount,
    refunded,
    customersPaidNet,
    paidAtBooking: num(report.paidAtBooking),
    balanceAtDelivery: gross,
    shopNet,
    platformCommission,
    driverEarnings,
    rescheduleCharges,
    platformTake: report.platformTake != null ? num(report.platformTake) : r2(serviceFee + platformCommission),
    splitTotal,
    splitDifference: r2(splitTotal - customersPaidNet),
  };
}

export default function AgentSettlementDetail() {
  const { id: shopId } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToaster();
  const [tab, setTab] = useState("statement");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerRail, setLedgerRail] = useState("");
  const [action, setAction] = useState(EMPTY_ACTION);
  const submittingRef = useRef(false);

  const { data, isLoading, isError, error: loadError, refetch } = useGetAgentSettlementDetailQuery(
    {
      shopId,
      ordersPage,
      ordersLimit: 20,
      ledgerPage,
      ledgerLimit: 20,
      ledgerRail: ledgerRail || undefined,
    },
    { skip: !shopId }
  );
  const [recordCash, { isLoading: recordingCash }] = useRecordCashSettlementMutation();
  const [recordPayout, { isLoading: recordingPayout }] = useRecordAgentPayoutMutation();
  const [fetchSettlementPage] = useLazyGetAgentSettlementDetailQuery();

  const detail = data?.data;
  const agent = detail?.agent || {};
  const shop = detail?.shop || {};
  const canonicalShopId = detail?.identity?.shopId ?? shop.id;
  const summary = useMemo(() => detail?.summary || {}, [detail]);
  const rails = summary.rails || {};
  const cashRail = rails.cashFromAgent || {};
  const payRail = rails.payableToAgent || {};
  const refundRail = rails.refunds || {};
  const orders = detail?.orders || [];
  const ordersPagination = detail?.ordersPagination || {};
  const remittances = detail?.remittances || [];
  const ledger = detail?.ledger || [];
  const ledgerPagination = detail?.ledgerPagination || {};
  const statement = detail?.statement || {};
  const activity = detail?.recentActivity || [];
  const formulas = detail?.formulas || {};
  const earningsReport = detail?.earningsReport || null;
  const report = useMemo(() => normalizeReport(earningsReport), [earningsReport]);

  useEffect(() => {
    const canonical = shopSettlementPath(canonicalShopId);
    if (!canonical || !shopId || String(canonicalShopId) === String(shopId)) return;
    navigate(canonical, { replace: true });
  }, [canonicalShopId, navigate, shopId]);

  const ordersTableData = useMemo(
    () => orders.map((row, index) => ({ ...row, rowKey: `order-${row.bookingId}-${index}` })),
    [orders]
  );
  const ledgerTableData = useMemo(
    () => ledger.map((row, index) => ({ ...row, rowKey: `ledger-${row.id}-${index}` })),
    [ledger]
  );

  const channelReportRows = useMemo(() => {
    if (!earningsReport) return [];
    return [
      { key: "card", channel: "Card", ...earningsReport.card },
      { key: "cash", channel: "Cash", ...earningsReport.cash },
      {
        key: "mixed",
        channel: "Mixed (card + cash balance)",
        ...earningsReport.mixed,
      },
    ];
  }, [earningsReport]);

  const orderColumns = useMemo(
    () => [
      {
        key: "orderTrackId",
        header: "Order",
        render: (row) => (
          <button
            type="button"
            onClick={() => navigate(`/orders/details/${row.bookingId}`)}
            style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}
          >
            <DirectoryIdentity
              name={`#${row.orderTrackId}`}
              meta={row.completedAt ? formatDate(row.completedAt, DATE_TIME_FORMAT) : "—"}
            />
          </button>
        ),
      },
      {
        key: "channel",
        header: "Channel",
        render: (row) => (
          <DirectoryDotPill
            tone={row.mixed ? "info" : row.channel === "cash" ? "warning" : "navy"}
          >
            {row.mixed ? "Mixed" : row.channel === "cash" ? "Cash" : "Card"}
          </DirectoryDotPill>
        ),
      },
      {
        key: "split",
        header: "How this order split",
        render: (row) => (
          <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.45 }}>
            <div>Total {money(row.orderTotal, summary)}</div>
            <div>Laundry / services {money(row.laundry, summary)}</div>
            <div>Shop share {money(row.laundryCommission, summary)}</div>
            <div>Booking tip {money(row.bookingTip, summary)}</div>
            <div>Platform fee {money(row.serviceFee, summary)}</div>
            <div>Admin commission {money(row.platformShare, summary)}</div>
            <div>Admin take {money(row.platformTake ?? Number(row.serviceFee || 0) + Number(row.platformShare || 0), summary)}</div>
          </div>
        ),
      },
      {
        key: "commissionAmount",
        header: "Agent earning",
        render: (row) => (
          <DirectoryMoney>
            {row.isFullyRefunded ? (
              <>
                {money(0, summary)}
                <span style={{ display: "block", fontSize: 11, color: "#c9403f", fontWeight: 600 }}>
                  Fully refunded
                </span>
              </>
            ) : (
              <>
                {money(row.commissionNet ?? row.commissionAmount, summary)}
                {Number(row.commissionClawbackAmount || 0) > 0 ? (
                  <span style={{ display: "block", fontSize: 11, color: "#c9403f", fontWeight: 500 }}>
                    Earned {money(row.commissionAmount, summary)} · clawback −
                    {money(row.commissionClawbackAmount, summary)}
                  </span>
                ) : null}
              </>
            )}
          </DirectoryMoney>
        ),
      },
      {
        key: "extraTipAmount",
        header: "Extra tip",
        render: (row) =>
          Number(row.extraTipAmount || 0) > 0 || Number(row.extraTipClawbackAmount || 0) > 0 ? (
            <DirectoryMoney>
              {money(row.extraTipNet ?? row.extraTipAmount, summary)}
              {Number(row.extraTipClawbackAmount || 0) > 0 ? (
                <span style={{ display: "block", fontSize: 11, color: "#c9403f", fontWeight: 500 }}>
                  Added {money(row.extraTipAmount, summary)} · clawback −
                  {money(row.extraTipClawbackAmount, summary)}
                </span>
              ) : null}
            </DirectoryMoney>
          ) : (
            "—"
          ),
      },
      {
        key: "cashCollectedAmount",
        header: "Cash",
        render: (row) =>
          row.channel === "cash" ? (
            <DirectoryMoney>
              {money(row.cashNet ?? row.cashCollectedAmount, summary)}
              {Number(row.cashRefundedAmount || 0) > 0 ? (
                <span style={{ display: "block", fontSize: 11, color: "#4F46E5", fontWeight: 500 }}>
                  Collected {money(row.cashCollectedAmount, summary)} · refunded −
                  {money(row.cashRefundedAmount, summary)}
                </span>
              ) : null}
            </DirectoryMoney>
          ) : (
            "—"
          ),
      },
    ],
    [navigate, summary]
  );

  const remittanceColumns = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Submitted",
        render: (row) =>
          row.createdAt ? formatDate(row.createdAt, DATE_TIME_FORMAT) : "—",
      },
      {
        key: "amount",
        header: "Amount",
        render: (row) => money(row.amount, summary),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <div>
            <DirectoryDotPill
              tone={
                row.status === "completed"
                  ? "success"
                  : row.status === "failed"
                    ? "danger"
                    : "warning"
              }
            >
              {row.status === "completed"
                ? "Confirmed"
                : row.status === "failed"
                  ? "Rejected"
                  : "Pending"}
            </DirectoryDotPill>
            {row.reviewedAt ? (
              <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>
                Reviewed {formatDate(row.reviewedAt, DATE_TIME_FORMAT)}
              </div>
            ) : null}
          </div>
        ),
      },
      {
        key: "note",
        header: "Agent note",
        render: (row) => (
          <span style={{ fontSize: 12, color: "#475569" }}>
            {row.note || (!row.adminNote && row.description) || "—"}
          </span>
        ),
      },
      {
        key: "adminNote",
        header: "Admin note",
        render: (row) => (
          <span style={{ fontSize: 12, color: "#475569" }}>{row.adminNote || "—"}</span>
        ),
      },
    ],
    [summary]
  );

  const remittanceRows = useMemo(
    () =>
      remittances.map((r, i) => ({ ...r, rowKey: `remit-${r.id}-${i}` })),
    [remittances]
  );

  const ledgerColumns = useMemo(
    () => [
      {
        key: "createdAt",
        header: "Date & time",
        render: (row) => formatDate(row.createdAt, DATE_TIME_FORMAT),
      },
      {
        key: "label",
        header: "Transaction",
        render: (row) => (
          <div>
            <DirectoryDotPill tone={LEDGER_TONE[row.referenceType] || "neutral"}>
              {row.label}
            </DirectoryDotPill>
            {row.description ? (
              <div style={{ marginTop: 4, fontSize: 11, color: "#6b7280" }}>{row.description}</div>
            ) : null}
          </div>
        ),
      },
      {
        key: "moneyIn",
        header: "Money in",
        render: (row) =>
          Number(row.moneyIn || 0) > 0 ? (
            <DirectoryMoney>
              <span style={{ color: "#1a8f5e" }}>
                {money(row.moneyIn, { ...summary, currency: row.currency || summary.currency })}
              </span>
            </DirectoryMoney>
          ) : (
            "—"
          ),
      },
      {
        key: "moneyOut",
        header: "Money out",
        render: (row) =>
          Number(row.moneyOut || 0) > 0 ? (
            <DirectoryMoney>
              <span style={{ color: "#c9403f" }}>
                {money(row.moneyOut, { ...summary, currency: row.currency || summary.currency })}
              </span>
            </DirectoryMoney>
          ) : (
            "—"
          ),
      },
      {
        key: "balanceBefore",
        header: "Balance before",
        render: (row) => (
          <DirectoryMoney>
            {money(row.balanceBefore ?? row.settlementBalanceBefore, {
              ...summary,
              currency: row.currency || summary.currency,
            })}
          </DirectoryMoney>
        ),
      },
      {
        key: "balanceAfter",
        header: "Balance after",
        render: (row) => {
          const after = Number(row.balanceAfter ?? row.settlementBalanceAfter ?? 0);
          return (
            <DirectoryMoney>
              <span style={{ color: after < 0 ? "#92400e" : after > 0 ? "#065f46" : "#111827", fontWeight: 700 }}>
                {money(after, { ...summary, currency: row.currency || summary.currency })}
              </span>
              {row.walletBalanceAfter != null ? (
                <span style={{ display: "block", fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
                  Wallet {money(row.walletBalanceAfter, {
                    ...summary,
                    currency: row.currency || summary.currency,
                  })}
                </span>
              ) : null}
            </DirectoryMoney>
          );
        },
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <DirectoryDotPill tone={STATUS_TONE[row.status] || "neutral"}>
            {row.status}
          </DirectoryDotPill>
        ),
      },
      {
        key: "orderTrackId",
        header: "Order",
        render: (row) =>
          row.bookingId ? (
            <button
              type="button"
              onClick={() => navigate(`/orders/details/${row.bookingId}`)}
              style={{ background: "none", border: 0, color: "#1d4ed8", cursor: "pointer", padding: 0 }}
            >
              #{row.orderTrackId || row.bookingId}
            </button>
          ) : (
            "—"
          ),
      },
    ],
    [navigate, summary]
  );

  const ordersTotalPages = Math.max(1, ordersPagination.totalPages || 1);
  const ledgerTotalPages = Math.max(1, ledgerPagination.totalPages || 1);
  const acting = recordingCash || recordingPayout;
  const cashDue = Number(summary.cashDueToPlatform || 0);
  const pendingCash = Number(summary.pendingCashRemittance || 0);
  const cashToRecord = cashStillToRecord(cashDue, pendingCash);
  const payable = Number(summary.platformOwesAgent || 0);
  const stripeReady = Boolean(shop.connectAccountConnected);
  const shopLabel = shop.name || agent.name || "This shop";

  const isCashAction = action.type === "cash";
  const cashAlreadySubmitted = isCashAction && cashToRecord <= 0 && pendingCash > 0;
  const actionAmount = parseSettlementAmount(action.amount);
  const actionMax = isCashAction ? cashToRecord : payable;
  const actionAmountTooHigh =
    !cashAlreadySubmitted && actionAmount != null && actionAmount > actionMax + 0.005;
  const actionAmountLabel = actionAmount != null ? money(actionAmount, summary) : "";

  const closeAction = () => {
    if (acting) return;
    setAction(EMPTY_ACTION);
  };

  const submitAction = async () => {
    if (submittingRef.current || acting) return;
    if (cashAlreadySubmitted) {
      setAction(EMPTY_ACTION);
      navigate(PENDING_REMITTANCES_PATH);
      return;
    }
    const amount = actionAmount;
    if (amount == null) {
      toastError("Enter a valid amount");
      return;
    }
    if (!isCashAction && (!stripeReady || !action.confirmedReal)) {
      toastError(stripeReady ? "Tick the confirmation first — this sends real money now." : NO_STRIPE_REASON);
      return;
    }
    if (!canonicalShopId) {
      toastError("This settlement has no shop id");
      return;
    }
    submittingRef.current = true;
    try {
      if (isCashAction) {
        await recordCash({
          shopId: canonicalShopId,
          body: { amount, note: action.note?.trim() || undefined },
        }).unwrap();
        success(`Recorded ${money(amount, summary)} cash received from this shop`);
      } else {
        await recordPayout({
          shopId: canonicalShopId,
          body: { amount, note: action.note?.trim() || undefined },
        }).unwrap();
        success(`Sent ${money(amount, summary)} to the agent's Stripe Connect account`);
      }
      setAction(EMPTY_ACTION);
    } catch (err) {
      toastError(settlementErrorMessage(err, "Could not save"));
    } finally {
      submittingRef.current = false;
    }
  };

  const exportShopId = canonicalShopId || shopId;

  /** Walk every page of the ledger or orders list (server caps the page size). */
  const fetchAllSettlementRows = useCallback(
    async (kind) => {
      const isLedger = kind === "ledger";
      const rows = [];
      let page = 1;
      let totalPages;
      let total;
      do {
        const res = await fetchSettlementPage(
          isLedger
            ? {
                shopId: exportShopId,
                ledgerPage: page,
                ledgerLimit: LEDGER_EXPORT_PAGE_SIZE,
                ledgerRail: ledgerRail || undefined,
                ordersPage: 1,
                ordersLimit: 1,
              }
            : {
                shopId: exportShopId,
                ordersPage: page,
                ordersLimit: ORDERS_EXPORT_PAGE_SIZE,
                ledgerPage: 1,
                ledgerLimit: 1,
              },
          false
        ).unwrap();
        const payload = res?.data || {};
        const chunk = (isLedger ? payload.ledger : payload.orders) || [];
        const pagination = (isLedger ? payload.ledgerPagination : payload.ordersPagination) || {};
        rows.push(...chunk);
        totalPages = Number(pagination.totalPages || 0);
        total = Number(pagination.total ?? rows.length);
        if (!chunk.length) break;
        page += 1;
      } while (page <= totalPages && rows.length < CSV_EXPORT_MAX_ROWS);
      return {
        rows: rows.slice(0, CSV_EXPORT_MAX_ROWS),
        pagination: { truncated: total > CSV_EXPORT_MAX_ROWS, totalRecords: total },
      };
    },
    [exportShopId, fetchSettlementPage, ledgerRail]
  );

  const fetchAllLedgerRows = useCallback(() => fetchAllSettlementRows("ledger"), [fetchAllSettlementRows]);
  const fetchAllOrderRows = useCallback(() => fetchAllSettlementRows("orders"), [fetchAllSettlementRows]);
  const ledgerCsvFilters = useMemo(
    () => ({ shop: exportShopId, rail: ledgerRail }),
    [exportShopId, ledgerRail]
  );
  const ordersCsvFilters = useMemo(() => ({ shop: exportShopId }), [exportShopId]);
  const ledgerCsv = useCsvExport({
    filenameBase: "settlement-statement",
    columns: LEDGER_CSV_COLUMNS,
    fetchAll: fetchAllLedgerRows,
    filenameFilters: ledgerCsvFilters,
  });
  const ordersCsv = useCsvExport({
    filenameBase: "settlement-orders",
    columns: ORDERS_CSV_COLUMNS,
    fetchAll: fetchAllOrderRows,
    filenameFilters: ordersCsvFilters,
  });

  if (isLoading) return <Delay />;

  if (isError || !detail) {
    return (
      <div style={{ textAlign: "center", padding: 28 }}>
        <p className="jd-lead" style={{ margin: "0 0 12px" }}>
          Could not load this shop&apos;s settlement.
        </p>
        <p className="jd-lead" style={{ margin: "0 0 12px", fontSize: 13 }}>
          {getApiErrorMessage(loadError, "The settlement API failed. Retry, or go back to the list.")}
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={shop.name || agent.name || "Agent settlement"}
        description="Bank-statement settlement: cash collected, payments received, withdrawals, and balance before & after each transaction. Recording cash or a payout updates the live rails — history stays on the Statement tab."
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate("/shop-management/agent-settlement")}>
              Back
            </Button>
            {shopDetailPath(canonicalShopId) ? (
              <Button
                variant="secondary"
                onClick={() => navigate(shopDetailPath(canonicalShopId))}
              >
                Shop profile
              </Button>
            ) : null}
            <Button
              variant="secondary"
              disabled={cashDue <= 0 || acting}
              onClick={() =>
                setAction({
                  ...EMPTY_ACTION,
                  open: true,
                  type: "cash",
                  // Only what the shop has not already submitted in Pending remittances.
                  amount: cashToRecord > 0 ? cashToRecord.toFixed(2) : "",
                })
              }
            >
              Record cash received
            </Button>
            <DisabledReason reason={stripeReady ? null : NO_STRIPE_REASON}>
              <Button
                disabled={payable <= 0 || !stripeReady || acting}
                aria-label={stripeReady ? undefined : `Pay to Stripe Connect — ${NO_STRIPE_REASON}`}
                onClick={() =>
                  setAction({
                    ...EMPTY_ACTION,
                    open: true,
                    type: "payout",
                    amount: payable > 0 ? payable.toFixed(2) : "",
                  })
                }
              >
                Pay to Stripe Connect
              </Button>
            </DisabledReason>
          </>
        }
      />

      <div
        style={{
          ...CARD,
          marginBottom: 16,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 16,
        }}
        aria-label="Who owes whom"
      >
        <OweLine
          tone="warning"
          title={`Shop still to hand over: ${money(cashDue, summary)} cash`}
          text="Cash this shop collected from customers that it has not handed to the platform yet, after its own earnings are netted off."
          extra={
            pendingCash > 0
              ? `${money(pendingCash, summary)} of it is already submitted by the shop and waiting in Pending remittances.`
              : null
          }
        />
        <OweLine
          tone="success"
          title={`Platform still to pay: ${money(payable, summary)} (card earnings)`}
          text="Card-order earnings the platform holds for this shop that have not been sent to its Stripe Connect account yet."
          extra={
            stripeReady
              ? null
              : `${NO_STRIPE_REASON} — Pay to Stripe Connect stays off until it does.`
          }
        />
      </div>

      <div style={{ ...CARD, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{shop.name || "Shop"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>Shop #{canonicalShopId || shop.id || "—"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>{shop.address || "—"}</p>
        </div>
        <div>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{agent.name || "—"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>Owner #{agent.id || "—"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>{agent.email || "—"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>{agent.phone || "—"}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <DirectoryStatusPill
            active={
              agent.status === true ||
              agent.status === 1 ||
              String(agent.status || "").toLowerCase() === "active"
            }
          />
          <DirectoryDotPill tone={shop.connectAccountConnected ? "success" : "neutral"}>
            {shop.connectAccountConnected ? "Stripe connected" : "Stripe not connected"}
          </DirectoryDotPill>
        </div>
      </div>

      <ShopPayoutAccountCard shopId={canonicalShopId} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <StepCard
          eyebrow="Cash to collect from agent"
          eyebrowColor="#b45309"
          headline={money(cashRail.stillDue ?? summary.cashDueToPlatform, summary)}
          headlineColor="#92400e"
          note="Cash the agent collected from customers, minus what they have already kept or handed over."
          footer={
            <p style={{ margin: 0, fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
              Recording cash received adds to “handed to platform” and brings cash due down. History stays on the Statement tab.
            </p>
          }
        >
          <StepRow label="Cash customers paid this agent" value={money(cashRail.collected, summary)} />
          <StepRow op="sub" label="Cash refunded to customers" value={money(cashRail.refundedToCustomers, summary)} />
          <StepRow op="eq" label="Cash in agent’s till" hint="Physical cash the agent is holding" value={money(cashRail.cashInTill ?? num(cashRail.collected) - num(cashRail.refundedToCustomers) - num(cashRail.remitted), summary)} />
          <StepRow
            op="sub"
            label="Agent earnings kept from this cash"
            hint={`Commission credited ${money(cashRail.commissionCredited, summary)} − clawbacks ${money(cashRail.commissionClawedBack, summary)}. Card commission is netted here too instead of being paid out separately.`}
            value={money(cashRail.commissionOffset, summary)}
          />
          <StepRow
            op="sub"
            label="Cash already handed to platform"
            hint={cashRail.lastRemittedAt ? `Last recorded ${formatDate(cashRail.lastRemittedAt, DATE_TIME_FORMAT)}` : "Nothing recorded yet"}
            value={money(cashRail.remitted, summary)}
          />
          {num(cashRail.adminAdjustmentNet) !== 0 ? (
            <StepRow op="pm" label="Admin adjustments (net)" hint="Manual credit / debit corrections" value={money(cashRail.adminAdjustmentNet, summary)} />
          ) : null}
          <StepRow op="eq" highlight label="Cash due now" value={money(cashRail.stillDue ?? summary.cashDueToPlatform, summary)} />
          {num(cashRail.pendingRemittance) > 0 ? (
            <>
              <StepRow op="sub" label="Pending remittance (awaiting approval)" value={money(cashRail.pendingRemittance, summary)} muted />
              <StepRow op="eq" label="Due after pending clears" value={money(cashRail.stillDueAfterPending, summary)} />
            </>
          ) : null}
        </StepCard>

        <StepCard
          eyebrow="Payable to agent (card)"
          eyebrowColor="#047857"
          headline={money(payRail.stillOwed ?? summary.platformOwesAgent, summary)}
          headlineColor="#065f46"
          note="Earnings the platform holds for the agent from card orders, minus what has already been released to Stripe Connect."
          footer={
            <div style={{ borderTop: "1px solid #e6e9f0", paddingTop: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>
                Stripe Connect wallet
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                <FootStat label="Released by admin" value={money(payRail.releasedToWallet ?? summary.totalAgentPayouts, summary)} />
                <FootStat label="Withdrawn to bank" value={money(payRail.withdrawnToBank ?? summary.totalWithdrawn, summary)} />
                <FootStat label="Still in wallet" value={money(payRail.sittingInWallet, summary)} />
              </div>
              {payRail.lastReleasedAt ? (
                <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "#6b7280" }}>
                  Last released {formatDate(payRail.lastReleasedAt, DATE_TIME_FORMAT)}. Completed transfers cannot be paid twice.
                </p>
              ) : null}
            </div>
          }
        >
          <StepRow label="Card earnings" hint="Laundry share + booking tips on card orders" value={money(payRail.cardCommission ?? summary.commissionCardOnly, summary)} />
          <StepRow op="add" label="Extra tips after delivery" value={money(payRail.extraTips, summary)} />
          {num(payRail.extraTipClawbacks) > 0 ? (
            <StepRow op="sub" label="Extra-tip clawbacks" value={money(payRail.extraTipClawbacks, summary)} />
          ) : null}
          <StepRow
            op="eq"
            label="Earned on card"
            value={money(
              num(payRail.cardCommission ?? summary.commissionCardOnly) + num(payRail.extraTips) - num(payRail.extraTipClawbacks),
              summary
            )}
          />
          <StepRow
            op="sub"
            label="Already released to Stripe Connect"
            hint="Includes in-flight admin payouts"
            value={money(payRail.releasedToWallet ?? summary.totalAgentPayouts, summary)}
          />
          <StepRow op="eq" highlight label="Still owed to agent" value={money(payRail.stillOwed ?? summary.platformOwesAgent, summary)} />
        </StepCard>
      </div>

      {earningsReport ? (
        earningsReport.loadError ? (
          <div style={{ ...CARD, marginBottom: 16 }}>
            <p style={{ margin: 0, fontWeight: 700 }}>Admin breakdown could not load</p>
            <p className="jd-lead" style={{ margin: "6px 0 0" }}>
              Cash rails below are still live. Retry this page to refresh services,
              commission, and card vs cash counts.
            </p>
          </div>
        ) : (
          <>
            <div style={{ ...CARD, marginBottom: 16 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#1e3a8a", textTransform: "uppercase" }}>
                Money breakdown
              </p>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
                Across {report.ordersPaid} paid order{report.ordersPaid === 1 ? "" : "s"}. Step 1 is what
                customers paid, step 2 is where every pound went, step 3 is the platform’s share. Steps 1 and 2 must total the same.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                  gap: 12,
                }}
              >
                <StepCard eyebrow="1 · Customers paid" eyebrowColor="#475569">
                  <StepRow label="Laundry / services" value={money(report.laundry, summary)} />
                  <StepRow op="add" label="Service fee" hint="Charged on top of laundry — platform income" value={money(report.serviceFee, summary)} />
                  {report.bookingTips > 0 ? (
                    <StepRow op="add" label="Booking tips" hint="Go to the shop" value={money(report.bookingTips, summary)} />
                  ) : null}
                  <StepRow op="eq" label="Invoice value" value={money(report.orderTotal, summary)} />
                  {report.discount > 0 ? (
                    <StepRow op="sub" label="Discounts / coupons" value={money(report.discount, summary)} />
                  ) : null}
                  {report.refunded > 0 ? (
                    <StepRow op="sub" label="Refunded to customers" value={money(report.refunded, summary)} />
                  ) : null}
                  <StepRow op="eq" highlight label="Customers paid (net)" value={money(report.customersPaidNet, summary)} />
                  {report.paidAtBooking > 0 ? (
                    <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#6b7280", lineHeight: 1.5 }}>
                      Of this, {money(report.paidAtBooking, summary)} was paid by card at booking and{" "}
                      {money(report.balanceAtDelivery, summary)} as the balance after the invoice.
                    </p>
                  ) : null}
                </StepCard>

                <StepCard eyebrow="2 · Where it went" eyebrowColor="#047857" tone="success">
                  <StepRow tone="success" label="Shop keeps" hint="Agent earning on each paid invoice" value={money(report.shopNet, summary)} />
                  <StepRow tone="success" op="add" label="Zone commission → platform" hint="Platform’s share of laundry" value={money(report.platformCommission, summary)} />
                  <StepRow tone="success" op="add" label="Service fee → platform" value={money(report.serviceFee, summary)} />
                  {report.driverEarnings > 0 ? (
                    <StepRow tone="success" op="add" label="Driver pay" value={money(report.driverEarnings, summary)} />
                  ) : null}
                  {report.rescheduleCharges > 0 ? (
                    <StepRow tone="success" op="add" label="Reschedule charges" value={money(report.rescheduleCharges, summary)} />
                  ) : null}
                  <StepRow tone="success" op="eq" highlight label="Total split" value={money(report.splitTotal, summary)} />
                  {Math.abs(report.splitDifference) > 0.02 ? (
                    <StepRow
                      tone="success"
                      op={report.splitDifference > 0 ? "add" : "sub"}
                      label="Difference vs customers paid"
                      hint={
                        report.splitDifference > 0
                          ? "Split is higher than what customers paid — usually a minimum-order floor credited to the shop, a discount the platform absorbed, or tips settled on the tips rail"
                          : "Customers paid more than the split — usually tips settled separately, rounding, or unallocated charges"
                      }
                      value={money(Math.abs(report.splitDifference), summary)}
                      muted
                    />
                  ) : (
                    <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#047857" }}>
                      ✓ Matches customers paid (net)
                    </p>
                  )}
                </StepCard>

                <StepCard eyebrow="3 · Platform keeps" eyebrowColor="#1d4ed8" tone="info">
                  <ReceiptHighlight label="Platform keeps" value={money(report.platformTake, summary)} pill="Admin" />
                  <div style={{ marginTop: 10 }}>
                    <StepRow tone="info" label="Service fee" value={money(report.serviceFee, summary)} />
                    <StepRow tone="info" op="add" label="Zone commission" value={money(report.platformCommission, summary)} />
                    <StepRow tone="info" op="eq" label="Platform keeps" value={money(report.platformTake, summary)} />
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    <FootStat label="Shop keeps" value={money(report.shopNet, summary)} />
                    <FootStat label="Drivers" value={money(report.driverEarnings, summary)} />
                  </div>
                </StepCard>
              </div>
              <p style={{ margin: "12px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                Platform keeps = service fee + zone commission. Shop keeps = agent earning on each paid invoice. All figures are net of customer refunds.
              </p>
            </div>

            <div style={{ ...CARD, marginBottom: 16 }}>
              <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#0f766e", textTransform: "uppercase" }}>
                Card vs cash
              </p>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4b5563", lineHeight: 1.5 }}>
                {formulas.payMix ||
                  "How many paid orders and unique customers used card vs cash at this shop."}
              </p>
              <DirectoryMetrics
                items={[
                  {
                    label: "Card orders",
                    value: earningsReport.card?.orders ?? 0,
                    tone: "navy",
                    hint: `${earningsReport.card?.customers ?? 0} customers`,
                  },
                  {
                    label: "Cash orders",
                    value: earningsReport.cash?.orders ?? 0,
                    tone: "warning",
                    hint: `${earningsReport.cash?.customers ?? 0} customers`,
                  },
                  {
                    label: "Unique customers",
                    value: earningsReport.customers ?? 0,
                    tone: "brand",
                    hint: earningsReport.customersWhoUsedBoth
                      ? `${earningsReport.customersWhoUsedBoth} used both card and cash`
                      : `${earningsReport.ordersPaid || 0} paid orders`,
                  },
                ]}
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
                  gap: 12,
                  marginTop: 12,
                }}
              >
                {channelReportRows.map((row) => (
                  <ReceiptCard
                    key={row.key}
                    title={
                      <DirectoryDotPill
                        tone={row.key === "cash" ? "warning" : row.key === "mixed" ? "info" : "navy"}
                      >
                        {row.channel}
                      </DirectoryDotPill>
                    }
                    badge={`${row.orders ?? 0} orders · ${row.customers ?? 0} customers`}
                  >
                    <ReceiptRow label="Customers paid" value={money(row.gross, summary)} />
                    <ReceiptRow label="Laundry / services" value={money(row.laundry, summary)} />
                    <ReceiptRow label="Platform keeps" value={money(row.platformTake, summary)} />
                    <ReceiptRow label="Shop keeps" value={money(row.shopNet, summary)} strong />
                  </ReceiptCard>
                ))}
              </div>
              {Number(earningsReport.mixed?.orders || 0) > 0 ? (
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
                  Mixed orders are a subset of cash: booked on card, remaining balance
                  collected in cash.
                </p>
              ) : null}
            </div>
          </>
        )
      ) : null}

      <div style={{ ...CARD, marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#64748b", textTransform: "uppercase" }}>
          Cash payment flow
        </p>
        <p style={{ margin: 0, fontSize: 13, color: "#4b5563", lineHeight: 1.55 }}>
          {formulas.cashPaymentFlow ||
            "Cash COD: invoice → proceed unpaid → deliver → recordCashPayment → cash_collected + commission → agent remits / admin records cash received."}
        </p>
        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Cash collected from customers</div>
            <div style={{ fontWeight: 700 }}>
              {money(statement.cashCollectedFromCustomers ?? summary.totalCashCollected, summary)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Payments received (remitted)</div>
            <div style={{ fontWeight: 700, color: "#1a8f5e" }}>
              {money(statement.paymentsReceived ?? summary.totalCashRemitted, summary)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Withdrawals to bank</div>
            <div style={{ fontWeight: 700, color: "#c9403f" }}>
              {money(statement.withdrawals ?? summary.totalWithdrawn, summary)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Live settlement balance</div>
            <div style={{ fontWeight: 700 }}>
              {money(statement.lifetimeSettlementBalance ?? summary.balance ?? summary.netSettlement, summary)}
            </div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>Negative = cash still due</div>
          </div>
        </div>
      </div>

      <div style={{ ...CARD, marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#64748b", textTransform: "uppercase" }}>
          Refund impact on this agent
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Commission clawed back</div>
            <div style={{ fontWeight: 700 }}>{money(refundRail.commissionClawback, summary)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Cash they returned to customers</div>
            <div style={{ fontWeight: 700 }}>{money(refundRail.cashReturnedToCustomer, summary)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Extra tips clawed back</div>
            <div style={{ fontWeight: 700 }}>{money(refundRail.extraTipClawback, summary)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Lifetime commission (all channels)</div>
            <div style={{ fontWeight: 700 }}>{money(summary.totalEarning, summary)}</div>
            <div style={{ fontSize: 11, color: "#6b7280" }}>
              Cash {money(summary.totalEarningCash, summary)} · Card {money(summary.commissionCardOnly, summary)}
            </div>
          </div>
        </div>
      </div>

      <div style={TAB_ROW}>
        <Button size="sm" variant={tab === "statement" ? "primary" : "secondary"} onClick={() => setTab("statement")}>
          Statement {ledgerPagination.total ? `(${ledgerPagination.total})` : ""}
        </Button>
        <Button size="sm" variant={tab === "activity" ? "primary" : "secondary"} onClick={() => setTab("activity")}>
          Recent activity
        </Button>
        <Button size="sm" variant={tab === "orders" ? "primary" : "secondary"} onClick={() => setTab("orders")}>
          Orders {ordersPagination.total ? `(${ordersPagination.total})` : ""}
        </Button>
        <Button size="sm" variant={tab === "remittances" ? "primary" : "secondary"} onClick={() => setTab("remittances")}>
          Remittances {remittances.length ? `(${remittances.length})` : ""}
        </Button>
      </div>

      {tab === "statement" ? (
        <>
          <div
            style={{
              ...CARD,
              marginBottom: 12,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Page opening balance</div>
              <div style={{ fontWeight: 700 }}>{money(statement.openingBalance, summary)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Page closing balance</div>
              <div style={{ fontWeight: 700 }}>{money(statement.closingBalance, summary)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Payments received</div>
              <div style={{ fontWeight: 700, color: "#1a8f5e" }}>
                {money(statement.paymentsReceived, summary)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6b7280" }}>Withdrawals</div>
              <div style={{ fontWeight: 700, color: "#c9403f" }}>
                {money(statement.withdrawals, summary)}
              </div>
            </div>
          </div>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            {formulas.statement ||
              "Bank statement: money in / money out with settlement balance before and after each transaction. Newest first."}
          </p>
          <div style={{ ...TAB_ROW, marginTop: 0 }}>
            {[
              ["", "All"],
              ["cash", "Cash rail"],
              ["payable", "Payable / withdrawals"],
              ["refunds", "Refunds"],
            ].map(([value, label]) => (
              <Button
                key={value || "all"}
                size="sm"
                variant={ledgerRail === value ? "primary" : "secondary"}
                onClick={() => {
                  setLedgerRail(value);
                  setLedgerPage(1);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <DirectoryTableWrap
            toolbar={
              <DirectoryToolbar>
                <DirectoryToolbarEnd>
                  <DirectoryExportButton
                    onClick={ledgerCsv.run}
                    loading={ledgerCsv.isExporting}
                    count={Number(ledgerPagination.total || 0)}
                    title="Download every statement row for the selected filter (all pages)"
                  />
                </DirectoryToolbarEnd>
              </DirectoryToolbar>
            }
            footer={
              <div style={PAGE_ROW}>
                <p className="jd-lead" style={{ margin: 0 }}>
                  Page {ledgerPage} of {ledgerTotalPages} ({ledgerPagination.total || 0} entries)
                </p>
                <Button variant="secondary" size="sm" disabled={ledgerPage <= 1} onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={ledgerPage >= ledgerTotalPages} onClick={() => setLedgerPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            }
          >
            <Table
              columns={ledgerColumns}
              rows={ledgerTableData}
              rowKey={(row) => row.rowKey}
              empty="No wallet transactions yet"
            />
          </DirectoryTableWrap>
        </>
      ) : null}

      {tab === "activity" ? (
        <div style={CARD}>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4b5563" }}>
            Latest cash collections, remittances, payouts, withdrawals, and refund clawbacks.
          </p>
          {activity.length === 0 ? (
            <p className="jd-lead" style={{ margin: 0 }}>
              No remittances, payouts, or refunds yet.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {activity.map((row) => (
                <div
                  key={row.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #f1f4f8",
                  }}
                >
                  <div>
                    <DirectoryDotPill tone={LEDGER_TONE[row.referenceType] || "neutral"}>
                      {row.label}
                    </DirectoryDotPill>
                    <div style={{ marginTop: 6, fontSize: 12, color: "#6b7280" }}>
                      {formatDate(row.createdAt, DATE_TIME_FORMAT)}
                      {row.orderTrackId ? ` · #${row.orderTrackId}` : ""}
                      {row.description ? ` · ${row.description}` : ""}
                    </div>
                  </div>
                  <DirectoryMoney>
                    <span style={{ color: row.type === "credit" ? "#1a8f5e" : "#c9403f" }}>
                      {row.type === "credit" ? "+" : "−"}
                      {money(row.amount, { ...summary, currency: row.currency || summary.currency })}
                    </span>
                  </DirectoryMoney>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === "orders" ? (
        <DirectoryTableWrap
          toolbar={
            <DirectoryToolbar>
              <DirectoryToolbarEnd>
                <DirectoryExportButton
                  onClick={ordersCsv.run}
                  loading={ordersCsv.isExporting}
                  count={Number(ordersPagination.total || 0)}
                  title="Download every paid order for this shop (all pages)"
                />
              </DirectoryToolbarEnd>
            </DirectoryToolbar>
          }
          footer={
            <div style={PAGE_ROW}>
              <p className="jd-lead" style={{ margin: 0 }}>
                Page {ordersPage} of {ordersTotalPages} ({ordersPagination.total || 0} orders)
              </p>
              <Button variant="secondary" size="sm" disabled={ordersPage <= 1} onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={ordersPage >= ordersTotalPages} onClick={() => setOrdersPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          }
        >
          <Table columns={orderColumns} rows={ordersTableData} rowKey={(row) => row.rowKey} empty="No paid orders yet" />
        </DirectoryTableWrap>
      ) : null}

      {tab === "remittances" ? (
        <DirectoryTableWrap>
          <Table
            columns={remittanceColumns}
            rows={remittanceRows}
            rowKey={(row) => row.rowKey}
            empty="This agent has not submitted any cash remittances yet"
          />
        </DirectoryTableWrap>
      ) : null}

      <Modal
        open={action.open}
        onClose={closeAction}
        title={isCashAction ? "Record cash received from agent" : "Pay agent via Stripe Connect"}
        description={
          isCashAction
            ? "Cash the shop handed over to you. Recording it lowers the cash still due."
            : "Sends card earnings to the shop's Stripe Connect account immediately."
        }
        primaryLabel={
          acting
            ? isCashAction
              ? "Saving…"
              : "Sending…"
            : isCashAction
              ? cashAlreadySubmitted
                ? "Open Pending remittances"
                : actionAmountLabel
                  ? `Record ${actionAmountLabel} cash received`
                  : "Record cash received"
              : actionAmountLabel
                ? `Send ${actionAmountLabel} to Stripe Connect`
                : "Send to Stripe Connect"
        }
        onPrimary={submitAction}
        secondaryDisabled={acting}
        closeOnBackdrop={!acting}
        primaryDisabled={
          acting ||
          (!cashAlreadySubmitted && (actionAmount == null || actionAmountTooHigh)) ||
          (!isCashAction && (!stripeReady || !action.confirmedReal))
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <SettlementFigures
            rows={
              isCashAction
                ? [
                    { label: "Shop", value: shopLabel },
                    {
                      label: "Cash still due",
                      value: money(cashDue, summary),
                      tone: "warning",
                      hint:
                        pendingCash > 0
                          ? `${money(pendingCash, summary)} of this is already submitted by the shop and waiting in Pending remittances`
                          : null,
                    },
                    pendingCash > 0 && !cashAlreadySubmitted
                      ? { label: "You can record now", value: money(cashToRecord, summary) }
                      : null,
                    cashAlreadySubmitted
                      ? null
                      : {
                          label: "After this: cash still due",
                          value:
                            actionAmount != null
                              ? money(figureAfter(cashDue, actionAmount), summary)
                              : "—",
                          strong: true,
                        },
                  ]
                : [
                    { label: "Shop", value: shopLabel },
                    {
                      label: "Still payable",
                      value: money(payable, summary),
                      tone: "success",
                      hint: "Card earnings not yet sent to Stripe Connect",
                    },
                    {
                      label: "After this: still payable",
                      value:
                        actionAmount != null
                          ? money(figureAfter(payable, actionAmount), summary)
                          : "—",
                      strong: true,
                    },
                  ]
            }
          />
          {cashAlreadySubmitted ? (
            <AlreadySubmittedNotice>
              {money(pendingCash, summary)} is already submitted by the shop — confirm it in
              Pending remittances.
            </AlreadySubmittedNotice>
          ) : (
            <>
              <Field
                label="Amount"
                htmlFor="settle-amount"
                error={
                  actionAmountTooHigh
                    ? `More than the ${money(actionMax, summary)} ${
                        isCashAction ? "you can record now" : "still payable"
                      }`
                    : undefined
                }
              >
                <Input
                  id="settle-amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={action.amount}
                  disabled={acting}
                  onChange={(e) => setAction((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </Field>
              <Field label="Note" htmlFor="settle-note">
                <Textarea
                  id="settle-note"
                  rows={3}
                  value={action.note}
                  disabled={acting}
                  onChange={(e) => setAction((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="e.g. Collected at shop / Weekly payout"
                />
              </Field>
            </>
          )}
          {!isCashAction ? (
            stripeReady ? (
              <RealMoneyCheck
                id="settle-real-money"
                checked={action.confirmedReal}
                disabled={acting}
                onChange={(checked) => setAction((prev) => ({ ...prev, confirmedReal: checked }))}
              />
            ) : (
              <AlreadySubmittedNotice>{NO_STRIPE_REASON}.</AlreadySubmittedNotice>
            )
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
