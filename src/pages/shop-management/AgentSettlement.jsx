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
  useConfirmCashRemittanceMutation,
  useRejectCashRemittanceMutation,
  useRecordCashSettlementMutation,
  useRecordAgentPayoutMutation,
  useSyncAgentWalletsMutation,
} from "../../store/services/api";

const isSuccess = (res) => res?.status === "1" || res?.status === 1;

function formatAgentMoney(amount, source) {
  return formatAmount(amount, source, { applyDefault: true });
}

const emptyActionModal = {
  open: false,
  type: null,
  agentId: null,
  agentName: "",
  remittanceId: null,
  currency: "",
  maxAmount: 0,
  amount: "",
  note: "",
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

  const [confirmRemittance, { isLoading: confirming }] =
    useConfirmCashRemittanceMutation();
  const [rejectRemittance, { isLoading: rejecting }] =
    useRejectCashRemittanceMutation();
  const [recordCashSettlement, { isLoading: recordingCash }] =
    useRecordCashSettlementMutation();
  const [recordPayout, { isLoading: recordingPayout }] =
    useRecordAgentPayoutMutation();
  const [syncAgentWallets, { isLoading: syncingWallets }] =
    useSyncAgentWalletsMutation();

  const isActing =
    confirming || rejecting || recordingCash || recordingPayout || syncingWallets;

  const cashDueAgents = useMemo(
    () => cashDueResponse?.data?.agents || [],
    [cashDueResponse?.data?.agents]
  );
  const remittances = useMemo(
    () => remittanceResponse?.data?.remittances || [],
    [remittanceResponse?.data?.remittances]
  );
  const remittancePagination = remittanceResponse?.data?.pagination || {};

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
    const symbols = new Set(
      cashDueAgents.map((agent) => resolveCurrencySymbol(agent, { applyDefault: true }))
    );
    return {
      totalCashDue,
      totalPending,
      totalPayable,
      currencySymbol: symbols.size === 1 ? [...symbols][0] : "",
    };
  }, [cashDueAgents]);

  const cashDueTableData = useMemo(
    () =>
      cashDueAgents.map((agent, index) => ({
        id: agent.agentUserId,
        rowKey: `cash-${agent.agentUserId ?? "unknown"}-${index}`,
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
      })),
    [cashDueAgents]
  );

  const remittanceTableData = useMemo(
    () =>
      remittances.map((row, index) => ({
        id: row.id,
        rowKey: `remittance-${row.id ?? "unknown"}-${index}`,
        sl: (remittancePage - 1) * 20 + index + 1,
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
      agentId: row.id || row.agentUserId,
      agentName: row.name,
      remittanceId: row.id,
      currency: row.currency,
      maxAmount,
      amount: maxAmount > 0 ? String(maxAmount.toFixed(2)) : "",
      note: "",
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
      } else if (actionModal.type === "cash-settlement") {
        res = await recordCashSettlement({
          agentId: actionModal.agentId,
          body: {
            amount: parsedAmount,
            note: actionModal.note?.trim() || undefined,
          },
        }).unwrap();
      } else if (actionModal.type === "payout") {
        res = await recordPayout({
          agentId: actionModal.agentId,
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
    closeActionModal,
    confirmRemittance,
    isActing,
    recordCashSettlement,
    recordPayout,
    rejectRemittance,
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
            meta={[
              row.shopName &&
              row.shopName !== "-" &&
              row.name &&
              row.name !== row.shopName
                ? row.name
                : null,
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
        sortable: true,
        sortKey: "cashDue",
        render: (row) => <DirectoryMoney>{row.cashDueLabel}</DirectoryMoney>,
      },
      {
        key: "totalCashCollected",
        header: "Cash collected",
        sortable: true,
        sortKey: "totalCashCollectedRaw",
        render: (row) => <DirectoryMoney>{row.totalCashCollected}</DirectoryMoney>,
      },
      {
        key: "platformOwesLabel",
        header: "Payable",
        sortable: true,
        sortKey: "platformOwes",
        render: (row) => <DirectoryMoney>{row.platformOwesLabel}</DirectoryMoney>,
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionView
              onClick={() => navigate(`/shop-management/agent-settlement/${row.id}`)}
            />
            <Button
              size="sm"
              disabled={row.cashDue <= 0 || isActing}
              onClick={() => openActionModal("cash-settlement", row)}
            >
              Record
            </Button>
            <Button
              size="sm"
              variant="secondary"
              disabled={row.platformOwes <= 0 || isActing}
              onClick={() => openActionModal("payout", row)}
            >
              Payout
            </Button>
          </DirectoryActions>
        ),
      },
    ],
    [isActing, openActionModal]
  );

  const remittanceColumns = useMemo(
    () => [
      {
        key: "name",
        header: "Agent",
        sortable: true,
        sortKey: "name",
        render: (row) => (
          <DirectoryIdentity name={row.name} email={row.email} />
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

  const modalTitle = useMemo(() => {
    switch (actionModal.type) {
      case "cash-settlement":
        return "Record Cash Settlement";
      case "payout":
        return "Record Agent Payout";
      case "confirm-remittance":
        return "Confirm Cash Remittance";
      case "reject-remittance":
        return "Reject Cash Remittance";
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

  const tabError = tab === "cash-due" ? cashDueError : remittanceError;
  const tabLoading = tab === "cash-due" ? cashDueLoading : remittanceLoading;

  return (
    <div>
      <DirectoryMetrics
        items={[
          {
            label: "Total cash due",
            value: formatMoney(summary.totalCashDue, summary.currencySymbol),
            tone: "warning",
          },
          {
            label: "Pending remittances",
            value: formatMoney(summary.totalPending, summary.currencySymbol),
            tone: "navy",
          },
          {
            label: "Platform owes agents",
            value: formatMoney(summary.totalPayable, summary.currencySymbol),
            tone: "success",
          },
        ]}
      />

      <div style={FORMULA_CARD} title="Cash settlement formula">
        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.03em", color: "#5c6673" }}>
          How cash due is calculated
        </p>
        <p style={{ margin: "0 0 8px", fontSize: 14, color: "#333", fontWeight: 600 }}>
          Cash due = Cash collected − Commission earned − Cash remitted
        </p>
        <p style={{ margin: 0, fontSize: 12, color: "#8a94a6", lineHeight: 1.5 }}>
          Commission earned is the shop&apos;s laundry share plus the booking-time driver tip.
          Service fee stays with the platform. Extra tips added after delivery are card charges
          to the platform and increase <strong>Platform owes agents</strong> — they do not change cash due.
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
          ? "Cash due is the platform share the shop still holds after collecting cash from the customer. New shops appear here automatically after cash collect; if a row is missing, tap Sync from paid bookings."
          : "Agent-submitted cash remittances awaiting your confirmation."}
      </p>

      {tabError ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            {tab === "cash-due"
              ? "Could not load agent settlements."
              : "Could not load pending remittances."}
          </p>
          <Button
            variant="secondary"
            onClick={() =>
              tab === "cash-due" ? refetchCashDue() : refetchRemittances()
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
            empty="No agents with cash due"
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </DirectoryTableWrap>
      ) : (
        <>
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
        </>
      )}

      <Modal
        open={actionModal.open}
        title={modalTitle}
        description={`Agent: ${actionModal.agentName}${
          actionModal.maxAmount > 0 && showAmountField
            ? ` — max ${formatAgentMoney(actionModal.maxAmount, actionModal)}`
            : ""
        }`}
        onClose={closeActionModal}
        onPrimary={handleSubmitAction}
        primaryLabel={
          isActing
            ? "Saving…"
            : actionModal.type === "confirm-remittance"
              ? "Confirm"
              : actionModal.type === "reject-remittance"
                ? "Reject"
                : "Save"
        }
        secondaryLabel="Cancel"
        danger={actionModal.type === "reject-remittance"}
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
          <Field label="Note (optional)" htmlFor="settlement-note">
            <Textarea
              id="settlement-note"
              rows={3}
              value={actionModal.note}
              onChange={(e) =>
                setActionModal((prev) => ({ ...prev, note: e.target.value }))
              }
              placeholder={
                actionModal.type === "reject-remittance"
                  ? "Reason for rejection"
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
          { label: "Agent", value: viewRow?.name },
          { label: "Email", value: viewRow?.email },
          { label: "Amount", value: viewRow?.amountLabel },
          { label: "Note", value: viewRow?.description },
          { label: "Submitted", value: viewRow?.submittedAt },
        ]}
      />
    </div>
  );
}
