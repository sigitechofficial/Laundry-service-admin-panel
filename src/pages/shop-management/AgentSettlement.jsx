import { useCallback, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import dayjs from "dayjs";
import DataTable from "../../components/ui/DataTable";
import ModalComponent from "../../components/shared/Modal";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import { formatGbp } from "../../utils/formatGbp";
import {
  useGetAgentsCashDueQuery,
  useGetPendingRemittancesQuery,
  useConfirmCashRemittanceMutation,
  useRejectCashRemittanceMutation,
  useRecordCashSettlementMutation,
  useRecordAgentPayoutMutation,
} from "../../store/services/api";

const isSuccess = (res) => res?.status === "1" || res?.status === 1;

const emptyActionModal = {
  open: false,
  type: null,
  agentId: null,
  agentName: "",
  remittanceId: null,
  maxAmount: 0,
  amount: "",
  note: "",
};

export default function AgentSettlement() {
  const { success, error: showError } = useToaster();
  const [tab, setTab] = useState("cash-due");
  const [remittancePage, setRemittancePage] = useState(1);
  const [actionModal, setActionModal] = useState(emptyActionModal);
  const actingRef = useRef(false);

  const { data: cashDueResponse, isLoading: cashDueLoading } =
    useGetAgentsCashDueQuery({ page: 1, limit: 100 }, { skip: tab !== "cash-due" });

  const { data: remittanceResponse, isLoading: remittanceLoading } =
    useGetPendingRemittancesQuery(
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

  const isActing = confirming || rejecting || recordingCash || recordingPayout;

  const cashDueAgents = cashDueResponse?.data?.agents || [];
  const remittances = remittanceResponse?.data?.remittances || [];
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
    return { totalCashDue, totalPending, totalPayable };
  }, [cashDueAgents]);

  const cashDueTableData = useMemo(
    () =>
      cashDueAgents.map((agent, index) => ({
        id: agent.agentUserId,
        sl: index + 1,
        name: agent.agentName || "-",
        email: agent.agentEmail || "-",
        shopAddress: agent.shopAddress || "-",
        cashDue: Number(agent.cashDueToPlatform || 0),
        cashDueLabel: formatGbp(agent.cashDueToPlatform),
        pendingRemittance: Number(agent.pendingCashRemittance || 0),
        pendingLabel: formatGbp(agent.pendingCashRemittance),
        platformOwes: Number(agent.platformOwesAgent || 0),
        platformOwesLabel: formatGbp(agent.platformOwesAgent),
        totalCashCollected: formatGbp(agent.totalCashCollected),
        totalCashRemitted: formatGbp(agent.totalCashRemitted),
      })),
    [cashDueAgents]
  );

  const remittanceTableData = useMemo(
    () =>
      remittances.map((row, index) => ({
        id: row.id,
        sl: (remittancePage - 1) * 20 + index + 1,
        agentUserId: row.agentUserId,
        name: row.agentName || "-",
        email: row.agentEmail || "-",
        amount: Number(row.amount || 0),
        amountLabel: formatGbp(row.amount),
        description: row.description || "-",
        submittedAt: row.createdAt
          ? dayjs(row.createdAt).format("DD MMM YYYY, HH:mm")
          : "-",
      })),
    [remittances, remittancePage]
  );

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
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
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

  const cashDueColumns = useMemo(
    () => [
      { field: "sl", headerName: "SL", width: 60 },
      { field: "name", headerName: "Agent", flex: 1, minWidth: 140 },
      { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
      { field: "shopAddress", headerName: "Shop", flex: 1.2, minWidth: 160 },
      { field: "cashDueLabel", headerName: "Cash Due", width: 120 },
      { field: "pendingLabel", headerName: "Pending", width: 110 },
      { field: "platformOwesLabel", headerName: "Payable", width: 110 },
      { field: "totalCashCollected", headerName: "Collected", width: 110 },
      { field: "totalCashRemitted", headerName: "Remitted", width: 110 },
      {
        field: "actions",
        headerName: "Actions",
        width: 240,
        renderCell: (row) => (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              size="small"
              variant="contained"
              disabled={row.cashDue <= 0 || isActing}
              onClick={(e) => {
                e.stopPropagation();
                openActionModal("cash-settlement", row);
              }}
              sx={{ textTransform: "none", minWidth: 88 }}
            >
              Record Cash
            </Button>
            <Button
              size="small"
              variant="outlined"
              disabled={row.platformOwes <= 0 || isActing}
              onClick={(e) => {
                e.stopPropagation();
                openActionModal("payout", row);
              }}
              sx={{ textTransform: "none", minWidth: 72 }}
            >
              Payout
            </Button>
          </Box>
        ),
      },
    ],
    [isActing, openActionModal]
  );

  const remittanceColumns = useMemo(
    () => [
      { field: "sl", headerName: "SL", width: 60 },
      { field: "name", headerName: "Agent", flex: 1, minWidth: 140 },
      { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
      { field: "amountLabel", headerName: "Amount", width: 110 },
      { field: "description", headerName: "Note", flex: 1.2, minWidth: 180 },
      { field: "submittedAt", headerName: "Submitted", width: 160 },
      {
        field: "actions",
        headerName: "Actions",
        width: 200,
        renderCell: (row) => (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={isActing}
              onClick={(e) => {
                e.stopPropagation();
                openActionModal("confirm-remittance", row);
              }}
              sx={{ textTransform: "none", minWidth: 72 }}
            >
              Confirm
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={isActing}
              onClick={(e) => {
                e.stopPropagation();
                openActionModal("reject-remittance", row);
              }}
              sx={{ textTransform: "none", minWidth: 64 }}
            >
              Reject
            </Button>
          </Box>
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

  if (
    (tab === "cash-due" && cashDueLoading) ||
    (tab === "remittances" && remittanceLoading)
  ) {
    return <Delay />;
  }

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Total Cash Due
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatGbp(summary.totalCashDue)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Pending Remittances
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatGbp(summary.totalPending)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary">
                Platform Owes Agents
              </Typography>
              <Typography variant="h5" fontWeight={600}>
                {formatGbp(summary.totalPayable)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            label="Agents with Cash Due"
            value="cash-due"
            sx={{ textTransform: "none" }}
          />
          <Tab
            label={`Pending Remittances${remittancePagination.total ? ` (${remittancePagination.total})` : ""}`}
            value="remittances"
            sx={{ textTransform: "none" }}
          />
        </Tabs>
        <Typography variant="body2" color="text.secondary">
          {tab === "cash-due"
            ? "Agents who collected cash from customers and owe the platform their share. Record cash received or pay out card earnings."
            : "Agent-submitted cash remittances awaiting your confirmation."}
        </Typography>
      </Box>

      {tab === "cash-due" ? (
        <DataTable
          data={cashDueTableData}
          columns={cashDueColumns}
          searchable
          searchPlaceholder="Search agents..."
          showDateRange={false}
          showDownload={false}
        />
      ) : (
        <DataTable
          data={remittanceTableData}
          columns={remittanceColumns}
          searchable
          searchPlaceholder="Search remittances..."
          showDateRange={false}
          showDownload={false}
          serverSidePagination
          totalRows={remittancePagination.total || 0}
          currentPage={remittancePage}
          pageSize={20}
          onPageChange={setRemittancePage}
        />
      )}

      <ModalComponent
        open={actionModal.open}
        onClose={closeActionModal}
        title={modalTitle}
        width={480}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Agent: <strong>{actionModal.agentName}</strong>
            {actionModal.maxAmount > 0 && showAmountField && (
              <>
                {" "}
                — max {formatGbp(actionModal.maxAmount)}
              </>
            )}
          </Typography>

          {showAmountField && (
            <InputFieldBordered
              title="Amount"
              type="number"
              value={actionModal.amount}
              onChange={(e) =>
                setActionModal((prev) => ({ ...prev, amount: e.target.value }))
              }
              min={0}
              step="0.01"
            />
          )}

          <TextField
            label="Note (optional)"
            value={actionModal.note}
            onChange={(e) =>
              setActionModal((prev) => ({ ...prev, note: e.target.value }))
            }
            multiline
            minRows={3}
            fullWidth
            placeholder={
              actionModal.type === "reject-remittance"
                ? "Reason for rejection"
                : "Optional note"
            }
          />

          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={closeActionModal}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color={
                actionModal.type === "reject-remittance" ? "error" : "primary"
              }
              disabled={isActing}
              onClick={handleSubmitAction}
              sx={{ textTransform: "none" }}
            >
              {actionModal.type === "confirm-remittance"
                ? "Confirm"
                : actionModal.type === "reject-remittance"
                  ? "Reject"
                  : "Save"}
            </Button>
          </Box>
        </Box>
      </ModalComponent>
    </>
  );
}
