import { useState, useEffect, useRef, useMemo } from "react";
import { Badge, Button, Field, Input, Modal, PageHeader, Select } from "../../../design-system";
import {
  useGetOrderForEditQuery,
  useGetAllServicesQuery,
  useGetServiceDetailWithBookingSelectionQuery,
  useEditOrderMutation,
  useGetAllAddOnServicesQuery,
  useGetShopsDataQuery,
  useGetAllOrderStatusesQuery,
  useGetAllDriverMiniDetailsQuery,
  useLazyInvoiceCreationQuery,
} from "../../../store/services/api";
import useToaster from "../../../components/ui/Toaster";
import { Delay } from "../../../components/shared/Loaders";
import dayjs from "dayjs";
import { TbTrash } from "../../../shared/icons/index";
import { useParams, useNavigate } from "react-router-dom";
import AddItemModal from "./AddItemModal";
import { TbPlus } from "../../../shared/icons/index";
import { canEditOrderFromBooking } from "../../../shared/orderEditStatusGate";
import { formatMoney, joinMediaUrl, resolveDisplayCurrency } from "../../../utilities/formatters";
import { mergeInvoiceDetailsFromResponse } from "../../../utilities/invoiceTotals";
import InvoiceDetailModal from "../invoice/InvoiceDetailModal";
import {
  buildInvoiceView,
  formatInvoiceMoney,
  invoicePrintHtml,
  invoiceStatusTone,
  printHtmlDocument,
} from "../invoice/invoiceView";
import styles from "./editInvoice.module.css";

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

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      onClick={() => onChange?.({ target: { checked: !checked } })}
      style={{ width: 44,
        height: 24,
        borderRadius: 999,
        border: "none",
        background: checked ? "var(--accent)" : "var(--n-300)",
        position: "relative",
        cursor: "pointer",
        padding: 0,
        flexShrink: 0, }}
    >
      <span
        style={{ position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "var(--surface)",
          boxShadow: "0 1px 2px rgba(14, 19, 28, 0.2)",
          transition: "left 0.15s ease", }}
      />
    </button>
  );
}

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

function buildEditBillingData(orderData, formData) {
  const oldServiceCharge = Number(orderData?.billingDetail?.serviceCharge ?? 0);
  const oldMinimum = Number(orderData?.billingDetail?.upfrontAmount ?? 0);
  const oldTotal = Number(
    orderData?.billingDetail?.total ?? orderData?.orderAmount ?? 0
  );
  const oldTip = Number(orderData?.tips?.[0]?.amount ?? 0);
  const newServiceCharge = parseFloat(formData.serviceCharge) || 0;
  const newMinimum = parseFloat(formData.minimumOrderFee) || 0;
  const newTip = parseFloat(formData.driverTip) || 0;
  const discount = Number(orderData?.billingDetail?.discount ?? 0);
  const total = parseFloat(
    (
      oldTotal +
      (newServiceCharge - oldServiceCharge) +
      (newMinimum - oldMinimum) +
      (newTip - oldTip)
    ).toFixed(2)
  );
  return {
    upfrontAmount: newMinimum,
    serviceCharge: newServiceCharge,
    discount,
    total,
  };
}

export default function EditOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: orderResponse, isLoading } = useGetOrderForEditQuery(id, {
    skip: !id,
  });
  const { data: serviceDetailResponse } = useGetServiceDetailWithBookingSelectionQuery(id, {
    skip: !id,
  });
  const { data: servicesResponse } = useGetAllServicesQuery();
  const { data: statusesResponse } = useGetAllOrderStatusesQuery();
  const { data: shopsResponse, isLoading: shopsLoading } = useGetShopsDataQuery();
  const { data: driversResponse, isLoading: driversLoading } = useGetAllDriverMiniDetailsQuery();
  const [fetchInvoice, { isFetching: isFetchingInvoice }] = useLazyInvoiceCreationQuery();
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

  const serviceDetailData = serviceDetailResponse?.data;
  const serviceDetailsList = useMemo(
    () => serviceDetailData?.serviceDetails || [],
    [serviceDetailData?.serviceDetails]
  );
  const bookingSelectedServices = useMemo(
    () => serviceDetailData?.bookingSelectedServices || [],
    [serviceDetailData?.bookingSelectedServices]
  );
  const allServices = useMemo(
    () =>
      serviceDetailsList.length
        ? serviceDetailsList.map((row) => row?.service).filter(Boolean)
        : servicesResponse?.data?.services || [],
    [serviceDetailsList, servicesResponse?.data?.services]
  );
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
  const [serviceDrawer, setServiceDrawer] = useState({
    open: false,
    serviceId: "",
  });
  const [confirmedServiceIds, setConfirmedServiceIds] = useState(new Set());
  const [invoiceModal, setInvoiceModal] = useState({
    open: false,
    format: "a4",
    previewOpen: false,
  });
  const [invoiceDetails, setInvoiceDetails] = useState(null);
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
        driverTip: orderData?.tips?.[0]?.amount != null
          ? Number(orderData.tips[0].amount).toFixed(2)
          : "0.00",
        minimumOrderFee: orderData?.billingDetail?.upfrontAmount != null
          ? Number(orderData.billingDetail.upfrontAmount).toFixed(2)
          : "0.00",
        serviceCharge: orderData?.billingDetail?.serviceCharge != null
          ? Number(orderData.billingDetail.serviceCharge).toFixed(2)
          : "0.00",
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

      Object.entries(serviceItems).forEach(([serviceId, serviceData]) => {
        const parsedServiceId = parseInt(serviceId);

        // Get preferences from items
        serviceData.items.forEach((item) => {
          // Check if item has preferences with preferenceIds array
          if (item.preferences && item.preferences.preferenceIds && Array.isArray(item.preferences.preferenceIds) && item.preferences.preferenceIds.length > 0) {
            // Add each preference with its IDs
            // All preferences here are already validated in AddItemModal to be configured for the service
            item.preferences.preferenceIds.forEach((prefId) => {
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

                preferencesArray.push(preferenceEntry);
              }
            });
          }
        });
      });

      // Build services array from confirmed selections.
      const services = Array.from(confirmedServiceIds).map((serviceId) => ({
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
        billingData: buildEditBillingData(orderData, formData),
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

      newState[serviceId].items.push(newItem);

      return newState;
    });
  };

  // Initialize service items from orderData (only once when orderData is first loaded)
  useEffect(() => {
    if (!serviceDetailsList.length || isInitialized.current) return;
    const items = {};

    serviceDetailsList.forEach((serviceRow) => {
      const serviceId = serviceRow?.serviceId;
      if (serviceId == null) return;
      items[serviceId] = {
        serviceName: serviceRow?.service?.name || "Other",
        items: [],
      };

      (serviceRow?.categories || []).forEach((catRow) => {
        (catRow?.subCategories || []).forEach((sub) => {
          items[serviceId].items.push({
            id: `catalog-${serviceId}-${catRow?.categoryId}-${sub?.id}`,
            sourceServiceId: serviceId,
            itemName: sub?.name || catRow?.category?.name || "Item",
            quantity: 0,
            unitPrice: parseFloat(sub?.price || 0),
            categoryId: catRow?.categoryId,
            subCategoryId: sub?.id,
            preferences: { preferenceIds: [] },
          });
        });
      });
    });

    bookingSelectedServices.forEach((selected) => {
      const serviceId = selected?.serviceId;
      if (serviceId == null) return;
      if (!items[serviceId]) {
        items[serviceId] = {
          serviceName: selected?.service?.name || "Other",
          items: [],
        };
      }

      const selectedPrefIds = (selected?.selectedServicePreferences || [])
        .map((pref) => ({
          preferenceTypeId: pref?.preferenceTypeId,
          preferenceValueId: pref?.preferenceValueId,
        }))
        .filter((pref) => pref.preferenceTypeId && pref.preferenceValueId);

      const existingIndex = items[serviceId].items.findIndex(
        (it) => String(it.subCategoryId) === String(selected?.subCategoryId)
      );

      const mappedItem = {
        id: selected?.id ?? `selected-${serviceId}-${selected?.subCategoryId}`,
        sourceServiceId: serviceId,
        itemName:
          selected?.subCategory?.name ||
          selected?.category?.name ||
          selected?.service?.name ||
          "Item",
        quantity:
          selected?.items !== null && selected?.items !== undefined ? selected.items : 0,
        unitPrice: parseFloat(selected?.categoryPrice || selected?.subCategory?.price || 0),
        categoryId: selected?.categoryId,
        subCategoryId: selected?.subCategoryId,
        preferences: { preferenceIds: selectedPrefIds },
      };

      if (existingIndex >= 0) {
        items[serviceId].items[existingIndex] = {
          ...items[serviceId].items[existingIndex],
          ...mappedItem,
        };
      } else {
        items[serviceId].items.push(mappedItem);
      }
    });

    setServiceItems(items);
    const initiallySelectedIds = serviceDetailsList
      .filter((row) => row?.isSelectedInBooking)
      .map((row) => String(row?.serviceId));
    bookingSelectedServices.forEach((s) => {
      if (s?.serviceId != null) initiallySelectedIds.push(String(s.serviceId));
    });
    setConfirmedServiceIds(new Set(initiallySelectedIds));
    isInitialized.current = true;
  }, [serviceDetailsList, bookingSelectedServices]);

  const selectedServiceIdsSet = useMemo(() => {
    return new Set(Array.from(confirmedServiceIds));
  }, [confirmedServiceIds]);

  const selectedItemsCountByService = useMemo(() => {
    const counts = {};
    Object.entries(serviceItems).forEach(([sid, data]) => {
      counts[sid] = (data?.items || []).reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
    });
    return counts;
  }, [serviceItems]);
  const selectedItemsTotalCount = useMemo(
    () => Object.values(selectedItemsCountByService).reduce((sum, count) => sum + (Number(count) || 0), 0),
    [selectedItemsCountByService]
  );

  const drawerServiceData = serviceDrawer.serviceId ? serviceItems[serviceDrawer.serviceId] : null;
  const drawerSelectedItems = useMemo(() => {
    if (!drawerServiceData?.items) return [];
    return drawerServiceData.items.filter((item) => (Number(item.quantity) || 0) > 0);
  }, [drawerServiceData]);
  const drawerSelectedCount = selectedItemsCountByService[String(serviceDrawer.serviceId)] || 0;

  const openServiceDrawer = (serviceId) => {
    const sid = String(serviceId || "");
    if (!sid) return;
    setServiceDrawer({ open: true, serviceId: sid });
  };

  const closeServiceDrawer = () => {
    setServiceDrawer((prev) => ({ ...prev, open: false }));
  };

  const handleSelectService = () => {
    const sid = String(serviceDrawer.serviceId || "");
    if (!sid) return;
    const qtyCount = selectedItemsCountByService[sid] || 0;
    if (qtyCount <= 0) {
      showError("Please select item quantity first.");
      return;
    }
    setConfirmedServiceIds((prev) => {
      const next = new Set(prev);
      next.add(sid);
      return next;
    });
    closeServiceDrawer();
  };

  const handleRemoveDrawerItem = (serviceSid, itemId) => {
    const sid = String(serviceSid || "");
    if (!sid) return;
    setServiceItems((prev) => {
      if (!prev[sid]) return prev;
      const next = { ...prev, [sid]: { ...prev[sid], items: [...prev[sid].items] } };
      const ii = next[sid].items.findIndex((i) => i.id === itemId);
      if (ii === -1) return prev;
      next[sid].items[ii] = { ...next[sid].items[ii], quantity: 0 };
      return next;
    });
  };

  const handleRemoveServiceSelection = () => {
    const sid = String(serviceDrawer.serviceId || "");
    if (!sid) return;
    setConfirmedServiceIds((prev) => {
      const next = new Set(prev);
      next.delete(sid);
      return next;
    });
    closeServiceDrawer();
  };

  const invoiceView = useMemo(
    () => buildInvoiceView(invoiceDetails, shopName),
    [invoiceDetails, shopName]
  );

  const handleOpenInvoiceModal = async () => {
    try {
      const response = await fetchInvoice(Number(id)).unwrap();
      const details = mergeInvoiceDetailsFromResponse(response?.data);
      if (!details) {
        showError("Invoice details not found.");
        return;
      }
      setInvoiceDetails(details);
      setInvoiceModal({ open: true, format: "a4", previewOpen: false });
    } catch (err) {
      showError(err?.data?.message || "Failed to fetch invoice details.");
    }
  };

  const handleCloseInvoiceModal = () => {
    setInvoiceModal((prev) => ({ ...prev, open: false, previewOpen: false }));
  };

  const handlePrintInvoice = () => {
    if (!invoiceView) return;
    printHtmlDocument(invoicePrintHtml(invoiceView, invoiceModal.format));
  };

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
      map[String(s.id)] = joinMediaUrl(path);
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
  const moneySymbol = resolveDisplayCurrency(
    orderData?.paymentSummary ?? orderData,
    { applyDefault: true }
  ).symbol;

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

  const frequencyOptions = [
    "Just Once",
    "Every week",
    "Every two weeks",
    "Every four weeks",
  ];
  const billingPreview = buildEditBillingData(orderData, formData);
  const customerName = `${orderData?.customer?.firstName || ""} ${orderData?.customer?.lastName || ""}`.trim();
  const statusTitle =
    orderStatusOptions.find((option) => String(option.id) === String(dropdowns.status))?.title ||
    orderData?.bookingStatus?.title ||
    "";
  return (
    <>
      {isLoading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
          <Delay />
        </div>
      ) : orderData ? (
        <div className={styles.page}>
          <div>
            <PageHeader
              title="Edit Invoice"
              description={`#${orderData.orderTrackId || orderData.id}${shopName ? ` · ${shopName}` : ""}`}
              actions={
                <Button
                  variant="secondary"
                  onClick={handleOpenInvoiceModal}
                  disabled={isFetchingInvoice}
                >
                  {isFetchingInvoice ? "Loading..." : "View invoice"}
                </Button>
              }
            />
            <div className={styles.headerMeta}>
              {statusTitle ? <Badge tone={invoiceStatusTone(statusTitle)}>{statusTitle}</Badge> : null}
              {customerName ? <Badge tone="neutral">{customerName}</Badge> : null}
              <Badge tone="neutral">{selectedItemsTotalCount} items</Badge>
              <Badge tone="brand">{formatInvoiceMoney(billingPreview.total, moneySymbol)}</Badge>
            </div>
          </div>

          <div className={styles.layout}>
            <div className={styles.stack}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Invoice details</h2>
                </div>
                <div className={`${styles.cardBody} ${styles.grid2}`}>
                  <Field label="Order ID">
                    <Input value={formData.orderNumber} disabled />
                  </Field>
                  <Field label="Status">
                    <Select
                      value={dropdowns.status}
                      onChange={(value) =>
                        setDropdowns((prev) => ({ ...prev, status: value }))
                      }
                      placeholder="No status available"
                      options={orderStatusOptions.map((option) => ({
                        value: String(option.id),
                        label: option.title,
                      }))}
                    />
                  </Field>
                  <Field label="Order Frequency">
                    <Select
                      value={dropdowns.frequency}
                      onChange={(value) =>
                        setDropdowns((prev) => ({ ...prev, frequency: value }))
                      }
                      options={frequencyOptions.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                    />
                  </Field>
                  <Field label="Shop">
                    <Select
                      value={formData.laundryShopId}
                      onChange={(value) => handleInputChange("laundryShopId", value)}
                      disabled={shopsLoading && shopSelectOptions.length === 0}
                      placeholder="Select shop"
                      options={shopSelectOptions}
                    />
                  </Field>
                  <Field label="Collection method">
                    <Select
                      value={dropdowns.collectionMethod}
                      onChange={(value) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          collectionMethod: value,
                        }))
                      }
                      options={COLLECTION_METHOD_OPTIONS.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                    />
                  </Field>
                  <Field label="Delivery method">
                    <Select
                      value={dropdowns.deliveryMethod}
                      onChange={(value) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          deliveryMethod: value,
                        }))
                      }
                      options={DELIVERY_METHOD_OPTIONS.map((option) => ({
                        value: option,
                        label: option,
                      }))}
                    />
                  </Field>
                  <div className={styles.spanAll}>
                    <Field label="Driver Instruction">
                      <Input
                        value={formData.driverInstruction}
                        onChange={(e) => handleInputChange("driverInstruction", e.target.value)}
                        placeholder="N/A"
                      />
                    </Field>
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Schedule</h2>
                  <span className={styles.cardHint}>Times are in local timezone</span>
                </div>
                <div className={`${styles.cardBody} ${styles.scheduleGrid}`}>
                  <p className={styles.scheduleLabel}>Collection</p>
                  <Input
                    type="date"
                    aria-label="Collection date"
                    value={formData.pickupDate ? formData.pickupDate.format("YYYY-MM-DD") : ""}
                    onChange={(e) =>
                      handleInputChange(
                        "pickupDate",
                        e.target.value ? dayjs(e.target.value) : null
                      )
                    }
                  />
                  <Input
                    type="time"
                    aria-label="Collection time"
                    value={formData.pickupTime ? formData.pickupTime.format("HH:mm") : ""}
                    onChange={(e) =>
                      handleInputChange(
                        "pickupTime",
                        e.target.value ? dayjs(`2000-01-01T${e.target.value}`) : null
                      )
                    }
                  />
                  <p className={styles.scheduleLabelDelivery}>Delivery</p>
                  <Input
                    type="date"
                    aria-label="Delivery date"
                    value={formData.deliveryDate ? formData.deliveryDate.format("YYYY-MM-DD") : ""}
                    onChange={(e) =>
                      handleInputChange(
                        "deliveryDate",
                        e.target.value ? dayjs(e.target.value) : null
                      )
                    }
                  />
                  <Input
                    type="time"
                    aria-label="Delivery time"
                    value={formData.deliveryTime ? formData.deliveryTime.format("HH:mm") : ""}
                    onChange={(e) =>
                      handleInputChange(
                        "deliveryTime",
                        e.target.value ? dayjs(`2000-01-01T${e.target.value}`) : null
                      )
                    }
                  />
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Line items</h2>
                  <Badge tone="success">{selectedItemsTotalCount} items</Badge>
                </div>

                <div style={{ borderTop: "1px solid var(--line)" }}>
                  <div className={styles.cardBody} style={{ paddingBottom: 12 }}>
                    <p className={styles.fieldLabel}>Select service</p>
                    <div className={styles.serviceRail}>
                      {Object.entries(serviceItems).map(([serviceId, serviceData]) => {
                        const active = String(serviceId) === String(selectedItemsServiceId);
                        const imgUrl = serviceImageById[String(serviceId)] || "";
                        const isSelected = selectedServiceIdsSet.has(String(serviceId));
                        const initial = (serviceData.serviceName || "?").trim().charAt(0).toUpperCase();
                        return (
                          <button
                            key={serviceId}
                            type="button"
                            className={`${styles.serviceChip}${active ? ` ${styles.serviceChipActive}` : ""}`}
                            onClick={() => {
                              setSelectedItemsServiceId(String(serviceId));
                              if (isSelected) {
                                openServiceDrawer(serviceId);
                              }
                            }}
                          >
                            {isSelected ? <span className={styles.serviceCheck}>✓</span> : null}
                            <div className={styles.serviceThumb}>
                              <p className={styles.serviceInitial}>{initial}</p>
                              {imgUrl ? (
                                <img
                                  src={imgUrl}
                                  alt=""
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : null}
                            </div>
                            <p className={styles.serviceName}>{serviceData.serviceName}</p>
                            <p className={styles.serviceCount}>
                              {selectedItemsCountByService[String(serviceId)] || 0} item(s)
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className={styles.cardBody} style={{ paddingTop: 0, paddingBottom: 12 }}>
                    <p className={styles.fieldLabel}>Category</p>
                    <div className={styles.tabs}>
                      <button
                        type="button"
                        className={`${styles.tab}${selectedItemsCategoryKey === "all" ? ` ${styles.tabActive}` : ""}`}
                        onClick={() => setSelectedItemsCategoryKey("all")}
                      >
                        All
                      </button>
                      {categoryTabsForSelectedService.map((tab) => (
                        <button
                          key={tab.key}
                          type="button"
                          className={`${styles.tab}${selectedItemsCategoryKey === tab.key ? ` ${styles.tabActive}` : ""}`}
                          onClick={() => setSelectedItemsCategoryKey(tab.key)}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={styles.cardBody} style={{ paddingTop: 0 }}>
                    <div className={styles.groupTitle}>
                      <span className={styles.groupTitleMark} aria-hidden />
                      <p>
                        {selectedItemsCategoryKey === "all"
                          ? "Items"
                          : categoryTabsForSelectedService.find((t) => t.key === selectedItemsCategoryKey)
                              ?.label || "Items"}
                      </p>
                    </div>

                    {!Object.keys(serviceItems).length ? (
                      <p className={styles.empty}>No services on this order yet.</p>
                    ) : visibleOrderItems.length === 0 ? (
                      <p className={styles.empty}>No items in this category.</p>
                    ) : (
                      <div className={styles.itemTable}>
                        <div className={styles.itemHead}>
                          <span>Item</span>
                          <span>Qty</span>
                          <span>Rate</span>
                          <span>Amount</span>
                        </div>
                        {visibleOrderItems.map((item, index) => {
                          const rowServiceId =
                            resolveEditOrderItemServiceId(item, serviceItems) ||
                            selectedItemsServiceId;
                          const amount =
                            (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                          const svcName = serviceItems[String(rowServiceId)]?.serviceName || "";
                          return (
                            <div key={item.id || index} className={styles.itemRow}>
                              <div>
                                <p className={styles.itemTitle}>{item.itemName || "Item"}</p>
                                <p className={styles.itemMeta}>{svcName || "Service"}</p>
                                <div style={{ marginTop: 8 }}>
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleOpenAddOnModal(rowServiceId, item)}
                                  >
                                    <TbPlus size={14} />
                                    Add-ons
                                  </Button>
                                  {(item.addOnServices || []).length > 0 ? (
                                    <p className={styles.itemMeta}>
                                      {(item.addOnServices || []).length} add-on
                                      {(item.addOnServices || []).length === 1 ? "" : "s"} selected
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                              <div className={styles.qty}>
                                <button
                                  type="button"
                                  className={styles.iconBtn}
                                  aria-label="Decrease quantity"
                                  onClick={() => {
                                    openServiceDrawer(rowServiceId);
                                    bumpOrderItemQuantity(item, rowServiceId, -1);
                                  }}
                                >
                                  −
                                </button>
                                <span className={styles.qtyValue}>{Number(item.quantity) || 0}</span>
                                <button
                                  type="button"
                                  className={`${styles.iconBtn} ${styles.iconBtnAccent}`}
                                  aria-label="Increase quantity"
                                  onClick={() => {
                                    openServiceDrawer(rowServiceId);
                                    bumpOrderItemQuantity(item, rowServiceId, 1);
                                  }}
                                >
                                  <TbPlus size={16} />
                                </button>
                              </div>
                              <div className={styles.amount}>
                                {formatMoney(item.unitPrice, moneySymbol)}
                              </div>
                              <div className={styles.amount}>
                                {formatMoney(amount, moneySymbol)}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className={styles.cardBody} style={{ borderTop: "1px solid var(--line)" }}>
                  <Button variant="secondary" onClick={handleOpenAddItemModal}>
                    <TbPlus size={16} />
                    Add item
                  </Button>
                  <div className={styles.totals}>
                    <div className={styles.totalRow}>
                      <span>Services subtotal</span>
                      <strong>{formatMoney(subtotal, moneySymbol)}</strong>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Minimum order fee</span>
                      <strong>{formatMoney(billingPreview.upfrontAmount, moneySymbol)}</strong>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Service charge</span>
                      <strong>{formatMoney(billingPreview.serviceCharge, moneySymbol)}</strong>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Driver tip</span>
                      <strong>{formatMoney(formData.driverTip, moneySymbol)}</strong>
                    </div>
                    <div className={styles.totalRow}>
                      <span>Discount</span>
                      <strong>{formatMoney(billingPreview.discount, moneySymbol)}</strong>
                    </div>
                    <div className={`${styles.totalRow} ${styles.grand}`}>
                      <span>Invoice total</span>
                      <span>{formatMoney(billingPreview.total, moneySymbol)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Delivery address</h2>
                </div>
                <div className={`${styles.cardBody} ${styles.grid2}`}>
                  <Field label="Address Line 1">
                    <Input
                      value={formData.addressLine1}
                      onChange={(e) => handleInputChange("addressLine1", e.target.value)}
                    />
                  </Field>
                  <Field label="Address Line 2">
                    <Input
                      value={formData.addressLine2}
                      onChange={(e) => handleInputChange("addressLine2", e.target.value)}
                    />
                  </Field>
                  <Field label="City">
                    <Input
                      value={formData.city}
                      onChange={(e) => handleInputChange("city", e.target.value)}
                    />
                  </Field>
                  <Field label="Postcode">
                    <Input
                      value={formData.postCode}
                      onChange={(e) => handleInputChange("postCode", e.target.value)}
                    />
                  </Field>
                  <Field label="Country">
                    <Input
                      value={formData.country}
                      onChange={(e) => handleInputChange("country", e.target.value)}
                    />
                  </Field>
                </div>
              </div>
            </div>

            <div className={styles.stack}>
              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Assign drivers</h2>
                </div>
                <div className={styles.cardBody} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <Field label="Collection Driver">
                    <Select
                      value={dropdowns.collectionDriverId}
                      onChange={(value) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          collectionDriverId: value,
                        }))
                      }
                      disabled={driversLoading && driverSelectOptions.length === 0}
                      placeholder="Unassigned"
                      options={[
                        { value: "", label: "Unassigned" },
                        ...driverSelectOptions,
                      ]}
                    />
                  </Field>
                  <Field label="Delivery Driver">
                    <Select
                      value={dropdowns.deliveryDriverId}
                      onChange={(value) =>
                        setDropdowns((prev) => ({
                          ...prev,
                          deliveryDriverId: value,
                        }))
                      }
                      disabled={driversLoading && driverSelectOptions.length === 0}
                      placeholder="Unassigned"
                      options={[
                        { value: "", label: "Unassigned" },
                        ...driverSelectOptions,
                      ]}
                    />
                  </Field>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Fees & charges</h2>
                </div>
                <div className={styles.cardBody} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Field label={`Delivery Fee (${moneySymbol})`}>
                    <Input
                      value={formData.deliveryFee}
                      onChange={(e) => handleInputChange("deliveryFee", e.target.value)}
                    />
                  </Field>
                  <Field label={`Driver Tip (${moneySymbol})`}>
                    <Input
                      value={formData.driverTip}
                      onChange={(e) => handleInputChange("driverTip", e.target.value)}
                    />
                  </Field>
                  <Field label={`Minimum Order Fee (${moneySymbol})`}>
                    <Input
                      value={formData.minimumOrderFee}
                      onChange={(e) => handleInputChange("minimumOrderFee", e.target.value)}
                    />
                  </Field>
                  <Field label={`Service Charge (${moneySymbol})`}>
                    <Input
                      value={formData.serviceCharge}
                      onChange={(e) => handleInputChange("serviceCharge", e.target.value)}
                    />
                  </Field>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Settings</h2>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.settingRow}>
                    <div>
                      <p className={styles.settingTitle}>Notify Customer</p>
                      <p className={styles.settingHint}>Send update SMS/email</p>
                    </div>
                    <Toggle checked={settings.notifyCustomer} onChange={(e) => setSettings((prev) => ({ ...prev, notifyCustomer: e.target.checked }))} />
                  </div>
                  <div className={styles.settingRow}>
                    <div>
                      <p className={styles.settingTitle}>Notify Driver</p>
                      <p className={styles.settingHint}>Push notification to driver app</p>
                    </div>
                    <Toggle checked={settings.notifyDriver} onChange={(e) => setSettings((prev) => ({ ...prev, notifyDriver: e.target.checked }))} />
                  </div>
                  <div className={styles.settingRow}>
                    <div>
                      <p className={styles.settingTitle}>Priority Order</p>
                      <p className={styles.settingHint}>Flag as high priority</p>
                    </div>
                    <Toggle checked={settings.priorityOrder} onChange={(e) => setSettings((prev) => ({ ...prev, priorityOrder: e.target.checked }))} />
                  </div>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Admin notes</h2>
                </div>
                <div className={styles.cardBody}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>
                    {orderData?.driverInstruction || "No admin notes added for this order."}
                  </p>
                </div>
              </div>

              <div className={styles.card}>
                <div className={styles.cardHead}>
                  <h2>Danger zone</h2>
                </div>
                <div className={styles.cardBody}>
                  <Button variant="danger">Cancel Order</Button>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.stickyBar}>
            <div className={styles.stickyMeta}>
              <p>
                Invoice total <strong>{formatMoney(billingPreview.total, moneySymbol)}</strong>
                {customerName ? ` · ${customerName}` : ""}
              </p>
            </div>
            <div className={styles.stickyActions}>
              <Button variant="secondary" onClick={handleCancel} disabled={isSaving}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save invoice"}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.centerEmpty}>
          <p className={styles.muted}>No order data available</p>
        </div>
      )}

      {/* Add Item Modal */}
      <AddItemModal
        open={addItemModal.open}
        onClose={handleCloseAddItemModal}
        onAddItems={handleAddItems}
        orderData={orderData}
      />

      <Modal
        open={addOnModal.open}
        title={addOnModal.itemName}
        onClose={handleCloseAddOnModal}
        secondaryLabel="Skip"
        primaryLabel="Add to invoice"
        onPrimary={handleApplyAddOns}
        size="md"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <p className={styles.addOnHint}>Select add-on services (optional)</p>

          {isLoadingAddOnServices ? (
            <div className={styles.centerEmpty} style={{ minHeight: 140 }}>
              <Delay />
            </div>
          ) : addOnServices.length === 0 ? (
            <p className={styles.muted}>No add-on services available.</p>
          ) : (
            <div className={styles.addOnList}>
              {addOnServices.map((addOn) => {
                const checked = addOnModal.selectedIds.includes(addOn.id);
                return (
                  <label key={addOn.id} className={styles.addOnRow}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleAddOnSelection(addOn.id)}
                      />
                      <span>{addOn.name}</span>
                    </span>
                    <p className={styles.addOnPrice}>
                      +{formatMoney(addOn.price, moneySymbol)}
                    </p>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </Modal>

      <InvoiceDetailModal
        open={invoiceModal.open}
        view={invoiceView}
        format={invoiceModal.format}
        onFormatChange={(format) => setInvoiceModal((prev) => ({ ...prev, format }))}
        onClose={handleCloseInvoiceModal}
        onPrint={handlePrintInvoice}
      />

      <Modal
        open={serviceDrawer.open}
        title="Service selection"
        description={`${drawerServiceData?.serviceName || "Service"} · ${drawerSelectedCount} selected`}
        onClose={closeServiceDrawer}
        size="md"
        danger={drawerSelectedCount <= 0}
        primaryLabel={drawerSelectedCount <= 0 ? "Remove service" : "Select service"}
        secondaryLabel="Cancel"
        onPrimary={drawerSelectedCount <= 0 ? handleRemoveServiceSelection : handleSelectService}
      >
        {drawerSelectedItems.length === 0 ? (
          <p className={styles.muted}>
            No items selected yet. Increase quantity from the item list.
          </p>
        ) : (
          <div className={styles.pickList}>
            {drawerSelectedItems.map((item) => {
              const qty = Number(item.quantity) || 0;
              const unit = Number(item.unitPrice) || 0;
              return (
                <div key={`drawer-${item.id}`} className={styles.pickRow}>
                  <div className={styles.pickCopy}>
                    <p className={styles.pickName}>{item.itemName}</p>
                    <p className={styles.pickMeta}>
                      {qty} × {formatMoney(unit, moneySymbol)}
                    </p>
                  </div>
                  <div className={styles.pickActions}>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      aria-label={`Decrease ${item.itemName}`}
                      onClick={() => bumpOrderItemQuantity(item, serviceDrawer.serviceId, -1)}
                    >
                      −
                    </button>
                    <span className={styles.qtyBox}>{qty}</span>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnAccent}`}
                      aria-label={`Increase ${item.itemName}`}
                      onClick={() => bumpOrderItemQuantity(item, serviceDrawer.serviceId, 1)}
                    >
                      <TbPlus size={16} />
                    </button>
                    <button
                      type="button"
                      className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                      aria-label={`Remove ${item.itemName}`}
                      onClick={() => handleRemoveDrawerItem(serviceDrawer.serviceId, item.id)}
                    >
                      <TbTrash size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}

