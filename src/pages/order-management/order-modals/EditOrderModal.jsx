import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import ModalComponent from "../../../components/shared/Modal";
import { useGetOrderForEditQuery } from "../../../store/services/api";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import { TbX, TbCalendar } from "../../../shared/icons/index";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import InputFieldBordered from "../../../components/ui/InputFieldBordered";

export default function EditOrderModal({ open, orderId, onClose }) {
  const { data: orderResponse, isLoading } = useGetOrderForEditQuery(orderId, {
    skip: !orderId || !open,
  });

  const orderData = orderResponse?.data;

  const [formData, setFormData] = useState({
    orderNumber: "",
    orderDate: null,
    orderTime: null,
    pickupDate: null,
    pickupTime: null,
    deliveryDate: null,
    deliveryTime: null,
  });

  useEffect(() => {
    if (orderData) {
      setFormData({
        orderNumber: orderData.orderTrackId || orderData.id || "",
        orderDate: orderData.createdAt ? dayjs(orderData.createdAt) : null,
        orderTime: orderData.createdAt ? dayjs(orderData.createdAt) : null,
        pickupDate: orderData.collectionDate ? dayjs(orderData.collectionDate) : null,
        pickupTime: orderData.collectionTimeFrom
          ? dayjs(`2000-01-01 ${orderData.collectionTimeFrom}`)
          : null,
        deliveryDate: orderData.deliveryDate ? dayjs(orderData.deliveryDate) : null,
        deliveryTime: orderData.deliveryTimeFrom
          ? dayjs(`2000-01-01 ${orderData.deliveryTimeFrom}`)
          : null,
      });
    }
  }, [orderData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log("Save order:", formData);
    onClose();
  };

  // Group customerSelectedServices by service name
  const groupedServices = {};
  orderData?.customerSelectedServices?.forEach((service) => {
    const serviceName = service.service?.name || "Other";
    if (!groupedServices[serviceName]) {
      groupedServices[serviceName] = [];
    }
    groupedServices[serviceName].push(service);
  });

  // Format address
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

  return (
    <ModalComponent
      open={open}
      title=""
      onClose={onClose}
      width={1200}
      hideActions={true}
      hideHeader={true}
    >
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {isLoading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Delay />
          </Box>
        ) : orderData ? (
          <Box sx={{ p: 4 }}>
            {/* Invoice To Section */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h6"
                fontWeight="bold"
                fontFamily="Switzer"
                sx={{ mb: 1, fontSize: "16px", color: "#000000" }}
              >
                Invoice To
              </Typography>
              <Typography
                variant="body1"
                fontFamily="Switzer"
                sx={{ fontSize: "14px", color: "#000000" }}
              >
                {formatAddress(orderData.pickupAddress || orderData.dropOffAddress)}
              </Typography>
            </Box>

            {/* Order Information Fields */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 3,
                mb: 4,
              }}
            >
              {/* Order Number */}
              <Box>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ mb: 1, fontSize: "14px", color: "#374151" }}
                >
                  Order Number
                </Typography>
                <InputFieldBordered
                  value={formData.orderNumber}
                  onChange={(e) => handleInputChange("orderNumber", e.target.value)}
                  placeholder="Order Number"
                />
              </Box>

              {/* Order Date */}
              <Box>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ mb: 1, fontSize: "14px", color: "#374151" }}
                >
                  Order date
                </Typography>
                <DatePicker
                  value={formData.orderDate}
                  onChange={(newValue) => handleInputChange("orderDate", newValue)}
                  slotProps={{
                    textField: {
                      placeholder: "Select date",
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          height: "52px",
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          fontFamily: "Switzer",
                          "& fieldset": {
                            border: "none",
                          },
                        },
                      },
                    },
                  }}
                  slots={{
                    openPickerIcon: () => <TbCalendar size={20} style={{ color: "#6B7280" }} />,
                  }}
                />
              </Box>

              {/* Order Time */}
              <Box>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ mb: 1, fontSize: "14px", color: "#374151" }}
                >
                  Order time
                </Typography>
                <TimePicker
                  value={formData.orderTime}
                  onChange={(newValue) => handleInputChange("orderTime", newValue)}
                  slotProps={{
                    textField: {
                      placeholder: "Select time",
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          height: "52px",
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          fontFamily: "Switzer",
                          "& fieldset": {
                            border: "none",
                          },
                        },
                      },
                    },
                  }}
                />
              </Box>

              {/* Pickup Date */}
              <Box>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ mb: 1, fontSize: "14px", color: "#374151" }}
                >
                  Pickup Date
                </Typography>
                <DatePicker
                  value={formData.pickupDate}
                  onChange={(newValue) => handleInputChange("pickupDate", newValue)}
                  slotProps={{
                    textField: {
                      placeholder: "Select date",
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          height: "52px",
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          fontFamily: "Switzer",
                          "& fieldset": {
                            border: "none",
                          },
                        },
                      },
                    },
                  }}
                  slots={{
                    openPickerIcon: () => <TbCalendar size={20} style={{ color: "#6B7280" }} />,
                  }}
                />
              </Box>

              {/* Pickup Time */}
              <Box>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ mb: 1, fontSize: "14px", color: "#374151" }}
                >
                  Pickup Time
                </Typography>
                <TimePicker
                  value={formData.pickupTime}
                  onChange={(newValue) => handleInputChange("pickupTime", newValue)}
                  slotProps={{
                    textField: {
                      placeholder: "Select time",
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          height: "52px",
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          fontFamily: "Switzer",
                          "& fieldset": {
                            border: "none",
                          },
                        },
                      },
                    },
                  }}
                />
              </Box>

              {/* Delivery Date */}
              <Box>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ mb: 1, fontSize: "14px", color: "#374151" }}
                >
                  Delivery Date
                </Typography>
                <DatePicker
                  value={formData.deliveryDate}
                  onChange={(newValue) => handleInputChange("deliveryDate", newValue)}
                  slotProps={{
                    textField: {
                      placeholder: "Select date",
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          height: "52px",
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          fontFamily: "Switzer",
                          "& fieldset": {
                            border: "none",
                          },
                        },
                      },
                    },
                  }}
                  slots={{
                    openPickerIcon: () => <TbCalendar size={20} style={{ color: "#6B7280" }} />,
                  }}
                />
              </Box>

              {/* Delivery Time */}
              <Box>
                <Typography
                  variant="body2"
                  fontFamily="Switzer"
                  sx={{ mb: 1, fontSize: "14px", color: "#374151" }}
                >
                  Delivery Time
                </Typography>
                <TimePicker
                  value={formData.deliveryTime}
                  onChange={(newValue) => handleInputChange("deliveryTime", newValue)}
                  slotProps={{
                    textField: {
                      placeholder: "Select time",
                      sx: {
                        "& .MuiOutlinedInput-root": {
                          height: "52px",
                          borderRadius: "8px",
                          border: "1px solid rgba(0, 0, 0, 0.2)",
                          fontFamily: "Switzer",
                          "& fieldset": {
                            border: "none",
                          },
                        },
                      },
                    },
                  }}
                />
              </Box>
            </Box>

            {/* Service Tables */}
            {Object.entries(groupedServices).map(([serviceName, services]) => (
              <Box key={serviceName} sx={{ mb: 4 }}>
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  fontFamily="Switzer"
                  sx={{ mb: 2, fontSize: "16px", color: "#000000" }}
                >
                  {serviceName}
                </Typography>
                <TableContainer
                  component={Paper}
                  sx={{
                    boxShadow: "none",
                    border: "1px solid #E5E7EB",
                    borderRadius: "8px",
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow sx={{ bgcolor: "#F9FAFB" }}>
                        <TableCell
                          sx={{
                            fontFamily: "Switzer",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#374151",
                            borderBottom: "1px solid #E5E7EB",
                          }}
                        >
                          Item
                        </TableCell>
                        <TableCell
                          sx={{
                            fontFamily: "Switzer",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#374151",
                            borderBottom: "1px solid #E5E7EB",
                          }}
                        >
                          Quantity
                        </TableCell>
                        <TableCell
                          sx={{
                            fontFamily: "Switzer",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#374151",
                            borderBottom: "1px solid #E5E7EB",
                          }}
                        >
                          Unit Price
                        </TableCell>
                        <TableCell
                          sx={{
                            fontFamily: "Switzer",
                            fontWeight: 600,
                            fontSize: "14px",
                            color: "#374151",
                            borderBottom: "1px solid #E5E7EB",
                          }}
                        >
                          Amount
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {services.map((service, index) => {
                        // Get item name - prefer subCategory name, fallback to category name
                        const itemName = service.category?.name || "Item";
                        const quantity = service.items || 1;
                        const unitPrice = parseFloat(
                          service.categoryPrice || service.servicePrice || 0
                        );
                        const amount = quantity * unitPrice;

                        return (
                          <TableRow key={service.id || index}>
                            <TableCell
                              sx={{
                                fontFamily: "Switzer",
                                fontSize: "14px",
                                color: "#000000",
                                borderBottom: "1px solid #E5E7EB",
                                width: "30%",
                              }}
                            >
                              <InputFieldBordered
                                value={itemName}
                                onChange={(e) => {
                                  // TODO: Handle item name change
                                }}
                                placeholder="Item name"
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: "Switzer",
                                fontSize: "14px",
                                color: "#000000",
                                borderBottom: "1px solid #E5E7EB",
                                width: "20%",
                              }}
                            >
                              <InputFieldBordered
                                type="number"
                                value={quantity}
                                onChange={(e) => {
                                  // TODO: Handle quantity change
                                }}
                                placeholder="Quantity"
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: "Switzer",
                                fontSize: "14px",
                                color: "#000000",
                                borderBottom: "1px solid #E5E7EB",
                                width: "25%",
                              }}
                            >
                              <InputFieldBordered
                                type="number"
                                value={unitPrice.toFixed(2)}
                                onChange={(e) => {
                                  // TODO: Handle unit price change
                                }}
                                placeholder="Unit Price"
                              />
                            </TableCell>
                            <TableCell
                              sx={{
                                fontFamily: "Switzer",
                                fontSize: "14px",
                                color: "#000000",
                                borderBottom: "1px solid #E5E7EB",
                                fontWeight: 600,
                                width: "25%",
                              }}
                            >
                              ${amount.toFixed(2)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            ))}

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
                mt: 4,
                pt: 3,
                borderTop: "1px solid #E5E7EB",
              }}
            >
              <Box
                component="button"
                onClick={onClose}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: "8px",
                  border: "1px solid #D0D5DD",
                  bgcolor: "white",
                  color: "#374151",
                  fontFamily: "Switzer",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: "#F9FAFB",
                  },
                }}
              >
                Cancel
              </Box>
              <Box
                component="button"
                onClick={handleSave}
                sx={{
                  px: 3,
                  py: 1.5,
                  borderRadius: "8px",
                  bgcolor: "#55ACEE",
                  color: "white",
                  fontFamily: "Switzer",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  "&:hover": {
                    bgcolor: "#3B82F6",
                  },
                }}
              >
                Save
              </Box>
            </Box>
          </Box>
        ) : (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <Typography variant="body1" fontFamily="Switzer">
              No order data available
            </Typography>
          </Box>
        )}
      </LocalizationProvider>
    </ModalComponent>
  );
}

