import { useState } from "react";
import { Box, Typography } from "@mui/material";
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
import { useGetShopDetailsQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import dayjs from "dayjs";
import OrderInvoiceModal from "../customer-management/customer-modals/OrderInvoiceModal";
import DeleteOrderModal from "../order-management/order-modals/DeleteOrderModal";
import { dateTimeFormat } from "../../shared/constants";

export default function ShopDetails() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [dateRange, setDateRange] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [modalData, setModalData] = useState({ open: false, data: "" });
  const [deleteModal, setDeleteModal] = useState({ open: false, orderId: null });

  const { data: shopResponse, isLoading, refetch } = useGetShopDetailsQuery(id, {
    skip: !id,
  });

  const shop = shopResponse?.data ?? shopResponse;
  const biz = shop?.businessInfo;
  const addr = shop?.addressDb;
  const orders = shop?.orders ?? shop?.bookingDetails ?? [];

  // Map API data to previous design structure (userDetails format)
  const shopDetailsSource = shop
    ? {
        userDetails: {
          userId: shop.id,
          user: {
            firstName: shop.shopName ?? "",
            lastName: "",
            email: biz?.email ?? "",
            phoneNum: biz?.phoneNum ?? "",
          },
          streetAddress: addr?.streetAddress ?? "",
          province: [addr?.district, addr?.province, addr?.city?.name, addr?.country?.name]
            .filter(Boolean)
            .join(", "),
        },
      }
    : null;

  // Build invoice payload for OrderInvoiceModal from raw order
  const orderToInvoiceData = (order) => {
    if (!order) return null;
    const c = order?.customer;
    const pickup = order?.pickupAddress;
    const dropOff = order?.dropOffAddress;
    const billing = order?.billingDetail;
    const num = (v) => (v != null && v !== "" ? Number(v) : 0);
    return {
      invoiceNo: order?.orderTrackId ?? String(order?.id ?? ""),
      customer: {
        name: c ? `${c.firstName || ""} ${c.lastName || ""}`.trim() || "—" : "—",
        id: c?.id ?? "—",
        address: (typeof pickup === "object" ? pickup?.streetAddress : null) ?? (typeof dropOff === "object" ? dropOff?.streetAddress : null) ?? "—",
        email: c?.email ?? "—",
        phone: c?.phoneNum ?? "—",
        date: order?.createdAt ? dayjs(order.createdAt).format(dateTimeFormat) : "—",
        driverInstruction: order?.driverInstructionOptions ?? order?.driverInstruction ?? "—",
      },
      deliveryAddress: typeof dropOff === "object" ? dropOff?.streetAddress ?? "—" : "—",
      orderDate: order?.createdAt ? dayjs(order.createdAt).format(dateTimeFormat) : "—",
      pickupDate: order?.collectionDate ? dayjs(order.collectionDate).format(dateTimeFormat) : "—",
      deliveryDate: order?.deliveryDate ? dayjs(order.deliveryDate).format(dateTimeFormat) : "—",
      deliveryInstruction: order?.driverInstructionOptions1 ?? order?.driverInstruction ?? "—",
      charges: {
        total: num(billing?.total ?? order?.orderAmount),
        minimumOrderFee: num(billing?.upfrontAmount),
        serviceFee: num(billing?.serviceCharge),
        driverTip: num(billing?.categoryCharge),
      },
      driverNote: order?.driverInstruction ?? "",
    };
  };

  const getBusinessFromShop = () => {
    if (!shop) return null;
    const u = shopDetailsSource?.userDetails;
    const address = [u?.streetAddress, u?.province].filter(Boolean).join(", ") || "—";
    return {
      address: address || "—",
      email: u?.user?.email ?? biz?.email ?? "—",
      phone: u?.user?.phoneNum ?? biz?.phoneNum ?? "—",
    };
  };

  const customersData = orders.map((order, index) => {
    const driver = order?.driver;
    const deliveryDriver = order?.deliveryDriver;
    const services = order?.customerSelectedServices ?? [];
    const serviceNames = [
      ...new Set(
        services
          .map((s) => s?.service?.name || s?.category?.name)
          .filter(Boolean)
      ),
    ].join(", ");
    const pickupDt = order?.collectionDate
      ? dayjs(order.collectionDate).format("DD MMM YYYY") +
        (order?.collectionTimeFrom || order?.collectionTimeTo
          ? ` ${order.collectionTimeFrom || ""}-${order.collectionTimeTo || ""}`
          : "")
      : "—";
    const deliveryDt = order?.deliveryDate
      ? dayjs(order.deliveryDate).format("DD MMM YYYY") +
        (order?.deliveryTimeFrom || order?.deliveryTimeTo
          ? ` ${order.deliveryTimeFrom || ""}-${order.deliveryTimeTo || ""}`
          : "")
      : "—";
    const onHold = order?.onHoldReason || order?.OnHoldOtherReason ? "Yes" : "No";
    return {
      id: order?.id,
      sl: index + 1,
      orderId: order?.orderTrackId ?? order?.id,
      orderDateTime: order?.createdAt ? dayjs(order.createdAt).format(dateTimeFormat) : "—",
      serviceType: serviceNames || "—",
      totalItems: order?.totalItems ?? "—",
      pickupDateTime: pickupDt,
      deliveryDateTime: deliveryDt,
      onHold,
      pickupDriver: driver ? `${driver.firstName || ""} ${driver.lastName || ""}`.trim() || "—" : "—",
      deliveryDriver: deliveryDriver
        ? `${deliveryDriver.firstName || ""} ${deliveryDriver.lastName || ""}`.trim() || "—"
        : "—",
      shopName: shop?.shopName ?? "—",
      cost: order?.orderAmount ?? order?.billingDetail?.total ?? "—",
      OrderStatus: order?.bookingStatus?.title ?? "—",
      _order: order,
    };
  });

  const customerColumns = [
    { field: "sl", headerName: "SL", minWidth: 60 },
    { field: "orderId", headerName: "Order Id", minWidth: 120 },
    { field: "orderDateTime", headerName: "Order date & time", minWidth: 160 },
    { field: "serviceType", headerName: "Service type", minWidth: 170 },
    { field: "totalItems", headerName: "Total items", minWidth: 100 },
    { field: "pickupDateTime", headerName: "Pickup date/time", minWidth: 160 },
    { field: "deliveryDateTime", headerName: "Delivery Date/Time", minWidth: 160 },
    { field: "onHold", headerName: "On-hold", minWidth: 90 },
    { field: "pickupDriver", headerName: "Pickup Driver", minWidth: 130 },
    { field: "deliveryDriver", headerName: "Delivery driver", minWidth: 130 },
    { field: "shopName", headerName: "Shop Name", minWidth: 140 },
    { field: "cost", headerName: "Total cost", minWidth: 110 },
    { field: "OrderStatus", headerName: "Status", minWidth: 140 },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 140,
      sortable: false,
      renderCell: (row) => (
        <ActionButtons
          onView={() => setModalData({ open: true, data: { data: orderToInvoiceData(row._order), business: getBusinessFromShop() } })}
          showEdit={false}
          onDelete={() => setDeleteModal({ open: true, orderId: row.id })}
        />
      ),
    },
  ];

  const handleDateChange = (selectedRange) => {
    setDateRange(selectedRange);
  };

  const handleSearchChange = (searchTerm) => {
    setSearchTerm(searchTerm);
  };

  const handleFilter = () => {};

  const handleDownload = (data) => {
    console.log("Download customers data:", data);
  };

  const handleRowAction = (actionType, rowData) => {
    switch (actionType) {
      case "view":
        setModalData({
          open: true,
          data: { data: orderToInvoiceData(rowData?._order ?? rowData), business: getBusinessFromShop() },
        });
        break;
      case "delete":
        setDeleteModal({ open: true, orderId: rowData?.id });
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return <Delay />;
  }

  return (
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
                    {`${shopDetailsSource?.userDetails?.user?.firstName || ""} ${shopDetailsSource?.userDetails?.user?.lastName || ""}`}
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

                <div className="h-full w-auto flex flex-col justify-between items-center">
                  <div className="rounded-2xl">
                    <img
                      className="size-20 object-center"
                      src="/images/admin.png"
                      alt="customer image"
                    />
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
            <DeleteOrderModal
              open={deleteModal.open}
              orderId={deleteModal.orderId}
              onClose={() => setDeleteModal({ open: false, orderId: null })}
              onSuccess={() => refetch()}
            />
    </div>
  );
}
