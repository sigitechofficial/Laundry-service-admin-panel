import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../../shared/icons/index";
import { Delay } from "../../../components/shared/Loaders";
import StatCard from "../../../components/ui/StatCard";
import DataTable from "../../../components/ui/DataTable";
import { useState } from "react";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import ActionButtons from "../../../components/ui/ActionButtons";
import {
  useGetOnHoldBookingsQuery,
  useGetOrdersCountQuery,
} from "../../../store/services/api";
import { dateTimeFormat } from "../../../shared/constants";
import DeleteOrderModal from "../order-modals/DeleteOrderModal";

export default function OnHoldOrders() {
  const navigate = useNavigate();
  const { data, isLoading, refetch } = useGetOnHoldBookingsQuery();
  const { data: OrderCounts, refetch: refetchCounts } = useGetOrdersCountQuery();
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

  const customersData = data?.data?.data?.onHoldBookings?.map((booking, index) => {
    const pickupDate = booking?.collectionDate
      ? dayjs(booking.collectionDate).format("DD/MM/YYYY")
      : "—";
    const pickupTime = booking?.collectionTimeFrom && booking?.collectionTimeTo
      ? `${booking.collectionTimeFrom.slice(0, 5)} – ${booking.collectionTimeTo.slice(0, 5)}`
      : "—";
    const deliveryDate = booking?.deliveryDate
      ? dayjs(booking.deliveryDate).format("DD/MM/YYYY")
      : "—";
    const deliveryTime = booking?.deliveryTimeFrom && booking?.deliveryTimeTo
      ? `${booking.deliveryTimeFrom.slice(0, 5)} – ${booking.deliveryTimeTo.slice(0, 5)}`
      : "—";

    return {
      id: booking?.id,
      sl: index + 1,
      orderId: booking?.orderTrackId || booking?.id,
      orderDateTime: booking?.createdAt
        ? dayjs(booking.createdAt).format(dateTimeFormat)
        : "—",
      frequency: booking?.frequency || "—",
      totalItems: booking?.totalItems ?? "—",
      pickupDateTime: `${pickupDate} ${pickupTime}`,
      deliveryDateTime: `${deliveryDate} ${deliveryTime}`,
      onHoldReason: booking?.onHoldReason || booking?.OnHoldOtherReason || "—",
      cost: booking?.orderAmount != null ? `£${booking.orderAmount}` : "—",
      noOfBags: booking?.noOfBags ?? "—",
      actions: "actions",
    };
  });

  const customerColumns = [
    {
      field: "sl",
      headerName: "SL",
      minWidth: 80,
    },
    {
      field: "orderId",
      headerName: "Order ID",
      minWidth: 160,
    },
    {
      field: "orderDateTime",
      headerName: "Order Date & Time",
      minWidth: 200,
    },
    {
      field: "frequency",
      headerName: "Frequency",
      minWidth: 140,
    },
    {
      field: "totalItems",
      headerName: "Total Items",
      minWidth: 120,
    },
    {
      field: "noOfBags",
      headerName: "No. of Bags",
      minWidth: 130,
    },
    {
      field: "pickupDateTime",
      headerName: "Pickup Date / Time",
      minWidth: 210,
    },
    {
      field: "deliveryDateTime",
      headerName: "Delivery Date / Time",
      minWidth: 210,
    },
    {
      field: "onHoldReason",
      headerName: "On-Hold Reason",
      minWidth: 180,
    },
    {
      field: "cost",
      headerName: "Order Amount",
      minWidth: 140,
    },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 200,
      sortable: false,
      renderCell: (row) => (
        <ActionButtons
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
                title="On Hold ORDERS"
                value={OrderCounts?.data?.onHoldOrders}
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
