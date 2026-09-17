import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, PageHeader, Select, Table } from "../../design-system";
import { formatDate, formatAmount, resolveCurrencySymbol } from "../../utilities/formatters";
import { formatUserPhone } from "../../utilities/contactLinks";
import { csvFormat } from "../../utilities/csvExport";
import { useCsvExport } from "../../hooks/useCsvExport";
import {
  DirectoryActionBlock,
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryExportButton,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import ListPagination from "../order-management/ListPagination";
import { BlockUserModal } from "../user-management/UserBlockActions";
import {
  useGetAllCustomersCountQuery,
  useGetAllCustomersQuery,
  useLazyGetAllCustomersQuery,
  useDeleteCustomerMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { canStaffPerform } from "../../utilities/employeeFeatureAccess";
import { isAccountBlocked } from "../../utilities/accountBlocked";
import AddCustomerModal from "./AddCustomerModal";

const SEARCH_DEBOUNCE_MS = 400;
const DEFAULT_PAGE_SIZE = 25;

const NAME_SORT_OPTIONS = [
  { value: "asc", label: "A → Z" },
  { value: "desc", label: "Z → A" },
];

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "blocked", label: "Blocked" },
];

/** Table column key → server `sortBy`. Columns missing here are not server-sortable. */
const TABLE_SORT_TO_API = {
  name: "name",
  totalOrders: "bookingCount",
  amountSpent: "totalAmountSpent",
};

function customerFullName(customer) {
  return `${customer?.firstName || ""} ${customer?.lastName || ""}`.trim();
}

/** CSV columns operate on the raw API customer row (export mode returns the same shape). */
const CUSTOMER_CSV_COLUMNS = [
  { header: "Customer ID", key: "id" },
  { header: "Name", value: (c) => customerFullName(c) },
  { header: "Email", key: "email" },
  { header: "Phone", value: (c) => formatUserPhone(c) },
  { header: "Country code", key: "countryCode" },
  { header: "Status", value: (c) => (isAccountBlocked(c) ? "Blocked" : "Active") },
  { header: "Orders", value: (c) => Number(c?.bookingCount || 0) },
  { header: "Amount spent", value: (c) => csvFormat.money(c?.totalAmountSpent) },
  { header: "Last order date", value: (c) => csvFormat.date(c?.lastBookingDate) },
  { header: "Signed up", value: (c) => csvFormat.date(c?.createdAt) },
];

export default function CustomerManagement() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();

  // Filters (server-side)
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatusState] = useState("");
  const [dateRange, setDateRangeState] = useState({ startDate: "", endDate: "" });
  const [sortBy, setSortByState] = useState("name");
  const [sortDir, setSortDirState] = useState("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  // UI state
  const [modalData, setModalData] = useState({ open: false, data: "" });
  const [blockRow, setBlockRow] = useState(null);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const setStatus = useCallback((value) => {
    setStatusState(value ?? "");
    setPage(1);
  }, []);

  const handleDateChange = useCallback((part, value) => {
    setDateRangeState((prev) => ({ ...prev, [part]: value }));
    setPage(1);
  }, []);

  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const handleSort = useCallback(
    (key) => {
      if (!TABLE_SORT_TO_API[key]) return;
      if (key === sortBy) {
        setSortDirState((dir) => (dir === "asc" ? "desc" : "asc"));
      } else {
        setSortByState(key);
        // Name defaults A→Z; numeric columns default high→low.
        setSortDirState(key === "name" ? "asc" : "desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const handleNameSortDir = useCallback((value) => {
    setSortByState("name");
    setSortDirState(value === "desc" ? "desc" : "asc");
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setStatusState("");
    setDateRangeState({ startDate: "", endDate: "" });
    setPage(1);
  }, []);

  const hasActiveFilters = Boolean(
    searchInput || status || dateRange.startDate || dateRange.endDate
  );

  /** Filter + sort params shared by the paged query and the CSV export. */
  const filterParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      status: status || undefined,
      startDate: dateRange.startDate || undefined,
      endDate: dateRange.endDate || undefined,
      sortBy: TABLE_SORT_TO_API[sortBy] || "name",
      sortDir,
    }),
    [debouncedSearch, status, dateRange.startDate, dateRange.endDate, sortBy, sortDir]
  );

  const apiParams = useMemo(
    () => ({ ...filterParams, page, limit: pageSize }),
    [filterParams, page, pageSize]
  );

  const {
    data: customersResponse,
    isLoading,
    isFetching,
    isError,
    error: customersError,
    refetch,
  } = useGetAllCustomersQuery(apiParams, { refetchOnMountOrArgChange: true });
  const { data, refetch: refetchCount } = useGetAllCustomersCountQuery();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();
  const [fetchCustomersForExport] = useLazyGetAllCustomersQuery();
  const canCreateCustomer = canStaffPerform("customerManagement", "create");

  const customers = useMemo(
    () => customersResponse?.data?.customers || [],
    [customersResponse?.data?.customers]
  );
  const pagination = customersResponse?.data?.pagination;
  const totalRows = Number(pagination?.totalRecords ?? customers.length) || 0;

  // After a delete on the last page the requested page can fall past the end; snap back.
  const totalPages = Number(pagination?.totalPages) || 1;
  useEffect(() => {
    if (!isFetching && totalRows > 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [isFetching, totalRows, page, totalPages]);

  const customersData = useMemo(
    () =>
      customers.map((cus, index) => ({
        id: cus.id,
        sl: (page - 1) * pageSize + index + 1,
        customerId: cus.id,
        name: customerFullName(cus) || "—",
        email: cus?.email,
        phoneNumber: formatUserPhone(cus),
        amountSpent: cus?.totalAmountSpent,
        currencySymbol: resolveCurrencySymbol(cus, { applyDefault: true }),
        lastOrderDate: cus?.lastBookingDate,
        totalOrders: cus?.bookingCount,
        address: cus?.address,
        createdAt: cus?.createdAt,
        updatedAt: cus?.updatedAt,
        status: cus?.status,
        blocked: isAccountBlocked(cus),
        changeStatus: cus?.status,
      })),
    [customers, page, pageSize]
  );

  const fetchAllForExport = useCallback(
    () =>
      fetchCustomersForExport({ ...filterParams, export: true })
        .unwrap()
        .then((res) => ({
          rows: res?.data?.customers || [],
          pagination: res?.data?.pagination || null,
        })),
    [fetchCustomersForExport, filterParams]
  );

  const csvFilenameFilters = useMemo(
    () => ({
      search: debouncedSearch,
      status,
      from: dateRange.startDate,
      to: dateRange.endDate,
    }),
    [debouncedSearch, status, dateRange.startDate, dateRange.endDate]
  );

  const csv = useCsvExport({
    filenameBase: "customers",
    columns: CUSTOMER_CSV_COLUMNS,
    fetchAll: fetchAllForExport,
    filenameFilters: csvFilenameFilters,
  });

  const refreshAll = useCallback(() => {
    refetch();
    refetchCount();
  }, [refetch, refetchCount]);

  const closeDeleteModal = () => setModalData({ open: false, data: "" });

  const handleConfirmDelete = async () => {
    const id = modalData?.data?.id;
    if (!id || isDeleting) return;
    const res = await deleteCustomer(id);
    if (res?.data?.status === "1") {
      closeDeleteModal();
      success(res?.data?.message);
      refreshAll();
    } else {
      showError(getApiErrorMessage(res?.error, "Failed to delete customer."));
    }
  };

  const columns = [
    {
      key: "name",
      header: "Customer",
      sortable: true,
      render: (row) => (
        <DirectoryIdentity
          name={row.name}
          meta={joinMeta(row.email, row.phoneNumber)}
          id={row.customerId}
          title={joinMeta(row.name, row.email, row.phoneNumber, row.address)}
          onClick={() => navigate(`/customer-management/details/${row.id}`)}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <DirectoryStatusPill
          active={!isAccountBlocked(row)}
          inactiveLabel="Blocked"
        />
      ),
    },
    {
      key: "totalOrders",
      header: "Orders",
      sortable: true,
      render: (row) => (
        <DirectoryMetric
          value={row.totalOrders ?? 0}
          hint={row.lastOrderDate ? `Last ${formatDate(row.lastOrderDate)}` : undefined}
        />
      ),
    },
    {
      key: "amountSpent",
      header: "Spent",
      sortable: true,
      render: (row) => (
        <DirectoryMoney>
          {formatAmount(row.amountSpent, row, { applyDefault: true })}
        </DirectoryMoney>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView
            onClick={() => navigate(`/customer-management/details/${row.id}`)}
          />
          <DirectoryActionBlock
            isBlocked={isAccountBlocked(row)}
            onClick={() => setBlockRow(row)}
          />
          <DirectoryActionEdit
            onClick={() => navigate(`/customer-management/edit/${row?.id}`)}
          />
          <DirectoryActionDelete
            onClick={() => setModalData({ open: true, data: row })}
          />
        </DirectoryActions>
      ),
    },
  ];

  if (isLoading && !customersResponse) return <Delay />;

  if (isError && !customersResponse) {
    return (
      <div style={{ textAlign: "center", padding: 28 }}>
        <p className="jd-lead" style={{ margin: "0 0 12px" }}>
          {getApiErrorMessage(customersError, "Could not load customers.")}
        </p>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const emptyMessage = isFetching
    ? "Loading customers…"
    : hasActiveFilters
      ? "No customers match these filters"
      : "No customers found";

  return (
    <div>
      <PageHeader
        title="Customer Management"
        description="Register new customers, then view and manage their accounts"
        actions={
          canCreateCustomer ? (
            <Button onClick={() => setAddOpen(true)}>Add customer</Button>
          ) : null
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total customers", value: data?.data?.TotalCustomer ?? 0, tone: "brand" },
          { label: "New customers", value: data?.data?.NewCustomers ?? 0, tone: "navy" },
          { label: "Frequent customers", value: data?.data?.RepeatedCustomers ?? 0, tone: "success" },
          { label: "Active customers", value: data?.data?.activeUser ?? 0, tone: "warning" },
        ]}
      />

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="customer-search"
              value={searchInput}
              onChange={setSearchInput}
              placeholder="Search by customer ID, name, email, phone…"
            />
            <DirectoryToolSelect>
              <Select
                aria-label="Customer status"
                value={status}
                onChange={setStatus}
                options={STATUS_OPTIONS}
                placeholder="All statuses"
              />
            </DirectoryToolSelect>
            <DirectoryToolSelect>
              <Select
                aria-label="Sort customers by name"
                value={sortBy === "name" ? sortDir : "asc"}
                onChange={handleNameSortDir}
                options={NAME_SORT_OPTIONS}
              />
            </DirectoryToolSelect>
            <DirectoryDateInput
              id="customer-start-date"
              value={dateRange.startDate}
              onChange={(value) => handleDateChange("startDate", value)}
              aria-label="Signed up from"
              title="Signed up from"
            />
            <DirectoryDateInput
              id="customer-end-date"
              value={dateRange.endDate}
              onChange={(value) => handleDateChange("endDate", value)}
              aria-label="Signed up to"
              title="Signed up to"
            />
            <DirectoryToolbarEnd>
              {hasActiveFilters ? <DirectoryClearButton onClick={clearFilters} /> : null}
              <DirectoryExportButton
                onClick={csv.run}
                loading={csv.isExporting}
                count={totalRows}
              />
            </DirectoryToolbarEnd>
          </DirectoryToolbar>
        }
        footer={
          <ListPagination
            page={page}
            pageSize={pageSize}
            totalRows={totalRows}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            noun="customers"
          />
        }
      >
        <Table
          columns={columns}
          rows={customersData}
          rowKey={(row) => row.id}
          empty={emptyMessage}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </DirectoryTableWrap>

      <AddCustomerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={refreshAll}
      />

      <BlockUserModal
        open={Boolean(blockRow)}
        onClose={() => setBlockRow(null)}
        userId={blockRow?.id}
        userType="customer"
        isBlocked={isAccountBlocked(blockRow)}
        onSuccess={() => {
          setBlockRow(null);
          refreshAll();
        }}
      />

      <Modal
        open={modalData.open}
        title="Delete Customer"
        description={`This will permanently remove ${modalData?.data?.name || "this customer"} and all saved details. This action can’t be undone.`}
        onClose={closeDeleteModal}
        onPrimary={handleConfirmDelete}
        primaryLabel={isDeleting ? "Deleting…" : "Delete"}
        secondaryLabel="Cancel"
        danger
      />
    </div>
  );
}
