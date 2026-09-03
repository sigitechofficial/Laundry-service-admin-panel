import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Modal, PageHeader, Table } from "../../design-system";
import { formatDate, formatAmount, resolveCurrencySymbol } from "../../utilities/formatters";
import {
  DirectoryActionBlock,
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryIdentity,
  DirectoryMetric,
  DirectoryMetrics,
  DirectoryMoney,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import { BlockUserModal } from "../user-management/UserBlockActions";
import {
  useGetAllCustomersCountQuery,
  useGetAllCustomersQuery,
  useDeleteCustomerMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import { getApiErrorMessage } from "../../store/services/apiErrors";

function compareCustomerRows(a, b, sortBy, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;
  const av = a?.[sortBy];
  const bv = b?.[sortBy];
  if (typeof av === "number" && typeof bv === "number") {
    return (av - bv) * dir;
  }
  if (typeof av === "boolean" || typeof bv === "boolean") {
    return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
  }
  return (
    String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
      sensitivity: "base",
      numeric: true,
    }) * dir
  );
}

function matchesSearch(row, term) {
  if (!term) return true;
  const q = term.toLowerCase();
  return Object.entries(row).some(([key, value]) => {
    if (key === "actions") return false;
    return String(value ?? "").toLowerCase().includes(q);
  });
}

function matchesDateRange(row, dateRange) {
  if (!dateRange.startDate && !dateRange.endDate) return true;
  if (!row.createdAt) return false;

  const createdAt = new Date(row.createdAt);
  if (Number.isNaN(createdAt.getTime())) return false;

  const start = dateRange.startDate
    ? new Date(`${dateRange.startDate}T00:00:00`)
    : null;
  const end = dateRange.endDate
    ? new Date(`${dateRange.endDate}T23:59:59.999`)
    : null;

  return (!start || createdAt >= start) && (!end || createdAt <= end);
}

export default function CustomerManagement() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [modalData, setModalData] = useState({ open: false, data: "" });
  const [blockRow, setBlockRow] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const { isLoading, isError, error: customersError, refetch } = useGetAllCustomersQuery();
  const { data } = useGetAllCustomersCountQuery();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();
  const customers = useSelector((state) => state.apiData.customers);

  const customersData = useMemo(
    () =>
      (customers || []).map((cus, index) => ({
        id: cus.id,
        sl: index + 1,
        customerId: cus.id,
        name: `${cus?.firstName || ""} ${cus?.lastName || ""}`.trim() || "—",
        email: cus?.email,
        phoneNumber: cus?.phoneNum,
        amountSpent: cus?.totalAmountSpent,
        currencySymbol: resolveCurrencySymbol(cus, { applyDefault: true }),
        lastOrderDate: cus?.lastBookingDate,
        totalOrders: cus?.bookingCount,
        address: cus?.address,
        createdAt: cus?.createdAt,
        updatedAt: cus?.updatedAt,
        status: cus?.status,
        changeStatus: cus?.status,
      })),
    [customers]
  );

  const visibleRows = useMemo(() => {
    const filtered = customersData.filter(
      (row) => matchesSearch(row, searchTerm) && matchesDateRange(row, dateRange)
    );
    return [...filtered].sort((a, b) => compareCustomerRows(a, b, sortBy, sortDir));
  }, [customersData, dateRange, searchTerm, sortBy, sortDir]);

  const handleDateChange = (part, value) => {
    setDateRange((prev) => ({ ...prev, [part]: value }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const handleSort = useCallback((key) => {
    setSortBy((prev) => {
      if (prev === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return prev;
      }
      setSortDir(key === "name" ? "asc" : "desc");
      return key;
    });
  }, []);

  const closeDeleteModal = () => setModalData({ open: false, data: "" });

  const handleConfirmDelete = async () => {
    const id = modalData?.data?.id;
    if (!id || isDeleting) return;
    const res = await deleteCustomer(id);
    if (res?.data?.status === "1") {
      closeDeleteModal();
      success(res?.data?.message);
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
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (row) => <DirectoryStatusPill active={row.status} />,
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
            isBlocked={!row.status}
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

  if (isLoading) return <Delay />;

  if (isError) {
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

  return (
    <div>
      <PageHeader
        title="Customer Management"
        description="View, edit, and manage customer accounts"
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
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by customer ID, name, email…"
            />
            <DirectoryDateInput
              id="customer-start-date"
              value={dateRange.startDate}
              onChange={(value) => handleDateChange("startDate", value)}
              aria-label="Start date"
              title="Start date"
            />
            <DirectoryDateInput
              id="customer-end-date"
              value={dateRange.endDate}
              onChange={(value) => handleDateChange("endDate", value)}
              aria-label="End date"
              title="End date"
            />
            {searchTerm || dateRange.startDate || dateRange.endDate ? (
              <DirectoryToolbarEnd>
                <DirectoryClearButton
                  onClick={() => {
                    handleSearchChange("");
                    setDateRange({ startDate: "", endDate: "" });
                  }}
                />
              </DirectoryToolbarEnd>
            ) : null}
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          empty="No customers found"
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
        />
      </DirectoryTableWrap>

      <BlockUserModal
        open={Boolean(blockRow)}
        onClose={() => setBlockRow(null)}
        userId={blockRow?.id}
        userType="customer"
        isBlocked={!blockRow?.status}
        onSuccess={() => {
          setBlockRow(null);
          refetch();
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
