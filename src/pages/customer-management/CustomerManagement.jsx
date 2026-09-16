import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Button, Modal, PageHeader, Select, Table } from "../../design-system";
import { formatDate, formatAmount, resolveCurrencySymbol } from "../../utilities/formatters";
import { formatUserPhone } from "../../utilities/contactLinks";
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
  DirectoryToolSelect,
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
import { canStaffPerform } from "../../utilities/employeeFeatureAccess";
import { isAccountBlocked } from "../../utilities/accountBlocked";
import AddCustomerModal from "./AddCustomerModal";

const NAME_SORT_OPTIONS = [
  { value: "asc", label: "A → Z" },
  { value: "desc", label: "Z → A" },
];

function compareCustomerRows(a, b, sortBy, sortDir) {
  const dir = sortDir === "asc" ? 1 : -1;
  const av = a?.[sortBy];
  const bv = b?.[sortBy];

  if (sortBy === "name") {
    const an = String(av ?? "").trim();
    const bn = String(bv ?? "").trim();
    // Blank / "—" names always sink to the bottom, either direction.
    const aBlank = !an || an === "—";
    const bBlank = !bn || bn === "—";
    if (aBlank && bBlank) return (Number(a?.id) || 0) - (Number(b?.id) || 0);
    if (aBlank) return 1;
    if (bBlank) return -1;
    const byName = an.localeCompare(bn, undefined, {
      sensitivity: "base",
      numeric: true,
      ignorePunctuation: true,
    });
    if (byName !== 0) return byName * dir;
    return ((Number(a?.id) || 0) - (Number(b?.id) || 0)) * dir;
  }

  if (typeof av === "number" && typeof bv === "number") {
    return (av - bv) * dir;
  }
  if (typeof av === "boolean" || typeof bv === "boolean") {
    return ((av ? 1 : 0) - (bv ? 1 : 0)) * dir;
  }
  const byText = String(av ?? "").localeCompare(String(bv ?? ""), undefined, {
    sensitivity: "base",
    numeric: true,
  });
  if (byText !== 0) return byText * dir;
  return ((Number(a?.id) || 0) - (Number(b?.id) || 0)) * dir;
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
  const [addOpen, setAddOpen] = useState(false);
  const [sortBy, setSortBy] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const { isLoading, isError, error: customersError, refetch } = useGetAllCustomersQuery();
  const { data, refetch: refetchCount } = useGetAllCustomersCountQuery();
  const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();
  const customers = useSelector((state) => state.apiData.customers);
  const canCreateCustomer = canStaffPerform("customerManagement", "create");

  const customersData = useMemo(
    () =>
      (customers || []).map((cus, index) => ({
        id: cus.id,
        sl: index + 1,
        customerId: cus.id,
        name: `${cus?.firstName || ""} ${cus?.lastName || ""}`.trim() || "—",
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
    if (key === sortBy) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(key);
    // Name defaults A→Z; numeric/status columns default high→low.
    setSortDir(key === "name" ? "asc" : "desc");
  }, [sortBy]);

  const handleNameSortDir = useCallback((value) => {
    setSortBy("name");
    setSortDir(value === "desc" ? "desc" : "asc");
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
          onClick={() => navigate(`/customer-management/details/${row.id}`)}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
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
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by customer ID, name, email…"
            />
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

      <AddCustomerModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSuccess={() => {
          refetch();
          refetchCount();
        }}
      />

      <BlockUserModal
        open={Boolean(blockRow)}
        onClose={() => setBlockRow(null)}
        userId={blockRow?.id}
        userType="customer"
        isBlocked={isAccountBlocked(blockRow)}
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
