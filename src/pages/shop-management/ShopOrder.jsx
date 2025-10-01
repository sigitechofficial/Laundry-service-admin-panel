import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import { Delay } from "../../components/shared/Loaders";

export default function ShopOrder() {
  const navigate = useNavigate();
  const customers = useSelector((state) => state.apiData.customers);

  // Sample customer data
  const customersData = customers?.map((cus, index) => {
    return {
      id: cus.id,
      sl: index + 1,
      customerId: cus.id,
      name: cus?.firstName + " " + cus?.lastName,
      email: cus?.email,
      phoneNumber: cus?.phoneNum,
      amountSpent: cus?.totalAmountSpent,
      lastOrderDate: cus?.lastBookingDate,
      totalOrders: cus?.bookingCount,
      address: cus?.address,
      createdAt: cus?.createdAt,
      updatedAt: cus?.updatedAt,
      status: cus?.status,
      changeStatus: cus?.status,
    };
  });

  // Column configuration for customer table
  const customerColumns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.15,
      minWidth: 100,
    },
    {
      field: "customerId",
      headerName: "Customer Id",
      flex: 0.12,
      minWidth: 170,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "phoneNumber",
      headerName: "Phone Number",
      flex: 0.15,
      minWidth: 180,
    },
    {
      field: "totalOrders",
      headerName: "Total Orders",
      flex: 0.1,
      minWidth: 170,
      type: "number",
    },
    {
      field: "lastOrderDate",
      headerName: "Last Order Date",
      flex: 0.12,
      minWidth: 190,
    },
    {
      field: "amountSpent",
      headerName: "Total Amount Spent",
      flex: 0.12,
      minWidth: 220,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.08,
      minWidth: 100,
      // type: "chip",
      renderCell: (row) => (
        <StatusPill status={row.status ? "active" : "block"} />
      ),
      sortable: false,
    },
    {
      field: "changeStatus",
      headerName: "Change Status",
      flex: 0.1,
      minWidth: 160,
      type: "switch",
      renderCell: (row) => (
        <ChangeStatus
          width={"45px"}
          checked={row.changeStatus}
          // onChange={(e) => setChecked(e.target.checked)}
        />
      ),
      sortable: false,
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.15,
      minWidth: 200,
      renderCell: (row) => (
        <ActionButtons
          onView={() => navigate(`/customer-management/details/${row?.id}`)}
          onEdit={() => alert("Edit clicked")}
          onDelete={() => alert("Delete clicked")}
        />
      ),
      sortable: false,
    },
  ];
  return !customersData.length === 0 ? (
    <Delay />
  ) : (
    <div className="w-full !space-y-11 !mt-16">
      <DataTable
        data={customersData}
        columns={customerColumns}
        searchPlaceholder="Search by customer ID, name, email..."
        // onSearch={handleSearchChange}
        // onFilter={handleFilter}
        // onDateRangeChange={handleDateChange}
        // onDownload={handleDownload}
        // onRowAction={handleRowAction}
        height={600}
      />
    </div>
  );
}
