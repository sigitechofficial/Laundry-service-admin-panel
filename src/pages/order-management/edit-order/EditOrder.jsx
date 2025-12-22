import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import Layout from "../../../components/shared/Layout";
import { useGetOrderForEditQuery, useGetAllServicesQuery, useEditOrderMutation, useGetPreferencesQuery } from "../../../store/services/api";
import baseQueryWithReauth from "../../../store/services/baseQueryWithReauth";
import useToaster from "../../../components/ui/Toaster";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import { TbCalendar } from "../../../shared/icons/index";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import InputFieldBordered from "../../../components/ui/InputFieldBordered";
import { useParams, useNavigate } from "react-router-dom";
import ButtonBlue from "../../../components/ui/ButtonBlue";
import ButtonWhite from "../../../components/ui/ButtonWhite";
import AddItemModal from "./AddItemModal";
import { TbPlus } from "../../../shared/icons/index";

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: orderResponse, isLoading } = useGetOrderForEditQuery(id, {
    skip: !id,
  });
  const { data: servicesResponse } = useGetAllServicesQuery();
  const { data: preferencesResponse } = useGetPreferencesQuery();
  const [editOrder, { isLoading: isSaving }] = useEditOrderMutation();
  const { success, error: showError } = useToaster();

  const orderData = orderResponse?.data;
  const allServices = servicesResponse?.data?.services || [];
  const allPreferences = preferencesResponse?.data || [];

  const [formData, setFormData] = useState({
    orderNumber: "",
    orderDate: null,
    orderTime: null,
    pickupDate: null,
    pickupTime: null,
    deliveryDate: null,
    deliveryTime: null,
  });

  const [addItemModal, setAddItemModal] = useState({
    open: false,
  });

  // State to manage items for each service (including newly added ones)
  const [serviceItems, setServiceItems] = useState({});
  const isInitialized = useRef(false);
  const lastAddedItemRef = useRef({ subCategoryId: null, timestamp: 0 });

  useEffect(() => {
    if (orderData) {
      // Parse order time from createdAt
      const orderDateTime = orderData.createdAt ? dayjs(orderData.createdAt) : null;
      
      // Parse pickup time
      let pickupTime = null;
      if (orderData.collectionTimeFrom) {
        const [hours, minutes] = orderData.collectionTimeFrom.split(':');
        pickupTime = dayjs().hour(parseInt(hours)).minute(parseInt(minutes)).second(0);
      }
      
      // Parse delivery time
      let deliveryTime = null;
      if (orderData.deliveryTimeFrom) {
        const [hours, minutes] = orderData.deliveryTimeFrom.split(':');
        deliveryTime = dayjs().hour(parseInt(hours)).minute(parseInt(minutes)).second(0);
      }

      setFormData({
        orderNumber: orderData.orderTrackId || String(orderData.id) || "",
        orderDate: orderDateTime ? dayjs(orderData.createdAt) : null,
        orderTime: orderDateTime,
        pickupDate: orderData.collectionDate ? dayjs(orderData.collectionDate) : null,
        pickupTime: pickupTime,
        deliveryDate: orderData.deliveryDate ? dayjs(orderData.deliveryDate) : null,
        deliveryTime: deliveryTime,
      });
    }
  }, [orderData]);

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    try {
      // Format dates and times
      const collectionDate = formData.pickupDate
        ? formData.pickupDate.format("YYYY-MM-DD")
        : orderData?.collectionDate
        ? dayjs(orderData.collectionDate).format("YYYY-MM-DD")
        : null;

      const collectionTimeFrom = formData.pickupTime
        ? formData.pickupTime.format("HH:mm:ss")
        : orderData?.collectionTimeFrom || null;

      const collectionTimeTo = orderData?.collectionTimeTo || null;

      const deliveryDate = formData.deliveryDate
        ? formData.deliveryDate.format("YYYY-MM-DD")
        : orderData?.deliveryDate
        ? dayjs(orderData.deliveryDate).format("YYYY-MM-DD")
        : null;

      const deliveryTimeFrom = formData.deliveryTime
        ? formData.deliveryTime.format("HH:mm:ss")
        : orderData?.deliveryTimeFrom || null;

      const deliveryTimeTo = orderData?.deliveryTimeTo || null;

      // Build preferencesArray from serviceItems with preferenceTypeId and preferenceValueId
      // First, fetch service preferences for each service to validate
      const preferencesArray = [];
      const serviceIds = Object.keys(serviceItems).map(id => parseInt(id));
      
      // Fetch service preferences for all services using baseQuery
      const servicePreferencesPromises = serviceIds.map(async (serviceId) => {
        try {
          const result = await baseQueryWithReauth(
            {
              url: `admin/getServiceWithPreferences/${serviceId}`,
              method: 'GET',
            },
            { dispatch: () => {}, getState: () => ({}) },
            {}
          );
          
          if (result.error) {
            console.error(`Error fetching preferences for service ${serviceId}:`, result.error);
            return { serviceId, preferenceTypeIds: [] };
          }
          
          const data = result.data;
          return {
            serviceId,
            preferenceTypeIds: data?.data?.preferencesData?.map(pref => pref.preferenceTypeId) || []
          };
        } catch (error) {
          console.error(`Error fetching preferences for service ${serviceId}:`, error);
          return { serviceId, preferenceTypeIds: [] };
        }
      });
      
      const servicePreferencesResults = await Promise.all(servicePreferencesPromises);
      const servicePreferencesMap = {};
      servicePreferencesResults.forEach(result => {
        servicePreferencesMap[result.serviceId] = result.preferenceTypeIds;
      });
      
      // Now build preferencesArray, only including preferences available for each service
      Object.entries(serviceItems).forEach(([serviceId, serviceData]) => {
        const parsedServiceId = parseInt(serviceId);
        const availablePreferenceTypeIds = servicePreferencesMap[parsedServiceId] || [];
        
        // Get preferences from items
        serviceData.items.forEach((item) => {
          if (item.preferences && item.preferences.preferenceIds) {
            // Add each preference with its IDs, but only if it's available for this service
            item.preferences.preferenceIds.forEach((prefId) => {
              // Check if this preference type is available for this service
              if (availablePreferenceTypeIds.includes(prefId.preferenceTypeId)) {
                preferencesArray.push({
                  preferenceTypeId: prefId.preferenceTypeId,
                  preferenceValueId: prefId.preferenceValueId,
                  serviceId: parsedServiceId,
                });
              } else {
                console.warn(`Preference type ${prefId.preferenceTypeId} is not available for service ${parsedServiceId}, skipping.`);
              }
            });
          }
        });
      });

      // Build services array
      const services = Object.keys(serviceItems).map((serviceId) => ({
        serviceId: parseInt(serviceId),
      }));

      // Calculate total items
      const totalItems = Object.values(serviceItems).reduce(
        (sum, serviceData) =>
          sum +
          serviceData.items.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0),
        0
      );

      // Build request body
      const body = {
        collectionDate: collectionDate,
        collectionTimeFrom: collectionTimeFrom,
        collectionTimeTo: collectionTimeTo,
        deliveryDate: deliveryDate,
        deliveryTimeFrom: deliveryTimeFrom,
        deliveryTimeTo: deliveryTimeTo,
        driverInstruction: orderData?.driverInstruction || "",
        driverInstructionOptions: orderData?.driverInstructionOptions || "Collect from me in person",
        driverInstructionOptions1: orderData?.driverInstructionOptions1 || "Deliver to me in person",
        frequency: orderData?.frequency || "Just Once",
        addressId: "",
        pickUpAddress: orderData?.pickupAddress
          ? {
              title: orderData.pickupAddress.title || "Home",
              hotelName: null,
              apartmentNumber: null,
              floor: null,
              streetAddress: orderData.pickupAddress.streetAddress || "",
              district: orderData.pickupAddress.district || "",
              city: orderData.pickupAddress.city || orderData.pickupAddress.district || "",
              province: orderData.pickupAddress.province || "",
              country: orderData.pickupAddress.country || "",
              postalCode: orderData.pickupAddress.postalCode || "",
              lat: orderData.pickupAddress.lat || null,
              lng: orderData.pickupAddress.lng || null,
              radius: orderData.pickupAddress.radius || null,
              addressType: "pickUp",
              save: true,
            }
          : null,
        dropOffAddress: orderData?.dropOffAddress
          ? {
              title: orderData.dropOffAddress.title || "Home",
              hotelName: null,
              apartmentNumber: null,
              floor: null,
              streetAddress: orderData.dropOffAddress.streetAddress || "",
              district: orderData.dropOffAddress.district || "",
              city: orderData.dropOffAddress.city || orderData.dropOffAddress.district || "",
              province: orderData.dropOffAddress.province || "",
              country: orderData.dropOffAddress.country || "",
              postalCode: orderData.dropOffAddress.postalCode || "",
              lat: orderData.dropOffAddress.lat || null,
              lng: orderData.dropOffAddress.lng || null,
              radius: orderData.dropOffAddress.radius || null,
              addressType: "dropOff",
            }
          : null,
        addNewAddress: false,
        addNewDropOffAddress: false,
        dropOffSamePickUp: orderData?.pickupAddresId === orderData?.dropOffAddressId,
        dropOffAddressId: orderData?.dropOffAddressId || null,
        pickUpAddressId: orderData?.pickupAddresId || null,
        preferencesArray: preferencesArray,
        services: services,
        totalItems: totalItems,
      };

      const response = await editOrder({ orderId: id, body }).unwrap();

      if (response?.status === "1") {
        success(response?.message || "Order updated successfully!");
        navigate(-1);
      } else {
        showError(response?.message || "Failed to update order");
      }
    } catch (err) {
      showError(err?.data?.message || err?.message || "Failed to update order");
    }
  };

  const handleCancel = () => {
    navigate(-1); // Go back to previous page
  };

  const handleOpenAddItemModal = () => {
    setAddItemModal({
      open: true,
    });
  };

  const handleCloseAddItemModal = () => {
    setAddItemModal({
      open: false,
    });
  };

  const handleAddItems = (item) => {
    // item should contain: serviceId, categoryId, subCategoryId, name, price, preferences
    const { serviceId, categoryId, categoryName, subCategoryId, name, price, preferences } = item;
    
    const now = Date.now();
    
    // Check if this is a duplicate addition (same subCategoryId within 1 second)
    if (
      lastAddedItemRef.current.subCategoryId === subCategoryId &&
      now - lastAddedItemRef.current.timestamp < 1000
    ) {
      return; // Prevent duplicate addition
    }
    
    // Update the ref to track this addition
    lastAddedItemRef.current = {
      subCategoryId: subCategoryId,
      timestamp: now,
    };
    
    setServiceItems((prev) => {
      const newState = { ...prev };
      
      // Find the service name if serviceId exists
      let serviceName = "";
      if (orderData?.customerSelectedServices) {
        const service = orderData.customerSelectedServices.find(
          (s) => s.serviceId === serviceId
        );
        serviceName = service?.service?.name || "";
      }
      // If not found in orderData, get from allServices
      if (!serviceName) {
        const service = allServices.find((s) => s.id === serviceId);
        serviceName = service?.name || "Other";
      }
      
      // If service doesn't exist in state, create it
      if (!newState[serviceId]) {
        newState[serviceId] = {
          serviceName,
          items: [],
        };
      }
      
      // Double-check: Don't add if item with same subCategoryId already exists in this service
      const existingItem = newState[serviceId].items.find(
        (existing) => existing.subCategoryId === subCategoryId && existing.id?.startsWith('new-')
      );
      
      if (existingItem) {
        return newState; // Item already exists, don't add duplicate
      }
      
      // Add the new item
      const newItem = {
        id: `new-${now}-${Math.random()}`, // Unique ID for new items
        itemName: categoryName || name,
        quantity: 1,
        unitPrice: parseFloat(price || 0),
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        preferences: preferences || {},
      };
      
      newState[serviceId].items.push(newItem);
      
      return newState;
    });
  };

  // Initialize service items from orderData (only once when orderData is first loaded)
  useEffect(() => {
    if (orderData?.customerSelectedServices && !isInitialized.current) {
      const items = {};
      orderData.customerSelectedServices.forEach((service) => {
        const serviceName = service.service?.name || "Other";
        const serviceId = service.serviceId;
        if (!items[serviceId]) {
          items[serviceId] = {
            serviceName,
            items: [],
          };
        }
        items[serviceId].items.push({
          id: service.id,
          itemName: service.category?.name || service.service?.name || "Item",
          quantity: service.items !== null && service.items !== undefined ? service.items : 0,
          unitPrice: parseFloat(service.categoryPrice || service.servicePrice || 0),
          categoryId: service.categoryId,
          subCategoryId: service.subCategoryId,
        });
      });
      setServiceItems(items);
      isInitialized.current = true;
    }
  }, [orderData]);

  // Group services for display
  const groupedServices = {};
  Object.entries(serviceItems).forEach(([serviceId, serviceData]) => {
    const serviceName = serviceData.serviceName;
    if (!groupedServices[serviceName]) {
      groupedServices[serviceName] = {
        serviceId: parseInt(serviceId),
        items: [],
      };
    }
    groupedServices[serviceName].items.push(...serviceData.items);
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

  return (
    <Layout
      content={
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
            {Object.entries(groupedServices).map(([serviceName, serviceData]) => {
              const serviceId = serviceData.serviceId;
              const services = serviceData.items;
              return (
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
                        {services.length > 0 ? (
                          services.map((item, index) => {
                            const amount = item.quantity * item.unitPrice;

                            return (
                              <TableRow key={item.id || index}>
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
                                    value={item.itemName}
                                    onChange={(e) => {
                                      setServiceItems((prev) => {
                                        const newState = { ...prev };
                                        const serviceData = newState[serviceId];
                                        if (serviceData) {
                                          const itemIndex = serviceData.items.findIndex(
                                            (i) => i.id === item.id
                                          );
                                          if (itemIndex !== -1) {
                                            serviceData.items[itemIndex].itemName = e.target.value;
                                          }
                                        }
                                        return newState;
                                      });
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
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newQuantity = parseInt(e.target.value) || 0;
                                      setServiceItems((prev) => {
                                        const newState = { ...prev };
                                        const serviceData = newState[serviceId];
                                        if (serviceData) {
                                          const itemIndex = serviceData.items.findIndex(
                                            (i) => i.id === item.id
                                          );
                                          if (itemIndex !== -1) {
                                            serviceData.items[itemIndex].quantity = newQuantity;
                                          }
                                        }
                                        return newState;
                                      });
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
                                    value={item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ""}
                                    onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value) || 0;
                                      setServiceItems((prev) => {
                                        const newState = { ...prev };
                                        const serviceData = newState[serviceId];
                                        if (serviceData) {
                                          const itemIndex = serviceData.items.findIndex(
                                            (i) => i.id === item.id
                                          );
                                          if (itemIndex !== -1) {
                                            serviceData.items[itemIndex].unitPrice = newPrice;
                                          }
                                        }
                                        return newState;
                                      });
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
                          })
                        ) : (
                          <TableRow>
                            <TableCell
                              colSpan={4}
                              sx={{
                                fontFamily: "Switzer",
                                fontSize: "14px",
                                color: "#6B7280",
                                textAlign: "center",
                                py: 3,
                              }}
                            >
                              No items available for this service
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              );
            })}

              {/* Add Item Button */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  mt: 4,
                  mb: 3,
                }}
              >
                <Box
                  component="button"
                  onClick={handleOpenAddItemModal}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 3,
                    py: 1.5,
                    borderRadius: "8px",
                    border: "1px solid #55ACEE",
                    bgcolor: "white",
                    color: "#55ACEE",
                    fontFamily: "Switzer",
                    fontSize: "14px",
                    fontWeight: 500,
                    cursor: "pointer",
                    "&:hover": {
                      bgcolor: "#F0F9FF",
                    },
                  }}
                >
                  <TbPlus size={18} />
                  Add Item
                </Box>
              </Box>

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
                <ButtonWhite onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </ButtonWhite>
                <ButtonBlue onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </ButtonBlue>
              </Box>
            </Box>
          ) : (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
              <Typography variant="body1" fontFamily="Switzer">
                No order data available
              </Typography>
            </Box>
          )}

          {/* Add Item Modal */}
          <AddItemModal
            open={addItemModal.open}
            onClose={handleCloseAddItemModal}
            onAddItems={handleAddItems}
            orderData={orderData}
          />
        </LocalizationProvider>
      }
    />
  );
}

