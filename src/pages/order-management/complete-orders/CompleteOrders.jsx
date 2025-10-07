import { Box, Typography } from "@mui/material";
import Layout from "../../../components/shared/Layout";
import { BsCardList } from "../../../shared/icons/index";
import { Delay } from "../../../components/shared/Loaders";
import StatCard from "../../../components/ui/StatCard";
import DataTable from "../../../components/ui/DataTable";
import { useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import ActionButtons from "../../../components/ui/ActionButtons";
import {
  useGetAllCompleteOrdersQuery,
  useGetOrdersCountQuery,
} from "../../../store/services/api";
import { dateTimeFormat } from "../../../shared/constants";

export default function CompleteOrders() {
  const navigate = useNavigate();
  const { data, isLoading } = useGetAllCompleteOrdersQuery();
  const { data: OrderCounts } = useGetOrdersCountQuery();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalData, setModalData] = useState({ open: false, data: "" });

  const handleSearchChange = (searchTerm) => {
    setSearchTerm(searchTerm);
    console.log("Search term:", searchTerm);
    // Implement search logic here - filter the customersData
  };

  const handleFilter = () => {
    console.log("Filter button clicked");
  };

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

  const handleDownload = (data) => {
    console.log("Download customers data:", data);
  };

  const handleRowAction = (actionType, rowData) => {
    switch (actionType) {
      case "view":
        navigate(`/customer-management/${rowData.id}`);
        break;
      case "edit":
        console.log("Editing customer:", rowData.name);
        break;
      case "delete":
        console.log("Deleting customer:", rowData.name);
        break;
      case "toggle-status":
        console.log("Toggling status for customer:", rowData.name);
        break;
      default:
        break;
    }
  };

  const customersData = data?.data?.allCompletedOrders?.map(
    (booking, index) => {
      return {
        id: booking?.id,
        sl: index + 1,
        orderId: booking?.id,
        orderDateTime: dayjs(booking?.created_at).format(dateTimeFormat),
        serviceType: booking?.customerSelectedServices
          ?.map((ser) => ser?.service?.name)
          .join(","),
        totalItems: booking?.totalItems,
        pickupDateTime: dayjs(booking?.collectionDate).format(dateTimeFormat),
        deliveryDateTime: dayjs(booking?.deliveryDate).format(dateTimeFormat),
        OrderStatus: booking?.bookingStatus?.title,
        OnHold: booking?.OnHoldConfirmations?.length,
        pickupDriver: `${booking?.driver?.firstName || ""} ${
          booking?.driver?.lastName || ""
        }`,
        deliveryDriver: `${booking?.driver?.firstName || ""} ${
          booking?.driver?.lastName || ""
        }`,
        shopName: booking?.laundryShop?.name,
        cost: booking?.orderAmount,
        actions: "actions",
      };
    }
  );

  const customerColumns = [
    {
      field: "sl",
      headerName: "SL",
      minWidth: 100,
    },
    {
      field: "orderId",
      headerName: "Order Id",
      minWidth: 140,
    },
    {
      field: "orderDateTime",
      headerName: "Order date & time",
      minWidth: 200,
    },
    {
      field: "serviceType",
      headerName: "Service type",
      minWidth: 170,
    },
    {
      field: "totalItems",
      headerName: "Total items",
      minWidth: 170,
    },
    {
      field: "pickupDateTime",
      headerName: "Pickup date/time",
      minWidth: 200,
      type: "number",
    },
    {
      field: "deliveryDateTime",
      headerName: "Delivery Date/Time",
      minWidth: 240,
    },
    {
      field: "OnHold ",
      headerName: "On-hold ",
      minWidth: 140,
    },
    {
      field: "pickupDriver ",
      headerName: "Pickup Driver ",
      minWidth: 170,
    },
    {
      field: "deliveryDriver",
      headerName: "Delivery driver",
      minWidth: 180,
    },
    {
      field: "shopName",
      headerName: "Shop Name",
      minWidth: 160,
    },
    {
      field: "cost",
      headerName: "Total cost",
      minWidth: 150,
    },
    {
      field: "OrderStatus",
      headerName: "Status",
      minWidth: 100,
    },

    {
      field: "actions",
      headerName: "Actions",
      minWidth: 200,
      sortable: false,
      renderCell: (row) => (
        <ActionButtons
          onView={() => setModalData({ open: true, data: row })}
          showEdit={false}
          onDelete={() => alert("Delete clicked")}
        />
      ),
    },
  ];
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
                  Order Management
                </Typography>
              </Box>
            </Box>

            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-7 font-Inter">
              <StatCard
                title="TOTAL ORDERS"
                value={OrderCounts?.data?.allOrderCount}
                bgColor="bg-purple50"
              />

              <StatCard
                title="COMPELETED ORDERS"
                value={OrderCounts?.data?.completedOrders}
                bgColor="bg-green50"
              />
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
