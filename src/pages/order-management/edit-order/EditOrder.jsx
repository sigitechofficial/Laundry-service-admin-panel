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
      // Debug: Log current serviceItems state
      console.log('Current serviceItems before building payload:', JSON.parse(JSON.stringify(serviceItems)));
      
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
      // NOTE: We don't need to validate against service preferences here because
      // AddItemModal already ensures only configured preferences can be selected
      const preferencesArray = [];
      
      console.log('🔨 EditOrder: Building preferencesArray from serviceItems...');
      console.log('🔨 EditOrder: serviceItems structure:', JSON.parse(JSON.stringify(serviceItems)));
      
      Object.entries(serviceItems).forEach(([serviceId, serviceData]) => {
        const parsedServiceId = parseInt(serviceId);
        
        console.log(`🔨 EditOrder: Processing service ${parsedServiceId} with ${serviceData.items.length} items`);
        
        // Get preferences from items
        serviceData.items.forEach((item, itemIndex) => {
          console.log(`🔨 EditOrder: Processing item ${itemIndex} (id: ${item.id}):`, item);
          console.log(`🔨 EditOrder: Item preferences:`, item.preferences);
          console.log(`🔨 EditOrder: Item has preferences?`, !!item.preferences);
          console.log(`🔨 EditOrder: Item has preferenceIds?`, !!item.preferences?.preferenceIds);
          console.log(`🔨 EditOrder: preferenceIds is array?`, Array.isArray(item.preferences?.preferenceIds));
          console.log(`🔨 EditOrder: preferenceIds length:`, item.preferences?.preferenceIds?.length || 0);
          
          // Check if item has preferences with preferenceIds array
          if (item.preferences && item.preferences.preferenceIds && Array.isArray(item.preferences.preferenceIds) && item.preferences.preferenceIds.length > 0) {
            console.log(`✅ EditOrder: Item ${item.id} has ${item.preferences.preferenceIds.length} preference IDs`);
            
            // Add each preference with its IDs
            // All preferences here are already validated in AddItemModal to be configured for the service
            item.preferences.preferenceIds.forEach((prefId, prefIndex) => {
              console.log(`🔨 EditOrder: Processing preference ${prefIndex}:`, prefId);
              
              // Only validate if preferenceTypeId and preferenceValueId exist
              if (prefId.preferenceTypeId && prefId.preferenceValueId) {
                const preferenceEntry = {
                  preferenceTypeId: prefId.preferenceTypeId,
                  preferenceValueId: prefId.preferenceValueId,
                  serviceId: parsedServiceId,
                };
                
                // Include categoryId and subCategoryId if available
                if (item.categoryId) {
                  preferenceEntry.categoryId = item.categoryId;
                }
                if (item.subCategoryId) {
                  preferenceEntry.subCategoryId = item.subCategoryId;
                }
                
                console.log(`✅ EditOrder: Adding preference entry to array:`, preferenceEntry);
                preferencesArray.push(preferenceEntry);
              } else {
                console.warn(`⚠️ EditOrder: Invalid preference ID structure for item ${item.id}:`, prefId);
              }
            });
          } else {
            // Debug: log if item doesn't have preferences
            console.warn(`⚠️ EditOrder: Item ${item.id} does NOT have valid preferences structure`);
            if (item.preferences) {
              console.warn(`⚠️ EditOrder: Item ${item.id} preferences object:`, item.preferences);
            } else {
              console.warn(`⚠️ EditOrder: Item ${item.id} has no preferences property`);
            }
          }
        });
      });
      
      // Debug: log the preferencesArray
      console.log('📦 EditOrder: Final preferencesArray:', preferencesArray);
      console.log('📦 EditOrder: preferencesArray length:', preferencesArray.length);
      console.log('📦 EditOrder: Full serviceItems state:', JSON.parse(JSON.stringify(serviceItems)));

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

      console.log('📤 EditOrder: Sending API request with body:', JSON.stringify(body, null, 2));
      console.log('📤 EditOrder: preferencesArray in request:', body.preferencesArray);
      console.log('📤 EditOrder: preferencesArray length:', body.preferencesArray.length);
      
      const response = await editOrder({ orderId: id, body }).unwrap();
      
      console.log('📥 EditOrder: API Response received:', response);

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
    console.log('📥 EditOrder: handleAddItems called with item:', item);
    console.log('📥 EditOrder: Item preferences:', item.preferences);
    console.log('📥 EditOrder: Item preferenceIds:', item.preferences?.preferenceIds);
    
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
        preferences: preferences || { preferenceIds: [] },
      };
      
      // Debug: Log the item being added
      console.log('✅ EditOrder: Adding new item to serviceItems:', newItem);
      console.log('✅ EditOrder: New item preferences structure:', newItem.preferences);
      console.log('✅ EditOrder: New item preferenceIds:', newItem.preferences?.preferenceIds);
      console.log('✅ EditOrder: New item preferenceIds length:', newItem.preferences?.preferenceIds?.length || 0);
      
      newState[serviceId].items.push(newItem);
      
      console.log('📊 EditOrder: Updated serviceItems state:', JSON.parse(JSON.stringify(newState)));
      
      return newState;
    });
  };

  // Initialize service items from orderData (only once when orderData is first loaded)
  useEffect(() => {
    if (orderData?.customerSelectedServices && !isInitialized.current) {
      const items = {};
      
      // Create a map of preferences by serviceId and categoryId/subCategoryId for quick lookup
      // Also create a reverse map by serviceId only as fallback
      const preferencesMap = {};
      const preferencesByServiceMap = {};
      
      if (orderData.preferencesArray && Array.isArray(orderData.preferencesArray)) {
        orderData.preferencesArray.forEach((pref) => {
          // Map by serviceId + categoryId + subCategoryId (if available)
          if (pref.categoryId || pref.subCategoryId) {
            const key = `${pref.serviceId}-${pref.categoryId || ''}-${pref.subCategoryId || ''}`;
            if (!preferencesMap[key]) {
              preferencesMap[key] = [];
            }
            preferencesMap[key].push({
              preferenceTypeId: pref.preferenceTypeId,
              preferenceValueId: pref.preferenceValueId,
            });
          }
          
          // Also map by serviceId only as fallback
          if (!preferencesByServiceMap[pref.serviceId]) {
            preferencesByServiceMap[pref.serviceId] = [];
          }
          preferencesByServiceMap[pref.serviceId].push({
            preferenceTypeId: pref.preferenceTypeId,
            preferenceValueId: pref.preferenceValueId,
          });
        });
      }
      
      orderData.customerSelectedServices.forEach((service) => {
        const serviceName = service.service?.name || "Other";
        const serviceId = service.serviceId;
        if (!items[serviceId]) {
          items[serviceId] = {
            serviceName,
            items: [],
          };
        }
        
        // Find preferences for this service item
        // First try to match by serviceId + categoryId + subCategoryId
        let itemPreferences = [];
        if (service.categoryId || service.subCategoryId) {
          const prefKey = `${serviceId}-${service.categoryId || ''}-${service.subCategoryId || ''}`;
          itemPreferences = preferencesMap[prefKey] || [];
        }
        
        // If no preferences found, try to get by serviceId only (fallback)
        if (itemPreferences.length === 0 && preferencesByServiceMap[serviceId]) {
          itemPreferences = preferencesByServiceMap[serviceId];
        }
        
        items[serviceId].items.push({
          id: service.id,
          itemName: service.category?.name || service.service?.name || "Item",
          quantity: service.items !== null && service.items !== undefined ? service.items : 0,
          unitPrice: parseFloat(service.categoryPrice || service.servicePrice || 0),
          categoryId: service.categoryId,
          subCategoryId: service.subCategoryId,
          preferences: {
            preferenceIds: itemPreferences || [],
          },
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

  // Debug helper function - can be called from browser console
  useEffect(() => {
    // Expose debug function to window for browser console access
    window.debugEditOrder = {
      getServiceItems: () => {
        console.log('🔍 Debug: Current serviceItems:', JSON.parse(JSON.stringify(serviceItems)));
        return serviceItems;
      },
      getPreferencesArray: async () => {
        console.log('🔍 Debug: Building preferencesArray...');
        const preferencesArray = [];
        const serviceIds = Object.keys(serviceItems).map(id => parseInt(id));
        
        Object.entries(serviceItems).forEach(([serviceId, serviceData]) => {
          const parsedServiceId = parseInt(serviceId);
          serviceData.items.forEach((item) => {
            if (item.preferences && item.preferences.preferenceIds && Array.isArray(item.preferences.preferenceIds)) {
              item.preferences.preferenceIds.forEach((prefId) => {
                if (prefId.preferenceTypeId && prefId.preferenceValueId) {
                  preferencesArray.push({
                    preferenceTypeId: prefId.preferenceTypeId,
                    preferenceValueId: prefId.preferenceValueId,
                    serviceId: parsedServiceId,
                    categoryId: item.categoryId,
                    subCategoryId: item.subCategoryId,
                  });
                }
              });
            }
          });
        });
        console.log('🔍 Debug: Built preferencesArray:', preferencesArray);
        return preferencesArray;
      },
      inspectItem: (itemId) => {
        Object.entries(serviceItems).forEach(([serviceId, serviceData]) => {
          const item = serviceData.items.find(i => i.id === itemId);
          if (item) {
            console.log('🔍 Debug: Found item:', item);
            console.log('🔍 Debug: Item preferences:', item.preferences);
            return item;
          }
        });
      },
    };
    
    console.log('🛠️ Debug: EditOrder debug functions available. Use window.debugEditOrder in console.');
  }, [serviceItems]);

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

              {/* Debug Panel - Show current state */}
              {process.env.NODE_ENV === 'development' && (
                <Box
                  sx={{
                    mb: 3,
                    p: 2,
                    bgcolor: "#F9FAFB",
                    borderRadius: "8px",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  <Typography variant="body2" fontFamily="Switzer" sx={{ mb: 1, fontWeight: 600 }}>
                    🐛 Debug Info:
                  </Typography>
                  <Typography variant="caption" fontFamily="Switzer" sx={{ display: "block", mb: 0.5 }}>
                    Services: {Object.keys(serviceItems).length}
                  </Typography>
                  <Typography variant="caption" fontFamily="Switzer" sx={{ display: "block", mb: 0.5 }}>
                    Total Items: {Object.values(serviceItems).reduce((sum, s) => sum + s.items.length, 0)}
                  </Typography>
                  <Typography variant="caption" fontFamily="Switzer" sx={{ display: "block", mb: 0.5 }}>
                    Items with Preferences: {Object.values(serviceItems).reduce((sum, s) => 
                      sum + s.items.filter(i => i.preferences?.preferenceIds?.length > 0).length, 0
                    )}
                  </Typography>
                  <Typography variant="caption" fontFamily="Switzer" sx={{ display: "block", color: "#EF4444" }}>
                    {Object.values(serviceItems).reduce((sum, s) => 
                      sum + s.items.filter(i => !i.preferences?.preferenceIds?.length).length, 0
                    ) > 0 && "⚠️ Some items have no preferences!"}
                  </Typography>
                </Box>
              )}

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

