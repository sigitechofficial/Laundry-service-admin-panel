import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../../shared/icons/index";
import { Delay } from "../../../components/shared/Loaders";
import StatCard from "../../../components/ui/StatCard";
import DataTable from "../../../components/ui/DataTable";
import { useState, useMemo } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import ActionButtons from "../../../components/ui/ActionButtons";
import {
  useGetAllOrderQuery,
  useGetOrdersCountQuery,
  useGetAllOrderStatusesQuery,
} from "../../../store/services/api";
import { dateTimeFormat } from "../../../shared/constants";
import {
  canEditOrderFromBooking,
  resolveOrderStatusTitle,
} from "../../../shared/orderEditStatusGate";
import DeleteOrderModal from "../order-modals/DeleteOrderModal";

const PENDING_STATUSES = ["pending", "new", "active", "order created"];

export default function PendingOrders() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetAllOrderQuery();
  const { data: OrderCounts, refetch: refetchCounts } = useGetOrdersCountQuery();
  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const orderStatuses = useMemo(
    () => (Array.isArray(statusesResponse?.data) ? statusesResponse.data : []),
    [statusesResponse?.data]
  );
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModal, setDeleteModal] = useState({ open: false, orderId: null });

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
        navigate(`/orders/details/${rowData.id}`);
        break;
      case "edit":
        navigate(`/orders/edit/${rowData.id}`);
        break;
      case "delete":
        setDeleteModal({ open: true, orderId: rowData.id });
        break;
      default:
        break;
    }
  };

  const handleDeleteSuccess = () => {
    refetch();
    refetchCounts();
  };

  const allOrders = data?.data?.orderDetails ?? [];
  const pendingOrders = allOrders.filter((booking) => {
    const status = (booking?.bookingStatus?.title ?? "").toLowerCase().trim();
    return PENDING_STATUSES.some((s) => status === s);
  });
  const customersData = pendingOrders.map((booking, index) => ({
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
    OrderStatus: resolveOrderStatusTitle(booking),
    _booking: booking,
    OnHold: booking?.OnHoldConfirmations?.length,
    pickupDriver: `${booking?.driver?.firstName ?? ""} ${booking?.driver?.lastName ?? ""}`.trim(),
    deliveryDriver: `${booking?.driver?.firstName ?? ""} ${booking?.driver?.lastName ?? ""}`.trim(),
    shopName: booking?.laundryShop?.name,
    cost: booking?.orderAmount,
    actions: "actions",
  }));

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
          showEdit={canEditOrderFromBooking(row._booking, orderStatuses)}
          onView={() => navigate(`/orders/details/${row.id}`)}
          onEdit={() => navigate(`/orders/edit/${row.id}`)}
          onDelete={() => setDeleteModal({ open: true, orderId: row.id })}
        />
      ),
    },
  ];
  if (isLoading) return <Delay />;

  return (
    <>
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
                title="Pending ORDERS"
                value={OrderCounts?.data?.pendingOrders}
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
      <DeleteOrderModal
        open={deleteModal.open}
        orderId={deleteModal.orderId}
        onClose={() => setDeleteModal({ open: false, orderId: null })}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
}
