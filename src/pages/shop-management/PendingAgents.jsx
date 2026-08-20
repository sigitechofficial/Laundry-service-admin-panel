import { useCallback, useMemo, useRef, useState } from "react";
import { Button, Field, Modal, Table, Textarea } from "../../design-system";
import { DATE_TIME_FORMAT, formatDate } from "../../utilities/formatters";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import {
  useGetPendingAgentsQuery,
  useGetRejectedAgentsQuery,
  useUpdateAgentApprovalMutation,
} from "../../store/services/api";

const TAB_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 12,
};

function matchesSearch(row, term) {
  if (!term) return true;
  const q = term.toLowerCase();
  return ["name", "email", "phone", "shopName", "address", "rejectionReason"].some(
    (key) =>
      String(row[key] ?? "")
        .toLowerCase()
        .includes(q)
  );
}

export default function PendingAgents() {
  const { success, error: showError } = useToaster();
  const [tab, setTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: pendingResponse,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = useGetPendingAgentsQuery(undefined, { skip: tab !== "pending" });

  const {
    data: rejectedResponse,
    isLoading: rejectedLoading,
    isError: rejectedError,
    refetch: refetchRejected,
  } = useGetRejectedAgentsQuery(undefined, { skip: tab !== "rejected" });

  const [updateApproval, { isLoading: isUpdating }] =
    useUpdateAgentApprovalMutation();
  const approvingRef = useRef(false);

  const [rejectModal, setRejectModal] = useState({
    open: false,
    agentId: null,
    agentName: "",
    reason: "",
  });
  const [viewRow, setViewRow] = useState(null);

  const isRejectedTab = tab === "rejected";
  const agents = useMemo(
    () =>
      isRejectedTab
        ? rejectedResponse?.data?.agents || []
        : pendingResponse?.data?.agents || [],
    [isRejectedTab, pendingResponse?.data?.agents, rejectedResponse?.data?.agents]
  );
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
          registeredAt: formatDate(agent.createdAt, DATE_TIME_FORMAT),
        };
      }),
    [agents]
  );

  const visibleRows = useMemo(
    () => tableData.filter((row) => matchesSearch(row, searchTerm)),
    [tableData, searchTerm]
  );

  const isApprovalSuccess = (res) => res?.status === "1" || res?.status === 1;

  const handleApprove = useCallback(
    async (agentId, isRestore = false) => {
      if (approvingRef.current || isUpdating) return;
      approvingRef.current = true;
      try {
        const res = await updateApproval({
          agentId,
          body: { action: "approve" },
        }).unwrap();
        if (isApprovalSuccess(res)) {
          success(
            res?.message ||
              (isRestore ? "Agent restored and approved" : "Agent approved")
          );
        } else {
          showError(res?.message || "Failed to approve agent");
        }
      } catch (err) {
        showError(err?.data?.message || "Failed to approve agent");
      } finally {
        approvingRef.current = false;
      }
    },
    [isUpdating, showError, success, updateApproval]
  );

  const openRejectModal = useCallback((row) => {
    setRejectModal({
      open: true,
      agentId: row.id,
      agentName: row.name,
      reason: "",
    });
  }, []);

  const closeRejectModal = useCallback(() => {
    setRejectModal({ open: false, agentId: null, agentName: "", reason: "" });
  }, []);

  const handleReject = useCallback(async () => {
    if (!rejectModal.agentId || approvingRef.current || isUpdating) return;
    approvingRef.current = true;
    try {
      const res = await updateApproval({
        agentId: rejectModal.agentId,
        body: {
          action: "reject",
          reason: rejectModal.reason?.trim() || undefined,
        },
      }).unwrap();
      if (isApprovalSuccess(res)) {
        success(res?.message || "Agent rejected");
        closeRejectModal();
      } else {
        showError(res?.message || "Failed to reject agent");
      }
    } catch (err) {
      showError(err?.data?.message || "Failed to reject agent");
    } finally {
      approvingRef.current = false;
    }
  }, [
    closeRejectModal,
    isUpdating,
    rejectModal.agentId,
    rejectModal.reason,
    showError,
    success,
    updateApproval,
  ]);

  const columns = useMemo(() => {
    return [
      {
        key: "name",
        header: "Agent",
        render: (row) => (
          <DirectoryIdentity name={row.name} meta={joinMeta(row.shopName, row.email)} />
        ),
      },
      {
        key: "status",
        header: "Status",
        render: () => (
          <DirectoryDotPill tone={isRejectedTab ? "danger" : "warning"}>
            {isRejectedTab ? "Rejected" : "Pending"}
          </DirectoryDotPill>
        ),
      },
      {
        key: "registeredAt",
        header: "Registered",
        render: (row) => (
          <DirectoryIdentity
            name={row.registeredAt}
            meta={isRejectedTab && row.rejectionReason !== "-" ? row.rejectionReason : row.phone}
          />
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionView onClick={() => setViewRow(row)} />
            {isRejectedTab ? (
              <Button
                size="sm"
                disabled={isUpdating}
                onClick={() => handleApprove(row.id, true)}
              >
                Restore
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  disabled={isUpdating}
                  onClick={() => handleApprove(row.id)}
                >
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  disabled={isUpdating}
                  onClick={() => openRejectModal(row)}
                >
                  Reject
                </Button>
              </>
            )}
          </DirectoryActions>
        ),
      },
    ];
  }, [handleApprove, isRejectedTab, isUpdating, openRejectModal]);

  const listError = isRejectedTab ? rejectedError : pendingError;
  const refetchList = isRejectedTab ? refetchRejected : refetchPending;

  return (
    <div>
      <div style={TAB_ROW}>
        <Button
          size="sm"
          variant={tab === "pending" ? "primary" : "secondary"}
          onClick={() => {
            setTab("pending");
            setSearchTerm("");
          }}
        >
          Pending
        </Button>
        <Button
          size="sm"
          variant={tab === "rejected" ? "primary" : "secondary"}
          onClick={() => {
            setTab("rejected");
            setSearchTerm("");
          }}
        >
          Rejected
        </Button>
      </div>
      <p className="jd-lead" style={{ margin: "0 0 16px" }}>
        {isRejectedTab
          ? "Rejected agents cannot log in. Use Restore & Approve to let them access the app again."
          : "Agents who completed registration appear here until you approve or reject them."}
      </p>

      {listError ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            {isRejectedTab
              ? "Could not load rejected agents."
              : "Could not load pending agents."}
          </p>
          <Button variant="secondary" onClick={() => refetchList()}>
            Retry
          </Button>
        </div>
      ) : isLoading ? (
        <Delay />
      ) : (
        <>
      <DirectoryMetrics
        items={[
          {
            label: isRejectedTab ? "Rejected" : "Pending",
            value: visibleRows.length,
            tone: isRejectedTab ? "danger" : "warning",
          },
        ]}
      />

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id={isRejectedTab ? "rejected-agent-search" : "pending-agent-search"}
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder={
                isRejectedTab ? "Search rejected agents..." : "Search pending agents..."
              }
            />
            {searchTerm ? (
              <DirectoryToolbarEnd>
                <DirectoryClearButton onClick={() => setSearchTerm("")} />
              </DirectoryToolbarEnd>
            ) : null}
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          empty={isRejectedTab ? "No rejected agents" : "No pending agents"}
        />
      </DirectoryTableWrap>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.name || "Agent"}
        onClose={() => setViewRow(null)}
        fields={[
          { label: "Agent ID", value: viewRow?.id },
          { label: "Email", value: viewRow?.email },
          { label: "Phone", value: viewRow?.phone },
          { label: "Shop", value: viewRow?.shopName },
          { label: "Address", value: viewRow?.address },
          { label: "Registered", value: viewRow?.registeredAt },
          { label: "Rejection reason", value: viewRow?.rejectionReason },
        ]}
      />
        </>
      )}

      <Modal
        open={rejectModal.open}
        title="Reject Agent"
        description={`Reject ${rejectModal.agentName}? They will see a rejection message when trying to log in.`}
        onClose={closeRejectModal}
        onPrimary={handleReject}
        primaryLabel={isUpdating ? "Rejecting…" : "Reject Agent"}
        secondaryLabel="Cancel"
        danger
      >
        <Field
          label="Reason (optional)"
          hint="Optional reason shown to the agent"
          htmlFor="reject-reason"
        >
          <Textarea
            id="reject-reason"
            rows={3}
            placeholder="Optional reason shown to the agent"
            value={rejectModal.reason}
            onChange={(e) =>
              setRejectModal((prev) => ({ ...prev, reason: e.target.value }))
            }
          />
        </Field>
      </Modal>
    </div>
  );
}
