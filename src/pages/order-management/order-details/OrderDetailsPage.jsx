import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@mui/material";
import dayjs from "dayjs";
import { Delay } from "../../../components/shared/Loaders";
import {
  TbChevronLeft,
  TbChevronRight,
  TbFileDescription,
  MdOutlineStore,
} from "../../../shared/icons/index";
import {
  useGetOrderForEditQuery,
  useGetOrderItemsSheetQuery,
} from "../../../store/services/api";
import { BASE_URL } from "../../../utilities/URL";

const statusStyleMap = {
  completed: { bg: "#D1FAE5", color: "#065F46", label: "Completed" },
  pending: { bg: "#FEF3C7", color: "#92400E", label: "Pending" },
  cancelled: { bg: "#FEE2E2", color: "#991B1B", label: "Cancelled" },
  hold: { bg: "#FEF3C7", color: "#92400E", label: "On Hold" },
};

const CARD_SX = {
  borderRadius: "12px",
  border: "1px solid #E5E7EB",
  boxShadow: "0 1px 4px 0 rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.04)",
  overflow: "hidden",
};

const SECTION_HEADER_SX = {
  px: 2.5,
  py: 1.75,
  borderBottom: "1px solid #F1F5F9",
  bgcolor: "#FFFFFF",
};

function getStatusBadge(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("complete")) return statusStyleMap.completed;
  if (normalized.includes("pending")) return statusStyleMap.pending;
  if (normalized.includes("cancel")) return statusStyleMap.cancelled;
  if (normalized.includes("hold")) return statusStyleMap.hold;
  return { bg: "#E5E7EB", color: "#374151", label: status || "Unknown" };
}

function formatDateTime(date, timeFrom, timeTo, fallback = "N/A") {
  if (!date) return fallback;
  const formattedDate = dayjs(date).format("ddd DD MMM");
  if (timeFrom && timeTo) return `${formattedDate}, ${timeFrom} - ${timeTo}`;
  return formattedDate || fallback;
}

function formatAddress(address) {
  if (!address) return "N/A";
  const parts = [address.streetAddress, address.district, address.province].filter(
    Boolean
  );
  return parts.join(", ") || "N/A";
}

export default function OrderDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const orderId = Number(id);

  const { data: orderResponse, isLoading } = useGetOrderForEditQuery(orderId, {
    skip: !orderId,
  });
  const orderData = orderResponse?.data;
  const bookingId = orderData?.id || orderId;

  const { data: orderItemsResponse, isLoading: isLoadingItems } =
    useGetOrderItemsSheetQuery(bookingId, {
      skip: !bookingId,
    });

  const orderItemsData = orderItemsResponse?.data;
  const statusBadge = getStatusBadge(orderData?.bookingStatus?.title);

  const groupedItems = useMemo(() => {
    if (!orderItemsData?.customerServices) return [];
    return orderItemsData.customerServices.flatMap((service) => {
      const itemGroups = {};
      service.categories?.forEach((category) => {
        category.subCategories?.forEach((subCategory) => {
          const key = `${service.serviceName}-${subCategory.name}`;
          if (!itemGroups[key]) {
            itemGroups[key] = {
              serviceName: service.serviceName,
              name: subCategory.name,
              price: subCategory.price,
              count: 0,
              categoryName: category.name,
            };
          }
          itemGroups[key].count += 1;
        });
      });
      return Object.values(itemGroups);
    });
  }, [orderItemsData]);

  const pickupProofs =
    orderData?.proofOfDeliveries?.filter((p) => p.deliveryType === "pickUp") || [];
  const deliveryProofs =
    orderData?.proofOfDeliveries?.filter((p) => p.deliveryType === "delivery") || [];

  const pickupItemsCount = pickupProofs.reduce(
    (sum, proof) => sum + Number(proof?.noOfItems || 0),
    0
  );
  const deliveryItemsCount = deliveryProofs.reduce(
    (sum, proof) => sum + Number(proof?.noOfItems || 0),
    0
  );

  const orderTotal = parseFloat(
    orderItemsData?.totalAmount ?? orderData?.orderAmount ?? 0
  ).toFixed(2);

  const pickupPrimaryProof = pickupProofs[0] || {};
  const deliveryPrimaryProof = deliveryProofs[0] || {};
  const pickupProofTime = dayjs(
    pickupPrimaryProof?.created_at || orderData?.collectionDate
  ).isValid()
    ? dayjs(pickupPrimaryProof?.created_at || orderData?.collectionDate).format(
        "ddd DD MMM · HH:mm"
      )
    : "Not captured";
  const deliveryProofTime = dayjs(
    deliveryPrimaryProof?.created_at || orderData?.deliveryDate
  ).isValid()
    ? dayjs(deliveryPrimaryProof?.created_at || orderData?.deliveryDate).format(
        "ddd DD MMM · HH:mm"
      )
    : "Not captured";

  const activityRows = [
    {
      text: `Order ${statusBadge.label.toLowerCase()}`,
      time: formatDateTime(
        orderData?.deliveryDate,
        orderData?.deliveryTimeFrom,
        orderData?.deliveryTimeTo
      ),
    },
    {
      text: `Items collected (${pickupItemsCount || 0})`,
      time: formatDateTime(
        orderData?.collectionDate,
        orderData?.collectionTimeFrom,
        orderData?.collectionTimeTo
      ),
    },
    {
      text: "Order placed",
      time: dayjs(orderData?.created_at).isValid()
        ? dayjs(orderData?.created_at).format("ddd DD MMM · HH:mm")
        : `Order #${orderData?.orderTrackId || orderData?.id}`,
    },
  ];

  if (isLoading) return <Delay />;

  if (!orderData) {
    return (
      <Box className="space-y-6!">
        <Button
          startIcon={<TbChevronLeft size={18} />}
          onClick={() => navigate(-1)}
          sx={{ textTransform: "none" }}
        >
          Back
        </Button>
        <Paper sx={{ p: 4 }}>
          <Typography>No order data available</Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 1, width: "100%", display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Paper sx={{ ...CARD_SX, px: 3, py: 1.75 }}>
        <Box className="flex items-center justify-between gap-4 flex-wrap">
          <Box className="flex items-center gap-5">
            <Button
              startIcon={<TbChevronLeft size={14} />}
              onClick={() => navigate(-1)}
              sx={{
                textTransform: "none",
                color: "#94A3B8",
                fontSize: 14,
                fontWeight: 600,
                minWidth: "auto",
                p: 0,
                "&:hover": { bgcolor: "transparent", color: "#475569" },
              }}
            >
              Orders
            </Button>
            <Typography sx={{ fontSize: 14, color: "#94A3B8" }}>
              Orders /{" "}
              <Box component="span" sx={{ color: "#334155", fontWeight: 600 }}>
                #{orderData.orderTrackId || orderData.id}
              </Box>
            </Typography>
          </Box>
          <Box className="flex items-center gap-2.5">
            <Button
              variant="outlined"
              size="small"
              disabled={!orderId || orderId <= 1}
              onClick={() => navigate(`/orders/details/${orderId - 1}`)}
              sx={{
                minWidth: 32,
                px: 0.8,
                borderRadius: "8px",
                borderColor: "#E2E8F0",
                color: "#64748B",
              }}
            >
              <TbChevronLeft size={14} />
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!orderId}
              onClick={() => navigate(`/orders/details/${orderId + 1}`)}
              sx={{
                minWidth: 32,
                px: 0.8,
                borderRadius: "8px",
                borderColor: "#E2E8F0",
                color: "#64748B",
              }}
            >
              <TbChevronRight size={14} />
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{
                textTransform: "uppercase",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "#64748B",
                borderColor: "#E2E8F0",
                px: 1.5,
                py: 0.65,
                borderRadius: "8px",
              }}
            >
              Print Receipt
            </Button>
            <Button
              variant="outlined"
              size="small"
              sx={{
                textTransform: "uppercase",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "#64748B",
                borderColor: "#E2E8F0",
                px: 1.5,
                py: 0.65,
                borderRadius: "8px",
              }}
            >
              Reassign Driver
            </Button>
            <Button
              variant="contained"
              size="small"
              sx={{
                textTransform: "uppercase",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                color: "#FFFFFF",
                bgcolor: "#0000A0",
                px: 2,
                py: 0.65,
                borderRadius: "8px",
                "&:hover": { bgcolor: "#00007A" },
              }}
            >
              Edit Order
            </Button>
          </Box>
        </Box>
      </Paper>
      <Box className="grid grid-cols-1 xl:grid-cols-[1fr_304px] gap-5">
        <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
          <Paper sx={CARD_SX}>
            <Box sx={{ height: 4, background: "linear-gradient(90deg, #0000A0 0%, #3C49D6 55%, #A5B4FC 100%)" }} />
            <Box sx={{ p: 2.5 }}>
            <Box className="flex justify-between items-start gap-3 flex-wrap">
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, letterSpacing: "0.08em", fontWeight: 700, textTransform: "uppercase" }}
                >
                  Order ID
                </Typography>
                <Typography fontFamily="Switzer" fontWeight={700} sx={{ lineHeight: 1.05, fontSize: 32 }}>
                  #{orderData.orderTrackId || orderData.id}
                </Typography>
                <Box className="flex items-center gap-2">
                  <Box
                    sx={{
                      bgcolor: statusBadge.bg,
                      color: statusBadge.color,
                      px: 2,
                      minHeight: 26,
                      borderRadius: "999px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(0,0,0,0.08)",
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      sx={{ fontSize: 10, lineHeight: 1.1, display: "flex", alignItems: "center" }}
                    >
                      {statusBadge.label}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1.5,
                      minHeight: 26,
                      borderRadius: "4px",
                      bgcolor: "#EFF6FF",
                      color: "#2563EB",
                      border: "1px solid #BFDBFE",
                      display: "inline-flex",
                      alignItems: "center",
                    }}
                  >
                    <Typography variant="caption" sx={{ fontWeight: 700, fontSize: 10, lineHeight: 1.1 }}>
                      {orderData.frequency || "Just Once"}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Box
                className="flex items-stretch"
                sx={{ border: "1px solid #E2E8F0", borderRadius: "12px", overflow: "hidden" }}
              >
                <Box sx={{ px: 2.5, py: 1.75, borderRight: "1px solid #E2E8F0" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>
                    Total Items
                  </Typography>
                  <Typography sx={{ fontWeight: 700, mt: 0.4, fontSize: 17, color: "#334155" }}>
                    {orderData.totalItems || 0} items
                  </Typography>
                </Box>
                <Box sx={{ px: 2.5, py: 1.75 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: "uppercase", fontWeight: 700 }}>
                    Order Total
                  </Typography>
                  <Typography fontFamily="Switzer" fontWeight={700} color="#0000A0" sx={{ mt: 0.4, fontSize: 28, lineHeight: 1 }}>
                    ${orderTotal}
                  </Typography>
                </Box>
              </Box>
            </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#93C5FD" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Collection & Delivery
                </Typography>
              </Box>
            </Box>
            <Box className="grid grid-cols-1 md:grid-cols-2">
              <Box
                sx={{
                  p: 2.5,
                  borderRight: { md: "1px solid #E4E7EC" },
                  borderBottom: { xs: "1px solid #E4E7EC", md: "none" },
                }}
              >
                <Box className="flex items-center gap-2 mb-2">
                  <TbFileDescription size={16} color="#2563EB" />
                  <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10 }}>
                    COLLECTION
                  </Typography>
                </Box>
                <Typography fontFamily="Switzer" fontWeight={700} sx={{ fontSize: 16 }}>
                  {orderData.collectionTimeFrom || "N/A"} -{" "}
                  {orderData.collectionTimeTo || "N/A"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {dayjs(orderData.collectionDate).isValid()
                    ? dayjs(orderData.collectionDate).format("ddd DD MMM YYYY")
                    : "N/A"}
                </Typography>
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #EEF0F3" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Proof of Pickup
                  </Typography>
                  <Typography variant="caption" mt={0.5} display="block" sx={{ fontSize: 11 }}>
                    Items counted: {pickupItemsCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    Images: {pickupProofs.length || 0}
                  </Typography>
                  {pickupProofs.some((p) => p.note) && (
                    <Paper
                      sx={{ mt: 1, p: 1.2, bgcolor: "#FFFBEB", border: "1px solid #FDE68A" }}
                    >
                      <Typography variant="caption" color="#92400E">
                        Note: {pickupProofs.find((p) => p.note)?.note}
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Box>

              <Box sx={{ p: 2.5 }}>
                <Box className="flex items-center gap-2 mb-2">
                  <MdOutlineStore size={16} color="#059669" />
                  <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, fontSize: 10 }}>
                    DELIVERY
                  </Typography>
                </Box>
                <Typography fontFamily="Switzer" fontWeight={700} sx={{ fontSize: 16 }}>
                  {orderData.deliveryTimeFrom || "N/A"} -{" "}
                  {orderData.deliveryTimeTo || "N/A"}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                  {dayjs(orderData.deliveryDate).isValid()
                    ? dayjs(orderData.deliveryDate).format("ddd DD MMM YYYY")
                    : "N/A"}
                </Typography>
                <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #EEF0F3" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, fontSize: 10, textTransform: "uppercase" }}>
                    Proof of Delivery
                  </Typography>
                  <Typography variant="caption" mt={0.5} display="block" sx={{ fontSize: 11 }}>
                    Items counted: {deliveryItemsCount || 0}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                    Images: {deliveryProofs.length || 0}
                  </Typography>
                  {pickupItemsCount > deliveryItemsCount && (
                    <Paper
                      sx={{ mt: 1, p: 1.2, bgcolor: "#FEF2F2", border: "1px solid #FECACA" }}
                    >
                      <Typography variant="caption" color="#B91C1C">
                        Delivery item count is lower than pickup count.
                      </Typography>
                    </Paper>
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box
              sx={SECTION_HEADER_SX}
              className="flex items-center justify-between"
            >
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#A78BFA" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Proof of Collection & Delivery
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                {dayjs(orderData.collectionDate).isValid()
                  ? dayjs(orderData.collectionDate).format("ddd DD MMM")
                  : "N/A"}{" "}
                -{" "}
                {dayjs(orderData.deliveryDate).isValid()
                  ? dayjs(orderData.deliveryDate).format("ddd DD MMM")
                  : "N/A"}
              </Typography>
            </Box>

            <Box className="grid grid-cols-1 md:grid-cols-2">
              <Box
                sx={{
                  p: 2.5,
                  borderRight: { md: "1px solid #E4E7EC" },
                  borderBottom: { xs: "1px solid #E4E7EC", md: "none" },
                }}
              >
                <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10 }}>
                  PROOF OF PICKUP
                </Typography>
                <Box className="grid grid-cols-3 gap-2 mt-2">
                  {pickupProofs.length ? (
                    pickupProofs.slice(0, 3).map((proof, idx) => (
                      <Box
                        key={proof.id || idx}
                        className="aspect-square rounded-md overflow-hidden bg-[#F3F4F6]"
                      >
                        <img
                          src={`${BASE_URL}${proof.imgUpload}`}
                          alt={`pickup-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </Box>
                    ))
                  ) : (
                    <Paper
                      sx={{
                        p: 1.8,
                        gridColumn: "1 / -1",
                        textAlign: "left",
                        bgcolor: "#F8FAFC",
                        border: "1px dashed #E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "none",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        No images attached
                      </Typography>
                    </Paper>
                  )}
                </Box>
                <Box sx={{ mt: 2 }} className="space-y-0">
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Items Collected</Typography>
                    <Typography sx={{ fontSize: 11, color: "#334155", fontWeight: 600 }}>
                      {pickupItemsCount || 0} items
                    </Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Driver Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Customer Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Timestamp</Typography>
                    <Typography sx={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{pickupProofTime}</Typography>
                  </Box>
                </Box>
                {pickupProofs.some((p) => p.note) && (
                  <Paper
                    sx={{
                      mt: 1.5,
                      p: 1.4,
                      bgcolor: "#FFFBEB",
                      border: "1px solid #FDE68A",
                      borderRadius: "8px",
                      boxShadow: "none",
                    }}
                  >
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#D97706", textTransform: "uppercase", mb: 0.6 }}>
                      Driver Note
                    </Typography>
                    <Typography sx={{ fontSize: 13, color: "#334155" }}>
                      {pickupProofs.find((p) => p.note)?.note}
                    </Typography>
                  </Paper>
                )}
              </Box>

              <Box sx={{ p: 2.5 }}>
                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, fontSize: 10 }}>
                  PROOF OF DELIVERY
                </Typography>
                <Box className="grid grid-cols-3 gap-2 mt-2">
                  {deliveryProofs.length ? (
                    deliveryProofs.slice(0, 3).map((proof, idx) => (
                      <Box
                        key={proof.id || idx}
                        className="aspect-square rounded-md overflow-hidden bg-[#F3F4F6]"
                      >
                        <img
                          src={`${BASE_URL}${proof.imgUpload}`}
                          alt={`delivery-${idx}`}
                          className="w-full h-full object-cover"
                        />
                      </Box>
                    ))
                  ) : (
                    <Paper
                      sx={{
                        p: 1.8,
                        gridColumn: "1 / -1",
                        textAlign: "left",
                        bgcolor: "#F8FAFC",
                        border: "1px dashed #E2E8F0",
                        borderRadius: "12px",
                        boxShadow: "none",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                        No images available
                      </Typography>
                    </Paper>
                  )}
                </Box>
                <Box sx={{ mt: 2 }} className="space-y-0">
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Items Delivered</Typography>
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: deliveryItemsCount > 0 ? "#334155" : "#EF4444",
                        fontWeight: 600,
                      }}
                    >
                      {deliveryItemsCount || 0} items
                    </Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Driver Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Customer Signature</Typography>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Not captured</Typography>
                  </Box>
                  <Box className="flex items-center justify-between py-2" sx={{ borderTop: "1px solid #F1F5F9" }}>
                    <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Timestamp</Typography>
                    <Typography sx={{ fontSize: 11, color: "#334155", fontWeight: 500 }}>{deliveryProofTime}</Typography>
                  </Box>
                </Box>
                {pickupItemsCount > deliveryItemsCount && (
                  <Paper
                    sx={{
                      mt: 1.5,
                      p: 1.4,
                      bgcolor: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: "8px",
                      boxShadow: "none",
                    }}
                  >
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: "#EF4444", textTransform: "uppercase", mb: 0.6 }}>
                      Alert
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#475569", lineHeight: 1.4 }}>
                      {deliveryItemsCount || 0} items recorded at delivery. Possible mismatch with
                      pickup count of {pickupItemsCount || 0}.
                    </Typography>
                  </Paper>
                )}
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box
              sx={SECTION_HEADER_SX}
              className="flex items-center justify-between"
            >
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#34D399" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Order Items
                </Typography>
              </Box>
              <Box
                sx={{
                  px: 1.4,
                  minHeight: 30,
                  borderRadius: "6px",
                  bgcolor: "#ECFDF3",
                  border: "1px solid #86EFAC",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  variant="caption"
                  color="#15803D"
                  sx={{ fontWeight: 700, fontSize: 11, lineHeight: 1.1, display: "flex", alignItems: "center" }}
                >
                  {groupedItems[0]?.serviceName || "Service"}
                </Typography>
              </Box>
            </Box>

            <Table
              size="small"
              sx={{
                "& .MuiTableCell-root": {
                  borderColor: "#EEF2F6",
                  py: 1.25,
                  fontSize: 12,
                },
              }}
            >
              <TableHead>
                <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                  <TableCell sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8" }}>Item</TableCell>
                  <TableCell width={90} sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8" }}>Qty</TableCell>
                  <TableCell align="right" width={130}>
                    <Typography component="span" sx={{ fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", color: "#94A3B8" }}>Price</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedItems.length ? (
                  groupedItems.map((item, idx) => (
                    <TableRow key={`${item.serviceName}-${item.name}-${idx}`}>
                      <TableCell>
                        <Typography variant="body2">{item.name}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.categoryName || item.serviceName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "4px",
                            border: "1px solid #E5E7EB",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Typography variant="caption">{item.count}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell align="right">
                        ${parseFloat(item.price || 0).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: 15, py: 0.6 }}>
                        {isLoadingItems ? "Loading items..." : "No order items available"}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <Box sx={{ p: 2.5, borderTop: "1px solid #E4E7EC", bgcolor: "#FCFCFD" }}>
              <Box className="flex justify-between py-1">
                <Typography variant="body2" color="text.secondary">
                  Subtotal
                </Typography>
                <Typography variant="body2">${orderTotal}</Typography>
              </Box>
              <Box className="flex justify-between py-1">
                <Typography variant="body2" color="text.secondary">
                  Minimum Order Fee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  —
                </Typography>
              </Box>
              <Box className="flex justify-between py-1">
                <Typography variant="body2" color="text.secondary">
                  Service Charge
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  —
                </Typography>
              </Box>
              <Box className="flex justify-between py-1">
                <Typography variant="body2" color="text.secondary">
                  Delivery Fee
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  $0.00
                </Typography>
              </Box>
              <Box className="flex justify-between py-1">
                <Typography variant="body2" color="text.secondary">
                  Driver Tip
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  $0.00
                </Typography>
              </Box>
              <Box className="flex justify-between pt-2 mt-2" sx={{ borderTop: "1px solid #E4E7EC" }}>
                <Typography fontFamily="Switzer" fontWeight={700}>
                  Total
                </Typography>
                <Typography fontFamily="Switzer" fontWeight={700} color="primary.main">
                  ${orderTotal}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#C4B5FD" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Shop
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-3">
              <Box className="flex justify-between gap-3">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}
                >
                  Shop Name
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#475569" }} textAlign="right">
                  {orderData?.laundryShop?.name || "Not assigned"}
                </Typography>
              </Box>
              <Box className="flex justify-between gap-3">
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}
                >
                  Frequency
                </Typography>
                <Typography sx={{ fontSize: 13, fontWeight: 500, color: "#475569" }} textAlign="right">
                  {orderData?.frequency || "Just Once"}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#60A5FA" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Delivery Address
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-3">
              <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10 }}>
                DELIVERY LOCATION
              </Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.45 }}>
                {formatAddress(orderData.pickupAddress || orderData.dropOffAddress)}
              </Typography>
              <Box className="flex justify-between gap-3">
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, textTransform: "uppercase" }}>
                  Instructions
                </Typography>
                <Typography variant="caption" textAlign="right">
                  {orderData?.driverInstruction || "N/A"}
                </Typography>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#FBBF24" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Drivers
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-3">
              <Box>
                <Typography variant="caption" sx={{ color: "#2563EB", fontWeight: 700, fontSize: 10 }}>
                  COLLECTION DRIVER
                </Typography>
                <Box className="flex items-center gap-2.5 mt-2">
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "999px",
                      bgcolor: "#F1F5F9",
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 14,
                      color: orderData?.driver ? "#334155" : "#94A3B8",
                      fontStyle: orderData?.driver ? "normal" : "italic",
                    }}
                  >
                    {orderData?.driver
                      ? `${orderData.driver.firstName} ${orderData.driver.lastName}`
                      : "Unassigned"}
                  </Typography>
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: "#059669", fontWeight: 700, fontSize: 10 }}>
                  DELIVERY DRIVER
                </Typography>
                <Box className="flex items-center gap-2.5 mt-2">
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "999px",
                      bgcolor: "#F1F5F9",
                      border: "1px solid #E2E8F0",
                    }}
                  />
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 14,
                      color:
                        orderData?.deliveryDriver || orderData?.driver ? "#334155" : "#94A3B8",
                      fontStyle:
                        orderData?.deliveryDriver || orderData?.driver ? "normal" : "italic",
                    }}
                  >
                    {orderData?.deliveryDriver
                      ? `${orderData.deliveryDriver.firstName} ${orderData.deliveryDriver.lastName}`
                      : orderData?.driver
                        ? `${orderData.driver.firstName} ${orderData.driver.lastName}`
                        : "Unassigned"}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#D1D5DB" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Activity
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2.5 }} className="space-y-4">
              {activityRows.map((activity, idx) => (
                <Box key={idx} className="flex gap-3 items-start">
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", mt: "3px" }}>
                    <Box
                      sx={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        bgcolor: idx === 0 ? "#4ADE80" : idx === 1 ? "#60A5FA" : "#CBD5E1",
                        flexShrink: 0,
                      }}
                    />
                    {idx < activityRows.length - 1 && (
                      <Box sx={{ width: 1, height: 28, bgcolor: "#E2E8F0", mt: 1 }} />
                    )}
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                      {activity.text}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                      {activity.time}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Paper>

          <Paper sx={CARD_SX}>
            <Box sx={SECTION_HEADER_SX}>
              <Box className="flex items-center gap-1.5">
                <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#D1D5DB" }} />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}
                >
                  Quick Actions
                </Typography>
              </Box>
            </Box>
            <Box sx={{ p: 2, display: "flex", flexDirection: "column", rowGap: 1.25 }}>
              <Button
                fullWidth
                variant="contained"
                size="small"
                sx={{
                  textTransform: "uppercase",
                  fontSize: 11,
                  fontWeight: 700,
                  borderRadius: "8px",
                  minHeight: 36,
                  bgcolor: "#0000A0",
                  color: "#FFFFFF",
                  "&:hover": { bgcolor: "#00007A" },
                }}
              >
                Edit Order
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                sx={{ textTransform: "uppercase", fontSize: 11, fontWeight: 700, borderRadius: "8px", minHeight: 36 }}
              >
                Print Receipt
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                sx={{ textTransform: "uppercase", fontSize: 11, fontWeight: 700, borderRadius: "8px", minHeight: 36 }}
              >
                Reassign Driver
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                color="error"
                sx={{ textTransform: "uppercase", fontSize: 11, fontWeight: 700, borderRadius: "8px", minHeight: 36 }}
              >
                Cancel Order
              </Button>
            </Box>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}

