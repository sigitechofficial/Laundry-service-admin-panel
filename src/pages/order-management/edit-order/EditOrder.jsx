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
  Switch,
  Select,
  MenuItem,
} from "@mui/material";
import { useGetOrderForEditQuery, useGetAllServicesQuery, useEditOrderMutation, useGetPreferencesQuery } from "../../../store/services/api";
import baseQueryWithReauth from "../../../store/services/baseQueryWithReauth";
import useToaster from "../../../components/ui/Toaster";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import { TbCalendar, IoChevronBackOutline } from "../../../shared/icons/index";
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
    shopName: "",
    driverInstruction: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    postCode: "",
    country: "",
    deliveryFee: "0.00",
    driverTip: "0.00",
    minimumOrderFee: "0.00",
    serviceCharge: "0.00",
  });

  const [addItemModal, setAddItemModal] = useState({
    open: false,
  });

  const [settings, setSettings] = useState({
    notifyCustomer: true,
    notifyDriver: true,
    priorityOrder: false,
  });
  const [dropdowns, setDropdowns] = useState({
    status: "Completed",
    frequency: "Just Once",
    collectionMethod: "Collect from me in person",
    collectionDriver: "Unassigned",
    deliveryDriver: "Unassigned",
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
        shopName: orderData?.laundryShop?.name || "",
        driverInstruction: orderData?.driverInstruction || "",
        addressLine1: orderData?.dropOffAddress?.streetAddress || "",
        addressLine2: orderData?.dropOffAddress?.district || "",
        city: orderData?.dropOffAddress?.city || "",
        postCode: orderData?.dropOffAddress?.postalCode || "",
        country: orderData?.dropOffAddress?.country || "",
        deliveryFee: "0.00",
        driverTip: "0.00",
        minimumOrderFee: "0.00",
        serviceCharge: "0.00",
      });

      const collectionDriverName = orderData?.driver
        ? `${orderData.driver.firstName} ${orderData.driver.lastName}`.trim()
        : "Unassigned";
      const deliveryDriverName = orderData?.deliveryDriver
        ? `${orderData.deliveryDriver.firstName} ${orderData.deliveryDriver.lastName}`.trim()
        : collectionDriverName;

      setDropdowns({
        status: orderData?.bookingStatus?.title || "Completed",
        frequency: orderData?.frequency || "Just Once",
        collectionMethod:
          orderData?.driverInstructionOptions || "Collect from me in person",
        collectionDriver: collectionDriverName || "Unassigned",
        deliveryDriver: deliveryDriverName || "Unassigned",
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
        driverInstruction: formData.driverInstruction || "",
        driverInstructionOptions:
          dropdowns.collectionMethod || "Collect from me in person",
        driverInstructionOptions1: orderData?.driverInstructionOptions1 || "Deliver to me in person",
        frequency: dropdowns.frequency || "Just Once",
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
            streetAddress: formData.addressLine1 || orderData.dropOffAddress.streetAddress || "",
            district: formData.addressLine2 || orderData.dropOffAddress.district || "",
            city: formData.city || orderData.dropOffAddress.city || orderData.dropOffAddress.district || "",
            province: orderData.dropOffAddress.province || "",
            country: formData.country || orderData.dropOffAddress.country || "",
            postalCode: formData.postCode || orderData.dropOffAddress.postalCode || "",
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

  const subtotal = Object.values(serviceItems).reduce(
    (sum, serviceData) =>
      sum +
      serviceData.items.reduce(
        (itemSum, item) => itemSum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0
      ),
    0
  );

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

  const SECTION_CARD_SX = {
    borderRadius: "12px",
    border: "1px solid #E5E7EB",
    boxShadow: "0 1px 4px 0 rgb(0 0 0 / 0.06), 0 4px 16px -4px rgb(0 0 0 / 0.04)",
    overflow: "hidden",
    bgcolor: "#fff",
  };

  const SECTION_HEADER_SX = {
    px: 2.5,
    py: 1.75,
    borderBottom: "1px solid #F1F5F9",
    bgcolor: "#FFFFFF",
  };

  const FIELD_LABEL_SX = {
    mb: 0.75,
    fontSize: "11px",
    fontWeight: 700,
    color: "#64748B",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  };

  const DATE_TIME_FIELD_SX = {
    "& .MuiOutlinedInput-root": {
      height: "48px",
      borderRadius: "8px",
      border: "1px solid #E2E8F0",
      fontFamily: "Switzer",
      bgcolor: "#fff",
      "& fieldset": {
        border: "none",
      },
    },
  };
  const SELECT_FIELD_SX = {
    width: "100%",
    height: "48px",
    borderRadius: "8px",
    border: "1px solid #E2E8F0",
    bgcolor: "#fff",
    fontFamily: "Switzer",
    fontSize: "14px",
    "& .MuiSelect-select": {
      py: "12px",
      px: "14px",
      display: "flex",
      alignItems: "center",
    },
    "& .MuiOutlinedInput-notchedOutline": {
      border: "none",
    },
  };
  const statusOptions = ["Pending", "Completed", "Cancelled", "On Hold"];
  const frequencyOptions = [
    "Just Once",
    "Every week",
    "Every two weeks",
    "Every four weeks",
  ];
  const collectionMethodOptions = [
    "Collect from me in person",
    "Leave at door",
    "Collect from reception",
  ];
  const driverOptions = Array.from(
    new Set([
      "Unassigned",
      orderData?.driver
        ? `${orderData.driver.firstName} ${orderData.driver.lastName}`.trim()
        : "",
      orderData?.deliveryDriver
        ? `${orderData.deliveryDriver.firstName} ${orderData.deliveryDriver.lastName}`.trim()
        : "",
    ].filter(Boolean))
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <Delay />
        </Box>
      ) : orderData ? (
        <Box sx={{ width: "100%", display: "flex", flexDirection: "column", rowGap: 2.5 }}>
          <Paper sx={{ ...SECTION_CARD_SX, px: 2.5, py: 1.75 }}>
            <Box className="flex items-center justify-between gap-3 flex-wrap">
              <Box className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  aria-label="Go back"
                  className="flex items-center justify-center p-1 rounded-lg hover:bg-grey50 transition-colors"
                >
                  <IoChevronBackOutline size={22} />
                </button>
                <Box>
                  <Typography sx={{ fontSize: 18, fontWeight: 700, color: "#0F172A" }}>
                    Edit Order
                  </Typography>
                  <Typography sx={{ fontSize: 12, color: "#64748B" }}>
                    #{orderData.orderTrackId || orderData.id}
                  </Typography>
                </Box>
              </Box>
              <Box className="flex items-center gap-2">
                <ButtonWhite onClick={handleCancel} disabled={isSaving}>
                  Cancel
                </ButtonWhite>
                <ButtonBlue onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </ButtonBlue>
              </Box>
            </Box>
          </Paper>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", xl: "1fr 320px" },
              gap: 2.5,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center gap-2">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#60A5FA" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Order Details
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Order ID</Typography>
                    <InputFieldBordered value={formData.orderNumber} disabled />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Status</Typography>
                    <Select
                      value={dropdowns.status}
                      onChange={(e) =>
                        setDropdowns((prev) => ({ ...prev, status: e.target.value }))
                      }
                      size="small"
                      sx={SELECT_FIELD_SX}
                    >
                      {statusOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Order Frequency</Typography>
                    <Select
                      value={dropdowns.frequency}
                      onChange={(e) =>
                        setDropdowns((prev) => ({ ...prev, frequency: e.target.value }))
                      }
                      size="small"
                      sx={SELECT_FIELD_SX}
                    >
                      {frequencyOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Shop Name</Typography>
                    <InputFieldBordered
                      value={formData.shopName}
                      onChange={(e) => handleInputChange("shopName", e.target.value)}
                      placeholder="Assign a shop..."
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Collection Method</Typography>
                    <Select
                      value={dropdowns.collectionMethod}
                      onChange={(e) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          collectionMethod: e.target.value,
                        }))
                      }
                      size="small"
                      sx={SELECT_FIELD_SX}
                    >
                      {collectionMethodOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Driver Instruction</Typography>
                    <InputFieldBordered
                      value={formData.driverInstruction}
                      onChange={(e) => handleInputChange("driverInstruction", e.target.value)}
                      placeholder="N/A"
                    />
                  </Box>
                </Box>
              </Paper>

              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center justify-between">
                  <Box className="flex items-center gap-2">
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#FBBF24" }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Schedule
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, color: "#64748B", fontStyle: "italic" }}>
                    Times are in local timezone
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "120px 1fr 1fr" }, gap: 1.5, alignItems: "center" }}>
                  <Typography sx={{ ...FIELD_LABEL_SX, mb: 0, color: "#2563EB" }}>Collection</Typography>
                  <DatePicker
                    value={formData.pickupDate}
                    onChange={(newValue) => handleInputChange("pickupDate", newValue)}
                    slotProps={{ textField: { placeholder: "Select date", sx: DATE_TIME_FIELD_SX } }}
                    slots={{ openPickerIcon: () => <TbCalendar size={18} style={{ color: "#6B7280" }} /> }}
                  />
                  <TimePicker
                    value={formData.pickupTime}
                    onChange={(newValue) => handleInputChange("pickupTime", newValue)}
                    slotProps={{ textField: { placeholder: "Select time", sx: DATE_TIME_FIELD_SX } }}
                  />
                  <Typography sx={{ ...FIELD_LABEL_SX, mb: 0, color: "#059669" }}>Delivery</Typography>
                  <DatePicker
                    value={formData.deliveryDate}
                    onChange={(newValue) => handleInputChange("deliveryDate", newValue)}
                    slotProps={{ textField: { placeholder: "Select date", sx: DATE_TIME_FIELD_SX } }}
                    slots={{ openPickerIcon: () => <TbCalendar size={18} style={{ color: "#6B7280" }} /> }}
                  />
                  <TimePicker
                    value={formData.deliveryTime}
                    onChange={(newValue) => handleInputChange("deliveryTime", newValue)}
                    slotProps={{ textField: { placeholder: "Select time", sx: DATE_TIME_FIELD_SX } }}
                  />
                </Box>
              </Paper>

              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center justify-between">
                  <Box className="flex items-center gap-2">
                    <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#A3E635" }} />
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      Order Items
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#15803D", bgcolor: "#ECFDF3", border: "1px solid #86EFAC", borderRadius: "6px", px: 1.2, py: 0.4 }}>
                    {Object.values(serviceItems).reduce((sum, serviceData) => sum + serviceData.items.length, 0)} items
                  </Typography>
                </Box>

                {Object.entries(groupedServices).map(([serviceName, serviceData]) => {
                  const serviceId = serviceData.serviceId;
                  const services = serviceData.items;
                  return (
                    <Box key={serviceName} sx={{ borderTop: "1px solid #F1F5F9" }}>
                      <Box sx={{ px: 2.5, py: 1.3 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 12, color: "#334155" }}>{serviceName}</Typography>
                      </Box>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                            <TableCell sx={{ fontFamily: "Switzer", fontWeight: 700, fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E5E7EB" }}>Item Name</TableCell>
                            <TableCell sx={{ fontFamily: "Switzer", fontWeight: 700, fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E5E7EB" }}>Category</TableCell>
                            <TableCell sx={{ fontFamily: "Switzer", fontWeight: 700, fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E5E7EB" }}>Price ($)</TableCell>
                            <TableCell sx={{ fontFamily: "Switzer", fontWeight: 700, fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E5E7EB" }}>Qty</TableCell>
                            <TableCell sx={{ fontFamily: "Switzer", fontWeight: 700, fontSize: "11px", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: "1px solid #E5E7EB" }}>Amount</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {services.length > 0 ? (
                            services.map((item, index) => {
                              const amount = item.quantity * item.unitPrice;
                              return (
                                <TableRow key={item.id || index}>
                                  <TableCell sx={{ borderBottom: "1px solid #E5E7EB", width: "28%" }}>
                                    <InputFieldBordered
                                      value={item.itemName}
                                      onChange={(e) => {
                                        setServiceItems((prev) => {
                                          const newState = { ...prev };
                                          const currentServiceData = newState[serviceId];
                                          if (currentServiceData) {
                                            const itemIndex = currentServiceData.items.findIndex((i) => i.id === item.id);
                                            if (itemIndex !== -1) currentServiceData.items[itemIndex].itemName = e.target.value;
                                          }
                                          return newState;
                                        });
                                      }}
                                      placeholder="Item name"
                                    />
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: "1px solid #E5E7EB", color: "#334155", fontSize: 13 }}>
                                    {serviceName}
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: "1px solid #E5E7EB", width: "18%" }}>
                                    <InputFieldBordered
                                      type="number"
                                      value={item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ""}
                                      onChange={(e) => {
                                        const newPrice = parseFloat(e.target.value) || 0;
                                        setServiceItems((prev) => {
                                          const newState = { ...prev };
                                          const currentServiceData = newState[serviceId];
                                          if (currentServiceData) {
                                            const itemIndex = currentServiceData.items.findIndex((i) => i.id === item.id);
                                            if (itemIndex !== -1) currentServiceData.items[itemIndex].unitPrice = newPrice;
                                          }
                                          return newState;
                                        });
                                      }}
                                      placeholder="0.00"
                                    />
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: "1px solid #E5E7EB", width: "14%" }}>
                                    <InputFieldBordered
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newQuantity = parseInt(e.target.value) || 0;
                                        setServiceItems((prev) => {
                                          const newState = { ...prev };
                                          const currentServiceData = newState[serviceId];
                                          if (currentServiceData) {
                                            const itemIndex = currentServiceData.items.findIndex((i) => i.id === item.id);
                                            if (itemIndex !== -1) currentServiceData.items[itemIndex].quantity = newQuantity;
                                          }
                                          return newState;
                                        });
                                      }}
                                      placeholder="0"
                                    />
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: "1px solid #E5E7EB", fontWeight: 600, color: "#334155" }}>
                                    ${amount.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} sx={{ fontSize: "14px", color: "#6B7280", textAlign: "center", py: 3 }}>
                                No items available for this service
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  );
                })}

                <Box sx={{ p: 2.5, borderTop: "1px solid #F1F5F9" }}>
                  <Box
                    component="button"
                    onClick={handleOpenAddItemModal}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 1,
                      px: 2.4,
                      py: 1.1,
                      borderRadius: "8px",
                      border: "1px solid #93C5FD",
                      bgcolor: "white",
                      color: "#2563EB",
                      fontFamily: "Switzer",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      "&:hover": { bgcolor: "#EFF6FF" },
                    }}
                  >
                    <TbPlus size={16} />
                    Add Item
                  </Box>

                  <Box sx={{ mt: 2.5, pt: 2, borderTop: "1px solid #E5E7EB" }}>
                    <Box className="flex justify-between py-0.5">
                      <Typography sx={{ color: "#64748B", fontSize: 14 }}>Subtotal</Typography>
                      <Typography sx={{ color: "#0F172A", fontWeight: 600, fontSize: 14 }}>${subtotal.toFixed(2)}</Typography>
                    </Box>
                    <Box className="flex justify-between py-0.5">
                      <Typography sx={{ color: "#64748B", fontSize: 14 }}>Delivery Fee</Typography>
                      <Typography sx={{ color: "#0F172A", fontWeight: 600, fontSize: 14 }}>$0.00</Typography>
                    </Box>
                    <Box className="flex justify-between py-0.5">
                      <Typography sx={{ color: "#64748B", fontSize: 14 }}>Driver Tip</Typography>
                      <Typography sx={{ color: "#0F172A", fontWeight: 600, fontSize: 14 }}>$0.00</Typography>
                    </Box>
                    <Box className="flex justify-between pt-2 mt-2" sx={{ borderTop: "1px solid #E5E7EB" }}>
                      <Typography sx={{ color: "#0F172A", fontWeight: 700, fontSize: 18 }}>Total</Typography>
                      <Typography sx={{ color: "#16A34A", fontWeight: 700, fontSize: 24 }}>${subtotal.toFixed(2)}</Typography>
                    </Box>
                  </Box>
                </Box>
              </Paper>

              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center gap-2">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#60A5FA" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Delivery Address
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" }, gap: 2 }}>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Address Line 1</Typography>
                    <InputFieldBordered
                      value={formData.addressLine1}
                      onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Address Line 2</Typography>
                    <InputFieldBordered
                      value={formData.addressLine2}
                      onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>City</Typography>
                    <InputFieldBordered
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Postcode</Typography>
                    <InputFieldBordered
                      value={formData.postCode}
                      onChange={(e) => handleInputChange("postCode", e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Country</Typography>
                    <InputFieldBordered
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                    />
                  </Box>
                </Box>
              </Paper>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", rowGap: 2.5 }}>
              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center gap-2">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#94A3B8" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Assign Drivers
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box>
                    <Typography sx={{ ...FIELD_LABEL_SX, mb: 0.4, color: "#2563EB" }}>Collection Driver</Typography>
                    <Select
                      value={dropdowns.collectionDriver}
                      onChange={(e) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          collectionDriver: e.target.value,
                        }))
                      }
                      size="small"
                      sx={SELECT_FIELD_SX}
                    >
                      {driverOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={{ ...FIELD_LABEL_SX, mb: 0.4, color: "#059669" }}>Delivery Driver</Typography>
                    <Select
                      value={dropdowns.deliveryDriver}
                      onChange={(e) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          deliveryDriver: e.target.value,
                        }))
                      }
                      size="small"
                      sx={SELECT_FIELD_SX}
                    >
                      {driverOptions.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                </Box>
              </Paper>

              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center gap-2">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#F59E0B" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Fees & Charges
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Delivery Fee ($)</Typography>
                    <InputFieldBordered
                      value={formData.deliveryFee}
                      onChange={(e) => handleInputChange("deliveryFee", e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Driver Tip ($)</Typography>
                    <InputFieldBordered
                      value={formData.driverTip}
                      onChange={(e) => handleInputChange("driverTip", e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Minimum Order Fee ($)</Typography>
                    <InputFieldBordered
                      value={formData.minimumOrderFee}
                      onChange={(e) => handleInputChange("minimumOrderFee", e.target.value)}
                    />
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Service Charge ($)</Typography>
                    <InputFieldBordered
                      value={formData.serviceCharge}
                      onChange={(e) => handleInputChange("serviceCharge", e.target.value)}
                    />
                  </Box>
                </Box>
              </Paper>

              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center gap-2">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#94A3B8" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Settings
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.2 }}>
                  <Box className="flex items-center justify-between">
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Notify Customer</Typography>
                      <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Send update SMS/email</Typography>
                    </Box>
                    <Switch checked={settings.notifyCustomer} onChange={(e) => setSettings((prev) => ({ ...prev, notifyCustomer: e.target.checked }))} />
                  </Box>
                  <Box className="flex items-center justify-between">
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Notify Driver</Typography>
                      <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Push notification to driver app</Typography>
                    </Box>
                    <Switch checked={settings.notifyDriver} onChange={(e) => setSettings((prev) => ({ ...prev, notifyDriver: e.target.checked }))} />
                  </Box>
                  <Box className="flex items-center justify-between">
                    <Box>
                      <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Priority Order</Typography>
                      <Typography sx={{ fontSize: 11, color: "#94A3B8" }}>Flag as high priority</Typography>
                    </Box>
                    <Switch checked={settings.priorityOrder} onChange={(e) => setSettings((prev) => ({ ...prev, priorityOrder: e.target.checked }))} />
                  </Box>
                </Box>
              </Paper>

              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center gap-2">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#94A3B8" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Admin Notes
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5 }}>
                  <Typography sx={{ fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
                    {orderData?.driverInstruction || "No admin notes added for this order."}
                  </Typography>
                </Box>
              </Paper>

              <Paper sx={SECTION_CARD_SX}>
                <Box sx={SECTION_HEADER_SX} className="flex items-center gap-2">
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#EF4444" }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                    Danger Zone
                  </Typography>
                </Box>
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1.1 }}>
                  <Box component="button" sx={{ borderRadius: "8px", border: "1px solid #FECACA", py: 1, fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#DC2626", bgcolor: "#fff", cursor: "pointer" }}>
                    Cancel Order
                  </Box>
                  <Box component="button" sx={{ borderRadius: "8px", border: "1px solid #FCA5A5", py: 1, fontSize: 12, fontWeight: 700, textTransform: "uppercase", color: "#B91C1C", bgcolor: "#fff", cursor: "pointer" }}>
                    Delete Order
                  </Box>
                </Box>
              </Paper>
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

      {/* Add Item Modal */}
      <AddItemModal
        open={addItemModal.open}
        onClose={handleCloseAddItemModal}
        onAddItems={handleAddItems}
        orderData={orderData}
      />
    </LocalizationProvider>
  );
}

