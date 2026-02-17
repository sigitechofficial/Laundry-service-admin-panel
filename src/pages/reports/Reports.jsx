import { useState } from "react";
import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../shared/icons/index";

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
import DashboardFilter from "../dashboard/DashboardFilter";
import { dateTimeFormat } from "../../shared/constants";

export default function Reports() {
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
      rank: cus.id,
      service: cus?.firstName + " " + cus?.lastName,
      noOfOrders: cus?.email,
      totalRevenue: cus?.email,
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
      field: "rank",
      headerName: "Rank",
      flex: 0.12,
      minWidth: 170,
    },
    {
      field: "service",
      headerName: "Service",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "noOfOrders",
      headerName: "No. of Orders",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "totalRevenue",
      headerName: "Total Revenue",
      flex: 0.15,
      minWidth: 180,
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
  if (isLoading) return <Delay />;

  return (
    <div className="!space-y-11">
            <Box className="flex items-center gap-x-5 justify-between">
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Top Services Report
                </Typography>
              </Box>

              <div>
                <DashboardFilter />
              </div>
            </Box>

            <div className="w-full overflow-auto">
              <DataTable
                data={customersData}
                columns={customerColumns}
                searchPlaceholder="Search by ID, product or other..."
                onSearch={handleSearchChange}
                onFilter={handleFilter}
                onDateRangeChange={handleDateChange}
                onDownload={handleDownload}
                onRowAction={handleRowAction}
                height={600}
                showDateRange={false}
                showDownload={false}
                showFilters={false}
              />
            </div>
          </div>
  );
}
