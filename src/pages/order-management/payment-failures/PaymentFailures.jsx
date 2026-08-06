import { useCallback, useMemo, useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { BsCardList } from "../../../shared/icons/index";
import { Delay } from "../../../components/shared/Loaders";
import DataTable from "../../../components/ui/DataTable";
import ModalComponent from "../../../components/shared/Modal";
import InputFieldBordered from "../../../components/ui/InputFieldBordered";
import useToaster from "../../../components/ui/Toaster";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import {
  useGetPaymentFailuresQuery,
  useResolvePaymentFailureMutation,
} from "../../../store/services/api";
import { dateTimeFormat } from "../../../shared/constants";

const ACTIONS = [
  {
    key: "shift_to_cash",
    label: "Shift to Cash",
    color: "success",
    confirm:
      "Shift remaining balance to cash COD? Auto-charge will stop and agent can proceed, then collect cash at delivery.",
  },
  {
    key: "allow_proceed",
    label: "Allow Proceed",
    color: "primary",
    confirm:
      "Allow Out for Delivery without successful card payment? Use only for special cases.",
  },
  {
    key: "keep_waiting",
    label: "Keep Waiting",
    color: "inherit",
    confirm: "Keep this order waiting for admin / customer response?",
  },
];

export default function PaymentFailures() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const { data, isLoading, refetch } = useGetPaymentFailuresQuery();
  const [resolveFailure, { isLoading: isResolving }] =
    useResolvePaymentFailureMutation();

  const [modal, setModal] = useState({
    open: false,
    bookingId: null,
    orderTrackId: "",
    action: null,
    notes: "",
  });

  const failures = data?.data?.failures || [];

  const tableData = useMemo(
    () =>
      (Array.isArray(failures) ? failures : []).map((row, index) => {
        const customerName = [
          row?.customer?.firstName,
          row?.customer?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        return {
          id: row.id,
          sl: index + 1,
          orderId: row.orderTrackId || row.id,
          customer: customerName || row?.customer?.email || "—",
          phone: row?.customer?.phoneNum || "—",
          amount:
            row?.billingDetail?.total != null
              ? `£${Number(row.billingDetail.total).toFixed(2)}`
              : row?.orderAmount != null
                ? `£${Number(row.orderAmount).toFixed(2)}`
                : "—",
          reason: row.lastPaymentFailureMessage || "—",
          code: row.lastPaymentFailureCode || "—",
          failedAt: row.lastPaymentFailureAt
            ? dayjs(row.lastPaymentFailureAt).format(dateTimeFormat)
            : "—",
          statusId: row.bookingStatusId ?? "—",
          gate: row.paymentDeliveryGate || "—",
        };
      }),
    [failures]
  );

  const openConfirm = useCallback((row, actionKey) => {
    setModal({
      open: true,
      bookingId: row.id,
      orderTrackId: row.orderId,
      action: actionKey,
      notes: "",
    });
  }, []);

  const closeModal = () =>
    setModal({
      open: false,
      bookingId: null,
      orderTrackId: "",
      action: null,
      notes: "",
    });

  const handleResolve = useCallback(async () => {
    if (!modal.bookingId || !modal.action) return;
    try {
      const res = await resolveFailure({
        bookingId: modal.bookingId,
        body: { action: modal.action, notes: modal.notes || undefined },
      }).unwrap();
      if (res?.status === "1" || res?.status === 1) {
        success(res?.message || "Payment failure resolved");
        closeModal();
        refetch();
      } else {
        showError(res?.message || "Failed to resolve");
      }
    } catch (err) {
      showError(err?.data?.message || "Failed to resolve payment failure");
    }
  }, [modal, refetch, resolveFailure, showError, success]);

  const actionMeta = ACTIONS.find((a) => a.key === modal.action);

  const columns = useMemo(
    () => [
      { field: "sl", headerName: "SL", width: 60 },
      { field: "orderId", headerName: "Order ID", flex: 1, minWidth: 120 },
      { field: "customer", headerName: "Customer", flex: 1, minWidth: 140 },
      { field: "phone", headerName: "Phone", flex: 1, minWidth: 120 },
      { field: "amount", headerName: "Amount", width: 100 },
      { field: "code", headerName: "Error code", width: 140 },
      { field: "reason", headerName: "Reason", flex: 1.4, minWidth: 180 },
      { field: "failedAt", headerName: "Failed at", width: 160 },
      { field: "statusId", headerName: "Status", width: 80 },
      {
        field: "actions",
        headerName: "Actions",
        width: 380,
        sortable: false,
        renderCell: (params) => {
          const row = params.row;
          return (
            <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", py: 0.5 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => navigate(`/orders/details/${row.id}`)}
                sx={{ textTransform: "none" }}
              >
                View
              </Button>
              <Button
                size="small"
                variant="contained"
                color="success"
                disabled={isResolving}
                onClick={() => openConfirm(row, "shift_to_cash")}
                sx={{ textTransform: "none" }}
              >
                Shift to Cash
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={isResolving}
                onClick={() => openConfirm(row, "allow_proceed")}
                sx={{ textTransform: "none" }}
              >
                Allow Proceed
              </Button>
              <Button
                size="small"
                variant="text"
                disabled={isResolving}
                onClick={() => openConfirm(row, "keep_waiting")}
                sx={{ textTransform: "none" }}
              >
                Keep Waiting
              </Button>
            </Box>
          );
        },
      },
    ],
    [isResolving, navigate, openConfirm]
  );

  if (isLoading) return <Delay />;

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
        <BsCardList size={22} />
        <Typography variant="h4">Payment Failures</Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Card auto-charge failures waiting for admin. Shift to cash, allow
        proceed, or keep waiting after customer support contact.
      </Typography>
      <DataTable
        data={tableData}
        columns={columns}
        searchable
        searchPlaceholder="Search payment failures..."
      />

      <ModalComponent
        open={modal.open}
        onClose={closeModal}
        title={actionMeta?.label || "Resolve"}
        width={480}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Order <strong>{modal.orderTrackId}</strong>: {actionMeta?.confirm}
          </Typography>
          <InputFieldBordered
            label="Notes (optional)"
            value={modal.notes}
            onChange={(e) =>
              setModal((prev) => ({ ...prev, notes: e.target.value }))
            }
            multiline
            rows={3}
            placeholder="Optional admin notes / support reason"
          />
          <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1.5 }}>
            <Button
              variant="outlined"
              onClick={closeModal}
              sx={{ textTransform: "none" }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color={actionMeta?.color === "success" ? "success" : "primary"}
              disabled={isResolving}
              onClick={handleResolve}
              sx={{ textTransform: "none" }}
            >
              Confirm
            </Button>
          </Box>
        </Box>
      </ModalComponent>
    </Box>
  );
}
