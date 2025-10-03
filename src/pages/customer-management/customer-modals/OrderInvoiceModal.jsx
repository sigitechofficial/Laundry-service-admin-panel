import { Box, Typography, Divider } from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";

export default function OrderInvoiceModal({ open, data, setModalData }) {
  const handleClose = () => {
    setModalData({
      open: false,
      data: null,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Use actual data if available, otherwise use mock data
  const orderData = data?.data;
  const invoiceData = {
    invoiceNo: orderData?.invoiceNo || "1235258952",
    customer: {
      name: orderData?.customer?.name || "John Smith",
      customerId: orderData?.customer?.id || "003256",
      address: orderData?.customer?.address || "First Str, 28-32 Chicago, USA",
      email: orderData?.customer?.email || "@gmail.com",
      phone: orderData?.customer?.phone || "+92455655",
      date: orderData?.orderDate || "02/06/2025",
      driverInstruction: orderData?.driverInstruction || "collect",
    },
    delivery: {
      address: orderData?.deliveryAddress || "First Str, 28-32 Chicago, USA",
      pickupDate: orderData?.pickupDate || "02/06/2025",
      deliveryDate: orderData?.deliveryDate || "02/06/2025",
      driverInstruction: orderData?.deliveryInstruction || "collect",
    },
    charges: {
      minimumOrderFee: orderData?.charges?.minimumOrderFee || 35.0,
      serviceFee: orderData?.charges?.serviceFee || 1.25,
      driverTip: orderData?.charges?.driverTip || 2.0,
      total: orderData?.charges?.total || 38.25,
    },
    driverNote: orderData?.driverNote || "",
  };

  return (
    <ModalComponent
      open={open}
      title=""
      onClose={handleClose}
      width={800}
      secondaryAction={{
        label: "Close",
        onClick: handleClose,
      }}
      primaryAction={{
        label: "Print",
        onClick: handlePrint,
      }}
    >
      <Box
        className="bg-white p-6 space-y-6"
        sx={{
          "@media print": {
            padding: "1rem",
            margin: 0,
            boxShadow: "none",
            border: "none",
          },
        }}
      >
        {/* Header Section */}
        <Box className="flex justify-between items-start mb-6">
          <Box className="flex items-center gap-4">
            {/* Company Logo Placeholder */}
            <Box className="size-28 bg-gray-200 rounded-lg flex items-center justify-center">
              <Typography variant="h6" color="gray.500" fontFamily="Switzer">
                LOGO
              </Typography>
            </Box>
            <Box>
              <Typography
                variant="h4"
                fontSize={"32px"}
                fontWeight="700"
                fontFamily="SF Pro"
              >
                Customer Invoice
              </Typography>
              <Typography variant="body2" fontFamily="SF Pro">
                Business address
              </Typography>
              <Typography variant="body2" fontFamily="SF Pro">
                Phone Number
              </Typography>
              <Typography variant="body2" fontFamily="SF Pro">
                Email
              </Typography>
            </Box>
          </Box>
          <Box className="text-right">
            <Typography variant="h6" fontWeight="bold" fontFamily="Switzer">
              <Typography component={"span"} variant="body2">
                Invoice No:{" "}
              </Typography>
              {invoiceData.invoiceNo}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Customer & Delivery Information */}

        <Box className="flex gap-x-20 w-full">
          <Typography
            variant="h6"
            fontWeight="bold"
            fontFamily="Switzer"
            className="whitespace-nowrap"
            wra
          >
            Bill To:
          </Typography>

          <Box className="grid grid-cols-2 gap-8 w-full font-SF">
            <Box>
              <Box className="space-y-1">
                <Typography variant="body1" fontWeight={600}>
                  {invoiceData.customer.name}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Customer ID:</span>{" "}
                  {invoiceData.customer.customerId}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Address:</span>{" "}
                  {invoiceData.customer.address}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Email:</span>{" "}
                  {invoiceData.customer.email}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Phone Number:</span>{" "}
                  {invoiceData.customer.phone}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Date:</span>{" "}
                  {invoiceData.customer.date}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Driver Instruction:</span>{" "}
                  {invoiceData.customer.driverInstruction}
                </Typography>
              </Box>
            </Box>

            {/* Deliver To Section */}
            <Box>
              <Typography variant="h6" fontWeight="bold" className="mb-3">
                Deliver to:
              </Typography>

              <Box className="space-y-1">
                <Typography variant="body2">
                  {invoiceData.delivery.address}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Pickup Date:</span>{" "}
                  {invoiceData.delivery.pickupDate}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Delivery Date:</span>{" "}
                  {invoiceData.delivery.deliveryDate}
                </Typography>

                <Typography variant="body2">
                  <span className="font-semibold">Driver Instruction:</span>{" "}
                  {invoiceData.delivery.driverInstruction}
                </Typography>
              </Box>
            </Box>

            <Box className="mt-6 col-span-2">
              <Box className="min-h-[46px] border border-gray-200 rounded-lg p-3 mt-2 bg-gray-50 flex items-center !px-4 font-SF">
                <span className="text-grey40">Driver note : </span>
                <Typography variant="body2" fontFamily="Switzer">
                  {invoiceData.driverNote || ""}
                </Typography>
              </Box>
            </Box>

            <Box className="mt-8 col-span-2">
              <Box className="border border-gray-300">
                <Box className="flex items-center border-b border-gray-300">
                  <Box className="flex-1 !py-1 !px-2">
                    <Typography variant="body2" fontFamily="SF Pro">
                      Minimum Order Fee
                    </Typography>
                  </Box>
                  <Box className="w-32 !py-1 !px-2 border-l border-gray-300 text-right">
                    <Typography variant="body2" fontFamily="SF Pro">
                      ${invoiceData.charges.minimumOrderFee.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>

                <Box className="flex items-center border-b border-gray-300">
                  <Box className="flex-1 !py-1 !px-2">
                    <Typography variant="body2" fontFamily="SF Pro">
                      Service Fee
                    </Typography>
                  </Box>
                  <Box className="w-32 !py-1 !px-2 border-l border-gray-300 text-right">
                    <Typography variant="body2" fontFamily="SF Pro">
                      ${invoiceData.charges.serviceFee.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>

                <Box className="flex items-center border-b border-gray-300">
                  <Box className="flex-1 !py-1 !px-2">
                    <Typography variant="body2" fontFamily="SF Pro">
                      Driver Tip
                    </Typography>
                  </Box>
                  <Box className="w-32 !py-1 !px-2 border-l border-gray-300 text-right">
                    <Typography variant="body2" fontFamily="SF Pro">
                      ${invoiceData?.charges?.driverTip?.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>

                {/* Total */}
                <Box className="flex items-center">
                  <Box className="flex-1 !py-1 !px-2">
                    <Typography variant="h6" fontWeight="bold">
                      Total
                    </Typography>
                  </Box>
                  <Box className="w-32 !py-1 !px-2 border-l border-gray-300 text-right">
                    <Typography variant="h6" fontWeight="bold">
                      ${invoiceData?.charges?.total?.toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </ModalComponent>
  );
}
