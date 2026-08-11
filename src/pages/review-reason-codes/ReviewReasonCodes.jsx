import { useState, useMemo } from "react";
import { Box, Typography, Tabs, Tab, Chip } from "@mui/material";
import { TbSparkles, TbPlus } from "../../shared/icons/index";
import ButtonBlue from "../../components/ui/ButtonBlue";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import ChangeStatus from "../../components/ui/Switch";
import ModalComponent from "../../components/shared/Modal";
import AddReviewReasonCodeModal from "./AddReviewReasonCodeModal";
import {
  useGetReviewReasonCodesQuery,
  useCreateReviewReasonCodeMutation,
  useUpdateReviewReasonCodeMutation,
  useDeleteReviewReasonCodeMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";

export default function ReviewReasonCodes() {
  const { success, error: showError } = useToaster();
  const [tab, setTab] = useState("all");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [reasonToEdit, setReasonToEdit] = useState(null);
  const [reasonToDelete, setReasonToDelete] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { data, isLoading, refetch } = useGetReviewReasonCodesQuery();
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
      const result = await deleteReason(reasonToDelete.id).unwrap();
      success(result?.data?.message || result?.message || "Reason removed");
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
    { field: "sl", headerName: "SL", flex: 0.06, minWidth: 60 },
    { field: "code", headerName: "CODE", flex: 0.18, minWidth: 140 },
    { field: "label", headerName: "LABEL", flex: 0.28, minWidth: 200 },
    {
      field: "sentiment",
      headerName: "SENTIMENT",
      flex: 0.12,
      minWidth: 110,
      renderCell: (row) => (
        <Chip
          size="small"
          label={row.sentiment}
          color={row.sentiment === "positive" ? "success" : "error"}
          variant="outlined"
        />
      ),
    },
    { field: "sortOrder", headerName: "SORT", flex: 0.08, minWidth: 70 },
    {
      field: "isOther",
      headerName: "OTHER",
      flex: 0.08,
      minWidth: 80,
      renderCell: (row) => (
        <Typography fontFamily="Switzer" fontSize={14} color="grey.70">
          {row.isOther ? "Yes" : "No"}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "ACTIVE",
      flex: 0.1,
      minWidth: 100,
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
      flex: 0.12,
      minWidth: 110,
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
            <TbSparkles size="24px" color="blue.50" />
          </Typography>
          <Box>
            <Typography variant="h4" fontFamily="Switzer" color="grey.20">
              Review reason codes
            </Typography>
            <Typography variant="body2" color="grey.70" fontFamily="Switzer">
              Positive and negative reasons customers select when rating shops
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

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab value="all" label={`All (${reasons.length})`} />
        <Tab
          value="positive"
          label={`Positive (${reasons.filter((r) => r.sentiment === "positive").length})`}
        />
        <Tab
          value="negative"
          label={`Negative (${reasons.filter((r) => r.sentiment === "negative").length})`}
        />
      </Tabs>

      <DataTable
        data={tableRows}
        columns={columns}
        searchPlaceholder="Search reason codes…"
        showFilters={false}
        showDateRange={false}
        showDownload={false}
        height={480}
      />

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

      <ModalComponent
        open={deleteConfirmOpen}
        title="Remove reason code"
        onClose={() => {
          setDeleteConfirmOpen(false);
          setReasonToDelete(null);
        }}
        primaryAction={{
          label: "Remove",
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
          Remove &quot;{reasonToDelete?.code} — {reasonToDelete?.label}&quot;?
          If already used in reviews, it will be deactivated instead of deleted.
        </Typography>
      </ModalComponent>
    </div>
  );
}
