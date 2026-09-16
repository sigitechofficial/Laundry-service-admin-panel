import { useCallback, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Field,
  Input,
  Modal,
  Table,
  Textarea,
} from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import {
  DATE_TIME_FORMAT,
  formatAmount,
  formatDate,
  formatMoney,
  resolveCurrencySymbol,
} from "../../utilities/formatters";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryMoney,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import {
  useGetAgentsCashDueQuery,
  useGetPendingRemittancesQuery,
  useGetPendingWithdrawalsQuery,
  useConfirmCashRemittanceMutation,
  useRejectCashRemittanceMutation,
  useApproveWithdrawalMutation,
  useRejectWithdrawalMutation,
  useRecordCashSettlementMutation,
  useRecordAgentPayoutMutation,
  useSyncAgentWalletsMutation,
} from "../../store/services/api";
import { shopSettlementPath } from "../reports/reportUi";

const isSuccess = (res) => res?.status === "1" || res?.status === 1;

function formatAgentMoney(amount, source) {
  return formatAmount(amount, source, { applyDefault: true });
}

const emptyActionModal = {
  open: false,
  type: null,
  shopId: null,
  agentId: null,
  agentName: "",
  remittanceId: null,
  withdrawalId: null,
  currency: "",
  maxAmount: 0,
  amount: "",
  note: "",
  connectReady: true,
};

const TAB_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
  marginBottom: 12,
};

const PAGE_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "center",
  marginTop: 16,
};

const FORMULA_CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
  marginBottom: 16,
};

function matchesSearch(row, term) {
  if (!term) return true;
  const q = term.toLowerCase();
  return Object.entries(row).some(([key, value]) => {
    if (key === "actions") return false;
    return String(value ?? "")
      .toLowerCase()
      .includes(q);
  });
}

function compareSettlementRows(a, b, sortBy, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;
  const av = a?.[sortBy];
  const bv = b?.[sortBy];
  if (typeof av === "number" && typeof bv === "number") {
    return (av - bv) * dir;
  }
  return (
    String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
      sensitivity: "base",
      numeric: true,
    }) * dir
  );
}

export default function AgentSettlement() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [tab, setTab] = useState("cash-due");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("cashDue");
  const [sortDir, setSortDir] = useState("desc");
  const [remittancePage, setRemittancePage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [actionModal, setActionModal] = useState(emptyActionModal);
  const [viewRow, setViewRow] = useState(null);
  const actingRef = useRef(false);

  const {
    data: cashDueResponse,
    isLoading: cashDueLoading,
    isError: cashDueError,
    refetch: refetchCashDue,
  } = useGetAgentsCashDueQuery(
    { page: 1, limit: 100 },
    { skip: tab !== "cash-due" }
  );

  const {
    data: remittanceResponse,
    isLoading: remittanceLoading,
    isError: remittanceError,
    refetch: refetchRemittances,
  } = useGetPendingRemittancesQuery(
    { page: remittancePage, limit: 20 },
    { skip: tab !== "remittances" }
  );

  const {
    data: withdrawalResponse,
    isLoading: withdrawalLoading,
    isError: withdrawalError,
    refetch: refetchWithdrawals,
  } = useGetPendingWithdrawalsQuery(
    { page: withdrawalPage, limit: 20 },
    { skip: tab !== "withdrawals" }
  );

  const [confirmRemittance, { isLoading: confirming }] =
    useConfirmCashRemittanceMutation();
  const [rejectRemittance, { isLoading: rejecting }] =
    useRejectCashRemittanceMutation();
  const [approveWithdrawal, { isLoading: approvingWithdrawal }] =
    useApproveWithdrawalMutation();
  const [rejectWithdrawal, { isLoading: rejectingWithdrawal }] =
    useRejectWithdrawalMutation();
  const [recordCashSettlement, { isLoading: recordingCash }] =
    useRecordCashSettlementMutation();
  const [recordPayout, { isLoading: recordingPayout }] =
    useRecordAgentPayoutMutation();
  const [syncAgentWallets, { isLoading: syncingWallets }] =
    useSyncAgentWalletsMutation();

  const isActing =
    confirming ||
    rejecting ||
    approvingWithdrawal ||
    rejectingWithdrawal ||
    recordingCash ||
    recordingPayout ||
    syncingWallets;

  const cashDueAgents = useMemo(
    () => cashDueResponse?.data?.agents || [],
    [cashDueResponse?.data?.agents]
  );
  const remittances = useMemo(
    () => remittanceResponse?.data?.remittances || [],
    [remittanceResponse?.data?.remittances]
  );
  const remittancePagination = remittanceResponse?.data?.pagination || {};
  const withdrawals = useMemo(
    () => withdrawalResponse?.data?.withdrawals || [],
    [withdrawalResponse?.data?.withdrawals]
  );
  const withdrawalPagination = withdrawalResponse?.data?.pagination || {};

  const summary = useMemo(() => {
    const totalCashDue = cashDueAgents.reduce(
      (sum, row) => sum + Number(row.cashDueToPlatform || 0),
      0
    );
    const totalPending = cashDueAgents.reduce(
      (sum, row) => sum + Number(row.pendingCashRemittance || 0),
      0
    );
    const totalPayable = cashDueAgents.reduce(
      (sum, row) => sum + Number(row.platformOwesAgent || 0),
      0
    );
    const totalRemitted = cashDueAgents.reduce(
      (sum, row) => sum + Number(row.totalCashRemitted || 0),
      0
    );
    const totalReleased = cashDueAgents.reduce(
      (sum, row) => sum + Number(row.totalAgentPayouts || 0),
      0
    );
    const symbols = new Set(
      cashDueAgents.map((agent) => resolveCurrencySymbol(agent, { applyDefault: true }))
    );
    return {
      totalCashDue,
      totalPending,
      totalPayable,
      totalRemitted,
      totalReleased,
      currencySymbol: symbols.size === 1 ? [...symbols][0] : "",
    };
  }, [cashDueAgents]);

  const cashDueTableData = useMemo(
    () =>
      cashDueAgents.map((agent, index) => ({
        id: agent.shopId,
        shopId: agent.shopId,
        agentUserId: agent.agentUserId,
        rowKey: `cash-${agent.shopId ?? agent.agentUserId ?? "unknown"}-${index}`,
        sl: index + 1,
        name: agent.shopName || agent.agentName || "-",
        email: agent.agentEmail || "-",
        shopName: agent.shopName || "-",
        shopAddress: agent.shopAddress || "-",
        currency: agent.currency,
        cashDue: Number(agent.cashDueToPlatform || 0),
        cashDueLabel: formatAgentMoney(agent.cashDueToPlatform, agent),
        pendingRemittance: Number(agent.pendingCashRemittance || 0),
        pendingLabel: formatAgentMoney(agent.pendingCashRemittance, agent),
        platformOwes: Number(agent.platformOwesAgent || 0),
        platformOwesLabel: formatAgentMoney(agent.platformOwesAgent, agent),
        totalCashCollected: formatAgentMoney(agent.totalCashCollected, agent),
        totalCashCollectedRaw: Number(agent.totalCashCollected || 0),
        totalCashRemitted: formatAgentMoney(agent.totalCashRemitted, agent),
        totalCashRemittedRaw: Number(agent.totalCashRemitted || 0),
        totalPaidOut: formatAgentMoney(agent.totalAgentPayouts, agent),
        totalPaidOutRaw: Number(agent.totalAgentPayouts || 0),
        totalWithdrawn: formatAgentMoney(agent.totalWithdrawn, agent),
        lastCashRemittedAt: agent.lastCashRemittedAt
          ? formatDate(agent.lastCashRemittedAt, DATE_TIME_FORMAT)
          : "—",
        lastCashRemittedAtMs: agent.lastCashRemittedAt
          ? new Date(agent.lastCashRemittedAt).getTime() || 0
          : 0,
      })),
    [cashDueAgents]
  );

  const remittanceTableData = useMemo(
    () =>
      remittances.map((row, index) => ({
        id: row.id,
        rowKey: `remittance-${row.id ?? "unknown"}-${index}`,
        sl: (remittancePage - 1) * 20 + index + 1,
        shopId: row.shopId,
        agentUserId: row.agentUserId,
        name: row.agentName || "-",
        email: row.agentEmail || "-",
        currency: row.currency,
        amount: Number(row.amount || 0),
        amountLabel: formatAgentMoney(row.amount, row),
        description: row.description || "-",
        submittedAt: formatDate(row.createdAt, DATE_TIME_FORMAT),
        submittedAtMs: row.createdAt ? new Date(row.createdAt).getTime() || 0 : 0,
      })),
    [remittances, remittancePage]
  );

  const withdrawalTableData = useMemo(
    () =>
      withdrawals.map((row, index) => ({
        id: row.id,
        rowKey: `withdrawal-${row.id ?? "unknown"}-${index}`,
        sl: (withdrawalPage - 1) * 20 + index + 1,
        shopId: row.shopId,
        agentUserId: row.agentUserId,
        name: row.shopName || row.agentName || "-",
        email: row.agentEmail || "-",
        currency: row.currency,
        amount: Number(row.amount || 0),
        amountLabel: formatAgentMoney(row.amount, row),
        description: row.description || "-",
        connectReady: Boolean(row.isConnectAccountConnected),
        submittedAt: formatDate(row.createdAt, DATE_TIME_FORMAT),
        submittedAtMs: row.createdAt ? new Date(row.createdAt).getTime() || 0 : 0,
      })),
    [withdrawals, withdrawalPage]
  );

  const visibleCashDue = useMemo(() => {
    const filtered = cashDueTableData.filter((row) =>
      matchesSearch(row, searchTerm)
    );
    return [...filtered].sort((a, b) =>
      compareSettlementRows(a, b, sortBy, sortDir)
    );
  }, [cashDueTableData, searchTerm, sortBy, sortDir]);

  const visibleRemittances = useMemo(() => {
    const filtered = remittanceTableData.filter((row) =>
      matchesSearch(row, searchTerm)
    );
    return [...filtered].sort((a, b) =>
      compareSettlementRows(a, b, sortBy, sortDir)
    );
  }, [remittanceTableData, searchTerm, sortBy, sortDir]);

  const visibleWithdrawals = useMemo(() => {
    const filtered = withdrawalTableData.filter((row) =>
      matchesSearch(row, searchTerm)
    );
    return [...filtered].sort((a, b) =>
      compareSettlementRows(a, b, sortBy, sortDir)
    );
  }, [withdrawalTableData, searchTerm, sortBy, sortDir]);

  const handleSort = useCallback((key) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "name" || key === "email" ? "asc" : "desc");
      return key;
    });
  }, []);

  const switchTab = useCallback((nextTab) => {
    setTab(nextTab);
    setSearchTerm("");
    if (nextTab === "cash-due") {
      setSortBy("cashDue");
      setSortDir("desc");
    } else {
      setSortBy("submittedAtMs");
      setSortDir("desc");
    }
  }, []);

  const openActionModal = useCallback((type, row) => {
    const maxAmount =
      type === "cash-settlement"
        ? Number(row.cashDue || 0)
        : type === "payout"
          ? Number(row.platformOwes || 0)
          : 0;

    setActionModal({
      open: true,
      type,
      shopId: row.shopId || null,
      agentId: row.agentUserId || null,
      agentName: row.name,
      remittanceId: type.includes("remittance") ? row.id : null,
      withdrawalId: type.includes("withdrawal") ? row.id : null,
      currency: row.currency,
      maxAmount,
      amount: maxAmount > 0 ? String(maxAmount.toFixed(2)) : "",
      note: "",
      connectReady: row.connectReady !== false,
    });
  }, []);

  const closeActionModal = useCallback(() => {
    setActionModal(emptyActionModal);
  }, []);

  const handleSubmitAction = useCallback(async () => {
    if (actingRef.current || isActing) return;

    const parsedAmount = parseFloat(actionModal.amount);
    if (
      (actionModal.type === "cash-settlement" || actionModal.type === "payout") &&
      (!Number.isFinite(parsedAmount) || parsedAmount <= 0)
    ) {
      showError("Enter a valid amount");
      return;
    }

    actingRef.current = true;
    try {
      let res;

      if (actionModal.type === "confirm-remittance") {
        res = await confirmRemittance({
          remittanceId: actionModal.remittanceId,
          body: { note: actionModal.note?.trim() || undefined },
        }).unwrap();
      } else if (actionModal.type === "reject-remittance") {
        res = await rejectRemittance({
          remittanceId: actionModal.remittanceId,
          body: { note: actionModal.note?.trim() || undefined },
        }).unwrap();
      } else if (actionModal.type === "approve-withdrawal") {
        if (!actionModal.withdrawalId) {
          showError("Missing withdrawal id");
          return;
        }
        res = await approveWithdrawal({
          withdrawalId: actionModal.withdrawalId,
          body: { note: actionModal.note?.trim() || undefined },
        }).unwrap();
      } else if (actionModal.type === "reject-withdrawal") {
        if (!actionModal.withdrawalId) {
          showError("Missing withdrawal id");
          return;
        }
        if (!actionModal.note?.trim()) {
          showError("Rejection note is required");
          return;
        }
        res = await rejectWithdrawal({
          withdrawalId: actionModal.withdrawalId,
          body: { note: actionModal.note.trim() },
        }).unwrap();
      } else if (actionModal.type === "cash-settlement") {
        if (!actionModal.shopId) {
          showError("This row has no shop id");
          return;
        }
        res = await recordCashSettlement({
          shopId: actionModal.shopId,
          body: {
            amount: parsedAmount,
            note: actionModal.note?.trim() || undefined,
          },
        }).unwrap();
      } else if (actionModal.type === "payout") {
        if (!actionModal.shopId) {
          showError("This row has no shop id");
          return;
        }
        res = await recordPayout({
          shopId: actionModal.shopId,
          body: {
            amount: parsedAmount,
            note: actionModal.note?.trim() || undefined,
          },
        }).unwrap();
      }

      if (isSuccess(res)) {
        success(res?.message || "Action completed");
        closeActionModal();
      } else {
        showError(res?.message || "Action failed");
      }
    } catch (err) {
      showError(err?.data?.message || "Action failed");
    } finally {
      actingRef.current = false;
    }
  }, [
    actionModal,
    approveWithdrawal,
    closeActionModal,
    confirmRemittance,
    isActing,
    recordCashSettlement,
    recordPayout,
    rejectRemittance,
    rejectWithdrawal,
    showError,
    success,
  ]);

  const handleSyncWallets = useCallback(async () => {
    if (actingRef.current || syncingWallets) return;
    actingRef.current = true;
    try {
      const res = await syncAgentWallets({ limit: 500 }).unwrap();
      if (isSuccess(res)) {
        const stats = res?.data || {};
        success(
          `Sync done: ${stats.credited || 0} credited, ${stats.cashRecorded || 0} cash recorded (${stats.processed || 0} processed)`
        );
        refetchCashDue();
      } else {
        showError(res?.message || "Wallet sync failed");
      }
    } catch (err) {
      showError(err?.data?.message || "Wallet sync failed");
    } finally {
      actingRef.current = false;
    }
  }, [refetchCashDue, showError, success, syncAgentWallets, syncingWallets]);

  const cashDueColumns = useMemo(
    () => [
      {
        key: "name",
        header: "Agent",
        sortable: true,
        sortKey: "name",
        render: (row) => (
          <DirectoryIdentity
            name={row.shopName && row.shopName !== "-" ? row.shopName : row.name}
            email={row.email}
            id={row.shopId}
            meta={[
              row.shopName &&
              row.shopName !== "-" &&
              row.name &&
              row.name !== row.shopName
                ? row.name
                : null,
              row.agentUserId ? `Owner #${row.agentUserId}` : null,
              row.shopAddress,
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ),
      },
      {
        key: "cashDueLabel",
        header: "Cash due",
        align: "right",
        sortable: true,
        sortKey: "cashDue",
        render: (row) => <DirectoryMoney>{row.cashDueLabel}</DirectoryMoney>,
      },
      {
        key: "totalCashCollected",
        header: "Cash collected",
        align: "right",
        sortable: true,
        sortKey: "totalCashCollectedRaw",
        render: (row) => <DirectoryMoney>{row.totalCashCollected}</DirectoryMoney>,
      },
      {
        key: "totalCashRemitted",
        header: "Cash already sent",
        align: "right",
        sortable: true,
        sortKey: "totalCashRemittedRaw",
        render: (row) => <DirectoryMoney>{row.totalCashRemitted}</DirectoryMoney>,
      },
      {
        key: "platformOwesLabel",
        header: "Still payable",
        align: "right",
        sortable: true,
        sortKey: "platformOwes",
        render: (row) => <DirectoryMoney>{row.platformOwesLabel}</DirectoryMoney>,
      },
      {
        key: "totalPaidOut",
        header: "Already released",
        align: "right",
        sortable: true,
        sortKey: "totalPaidOutRaw",
        render: (row) => <DirectoryMoney>{row.totalPaidOut}</DirectoryMoney>,
      },
      {
        key: "lastCashRemittedAt",
        header: "Last cash sent",
        sortable: true,
        sortKey: "lastCashRemittedAtMs",
        render: (row) => row.lastCashRemittedAt,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionView
              disabled={!shopSettlementPath(row.shopId)}
              onClick={() => {
                const path = shopSettlementPath(row.shopId);
                if (path) navigate(path);
              }}
            />
            <Button
              size="sm"
              disabled={!row.shopId || row.cashDue <= 0 || isActing}
              onClick={() => openActionModal("cash-settlement", row)}
            >
              Record
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={!row.shopId || row.platformOwes <= 0 || isActing || row.connectReady === false}
              onClick={() => openActionModal("payout", row)}
            >
              Pay to Connect
            </Button>
          </DirectoryActions>
        ),
      },
    ],
    [isActing, navigate, openActionModal]
  );

  const remittanceColumns = useMemo(
    () => [
      {
        key: "name",
        header: "Agent",
        sortable: true,
        sortKey: "name",
        render: (row) => (
          <DirectoryIdentity
            name={row.name}
            email={row.email}
            id={row.shopId}
            meta={row.agentUserId ? `Owner #${row.agentUserId}` : null}
          />
        ),
      },
      {
        key: "amountLabel",
        header: "Amount",
        sortable: true,
        sortKey: "amount",
        render: (row) => <DirectoryMoney>{row.amountLabel}</DirectoryMoney>,
      },
      {
        key: "submittedAt",
        header: "Submitted",
        sortable: true,
        sortKey: "submittedAtMs",
        render: (row) => row.submittedAt,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionView onClick={() => setViewRow({ kind: "remit", ...row })} />
            <Button
              size="sm"
              disabled={isActing}
              onClick={() => openActionModal("confirm-remittance", row)}
            >
              Confirm
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={isActing}
              onClick={() => openActionModal("reject-remittance", row)}
            >
              Reject
            </Button>
          </DirectoryActions>
        ),
      },
    ],
    [isActing, openActionModal]
  );

  const withdrawalColumns = useMemo(
    () => [
      {
        key: "name",
        header: "Shop / agent",
        sortable: true,
        sortKey: "name",
        render: (row) => (
          <DirectoryIdentity
            name={row.name}
            email={row.email}
            id={row.shopId}
            meta={[
              row.agentUserId ? `Owner #${row.agentUserId}` : null,
              row.connectReady ? "Stripe ready" : "Connect onboarding needed",
            ]
              .filter(Boolean)
              .join(" · ")}
          />
        ),
      },
      {
        key: "amountLabel",
        header: "Amount",
        sortable: true,
        sortKey: "amount",
        render: (row) => <DirectoryMoney>{row.amountLabel}</DirectoryMoney>,
      },
      {
        key: "submittedAt",
        header: "Requested",
        sortable: true,
        sortKey: "submittedAtMs",
        render: (row) => row.submittedAt,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionView
              onClick={() => setViewRow({ kind: "withdrawal", ...row })}
            />
            {row.shopId ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const path = shopSettlementPath(row.shopId);
                  if (path) navigate(path);
                }}
              >
                Details
              </Button>
            ) : null}
            <Button
              size="sm"
              disabled={isActing || !row.connectReady}
              title={
                row.connectReady
                  ? "Approve and transfer to Stripe Connect"
                  : "Complete Stripe Connect onboarding on the shop settlement page first"
              }
              onClick={() => openActionModal("approve-withdrawal", row)}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={isActing}
              onClick={() => openActionModal("reject-withdrawal", row)}
            >
              Reject
            </Button>
          </DirectoryActions>
        ),
      },
    ],
    [isActing, navigate, openActionModal]
  );

  const modalTitle = useMemo(() => {
    switch (actionModal.type) {
      case "cash-settlement":
        return "Record Cash Settlement";
      case "payout":
        return "Pay agent via Stripe Connect";
      case "confirm-remittance":
        return "Confirm Cash Remittance";
      case "reject-remittance":
        return "Reject Cash Remittance";
      case "approve-withdrawal":
        return "Approve Withdrawal";
      case "reject-withdrawal":
        return "Reject Withdrawal";
      default:
        return "Action";
    }
  }, [actionModal.type]);

  const showAmountField =
    actionModal.type === "cash-settlement" || actionModal.type === "payout";

  const remittanceTotalPages = Math.max(
    1,
    Math.ceil((remittancePagination.total || 0) / 20)
  );
  const withdrawalTotalPages = Math.max(
    1,
    Math.ceil((withdrawalPagination.total || 0) / 20)
  );

  const tabError =
    tab === "cash-due"
      ? cashDueError
      : tab === "remittances"
        ? remittanceError
        : withdrawalError;
  const tabLoading =
    tab === "cash-due"
      ? cashDueLoading
      : tab === "remittances"
        ? remittanceLoading
        : withdrawalLoading;

  return (
    <div>
      <DirectoryMetrics
        items={[
          {
            label: "Still to collect",
            value: formatMoney(summary.totalCashDue, summary.currencySymbol),
            tone: "warning",
          },
          {
            label: "Already collected from agents",
            value: formatMoney(summary.totalRemitted, summary.currencySymbol),
            tone: "navy",
          },
          {
            label: "Still payable",
            value: formatMoney(summary.totalPayable, summary.currencySymbol),
            tone: "success",
          },
          {
            label: "Already sent to Stripe Connect",
            value: formatMoney(summary.totalReleased, summary.currencySymbol),
            tone: "success",
          },
        ]}
      />

      <div style={FORMULA_CARD} title="Cash settlement formula">
        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em", color: "#5c6673" }}>
          How the two rails work
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "#333", fontWeight: 600 }}>
          Still to collect = cash collected − refunds − commission credited − cash already sent
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#8a94a6", lineHeight: 1.5 }}>
          After you tap Record, <strong>Still to collect</strong> can become £0. That is expected —
          the money moved into <strong>Already collected from agents</strong>. Open the agent for
          the full split (tips, refunds, clawbacks, payouts). Pending remittances from the agent
          app sit in the other tab ({formatMoney(summary.totalPending, summary.currencySymbol)}).
          Extra tips after delivery increase payable, not cash due.
        </p>
      </div>

      <div style={{ ...TAB_ROW, justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button
            size="sm"
            variant={tab === "cash-due" ? "primary" : "secondary"}
            onClick={() => switchTab("cash-due")}
          >
            Agent settlements
          </Button>
          <Button
            size="sm"
            variant={tab === "remittances" ? "primary" : "secondary"}
            onClick={() => switchTab("remittances")}
          >
            Pending remittances
            {remittancePagination.total
              ? ` (${remittancePagination.total})`
              : ""}
          </Button>
          <Button
            size="sm"
            variant={tab === "withdrawals" ? "primary" : "secondary"}
            onClick={() => switchTab("withdrawals")}
          >
            Withdrawal requests
            {withdrawalPagination.total
              ? ` (${withdrawalPagination.total})`
              : ""}
          </Button>
        </div>
        {tab === "cash-due" ? (
          <Button
            variant="secondary"
            size="sm"
            disabled={syncingWallets}
            onClick={handleSyncWallets}
          >
            {syncingWallets ? "Syncing…" : "Sync from paid bookings"}
          </Button>
        ) : null}
      </div>

      <p className="jd-lead" style={{ margin: "0 0 16px" }}>
        {tab === "cash-due"
          ? "Live due can be £0 after you record cash — remitted and released columns keep the lifetime trail. Open a shop for statement, payouts, and Connect."
          : tab === "remittances"
            ? "Agent-submitted cash remittances awaiting your confirmation."
            : "Agent withdrawal requests. Approve transfers money to their Stripe Connect payout account; reject releases the reserved balance."}
      </p>

      {tabError ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            {tab === "cash-due"
              ? "Could not load agent settlements."
              : tab === "remittances"
                ? "Could not load pending remittances."
                : "Could not load withdrawal requests."}
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              tab === "cash-due"
                ? refetchCashDue()
                : tab === "remittances"
                  ? refetchRemittances()
                  : refetchWithdrawals()
            }
          >
            Retry
          </Button>
        </div>
      ) : tabLoading ? (
        <Delay />
      ) : tab === "cash-due" ? (
        <DirectoryTableWrap
          toolbar={
            <DirectoryToolbar>
              <DirectorySearch
                id="cash-due-search"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search name, email, address…"
              />
            </DirectoryToolbar>
          }
        >
          <Table
            columns={cashDueColumns}
            rows={visibleCashDue}
            rowKey={(row) => row.rowKey}
            empty="No agents with settlement activity yet"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </DirectoryTableWrap>
      ) : tab === "remittances" ? (
        <DirectoryTableWrap
          toolbar={
            <DirectoryToolbar>
              <DirectorySearch
                id="remittance-search"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search name, email…"
              />
            </DirectoryToolbar>
          }
          footer={
            <div style={PAGE_ROW}>
              <p className="jd-lead" style={{ margin: 0 }}>
                Page {remittancePage} of {remittanceTotalPages} (
                {remittancePagination.total || 0} total)
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={remittancePage <= 1}
                onClick={() => setRemittancePage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={remittancePage >= remittanceTotalPages}
                onClick={() => setRemittancePage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          }
        >
          <Table
            columns={remittanceColumns}
            rows={visibleRemittances}
            rowKey={(row) => row.rowKey}
            empty="No pending remittances"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </DirectoryTableWrap>
      ) : (
        <DirectoryTableWrap
          toolbar={
            <DirectoryToolbar>
              <DirectorySearch
                id="withdrawal-search"
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Search shop, agent, email…"
              />
            </DirectoryToolbar>
          }
          footer={
            <div style={PAGE_ROW}>
              <p className="jd-lead" style={{ margin: 0 }}>
                Page {withdrawalPage} of {withdrawalTotalPages} (
                {withdrawalPagination.total || 0} total)
              </p>
              <Button
                variant="secondary"
                size="sm"
                disabled={withdrawalPage <= 1}
                onClick={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={withdrawalPage >= withdrawalTotalPages}
                onClick={() => setWithdrawalPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          }
        >
          <Table
            columns={withdrawalColumns}
            rows={visibleWithdrawals}
            rowKey={(row) => row.rowKey}
            empty="No pending withdrawal requests"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </DirectoryTableWrap>
      )}

      <Modal
        open={actionModal.open}
        title={modalTitle}
        description={`Agent: ${actionModal.agentName}${
          actionModal.maxAmount > 0 && showAmountField
            ? ` — max ${formatAgentMoney(actionModal.maxAmount, actionModal)}`
            : ""
        }${
          actionModal.type === "approve-withdrawal" && !actionModal.connectReady
            ? " — Stripe Connect onboarding required before approve"
            : ""
        }`}
        onClose={closeActionModal}
        onPrimary={handleSubmitAction}
        primaryLabel={
          isActing
            ? "Saving…"
            : actionModal.type === "confirm-remittance" ||
                actionModal.type === "approve-withdrawal"
              ? "Approve"
              : actionModal.type === "reject-remittance" ||
                  actionModal.type === "reject-withdrawal"
                ? "Reject"
                : "Save"
        }
        secondaryLabel="Cancel"
        danger={
          actionModal.type === "reject-remittance" ||
          actionModal.type === "reject-withdrawal"
        }
        primaryDisabled={
          (actionModal.type === "approve-withdrawal" && !actionModal.connectReady) ||
          (actionModal.type === "payout" && !actionModal.connectReady)
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {showAmountField ? (
            <Field label="Amount" htmlFor="settlement-amount">
              <Input
                id="settlement-amount"
                type="number"
                min={0}
                step="0.01"
                value={actionModal.amount}
                onChange={(e) =>
                  setActionModal((prev) => ({ ...prev, amount: e.target.value }))
                }
              />
            </Field>
          ) : null}
          <Field
            label={
              actionModal.type === "reject-withdrawal"
                ? "Rejection reason (required)"
                : "Note (optional)"
            }
            htmlFor="settlement-note"
          >
            <Textarea
              id="settlement-note"
              rows={3}
              value={actionModal.note}
              onChange={(e) =>
                setActionModal((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder={
                actionModal.type === "reject-remittance" ||
                actionModal.type === "reject-withdrawal"
                  ? "Reason for rejection"
                  : actionModal.type === "approve-withdrawal"
                    ? "Optional approval note"
                    : "Optional note"
              }
            />
          </Field>
        </div>
      </Modal>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.name || "Settlement"}
        onClose={() => setViewRow(null)}
        fields={[
          { label: "Shop", value: viewRow?.shopId ? `#${viewRow.shopId}` : "—" },
          { label: "Owner", value: viewRow?.agentUserId ? `#${viewRow.agentUserId}` : "—" },
          { label: "Agent", value: viewRow?.name },
          { label: "Email", value: viewRow?.email },
          { label: "Amount", value: viewRow?.amountLabel },
          { label: "Note", value: viewRow?.description },
          {
            label: viewRow?.kind === "withdrawal" ? "Requested" : "Submitted",
            value: viewRow?.submittedAt,
          },
          viewRow?.kind === "withdrawal"
            ? {
                label: "Stripe Connect",
                value: viewRow?.connectReady ? "Ready" : "Onboarding needed",
              }
            : null,
        ].filter(Boolean)}
      />
    </div>
  );
}
