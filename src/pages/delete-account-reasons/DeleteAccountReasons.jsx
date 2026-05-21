import { useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { TbTrash, TbPlus } from "../../shared/icons/index";
import ButtonBlue from "../../components/ui/ButtonBlue";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import ChangeStatus from "../../components/ui/Switch";
import ModalComponent from "../../components/shared/Modal";
import AddDeleteAccountReasonModal from "./AddDeleteAccountReasonModal";
import {
  useGetAccountDeletionReasonsQuery,
  useCreateAccountDeletionReasonMutation,
  useUpdateAccountDeletionReasonMutation,
  useDeleteAccountDeletionReasonMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";

export default function DeleteAccountReasons() {
  const { success, error: showError } = useToaster();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reasonToEdit, setReasonToEdit] = useState(null);
  const [reasonToDelete, setReasonToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data, isLoading, refetch } = useGetAccountDeletionReasonsQuery();
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

  const tableRows = useMemo(
    () =>
      reasons.map((row, index) => ({
        id: row.id,
        sl: index + 1,
        label: row.label,
        sortOrder: row.sortOrder ?? 0,
        status: row.status,
        isOther: row.isOther,
      })),
    [reasons]
  );

  const handleToggleStatus = async (row) => {
    try {
      await updateReason({
        id: row.id,
        body: { status: !row.status },
      }).unwrap();
      success("Status updated");
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

  const handleConfirmDelete = async () => {
    if (!reasonToDelete) return;
    try {
      await deleteReason(reasonToDelete.id).unwrap();
      success("Reason deleted successfully");
      setDeleteConfirmOpen(false);
      setReasonToDelete(null);
      refetch();
    } catch (err) {
      showError(err?.data?.message || "Failed to delete reason");
      setDeleteConfirmOpen(false);
      setReasonToDelete(null);
    }
  };

  const columns = [
    { field: "sl", headerName: "SL", flex: 0.08, minWidth: 70 },
    { field: "label", headerName: "REASON", flex: 0.4, minWidth: 220 },
    { field: "sortOrder", headerName: "SORT", flex: 0.1, minWidth: 90 },
    {
      field: "isOther",
      headerName: "OTHER",
      flex: 0.12,
      minWidth: 100,
      renderCell: (row) => (
        <Typography fontFamily="Switzer" fontSize={14} color="grey.70">
          {row.isOther ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "ACTIVE",
      flex: 0.15,
      minWidth: 120,
      renderCell: (row) => (
        <ChangeStatus
          checked={Boolean(row.status)}
          onChange={() => handleToggleStatus(row)}
        />
      ),
    },
    {
      field: "actions",
      headerName: "ACTIONS",
      flex: 0.15,
      minWidth: 120,
      sortable: false,
      renderCell: (row) => (
        <ActionButtons
          showView={false}
          onEdit={() => {
            const full = reasons.find((r) => r.id === row.id);
            setReasonToEdit(full || row);
            setAddModalOpen(true);
          }}
          onDelete={() => {
            setReasonToDelete(row);
            setDeleteConfirmOpen(true);
          }}
        />
      ),
    },
  ];

  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-8">
      <Box className="flex items-center justify-between gap-x-5 flex-wrap">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <TbTrash size="24px" color="blue.50" />
          </Typography>
          <Box>
            <Typography variant="h4" fontFamily="Switzer" color="grey.20">
              Delete account reasons
            </Typography>
            <Typography variant="body2" color="grey.70" fontFamily="Switzer">
              Options shown when a customer deletes their account
            </Typography>
          </Box>
        </Box>
        <ButtonBlue
          size="medium"
          startIcon={<TbPlus size={20} />}
          onClick={() => {
            setReasonToEdit(null);
            setAddModalOpen(true);
          }}
        >
          Add reason
        </ButtonBlue>
      </Box>

      <DataTable
        data={tableRows}
        columns={columns}
        searchPlaceholder="Search reasons…"
        showFilters={false}
        showDateRange={false}
        showDownload={false}
        height={450}
      />

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

      <ModalComponent
        open={deleteConfirmOpen}
        title="Delete reason"
        onClose={() => {
          setDeleteConfirmOpen(false);
          setReasonToDelete(null);
        }}
        primaryAction={{
          label: "Delete",
          onClick: handleConfirmDelete,
          isLoading: isDeleting,
        }}
        secondaryAction={{
          label: "Cancel",
          onClick: () => {
            setDeleteConfirmOpen(false);
            setReasonToDelete(null);
          },
        }}
      >
        <Typography variant="body1" sx={{ color: "grey.80", fontFamily: "Switzer" }}>
          Delete &quot;{reasonToDelete?.label}&quot;? Customers will no longer see this
          option.
        </Typography>
      </ModalComponent>
    </div>
  );
}
