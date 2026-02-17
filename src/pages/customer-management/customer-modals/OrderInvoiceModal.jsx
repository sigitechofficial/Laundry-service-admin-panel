import { Box, Typography, Divider } from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";

function InvoiceRow({ label, value, wrap }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={wrap ? { wordBreak: "break-word" } : undefined}
      >
        {value || "—"}
      </Typography>
    </Box>
  );
}

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

  // Use passed order data (from ShopDetail / order list); support both { data: payload } and { data: { data: payload } }
  const orderData = data?.data?.data ?? data?.data;
  const businessData = data?.data?.business;
  const num = (v) => (v != null && v !== "" ? Number(v) : 0);
  const invoiceData = {
    invoiceNo: orderData?.invoiceNo ?? "—",
    customer: {
      name: orderData?.customer?.name ?? "—",
      customerId: orderData?.customer?.id ?? "—",
      address: orderData?.customer?.address ?? "—",
      email: orderData?.customer?.email ?? "—",
      phone: orderData?.customer?.phone ?? "—",
      date: orderData?.customer?.date ?? orderData?.orderDate ?? "—",
      driverInstruction: orderData?.customer?.driverInstruction ?? "—",
    },
    delivery: {
      address: orderData?.deliveryAddress ?? "—",
      pickupDate: orderData?.pickupDate ?? "—",
      deliveryDate: orderData?.deliveryDate ?? "—",
      driverInstruction: orderData?.deliveryInstruction ?? "—",
    },
    charges: {
      minimumOrderFee: num(orderData?.charges?.minimumOrderFee),
      serviceFee: num(orderData?.charges?.serviceFee),
      driverTip: num(orderData?.charges?.driverTip),
      total: num(orderData?.charges?.total),
    },
    driverNote: orderData?.driverNote ?? "",
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
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  fontFamily: "Switzer, sans-serif",
                  letterSpacing: "-0.02em",
                }}
              >
                Customer Invoice
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: "text.secondary" }}>
                {businessData?.address ?? "—"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {businessData?.phone ?? "—"}
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                {businessData?.email ?? "—"}
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

        {/* Customer & Delivery Information - two equal columns */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 3,
            width: "100%",
            "& > *": { minWidth: 0 },
          }}
        >
          {/* Bill To */}
          <Box
            sx={{
              pr: 2,
              borderRight: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle1"
              fontWeight={700}
              fontFamily="Switzer"
              sx={{ mb: 1.5 }}
            >
              Bill To
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body1" fontWeight={600}>
                {invoiceData.customer.name}
              </Typography>
              <InvoiceRow label="Customer ID" value={String(invoiceData.customer.customerId)} />
              <InvoiceRow label="Address" value={invoiceData.customer.address} wrap />
              <InvoiceRow label="Email" value={invoiceData.customer.email} />
              <InvoiceRow label="Phone" value={invoiceData.customer.phone} />
              <InvoiceRow label="Date" value={invoiceData.customer.date} />
              <InvoiceRow label="Driver instruction" value={invoiceData.customer.driverInstruction} wrap />
            </Box>
          </Box>

          {/* Deliver To */}
          <Box sx={{ pl: 1 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              fontFamily="Switzer"
              sx={{ mb: 1.5 }}
            >
              Deliver to
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
                {invoiceData.delivery.address}
              </Typography>
              <InvoiceRow label="Pickup date" value={invoiceData.delivery.pickupDate} />
              <InvoiceRow label="Delivery date" value={invoiceData.delivery.deliveryDate} />
              <InvoiceRow label="Driver instruction" value={invoiceData.delivery.driverInstruction} wrap />
            </Box>
          </Box>
        </Box>

        {/* Driver note - full width */}
        <Box sx={{ mt: 3 }}>
          <Box
            sx={{
              minHeight: 46,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 1,
              p: 1.5,
              bgcolor: "grey.50",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              Driver note
            </Typography>
            <Typography variant="body2" fontFamily="Switzer" sx={{ wordBreak: "break-word" }}>
              {invoiceData.driverNote || "—"}
            </Typography>
          </Box>
        </Box>

        {/* Charges table - full width */}
        <Box sx={{ mt: 3 }}>
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
                      ${(invoiceData.charges.driverTip ?? 0).toFixed(2)}
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
                      ${(invoiceData.charges.total ?? 0).toFixed(2)}
                    </Typography>
                  </Box>
                </Box>
              </Box>
        </Box>
      </Box>
    </ModalComponent>
  );
}
