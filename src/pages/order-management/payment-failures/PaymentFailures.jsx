import { useCallback, useMemo, useState } from "react";
import { Box, Button, Chip, Typography } from "@mui/material";
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

const FRIENDLY_REASONS = {
  generic_decline: "Card was declined by the bank",
  insufficient_funds: "Insufficient funds on the card",
  lost_card: "Card reported as lost",
  stolen_card: "Card reported as stolen",
  expired_card: "Card has expired",
  incorrect_cvc: "Incorrect card security code (CVC)",
  processing_error: "Bank processing error — try again later",
  do_not_honor: "Bank declined the payment (do not honor)",
  authentication_required: "Card requires customer authentication",
  missing_payment_method: "No saved payment method on file",
  card_declined: "Card was declined",
};

function formatFailureReason(code, message, displayFromApi) {
  if (displayFromApi) return displayFromApi;
  const key = String(code || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (key && FRIENDLY_REASONS[key]) return FRIENDLY_REASONS[key];
  const msg = String(message || "")
    .replace(/^Stripe Error:\s*/i, "")
    .trim();
  return msg || "Card payment failed";
}

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
  const failureTotal =
    data?.data?.totalCount ?? data?.data?.count ?? failures.length;

  const tableData = useMemo(
    () =>
      (Array.isArray(failures) ? failures : []).map((row) => {
        const customerName = [
          row?.customer?.firstName,
          row?.customer?.lastName,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        const code = row.lastPaymentFailureCode || "";
        const reason = formatFailureReason(
          code,
          row.lastPaymentFailureMessage,
          row.failureReasonDisplay || row.paymentFlags?.paymentFailureReason
        );
        return {
          id: row.id,
          orderId: row.orderTrackId || String(row.id),
          customer: customerName || row?.customer?.email || "—",
          phone: row?.customer?.phoneNum || "—",
          amount:
            row?.billingDetail?.total != null
              ? `£${Number(row.billingDetail.total).toFixed(2)}`
              : row?.orderAmount != null
                ? `£${Number(row.orderAmount).toFixed(2)}`
                : "—",
          code: code || "—",
          reason,
          failedAt: row.lastPaymentFailureAt
            ? dayjs(row.lastPaymentFailureAt).format(dateTimeFormat)
            : "—",
          statusLabel:
            row.bookingStatusLabel ||
            (row.bookingStatusId != null
              ? `Status ${row.bookingStatusId}`
              : "—"),
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
      { field: "orderId", headerName: "Order ID", minWidth: 140 },
      { field: "customer", headerName: "Customer", minWidth: 140 },
      { field: "phone", headerName: "Phone", minWidth: 120 },
      { field: "amount", headerName: "Amount", minWidth: 90 },
      {
        field: "reason",
        headerName: "Failure reason",
        minWidth: 280,
        wrap: true,
        renderCell: (row) => (
          <Box sx={{ py: 0.5, maxWidth: 360 }}>
            {row.code && row.code !== "—" ? (
              <Chip
                size="small"
                label={row.code}
                sx={{
                  mb: 0.75,
                  height: 22,
                  fontSize: 11,
                  bgcolor: "#FFF1F0",
                  color: "#CF1322",
                  border: "1px solid #FFCCC7",
                }}
              />
            ) : null}
            <Typography
              variant="body2"
              sx={{
                whiteSpace: "normal",
                wordBreak: "normal",
                overflowWrap: "anywhere",
                lineHeight: 1.45,
                color: "text.primary",
              }}
            >
              {row.reason}
            </Typography>
          </Box>
        ),
      },
      { field: "failedAt", headerName: "Failed at", minWidth: 150 },
      { field: "statusLabel", headerName: "Status", minWidth: 140 },
      {
        field: "actions",
        headerName: "Actions",
        minWidth: 360,
        sortable: false,
        renderCell: (row) => (
          <Box
            sx={{
              display: "flex",
              gap: 0.75,
              flexWrap: "wrap",
              py: 0.5,
              alignItems: "center",
            }}
          >
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/orders/details/${row.id}`);
              }}
              sx={{ textTransform: "none" }}
            >
              View
            </Button>
            <Button
              size="small"
              variant="contained"
              color="success"
              disabled={isResolving}
              onClick={(e) => {
                e.stopPropagation();
                openConfirm(row, "shift_to_cash");
              }}
              sx={{ textTransform: "none" }}
            >
              Shift to Cash
            </Button>
            <Button
              size="small"
              variant="contained"
              disabled={isResolving}
              onClick={(e) => {
                e.stopPropagation();
                openConfirm(row, "allow_proceed");
              }}
              sx={{ textTransform: "none" }}
            >
              Allow Proceed
            </Button>
            <Button
              size="small"
              variant="text"
              disabled={isResolving}
              onClick={(e) => {
                e.stopPropagation();
                openConfirm(row, "keep_waiting");
              }}
              sx={{ textTransform: "none" }}
            >
              Keep Waiting
            </Button>
          </Box>
        ),
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
        <Typography variant="body2" color="text.secondary">
          ({failureTotal})
        </Typography>
      </Box>
      <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
        Card auto-charge failures waiting for admin. Shift to cash, allow
        proceed, or keep waiting after customer support contact.
        {failures.length < failureTotal
          ? ` Showing ${failures.length} of ${failureTotal}.`
          : null}
      </Typography>
      <DataTable
        data={tableData}
        columns={columns}
        searchable
        searchPlaceholder="Search payment failures..."
        stickyRightFields={["actions"]}
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
