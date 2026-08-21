import { useMemo, useState } from "react";
import {
  Button,
  PageHeader,
  Select,
  Table,
} from "../../design-system";
import {
  DirectoryActionDelete,
  DirectoryActionEdit,
  DirectoryActions,
  DirectoryActionView,
  DirectoryClearButton,
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
import AddEmployeeModal from "../employee-management/employee-modals/AddEmployeeModal";
import DeleteEmployeeModal from "../employee-management/employee-modals/DeleteEmployeeModal";
import {
  useGetShopsDataQuery,
  useGetAllEmployeesWithShopInfoQuery,
} from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";

function matchesSearch(row, term) {
  if (!term) return true;
  const q = term.toLowerCase();
  return ["name", "email", "phone", "shopName", "role"].some((key) =>
    String(row[key] ?? "")
      .toLowerCase()
      .includes(q)
  );
}

export default function ShopEmployeesPage() {
  const [selectedShop, setSelectedShop] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeIdToDelete, setEmployeeIdToDelete] = useState(null);
  const [viewRow, setViewRow] = useState(null);

  const {
    data: employeesResponse,
    isLoading: employeesLoading,
    isError: employeesError,
    refetch: refetchEmployees,
  } = useGetAllEmployeesWithShopInfoQuery();
  const employees = useMemo(
    () => employeesResponse?.data?.employees || [],
    [employeesResponse?.data?.employees]
  );

  const { data: shopsResponse, isLoading: shopsLoading } = useGetShopsDataQuery();
  const shops = useMemo(
    () => shopsResponse?.data?.AllShopsData || [],
    [shopsResponse?.data?.AllShopsData]
  );

  const shopOptions = useMemo(() => {
    if (!shops?.length) return [];
    return shops.map((shop) => ({
      value: String(shop.id),
      label: shop.shopName || shop.name || shop.businessName || `Shop ${shop.id}`,
    }));
  }, [shops]);

  const allEmployees = useMemo(() => {
    if (!employees?.length) return [];
    return employees.map((emp, index) => {
      const phoneDisplay =
        emp.countryCode && emp.phoneNum
          ? `${emp.countryCode} ${emp.phoneNum}`
          : emp.phoneNum || "—";
      return {
        id: emp.id,
        sl: index + 1,
        name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—",
        email: emp.email ?? "—",
        phone: phoneDisplay,
        shopId: emp.shopInfo?.id ?? null,
        shopName: emp.shopInfo?.shopName ?? "—",
        role: emp.role?.name ?? "—",
        status: emp.status,
      };
    });
  }, [employees]);

  const filteredByShop = useMemo(() => {
    const byShop = !selectedShop
      ? allEmployees
      : allEmployees.filter((e) => String(e.shopId) === String(selectedShop));
    return byShop.filter((row) => matchesSearch(row, searchTerm));
  }, [allEmployees, selectedShop, searchTerm]);

  const totalCount = allEmployees.length;
  const activeCount = allEmployees.filter((e) => e.status).length;
  const inactiveCount = totalCount - activeCount;
  const shopsWithEmployees = new Set(
    allEmployees.map((e) => e.shopId).filter(Boolean)
  ).size;

  const columns = [
    {
      key: "name",
      header: "Employee",
      render: (row) => (
        <DirectoryIdentity name={row.name} meta={joinMeta(row.email !== "—" ? row.email : null, row.shopName, row.role)} id={row.id} />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <DirectoryStatusPill active={row.status} />
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
              const fullEmployee = employees.find((e) => e.id === row?.id);
              setEmployeeToEdit(fullEmployee ?? null);
              setAddEmployeeModalOpen(true);
            }}
          />
          <DirectoryActionDelete
            onClick={() => {
              setEmployeeIdToDelete(row?.id ?? null);
              setDeleteModalOpen(true);
            }}
          />
        </DirectoryActions>
      ),
    },
  ];

  if (employeesError) {
    return (
      <div>
        <PageHeader
          title="Shop Employees"
          description="Filter employees by shop and manage shop staff records"
        />
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>
            Could not load shop employees.
          </p>
          <Button variant="secondary" onClick={() => refetchEmployees()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (employeesLoading) return <Delay />;

  return (
    <div>
      <PageHeader
        title="Shop Employees"
        description="Filter employees by shop and manage shop staff records"
        actions={
          <Button
            onClick={() => {
              setEmployeeToEdit(null);
              setAddEmployeeModalOpen(true);
            }}
          >
            Add Employee
          </Button>
        }
      />

      <DirectoryMetrics
        items={[
          { label: "Total employees", value: totalCount, tone: "brand" },
          { label: "Active", value: activeCount, tone: "success" },
          { label: "Inactive", value: inactiveCount, tone: "neutral" },
          { label: "Shops", value: shopsWithEmployees, tone: "navy" },
        ]}
      />

      <DirectoryTableWrap
        toolbar={
          <DirectoryToolbar>
            <DirectorySearch
              id="shop-employee-search"
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by name, email, phone..."
            />
            <DirectoryToolSelect>
              <Select
                aria-label="Shop"
                value={selectedShop}
                onChange={(value) => setSelectedShop(value ?? "")}
                options={[{ value: "", label: "All shops" }, ...shopOptions]}
                placeholder="All shops"
                disabled={shopsLoading}
              />
            </DirectoryToolSelect>
            {searchTerm || selectedShop ? (
              <DirectoryToolbarEnd>
                <DirectoryClearButton
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedShop("");
                  }}
                />
              </DirectoryToolbarEnd>
            ) : null}
          </DirectoryToolbar>
        }
      >
        <Table
          columns={columns}
          rows={filteredByShop}
          rowKey={(row) => row.id}
          empty="No employees found"
        />
      </DirectoryTableWrap>

      <DirectoryViewModal
        open={Boolean(viewRow)}
        title={viewRow?.name || "Employee"}
        onClose={() => setViewRow(null)}
        fields={[
          { label: "Employee ID", value: viewRow?.id },
          { label: "Email", value: viewRow?.email },
          { label: "Phone", value: viewRow?.phone },
          { label: "Role", value: viewRow?.role },
          { label: "Shop", value: viewRow?.shopName },
          { label: "Status", value: viewRow?.status ? "Active" : "Inactive" },
        ]}
      />

      <AddEmployeeModal
        open={addEmployeeModalOpen}
        onClose={() => {
          setAddEmployeeModalOpen(false);
          setEmployeeToEdit(null);
        }}
        onSuccess={() => {
          refetchEmployees();
          setEmployeeToEdit(null);
        }}
        employee={employeeToEdit}
        forShopEmployees
        shopOptions={shopOptions}
      />

      <DeleteEmployeeModal
        open={deleteModalOpen}
        employeeId={employeeIdToDelete}
        onClose={() => {
          setDeleteModalOpen(false);
          setEmployeeIdToDelete(null);
        }}
        onSuccess={() => {
          refetchEmployees();
          setDeleteModalOpen(false);
          setEmployeeIdToDelete(null);
        }}
        forShopEmployees
      />
    </div>
  );
}
