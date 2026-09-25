import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, PageHeader, Select, Table } from "../../design-system";
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
  DirectoryDotPill,
  DirectoryExportButton,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryViewModal,
  StatusToggle,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import {
  useGetAdminEmployeesQuery,
  useDeleteAdminEmployeeMutation,
  useGetAllRolesQuery,
  useGetFeaturesQuery,
  useUpdateAdminEmployeeStatusMutation,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import AddEmployeeModal from "./employee-modals/AddEmployeeModal";
import { extractAdminEmployees } from "./extractAdminEmployees";
import { AccessGrantChips } from "./RoleAccessPanel";
import { summarizeRoleAccess } from "./roleAccessUtils";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const EMPLOYEE_CSV_COLUMNS = [
  { header: "Employee ID", key: "employeeId" },
  { header: "Name", key: "name" },
  { header: "Email", value: (row) => (row.email === "—" ? "" : row.email) },
  { header: "Phone", key: "phone" },
  { header: "Country code", key: "countryCode" },
  { header: "Role", key: "roleName" },
  {
    header: "Screens granted",
    value: (row) => summarizeRoleAccess(row.roleRecord).screens,
  },
  { header: "Status", value: (row) => (row.status ? "Active" : "Inactive") },
  { header: "Created", value: (row) => csvFormat.date(row.createdAt) },
];

function matchesStatus(row, status) {
  if (!status) return true;
  return status === "active" ? Boolean(row.status) : !row.status;
}

function matchesRole(row, roleId) {
  if (!roleId) return true;
  return String(row.roleId ?? "") === String(roleId);
}

function matchesSearch(row, term) {
  if (!term) return true;
  const q = term.toLowerCase();
  return [row.name, row.email, row.phoneNum, row.phone, row.roleName, row.employeeId]
    .some((value) => String(value ?? "").toLowerCase().includes(q));
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

function extractFeatures(featuresResponse) {
  const source = featuresResponse?.data ?? featuresResponse;
  if (Array.isArray(source)) return source;
  if (source && typeof source === "object") {
    for (const key of ["features", "permissions", "items", "rows"]) {
      if (Array.isArray(source[key])) return source[key];
    }
  }
  return [];
}

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [statusBusyId, setStatusBusyId] = useState(null);

  const { data, currentData, isLoading, isFetching, isUninitialized, isError, refetch } =
    useGetAdminEmployeesQuery({ includeInactive: 1 }, { refetchOnMountOrArgChange: true });
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteAdminEmployeeMutation();
  const [updateStatus] = useUpdateAdminEmployeeStatusMutation();
  const payload = currentData ?? data;
  const adminEmployees = useMemo(() => extractAdminEmployees(payload), [payload]);

  const { data: rolesRes } = useGetAllRolesQuery("admin_portal");
  const rolesList = useMemo(
    () => (Array.isArray(rolesRes?.data) ? rolesRes.data : []),
    [rolesRes?.data]
  );
  const roleById = useMemo(() => {
    const map = new Map();
    rolesList.forEach((r) => map.set(String(r.id), r));
    return map;
  }, [rolesList]);

  const { data: featuresRes } = useGetFeaturesQuery();
  const features = useMemo(() => {
    const all = extractFeatures(featuresRes);
    return all.filter((f) => {
      const of = String(f?.featureOf ?? "").toLowerCase();
      return !of || of === "admin" || of === "both";
    });
  }, [featuresRes]);

  const employeesData = useMemo(
    () =>
      adminEmployees.map((emp, index) => {
        const roleId = emp.roleId ?? emp.role?.id ?? null;
        const roleRecord =
          emp.role?.permissions
            ? emp.role
            : roleId != null
              ? roleById.get(String(roleId))
              : null;
        return {
          id: emp.id,
          sl: index + 1,
          employeeId: emp.id,
          name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—",
          email: emp.email ?? "—",
          phoneNum: emp.phoneNum ?? "—",
          phone: formatUserPhone(emp),
          countryCode: emp.countryCode ?? "",
          roleId,
          roleName:
            emp.role?.name ??
            roleRecord?.name ??
            (roleId != null ? `Role ${roleId}` : "—"),
          roleRecord: roleRecord ?? null,
          status: emp.status,
          createdAt: emp.createdAt,
        };
      }),
    [adminEmployees, roleById]
  );

  const roleOptions = useMemo(() => {
    const seen = new Map();
    employeesData.forEach((row) => {
      if (row.roleId == null) return;
      const key = String(row.roleId);
      if (!seen.has(key)) seen.set(key, row.roleName);
    });
    return [
      { value: "", label: "All roles" },
      ...[...seen.entries()]
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => String(a.label).localeCompare(String(b.label))),
    ];
  }, [employeesData]);

  const visibleRows = useMemo(
    () =>
      employeesData.filter(
        (row) =>
          matchesRole(row, roleFilter) &&
          matchesStatus(row, statusFilter) &&
          matchesSearch(row, searchTerm) &&
          matchesDateRange(row, dateRange)
      ),
    [dateRange, employeesData, roleFilter, searchTerm, statusFilter]
  );

  const hasActiveFilters = Boolean(
    searchTerm || roleFilter || statusFilter || dateRange.startDate || dateRange.endDate
  );

  const csvFilenameFilters = useMemo(
    () => ({
      search: searchTerm.trim(),
      role: roleFilter ? roleById.get(String(roleFilter))?.name || roleFilter : "",
      status: statusFilter,
      from: dateRange.startDate,
      to: dateRange.endDate,
    }),
    [searchTerm, roleFilter, roleById, statusFilter, dateRange.startDate, dateRange.endDate]
  );

  const csv = useCsvExport({
    filenameBase: "employees",
    columns: EMPLOYEE_CSV_COLUMNS,
    rows: visibleRows,
    filenameFilters: csvFilenameFilters,
  });

  const showInitialLoader =
    payload == null && !isError && (isUninitialized || isLoading || isFetching);

  const openEdit = (row) => {
    const rowId = row?.id ?? row?.employeeId ?? null;
    const emp = adminEmployees.find(
      (e) =>
        String(e.id) === String(rowId) ||
        String(e.employeeId) === String(rowId)
    );
    setEditEmployee(emp ?? null);
    setAddModalOpen(true);
  };

  const openDelete = (row) => {
    setEmployeeToDeleteId(row?.id ?? row?.employeeId ?? null);
    setDeleteModalOpen(true);
  };

  const handleDateChange = (part, value) => {
    setDateRange((prev) => ({ ...prev, [part]: value }));
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
  };

  const closeDeleteModal = () => {
    setDeleteModalOpen(false);
    setEmployeeToDeleteId(null);
  };

  const handleConfirmDelete = async () => {
    const resolvedId =
      typeof employeeToDeleteId === "object"
        ? employeeToDeleteId?.id ?? employeeToDeleteId?.employeeId
        : employeeToDeleteId;

    if (resolvedId == null || resolvedId === "" || isDeleting) {
      if (resolvedId == null || resolvedId === "") {
        showError("Employee id is missing. Please close and try again.");
      }
      return;
    }

    const res = await deleteEmployee(resolvedId);
    if (res?.data?.status === "1") {
      closeDeleteModal();
      success(res?.data?.message ?? "Employee deleted successfully.");
      refetch();
    } else {
      showError(res?.error?.data?.message ?? "Failed to delete employee.");
    }
  };

  const handleToggleStatus = async (row) => {
    if (!row?.id || statusBusyId != null) return;
    const next = !row.status;
    setStatusBusyId(row.id);
    try {
      const res = await updateStatus({
        employeeId: row.id,
        status: next,
      });
      if (res?.data?.status === "1") {
        success(next ? "Employee activated." : "Employee deactivated.");
        refetch();
      } else {
        showError(res?.error?.data?.message ?? "Failed to update status.");
      }
    } catch (err) {
      showError(err?.data?.message ?? "Failed to update status.");
    } finally {
      setStatusBusyId(null);
    }
  };

  const columns = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <DirectoryIdentity
          name={row.name}
          meta={joinMeta(`#${row.employeeId}`)}
          id={row.employeeId}
        />
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (row) => (
        <span style={{ fontSize: 13 }}>{row.email}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone number",
      render: (row) => (
        <span style={{ fontSize: 13 }}>{row.phone || row.phoneNum || "—"}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) =>
        row.roleName && row.roleName !== "—" ? (
          <DirectoryDotPill tone="info">{row.roleName}</DirectoryDotPill>
        ) : (
          <span style={{ color: "var(--muted)" }}>—</span>
        ),
    },
    {
      key: "access",
      header: "Permissions",
      render: (row) => (
        <AccessGrantChips role={row.roleRecord} features={features} />
      ),
    },
    {
      key: "changeStatus",
      header: "Change status",
      render: (row) => (
        <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
          <DirectoryStatusPill active={row.status} />
          <StatusToggle
            checked={Boolean(row.status)}
            label={row.status ? `Deactivate ${row.name}` : `Activate ${row.name}`}
            onChange={() => handleToggleStatus(row)}
          />
          {statusBusyId === row.id ? (
            <span style={{ fontSize: 11, color: "var(--muted)" }}>…</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Action",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow(row)} />
          <DirectoryActionEdit onClick={() => openEdit(row)} />
          <DirectoryActionDelete onClick={() => openDelete(row)} />
        </DirectoryActions>
      ),
    },
  ];

  const activeCount = employeesData.filter((r) => r.status).length;
  const inactiveCount = employeesData.length - activeCount;

  return (
    <div style={{ minHeight: 400 }}>
      <PageHeader
        title="All Employees"
        description="Admin staff accounts, roles, and screen access"
        actions={
          <Button
            onClick={() => {
              setEditEmployee(null);
              setAddModalOpen(true);
            }}
          >
            New Employee
          </Button>
        }
      />

      {showInitialLoader ? (
        <div
          style={{
            minHeight: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Delay />
        </div>
      ) : isError && adminEmployees.length === 0 ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            Could not load employees.
          </p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <DirectoryMetrics
            items={[
              { label: "Total", value: employeesData.length, tone: "brand" },
              { label: "Active", value: activeCount, tone: "success" },
              { label: "Inactive", value: inactiveCount, tone: "danger" },
            ]}
          />

          <DirectoryTableWrap
            toolbar={
              <DirectoryToolbar>
                <DirectorySearch
                  id="employee-search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search …"
                />
                <DirectoryToolSelect>
                  <Select
                    aria-label="Employee role"
                    value={roleFilter}
                    onChange={(value) => setRoleFilter(value ?? "")}
                    options={roleOptions}
                    placeholder="All roles"
                  />
                </DirectoryToolSelect>
                <DirectoryToolSelect>
                  <Select
                    aria-label="Employee status"
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value ?? "")}
                    options={STATUS_OPTIONS}
                    placeholder="All statuses"
                  />
                </DirectoryToolSelect>
                <DirectoryDateInput
                  id="employee-start-date"
                  value={dateRange.startDate}
                  onChange={(value) => handleDateChange("startDate", value)}
                  aria-label="Start date"
                  title="Start date"
                />
                <DirectoryDateInput
                  id="employee-end-date"
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
                        setRoleFilter("");
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
              empty="No employees found"
            />
          </DirectoryTableWrap>
        </>
      )}

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.name || "Employee"}
        onClose={() => setViewRow(null)}
        primaryLabel="Open details"
        onPrimary={() => {
          if (!viewRow?.id) return;
          navigate(`/employee-management/details/${viewRow.id}`);
        }}
        fields={[
          { label: "Employee ID", value: viewRow?.employeeId },
          { label: "Role", value: viewRow?.roleName },
          {
            label: "Permissions",
            value: viewRow?.roleRecord
              ? `${summarizeRoleAccess(viewRow.roleRecord).screens} screens granted`
              : "—",
          },
          { label: "Email", value: viewRow?.email },
          { label: "Phone", value: viewRow?.phone || viewRow?.phoneNum },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
          {
            label: "Joined",
            value: viewRow?.createdAt ? csvFormat.date(viewRow.createdAt) : "—",
          },
        ]}
      />

      <AddEmployeeModal
        key={editEmployee ? `edit-${editEmployee.id}` : "add"}
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditEmployee(null);
        }}
        onSuccess={() => refetch()}
        employee={editEmployee}
      />
      <Modal
        open={deleteModalOpen}
        title="Delete Employee"
        description="This will permanently remove the employee. This action can't be undone."
        onClose={closeDeleteModal}
        onPrimary={handleConfirmDelete}
        primaryLabel={isDeleting ? "Deleting…" : "Delete"}
        secondaryLabel="Cancel"
        danger
      />
    </div>
  );
}
