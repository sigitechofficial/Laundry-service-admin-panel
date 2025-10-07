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
import { dateTimeFormat } from "../../shared/constants";

export default function CustomerManagement() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { isLoading } = useGetAllCustomersQuery();
  const { data } = useGetAllCustomersCountQuery();
  const customers = useSelector((state) => state.apiData.customers);

  // Sample customer data
  const customersData = customers?.map((cus, index) => {
    return {
      id: cus.id,
      sl: index + 1,
      customerId: cus.id,
      name: cus?.firstName + " " + cus?.lastName,
      email: cus?.email,
      phone: cus?.phoneNum,
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
      minWidth: 100,
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
      minWidth: 150,
    },
    {
      field: "totalOrders",
      headerName: "Total Orders",
      flex: 0.1,
      minWidth: 130,
      type: "number",
    },
    {
      field: "lastOrderDate",
      headerName: "Last Order Date",
      flex: 0.12,
      minWidth: 170,
    },
    {
      field: "amountSpent",
      headerName: "Total Amount Spent",
      flex: 0.12,
      minWidth: 120,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.08,
      minWidth: 100,
      type: "chip",
      renderCell: (params) => (
        <StatusPill status={params.value ? "active" : "block"} />
      ),
    },
    {
      field: "changeStatus",
      headerName: "Change Status",
      flex: 0.1,
      minWidth: 130,
      type: "switch",
      renderCell: (params) => (
        <ChangeStatus
          width={"45px"}
          checked={params.value}
          // onChange={(e) => setChecked(e.target.checked)}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.15,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => (
        <ActionButtons
          onView={() =>
            navigate(`/customer-management/details/${params?.row?.id}`)
          }
          onEdit={() => alert("Edit clicked")}
          onDelete={() => alert("Delete clicked")}
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
    console.log("🚀 ~ handleRowAction ~ rowData:", rowData);
    switch (actionType) {
      case "view":
        navigate(`customer-management/details/${rowData.id}`);
        break;
      case "edit":
        // Navigate to edit customer page or open edit modal
        console.log("Editing customer:", rowData.name);
        break;
      case "delete":
        // Show confirmation dialog and delete customer
        console.log("Deleting customer:", rowData.name);
        break;
      case "toggle-status":
        // Toggle customer status
        console.log("Toggling status for customer:", rowData.name);
        break;
      default:
        break;
    }
  };
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
              </Box>
            </Box>

            <div className="grid grid-cols-4 gap-7 font-Inter">
              <div className="rounded-lg !px-3.5 !py-5 bg-purple50">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  Total customers
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {data?.data?.TotalCustomer}
                </p>
              </div>

              <div className="rounded-lg !px-3.5 !py-5 bg-red50">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  new customers
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {data?.data?.NewCustomers}
                </p>
              </div>

              <div className="rounded-lg !px-3.5 !py-5 bg-green50">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  Frequent customers
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {data?.data?.RepeatedCustomers}
                </p>
              </div>

              <div className="rounded-lg !px-3.5 !py-5 bg-green200">
                <h6 className="font-Inter font-semibold text-lg uppercase">
                  Top performing customers
                </h6>
                <p className="font-Inter font-medium text-[22px] !pt-10">
                  {data?.data?.topPerformingCustomers || 0}
                </p>
              </div>
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
                onRowAction={handleRowAction}
                height={600}
              />
            </div>
          </div>
        )
      }
    />
  );
}
