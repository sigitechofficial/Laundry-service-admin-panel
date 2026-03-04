import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { BsCardList, TbFileDownload, TbPlus } from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import FiltersButton from "../../components/ui/FiltersButton";
import DateRangeSelector from "../../components/ui/DateRangeSelector";
import DataTable from "../../components/ui/DataTable";
import StatusPill from "../../components/ui/StatusPill";
import ActionButtons from "../../components/ui/ActionButtons";
import { useNavigate } from "react-router-dom";
import { useGetAdminEmployeesQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { dateTimeFormat } from "../../shared/constants";
import AddEmployeeModal from "./employee-modals/AddEmployeeModal";
import DeleteEmployeeModal from "./employee-modals/DeleteEmployeeModal";

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState(null);

  const { data, isLoading, refetch } = useGetAdminEmployeesQuery();
  const adminEmployees = data?.data?.adminEmployees ?? [];

  const employeesData = adminEmployees.map((emp, index) => ({
    id: emp.id,
    sl: index + 1,
    employeeId: emp.id,
    name: [emp.firstName, emp.lastName].filter(Boolean).join(" ") || "—",
    email: emp.email ?? "—",
    phoneNum: emp.phoneNum ?? "—",
    status: emp.status,
  }));

  const employeeColumns = [
    { field: "sl", headerName: "SL", flex: 0.08, minWidth: 60 },
    { field: "employeeId", headerName: "ID", flex: 0.1, minWidth: 80 },
    { field: "name", headerName: "Name", flex: 0.2, minWidth: 150 },
    { field: "email", headerName: "Email", flex: 0.22, minWidth: 180 },
    { field: "phoneNum", headerName: "Phone", flex: 0.18, minWidth: 130 },
    {
      field: "status",
      headerName: "Status",
      flex: 0.12,
      minWidth: 100,
      type: "chip",
      renderCell: (params) => (
        <StatusPill status={params.value ? "active" : "block"} />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.15,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <ActionButtons
          showView={false}
          onEdit={() => {
            const row = params?.row ?? params;
            const rowId = row?.id ?? row?.employeeId ?? params?.id;
            const emp = adminEmployees.find(
              (e) =>
                String(e.id) === String(rowId) ||
                String(e.employeeId) === String(rowId)
            );
            setEditEmployee(emp ?? null);
            setAddModalOpen(true);
          }}
          onDelete={() => {
            const resolvedId = params?.row?.id ?? params?.row?.employeeId ?? params?.id ?? null;
            setEmployeeToDeleteId(resolvedId);
            setDeleteModalOpen(true);
          }}
        />
      ),
    },
  ];

  const handleDateChange = (selectedRange) => {
    console.log("Selected Date Range:", selectedRange);
    setDateRange(selectedRange);

    // You can use the date range for filtering customers
    if (selectedRange) {
      console.log(
        "Start Date:",
        selectedRange.startDate.format(dateTimeFormat)
      );
      console.log("End Date:", selectedRange.endDate.format(dateTimeFormat));
      console.log("Label:", selectedRange.label);
      console.log("Type:", selectedRange.type);
    }
  };

  const handleSearchChange = (searchTerm) => {
    setSearchTerm(searchTerm);
    console.log("Search term:", searchTerm);
    // Implement search logic here - filter the customersData
  };

  const handleFilter = () => {
    console.log("Filter button clicked");
    // Open filter modal or apply filters
  };

  const handleDownload = (data) => {
    console.log("Download customers data:", data);
    // Implement download functionality (CSV, Excel, etc.)
  };

  const handleRowAction = (actionType, rowData) => {
    switch (actionType) {
      case "edit": {
        const rowId = rowData?.id ?? rowData?.employeeId ?? null;
        const emp = adminEmployees.find(
          (e) =>
            String(e.id) === String(rowId) ||
            String(e.employeeId) === String(rowId)
        );
        setEditEmployee(emp ?? null);
        setAddModalOpen(true);
        break;
      }
      case "delete":
        setEmployeeToDeleteId(rowData?.id ?? rowData?.employeeId ?? null);
        setDeleteModalOpen(true);
        break;
      default:
        break;
    }
  };
  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-11">
            <Box className="flex items-center gap-x-5 justify-between">
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Employee Management
                </Typography>
              </Box>

              <Box className="flex items-center gap-x-5">
                <Search
                  placeholder="Search..."
                  onChange={handleSearchChange}
                  value={searchTerm}
                />
                <FiltersButton
                  text="Download"
                  Icon={
                    <Typography color="grey.400">
                      <TbFileDownload size="24px" />
                    </Typography>
                  }
                />
                <DateRangeSelector
                  value={dateRange}
                  onChange={handleDateChange}
                  placeholder="Select Date Range"
                  className="w-fit"
                />
                <FiltersButton text="Zone" />
                <FiltersButton
                  text="Add Employee"
                  onClick={() => {
                    setEditEmployee(null);
                    setAddModalOpen(true);
                  }}
                  Icon={<TbPlus size="20px" />}
                  variant="blue"
                />
              </Box>
            </Box>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter">
              <div className="rounded-lg !px-3.5 !py-5 bg-purple50">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  Total employees
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {adminEmployees.length}
                </p>
              </div>
            </div>

            <div className="w-full overflow-auto">
              <DataTable
                data={employeesData}
                columns={employeeColumns}
                searchPlaceholder="Search by ID, name, email..."
                onSearch={handleSearchChange}
                onFilter={handleFilter}
                onDateRangeChange={handleDateChange}
                onDownload={handleDownload}
                onRowAction={handleRowAction}
                height={600}
              />
            </div>

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
            <DeleteEmployeeModal
              open={deleteModalOpen}
              employeeId={employeeToDeleteId}
              onClose={() => {
                setDeleteModalOpen(false);
                setEmployeeToDeleteId(null);
              }}
              onSuccess={() => refetch()}
            />
          </div>
  );
}

