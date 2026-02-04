import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { BsCardList, TbFileDownload, TbPlus } from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import FiltersButton from "../../components/ui/FiltersButton";
import DateRangeSelector from "../../components/ui/DateRangeSelector";
import DataTable from "../../components/ui/DataTable";
import StatusPill from "../../components/ui/StatusPill";
import ChangeStatus from "../../components/ui/Switch";
import ActionButtons from "../../components/ui/ActionButtons";
import NewDriverModal from "./NewDriverModal";
import EditDriverModal from "./EditDriverModal";
import DeleteDriverModal from "./DeleteDriverModal";
import { useNavigate } from "react-router-dom";
import {
  useGetAllCustomersCountQuery,
  useGetAllCustomersQuery,
  useGetAllDriverMiniDetailsQuery,
} from "../../store/services/api";
import { useSelector } from "react-redux";
import { Delay } from "../../components/shared/Loaders";
import { dateTimeFormat } from "../../shared/constants";

export default function DriverManagement() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewDriverModalOpen, setIsNewDriverModalOpen] = useState(false);
  const [isEditDriverModalOpen, setIsEditDriverModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);

  // Debug: Log selectedDriver when it changes
  React.useEffect(() => {
    console.log("=== selectedDriver state changed ===");
    console.log("selectedDriver:", selectedDriver);
    if (selectedDriver) {
      console.log("selectedDriver.firstName:", selectedDriver.firstName);
      console.log("selectedDriver.lastName:", selectedDriver.lastName);
      console.log("selectedDriver.email:", selectedDriver.email);
    }
  }, [selectedDriver]);

  // Fetch drivers data from the new API
  const { data: driversResponse, isLoading, refetch: refetchDrivers } = useGetAllDriverMiniDetailsQuery();
  const { data, refetch: refetchCount } = useGetAllCustomersCountQuery();

  // Extract drivers from API response
  const drivers = driversResponse?.data || [];

  // Debug: Log API response to see available fields
  React.useEffect(() => {
    if (driversResponse?.data && driversResponse.data.length > 0) {
      console.log("Sample driver from API:", driversResponse.data[0]);
    }
  }, [driversResponse]);

  // Sort drivers by createdAt in descending order (newest first)
  const sortedDrivers = [...drivers].sort((a, b) => {
    const dateA = new Date(a.createdAt || 0);
    const dateB = new Date(b.createdAt || 0);
    return dateB - dateA; // Descending order (newest first)
  });

  // Map driver data to table format
  const driversData = sortedDrivers?.map((driver, index) => {
    return {
      id: driver.id,
      sl: index + 1,
      driverId: driver.id,
      name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
      email: driver.email || "",
      phone: driver.phoneNum || driver.phone || "", // Try both phoneNum and phone
      role: driver.role?.name || "",
      totalOrders: driver.totalOrders || 0,
      completedOrders: driver.completedOrders || 0,
      pendingOrders: driver.pendingOrders || 0,
      driverEarnings: driver.driverEarnings || 0,
      createdAt: driver.createdAt,
      status: driver.status,
      changeStatus: driver.status,
      // Keep original driver data for edit modal - include all available fields from API
      firstName: driver.firstName || "",
      lastName: driver.lastName || "",
      classifiedAsId: driver.classifiedAsId || null,
      phoneNum: driver.phoneNum || driver.phone || "",
      countryCode: driver.countryCode || "",
      laundaryShopId: driver.laundaryShopId || driver.classifiedAsId || null,
    };
  });

  // Column configuration for driver table
  const driverColumns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.1,
      minWidth: 80,
    },
    {
      field: "driverId",
      headerName: "Driver ID",
      flex: 0.12,
      minWidth: 100,
    },
    {
      field: "name",
      headerName: "Name",
      flex: 0.15,
      minWidth: 150,
    },
    {
      field: "email",
      headerName: "Email",
      flex: 0.18,
      minWidth: 180,
    },
    {
      field: "role",
      headerName: "Role",
      flex: 0.12,
      minWidth: 150,
    },
    {
      field: "totalOrders",
      headerName: "Total Orders",
      flex: 0.1,
      minWidth: 120,
      type: "number",
    },
    {
      field: "completedOrders",
      headerName: "Completed",
      flex: 0.1,
      minWidth: 100,
      type: "number",
    },
    {
      field: "pendingOrders",
      headerName: "Pending",
      flex: 0.1,
      minWidth: 100,
      type: "number",
    },
    {
      field: "driverEarnings",
      headerName: "Earnings",
      flex: 0.12,
      minWidth: 120,
      type: "number",
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
      renderCell: (row) => (
        <ChangeStatus
          width={"45px"}
          checked={row.changeStatus}
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
      renderCell: (row) => (
        <ActionButtons
          onView={() =>
            navigate(`/driver-management/details/${row?.id}`)
          }
          onEdit={() => {
            console.log("=== Edit button clicked ===");
            console.log("row:", JSON.stringify(row, null, 2));
            console.log("row.firstName:", row.firstName);
            console.log("row.lastName:", row.lastName);
            console.log("row.email:", row.email);
            console.log("row.classifiedAsId:", row.classifiedAsId);
            setSelectedDriver(row);
            setIsEditDriverModalOpen(true);
          }}
          onDelete={() => {
            setDriverToDelete(row);
            setIsDeleteModalOpen(true);
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
    <>
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
                    Driver Management
                  </Typography>
                </Box>

                <Box className="flex items-center gap-x-5">
                  <Search
                    placeholder="Search driver"
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
                    text="New Driver"
                    onClick={() => setIsNewDriverModalOpen(true)}
                    Icon={<TbPlus size="20px" />}
                    variant="blue"
                  />
                </Box>
              </Box>

              <div className="grid grid-cols-4 gap-7 font-Inter">
                <div className="rounded-lg !px-3.5 !py-5 bg-purple50">
                  <h6 className="font-Inter font-semibold text-lg uppercase">
                    Total drivers
                  </h6>
                  <p className="font-Inter font-medium text-[22px] !pt-10">
                    {data?.data?.TotalCustomer}
                  </p>
                </div>

                <div className="rounded-lg !px-3.5 !py-5 bg-red50">
                  <h6 className="font-Inter font-semibold text-lg uppercase">
                    Shop agent drivers
                  </h6>
                  <p className="font-Inter font-medium text-[22px] !pt-10">
                    {data?.data?.NewCustomers}
                  </p>
                </div>

                <div className="rounded-lg !px-3.5 !py-5 bg-green50">
                  <h6 className="font-Inter font-semibold text-lg uppercase">
                    freelance drivers
                  </h6>
                  <p className="font-Inter font-medium text-[22px] !pt-10">
                    {data?.data?.RepeatedCustomers}
                  </p>
                </div>

                <div className="rounded-lg !px-3.5 !py-5 bg-green200">
                  <h6 className="font-Inter font-semibold text-lg uppercase">
                    Block drivers
                  </h6>
                  <p className="font-Inter font-medium text-[22px] !pt-10">
                    {data?.data?.topPerformingCustomers || 0}
                  </p>
                </div>
              </div>

              <div className="w-full overflow-auto">
                <DataTable
                  data={driversData || []}
                  columns={driverColumns}
                  searchPlaceholder="Search by driver ID, name, email..."
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
      <NewDriverModal
        open={isNewDriverModalOpen}
        onClose={() => setIsNewDriverModalOpen(false)}
        onDriverAdded={() => {
          // Refetch drivers and count after adding a driver
          refetchDrivers();
          refetchCount();
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
          // Refetch drivers and count after updating a driver
          refetchDrivers();
          refetchCount();
        }}
      />
      <DeleteDriverModal
        open={isDeleteModalOpen}
        driverData={driverToDelete}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDriverToDelete(null);
        }}
        onDriverDeleted={() => {
          // Refetch drivers and count after deleting a driver
          refetchDrivers();
          refetchCount();
          setIsDeleteModalOpen(false);
          setDriverToDelete(null);
        }}
      />
    </>
  );
}
