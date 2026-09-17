import { useCallback, useEffect, useMemo, useState } from "react";
import { LuExternalLink } from "react-icons/lu";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import useToaster from "../../../components/ui/Toaster";
import {
  useGetActionRequiredOrdersQuery,
  useLazyGetActionRequiredOrdersQuery,
} from "../../../store/services/api";
import { getApiErrorMessage } from "../../../store/services/apiErrors";
import { DATE_TIME_FORMAT, formatDate } from "../../../utilities/formatters";
import { formatUserPhone } from "../../../utilities/contactLinks";
import { useCsvExport } from "../../../hooks/useCsvExport";
import { csvFormat } from "../../../utilities/csvExport";
import OrderListDataTable from "../OrderListDataTable";
import { DEFAULT_ORDER_LIST_SORT_DIR, normalizeOrderListSortDir } from "../orderListQuery";
import AssignOrderModal from "../order-modals/AssignOrderModal";
import OrderAssignActionButton from "../order-modals/OrderAssignActionButton";
import {
  DirectoryActionIcon,
  DirectoryActionView,
} from "../../directory-table/DirectoryActionIcon";
import styles from "../orderList.module.css";
import {
  CustomerNamePhone,
  DateTimeStack,
  DotPill,
  OrderIdLink,
  PickupDropCell,
  ReasonPills,
  StatusDotPill,
} from "../orderListTable";
import {
  ORDER_LIST_CSV_COLUMNS,
  customerDetailsPath,
  mapBookingToOrderListRow,
  resolveCustomerId,
  resolveLaundryShopId,
  resolveOrderSchedulePhase,
  resolveShopBusinessInfoId,
  resolveShopName,
  shopDetailsPath,
} from "../orderListUtils";
import {
  OrderError,
  OrderHeaderActions,
  OrderMetrics,
  OrderPageHeader,
} from "../OrderWorkspace";

/**
 * Column roles:
 * - Status → booking pipeline state
 * - Why action needed → stacked admin exception chips (primary, then second)
 * - Pickup & delivery → scheduled slots (same pattern as other order tabs)
 */
const FILTERS = [
  { value: "all", label: "All" },
  { value: "payment_failed", label: "Payment" },
  { value: "on_hold", label: "On hold" },
  { value: "needs_assignment", label: "Unassigned shop" },
  { value: "overdue_pickup", label: "Overdue pickup" },
  { value: "pickup_reschedule", label: "Pickup" },
  { value: "overdue_delivery", label: "Overdue delivery" },
  { value: "delivery_failed", label: "Delivery" },
];

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 25;
const DEFAULT_SORT_BY = "priority";

/** Server `sortBy` allowlist for admin/action-required-orders. */
const ACTION_REQUIRED_SORT_BY = Object.freeze({
  priority: "priority",
  updatedAt: "updatedAt",
  createdAt: "createdAt",
  collectionDate: "collectionDate",
  deliveryDate: "deliveryDate",
  orderAmount: "orderAmount",
  lastPaymentFailureAt: "lastPaymentFailureAt",
});

const ACTION_REQUIRED_SORT_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "updatedAt", label: "Last updated" },
  { value: "createdAt", label: "Order placed" },
  { value: "collectionDate", label: "Pickup" },
  { value: "deliveryDate", label: "Delivery" },
  { value: "orderAmount", label: "Amount" },
  { value: "lastPaymentFailureAt", label: "Last payment failure" },
];

/** Leading "Reason" column, then the shared order-list CSV columns. */
const ACTION_REQUIRED_CSV_COLUMNS = [
  { header: "Reason", value: (row) => csvFormat.list(row.actionReasons) },
  ...ORDER_LIST_CSV_COLUMNS,
  { header: "Zone", value: (row) => row.zoneName || "" },
];

function mapActionRequiredToCsvRow(item) {
  return {
    ...mapBookingToOrderListRow(item),
    actionReasons: Array.isArray(item?.reasonLabels) && item.reasonLabels.length
      ? item.reasonLabels
      : item?.reasons || [],
    zoneName: item?.zoneName || "",
  };
}

function openPathForItem(item) {
  if (item.reasons?.includes("payment_failed")) {
    return "/orders/payment-failures";
  }
  if (item.reasons?.includes("on_hold")) {
    return "/orders/on-hold-orders";
  }
  return `/orders/details/${item.id}`;
}

function schedulePhaseForRow(row) {
  const reasons = row.reasons || [];
  if (
    reasons.includes("overdue_pickup") ||
    reasons.includes("pickup_reschedule")
  ) {
    return "pickup";
  }
  if (
    reasons.includes("overdue_delivery") ||
    reasons.includes("delivery_failed")
  ) {
    return "delivery";
  }
  return resolveOrderSchedulePhase(row, row.bookingStatusTitle);
}

function IconRefresh() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M3 21v-5h5" />
    </svg>
  );
}

export default function ActionRequiredOrders() {
  const navigate = useNavigate();
  const { error: showError } = useToaster();
  const [filter, setFilter] = useState("all");
  const [zoneId, setZoneId] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortByState] = useState(DEFAULT_SORT_BY);
  const [sortDir, setSortDirState] = useState(DEFAULT_ORDER_LIST_SORT_DIR);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [assignModal, setAssignModal] = useState({
    open: false,
    orderId: null,
    booking: null,
  });

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const setSortBy = useCallback((value) => {
    const key = String(value || "").trim();
    setSortByState(ACTION_REQUIRED_SORT_BY[key] ? key : DEFAULT_SORT_BY);
  }, []);

  const setSortDir = useCallback((value) => {
    setSortDirState(normalizeOrderListSortDir(value));
  }, []);

  /** Filter + sort params shared by the paged query and the CSV export. */
  const filterParams = useMemo(() => {
    const params = { sortBy, sortDir };
    if (filter !== "all") params.reason = filter;
    if (zoneId != null && String(zoneId).trim() !== "") {
      params.zoneId = String(zoneId);
    }
    if (dateRange?.startDate && dateRange?.endDate) {
      params.startDate = dayjs(dateRange.startDate).format("YYYY-MM-DD");
      params.endDate = dayjs(dateRange.endDate).format("YYYY-MM-DD");
    }
    if (debouncedSearch) params.search = debouncedSearch;
    return params;
  }, [filter, zoneId, dateRange, debouncedSearch, sortBy, sortDir]);

  const listParams = useMemo(
    () => ({ ...filterParams, page, limit: pageSize }),
    [filterParams, page, pageSize]
  );

  const hasActiveFilters = Boolean(
    (zoneId != null && String(zoneId).trim() !== "") ||
      (dateRange?.startDate && dateRange?.endDate) ||
      searchInput.trim() !== ""
  );

  const clearFilters = () => {
    setZoneId("");
    setDateRange(null);
    setSearchInput("");
    setDebouncedSearch("");
    setPage(1);
  };

  const {
    data,
    currentData,
    isLoading,
    isError,
    error: listError,
    refetch,
    isFetching,
  } = useGetActionRequiredOrdersQuery(listParams);
  const [fetchActionRequiredForExport] = useLazyGetActionRequiredOrdersQuery();

  useEffect(() => {
    if (isError) {
      showError(getApiErrorMessage(listError, "Could not load action-required orders"));
    }
  }, [isError, listError, showError]);

  const payload = currentData ?? (isFetching ? undefined : data);
  const items = useMemo(
    () => payload?.data?.items || [],
    [payload?.data?.items]
  );
  const countsByReason = payload?.data?.countsByReason || {};
  const total =
    payload?.data?.totalCount ?? payload?.data?.count ?? items.length;
  const pagination = payload?.data?.pagination;
  const totalRows =
    Number(
      pagination?.totalRecords ??
        payload?.data?.filteredCount ??
        payload?.data?.count ??
        items.length
    ) || 0;

  const tableData = useMemo(
    () =>
      items.map((row) => {
        const placedRaw = row.createdAt;
        const pickupDateTime = row.collectionDate
          ? formatDate(row.collectionDate, DATE_TIME_FORMAT)
          : "—";
        const deliveryDateTime = row.deliveryDate
          ? formatDate(row.deliveryDate, DATE_TIME_FORMAT)
          : "—";
        const updatedRaw = row.updatedAt;
        return {
          id: row.id,
          orderId: row.orderTrackId || String(row.id),
          orderPlacedAt: placedRaw ? dayjs(placedRaw).valueOf() : 0,
          orderDateTime: placedRaw
            ? formatDate(placedRaw, DATE_TIME_FORMAT)
            : "—",
          orderPlaced: placedRaw
            ? formatDate(placedRaw, DATE_TIME_FORMAT)
            : "—",
          customer: row.customer?.name || "—",
          customerId: resolveCustomerId(row),
          phone: formatUserPhone(row.customer) || "—",
          shopName: resolveShopName(row),
          laundryShopId: resolveLaundryShopId(row),
          shopBusinessInfoId: resolveShopBusinessInfoId(row),
          zone: row.zoneName || "—",
          status: row.bookingStatusTitle || `Status ${row.bookingStatusId}`,
          OrderStatus: row.bookingStatusTitle || `Status ${row.bookingStatusId}`,
          reasons: row.reasonLabels || [],
          reasonKeys: row.reasons || [],
          pickupAt: row.collectionDate
            ? dayjs(row.collectionDate).valueOf()
            : 0,
          pickupDateTime,
          deliveryDateTime,
          collectionDate: row.collectionDate,
          deliveryDate: row.deliveryDate,
          collectionTimeFrom: row.collectionTimeFrom,
          collectionTimeTo: row.collectionTimeTo,
          deliveryTimeFrom: row.deliveryTimeFrom,
          deliveryTimeTo: row.deliveryTimeTo,
          schedulePhase: schedulePhaseForRow(row),
          updatedAt: updatedRaw
            ? formatDate(updatedRaw, DATE_TIME_FORMAT)
            : "—",
          updatedAtMs: updatedRaw ? dayjs(updatedRaw).valueOf() : 0,
          paymentWaitingAdmin: row.paymentDeliveryGate === "waiting_admin",
          lastStatusChange: row.lastStatusChange || null,
          raw: row,
          _booking: row,
        };
      }),
    [items]
  );

  // Any filter / search / sort / page-size change restarts from page 1.
  useEffect(() => {
    setPage(1);
  }, [filter, zoneId, dateRange, debouncedSearch, pageSize, sortBy, sortDir]);

  const fetchAllForExport = useCallback(async () => {
    // `false` → never serve the export from a cached page response.
    const res = await fetchActionRequiredForExport(
      { ...filterParams, export: true },
      false
    ).unwrap();
    return {
      rows: res?.data?.items || [],
      pagination: res?.data?.pagination || null,
    };
  }, [fetchActionRequiredForExport, filterParams]);

  const csvFilenameFilters = useMemo(
    () => ({
      reason: filter !== "all" ? filter : "",
      zone: zoneId,
      search: debouncedSearch,
      from: dateRange?.startDate ? csvFormat.date(dateRange.startDate) : "",
      to: dateRange?.endDate ? csvFormat.date(dateRange.endDate) : "",
    }),
    [filter, zoneId, debouncedSearch, dateRange?.startDate, dateRange?.endDate]
  );

  const csv = useCsvExport({
    filenameBase: "action-required-orders",
    columns: ACTION_REQUIRED_CSV_COLUMNS,
    fetchAll: fetchAllForExport,
    filenameFilters: csvFilenameFilters,
    mapRow: mapActionRequiredToCsvRow,
  });

  const columns = useMemo(
    () => [
      {
        key: "orderId",
        header: "Order",
        render: (row) => (
          <OrderIdLink id={row.id} label={row.orderId} navigate={navigate} />
        ),
      },
      {
        key: "orderPlacedAt",
        header: "Order placed",
        render: (row) => (
          <DateTimeStack
            value={row.orderPlacedAt}
            title={`When the order was created: ${row.orderDateTime}`}
          />
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
        key: "zone",
        header: "Shop & zone",
        render: (row) => (
          <CustomerNamePhone
            name={row.shopName || "No shop assigned"}
            phone={row.zone}
            title={[row.shopName, row.zone].filter((value) => value && value !== "—").join("\n")}
            nameTo={shopDetailsPath(row.shopBusinessInfoId)}
          />
        ),
      },
      {
        key: "pickupAt",
        header: "Pickup & delivery",
        render: (row) => (
          <PickupDropCell
            pickup={row.collectionDate || row.pickupDateTime}
            pickupTime={row.collectionTimeFrom}
            pickupTimeTo={row.collectionTimeTo}
            drop={row.deliveryDate || row.deliveryDateTime}
            dropTime={row.deliveryTimeFrom}
            dropTimeTo={row.deliveryTimeTo}
            title={`Pickup: ${row.pickupDateTime}\nDelivery: ${row.deliveryDateTime}`}
          />
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (row) => (
          <StatusDotPill
            title={row.status}
            changedBy={row.lastStatusChange}
            extra={
              row.paymentWaitingAdmin || row.reasonKeys?.includes("payment_failed") ? (
                <DotPill
                  as="button"
                  tone="danger"
                  label="Payment hold"
                  onClick={() => navigate("/orders/payment-failures")}
                />
              ) : null
            }
          />
        ),
      },
      {
        key: "reasons",
        header: "Why action needed",
        render: (row) => (
          <ReasonPills keys={row.reasonKeys} labels={row.reasons} />
        ),
      },
      {
        key: "updatedAt",
        header: "Updated",
        render: (row) => (
          <DateTimeStack
            value={row.updatedAtMs}
            title={`Last updated: ${row.updatedAt}`}
          />
        ),
      },
      {
        key: "actions",
        header: "Actions",
        render: (row) => (
          <div className="flex min-w-max items-center justify-start gap-1.5">
            <OrderAssignActionButton
              booking={row._booking}
              onClick={() =>
                setAssignModal({
                  open: true,
                  orderId: row.id,
                  booking: row._booking,
                })
              }
            />
            <DirectoryActionIcon
              title="Open exception"
              aria-label={`Open ${row.orderId}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(openPathForItem(row.raw));
              }}
            >
              <LuExternalLink size={16} aria-hidden />
            </DirectoryActionIcon>
            <DirectoryActionView
              title="View order"
              aria-label={`View order ${row.orderId}`}
              onClick={() => navigate(`/orders/details/${row.id}`)}
            />
          </div>
        ),
      },
    ],
    [navigate]
  );

  const emptyText =
    hasActiveFilters
      ? "No orders match these filters"
      : filter === "all"
        ? "No action-required orders — you're clear."
        : `No orders in “${FILTERS.find((item) => item.value === filter)?.label || filter}”.`;

  const isTableLoading = isLoading || (isFetching && !tableData.length);

  return (
    <>
      <div className="min-w-0">
        <OrderPageHeader
          title="Action Required"
          description="Work the exceptions blocking assignment, payment, pickup or delivery. Reason counts and rows stay sourced from the action-required API."
          actions={
            <>
              <button
                type="button"
                onClick={() => refetch()}
                disabled={isFetching}
                className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-[#d7dce4] bg-white px-4 text-[13.5px] font-semibold text-[#38424f] hover:bg-[#f4f5f8] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconRefresh />
                {isFetching ? "Refreshing…" : "Refresh"}
              </button>
              <OrderHeaderActions
                onExport={csv.run}
                exporting={csv.isExporting}
                showNewOrder={false}
              />
            </>
          }
        />

        {isError ? (
          <OrderError>
            Could not load action-required orders. Adjust filters or refresh the page.
          </OrderError>
        ) : null}

        <OrderMetrics
          items={[
            {
              label: "Requires action",
              value: total,
              tone: "danger",
              hint: "All current blockers",
            },
            {
              label: "Payment failed",
              value: countsByReason.payment_failed ?? 0,
              tone: "warning",
              hint: "Card / payment holds",
            },
            {
              label: "Unassigned shop",
              value: countsByReason.needs_assignment ?? 0,
              tone: "navy",
              hint: "Needs assignment",
            },
            {
              label: "Overdue slots",
              value:
                (countsByReason.overdue_pickup ?? 0) +
                (countsByReason.overdue_delivery ?? 0),
              tone: "neutral",
              hint: "Pickup or delivery",
            },
          ]}
        />

        <OrderListDataTable
          data={tableData}
          columns={columns}
          totalRows={totalRows}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          zoneId={zoneId}
          onZoneIdChange={setZoneId}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          // Booking status is not a server param on this endpoint; reason chips cover it.
          showStatusFilter={false}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          isTableLoading={isTableLoading}
          showSort
          sortBy={sortBy}
          onSortByChange={setSortBy}
          sortDir={sortDir}
          onSortDirChange={setSortDir}
          sortOptions={ACTION_REQUIRED_SORT_OPTIONS}
          defaultSortBy={DEFAULT_SORT_BY}
          searchPlaceholder="Search by track ID, booking ID, customer, shop or zone…"
          onDownload={csv.run}
          downloading={csv.isExporting}
          emptyText={emptyText}
          tableLayout="fluid"
          lead={
            <>
              <p className={styles.leadLabel}>Filter by blocker</p>
              <div className={styles.chips} role="group" aria-label="Action reasons">
                {FILTERS.map((item) => {
                  const active = filter === item.value;
                  const count =
                    item.value === "all"
                      ? total
                      : countsByReason[item.value];
                  return (
                    <button
                      key={item.value}
                      type="button"
                      aria-pressed={active}
                      className={`${styles.chip} ${active ? styles.chipActive : ""}`}
                      onClick={() => setFilter(item.value)}
                    >
                      {item.label}
                      {count != null ? (
                        <span className={styles.chipCount}>{count}</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          }
        />
      </div>
      <AssignOrderModal
        open={assignModal.open}
        bookingId={assignModal.orderId}
        bookingSnapshot={assignModal.booking}
        onClose={() =>
          setAssignModal({ open: false, orderId: null, booking: null })
        }
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
}
