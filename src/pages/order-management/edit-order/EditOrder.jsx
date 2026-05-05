import { useState, useEffect, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Switch,
  Select,
  MenuItem,
  IconButton,
  Checkbox,
} from "@mui/material";
import {
  useGetOrderForEditQuery,
  useGetAllServicesQuery,
  useEditOrderMutation,
  useGetPreferencesQuery,
  useGetAllAddOnServicesQuery,
  useGetShopsDataQuery,
  useGetAllOrderStatusesQuery,
  useGetAllDriverMiniDetailsQuery,
} from "../../../store/services/api";
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
import ModalComponent from "../../../components/shared/Modal";
import { canEditOrderFromBooking } from "../../../shared/orderEditStatusGate";
import { BASE_URL } from "../../../utilities/URL";

/** Booking FK `laundryShopId` is authoritative; never use `laundryShop.userId` (agent id) as shop id. */
function getOrderLaundryShopId(order) {
  if (!order) return "";
  const ls = order.laundryShop;
  const raw =
    order.laundryShopId ?? order.laundaryShopId ?? ls?.id;
  return raw !== undefined && raw !== null && raw !== "" ? String(raw) : "";
}

const COLLECTION_METHOD_OPTIONS = [
  "Collect from me in person",
  "Collect from Outside",
  "Collect from reception/Porter",
  "Collect from the reception",
];

const DELIVERY_METHOD_OPTIONS = [
  "Deliver to me in person",
  "Leave at the door",
  "Deliver to the Reception/Porter",
];

function coerceSelectValue(value, options, fallback) {
  if (value && options.includes(value)) return value;
  if (value) {
    const lower = String(value).trim().toLowerCase();
    const hit = options.find((o) => o.toLowerCase() === lower);
    if (hit) return hit;
  }
  return fallback;
}

function editOrderItemCategoryKey(item) {
  if (item.categoryId != null && item.categoryId !== "") return `c-${item.categoryId}`;
  const raw = String(item.itemName || "item")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);
  return `n-${raw}`;
}

function editOrderCategoryTabLabel(item, serviceId, allServicesList) {
  const sid = Number(serviceId);
  const svc = Array.isArray(allServicesList)
    ? allServicesList.find((s) => Number(s.id) === sid)
    : null;
  const cat = svc?.categories?.find((c) => Number(c.id) === Number(item.categoryId));
  return (cat?.name || item.itemName || "Items").trim();
}

function resolveEditOrderItemServiceId(item, serviceItemsMap) {
  if (item.sourceServiceId != null && item.sourceServiceId !== "") {
    return String(item.sourceServiceId);
  }
  for (const [sid, data] of Object.entries(serviceItemsMap)) {
    if (data.items.some((i) => i.id === item.id)) return String(sid);
  }
  return "";
}

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: orderResponse, isLoading } = useGetOrderForEditQuery(id, {
    skip: !id,
  });
  const { data: servicesResponse } = useGetAllServicesQuery();
  const { data: preferencesResponse } = useGetPreferencesQuery();
  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const { data: shopsResponse, isLoading: shopsLoading } = useGetShopsDataQuery();
  const { data: driversResponse, isLoading: driversLoading } = useGetAllDriverMiniDetailsQuery();
  const [editOrder, { isLoading: isSaving }] = useEditOrderMutation();
  const { success, error: showError } = useToaster();

  const orderData = orderResponse?.data;
  const shopName =
    orderData?.laundryShop?.bussinessInformations?.[0]?.shopName ||
    orderData?.laundryShop?.shopName ||
    orderData?.laundryShop?.name ||
    "";
  const shopSelectOptions = useMemo(() => {
    const raw = shopsResponse?.data?.AllShopsData;
    const list = Array.isArray(raw)
      ? raw.map((s) => ({
          value: String(s.id),
          label: s?.shopName ?? s?.name ?? `Shop ${s.id}`,
        }))
      : [];
    const sid = getOrderLaundryShopId(orderData);
    const expectedName = (shopName || "").trim().toLowerCase();
    if (sid) {
      const idx = list.findIndex((o) => o.value === sid);
      if (idx !== -1) {
        const actualName = (list[idx].label || "").trim().toLowerCase();
        if (expectedName && actualName && actualName !== expectedName) {
          list[idx] = { value: list[idx].value, label: shopName };
        }
      } else {
        list.unshift({ value: sid, label: shopName || `Shop ${sid}` });
      }
    }
    return list;
  }, [shopsResponse, orderData, shopName]);

  const allServices = servicesResponse?.data?.services || [];
  const allPreferences = preferencesResponse?.data || [];
  const orderStatusOptions = useMemo(
    () => (Array.isArray(statusesResponse?.data) ? statusesResponse.data : []),
    [statusesResponse?.data]
  );
  const driverSelectOptions = useMemo(() => {
    const raw = Array.isArray(driversResponse?.data) ? driversResponse.data : [];
    const list = raw.map((d) => {
      const fullName = `${d?.firstName || ""} ${d?.lastName || ""}`.trim();
      return {
        value: String(d.id),
        label: fullName || d?.email || `Driver ${d?.id}`,
      };
    });

    const ensureCurrentDriver = (driverObj) => {
      if (!driverObj?.id) return;
      const id = String(driverObj.id);
      if (list.some((o) => o.value === id)) return;
      const fallbackName = `${driverObj?.firstName || ""} ${driverObj?.lastName || ""}`.trim();
      list.unshift({
        value: id,
        label: fallbackName || driverObj?.email || `Driver ${id}`,
      });
    };

    ensureCurrentDriver(orderData?.driver);
    ensureCurrentDriver(orderData?.deliveryDriver);

    return list;
  }, [driversResponse, orderData]);

  const [formData, setFormData] = useState({
    orderNumber: "",
    orderDate: null,
    orderTime: null,
    pickupDate: null,
    pickupTime: null,
    deliveryDate: null,
    deliveryTime: null,
    laundryShopId: "",
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
  const [addOnModal, setAddOnModal] = useState({
    open: false,
    serviceId: null,
    itemId: null,
    itemName: "",
    selectedIds: [],
  });
  const { data: addOnServicesResponse, isLoading: isLoadingAddOnServices } =
    useGetAllAddOnServicesQuery(undefined, {
      skip: !addOnModal.open,
    });

  const [settings, setSettings] = useState({
    notifyCustomer: true,
    notifyDriver: true,
    priorityOrder: false,
  });
  const [dropdowns, setDropdowns] = useState({
    status: "",
    frequency: "Just Once",
    collectionMethod: COLLECTION_METHOD_OPTIONS[0],
    deliveryMethod: DELIVERY_METHOD_OPTIONS[0],
    collectionDriverId: "",
    deliveryDriverId: "",
  });

  // State to manage items for each service (including newly added ones)
  const [serviceItems, setServiceItems] = useState({});
  /** Order Items panel: which service / category tab is active (mobile-style UI). */
  const [selectedItemsServiceId, setSelectedItemsServiceId] = useState("");
  const [selectedItemsCategoryKey, setSelectedItemsCategoryKey] = useState("all");
  const isInitialized = useRef(false);
  const lastAddedItemRef = useRef({ subCategoryId: null, timestamp: 0 });
  const editStatusRedirected = useRef(false);

  useEffect(() => {
    if (isLoading || !orderData || editStatusRedirected.current) return;
    const statusesReady =
      orderStatusOptions.length > 0 ||
      Boolean(orderData?.bookingStatus?.title ?? orderData?.bookingStatusId);
    if (!statusesReady) return;
    if (!canEditOrderFromBooking(orderData, orderStatusOptions)) {
      editStatusRedirected.current = true;
      showError(
        "This order can only be edited after the status reaches Invoice Generated."
      );
      navigate(`/orders/details/${id}`, { replace: true });
    }
  }, [isLoading, orderData, id, navigate, showError, orderStatusOptions]);

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
        laundryShopId: getOrderLaundryShopId(orderData),
        driverInstruction: orderData?.driverInstruction || "",
        addressLine1: orderData?.dropOffAddress?.streetAddress || "",
        addressLine2: orderData?.dropOffAddress?.district || "",
        city: orderData?.dropOffAddress?.city || "",
        postCode: orderData?.dropOffAddress?.postalCode || "",
        country: orderData?.dropOffAddress?.country || "",
        deliveryFee: "0.00",
        driverTip: orderData?.tips?.[0]?.amount || "0.00",
        minimumOrderFee: "0.00",
        serviceCharge: "0.00",
      });

      setDropdowns({
        status:
          orderData?.bookingStatusId !== undefined &&
          orderData?.bookingStatusId !== null
            ? String(orderData.bookingStatusId)
            : "",
        frequency: orderData?.frequency || "Just Once",
        collectionMethod: coerceSelectValue(
          orderData?.driverInstructionOptions,
          COLLECTION_METHOD_OPTIONS,
          COLLECTION_METHOD_OPTIONS[0]
        ),
        deliveryMethod: coerceSelectValue(
          orderData?.driverInstructionOptions1,
          DELIVERY_METHOD_OPTIONS,
          DELIVERY_METHOD_OPTIONS[0]
        ),
        collectionDriverId:
          orderData?.driverId !== undefined && orderData?.driverId !== null
            ? String(orderData.driverId)
            : "",
        deliveryDriverId:
          orderData?.deliveryDriverId !== undefined &&
          orderData?.deliveryDriverId !== null
            ? String(orderData.deliveryDriverId)
            : "",
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
          dropdowns.collectionMethod || COLLECTION_METHOD_OPTIONS[0],
        driverInstructionOptions1:
          dropdowns.deliveryMethod || DELIVERY_METHOD_OPTIONS[0],
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
        tipAmount: formData.driverTip || "0.00",
        ...(dropdowns.status
          ? { bookingStatusId: Number(dropdowns.status) }
          : {}),
        ...(dropdowns.collectionDriverId
          ? { driverId: Number(dropdowns.collectionDriverId) }
          : { driverId: null }),
        ...(dropdowns.deliveryDriverId
          ? { deliveryDriverId: Number(dropdowns.deliveryDriverId) }
          : { deliveryDriverId: null }),
        ...(formData.laundryShopId
          ? { laundryShopId: Number(formData.laundryShopId) }
          : {}),
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
      const existingItem = newState[serviceId].items.find((existing) => {
        const existingId = String(existing?.id ?? "");
        return (
          String(existing?.subCategoryId) === String(subCategoryId) &&
          existingId.startsWith("new-")
        );
      });

      if (existingItem) {
        return newState; // Item already exists, don't add duplicate
      }

      // Add the new item
      const newItem = {
        id: `new-${now}-${Math.random()}`, // Unique ID for new items
        sourceServiceId: serviceId,
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
          sourceServiceId: serviceId,
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

  const serviceIdsOrdered = useMemo(() => Object.keys(serviceItems), [serviceItems]);

  useEffect(() => {
    if (!serviceIdsOrdered.length) {
      setSelectedItemsServiceId("");
      return;
    }
    setSelectedItemsServiceId((prev) =>
      prev && serviceIdsOrdered.includes(String(prev)) ? prev : serviceIdsOrdered[0]
    );
  }, [serviceIdsOrdered]);

  useEffect(() => {
    setSelectedItemsCategoryKey("all");
  }, [selectedItemsServiceId]);

  const categoryTabsForSelectedService = useMemo(() => {
    const sid = selectedItemsServiceId;
    const list = sid ? serviceItems[sid]?.items ?? [] : [];
    const seen = new Map();
    list.forEach((it) => {
      const k = editOrderItemCategoryKey(it);
      if (!seen.has(k)) {
        seen.set(k, {
          key: k,
          label: editOrderCategoryTabLabel(it, sid, allServices),
        });
      }
    });
    return Array.from(seen.values());
  }, [selectedItemsServiceId, serviceItems, allServices]);

  const visibleOrderItems = useMemo(() => {
    const sid = selectedItemsServiceId;
    const list = sid ? serviceItems[sid]?.items ?? [] : [];
    if (selectedItemsCategoryKey === "all") return list;
    return list.filter((it) => editOrderItemCategoryKey(it) === selectedItemsCategoryKey);
  }, [selectedItemsServiceId, selectedItemsCategoryKey, serviceItems]);

  const serviceImageById = useMemo(() => {
    const map = {};
    const list = Array.isArray(allServices) ? allServices : [];
    for (const s of list) {
      if (s?.id == null) continue;
      const raw = s.image || s.serviceImg;
      if (!raw) continue;
      const path = String(raw).trim();
      map[String(s.id)] = path.startsWith("http")
        ? path
        : `${BASE_URL}${path.replace(/^\//, "")}`;
    }
    return map;
  }, [allServices]);

  const subtotal = Object.values(serviceItems).reduce(
    (sum, serviceData) =>
      sum +
      serviceData.items.reduce(
        (itemSum, item) => itemSum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
        0
      ),
    0
  );

  const addOnServices =
    addOnServicesResponse?.data?.addOnServices || addOnServicesResponse?.data || [];

  const handleOpenAddOnModal = (serviceId, item) => {
    setAddOnModal({
      open: true,
      serviceId: String(serviceId),
      itemId: item.id,
      itemName: item.itemName || "Item",
      selectedIds: (item.addOnServices || []).map((a) => a.id),
    });
  };

  const handleCloseAddOnModal = () => {
    setAddOnModal({
      open: false,
      serviceId: null,
      itemId: null,
      itemName: "",
      selectedIds: [],
    });
  };

  const bumpOrderItemQuantity = (item, serviceSid, delta) => {
    setServiceItems((prev) => {
      const sid = String(
        serviceSid || item.sourceServiceId || resolveEditOrderItemServiceId(item, prev) || ""
      );
      if (!sid || !prev[sid]) return prev;
      const next = { ...prev, [sid]: { ...prev[sid], items: [...prev[sid].items] } };
      const ii = next[sid].items.findIndex((i) => i.id === item.id);
      if (ii === -1) return prev;
      const q = Math.max(0, (Number(next[sid].items[ii].quantity) || 0) + delta);
      next[sid].items[ii] = { ...next[sid].items[ii], quantity: q };
      return next;
    });
  };

  const handleToggleAddOnSelection = (addOnId) => {
    setAddOnModal((prev) => {
      const hasId = prev.selectedIds.includes(addOnId);
      return {
        ...prev,
        selectedIds: hasId
          ? prev.selectedIds.filter((id) => id !== addOnId)
          : [...prev.selectedIds, addOnId],
      };
    });
  };

  const handleApplyAddOns = () => {
    const selected = addOnServices.filter((s) => addOnModal.selectedIds.includes(s.id));
    setServiceItems((prev) => {
      const newState = { ...prev };
      const sid = String(addOnModal.serviceId);
      const service = newState[sid];
      if (!service) return prev;
      const itemIndex = service.items.findIndex(
        (i) => String(i.id) === String(addOnModal.itemId)
      );
      if (itemIndex === -1) return prev;
      const nextItems = [...service.items];
      nextItems[itemIndex] = {
        ...nextItems[itemIndex],
        addOnServices: selected.map((s) => ({
          id: s.id,
          name: s.name,
          price: Number(s.price) || 0,
        })),
      };
      newState[sid] = { ...service, items: nextItems };
      return newState;
    });
    handleCloseAddOnModal();
  };

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
  const frequencyOptions = [
    "Just Once",
    "Every week",
    "Every two weeks",
    "Every four weeks",
  ];
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
                <ButtonWhite onClick={handleCancel} disabled={isSaving} size="medium">
                  Cancel
                </ButtonWhite>
                <ButtonBlue onClick={handleSave} disabled={isSaving} size="medium">
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
                      displayEmpty
                      sx={SELECT_FIELD_SX}
                      MenuProps={{
                        PaperProps: {
                          sx: { maxHeight: 280 },
                        },
                      }}
                    >
                      {orderStatusOptions.length ? (
                        orderStatusOptions.map((option) => (
                          <MenuItem key={option.id} value={String(option.id)}>
                            {option.title}
                          </MenuItem>
                        ))
                      ) : (
                        <MenuItem value="" disabled>
                          No status available
                        </MenuItem>
                      )}
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
                    <Typography sx={FIELD_LABEL_SX}>Shop</Typography>
                    <Select
                      value={formData.laundryShopId}
                      onChange={(e) =>
                        handleInputChange("laundryShopId", e.target.value)
                      }
                      size="small"
                      displayEmpty
                      disabled={shopsLoading && shopSelectOptions.length === 0}
                      sx={SELECT_FIELD_SX}
                      MenuProps={{
                        PaperProps: {
                          sx: { maxHeight: 280 },
                        },
                      }}
                    >
                      <MenuItem value="" disabled>
                        Select shop
                      </MenuItem>
                      {shopSelectOptions.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Collection method</Typography>
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
                      MenuProps={{
                        PaperProps: {
                          sx: { maxHeight: 280 },
                        },
                      }}
                    >
                      {COLLECTION_METHOD_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={FIELD_LABEL_SX}>Delivery method</Typography>
                    <Select
                      value={dropdowns.deliveryMethod}
                      onChange={(e) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          deliveryMethod: e.target.value,
                        }))
                      }
                      size="small"
                      sx={SELECT_FIELD_SX}
                      MenuProps={{
                        PaperProps: {
                          sx: { maxHeight: 280 },
                        },
                      }}
                    >
                      {DELIVERY_METHOD_OPTIONS.map((option) => (
                        <MenuItem key={option} value={option}>
                          {option}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box sx={{ gridColumn: { xs: "1", md: "span 2" } }}>
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

                <Box sx={{ borderTop: "1px solid #F1F5F9" }}>
                  <Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}>
                    <Typography sx={{ ...FIELD_LABEL_SX, mb: 1.25 }}>Select service</Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1.25,
                        overflowX: "auto",
                        pb: 0.5,
                        scrollbarWidth: "thin",
                      }}
                    >
                      {Object.entries(serviceItems).map(([serviceId, serviceData]) => {
                        const active = String(serviceId) === String(selectedItemsServiceId);
                        const imgUrl = serviceImageById[String(serviceId)] || "";
                        const initial = (serviceData.serviceName || "?").trim().charAt(0).toUpperCase();
                        return (
                          <Box
                            key={serviceId}
                            component="button"
                            type="button"
                            onClick={() => setSelectedItemsServiceId(String(serviceId))}
                            sx={{
                              flex: "0 0 auto",
                              minWidth: 92,
                              maxWidth: 112,
                              px: 1.25,
                              py: 1.25,
                              borderRadius: "12px",
                              border: active ? "1px solid #93C5FD" : "1px solid #E2E8F0",
                              bgcolor: active ? "#EFF6FF" : "#F8FAFC",
                              cursor: "pointer",
                              fontFamily: "Switzer",
                              transition: "background-color 0.15s ease, border-color 0.15s ease",
                              "&:hover": {
                                bgcolor: active ? "#DBEAFE" : "#F1F5F9",
                                borderColor: active ? "#60A5FA" : "#CBD5E1",
                              },
                            }}
                          >
                            <Box
                              sx={{
                                position: "relative",
                                width: 48,
                                height: 48,
                                mx: "auto",
                                mb: 1,
                                borderRadius: "10px",
                                overflow: "hidden",
                                bgcolor: "#EEF2FF",
                                border: "1px solid #E2E8F0",
                              }}
                            >
                              <Typography
                                sx={{
                                  position: "absolute",
                                  inset: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 15,
                                  fontWeight: 400,
                                  color: "#94A3B8",
                                  zIndex: 0,
                                }}
                              >
                                {initial}
                              </Typography>
                              {imgUrl ? (
                                <Box
                                  component="img"
                                  src={imgUrl}
                                  alt=""
                                  sx={{
                                    position: "absolute",
                                    inset: 0,
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    zIndex: 1,
                                  }}
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : null}
                            </Box>
                            <Typography
                              sx={{
                                fontSize: 12,
                                fontWeight: 400,
                                lineHeight: 1.25,
                                textAlign: "center",
                                color: active ? "#2563EB" : "#64748B",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {serviceData.serviceName}
                            </Typography>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>

                  <Box sx={{ px: 2.5, pb: 1.5 }}>
                    <Typography sx={{ ...FIELD_LABEL_SX, mb: 1 }}>Category</Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2.25,
                        overflowX: "auto",
                        borderBottom: "1px solid #E5E7EB",
                      }}
                    >
                      <Box
                        component="button"
                        type="button"
                        onClick={() => setSelectedItemsCategoryKey("all")}
                        sx={{
                          flex: "0 0 auto",
                          pb: 1.25,
                          border: "none",
                          bgcolor: "transparent",
                          cursor: "pointer",
                          fontFamily: "Switzer",
                          fontWeight: 700,
                          fontSize: 14,
                          color: selectedItemsCategoryKey === "all" ? "#2563EB" : "#64748B",
                          borderBottom: "2px solid",
                          borderBottomColor:
                            selectedItemsCategoryKey === "all" ? "#2563EB" : "transparent",
                          mb: "-1px",
                        }}
                      >
                        All
                      </Box>
                      {categoryTabsForSelectedService.map((tab) => (
                        <Box
                          key={tab.key}
                          component="button"
                          type="button"
                          onClick={() => setSelectedItemsCategoryKey(tab.key)}
                          sx={{
                            flex: "0 0 auto",
                            pb: 1.25,
                            border: "none",
                            bgcolor: "transparent",
                            cursor: "pointer",
                            fontFamily: "Switzer",
                            fontWeight: 700,
                            fontSize: 14,
                            whiteSpace: "nowrap",
                            color:
                              selectedItemsCategoryKey === tab.key ? "#2563EB" : "#64748B",
                            borderBottom: "2px solid",
                            borderBottomColor:
                              selectedItemsCategoryKey === tab.key ? "#2563EB" : "transparent",
                            mb: "-1px",
                          }}
                        >
                          {tab.label}
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Box sx={{ px: 2.5, pb: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                      <Box sx={{ width: 4, height: 22, bgcolor: "#2563EB", borderRadius: 1 }} />
                      <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>
                        {selectedItemsCategoryKey === "all"
                          ? "Items"
                          : categoryTabsForSelectedService.find((t) => t.key === selectedItemsCategoryKey)
                              ?.label || "Items"}
                      </Typography>
                    </Box>

                    {!Object.keys(serviceItems).length ? (
                      <Typography sx={{ color: "#64748B", py: 3, textAlign: "center", fontSize: 14 }}>
                        No services on this order yet.
                      </Typography>
                    ) : visibleOrderItems.length === 0 ? (
                      <Typography sx={{ color: "#64748B", py: 3, textAlign: "center", fontSize: 14 }}>
                        No items in this category.
                      </Typography>
                    ) : (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                        {visibleOrderItems.map((item, index) => {
                          const rowServiceId =
                            resolveEditOrderItemServiceId(item, serviceItems) ||
                            selectedItemsServiceId;
                          const amount =
                            (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                          const svcName = serviceItems[String(rowServiceId)]?.serviceName || "";
                          return (
                            <Box
                              key={item.id || index}
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                alignItems: "stretch",
                                gap: 2,
                                p: 2,
                                borderRadius: "12px",
                                border: "1px solid #E5E7EB",
                                bgcolor: "#fff",
                                boxShadow: "0 1px 2px rgb(0 0 0 / 0.04)",
                              }}
                            >
                              <Box sx={{ flex: "1 1 220px", minWidth: 0 }}>
                                <InputFieldBordered
                                  value={item.itemName}
                                  onChange={(e) => {
                                    const sidUpd = String(rowServiceId);
                                    setServiceItems((prev) => {
                                      const newState = { ...prev };
                                      const bucket = newState[sidUpd];
                                      if (!bucket) return prev;
                                      const ii = bucket.items.findIndex((i) => i.id === item.id);
                                      if (ii !== -1) bucket.items[ii].itemName = e.target.value;
                                      return newState;
                                    });
                                  }}
                                  placeholder="Item name"
                                />
                                <Typography sx={{ mt: 1, fontSize: 13, color: "#64748B" }}>
                                  {svcName}
                                </Typography>
                                <Box sx={{ mt: 0.75, display: "flex", alignItems: "baseline", gap: 0.5 }}>
                                  <InputFieldBordered
                                    type="number"
                                    value={item.unitPrice > 0 ? item.unitPrice.toFixed(2) : ""}
                                    onChange={(e) => {
                                      const newPrice = parseFloat(e.target.value) || 0;
                                      const sidUpd = String(rowServiceId);
                                      setServiceItems((prev) => {
                                        const newState = { ...prev };
                                        const bucket = newState[sidUpd];
                                        if (!bucket) return prev;
                                        const ii = bucket.items.findIndex((i) => i.id === item.id);
                                        if (ii !== -1) bucket.items[ii].unitPrice = newPrice;
                                        return newState;
                                      });
                                    }}
                                    placeholder="0.00"
                                  />
                                  <Typography sx={{ fontSize: 13, color: "#94A3B8", flexShrink: 0 }}>
                                    / piece
                                  </Typography>
                                </Box>
                                <Box sx={{ mt: 1.5 }}>
                                  <Box
                                    component="button"
                                    type="button"
                                    onClick={() => handleOpenAddOnModal(rowServiceId, item)}
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 0.75,
                                      px: 1.5,
                                      py: 0.65,
                                      borderRadius: "999px",
                                      border: "1px solid #CBD5E1",
                                      bgcolor: "#fff",
                                      color: "#2563EB",
                                      fontFamily: "Switzer",
                                      fontSize: 12,
                                      fontWeight: 600,
                                      cursor: "pointer",
                                      "&:hover": { bgcolor: "#F8FAFC" },
                                    }}
                                  >
                                    <TbPlus size={14} />
                                    Add-ons
                                  </Box>
                                  {(item.addOnServices || []).length > 0 && (
                                    <Typography sx={{ mt: 0.75, fontSize: 11, color: "#64748B" }}>
                                      {(item.addOnServices || []).length} add-on
                                      {(item.addOnServices || []).length === 1 ? "" : "s"} selected
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                              <Box
                                sx={{
                                  flex: "0 0 auto",
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "flex-end",
                                  justifyContent: "space-between",
                                  gap: 1.25,
                                  minWidth: 140,
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                                  <IconButton
                                    size="small"
                                    onClick={() => bumpOrderItemQuantity(item, rowServiceId, -1)}
                                    sx={{
                                      border: "1px solid #E2E8F0",
                                      borderRadius: "10px",
                                      width: 36,
                                      height: 36,
                                    }}
                                  >
                                    <Typography sx={{ fontSize: 18, fontWeight: 600, color: "#64748B", lineHeight: 1 }}>
                                      −
                                    </Typography>
                                  </IconButton>
                                  <Box sx={{ width: 56 }}>
                                    <InputFieldBordered
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) => {
                                        const newQuantity = parseInt(e.target.value, 10) || 0;
                                        const sidUpd = String(rowServiceId);
                                        setServiceItems((prev) => {
                                          const newState = { ...prev };
                                          const bucket = newState[sidUpd];
                                          if (!bucket) return prev;
                                          const ii = bucket.items.findIndex((i) => i.id === item.id);
                                          if (ii !== -1) bucket.items[ii].quantity = newQuantity;
                                          return newState;
                                        });
                                      }}
                                      placeholder="0"
                                    />
                                  </Box>
                                  <IconButton
                                    size="small"
                                    onClick={() => bumpOrderItemQuantity(item, rowServiceId, 1)}
                                    sx={{
                                      border: "1px solid #BFDBFE",
                                      borderRadius: "10px",
                                      width: 36,
                                      height: 36,
                                      color: "#2563EB",
                                    }}
                                  >
                                    <TbPlus size={18} />
                                  </IconButton>
                                </Box>
                                <Typography sx={{ fontWeight: 700, fontSize: 16, color: "#0F172A" }}>
                                  ${amount.toFixed(2)}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>

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
                      value={dropdowns.collectionDriverId}
                      onChange={(e) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          collectionDriverId: e.target.value,
                        }))
                      }
                      size="small"
                      disabled={driversLoading && driverSelectOptions.length === 0}
                      sx={SELECT_FIELD_SX}
                      MenuProps={{
                        PaperProps: {
                          sx: { maxHeight: 280 },
                        },
                      }}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {driverSelectOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <Box>
                    <Typography sx={{ ...FIELD_LABEL_SX, mb: 0.4, color: "#059669" }}>Delivery Driver</Typography>
                    <Select
                      value={dropdowns.deliveryDriverId}
                      onChange={(e) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          deliveryDriverId: e.target.value,
                        }))
                      }
                      size="small"
                      disabled={driversLoading && driverSelectOptions.length === 0}
                      sx={SELECT_FIELD_SX}
                      MenuProps={{
                        PaperProps: {
                          sx: { maxHeight: 280 },
                        },
                      }}
                    >
                      <MenuItem value="">Unassigned</MenuItem>
                      {driverSelectOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
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

      <ModalComponent
        open={addOnModal.open}
        title={addOnModal.itemName}
        onClose={handleCloseAddOnModal}
        secondaryAction={{ label: "Skip", onClick: handleCloseAddOnModal }}
        primaryAction={{
          label: "Add to invoice",
          onClick: handleApplyAddOns,
        }}
        width={520}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Typography sx={{ color: "#94A3B8", fontSize: 12 }}>
            Select add-on services (optional)
          </Typography>

          {isLoadingAddOnServices ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="140px">
              <Delay />
            </Box>
          ) : addOnServices.length === 0 ? (
            <Typography sx={{ color: "#64748B", fontSize: 14 }}>
              No add-on services available.
            </Typography>
          ) : (
            <Box sx={{ maxHeight: "280px", overflowY: "auto", pr: 0.5 }}>
              {addOnServices.map((addOn) => {
                const checked = addOnModal.selectedIds.includes(addOn.id);
                return (
                  <Box
                    key={addOn.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      py: 0.8,
                      borderBottom: "1px solid #F1F5F9",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Checkbox
                        checked={checked}
                        onChange={() => handleToggleAddOnSelection(addOn.id)}
                        size="small"
                      />
                      <Typography sx={{ color: "#1E293B", fontSize: 14 }}>
                        {addOn.name}
                      </Typography>
                    </Box>
                    <Typography sx={{ color: "#94A3B8", fontWeight: 500, fontSize: 13 }}>
                      +£{Number(addOn.price || 0).toFixed(2)}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>
      </ModalComponent>
    </LocalizationProvider>
  );
}

