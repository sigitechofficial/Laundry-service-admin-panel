import { useEffect, useMemo, useState } from "react";
import { LuExternalLink } from "react-icons/lu";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import useToaster from "../../../components/ui/Toaster";
import {
  useGetActionRequiredOrdersQuery,
  useGetAllOrderStatusesQuery,
} from "../../../store/services/api";
import { getApiErrorMessage } from "../../../store/services/apiErrors";
import { DATE_TIME_FORMAT, formatDate } from "../../../utilities/formatters";
import { matchesOrderListSearch } from "../listSearch";
import OrderListDataTable from "../OrderListDataTable";
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
  customerDetailsPath,
  downloadOrderListCsv,
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
  const [statusId, setStatusId] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [assignModal, setAssignModal] = useState({
    open: false,
    orderId: null,
    booking: null,
  });

  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const orderStatuses = useMemo(
    () => (Array.isArray(statusesResponse?.data) ? statusesResponse.data : []),
    [statusesResponse?.data]
  );

  const listParams = useMemo(() => {
    const params = {};
    if (filter !== "all") params.reason = filter;
    if (zoneId != null && String(zoneId).trim() !== "") {
      params.zoneId = String(zoneId);
    }
    if (dateRange?.startDate && dateRange?.endDate) {
      params.startDate = dayjs(dateRange.startDate).format("YYYY-MM-DD");
      params.endDate = dayjs(dateRange.endDate).format("YYYY-MM-DD");
    }
    return params;
  }, [filter, zoneId, dateRange]);

  const hasActiveFilters = Boolean(
    (zoneId != null && String(zoneId).trim() !== "") ||
      (statusId != null && String(statusId).trim() !== "") ||
      (dateRange?.startDate && dateRange?.endDate) ||
      searchInput.trim() !== ""
  );

  const clearFilters = () => {
    setZoneId("");
    setStatusId("");
    setDateRange(null);
    setSearchInput("");
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

  const visibleItems = useMemo(() => {
    if (statusId == null || String(statusId).trim() === "") return items;
    const want = Number(statusId);
    return items.filter((row) => Number(row.bookingStatusId) === want);
  }, [items, statusId]);

  const tableData = useMemo(
    () =>
      visibleItems.map((row) => {
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
          phone: row.customer?.phoneNum || "—",
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
          collectionTimeTo: row.collectionTimeTo,
          deliveryTimeTo: row.deliveryTimeTo,
          schedulePhase: schedulePhaseForRow(row),
          updatedAt: updatedRaw
            ? formatDate(updatedRaw, DATE_TIME_FORMAT)
            : "—",
          updatedAtMs: updatedRaw ? dayjs(updatedRaw).valueOf() : 0,
          paymentWaitingAdmin: row.paymentDeliveryGate === "waiting_admin",
          raw: row,
          _booking: row,
        };
      }),
    [visibleItems]
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
  }, [filter, zoneId, statusId, dateRange, searchInput, pageSize]);

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
            pickupTime={row.collectionTimeTo}
            drop={row.deliveryDate || row.deliveryDateTime}
            dropTime={row.deliveryTimeTo}
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
                onExport={() =>
                  downloadOrderListCsv(searchedRows, "action_required_orders.csv")
                }
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
          zoneId={zoneId}
          onZoneIdChange={setZoneId}
          statusId={statusId}
          onStatusIdChange={setStatusId}
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          orderStatuses={orderStatuses}
          showStatusFilter
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          isTableLoading={isTableLoading}
          // Hidden: 7-query merge is capped (~150 of ~543). Sorting that slice would lie.
          showSort={false}
          searchPlaceholder="Search action-required orders..."
          onDownload={() =>
            downloadOrderListCsv(searchedRows, "action_required_orders.csv")
          }
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
