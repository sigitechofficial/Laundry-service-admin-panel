import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, PageHeader, Select, Table } from "../../design-system";
import { formatAmount, formatDate, resolveCurrencySymbol } from "../../utilities/formatters";
import { formatUserPhone } from "../../utilities/contactLinks";
import { csvFormat } from "../../utilities/csvExport";
import { useCsvExport } from "../../hooks/useCsvExport";
import {
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
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import NewDriverModal from "./NewDriverModal";
import EditDriverModal from "./EditDriverModal";
import {
  useGetAllDriverMiniDetailsQuery,
  useDeleteDriverMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const DRIVER_CSV_COLUMNS = [
  { header: "Driver ID", key: "driverId" },
  { header: "First name", key: "firstName" },
  { header: "Last name", key: "lastName" },
  { header: "Email", key: "email" },
  { header: "Phone", key: "phone" },
  { header: "Country code", key: "countryCode" },
  { header: "Role", key: "role" },
  { header: "Type", value: (row) => (row.laundaryShopId ? "Shop agent" : "Freelance") },
  { header: "Shop ID", key: "laundaryShopId" },
  { header: "Total orders", key: "totalOrders" },
  { header: "Completed orders", key: "completedOrders" },
  { header: "Pending orders", key: "pendingOrders" },
  { header: "Earnings", value: (row) => csvFormat.money(row.driverEarnings) },
  { header: "Status", value: (row) => (row.status ? "Active" : "Inactive") },
  { header: "Created", value: (row) => csvFormat.date(row.createdAt) },
];

function matchesStatus(row, status) {
  if (!status) return true;
  return status === "active" ? Boolean(row.status) : !row.status;
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

export default function DriverManagement() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [isEditDriverModalOpen, setIsEditDriverModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const { data: driversResponse, isLoading, refetch: refetchDrivers } = useGetAllDriverMiniDetailsQuery({ includeInactive: 1 });
  const [deleteDriver, { isLoading: isDeleting }] = useDeleteDriverMutation();

  const drivers = useMemo(() => driversResponse?.data || [], [driversResponse?.data]);

  const sortedDrivers = useMemo(
    () =>
      [...drivers].sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
      }),
    [drivers]
  );

  const driversData = useMemo(
    () =>
      sortedDrivers.map((driver, index) => ({
        id: driver.id,
        sl: index + 1,
        driverId: driver.id,
        name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
        email: driver.email || "",
        phone: formatUserPhone(driver),
        role: driver.role?.name || "",
        totalOrders: driver.totalOrders || 0,
        completedOrders: driver.completedOrders || 0,
        pendingOrders: driver.pendingOrders || 0,
        driverEarnings: driver.driverEarnings || 0,
        currencySymbol: resolveCurrencySymbol(driver, { applyDefault: true }),
        createdAt: driver.createdAt,
        status: driver.status,
        changeStatus: driver.status,
        firstName: driver.firstName || "",
        lastName: driver.lastName || "",
        classifiedAsId: driver.classifiedAsId || null,
        phoneNum: driver.phoneNum || driver.phone || "",
        countryCode: driver.countryCode || "",
        laundaryShopId: driver.laundaryShopId || driver.classifiedAsId || null,
      })),
    [sortedDrivers]
  );

  const visibleRows = useMemo(
    () =>
      driversData.filter(
        (row) =>
          matchesStatus(row, statusFilter) &&
          matchesSearch(row, searchTerm) &&
          matchesDateRange(row, dateRange)
      ),
    [dateRange, driversData, searchTerm, statusFilter]
  );

  const hasActiveFilters = Boolean(
    searchTerm || statusFilter || dateRange.startDate || dateRange.endDate
  );

  const csvFilenameFilters = useMemo(
    () => ({
      search: searchTerm.trim(),
      status: statusFilter,
      from: dateRange.startDate,
      to: dateRange.endDate,
    }),
    [searchTerm, statusFilter, dateRange.startDate, dateRange.endDate]
  );

  const csv = useCsvExport({
    filenameBase: "drivers",
    columns: DRIVER_CSV_COLUMNS,
    rows: visibleRows,
    filenameFilters: csvFilenameFilters,
  });

  const driverStats = useMemo(() => {
    const list = Array.isArray(drivers) ? drivers : [];
    return {
      total: list.length,
      shopAgent: list.filter((d) => d.laundaryShopId || d.classifiedAsId).length,
      freelance: list.filter((d) => !d.laundaryShopId && !d.classifiedAsId).length,
      blocked: list.filter((d) => !d.status).length,
    };
  }, [drivers]);

  const handleDateChange = (part, value) => {
    setDateRange((prev) => ({ ...prev, [part]: value }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDriverToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!driverToDelete?.id || isDeleting) return;
    try {
      const res = await deleteDriver(driverToDelete.id).unwrap();
      if (res?.status === "1") {
        success(res?.message || "Driver deleted successfully!");
        closeDeleteModal();
        refetchDrivers();
      } else {
        showError(res?.message || "Failed to delete driver");
      }
    } catch (err) {
      const errorMessage =
        err?.data?.message ||
        err?.data?.error ||
        err?.message ||
        "Failed to delete driver";
      showError(errorMessage);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Driver",
      render: (row) => (
        <DirectoryIdentity
          name={row.name}
          meta={row.email}
          id={row.driverId}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <DirectoryStatusPill active={row.status} />,
    },
    {
      key: "totalOrders",
      header: "Orders",
      render: (row) => (
        <DirectoryMetric
          value={row.totalOrders}
          hint={row.pendingOrders > 0 ? `${row.pendingOrders} pending` : `${row.completedOrders} completed`}
        />
      ),
    },
    {
      key: "driverEarnings",
      header: "Earnings",
      render: (row) => (
        <DirectoryMoney>
          {formatAmount(row.driverEarnings, row, { applyDefault: true })}
        </DirectoryMoney>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow(row)} />
          <DirectoryActionEdit
            onClick={() => {
              setSelectedDriver(row);
              setIsEditDriverModalOpen(true);
            }}
          />
          <DirectoryActionDelete
            onClick={() => {
              setDriverToDelete(row);
              setIsDeleteModalOpen(true);
            }}
          />
        </DirectoryActions>
      ),
    },
  ];

  if (isLoading) return <Delay />;

  const driverName = driverToDelete
    ? `${driverToDelete.firstName || ""} ${driverToDelete.lastName || ""}`.trim() || driverToDelete.name
    : "this driver";

  return (
    <div>
      <PageHeader
        title="Driver Management"
        description="View, add, and manage drivers"
        actions={
          <Button onClick={() => setIsNewDriverModalOpen(true)}>
            New Driver
          </Button>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total drivers", value: driverStats.total, tone: "brand" },
          { label: "Shop agent drivers", value: driverStats.shopAgent, tone: "navy" },
          { label: "Freelance drivers", value: driverStats.freelance, tone: "success" },
          { label: "Block drivers", value: driverStats.blocked, tone: "danger" },
        ]}
      />

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="driver-search"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by driver ID, name, email…"
            />
            <DirectoryToolSelect>
              <Select
                aria-label="Driver status"
                value={statusFilter}
                onChange={(value) => setStatusFilter(value ?? "")}
                options={STATUS_OPTIONS}
                placeholder="All statuses"
              />
            </DirectoryToolSelect>
            <DirectoryDateInput
              id="driver-start-date"
              value={dateRange.startDate}
              onChange={(value) => handleDateChange("startDate", value)}
              aria-label="Start date"
              title="Start date"
            />
            <DirectoryDateInput
              id="driver-end-date"
              value={dateRange.endDate}
              onChange={(value) => handleDateChange("endDate", value)}
              aria-label="End date"
              title="End date"
            />
            <DirectoryToolbarEnd>
              {hasActiveFilters ? (
                <DirectoryClearButton
                  onClick={() => {
                    handleSearchChange("");
                    setStatusFilter("");
                    setDateRange({ startDate: "", endDate: "" });
                  }}
                />
              ) : null}
              <DirectoryExportButton
                onClick={csv.run}
                loading={csv.isExporting}
                count={visibleRows.length}
              />
            </DirectoryToolbarEnd>
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={visibleRows}
          rowKey={(row) => row.id}
          empty="No drivers found"
        />
      </DirectoryTableWrap>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.name || "Driver"}
        onClose={() => setViewRow(null)}
        primaryLabel="Open details"
        onPrimary={() => {
          if (!viewRow?.id) return;
          navigate(`/driver-management/details/${viewRow.id}`);
        }}
        fields={[
          { label: "Driver ID", value: viewRow?.driverId },
          { label: "Email", value: viewRow?.email },
          { label: "Phone", value: viewRow?.phone },
          { label: "Role", value: viewRow?.role },
          { label: "Total orders", value: viewRow?.totalOrders },
          { label: "Completed", value: viewRow?.completedOrders },
          { label: "Pending", value: viewRow?.pendingOrders },
          {
            label: "Earnings",
            value: formatAmount(viewRow?.driverEarnings, viewRow, { applyDefault: true }),
          },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
          { label: "Created", value: formatDate(viewRow?.createdAt) },
        ]}
      />

      <NewDriverModal
        open={isNewDriverModalOpen}
        onClose={() => setIsNewDriverModalOpen(false)}
        onDriverAdded={() => {
          refetchDrivers();
        }}
      />
      <EditDriverModal
        open={isEditDriverModalOpen}
        onClose={() => {
          setIsEditDriverModalOpen(false);
          setSelectedDriver(null);
        }}
        driverData={selectedDriver}
        onDriverUpdated={() => {
          refetchDrivers();
        }}
      />
      <Modal
        open={isDeleteModalOpen}
        title="Delete Driver"
        description={`This will permanently remove ${driverName} and all saved details. This action can't be undone.`}
        onClose={closeDeleteModal}
        onPrimary={handleConfirmDelete}
        primaryLabel={isDeleting ? "Deleting…" : "Delete"}
        secondaryLabel="Cancel"
        danger
      />
    </div>
  );
}
