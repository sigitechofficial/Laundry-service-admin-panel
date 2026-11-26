import { useCallback, useMemo, useRef, useState } from "react";
import { Button, Field, Modal, Table, Textarea } from "../../design-system";
import { DATE_TIME_FORMAT, formatDate } from "../../utilities/formatters";
import { formatUserPhone } from "../../utilities/contactLinks";
import { csvFormat } from "../../utilities/csvExport";
import { useCsvExport } from "../../hooks/useCsvExport";
import {
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryDotPill,
  DirectoryExportButton,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import AgentRegistrationModal from "./AgentRegistrationModal";
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

const EMPTY_DATE_RANGE = { startDate: "", endDate: "" };

/** Same list as the backend (AGENT_REJECTION_REASONS); "Other" needs a note. */
const REJECTION_REASONS = [
  "Business details are incomplete or incorrect",
  "Shop address could not be verified",
  "Shop is outside our service areas",
  "Services offered do not match what we need",
  "Not enough machinery or capacity",
  "Working hours do not fit our collection and delivery times",
  "Turnaround times are too long",
  "Contact details could not be verified",
  "Duplicate or existing account",
  "Other",
];
const EMPTY_REJECT = { open: false, agentId: null, agentName: "", reasons: [], note: "", error: "" };

const AGENT_CSV_COLUMNS = [
  { header: "Agent ID", key: "id" },
  { header: "First name", key: "firstName" },
  { header: "Last name", key: "lastName" },
  { header: "Email", value: (row) => (row.email === "-" ? "" : row.email) },
  { header: "Phone", key: "phoneCsv" },
  { header: "Country code", key: "countryCode" },
  { header: "Shop", value: (row) => (row.shopName === "-" ? "" : row.shopName) },
  { header: "Address", value: (row) => (row.address === "-" ? "" : row.address) },
  { header: "Status", key: "statusLabel" },
  { header: "Rejection reason", value: (row) => (row.rejectionReason === "-" ? "" : row.rejectionReason) },
  { header: "Registered", value: (row) => csvFormat.date(row.createdAt) },
];

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

function matchesDateRange(row, dateRange) {
  if (!dateRange.startDate && !dateRange.endDate) return true;
  if (!row.createdAt) return false;

  const createdAt = new Date(row.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  const start = dateRange.startDate ? new Date(`${dateRange.startDate}T00:00:00`) : null;
  const end = dateRange.endDate ? new Date(`${dateRange.endDate}T23:59:59.999`) : null;

  return (!start || createdAt >= start) && (!end || createdAt <= end);
}

export default function PendingAgents() {
  const { success, error: showError } = useToaster();
  const [tab, setTab] = useState("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(EMPTY_DATE_RANGE);

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

  const [rejectModal, setRejectModal] = useState(EMPTY_REJECT);
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
          firstName: agent.firstName || "",
          lastName: agent.lastName || "",
          name: `${agent.firstName || ""} ${agent.lastName || ""}`.trim() || "-",
          email: agent.email || "-",
          phone: agent.countryCode
            ? `${agent.countryCode} ${agent.phoneNum || ""}`.trim()
            : agent.phoneNum || "-",
          phoneCsv: formatUserPhone(agent),
          countryCode: agent.countryCode || "",
          shopName: agent.shopName || "-",
          address: addressParts.join(", ") || "-",
          rejectionReason: agent.rejectionReason || "-",
          statusLabel: isRejectedTab ? "Rejected" : "Pending",
          createdAt: agent.createdAt,
          registeredAt: formatDate(agent.createdAt, DATE_TIME_FORMAT),
        };
      }),
    [agents, isRejectedTab]
  );

  const visibleRows = useMemo(
    () =>
      tableData.filter(
        (row) => matchesSearch(row, searchTerm) && matchesDateRange(row, dateRange)
      ),
    [tableData, searchTerm, dateRange]
  );

  const hasActiveFilters = Boolean(searchTerm || dateRange.startDate || dateRange.endDate);

  const csvFilenameFilters = useMemo(
    () => ({
      search: searchTerm.trim(),
      from: dateRange.startDate,
      to: dateRange.endDate,
    }),
    [searchTerm, dateRange.startDate, dateRange.endDate]
  );

  const csv = useCsvExport({
    filenameBase: isRejectedTab ? "rejected-agents" : "pending-agents",
    columns: AGENT_CSV_COLUMNS,
    rows: visibleRows,
    filenameFilters: csvFilenameFilters,
  });

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setDateRange(EMPTY_DATE_RANGE);
  }, []);

  const handleDateChange = useCallback((part, value) => {
    setDateRange((prev) => ({ ...prev, [part]: value }));
  }, []);

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
    setRejectModal({ ...EMPTY_REJECT, open: true, agentId: row.id, agentName: row.name });
  }, []);

  const closeRejectModal = useCallback(() => {
    setRejectModal(EMPTY_REJECT);
  }, []);

  const toggleReason = useCallback((reason) => {
    setRejectModal((prev) => ({
      ...prev,
      error: "",
      reasons: prev.reasons.includes(reason)
        ? prev.reasons.filter((r) => r !== reason)
        : [...prev.reasons, reason],
    }));
  }, []);

  const handleReject = useCallback(async () => {
    if (!rejectModal.agentId || approvingRef.current || isUpdating) return;
    const note = rejectModal.note.trim();
    if (!rejectModal.reasons.length) {
      setRejectModal((prev) => ({ ...prev, error: "Choose at least one reason." }));
      return;
    }
    if (rejectModal.reasons.includes("Other") && !note) {
      setRejectModal((prev) => ({ ...prev, error: 'Add a note explaining "Other".' }));
      return;
    }
    approvingRef.current = true;
    try {
      const res = await updateApproval({
        agentId: rejectModal.agentId,
        body: {
          action: "reject",
          reasons: rejectModal.reasons,
          note: note || undefined,
        },
      }).unwrap();
      if (isApprovalSuccess(res)) {
        success(
          res?.data?.emailQueued
            ? "Agent rejected. They've been emailed the reasons."
            : res?.message || "Agent rejected"
        );
        closeRejectModal();
        setViewRow(null);
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
    rejectModal.note,
    rejectModal.reasons,
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
            clearFilters();
          }}
        >
          Pending
        </Button>
        <Button
          size="sm"
          variant={tab === "rejected" ? "primary" : "secondary"}
          onClick={() => {
            setTab("rejected");
            clearFilters();
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
            <DirectoryDateInput
              id="agent-registered-start"
              value={dateRange.startDate}
              onChange={(value) => handleDateChange("startDate", value)}
              aria-label="Registered from"
              title="Registered from"
            />
            <DirectoryDateInput
              id="agent-registered-end"
              value={dateRange.endDate}
              onChange={(value) => handleDateChange("endDate", value)}
              aria-label="Registered to"
              title="Registered to"
            />
            <DirectoryToolbarEnd>
              {hasActiveFilters ? <DirectoryClearButton onClick={clearFilters} /> : null}
              <DirectoryExportButton
                onClick={csv.run}
                loading={csv.isExporting}
                count={visibleRows.length}
              />
            </DirectoryToolbarEnd>
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

      <AgentRegistrationModal
        open={Boolean(viewRow)}
        agentId={viewRow?.id}
        onClose={() => setViewRow(null)}
        busy={isUpdating}
        onApprove={async () => {
          await handleApprove(viewRow.id, isRejectedTab);
          setViewRow(null);
        }}
        onReject={isRejectedTab ? undefined : () => openRejectModal(viewRow)}
      />
        </>
      )}

      <Modal
        open={rejectModal.open}
        title="Reject Agent"
        description={`Reject ${rejectModal.agentName}? They're emailed the reasons below and see a rejection message when they try to log in.`}
        onClose={closeRejectModal}
        onPrimary={handleReject}
        primaryLabel={isUpdating ? "Rejecting…" : "Reject and email agent"}
        secondaryLabel="Cancel"
        danger
        closeOnBackdrop={false}
      >
        <fieldset style={{ border: 0, margin: 0, padding: 0, display: "grid", gap: 6 }}>
          <legend style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Reasons (choose one or more)
          </legend>
          {REJECTION_REASONS.map((reason) => (
            <label
              key={reason}
              style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 14, cursor: "pointer", lineHeight: 1.4 }}
            >
              <input
                type="checkbox"
                checked={rejectModal.reasons.includes(reason)}
                onChange={() => toggleReason(reason)}
                style={{ marginTop: 3 }}
              />
              <span>{reason}</span>
            </label>
          ))}
        </fieldset>
        <div style={{ marginTop: 14 }}>
          <Field
            label={rejectModal.reasons.includes("Other") ? "Note (required for Other)" : "Note (optional)"}
            hint="Included in the email to the agent"
            htmlFor="reject-note"
          >
            <Textarea
              id="reject-note"
              rows={3}
              maxLength={400}
              placeholder="Please send a photo of the shop front and your business registration."
              value={rejectModal.note}
              onChange={(e) =>
                setRejectModal((prev) => ({ ...prev, note: e.target.value, error: "" }))
              }
            />
          </Field>
        </div>
        {rejectModal.error ? (
          <p role="alert" style={{ margin: "8px 0 0", fontSize: 13, color: "var(--danger, #B91C1C)" }}>
            {rejectModal.error}
          </p>
        ) : null}
      </Modal>
    </div>
  );
}
