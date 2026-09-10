import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Field, Input, Modal, PageHeader, Table, Textarea } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import { DATE_TIME_FORMAT, formatAmount, formatDate } from "../../utilities/formatters";
import {
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMoney,
  DirectoryStatusPill,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import {
  useGetAgentSettlementDetailQuery,
  useRecordAgentPayoutMutation,
  useRecordCashSettlementMutation,
} from "../../store/services/api";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { shopDetailPath, shopSettlementPath } from "../reports/reportUi";
import ShopPayoutAccountCard from "./ShopPayoutAccountCard";

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

export default function AgentSettlementDetail() {
  const { id: shopId } = useParams();
  const navigate = useNavigate();
  const { success, error: toastError } = useToaster();
  const [tab, setTab] = useState("statement");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);
  const [ledgerRail, setLedgerRail] = useState("");
  const [action, setAction] = useState({ open: false, type: null, amount: "", note: "" });

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
  const ledger = detail?.ledger || [];
  const ledgerPagination = detail?.ledgerPagination || {};
  const statement = detail?.statement || {};
  const activity = detail?.recentActivity || [];
  const formulas = detail?.formulas || {};

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
          <DirectoryDotPill tone={row.channel === "cash" ? "warning" : "navy"}>
            {row.channel === "cash" ? "Cash" : "Card"}
          </DirectoryDotPill>
        ),
      },
      {
        key: "split",
        header: "How this order split",
        render: (row) => (
          <div style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.45 }}>
            <div>Total {money(row.orderTotal, summary)}</div>
            <div>Laundry share {money(row.laundryCommission, summary)}</div>
            <div>Booking tip {money(row.bookingTip, summary)}</div>
            <div>Platform {money(row.platformShare, summary)}</div>
            <div>Service fee {money(row.serviceFee, summary)}</div>
          </div>
        ),
      },
      {
        key: "commissionAmount",
        header: "Agent earning",
        render: (row) => (
          <DirectoryMoney>
            {money(row.commissionNet ?? row.commissionAmount, summary)}
            {Number(row.commissionClawbackAmount || 0) > 0 ? (
              <span style={{ display: "block", fontSize: 11, color: "#c9403f", fontWeight: 500 }}>
                Earned {money(row.commissionAmount, summary)} · clawback −
                {money(row.commissionClawbackAmount, summary)}
              </span>
            ) : null}
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
          const after = Number(row.balanceAfter ?? row.settlementBalanceAfter || 0);
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
  const payable = Number(summary.platformOwesAgent || 0);

  const submitAction = async () => {
    const amount = Number(action.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toastError("Enter a valid amount");
      return;
    }
    try {
      if (!canonicalShopId) {
        toastError("This settlement has no shop id");
        return;
      }
      if (action.type === "cash") {
        await recordCash({
          shopId: canonicalShopId,
          body: { amount, note: action.note || undefined },
        }).unwrap();
        success(`Recorded ${money(amount, summary)} cash received from this shop`);
      } else {
        await recordPayout({
          shopId: canonicalShopId,
          body: { amount, note: action.note || undefined },
        }).unwrap();
        success(`Released ${money(amount, summary)} to the shop owner wallet`);
      }
      setAction({ open: false, type: null, amount: "", note: "" });
    } catch (err) {
      toastError(err?.data?.message || err?.message || "Could not save");
    }
  };

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
              disabled={cashDue <= 0}
              onClick={() =>
                setAction({ open: true, type: "cash", amount: String(cashDue), note: "" })
              }
            >
              Record cash received
            </Button>
            <Button
              disabled={payable <= 0}
              onClick={() =>
                setAction({ open: true, type: "payout", amount: String(payable), note: "" })
              }
            >
              Release payout
            </Button>
          </>
        }
      />

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
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 16,
          marginBottom: 16,
        }}
      >
        <div style={CARD}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#b45309", textTransform: "uppercase" }}>
            Cash to collect from agent
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#92400e" }}>
            {money(cashRail.stillDue ?? summary.cashDueToPlatform, summary)}
          </p>
          <Line label="Cash customers paid this agent" value={money(cashRail.collected, summary)} />
          <Line
            label="Cash returned to customers (refunds)"
            value={`−${money(cashRail.refundedToCustomers, summary)}`}
            hint="Lowers what the agent still owes us"
            tone="danger"
          />
          <Line
            label="Commission already kept / credited"
            value={`−${money(cashRail.commissionOffset, summary)}`}
            hint={`Credited ${money(cashRail.commissionCredited, summary)} − clawed back ${money(cashRail.commissionClawedBack, summary)}. Includes card commission, which nets against cash due.`}
          />
          <Line
            label="Already handed to platform"
            value={`−${money(cashRail.remitted, summary)}`}
            hint={
              cashRail.lastRemittedAt
                ? `Last recorded ${formatDate(cashRail.lastRemittedAt, DATE_TIME_FORMAT)}. Live due can be £0 — this lifetime total stays.`
                : "Why the live due can be £0 after Record — this lifetime total stays"
            }
            tone="success"
          />
          <Line
            label="Admin adjustments (net)"
            value={money(cashRail.adminAdjustmentNet, summary)}
            hint="Manual credit / debit corrections"
          />
          <Line label="Waiting on pending remittance" value={money(cashRail.pendingRemittance, summary)} />
          <Line
            label="Cash still in agent's till"
            value={money(cashRail.cashInTill, summary)}
            hint={formulas.cashInTill || "Collected − refunded − remitted (before commission netting)"}
          />
          <Line
            label="Still to collect after pending"
            value={money(cashRail.stillDueAfterPending, summary)}
            strong
          />
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            {formulas.cashDue ||
              "Cash collected − refunds − commission the agent already kept − cash you recorded as received."}
          </p>
        </div>

        <div style={CARD}>
          <p style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: "#047857", textTransform: "uppercase" }}>
            Payable to agent (card)
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 28, fontWeight: 800, color: "#065f46" }}>
            {money(payRail.stillOwed ?? summary.platformOwesAgent, summary)}
          </p>
          <Line
            label="Card commission (laundry + booking tip)"
            value={money(payRail.cardCommission ?? summary.commissionCardOnly, summary)}
          />
          <Line label="Extra tips after delivery" value={money(payRail.extraTips, summary)} />
          <Line
            label="Extra-tip clawbacks"
            value={`−${money(payRail.extraTipClawbacks, summary)}`}
            tone="danger"
          />
          <Line
            label="Released to agent wallet"
            value={`−${money(payRail.releasedToWallet ?? summary.totalAgentPayouts, summary)}`}
            hint={
              payRail.lastReleasedAt
                ? `Last released ${formatDate(payRail.lastReleasedAt, DATE_TIME_FORMAT)}. Not a bank transfer until they withdraw.`
                : "Admin payout — not a bank transfer yet"
            }
            tone="success"
          />
          <Line
            label="Withdrawn to agent's bank"
            value={money(payRail.withdrawnToBank ?? summary.totalWithdrawn, summary)}
            hint="Stripe Connect transfer"
          />
          <Line label="Sitting in agent wallet (not withdrawn)" value={money(payRail.sittingInWallet, summary)} />
          <Line label="Still owed (not released)" value={money(payRail.stillOwed, summary)} strong />
          <p style={{ margin: "10px 0 0", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            {formulas.withdrawn}
          </p>
        </div>
      </div>

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

      <Modal
        open={action.open}
        onClose={() => setAction({ open: false, type: null, amount: "", note: "" })}
        title={action.type === "cash" ? "Record cash received from agent" : "Release payout to agent wallet"}
        primaryLabel={acting ? "Saving…" : "Confirm"}
        onPrimary={submitAction}
        primaryDisabled={acting}
      >
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "#4b5563" }}>
          {action.type === "cash"
            ? `Live cash due is ${money(cashDue, summary)}. After confirm that due becomes £0 (or lower) and a “Cash handed to platform” row is added to Recent activity.`
            : `Live payable is ${money(payable, summary)}. This releases money into the agent wallet. It is not a Stripe bank transfer until they withdraw.`}
        </p>
        <Field label="Amount" htmlFor="settle-amount">
          <Input
            id="settle-amount"
            type="number"
            min={0}
            step="0.01"
            value={action.amount}
            onChange={(e) => setAction((prev) => ({ ...prev, amount: e.target.value }))}
          />
        </Field>
        <Field label="Note" htmlFor="settle-note">
          <Textarea
            id="settle-note"
            rows={3}
            value={action.note}
            onChange={(e) => setAction((prev) => ({ ...prev, note: e.target.value }))}
            placeholder="e.g. Collected at shop / Weekly payout"
          />
        </Field>
      </Modal>
    </div>
  );
}
