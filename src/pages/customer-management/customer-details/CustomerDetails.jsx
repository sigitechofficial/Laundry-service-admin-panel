import { useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  BsCardList,
  MdOutlineLocationOn,
  MdOutlinePhone,
  MdMailOutline,
  IoChevronBackOutline,
} from "../../../shared/icons/index";
import Search from "../../../components/ui/Search";
import FiltersButton from "../../../components/ui/FiltersButton";
import DataTable from "../../../components/ui/DataTable";
import ActionButtons from "../../../components/ui/ActionButtons";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCustomerByIdQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import OrderInvoiceModal from "../customer-modals/OrderInvoiceModal";
import DeleteOrderModal from "../../order-management/order-modals/DeleteOrderModal";
import { dateTimeFormat } from "../../../shared/constants";

export default function CustomerDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalData, setModalData] = useState({ open: false, data: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, orderId: null });

  const { data, isLoading, refetch } = useGetCustomerByIdQuery(id, { skip: !id });

  const userDetails = data?.data?.userDetails;
  const bookingDetails = data?.data?.bookingDetails ?? [];

  // Build invoice payload for OrderInvoiceModal from specificCustomerDetails booking + userDetails
  const bookingToInvoiceData = (booking, user) => {
    if (!booking) return null;
    const u = user ?? userDetails;
    const address = [u?.streetAddress, u?.province].filter(Boolean).join(", ") || "—";
    const shopName =
      booking?.laundryShop?.bussinessInformations?.[0]?.shopName ||
      booking?.laundryShop?.name ||
      "—";
    const num = (v) => (v != null && v !== "" ? Number(v) : 0);
    return {
      invoiceNo: booking?.orderTrackId ?? String(booking?.id ?? ""),
      customer: {
        name: u?.user
          ? `${u.user.firstName || ""} ${u.user.lastName || ""}`.trim() || "—"
          : "—",
        id: u?.user?.id ?? u?.userId ?? "—",
        address: address || "—",
        email: u?.user?.email ?? "—",
        phone: u?.user?.phoneNum ?? "—",
        date: booking?.createdAt
          ? dayjs(booking.createdAt).format(dateTimeFormat)
          : "—",
        driverInstruction: booking?.driverInstruction ?? "—",
      },
      deliveryAddress: address || "—",
      pickupDate: booking?.collectionDate
        ? dayjs(booking.collectionDate).format(dateTimeFormat)
        : "—",
      deliveryDate: booking?.deliveryDate
        ? dayjs(booking.deliveryDate).format(dateTimeFormat)
        : "—",
      deliveryInstruction: booking?.driverInstruction ?? "—",
      charges: {
        total: num(booking?.orderAmount),
        minimumOrderFee: 0,
        serviceFee: 0,
        driverTip: 0,
      },
      driverNote: booking?.driverInstruction ?? "",
    };
  };

  const businessFromBooking = (booking) => {
    const name =
      booking?.laundryShop?.bussinessInformations?.[0]?.shopName ||
      booking?.laundryShop?.name;
    return name
      ? { address: name, phone: "—", email: "—" }
      : null;
  };

  const customersData = bookingDetails.map((booking, index) => {
    const serviceNames = [
      ...new Set(
        (booking?.customerSelectedServices ?? [])
          .map((s) => s?.service?.name)
          .filter(Boolean)
      ),
    ].join(", ");
    return {
      id: booking?.id,
      sl: index + 1,
      orderId: booking?.orderTrackId ?? booking?.id,
      orderDateTime: dayjs(booking?.createdAt).format(dateTimeFormat),
      serviceType: serviceNames || "—",
      totalItems: booking?.totalItems,
      pickupDateTime: dayjs(booking?.collectionDate).format(dateTimeFormat),
      deliveryDateTime: dayjs(booking?.deliveryDate).format(dateTimeFormat),
      OrderStatus: booking?.bookingStatus?.title,
      OnHold: booking?.OnHoldConfirmations?.length,
      pickupDriver: `${booking?.driver?.firstName || ""} ${booking?.driver?.lastName || ""}`.trim(),
      deliveryDriver: `${booking?.deliveryDriver?.firstName || ""} ${booking?.deliveryDriver?.lastName || ""}`.trim() || "—",
      shopName:
        booking?.laundryShop?.bussinessInformations?.[0]?.shopName ||
        booking?.laundryShop?.name ||
        "—",
      cost: booking?.orderAmount,
      _booking: booking,
    };
  });

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
      minWidth: 150,
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
      minWidth: 130,
      type: "number",
    },
    {
      field: "deliveryDateTime",
      headerName: "Delivery Date/Time",
      minWidth: 240,
    },
    {
      field: "OnHold",
      headerName: "On-hold",
      minWidth: 140,
    },
    {
      field: "pickupDriver",
      headerName: "Pickup Driver",
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
          onView={() => {
            const payload = bookingToInvoiceData(row._booking, userDetails);
            const business = businessFromBooking(row._booking);
            if (payload)
              setModalData({
                open: true,
                data: { data: payload, business },
              });
          }}
          showEdit={false}
          onDelete={() => setDeleteModal({ open: true, orderId: row.id })}
        />
      ),
    },
  ];

  const handleDateChange = (selectedRange) => {
    console.log("Selected Date Range:", selectedRange);
    setDateRange(selectedRange);

    // You can use the date range for filtering customers
    if (selectedRange) {
      console.log("Start Date:", selectedRange.startDate.format("YYYY-MM-DD"));
      console.log("End Date:", selectedRange.endDate.format("YYYY-MM-DD"));
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
  };

  const handleDownload = (data) => {
    console.log("Download customers data:", data);
  };

  const handleRowAction = (actionType, rowData) => {
    switch (actionType) {
      case "view": {
        const payload = bookingToInvoiceData(rowData?._booking, userDetails);
        const business = businessFromBooking(rowData?._booking);
        if (payload)
          setModalData({ open: true, data: { data: payload, business } });
        break;
      }
      case "edit":
        console.log("Editing customer:", rowData?.id);
        break;
      case "delete":
        setDeleteModal({ open: true, orderId: rowData?.id });
        break;
      case "toggle-status":
        console.log("Toggling status for customer:", rowData?.id);
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
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                  className="flex items-center justify-center p-1 rounded-lg hover:bg-grey50 transition-colors"
                >
                  <IoChevronBackOutline size={24} />
                </button>
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Customer Details
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

            <OrderInvoiceModal
              open={modalData.open}
              data={modalData}
              setModalData={setModalData}
            />
            <DeleteOrderModal
              open={deleteModal.open}
              orderId={deleteModal.orderId}
              onClose={() => setDeleteModal({ open: false, orderId: null })}
              onSuccess={() => refetch()}
            />
          </div>
  );
}
