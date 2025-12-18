import { useState } from "react";
import { Box, Typography, Divider, Button, Link, IconButton } from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";
import { useGetOrderForEditQuery, useGetOrderItemsSheetQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import { TbChevronRight, TbX, TbFileDownload, TbChevronDown, TbChevronLeft } from "../../../shared/icons/index";
import { BASE_URL } from "../../../utilities/URL";

export default function OrderDetailsModal({ open, orderId, onClose }) {
  const [showOrderItems, setShowOrderItems] = useState(false);
  const [showProofSection, setShowProofSection] = useState(false);
  const [proofType, setProofType] = useState(null); // 'collection' or 'delivery'
  
  const { data: orderResponse, isLoading } = useGetOrderForEditQuery(orderId, {
    skip: !orderId || !open,
  });

  const orderData = orderResponse?.data;
  const bookingId = orderData?.id || orderId;

  const { data: orderItemsResponse, isLoading: isLoadingOrderItems } = useGetOrderItemsSheetQuery(bookingId, {
    skip: !bookingId || !showOrderItems || !open,
  });

  const orderItemsData = orderItemsResponse?.data;

  const handleClose = () => {
    setShowOrderItems(false);
    setShowProofSection(false);
    setProofType(null);
    onClose();
  };

  const handleOpenProof = (type) => {
    setProofType(type);
    setShowProofSection(true);
  };

  const handleCloseProof = () => {
    setShowProofSection(false);
    setProofType(null);
  };

  const handleToggleOrderItems = () => {
    setShowOrderItems(!showOrderItems);
  };

  const handleDownloadReceipt = () => {
    // TODO: Implement download receipt functionality
    console.log("Download receipt");
  };

  const handleEditReceipt = () => {
    // TODO: Implement edit receipt functionality
    console.log("Edit receipt");
  };

  const handleSendReceipt = () => {
    // TODO: Implement send receipt functionality
    console.log("Send receipt to email");
  };

  const handleRescheduleDelivery = () => {
    // TODO: Implement reschedule delivery functionality
    console.log("Reschedule delivery");
  };

  // Get button config based on order status
  const getButtonConfig = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("completed") || statusLower.includes("complete")) {
      return {
        text: "Send receipt to email",
        onClick: handleSendReceipt,
        bgColor: "#55ACEE1A",
        hoverColor: "#55ACEE33",
        color: "#55ACEE",
      };
    } else if (statusLower.includes("pending") || statusLower.includes("in process") || statusLower.includes("inprocess")) {
      return {
        text: "Reschedule Delivery",
        onClick: handleRescheduleDelivery,
        bgColor: "#55ACEE1A",
        hoverColor: "#55ACEE33",
        color: "#55ACEE",
      };
    } else if (statusLower.includes("cancelled") || statusLower.includes("cancel")) {
      return {
        text: "View Details",
        onClick: handleSendReceipt,
        bgColor: "#55ACEE1A",
        hoverColor: "#55ACEE33",
        color: "#55ACEE",
      };
    } else if (statusLower.includes("hold")) {
      return {
        text: "Reschedule Delivery",
        onClick: handleRescheduleDelivery,
        bgColor: "#55ACEE1A",
        hoverColor: "#55ACEE33",
        color: "#55ACEE",
      };
    }
    // Default button
    return {
      text: "Send receipt to email",
      onClick: handleSendReceipt,
      bgColor: "#55ACEE1A",
      hoverColor: "#55ACEE33",
      color: "#55ACEE",
    };
  };

  // Get status badge color based on order status
  const getStatusBadge = (status) => {
    const statusLower = status?.toLowerCase() || "";
    if (statusLower.includes("completed") || statusLower.includes("complete")) {
      return {
        bgColor: "#D1FAE5",
        textColor: "#065F46",
        label: "Completed",
      };
    } else if (statusLower.includes("pending")) {
      return {
        bgColor: "#FEF3C7",
        textColor: "#92400E",
        label: "Pending",
      };
    } else if (statusLower.includes("cancelled") || statusLower.includes("cancel")) {
      return {
        bgColor: "#FEE2E2",
        textColor: "#991B1B",
        label: "Cancelled",
      };
    } else if (statusLower.includes("hold")) {
      return {
        bgColor: "#FEF3C7",
        textColor: "#92400E",
        label: "On Hold",
      };
    }
    return {
      bgColor: "#E5E7EB",
      textColor: "#374151",
      label: status || "Unknown",
    };
  };

  const statusBadge = getStatusBadge(orderData?.bookingStatus?.title);
  const buttonConfig = getButtonConfig(orderData?.bookingStatus?.title);

  // Format date and time
  const formatDateTime = (date, timeFrom, timeTo) => {
    if (!date) return "N/A";
    const formattedDate = dayjs(date).format("ddd DD MMM");
    if (timeFrom && timeTo) {
      return `${formattedDate}, ${timeFrom} - ${timeTo}`;
    }
    return formattedDate;
  };

  // Format full address
  const formatAddress = (address) => {
    if (!address) return "N/A";
    const parts = [
      address.streetAddress,
      address.district,
      address.province,
    ].filter(Boolean);
    return parts.join(", ") || "N/A";
  };

  if (!open) return null;

  // If showing proof section, render only that section
  if (showProofSection && orderData) {
    const proofs = orderData.proofOfDeliveries?.filter(
      (proof) => proof.deliveryType === (proofType === 'collection' ? 'pickUp' : 'delivery')
    ) || [];
    const totalItems = proofs.reduce((sum, proof) => sum + (proof.noOfItems || 0), 0);

    return (
      <ModalComponent
        open={open}
        title=""
        onClose={handleClose}
        width={700}
        hideActions={true}
        hideHeader={true}
      >
        <Box
          sx={{
            bgcolor: "#FFFFFF",
            minHeight: "400px",
            p: 0,
          }}
        >
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 4,
            }}
          >
            <IconButton
              onClick={handleCloseProof}
              sx={{
                padding: "4px",
                color: "#000000",
                "&:hover": {
                  bgcolor: "transparent",
                },
              }}
            >
              <TbChevronLeft size={20} />
            </IconButton>
            <Typography
              variant="h6"
              fontWeight="bold"
              fontFamily="Switzer"
              sx={{ 
                fontSize: "18px",
                fontWeight: 700,
                color: "#000000",
                letterSpacing: 0,
              }}
            >
              {proofType === 'collection' ? 'Proof of Pickup' : 'Proof of Delivery'}
            </Typography>
            <IconButton
              onClick={handleClose}
              sx={{
                padding: "4px",
                color: "#000000",
                "&:hover": {
                  bgcolor: "transparent",
                },
              }}
            >
              <TbX size={20} />
            </IconButton>
          </Box>

          {/* Total Items Count */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              fontWeight="bold"
              fontFamily="Switzer"
              sx={{ mb: 1, fontSize: "16px", color: "#000000" }}
            >
              Total Items Count
            </Typography>
            <Typography
              variant="body1"
              fontFamily="Switzer"
              sx={{ fontSize: "14px", color: "#000000" }}
            >
              {totalItems} items
            </Typography>
          </Box>

          {/* Images Proof */}
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              fontWeight="bold"
              fontFamily="Switzer"
              sx={{ mb: 2, fontSize: "16px", color: "#000000" }}
            >
              Images Proof of {proofType === 'collection' ? 'Pickup' : 'Delivery'}
            </Typography>
            {proofs.length > 0 ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 2,
                }}
              >
                {proofs.map((proof, index) => (
                  <Box
                    key={proof.id || index}
                    sx={{
                      width: "100%",
                      aspectRatio: "1",
                      borderRadius: "8px",
                      overflow: "hidden",
                      bgcolor: "#F3F4F6",
                    }}
                  >
                    <img
                      src={`${BASE_URL}${proof.imgUpload}`}
                      alt={`Proof ${index + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography
                variant="body2"
                fontFamily="Switzer"
                sx={{ fontSize: "14px", color: "#6B7280" }}
              >
                No images available
              </Typography>
            )}
          </Box>

          {/* Note */}
          {proofs.length > 0 && proofs.some((proof) => proof.note) && (
            <Box>
              <Typography
                variant="h6"
                fontWeight="bold"
                fontFamily="Switzer"
                sx={{ mb: 1, fontSize: "16px", color: "#000000" }}
              >
                Note
              </Typography>
              {proofs.map((proof, index) => (
                proof.note && (
                  <Typography
                    key={proof.id || index}
                    variant="body1"
                    fontFamily="Switzer"
                    sx={{ fontSize: "14px", color: "#000000", mb: 1 }}
                  >
                    {proof.note}
                  </Typography>
                )
              ))}
          </Box>
        )}
        </Box>
      </ModalComponent>
    );
  }

  // If showing order items, render only that section
  if (showOrderItems) {
    return (
      <ModalComponent
        open={open}
        title=""
        onClose={handleClose}
        width={700}
        hideActions={true}
        hideHeader={true}
      >
        {isLoadingOrderItems ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Delay />
          </Box>
        ) : orderItemsData?.customerServices ? (
          <Box
            sx={{
              bgcolor: "#FFFFFF",
              minHeight: "400px",
              p: 0,
            }}
          >
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 4,
              }}
            >
              <IconButton
                onClick={handleToggleOrderItems}
                sx={{
                  padding: "4px",
                  color: "#000000",
                  "&:hover": {
                    bgcolor: "transparent",
                  },
                }}
              >
                <TbChevronLeft size={20} />
              </IconButton>
              <Typography
                variant="h6"
                fontWeight="bold"
                fontFamily="Switzer"
                sx={{ 
                  fontSize: "18px",
                  fontWeight: 700,
                  color: "#000000",
                  letterSpacing: 0,
                }}
              >
                Your Items
              </Typography>
              <IconButton
                onClick={handleClose}
                sx={{
                  padding: "4px",
                  color: "#000000",
                  "&:hover": {
                    bgcolor: "transparent",
                  },
                }}
              >
                <TbX size={20} />
              </IconButton>
            </Box>

            {/* Services List - Flatten categories to show items directly under services */}
            <Box sx={{ mb: 4 }}>
              {orderItemsData.customerServices.map((service, serviceIndex) => {
                // Collect all items from all categories in this service
                const allItems = [];
                service.categories?.forEach((category) => {
                  category.subCategories?.forEach((subCategory) => {
                    allItems.push({
                      ...subCategory,
                      categoryName: category.name,
                    });
                  });
                });

                // Group items by name to show quantity
                const itemGroups = {};
                allItems.forEach((item) => {
                  const key = item.name;
                  if (!itemGroups[key]) {
                    itemGroups[key] = {
                      name: item.name,
                      price: item.price,
                      count: 0,
                    };
                  }
                  itemGroups[key].count += 1;
                });

                return (
                  <Box key={service.serviceId || serviceIndex} sx={{ mb: 3 }}>
                    {/* Service Name */}
                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      fontFamily="Switzer"
                      sx={{ 
                        mb: 2, 
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "#000000",
                      }}
                    >
                      {service.serviceName}:
                    </Typography>

                    {/* Items directly under service */}
                    {Object.values(itemGroups).map((item, itemIndex) => (
                      <Box
                        key={`${item.name}-${itemIndex}`}
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          py: 0.75,
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontFamily="Switzer"
                          sx={{ 
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#000000",
                          }}
                        >
                          {item.count} x {item.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontFamily="Switzer"
                          sx={{ 
                            fontSize: "14px",
                            fontWeight: 400,
                            color: "#000000",
                          }}
                        >
                          ${parseFloat(item.price || 0).toFixed(2)}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                );
              })}
            </Box>

            {/* Summary Section */}
            <Box sx={{ mt: 4, pt: 3, borderTop: "1px solid #E5E7EB" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography 
                  variant="body2" 
                  fontFamily="Switzer" 
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  Subtotal:
                </Typography>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 700,
                    color: "#000000",
                  }}
                >
                  $ {parseFloat(orderItemsData.totalAmount || 0).toFixed(2)}
                </Typography>
              </Box>
              
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography 
                  variant="body2" 
                  fontFamily="Switzer" 
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  Minimum order fee:
                </Typography>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  -(0.00)
                </Typography>
              </Box>
              
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography 
                  variant="body2" 
                  fontFamily="Switzer" 
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  Service charge:
                </Typography>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  -(0.00)
                </Typography>
              </Box>
              
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 1.5,
                }}
              >
                <Typography 
                  variant="body2" 
                  fontFamily="Switzer" 
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  Delivery Fee:
                </Typography>
                <Typography 
                  variant="body2" 
                  fontFamily="Switzer" 
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  $0.00
                </Typography>
              </Box>
              
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography 
                  variant="body2" 
                  fontFamily="Switzer" 
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  Driver tip:
                </Typography>
                <Typography 
                  variant="body2" 
                  fontFamily="Switzer" 
                  sx={{ 
                    fontSize: "14px",
                    fontWeight: 400,
                    color: "#000000",
                  }}
                >
                  $0.00
                </Typography>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  pt: 2,
                  borderTop: "1px solid #E5E7EB",
                }}
              >
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  fontFamily="Switzer"
                  sx={{ 
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#000000",
                  }}
                >
                  Total:
                </Typography>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  fontFamily="Switzer"
                  sx={{ 
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "#000000",
                  }}
                >
                  ${parseFloat(orderItemsData.totalAmount || 0).toFixed(2)}
                </Typography>
              </Box>
            </Box>

            {/* Action Buttons - Text Links */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 4,
                pt: 3,
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <Link
                component="button"
                onClick={handleDownloadReceipt}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  color: "#3B82F6",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 400,
                  fontFamily: "Switzer",
                  cursor: "pointer",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                <TbFileDownload size={18} />
                Download receipt
              </Link>
              <Link
                component="button"
                onClick={handleEditReceipt}
                sx={{
                  color: "#3B82F6",
                  textDecoration: "none",
                  fontSize: "14px",
                  fontWeight: 400,
                  fontFamily: "Switzer",
                  cursor: "pointer",
                  "&:hover": {
                    textDecoration: "underline",
                  },
                }}
              >
                Edit receipt
              </Link>
            </Box>
          </Box>
        ) : (
          <Box sx={{ p: 3, textAlign: "center" }}>
            <Typography variant="body2" fontFamily="Switzer" color="grey.600">
              No order items available
            </Typography>
          </Box>
        )}
      </ModalComponent>
    );
  }

  // Regular modal content
  return (
    <ModalComponent
      open={open}
      title=""
      onClose={handleClose}
      width={700}
      hideActions={true}
    >
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Delay />
        </Box>
      ) : orderData ? (
        <Box className="bg-white p-6 space-y-6">
          {/* Order ID Header with Status Badge */}
          <Box className="flex justify-between items-start mb-4">
            <Box>
              <Typography variant="h5" fontWeight="bold" fontFamily="Switzer" className="mb-2">
                Order ID: {orderData.orderTrackId || orderData.id}
              </Typography>
              <Box
                display="inline-block"
                sx={{
                  bgcolor: statusBadge.bgColor,
                  color: statusBadge.textColor,
                  px: 2,
                  py: 0.5,
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {statusBadge.label}
              </Box>
            </Box>
            <Link
              component="button"
              onClick={() => {
                // TODO: Implement track order functionality
                console.log("Track order");
              }}
              sx={{
                textDecoration: "none",
                color: "primary.main",
                cursor: "pointer",
                fontSize: "14px",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              Track your order
            </Link>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Shop Name */}
          <Box className="space-y-2">
            <Typography variant="body2" color="grey.600" fontFamily="Switzer" fontWeight={600}>
              Shop Name:
            </Typography>
            <Link
              component="button"
              onClick={() => {
                // TODO: Navigate to shop details
                console.log("Shop clicked");
              }}
              sx={{
                textDecoration: "underline",
                color: "inherit",
                cursor: "pointer",
                fontSize: "16px",
                "&:hover": {
                  color: "primary.main",
                },
              }}
            >
              {orderData.laundryShop?.name || "N/A"}
            </Link>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Collection Section */}
          <Box className="space-y-3">
            <Typography variant="h6" fontWeight="bold" fontFamily="Switzer">
              Collection:
            </Typography>
            <Box className="space-y-2">
              <Typography variant="body1" fontFamily="Switzer">
                {orderData.driverInstructionOptions || "N/A"}
              </Typography>
              {orderData.driver && (
                <Box>
                  <Typography variant="body2" color="grey.600" fontFamily="Switzer" component="span">
                    Collection Driver:{" "}
                  </Typography>
                  <Link
                    component="button"
                    onClick={() => {
                      // TODO: Navigate to driver details
                      console.log("Driver clicked");
                    }}
                    sx={{
                      textDecoration: "underline",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: "14px",
                      "&:hover": {
                        color: "primary.main",
                      },
                    }}
                  >
                    {orderData.driver.firstName} {orderData.driver.lastName}
                  </Link>
                </Box>
              )}
              <Box 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => handleOpenProof('collection')}
                sx={{
                  "&:hover": {
                    opacity: 0.7,
                  },
                }}
              >
                <Box className="flex items-center gap-2">
                  <Typography variant="body1" fontFamily="Switzer">
                    Proof of Collection
                  </Typography>
                  <TbChevronRight size={20} />
                </Box>
                <Typography variant="body2" color="grey.600" fontFamily="Switzer">
                  {formatDateTime(orderData.collectionDate, orderData.collectionTimeFrom, orderData.collectionTimeTo)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Delivery Section */}
          <Box className="space-y-3">
            <Typography variant="h6" fontWeight="bold" fontFamily="Switzer">
              Delivery:
            </Typography>
            <Box className="space-y-2">
              <Typography variant="body1" fontFamily="Switzer">
                {orderData.driverInstructionOptions1 || "N/A"}
              </Typography>
              {orderData.deliveryDriver ? (
                <Box>
                  <Typography variant="body2" color="grey.600" fontFamily="Switzer" component="span">
                    Delivery Driver:{" "}
                  </Typography>
                  <Link
                    component="button"
                    onClick={() => {
                      // TODO: Navigate to driver details
                      console.log("Delivery driver clicked");
                    }}
                    sx={{
                      textDecoration: "underline",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: "14px",
                      "&:hover": {
                        color: "primary.main",
                      },
                    }}
                  >
                    {orderData.deliveryDriver.firstName} {orderData.deliveryDriver.lastName}
                  </Link>
                </Box>
              ) : orderData.driver ? (
                <Box>
                  <Typography variant="body2" color="grey.600" fontFamily="Switzer" component="span">
                    Delivery Driver:{" "}
                  </Typography>
                  <Link
                    component="button"
                    onClick={() => {
                      // TODO: Navigate to driver details
                      console.log("Driver clicked");
                    }}
                    sx={{
                      textDecoration: "underline",
                      color: "inherit",
                      cursor: "pointer",
                      fontSize: "14px",
                      "&:hover": {
                        color: "primary.main",
                      },
                    }}
                  >
                    {orderData.driver.firstName} {orderData.driver.lastName}
                  </Link>
                </Box>
              ) : null}
              <Box 
                className="flex justify-between items-center cursor-pointer"
                onClick={() => handleOpenProof('delivery')}
                sx={{
                  "&:hover": {
                    opacity: 0.7,
                  },
                }}
              >
                <Box className="flex items-center gap-2">
                  <Typography variant="body1" fontFamily="Switzer">
                    Proof of Delivery
                  </Typography>
                  <TbChevronRight size={20} />
                </Box>
                <Typography variant="body2" color="grey.600" fontFamily="Switzer">
                  {formatDateTime(orderData.deliveryDate, orderData.deliveryTimeFrom, orderData.deliveryTimeTo)}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Address */}
          <Box className="space-y-2">
            <Typography variant="h6" fontWeight="bold" fontFamily="Switzer">
              Address:
            </Typography>
            <Typography variant="body1" fontFamily="Switzer">
              {formatAddress(orderData.pickupAddress || orderData.dropOffAddress)}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Driver Instruction */}
          <Box className="space-y-2">
            <Typography variant="h6" fontWeight="bold" fontFamily="Switzer">
              Driver Instruction:
            </Typography>
            <Typography variant="body1" fontFamily="Switzer">
              {orderData.driverInstruction || "N/A"}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Order frequency */}
          <Box className="space-y-2">
            <Typography variant="h6" fontWeight="bold" fontFamily="Switzer">
              Order frequency:
            </Typography>
            <Typography variant="body1" fontFamily="Switzer">
              {orderData.frequency || "N/A"}
            </Typography>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Order details */}
          <Box className="space-y-2">
            <Typography variant="h6" fontWeight="bold" fontFamily="Switzer">
              Order details:
            </Typography>
            <Box 
              className="flex justify-between items-center cursor-pointer"
              onClick={handleToggleOrderItems}
              sx={{
                "&:hover": {
                  opacity: 0.7,
                },
              }}
            >
              <Typography variant="body1" fontFamily="Switzer">
                {orderData.totalItems || 0} items
              </Typography>
              {showOrderItems ? (
                <TbChevronDown size={20} />
              ) : (
                <TbChevronRight size={20} />
              )}
            </Box>
          </Box>

          {/* Action button based on status - Fixed at bottom */}
          <Box 
            sx={{
              position: "sticky",
              bottom: 0,
              left: 0,
              right: 0,
              mt: 4,
              pt: 3,
              pb: 2,
              bgcolor: "white",
              zIndex: 10,
            }}
          >
            <Button
              fullWidth
              variant="contained"
              onClick={buttonConfig.onClick}
              sx={{
                bgcolor: buttonConfig.bgColor,
                color: buttonConfig.color,
                py: 1.5,
                textTransform: "none",
                fontSize: "16px",
                fontWeight: 500,
                borderRadius: "8px",
                boxShadow: "none",
                "&:hover": {
                  bgcolor: buttonConfig.hoverColor,
                  boxShadow: "none",
                },
              }}
            >
              {buttonConfig.text}
            </Button>
          </Box>
        </Box>
      ) : (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Typography variant="body1" fontFamily="Switzer">
            No order data available
          </Typography>
        </Box>
      )}
    </ModalComponent>
  );
}
