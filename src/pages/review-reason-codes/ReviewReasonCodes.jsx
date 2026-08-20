import { useState, useMemo } from "react";
import { PageHeader, Table, Button, Modal } from "../../design-system";
import {
  DirectoryActions,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryTool,
  DirectoryToolbar,
  DirectoryViewFields,
  DirectoryViewModal,
  PageLoading,
  StatusToggle,
} from "../directory-table/directoryTable";
import AddReviewReasonCodeModal from "./AddReviewReasonCodeModal";
import {
  useGetReviewReasonCodesQuery,
  useCreateReviewReasonCodeMutation,
  useUpdateReviewReasonCodeMutation,
  useDeleteReviewReasonCodeMutation,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";

export default function ReviewReasonCodes() {
  const { success, error: showError } = useToaster();
  const [tab, setTab] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reasonToEdit, setReasonToEdit] = useState(null);
  const [reasonToDelete, setReasonToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [viewRow, setViewRow] = useState(null);

  const { data, isLoading, isError, refetch } = useGetReviewReasonCodesQuery();
  const [createReason, { isLoading: isCreating }] =
    useCreateReviewReasonCodeMutation();
  const [updateReason, { isLoading: isUpdating }] =
    useUpdateReviewReasonCodeMutation();
  const [deleteReason, { isLoading: isDeleting }] =
    useDeleteReviewReasonCodeMutation();

  const reasons = useMemo(() => {
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  const filtered = useMemo(() => {
    if (tab === "positive") return reasons.filter((r) => r.sentiment === "positive");
    if (tab === "negative") return reasons.filter((r) => r.sentiment === "negative");
    return reasons;
  }, [reasons, tab]);

  const tableRows = useMemo(
    () =>
      filtered.map((row, index) => ({
        id: row.id,
        sl: index + 1,
        code: row.code,
        label: row.label,
        sentiment: row.sentiment,
        sortOrder: row.sortOrder ?? 0,
        status: row.status,
        isOther: row.isOther,
      })),
    [filtered]
  );

  const handleToggleStatus = async (row) => {
    try {
      await updateReason({
        id: row.id,
        body: { status: !row.status },
      }).unwrap();
      success("Status updated");
      setViewRow((prev) =>
        prev && prev.id === row.id ? { ...prev, status: !row.status } : prev
      );
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to update status");
    }
  };

  const handleSave = async (body, id) => {
    try {
      if (id) {
        await updateReason({ id, body }).unwrap();
        success("Reason updated successfully");
      } else {
        await createReason(body).unwrap();
        success("Reason added successfully");
      }
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to save reason");
      throw err;
    }
  };

  const closeDeleteModal = () => {
    setDeleteConfirmOpen(false);
    setReasonToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!reasonToDelete || isDeleting) return;
    try {
      const result = await deleteReason(reasonToDelete.id).unwrap();
      success(result?.data?.message || result?.message || "Reason removed");
      closeDeleteModal();
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to delete reason");
      closeDeleteModal();
    }
  };

  const columns = [
    {
      key: "label",
      header: "Reason",
      render: (row) => (
        <DirectoryIdentity name={row.label} meta={`${row.code}${row.isOther ? " · Other" : ""}`} />
      ),
    },
    {
      key: "sentiment",
      header: "Sentiment",
      render: (row) => (
        <DirectoryDotPill tone={row.sentiment === "positive" ? "success" : "danger"}>
          {row.sentiment}
        </DirectoryDotPill>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <DirectoryStatusPill active={row.status} />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <Button size="sm" variant="secondary" onClick={() => setViewRow(row)}>
            View
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              const full = reasons.find((r) => r.id === row.id);
              setReasonToEdit(full || row);
              setAddModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => {
              setReasonToDelete(row);
              setDeleteConfirmOpen(true);
            }}
          >
            Delete
          </Button>
        </DirectoryActions>
      ),
    },
  ];

  const positiveCount = reasons.filter((r) => r.sentiment === "positive").length;
  const negativeCount = reasons.filter((r) => r.sentiment === "negative").length;

  if (isLoading) return <PageLoading label="Loading review reason codes…" />;

  return (
    <div>
      <PageHeader
        title="Review reason codes"
        description="Positive and negative reasons customers select when rating shops"
        actions={
          <Button
            onClick={() => {
              setReasonToEdit(null);
              setAddModalOpen(true);
            }}
          >
            Add reason
          </Button>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total reasons", value: reasons.length, tone: "brand" },
          { label: "Positive", value: positiveCount, tone: "success" },
          { label: "Negative", value: negativeCount, tone: "danger" },
        ]}
      />

      {isError ? (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>
            Could not load review reason codes. Check your connection and try again.
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectoryTool as="button" type="button" active={tab === "all"} onClick={() => setTab("all")}>
              All ({reasons.length})
            </DirectoryTool>
            <DirectoryTool as="button" type="button" active={tab === "positive"} onClick={() => setTab("positive")}>
              Positive ({positiveCount})
            </DirectoryTool>
            <DirectoryTool as="button" type="button" active={tab === "negative"} onClick={() => setTab("negative")}>
              Negative ({negativeCount})
            </DirectoryTool>
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={isError ? [] : tableRows}
          rowKey={(row) => row.id}
          empty={tab === "all" ? "No review reason codes yet" : `No ${tab} reason codes`}
        />
      </DirectoryTableWrap>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.label || "Reason"}
        onClose={() => setViewRow(null)}
      >
        <div style={{ display: "grid", gap: 16 }}>
          <DirectoryViewFields
            fields={[
              { label: "Code", value: viewRow?.code },
              { label: "Label", value: viewRow?.label },
              { label: "Sentiment", value: viewRow?.sentiment },
              { label: "Sort", value: viewRow?.sortOrder },
              { label: "Other", value: viewRow?.isOther ? "Yes" : "No" },
              { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
            ]}
          />
          {viewRow ? (
            <div>
              <p className="jd-field__hint" style={{ margin: "0 0 8px" }}>Active</p>
              <StatusToggle
                checked={Boolean(viewRow.status)}
                onChange={() => handleToggleStatus(viewRow)}
                label={`Toggle ${viewRow.code}`}
              />
            </div>
          ) : null}
        </div>
      </DirectoryViewModal>

      <AddReviewReasonCodeModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setReasonToEdit(null);
        }}
        onSave={handleSave}
        isLoading={isCreating || isUpdating}
        reasonToEdit={reasonToEdit}
      />

      <Modal
        open={deleteConfirmOpen}
        title="Remove reason code"
        description={`Remove "${reasonToDelete?.code} — ${reasonToDelete?.label}"? If already used in reviews, it will be deactivated instead of deleted.`}
        onClose={closeDeleteModal}
        onPrimary={handleConfirmDelete}
        primaryLabel={isDeleting ? "Removing…" : "Remove"}
        secondaryLabel="Cancel"
        danger
      />
    </div>
  );
}
