import { useState } from "react";
import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { BsCardList, TbFileDownload } from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import FiltersButton from "../../components/ui/FiltersButton";
import DateRangeSelector from "../../components/ui/DateRangeSelector";
import DataTable from "../../components/ui/DataTable";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import ActionButtons from "../../components/ui/ActionButtons";
import { useNavigate } from "react-router-dom";
import {
  useGetAllCustomersCountQuery,
  useGetAllCustomersQuery,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import { Delay } from "../../components/shared/Loaders";
import DeleteModal from "./customer-modals/DeleteModal";
import { dateTimeFormat } from "../../shared/constants";
import StatCard from "../../components/ui/StatCard";

export default function CustomerManagement() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { isLoading } = useGetAllCustomersQuery();

  const { data } = useGetAllCustomersCountQuery();

  const customers = useSelector((state) => state.apiData.customers);
  const [modalData, setModalData] = useState({
    open: false,
    data: "",
  });

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
          onEdit={() => navigate(`/customer-management/edit/${row?.id}`)}
          onDelete={() => setModalData({ open: true, data: row })}
        />
      ),
      sortable: false,
    },
  ];

  const handleDateChange = (selectedRange) => {
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

  // const handleRowAction = (actionType, rowData) => {
  //   console.log("🚀 ~ handleRowAction ~ rowData:", rowData);
  //   switch (actionType) {
  //     case "view":
  //       navigate(`customer-management/details/${rowData.id}`);
  //       break;
  //     case "edit":
  //       // Navigate to edit customer page or open edit modal
  //       console.log("Editing customer:", rowData.name);
  //       break;
  //     case "delete":
  //       // Show confirmation dialog and delete customer
  //       console.log("Deleting customer:", rowData.name);
  //       break;
  //     case "toggle-status":
  //       // Toggle customer status
  //       console.log("Toggling status for customer:", rowData.name);
  //       break;
  //     default:
  //       break;
  //   }
  // };

  return (
    <Layout
      content={
        isLoading ? (
          <Delay />
        ) : (
          <div className="!space-y-11">
            <Box className="flex items-center gap-x-5 justify-between">
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Customer Management
                </Typography>
              </Box>

              <Box className="flex items-center gap-x-5">
                <Search
                  placeholder="Search customer"
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
              </Box>
            </Box>

            <div className="grid grid-cols-4 gap-7 font-Inter">
              <StatCard
                title=" Total customers"
                value={data?.data?.TotalCustomer}
                bgColor="bg-purple50"
              />

              <StatCard
                title=" new customers"
                value={data?.data?.NewCustomers}
                bgColor="bg-red50"
              />

              <StatCard
                title="Frequent customers"
                value={data?.data?.RepeatedCustomers}
                bgColor="bg-green50"
              />

              <StatCard
                title="Top performing customers"
                value={data?.data?.topPerformingCustomers || 0}
                bgColor="bg-green200"
              />
            </div>

            <div className="w-full overflow-auto">
              <DataTable
                data={customersData}
                columns={customerColumns}
                searchPlaceholder="Search by customer ID, name, email..."
                onSearch={handleSearchChange}
                onFilter={handleFilter}
                onDateRangeChange={handleDateChange}
                onDownload={handleDownload}
                // onRowAction={handleRowAction}
                height={600}
              />
            </div>

            <DeleteModal
              open={modalData.open}
              data={modalData}
              setModalData={setModalData}
            />
          </div>
        )
      }
    />
  );
}
