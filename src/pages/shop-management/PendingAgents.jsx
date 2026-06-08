import { useMemo, useState } from "react";
import { Box, Button, Tab, Tabs, Typography } from "@mui/material";
import dayjs from "dayjs";
import DataTable from "../../components/ui/DataTable";
import ModalComponent from "../../components/shared/Modal";
import InputFieldBordered from "../../components/ui/InputFieldBordered";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import {
  useGetPendingAgentsQuery,
  useGetRejectedAgentsQuery,
  useUpdateAgentApprovalMutation,
} from "../../store/services/api";

export default function PendingAgents() {
  const { success, error: showError } = useToaster();
  const [tab, setTab] = useState("pending");

  const {
    data: pendingResponse,
    isLoading: pendingLoading,
    refetch: refetchPending,
  } = useGetPendingAgentsQuery(undefined, { skip: tab !== "pending" });

  const {
    data: rejectedResponse,
    isLoading: rejectedLoading,
    refetch: refetchRejected,
  } = useGetRejectedAgentsQuery(undefined, { skip: tab !== "rejected" });

  const [updateApproval, { isLoading: isUpdating }] =
    useUpdateAgentApprovalMutation();

  const [rejectModal, setRejectModal] = useState({
    open: false,
    agentId: null,
    agentName: "",
    reason: "",
  });

  const isRejectedTab = tab === "rejected";
  const agents = isRejectedTab
    ? rejectedResponse?.data?.agents || []
    : pendingResponse?.data?.agents || [];
  const isLoading = isRejectedTab ? rejectedLoading : pendingLoading;

  const tableData = useMemo(
    () =>
      agents.map((agent, index) => {
        const addressParts = [
          agent?.address?.streetAddress,
          agent?.address?.district,
          agent?.address?.province,
        ].filter(Boolean);
        return {
          id: agent.id,
          sl: index + 1,
          name: `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || "-",
          email: agent.email || "-",
          phone: agent.countryCode
            ? `${agent.countryCode} ${agent.phoneNum || ""}`.trim()
            : agent.phoneNum || "-",
          shopName: agent.shopName || "-",
          address: addressParts.join(", ") || "-",
          rejectionReason: agent.rejectionReason || "-",
          registeredAt: agent.createdAt
            ? dayjs(agent.createdAt).format("DD MMM YYYY, HH:mm")
            : "-",
        };
      }),
    [agents]
  );

  const handleApprove = async (agentId, isRestore = false) => {
    try {
      const res = await updateApproval({
        agentId,
        body: { action: "approve" },
      }).unwrap();
      if (res?.status === "1") {
        success(
          res?.message ||
            (isRestore ? "Agent restored and approved" : "Agent approved")
        );
        refetchPending();
        refetchRejected();
      } else {
        showError(res?.message || "Failed to approve agent");
      }
    } catch (err) {
      showError(err?.data?.message || "Failed to approve agent");
    }
  };

  const openRejectModal = (row) => {
    setRejectModal({
      open: true,
      agentId: row.id,
      agentName: row.name,
      reason: "",
    });
  };

  const handleReject = async () => {
    if (!rejectModal.agentId) return;
    try {
      const res = await updateApproval({
        agentId: rejectModal.agentId,
        body: {
          action: "reject",
          reason: rejectModal.reason?.trim() || undefined,
        },
      }).unwrap();
      if (res?.status === "1") {
        success(res?.message || "Agent rejected");
        setRejectModal({ open: false, agentId: null, agentName: "", reason: "" });
        refetchPending();
        refetchRejected();
      } else {
        showError(res?.message || "Failed to reject agent");
      }
    } catch (err) {
      showError(err?.data?.message || "Failed to reject agent");
    }
  };

  const columns = useMemo(() => {
    const baseColumns = [
      { field: "sl", headerName: "SL", width: 60 },
      { field: "name", headerName: "Agent Name", flex: 1, minWidth: 140 },
      { field: "email", headerName: "Email", flex: 1, minWidth: 180 },
      { field: "phone", headerName: "Phone", flex: 1, minWidth: 130 },
      { field: "shopName", headerName: "Shop", flex: 1, minWidth: 140 },
      { field: "address", headerName: "Address", flex: 1.2, minWidth: 180 },
      {
        field: "registeredAt",
        headerName: "Registered",
        flex: 1,
        minWidth: 160,
      },
    ];

    if (isRejectedTab) {
      baseColumns.push({
        field: "rejectionReason",
        headerName: "Rejection Reason",
        flex: 1.2,
        minWidth: 180,
      });
    }

    baseColumns.push({
      field: "actions",
      headerName: "Actions",
      width: isRejectedTab ? 180 : 220,
      renderCell: (row) =>
        isRejectedTab ? (
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled={isUpdating}
            onClick={() => handleApprove(row.id, true)}
            sx={{ textTransform: "none", minWidth: 120 }}
          >
            Restore & Approve
          </Button>
        ) : (
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={isUpdating}
              onClick={() => handleApprove(row.id)}
              sx={{ textTransform: "none", minWidth: 84 }}
            >
              Approve
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              disabled={isUpdating}
              onClick={() => openRejectModal(row)}
              sx={{ textTransform: "none", minWidth: 84 }}
            >
              Reject
            </Button>
          </Box>
        ),
    });

    return baseColumns;
  }, [isRejectedTab, isUpdating]);

  if (isLoading) return <Delay />;

  return (
    <>
      <Box sx={{ mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab label="Pending" value="pending" sx={{ textTransform: "none" }} />
          <Tab
            label="Rejected"
            value="rejected"
            sx={{ textTransform: "none" }}
          />
        </Tabs>
        <Typography variant="body2" color="text.secondary">
          {isRejectedTab
            ? "Rejected agents cannot log in. Use Restore & Approve to let them access the app again."
            : "Agents who completed registration appear here until you approve or reject them."}
        </Typography>
      </Box>

      <DataTable
        data={tableData}
        columns={columns}
        searchable
        searchPlaceholder={
          isRejectedTab ? "Search rejected agents..." : "Search pending agents..."
        }
      />

      <ModalComponent
        open={rejectModal.open}
        onClose={() =>
          setRejectModal({ open: false, agentId: null, agentName: "", reason: "" })
        }
        title="Reject Agent"
        width={480}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Reject <strong>{rejectModal.agentName}</strong>? They will see a rejection
            message when trying to log in.
          </Typography>
          <InputFieldBordered
            label="Reason (optional)"
            value={rejectModal.reason}
            onChange={(e) =>
              setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
            }
            multiline
            rows={3}
            placeholder="Optional reason shown to the agent"
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={() =>
                setRejectModal({
                  open: false,
                  agentId: null,
                  agentName: "",
                  reason: "",
                })
              }
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              disabled={isUpdating}
              onClick={handleReject}
              sx={{ textTransform: "none" }}
            >
              Reject Agent
            </Button>
          </Box>
        </Box>
      </ModalComponent>
    </>
  );
}
