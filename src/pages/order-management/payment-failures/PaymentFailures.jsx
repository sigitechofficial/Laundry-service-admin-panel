import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, Field, Modal, Textarea } from "../../../design-system";
import useToaster from "../../../components/ui/Toaster";
import { useNavigate } from "react-router-dom";
import {
  useGetPaymentFailuresQuery,
  useResolvePaymentFailureMutation,
} from "../../../store/services/api";
import {
  DATE_TIME_FORMAT,
  formatDate,
  formatMoney,
  resolveCurrencySymbol,
} from "../../../utilities/formatters";
import { matchesOrderListSearch } from "../listSearch";
import OrderListDataTable from "../OrderListDataTable";
import {
  DEFAULT_ORDER_LIST_SORT_DIR,
  DEFAULT_PAYMENT_FAILURE_SORT_BY,
  PAYMENT_FAILURE_SORT_BY,
  PAYMENT_FAILURE_SORT_OPTIONS,
  normalizeOrderListSortBy,
  normalizeOrderListSortDir,
} from "../orderListQuery";
import {
  CustomerNamePhone,
  DateTimeStack,
  DotPill,
  OrderIdLink,
  StatusDotPill,
} from "../orderListTable";
import { customerDetailsPath, resolveCustomerId } from "../orderListUtils";
import {
  OrderError,
  OrderMetrics,
  OrderPageHeader,
} from "../OrderWorkspace";
import styles from "../orderList.module.css";

const ACTIONS = [
  {
    key: "shift_to_cash",
    label: "Shift to Cash",
    confirm:
      "Shift remaining balance to cash COD? Auto-charge will stop and agent can proceed, then collect cash at delivery.",
  },
  {
    key: "allow_proceed",
    label: "Allow Proceed",
    confirm:
      "Allow Out for Delivery without successful card payment? Use only for special cases.",
  },
  {
    key: "keep_waiting",
    label: "Keep Waiting",
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

function formatFailureAmount(row) {
  const amount = row?.billingDetail?.total ?? row?.orderAmount;
  if (amount == null) return "—";
  const attempt = Array.isArray(row?.invoicePaymentAttempts)
    ? row.invoicePaymentAttempts[0]
    : null;
  const symbol =
    resolveCurrencySymbol(row?.paymentSummary) ||
    resolveCurrencySymbol(row) ||
    resolveCurrencySymbol(attempt);
  const code =
    row?.paymentSummary?.currency ||
    row?.currency ||
    attempt?.currency;
  return formatMoney(amount, symbol, code);
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 21v-5h5" />
    </svg>
  );
}

export default function PaymentFailures() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [sortBy, setSortByState] = useState(DEFAULT_PAYMENT_FAILURE_SORT_BY);
  const [sortDir, setSortDirState] = useState(DEFAULT_ORDER_LIST_SORT_DIR);
  const { data, isLoading, isError, refetch, isFetching } =
    useGetPaymentFailuresQuery({ sortBy, sortDir });
  const [resolveFailure, { isLoading: isResolving }] =
    useResolvePaymentFailureMutation();

  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [modal, setModal] = useState({
    open: false,
    bookingId: null,
    orderTrackId: "",
    action: null,
    notes: "",
  });

  const failures = useMemo(
    () => data?.data?.failures || [],
    [data?.data?.failures]
  );
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
        const failedAtRaw = row.lastPaymentFailureAt || null;
        return {
          id: row.id,
          orderId: row.orderTrackId || String(row.id),
          customer: customerName || row?.customer?.email || "—",
          customerId: resolveCustomerId(row),
          phone: row?.customer?.phoneNum || "—",
          amount: formatFailureAmount(row),
          code: code || "—",
          reason,
          failedAt: failedAtRaw,
          failedAtDisplay: failedAtRaw
            ? formatDate(failedAtRaw, DATE_TIME_FORMAT)
            : "—",
          statusLabel:
            row.bookingStatusLabel ||
            (row.bookingStatusId != null
              ? `Status ${row.bookingStatusId}`
              : "—"),
          paymentWaitingAdmin: row.paymentDeliveryGate === "waiting_admin",
        };
      }),
    [failures]
  );

  const searchedRows = useMemo(
    () => tableData.filter((row) => matchesOrderListSearch(row, searchInput)),
    [tableData, searchInput]
  );

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return searchedRows.slice(start, start + pageSize);
  }, [searchedRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchInput, pageSize, sortBy, sortDir]);

  const setSortBy = useCallback((value) => {
    setSortByState(
      normalizeOrderListSortBy(
        value,
        PAYMENT_FAILURE_SORT_BY,
        DEFAULT_PAYMENT_FAILURE_SORT_BY
      )
    );
  }, []);

  const setSortDir = useCallback((value) => {
    setSortDirState(normalizeOrderListSortDir(value));
  }, []);

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
      {
        key: "orderId",
        header: "Order ID",
        render: (row) => (
          <OrderIdLink id={row.id} label={row.orderId} navigate={navigate} />
        ),
      },
      {
        key: "customer",
        header: "Customer",
        render: (row) => (
          <CustomerNamePhone
            name={row.customer}
            phone={row.phone}
            nameTo={customerDetailsPath(row.customerId)}
          />
        ),
      },
      {
        key: "amount",
        header: "Amount",
        align: "right",
        render: (row) => <span className={styles.moneyCell}>{row.amount}</span>,
      },
      {
        key: "reason",
        header: "Failure reason",
        render: (row) => (
          <div className={styles.dotPillStack}>
            {row.code && row.code !== "—" ? (
              <DotPill label={row.code} tone="danger" title={row.code} />
            ) : null}
            <div className={styles.stackedNote}>{row.reason}</div>
          </div>
        ),
      },
      {
        key: "failedAt",
        header: "Failed at",
        render: (row) => (
          <DateTimeStack
            value={row.failedAt}
            title={
              row.failedAtDisplay && row.failedAtDisplay !== "—"
                ? `Failed at: ${row.failedAtDisplay}`
                : undefined
            }
          />
        ),
      },
      {
        key: "statusLabel",
        header: "Status",
        render: (row) => (
          <StatusDotPill
            title={row.statusLabel}
            extra={
              <DotPill
                tone="danger"
                label={row.paymentWaitingAdmin ? "Payment hold" : "Payment failed"}
              />
            }
          />
        ),
      },
      {
        key: "actions",
        header: "Actions",
        align: "right",
        render: (row) => (
          <div className={styles.resolveActions}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/orders/details/${row.id}`)}
            >
              View
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isResolving}
              onClick={() => openConfirm(row, "shift_to_cash")}
            >
              Shift to Cash
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isResolving}
              onClick={() => openConfirm(row, "allow_proceed")}
            >
              Allow Proceed
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isResolving}
              onClick={() => openConfirm(row, "keep_waiting")}
            >
              Keep Waiting
            </Button>
          </div>
        ),
      },
    ],
    [isResolving, navigate, openConfirm]
  );

  const isTableLoading = isLoading || (isFetching && !tableData.length);

  return (
    <div className="min-w-0">
      <OrderPageHeader
        title="Payment Failures"
        description={`Resolve card auto-charge exceptions without losing order context.${failures.length < failureTotal ? ` The API returned ${failures.length} of ${failureTotal} failures.` : ""}`}
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d7dce4] bg-white px-4 text-[13.5px] font-semibold text-[#38424f] hover:bg-[#f4f5f8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <IconRefresh />
            {isFetching ? "Refreshing…" : "Refresh"}
          </button>
        }
      />

      {isError ? (
        <OrderError>
          Could not load payment failures. Use Refresh to try again.
        </OrderError>
      ) : null}

      <OrderMetrics
        items={[
          {
            label: "Payment failures",
            value: failureTotal,
            tone: "danger",
            hint: "Waiting for an admin decision",
          },
          {
            label: "Visible results",
            value: searchedRows.length,
            tone: "neutral",
            hint: searchInput.trim() ? "Matching search" : "Currently loaded",
          },
        ]}
      />

      <OrderListDataTable
        data={pagedRows}
        columns={columns}
        totalRows={searchedRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        showStatusFilter={false}
        searchInput={searchInput}
        onSearchInputChange={setSearchInput}
        searchPlaceholder="Search by order, customer, phone or failure..."
        showSort
        showDownload={false}
        sortBy={sortBy}
        onSortByChange={setSortBy}
        sortDir={sortDir}
        onSortDirChange={setSortDir}
        sortOptions={PAYMENT_FAILURE_SORT_OPTIONS}
        defaultSortBy={DEFAULT_PAYMENT_FAILURE_SORT_BY}
        isTableLoading={isTableLoading}
        tableLayout="grow"
        emptyText={
          searchInput.trim()
            ? "No payment failures match this search"
            : "No payment failures"
        }
      />

      <Modal
        open={modal.open}
        onClose={closeModal}
        title={actionMeta?.label || "Resolve"}
        size="md"
        secondaryLabel="Cancel"
        primaryLabel={isResolving ? "Confirming…" : "Confirm"}
        onPrimary={handleResolve}
        primaryDisabled={isResolving}
        danger={modal.action === "allow_proceed"}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ margin: 0, color: "var(--ink-2)", fontSize: 14 }}>
            Order <strong>{modal.orderTrackId}</strong>: {actionMeta?.confirm}
          </p>
          <Field label="Notes (optional)" htmlFor="payment-failure-notes">
            <Textarea
              id="payment-failure-notes"
              value={modal.notes}
              onChange={(e) =>
                setModal((prev) => ({ ...prev, notes: e.target.value }))
              }
              rows={3}
              placeholder="Optional admin notes / support reason"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
