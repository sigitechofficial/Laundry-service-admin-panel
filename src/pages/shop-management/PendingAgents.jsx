import { useCallback, useMemo, useState } from "react";
import { Button, Table } from "../../design-system";
import { useNavigate } from "react-router-dom";
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
import RejectAgentDialog from "./registration/RejectAgentDialog";
import ReopenAgentDialog from "./registration/ReopenAgentDialog";
import useAgentApprovalActions from "./registration/useAgentApprovalActions";
import { visitPaths } from "./registration/registrationFormat";
import { joinMeta } from "../directory-table/directoryTableUtils";
import { Delay } from "../../components/shared/Loaders";
import {
  useGetPendingAgentsQuery,
  useGetRejectedAgentsQuery,
} from "../../store/services/api";

const TAB_ROW = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  marginBottom: 12,
};

const EMPTY_DATE_RANGE = { startDate: "", endDate: "" };

const EMPTY_REJECT = { open: false, agentId: null, agentName: "" };

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
  const navigate = useNavigate();
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

  const { approve, reject, reopen, busy: isUpdating } = useAgentApprovalActions();
  const [reopenRow, setReopenRow] = useState(null);

  const [rejectModal, setRejectModal] = useState(EMPTY_REJECT);

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
          previouslyRejected: !isRejectedTab && Boolean(agent.rejectionReason),
          statusLabel: isRejectedTab ? "Rejected" : agent.rejectionReason ? "Pending (previously rejected)" : "Pending",
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

  const handleApprove = useCallback((agentId) => approve(agentId), [approve]);

  const openRejectModal = useCallback((row) => {
    setRejectModal({ open: true, agentId: row.id, agentName: row.name });
  }, []);

  const closeRejectModal = useCallback(() => {
    setRejectModal(EMPTY_REJECT);
  }, []);

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
        render: (row) => (
          <div style={{ display: "grid", gap: 4, justifyItems: "start" }}>
            <DirectoryDotPill tone={isRejectedTab ? "danger" : "warning"}>
              {isRejectedTab ? "Rejected" : "Pending"}
            </DirectoryDotPill>
            {row.previouslyRejected ? <DirectoryDotPill tone="danger">Previously rejected</DirectoryDotPill> : null}
          </div>
        ),
      },
      {
        key: "registeredAt",
        header: "Registered",
        render: (row) => (
          <DirectoryIdentity
            name={row.registeredAt}
            meta={
              isRejectedTab && row.rejectionReason !== "-"
                ? row.rejectionReason
                : row.previouslyRejected
                  ? `Rejected before: ${row.rejectionReason}`
                  : row.phone
            }
          />
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <DirectoryActions>
            <DirectoryActionView onClick={() => navigate(visitPaths.registration(row.id))} />
            {isRejectedTab ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={isUpdating}
                onClick={() => setReopenRow(row)}
              >
                Move back to review
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
  }, [handleApprove, isRejectedTab, isUpdating, navigate, openRejectModal]);

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
          ? "Rejected agents cannot log in. Use Move back to review to put one in the Pending list again, then check it and approve or reject."
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

        </>
      )}

      <ReopenAgentDialog
        open={Boolean(reopenRow)}
        agentName={reopenRow ? (reopenRow.shopName !== "-" ? reopenRow.shopName : reopenRow.name) : ""}
        previousReason={reopenRow && reopenRow.rejectionReason !== "-" ? reopenRow.rejectionReason : null}
        busy={isUpdating}
        onClose={() => setReopenRow(null)}
        onConfirm={async () => {
          if (reopenRow && (await reopen(reopenRow.id))) setReopenRow(null);
        }}
      />
      <RejectAgentDialog
        open={rejectModal.open}
        agentName={rejectModal.agentName}
        busy={isUpdating}
        onClose={closeRejectModal}
        onConfirm={async (payload) => {
          if (await reject(rejectModal.agentId, payload)) closeRejectModal();
        }}
      />
    </div>
  );
}
