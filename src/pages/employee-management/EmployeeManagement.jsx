import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal, PageHeader, Table } from "../../design-system";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
  DirectoryDateInput,
  DirectoryIdentity,
  DirectoryMetrics,
  DirectorySearch,
  DirectoryStatusPill,
  DirectoryTableWrap,
  DirectoryToolbar,
  DirectoryToolbarEnd,
  DirectoryViewModal,
} from "../directory-table/directoryTable";
import { joinMeta } from "../directory-table/directoryTableUtils";
import { useGetAdminEmployeesQuery, useDeleteAdminEmployeeMutation } from "../../store/services/api";
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

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [searchTerm, setSearchTerm] = useState("");
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

  const employeesData = useMemo(
    () =>
      adminEmployees.map((emp, index) => ({
        id: emp.id,
        sl: index + 1,
        employeeId: emp.id,
        name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—",
        email: emp.email ?? "—",
        phoneNum: emp.phoneNum ?? "—",
        status: emp.status,
        createdAt: emp.createdAt,
      })),
    [adminEmployees]
  );

  const visibleRows = useMemo(
    () =>
      employeesData.filter(
        (row) => matchesSearch(row, searchTerm) && matchesDateRange(row, dateRange)
      ),
    [dateRange, employeesData, searchTerm]
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
          { label: "Email", value: viewRow?.email },
          { label: "Phone", value: viewRow?.phoneNum },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
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
