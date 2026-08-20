import { useState, useMemo, useEffect } from "react";
import { PageHeader, Table, Button, Modal, Field, Select } from "../../design-system";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryViewFields,
  DirectoryViewModal,
  PageLoading,
  StatusToggle,
} from "../directory-table/directoryTable";
import AddDeleteAccountReasonModal from "./AddDeleteAccountReasonModal";
import {
  useGetAccountDeletionReasonsQuery,
  useCreateAccountDeletionReasonMutation,
  useUpdateAccountDeletionReasonMutation,
  useDeleteAccountDeletionReasonMutation,
} from "../../store/services/api";
import useToaster from "../../components/ui/Toaster";

const PAGE_SIZES = [10, 25, 50, 100].map((n) => ({ value: n, label: String(n) }));

export default function DeleteAccountReasons() {
  const { success, error: showError } = useToaster();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reasonToEdit, setReasonToEdit] = useState(null);
  const [reasonToDelete, setReasonToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [viewRow, setViewRow] = useState(null);

  const { data, isLoading, isError, refetch } = useGetAccountDeletionReasonsQuery();
  const [createReason, { isLoading: isCreating }] =
    useCreateAccountDeletionReasonMutation();
  const [updateReason, { isLoading: isUpdating }] =
    useUpdateAccountDeletionReasonMutation();
  const [deleteReason, { isLoading: isDeleting }] =
    useDeleteAccountDeletionReasonMutation();

  const reasons = useMemo(() => {
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data)) return data;
    return [];
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return reasons;
    return reasons.filter((row) => String(row.label || "").toLowerCase().includes(q));
  }, [reasons, search]);

  const totalRows = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / limit) || 1);
  const safePage = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const startIndex = totalRows === 0 ? 0 : (safePage - 1) * limit + 1;
  const endIndex = Math.min(safePage * limit, totalRows);

  const tableRows = useMemo(
    () =>
      filtered.slice((safePage - 1) * limit, safePage * limit).map((row, index) => ({
        id: row.id,
        sl: (safePage - 1) * limit + index + 1,
        label: row.label,
        sortOrder: row.sortOrder ?? 0,
        status: row.status,
        isOther: row.isOther,
      })),
    [filtered, safePage, limit]
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
      await deleteReason(reasonToDelete.id).unwrap();
      success("Reason deleted successfully");
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
        <DirectoryIdentity
          name={row.label}
          meta={`Sort ${row.sortOrder}${row.isOther ? " · Other" : ""}`}
        />
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
          <DirectoryActionView onClick={() => setViewRow(row)} />
          <DirectoryActionEdit
            onClick={() => {
              const full = reasons.find((r) => r.id === row.id);
              setReasonToEdit(full || row);
              setAddModalOpen(true);
            }}
          />
          <DirectoryActionDelete
            onClick={() => {
              setReasonToDelete(row);
              setDeleteConfirmOpen(true);
            }}
          />
        </DirectoryActions>
      ),
    },
  ];

  if (isLoading) return <PageLoading label="Loading delete-account reasons…" />;

  return (
    <div>
      <PageHeader
        title="Delete account reasons"
        description="Options shown when a customer deletes their account"
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
          { label: "Active", value: reasons.filter((row) => row.status).length, tone: "success" },
        ]}
      />

      {isError ? (
        <div style={{ marginBottom: 16 }}>
          <p style={{ color: "var(--danger)", margin: "0 0 12px" }}>
            Could not load delete-account reasons. Check your connection and try again.
          </p>
          <Button variant="secondary" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="delete-reason-search"
              value={search}
              onChange={setSearch}
              placeholder="Filter by reason label"
            />
            {search ? (
              <DirectoryToolbarEnd>
                <DirectoryClearButton onClick={() => setSearch("")} />
              </DirectoryToolbarEnd>
            ) : null}
          </DirectoryToolbar>
        }
        footer={
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <span className="jd-field__hint">
              {startIndex} - {endIndex} of {totalRows}
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button
                size="sm"
                variant="secondary"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="jd-field__hint">
                Page {safePage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={safePage >= totalPages || totalRows === 0}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
            <Field label="Results per page">
              <div style={{ minWidth: 100 }}>
                <Select
                  aria-label="Results per page"
                  value={limit}
                  onChange={(value) => setLimit(Number(value))}
                  options={PAGE_SIZES}
                />
              </div>
            </Field>
          </div>
        }
      >
        <Table
          columns={columns}
          rows={isError ? [] : tableRows}
          rowKey={(row) => row.id}
          empty={search.trim() ? "No reasons match this search" : "No delete-account reasons yet"}
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
              { label: "Reason", value: viewRow?.label },
              { label: "Sort", value: viewRow?.sortOrder },
              { label: "Other", value: viewRow?.isOther ? "Yes" : "No" },
              { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
            ]}
          />
          {viewRow ? (
            <Field label="Active">
              <StatusToggle
                checked={Boolean(viewRow.status)}
                onChange={() => handleToggleStatus(viewRow)}
                label={`Toggle ${viewRow.label}`}
              />
            </Field>
          ) : null}
        </div>
      </DirectoryViewModal>

      <AddDeleteAccountReasonModal
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
        title="Delete reason"
        description={`Delete "${reasonToDelete?.label}"? Customers will no longer see this option.`}
        onClose={closeDeleteModal}
        onPrimary={handleConfirmDelete}
        primaryLabel={isDeleting ? "Deleting…" : "Delete"}
        secondaryLabel="Cancel"
        danger
      />
    </div>
  );
}
