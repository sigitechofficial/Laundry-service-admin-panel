import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, PageHeader, Table } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import { DATE_TIME_FORMAT, formatAmount, formatDate } from "../../utilities/formatters";
import {
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryMoney,
  DirectoryStatusPill,
  DirectoryTableWrap,
} from "../directory-table/directoryTable";
import { useGetAgentSettlementDetailQuery } from "../../store/services/api";

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
  cash_remitted: "success",
  booking_commission: "navy",
  admin_settlement: "neutral",
  agent_payout: "success",
  agent_withdrawal: "warning",
  payout: "neutral",
};

const STATUS_TONE = {
  completed: "success",
  pending: "warning",
  failed: "neutral",
};

function money(amount, source) {
  return formatAmount(amount, source, { applyDefault: true });
}

export default function AgentSettlementDetail() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState("orders");
  const [ordersPage, setOrdersPage] = useState(1);
  const [ledgerPage, setLedgerPage] = useState(1);

  const { data, isLoading, isError, refetch } = useGetAgentSettlementDetailQuery(
    { agentId, ordersPage, ordersLimit: 20, ledgerPage, ledgerLimit: 20 },
    { skip: !agentId }
  );

  const detail = data?.data;
  const agent = detail?.agent || {};
  const shop = detail?.shop || {};
  const summary = useMemo(() => detail?.summary || {}, [detail]);
  const orders = detail?.orders || [];
  const ordersPagination = detail?.ordersPagination || {};
  const ledger = detail?.ledger || [];
  const ledgerPagination = detail?.ledgerPagination || {};

  const ordersTableData = useMemo(
    () =>
      orders.map((row, index) => ({
        ...row,
        rowKey: `order-${row.bookingId}-${index}`,
      })),
    [orders]
  );

  const ledgerTableData = useMemo(
    () =>
      ledger.map((row, index) => ({
        ...row,
        rowKey: `ledger-${row.id}-${index}`,
      })),
    [ledger]
  );

  const orderColumns = useMemo(
    () => [
      {
        key: "orderTrackId",
        header: "Order",
        render: (row) => (
          <DirectoryIdentity
            name={`#${row.orderTrackId}`}
            meta={row.completedAt ? `Completed ${formatDate(row.completedAt, DATE_TIME_FORMAT)}` : "—"}
          />
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
        key: "orderTotal",
        header: "Order total",
        render: (row) => <DirectoryMoney>{money(row.orderTotal, summary)}</DirectoryMoney>,
      },
      {
        key: "commissionAmount",
        header: "Commission earned",
        render: (row) => (
          <DirectoryMoney>
            {money(row.commissionAmount, summary)}
            {row.commissionCreditedAt ? (
              <span style={{ display: "block", fontSize: 11, color: "#8a94a6", fontWeight: 400 }}>
                {formatDate(row.commissionCreditedAt, DATE_TIME_FORMAT)}
              </span>
            ) : null}
          </DirectoryMoney>
        ),
      },
      {
        key: "cashCollectedAmount",
        header: "Cash collected",
        render: (row) => (
          <DirectoryMoney>
            {row.channel === "cash" ? money(row.cashCollectedAmount, summary) : "—"}
            {row.channel === "cash" && row.cashRecordedAt ? (
              <span style={{ display: "block", fontSize: 11, color: "#8a94a6", fontWeight: 400 }}>
                {formatDate(row.cashRecordedAt, DATE_TIME_FORMAT)}
              </span>
            ) : null}
          </DirectoryMoney>
        ),
      },
    ],
    [summary]
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
        header: "Type",
        render: (row) => (
          <DirectoryDotPill tone={LEDGER_TONE[row.referenceType] || "neutral"}>
            {row.label}
          </DirectoryDotPill>
        ),
      },
      {
        key: "amount",
        header: "Amount",
        render: (row) => (
          <DirectoryMoney>
            <span style={{ color: row.type === "credit" ? "#1a8f5e" : "#c9403f" }}>
              {row.type === "credit" ? "+" : "−"}
              {money(row.amount, { ...summary, currency: row.currency || summary.currency })}
            </span>
          </DirectoryMoney>
        ),
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
        render: (row) => (row.orderTrackId ? `#${row.orderTrackId}` : "—"),
      },
      {
        key: "description",
        header: "Note",
        render: (row) => row.description || "—",
      },
    ],
    [summary]
  );

  const ordersTotalPages = Math.max(1, ordersPagination.totalPages || 1);
  const ledgerTotalPages = Math.max(1, ledgerPagination.totalPages || 1);

  if (isLoading) return <Delay />;

  if (isError || !detail) {
    return (
      <div style={{ textAlign: "center", padding: 28 }}>
        <p className="jd-lead" style={{ margin: "0 0 12px" }}>
          Could not load this agent&apos;s cash settlement detail.
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const derivedCashDue =
    Number(summary.totalCashCollected || 0) -
    Number(summary.totalEarning || 0) -
    Number(summary.totalCashRemitted || 0);

  return (
    <div>
      <PageHeader
        title={shop.name || agent.name || "Agent settlement"}
        description="Full cash settlement breakdown for this agent — every order, every payment, every date."
        actions={
          <Button variant="secondary" onClick={() => navigate("/shop-management/agent-settlement")}>
            Back
          </Button>
        }
      />

      <div style={{ ...CARD, marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{agent.name || "—"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>{agent.email || "—"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>{agent.phone || "—"}</p>
        </div>
        <div>
          <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15 }}>{shop.name || "Shop"}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#5c6673" }}>{shop.address || "—"}</p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-start" }}>
          <DirectoryStatusPill active={agent.status} />
          <DirectoryDotPill tone={shop.connectAccountConnected ? "success" : "neutral"}>
            {shop.connectAccountConnected ? "Stripe connected" : "Stripe not connected"}
          </DirectoryDotPill>
        </div>
      </div>

      <DirectoryMetrics
        items={[
          { label: "Cash due to platform", value: money(summary.cashDueToPlatform, summary), tone: "warning" },
          { label: "Cash collected (all time)", value: money(summary.totalCashCollected, summary), tone: "navy" },
          { label: "Cash remitted (confirmed)", value: money(summary.totalCashRemitted, summary), tone: "success" },
          { label: "Pending remittance", value: money(summary.pendingCashRemittance, summary), tone: "neutral" },
        ]}
      />
      <div style={{ height: 12 }} />
      <DirectoryMetrics
        items={[
          { label: "Commission earned (all time)", value: money(summary.totalEarning, summary), tone: "navy" },
          { label: "Platform owes agent (payable)", value: money(summary.platformOwesAgent, summary), tone: "success" },
          { label: "Already paid out to agent", value: money(summary.totalAgentPayouts, summary), tone: "neutral" },
          { label: "Available balance", value: money(summary.availableBalance, summary), tone: "warning" },
        ]}
      />

      <div style={{ ...CARD, marginTop: 16, marginBottom: 20 }}>
        <p style={{ margin: "0 0 12px", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em", color: "#5c6673" }}>
          How &ldquo;Cash due&rdquo; is calculated
        </p>
        <div style={{ display: "grid", gap: 6, fontSize: 13, color: "#333" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Cash collected from customers</span>
            <span>{money(summary.totalCashCollected, summary)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>− Commission earned (offsets what the agent owes)</span>
            <span>{money(summary.totalEarning, summary)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>− Cash already remitted to platform</span>
            <span>{money(summary.totalCashRemitted, summary)}</span>
          </div>
          <div style={{ borderTop: "1px dashed #e6e9f0", margin: "6px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
            <span>= Net balance still due to platform</span>
            <span>{money(Math.max(derivedCashDue, 0), summary)}</span>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#8a94a6" }}>
            Authoritative figure (includes any admin adjustments — see Ledger tab below):{" "}
            <strong>{money(summary.cashDueToPlatform, summary)}</strong>
          </p>
        </div>
      </div>

      <div style={TAB_ROW}>
        <Button size="sm" variant={tab === "orders" ? "primary" : "secondary"} onClick={() => setTab("orders")}>
          Orders {ordersPagination.total ? `(${ordersPagination.total})` : ""}
        </Button>
        <Button size="sm" variant={tab === "ledger" ? "primary" : "secondary"} onClick={() => setTab("ledger")}>
          Ledger / payment history {ledgerPagination.total ? `(${ledgerPagination.total})` : ""}
        </Button>
      </div>

      {tab === "orders" ? (
        <DirectoryTableWrap
          footer={
            <div style={PAGE_ROW}>
              <p className="jd-lead" style={{ margin: 0 }}>
                Page {ordersPage} of {ordersTotalPages} ({ordersPagination.total || 0} orders)
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={ordersPage <= 1}
                onClick={() => setOrdersPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={ordersPage >= ordersTotalPages}
                onClick={() => setOrdersPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          }
        >
          <Table
            columns={orderColumns}
            rows={ordersTableData}
            rowKey={(row) => row.rowKey}
            empty="No completed orders yet"
          />
        </DirectoryTableWrap>
      ) : (
        <DirectoryTableWrap
          footer={
            <div style={PAGE_ROW}>
              <p className="jd-lead" style={{ margin: 0 }}>
                Page {ledgerPage} of {ledgerTotalPages} ({ledgerPagination.total || 0} entries)
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={ledgerPage <= 1}
                onClick={() => setLedgerPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={ledgerPage >= ledgerTotalPages}
                onClick={() => setLedgerPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          }
        >
          <Table
            columns={ledgerColumns}
            rows={ledgerTableData}
            rowKey={(row) => row.rowKey}
            empty="No wallet activity yet"
          />
        </DirectoryTableWrap>
      )}
    </div>
  );
}
