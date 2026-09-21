import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, PageHeader, Select, Table } from "../../design-system";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryDotPill,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolSelect,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import {
  useGetAdminEmployeesQuery,
  useDeleteAdminEmployeeMutation,
  useGetAllRolesQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import useToaster from "../../components/ui/Toaster";
import AddEmployeeModal from "./employee-modals/AddEmployeeModal";
import { extractAdminEmployees } from "./extractAdminEmployees";

function matchesSearch(row, term) {
  if (!term) return true;
  const q = term.toLowerCase();
  return Object.entries(row).some(([key, value]) => {
    if (key === "actions") return false;
    return String(value ?? "").toLowerCase().includes(q);
  });
}

function matchesRole(row, roleId) {
  if (!roleId) return true;
  return String(row.roleId ?? "") === String(roleId);
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

function formatJoined(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const { data, currentData, isLoading, isFetching, isUninitialized, isError, refetch } =
    useGetAdminEmployeesQuery(undefined, { refetchOnMountOrArgChange: true });
  const [deleteEmployee, { isLoading: isDeleting }] = useDeleteAdminEmployeeMutation();
  const payload = currentData ?? data;
  const adminEmployees = useMemo(() => extractAdminEmployees(payload), [payload]);

  // The list endpoint only returns roleId; resolve human-readable names from
  // the admin-portal role catalog so the table and view modal can show them.
  const { data: rolesRes } = useGetAllRolesQuery("admin_portal");
  const roleNameById = useMemo(() => {
    const list = Array.isArray(rolesRes?.data) ? rolesRes.data : [];
    return new Map(list.map((r) => [String(r.id), r.name]));
  }, [rolesRes?.data]);

  const employeesData = useMemo(
    () =>
      adminEmployees.map((emp, index) => {
        const roleId = emp.roleId ?? emp.role?.id ?? null;
        return {
          id: emp.id,
          sl: index + 1,
          employeeId: emp.id,
          name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—",
          email: emp.email ?? "—",
          phoneNum: emp.phoneNum ?? "—",
          roleId,
          roleName:
            emp.role?.name ??
            (roleId != null ? roleNameById.get(String(roleId)) : undefined) ??
            (roleId != null ? `Role ${roleId}` : "—"),
          status: emp.status,
          createdAt: emp.createdAt,
        };
      }),
    [adminEmployees, roleNameById]
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
          matchesSearch(row, searchTerm) &&
          matchesDateRange(row, dateRange)
      ),
    [dateRange, employeesData, roleFilter, searchTerm]
  );

  const hasActiveFilters = Boolean(
    searchTerm || roleFilter || dateRange.startDate || dateRange.endDate
  );

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

  const columns = [
    {
      key: "name",
      header: "Employee",
      render: (row) => (
        <DirectoryIdentity
          name={row.name}
          meta={joinMeta(row.email, row.phoneNum)}
          id={row.employeeId}
        />
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
      key: "status",
      header: "Status",
      render: (row) => <DirectoryStatusPill active={row.status} />,
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <DirectoryActions>
          <DirectoryActionView onClick={() => setViewRow(row)} />
          <DirectoryActionEdit onClick={() => openEdit(row)} />
          <DirectoryActionDelete onClick={() => openDelete(row)} />
        </DirectoryActions>
      ),
    },
  ];

  return (
    <div style={{ minHeight: 400 }}>
      <PageHeader
        title="Employee Management"
        description="Add and manage admin employees"
        actions={
          <Button
            onClick={() => {
              setEditEmployee(null);
              setAddModalOpen(true);
            }}
          >
            Add Employee
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
            items={[{ label: "Total employees", value: adminEmployees.length, tone: "brand" }]}
          />

          <DirectoryTableWrap
            toolbar={
              <DirectoryToolbar>
                <DirectorySearch
                  id="employee-search"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  placeholder="Search by ID, name, email…"
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
                {hasActiveFilters ? (
                  <DirectoryToolbarEnd>
                    <DirectoryClearButton
                      onClick={() => {
                        handleSearchChange("");
                        setRoleFilter("");
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
          { label: "Email", value: viewRow?.email },
          { label: "Phone", value: viewRow?.phoneNum },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
          { label: "Joined", value: formatJoined(viewRow?.createdAt) },
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
