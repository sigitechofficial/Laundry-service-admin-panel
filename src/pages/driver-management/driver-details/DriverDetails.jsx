import { useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import Layout from "../../../components/shared/Layout";
import {
  BsCardList,
  TbFileDownload,
  TbEye,
  TbEdit,
  TbTrash,
  MdOutlineLocationOn,
  MdOutlinePhone,
  MdMailOutline,
} from "../../../shared/icons/index";
import Search from "../../../components/ui/Search";
import FiltersButton from "../../../components/ui/FiltersButton";
import DateRangeSelector from "../../../components/ui/DateRangeSelector";
import DataTable from "../../../components/ui/DataTable";
import StatusPill from "../../../components/ui/StatusPill";
import ChangeStatus from "../../../components/ui/Switch";
import ActionButtons from "../../../components/ui/ActionButtons";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCustomerByIdQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import { dateTimeFormat } from "../../../shared/constants";

export default function DriverDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading } = useGetCustomerByIdQuery(id, { skip: !id });

  // Sample customer data
  const customersData = data?.data?.bookingDetails?.map((booking, index) => {
    return {
      id: booking?.id,
      sl: index + 1,
      orderId: booking?.id,
      orderDateTime: dayjs(booking?.createdAt).format(dateTimeFormat),
      serviceType: booking?.serviceType,
      totalItems: booking?.totalItems,
      pickupDateTime: dayjs(booking?.collectionDate).format(dateTimeFormat),
      deliveryDateTime: dayjs(booking?.deliveryDate).format(dateTimeFormat),
      OnHold: booking?.OnHoldConfirmations?.length,
      pickupDriver: `
        ${booking?.driver?.firstName || ""} ${booking?.driver?.lastName || ""}`,
      deliveryDriver: `${booking?.driver?.firstName || ""} ${
        booking?.driver?.lastName || ""
      }`,
      shopName: booking?.laundryShop?.id,
      cost: booking?.orderAmount,
      status: booking?.bookingStatus?.title,
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
      field: "orderId",
      headerName: "Order Id",
      flex: 0.12,
      minWidth: 100,
    },
    {
      field: "orderDateTime",
      headerName: "Order date & time",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "serviceType",
      headerName: "Service type",
      flex: 0.18,
      minWidth: 150,
    },
    {
      field: "totalItems",
      headerName: "Total items",
      flex: 0.15,
      minWidth: 150,
    },
    {
      field: "pickupDateTime",
      headerName: "Pickup date/time",
      flex: 0.1,
      minWidth: 130,
      type: "number",
    },
    {
      field: "deliveryDateTime",
      headerName: "Delivery Date/Time",
      flex: 0.12,
      minWidth: 170,
    },
    {
      field: "OnHold ",
      headerName: "On-hold ",
      flex: 0.12,
      minWidth: 120,
    },
    {
      field: "pickupDriver ",
      headerName: "Pickup Driver ",
      flex: 0.12,
      minWidth: 120,
    },
    {
      field: "deliveryDriver",
      headerName: "Delivery driver",
      flex: 0.12,
      minWidth: 120,
    },
    {
      field: "shopName",
      headerName: "Shop Name",
      flex: 0.12,
      minWidth: 120,
    },
    {
      field: "cost",
      headerName: "Total cost",
      flex: 0.12,
      minWidth: 120,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.08,
      minWidth: 100,
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
      renderCell: () => (
        <ActionButtons
          onView={() => alert("View clicked")}
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
        // Navigate to customer details page or open modal
        navigate(`/customer-management/${rowData.id}`);
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
                  Driver Management
                </Typography>
              </Box>

              <Box className="flex items-center gap-x-5">
                <Search
                  placeholder="Search"
                  onChange={handleSearchChange}
                  value={searchTerm}
                />

                <FiltersButton text="Filters" />
              </Box>
            </Box>

            <div className="flex w-full rounded-xl bg-white !p-4">
              <div className="w-[720px] bg-grey50 rounded-[20px] !p-7 flex justify-between font-Inter">
                <div className="!space-y-2">
                  <p className="text-grey20 font-medium text-2xl">
                    ID #{data?.data?.userDetails?.userId}
                  </p>
                  <p className="font-medium text-2xl !pt-4 capitalize">
                    {`${data?.data?.userDetails?.user?.firstName} ${data?.data?.userDetails?.user?.lastName}`}
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdMailOutline size={"22px"} />
                    {data?.data?.userDetails?.user?.email}
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdOutlinePhone size={"22px"} />
                    {data?.data?.userDetails?.user?.phoneNum}
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdOutlineLocationOn size={"24px"} />
                    {data?.data?.userDetails.streetAddress +
                      " " +
                      data?.data?.userDetails?.province}
                  </p>
                </div>

                <div className="size-20 rounded-2xl">
                  <img
                    className="w-full h-full object-center"
                    src="/images/admin.png"
                    alt="customer image"
                  />
                </div>
              </div>
            </div>

            <div className="w-full overflow-auto">
              <DataTable
                data={customersData}
                columns={customerColumns}
                searchPlaceholder="Search by order ID, product name..."
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
