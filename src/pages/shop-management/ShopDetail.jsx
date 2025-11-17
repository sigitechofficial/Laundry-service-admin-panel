import { useState } from "react";
import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import {
  BsCardList,
  MdOutlineLocationOn,
  MdOutlinePhone,
  MdMailOutline,
  IoChevronBackOutline,
} from "../../shared/icons/index";
import Search from "../../components/ui/Search";
import FiltersButton from "../../components/ui/FiltersButton";
import DataTable from "../../components/ui/DataTable";
import ActionButtons from "../../components/ui/ActionButtons";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCustomerByIdQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import shopsFallback from "../../data/shops.json";
import dayjs from "dayjs";
import OrderInvoiceModal from "../customer-management/customer-modals/OrderInvoiceModal";
import { dateTimeFormat } from "../../shared/constants";

export default function ShopDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalData, setModalData] = useState({ open: false, data: "" });

  const { data, isLoading } = useGetCustomerByIdQuery(id, { skip: !id });

  // If API returns data use it, otherwise try to find shop details in local JSON
  const shopDetailsSource = data?.data
    ? data.data
    : shopsFallback.find((s) => s.id === id)?.details;

  const customersData = shopDetailsSource?.bookingDetails?.map(
    (booking, index) => {
      return {
        id: booking?.id,
        sl: index + 1,
        orderId: booking?.id,
        orderDateTime: dayjs(booking?.createdAt).format(dateTimeFormat),
        serviceType: booking?.serviceType,
        totalItems: booking?.totalItems,
        pickupDateTime: dayjs(booking?.collectionDate).format(dateTimeFormat),
        deliveryDateTime: dayjs(booking?.deliveryDate).format(dateTimeFormat),
        OrderStatus: booking?.bookingStatus?.title,
        OnHold: booking?.OnHoldConfirmations?.length,
        pickupDriver: `
        ${booking?.driver?.firstName || ""} ${booking?.driver?.lastName || ""}`,
        deliveryDriver: `${booking?.driver?.firstName || ""} ${
          booking?.driver?.lastName || ""
        }`,
        shopName: booking?.laundryShop?.name,
        cost: booking?.orderAmount,
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
  const handleViewShopEmployee = () => {
    navigate(`/shop-management/details/${id}/shop-employee`);
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
                <button
                  type="button"
                  onClick={() => navigate("/shop-management")}
                  aria-label="Go back to shop management"
                  className="flex items-center gap-2 cursor-pointer "
                >
                  <IoChevronBackOutline size={20} />
                </button>
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Shop Detail
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
                    ID #{shopDetailsSource?.userDetails?.userId}
                  </p>
                  <p className="font-medium text-2xl !pt-4 capitalize">
                    {`${
                      shopDetailsSource?.userDetails?.user?.firstName || ""
                    } ${shopDetailsSource?.userDetails?.user?.lastName || ""}`}
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdMailOutline size={"22px"} />
                    {shopDetailsSource?.userDetails?.user?.email}
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdOutlinePhone size={"22px"} />
                    {shopDetailsSource?.userDetails?.user?.phoneNum}
                  </p>
                  <p className="font-medium text-base text-grey20 flex items-center gap-2">
                    <MdOutlineLocationOn size={"24px"} />
                    {shopDetailsSource?.userDetails?.streetAddress +
                      " " +
                      shopDetailsSource?.userDetails?.province}
                  </p>
                </div>

                <div className="   h-full w-auto flex flex-col justify-between items-center">
                  <div className="rounded-2xl ">
                    <img
                      className="size-20  object-center"
                      src="/images/admin.png"
                      alt="customer image"
                    />
                  </div>
                  <div>
                    <button
                      onClick={handleViewShopEmployee}
                      className="bg-blue100 text-white !px-4 !py-2 rounded-md text-sm  cursor-pointer"
                    >
                      View Shop Employee
                    </button>
                  </div>
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
          </div>
        )
      }
    />
  );
}
