import { createApi } from "@reduxjs/toolkit/query/react";
import baseQueryWithReauth from "./baseQueryWithReauth";

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ServiceConfig", "SupportContact", "PlatformOperationalHours", "Orders", "Coupons", "Banners", "AccountDeletionReasons", "ReviewReasonCodes", "ShopReviews", "ShopRatingsReport", "PendingAgents", "RejectedAgents", "AgentSettlement", "NotifyLogs", "PaymentFailures", "AdminNotificationPreferences", "ActionRequiredOrders"],

  endpoints: (builder) => {
    const normalizeServiceId = (id) => {
      if (id == null || id === "") return undefined;
      const numericId = Number(id);
      return Number.isNaN(numericId) ? undefined : numericId;
    };

    const orderListQueryParams = (params = {}) => {
      const {
        page = 1,
        limit = 25,
        zoneId,
        status,
        startDate,
        endDate,
        search,
        includeCounts,
      } = params;
      const q = { page, limit };
      if (zoneId != null && String(zoneId).trim() !== "") q.zoneId = zoneId;
      if (status != null && String(status).trim() !== "") q.status = status;
      if (startDate) q.startDate = startDate;
      if (endDate) q.endDate = endDate;
      if (search != null && String(search).trim() !== "") q.search = String(search).trim();
      if (includeCounts === true || includeCounts === 1 || includeCounts === "1") {
        q.includeCounts = 1;
      }
      return q;
    };

    return {
    // Report query helper
    // Supported params:
    // period=today|this_week|this_month|all|custom
    // startDate/endDate when period=custom
    // zoneId, search, page, limit
    // eslint-disable-next-line no-unused-vars
    adminLogin: builder.mutation({
      query: (body) => ({
        url: "admin/adminSignIn",
        method: "POST",
        body,
      }),
    }),

    zoneAdminLogin: builder.mutation({
      query: (body) => ({
        url: "admin/zoneAdminSignIn",
        method: "POST",
        body,
      }),
    }),

    getAllServices: builder.query({
      query: () => ({
        url: `admin/getServices`,
        method: "GET",
      }),
    }),

    getAllAddOnServices: builder.query({
      query: () => ({
        url: "admin/getAllAddOnServices",
        method: "GET",
      }),
    }),

    getAddOnServiceById: builder.query({
      query: (addOnServiceId) => ({
        url: `admin/getAddOnServiceById/${addOnServiceId}`,
        method: "GET",
      }),
    }),

    createAddOnService: builder.mutation({
      query: (body) => ({
        url: "admin/createAddOnService",
        method: "POST",
        body,
      }),
    }),

    updateAddOnService: builder.mutation({
      query: ({ addOnServiceId, body }) => ({
        url: `admin/updateAddOnService/${addOnServiceId}`,
        method: "PATCH",
        body,
      }),
    }),

    updateAddOnServicesSortOrder: builder.mutation({
      query: ({ addOnServices: items }) => ({
        url: "admin/updateAddOnServicesSortOrder",
        method: "PATCH",
        body: { addOnServices: items },
      }),
    }),

    deleteAddOnService: builder.mutation({
      query: (addOnServiceId) => ({
        url: `admin/deleteAddOnService/${addOnServiceId}`,
        method: "DELETE",
      }),
    }),

    getAllAddOnCategories: builder.query({
      query: (params = {}) => ({
        url: "admin/getAllAddOnCategories",
        method: "GET",
        params,
      }),
    }),

    getAddOnCategoryById: builder.query({
      query: (addOnCategoryId) => ({
        url: `admin/getAddOnCategoryById/${addOnCategoryId}`,
        method: "GET",
      }),
    }),

    createAddOnCategory: builder.mutation({
      query: (body) => ({
        url: "admin/createAddOnCategory",
        method: "POST",
        body,
      }),
    }),

    updateAddOnCategory: builder.mutation({
      query: ({ addOnCategoryId, body }) => ({
        url: `admin/updateAddOnCategory/${addOnCategoryId}`,
        method: "PATCH",
        body,
      }),
    }),

    updateAddOnCategoriesSortOrder: builder.mutation({
      query: ({ addOnCategories: items }) => ({
        url: "admin/updateAddOnCategoriesSortOrder",
        method: "PATCH",
        body: { addOnCategories: items },
      }),
    }),

    deleteAddOnCategory: builder.mutation({
      query: (addOnCategoryId) => ({
        url: `admin/deleteAddOnCategory/${addOnCategoryId}`,
        method: "DELETE",
      }),
    }),

    dashboardData: builder.query({
      query: () => ({
        url: `admin/adminDashboard`,
        method: "GET",
      }),
    }),

    addService: builder.mutation({
      query: (body) => ({
        url: "admin/AddServices",
        method: "POST",
        body,
      }),
    }),

    editService: builder.mutation({
      query: ({ id, body }) => ({
        url: `/admin/editServices/${id}`,
        method: "PATCH",
        body,
      }),
    }),

    deleteService: builder.mutation({
      query: (id) => ({
        url: `/admin/deleteServices/${id}`,
        method: "DELETE",
      }),
    }),

    updateServicesSortOrder: builder.mutation({
      query: (body) => ({
        url: "admin/updateServicesSortOrder",
        method: "PATCH",
        body,
      }),
    }),

    updateCategoriesSortOrder: builder.mutation({
      query: ({ categories: items }) => ({
        url: "admin/updateCategoriesSortOrder",
        method: "PATCH",
        body: { categories: items },
      }),
      invalidatesTags: (result, error, arg) => {
        const tags = [{ type: "ServiceConfig", id: "LIST" }];
        const sid = Number(arg?.serviceId);
        if (sid) tags.push({ type: "ServiceConfig", id: sid });
        return tags;
      },
    }),

    updateSubCategoriesSortOrder: builder.mutation({
      query: ({ subCategories: items }) => ({
        url: "admin/updateSubCategoriesSortOrder",
        method: "PATCH",
        body: { subCategories: items },
      }),
      invalidatesTags: (result, error, arg) => {
        const tags = [{ type: "ServiceConfig", id: "LIST" }];
        const sid = Number(arg?.serviceId);
        if (sid) tags.push({ type: "ServiceConfig", id: sid });
        return tags;
      },
    }),

    getPreferences: builder.query({
      query: () => ({
        url: `admin/getPreferenceTypes`,
        method: "GET",
      }),
    }),

    addPreference: builder.mutation({
      query: (body) => ({
        url: "admin/createPreferenceType",
        method: "POST",
        body,
      }),
    }),

    editPreferenceType: builder.mutation({
      query: ({ id, name, parentPreferenceTypeId }) => ({
        url: `admin/editPreferenceType/${id}`,
        method: "PATCH",
        body: {
          name,
          parentPreferenceTypeId:
            parentPreferenceTypeId === null ||
            parentPreferenceTypeId === "" ||
            parentPreferenceTypeId === undefined
              ? null
              : Number(parentPreferenceTypeId),
        },
      }),
    }),

    deletePreference: builder.mutation({
      query: (id) => ({
        url: `admin/deletePreferenceType/${id}`,
        method: "DELETE",
      }),
    }),

    addPreferenceValue: builder.mutation({
      query: (body) => ({
        url: "admin/addPreferenceValues",
        method: "POST",
        body,
      }),
    }),

    editPreferenceValue: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `admin/editPreferenceValues/${id}`,
        method: "PATCH",
        body: data,
      }),
    }),

    deletePreferenceValue: builder.mutation({
      query: (id) => ({
        url: `admin/deletePreferenceValues/${id}`,
        method: "DELETE",
      }),
    }),

    getCategories: builder.query({
      query: (serviceId) => ({
        url: serviceId
          ? `admin/getcategories?serviceId=${serviceId}`
          : `admin/getcategories`,
        method: "GET",
      }),
    }),

    addCategory: builder.mutation({
      query: (body) => ({
        url: "admin/addCategory",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "ServiceConfig", id: "LIST" }],
    }),

    editCategory: builder.mutation({
      query: ({ categoryId, body }) => ({
        url: `admin/editCategories/${categoryId}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: [{ type: "ServiceConfig", id: "LIST" }],
    }),

    deleteCategory: builder.mutation({
      query: (deletedId) => ({
        url: `admin/deleteCategories/${deletedId}`,
        method: "DELETE",
      }),
    }),

    deleteSubCategory: builder.mutation({
      query: (deletedId) => ({
        url: `admin/deleteSubCategories/${deletedId}`,
        method: "DELETE",
      }),
    }),

    editSubCategory: builder.mutation({
      query: ({ subCatId, body }) => ({
        url: `/admin/editSubCategories/${subCatId}`,
        method: "PATCH",
        body,
      }),
    }),

    getSubCategories: builder.query({
      query: () => ({
        url: `admin/getSubcategories`,
        method: "GET",
      }),
    }),

    addSubCategory: builder.mutation({
      query: (body) => ({
        url: "admin/addSubCategories",
        method: "POST",
        body,
      }),
    }),

    addServiceWithPreferences: builder.mutation({
      query: (body) => ({
        url: "admin/addServiceWithPreferences",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, body) => {
        const serviceId = normalizeServiceId(body?.serviceId);
        return serviceId
          ? [{ type: "ServiceConfig", id: serviceId }]
          : [{ type: "ServiceConfig", id: "LIST" }];
      },
    }),

    addServiceWithCategories: builder.mutation({
      query: (body) => ({
        url: "admin/serviceCategoriesAssign",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, error, body) => {
        const serviceId = normalizeServiceId(body?.serviceId);
        return serviceId
          ? [{ type: "ServiceConfig", id: serviceId }]
          : [{ type: "ServiceConfig", id: "LIST" }];
      },
    }),

    unAssignServiceFromCategories: builder.mutation({
      query: ({ serviceId, categoryIds }) => ({
        url: `admin/unassignServiceFromCategories/${serviceId}`,
        method: "DELETE",
        body: { categoryIds },
      }),
      invalidatesTags: (result, error, args) => {
        const serviceId = normalizeServiceId(args?.serviceId);
        return serviceId
          ? [{ type: "ServiceConfig", id: serviceId }]
          : [{ type: "ServiceConfig", id: "LIST" }];
      },
    }),

    unAssignServiceFromPreferences: builder.mutation({
      query: (serviceId) => ({
        url: `admin/unAssignServiceFromPreferences/${serviceId}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, serviceId) => {
        const normalizedId = normalizeServiceId(serviceId);
        return normalizedId
          ? [{ type: "ServiceConfig", id: normalizedId }]
          : [{ type: "ServiceConfig", id: "LIST" }];
      },
    }),

    getServiceWitPreferences: builder.query({
      query: (id) => ({
        url: `admin/servicesAndPreferencesData/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => {
        const normalizedId = normalizeServiceId(id);
        return normalizedId
          ? [{ type: "ServiceConfig", id: normalizedId }]
          : [{ type: "ServiceConfig", id: "LIST" }];
      },
    }),

    //Customers

    getAllCustomers: builder.query({
      query: () => ({
        url: `admin/getAllCustomers`,
        method: "GET",
      }),
    }),

    getAllCustomersCount: builder.query({
      query: () => ({
        url: `admin/customerCount`,
        method: "GET",
      }),
    }),

    deleteCustomer: builder.mutation({
      query: (id) => ({
        url: `admin/deleteCustomer/${id}`,
        method: "DELETE",
      }),
    }),

    getCustomerById: builder.query({
      query: (id) => ({
        url: `admin/specificCustomerDetails/${id}`,
        method: "GET",
      }),
    }),

    editCustomer: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateCustomer/${id}`,
        method: "PATCH",
        body,
      }),
    }),

    getOrdersCount: builder.query({
      query: (params = {}) => ({
        url: "admin/ordersCount",
        method: "GET",
        params: orderListQueryParams({ ...params, page: 1, limit: 1 }),
      }),
      providesTags: ["Orders"],
      // Avoid refetching on every sidebar/page remount; mutations still invalidate via tags.
      refetchOnMountOrArgChange: 60,
      keepUnusedDataFor: 120,
      transformResponse: (response) => {
        const root = response?.data !== undefined ? response : { data: response };
        const d = root.data && typeof root.data === "object" ? root.data : {};
        const has = (key) => Object.prototype.hasOwnProperty.call(d, key);
        const newOrders = d.newOrders ?? d.NewOrders;
        const legacyMetrics =
          !has("newOrders") &&
          !has("NewOrders") &&
          !has("repeatOrders");
        const activeOrders = has("activeOrders")
          ? d.activeOrders
          : d.pendingOrders;
        return {
          ...root,
          data: {
            ...d,
            newOrders: newOrders ?? 0,
            activeOrders: activeOrders ?? 0,
            repeatOrders: d.repeatOrders ?? 0,
            ordersCountLegacy: legacyMetrics,
          },
        };
      },
    }),

    getAllOrder: builder.query({
      query: (params = {}) => ({
        url: "admin/allOrderDetails",
        method: "GET",
        params: orderListQueryParams(params),
      }),
      providesTags: ["Orders"],
      refetchOnMountOrArgChange: 30,
      keepUnusedDataFor: 60,
    }),

    getPendingOrders: builder.query({
      query: (params = {}) => ({
        url: "admin/pendingOrders",
        method: "GET",
        params: orderListQueryParams(params),
      }),
      providesTags: ["Orders"],
      refetchOnMountOrArgChange: 30,
      keepUnusedDataFor: 60,
    }),

    getBookingAssignableShops: builder.query({
      query: (bookingId) => ({
        url: `admin/bookings/${bookingId}/assignableShops`,
        method: "GET",
      }),
    }),

    assignBookingToShop: builder.mutation({
      query: ({ bookingId, laundryShopId }) => ({
        url: `admin/bookings/${bookingId}/assignShop`,
        method: "PATCH",
        body: { laundryShopId },
      }),
      invalidatesTags: ["Orders"],
    }),

    getAllCompleteOrders: builder.query({
      query: (params = {}) => ({
        url: "admin/completeOrders",
        method: "GET",
        params: orderListQueryParams(params),
      }),
      providesTags: ["Orders"],
      refetchOnMountOrArgChange: 30,
      keepUnusedDataFor: 60,
    }),

    getCancelledOrders: builder.query({
      query: (params = {}) => ({
        url: "admin/allCancelOrders",
        method: "GET",
        params: orderListQueryParams(params),
      }),
      providesTags: ["Orders"],
      refetchOnMountOrArgChange: 30,
      keepUnusedDataFor: 60,
    }),

    getOnHoldBookings: builder.query({
      query: (params = {}) => ({
        url: "admin/getOnHoldBookings",
        method: "GET",
        params: orderListQueryParams(params),
      }),
      providesTags: ["Orders"],
      refetchOnMountOrArgChange: 30,
      keepUnusedDataFor: 60,
    }),

    getPaymentFailures: builder.query({
      query: () => ({
        url: "admin/payment-failures",
        method: "GET",
      }),
      providesTags: ["PaymentFailures"],
    }),

    getActionRequiredOrders: builder.query({
      query: (params = {}) => ({
        url: "admin/action-required-orders",
        method: "GET",
        params,
      }),
      providesTags: ["ActionRequiredOrders", "PaymentFailures", "Orders"],
      refetchOnMountOrArgChange: true,
    }),

    resolvePaymentFailure: builder.mutation({
      query: ({ bookingId, body }) => ({
        url: `admin/payment-failures/${bookingId}/resolve`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PaymentFailures", "Orders"],
    }),

    getAllOrderStatuses: builder.query({
      query: () => ({
        url: "admin/allOrderStatuses",
        method: "GET",
      }),
      refetchOnMountOrArgChange: 300,
      keepUnusedDataFor: 600,
    }),

    getShopsData: builder.query({
      query: (params = {}) => ({
        url: "admin/getShopsData",
        method: "GET",
        params,
      }),
    }),

    getShopDetails: builder.query({
      query: (id) => ({
        url: `admin/singleShopData/${id}`,
        method: "GET",
      }),
    }),

    addShop: builder.mutation({
      query: (body) => ({
        url: "admin/addLaundryShop",
        method: "POST",
        body,
      }),
    }),

    // Agent registration flow (sequence: 1 register, 2 address, 3 business info)
    registerAgent: builder.mutation({
      query: (body) => ({
        url: "admin/registerAgent",
        method: "POST",
        body,
      }),
    }),

    getPendingAgents: builder.query({
      query: () => ({
        url: "admin/pendingAgents",
        method: "GET",
      }),
      providesTags: ["PendingAgents"],
    }),

    getRejectedAgents: builder.query({
      query: () => ({
        url: "admin/rejectedAgents",
        method: "GET",
      }),
      providesTags: ["RejectedAgents"],
    }),

    updateAgentApproval: builder.mutation({
      query: ({ agentId, body }) => ({
        url: `admin/agents/${agentId}/approval`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PendingAgents", "RejectedAgents", "Shops"],
    }),

    getAgentsCashDue: builder.query({
      query: (params = {}) => ({
        url: "admin/agents/cash-due",
        method: "GET",
        params,
      }),
      providesTags: ["AgentSettlement"],
    }),

    getPendingRemittances: builder.query({
      query: (params = {}) => ({
        url: "admin/agents/remittances/pending",
        method: "GET",
        params,
      }),
      providesTags: ["AgentSettlement"],
    }),

    getAgentSettlement: builder.query({
      query: (agentId) => ({
        url: `admin/agents/${agentId}/settlement`,
        method: "GET",
      }),
      providesTags: ["AgentSettlement"],
    }),

    getNotifyLogs: builder.query({
      query: (params = {}) => ({
        url: "admin/notify-logs",
        method: "GET",
        params,
      }),
      providesTags: ["NotifyLogs"],
    }),

    searchNotificationRecipients: builder.query({
      query: (params = {}) => ({
        url: "admin/notifications/recipients/search",
        method: "GET",
        params,
      }),
    }),

    previewAdminNotification: builder.mutation({
      query: (body) => ({
        url: "admin/notifications/preview",
        method: "POST",
        body,
      }),
    }),

    sendAdminNotification: builder.mutation({
      query: (body) => ({
        url: "admin/notifications/send",
        method: "POST",
        body,
      }),
    }),

    getAdminNotificationPreferences: builder.query({
      query: () => ({
        url: "admin/notification-preferences",
        method: "GET",
      }),
      providesTags: ["AdminNotificationPreferences"],
    }),

    updateAdminNotificationPreferences: builder.mutation({
      query: (body) => ({
        url: "admin/notification-preferences",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AdminNotificationPreferences"],
    }),

    demoAdminNotificationAlert: builder.mutation({
      query: (body) => ({
        url: "admin/notification-preferences/demo",
        method: "POST",
        body,
      }),
    }),

    registerAdminFcmToken: builder.mutation({
      query: (body) => ({
        url: "admin/notification-preferences/register-fcm",
        method: "POST",
        body,
      }),
    }),

    getServiceComparison: builder.query({
      query: (bookingId) => ({
        url: `admin/bookings/${bookingId}/service-comparison`,
        method: "GET",
      }),
    }),

    confirmCashRemittance: builder.mutation({
      query: ({ remittanceId, body }) => ({
        url: `admin/agents/remittances/${remittanceId}/confirm`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AgentSettlement"],
    }),

    rejectCashRemittance: builder.mutation({
      query: ({ remittanceId, body }) => ({
        url: `admin/agents/remittances/${remittanceId}/reject`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AgentSettlement"],
    }),

    recordCashSettlement: builder.mutation({
      query: ({ agentId, body }) => ({
        url: `admin/agents/${agentId}/cash-settlement`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgentSettlement"],
    }),

    recordAgentPayout: builder.mutation({
      query: ({ agentId, body }) => ({
        url: `admin/agents/${agentId}/payout`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgentSettlement"],
    }),

    recordSettlementAdjustment: builder.mutation({
      query: ({ agentId, body }) => ({
        url: `admin/agents/${agentId}/settlement-adjustment`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgentSettlement"],
    }),

    syncAgentWallets: builder.mutation({
      query: (body = {}) => ({
        url: "admin/agents/wallet-sync",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AgentSettlement"],
    }),

    addAgentAddress: builder.mutation({
      query: ({ userId, body }) => ({
        url: `admin/addAgentAddress/${userId}`,
        method: "POST",
        body,
      }),
    }),
    addAgentBusinessInfo: builder.mutation({
      query: ({ userId, body }) => ({
        url: `admin/addAgentBusinessInfo/${userId}`,
        method: "POST",
        body,
      }),
    }),
    getBusinessInformation: builder.query({
      query: (userId) => ({
        url: `agent/getBussinessInforMation/${userId}`,
        method: "GET",
      }),
    }),

    editShop: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateLaundryShop/${id}`,
        method: "PATCH",
        body,
      }),
    }),

    deleteShop: builder.mutation({
      query: (id) => ({
        url: `admin/deleteShop/${id}`,
        method: "DELETE",
      }),
    }),

    getAllZones: builder.query({
      query: () => ({
        url: "admin/getZones",
        method: "GET",
        credentials: "include",
      }),
      refetchOnMountOrArgChange: 300,
      keepUnusedDataFor: 600,
    }),
    getZoneById: builder.query({
      query: (id) => ({
        url: `admin/getZoneById/${id}`,
        method: "GET",
        credentials: "include",
      }),
    }),
    getAllCountries: builder.query({
      query: () => ({
        url: "admin/getCountries",
        method: "GET",
        credentials: "include",
      }),
    }),

    getCitiesByCountryId: builder.query({
      query: (countryId) => ({
        url: `admin/getCitiesByCountryId/${countryId}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getAllCities: builder.query({
      query: () => ({
        url: "admin/getCities",
        method: "GET",
        credentials: "include",
      }),
    }),

    addCountry: builder.mutation({
      query: (body) => ({
        url: "admin/addCountries",
        method: "POST",
        body,
        credentials: "include",
      }),
    }),

    editCountry: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateCountry/${id}`,
        method: "PUT",
        body,
        credentials: "include",
      }),
    }),

    deleteCountry: builder.mutation({
      query: (id) => ({
        url: `admin/deleteCountry/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    addCity: builder.mutation({
      query: (body) => ({
        url: "admin/addCities",
        method: "POST",
        body,
        credentials: "include",
      }),
    }),

    editCity: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateCity/${id}`,
        method: "PUT",
        body,
        credentials: "include",
      }),
    }),

    deleteCity: builder.mutation({
      query: (id) => ({
        url: `admin/deleteCity/${id}`,
        method: "DELETE",
        credentials: "include",
      }),
    }),

    getUnitsDistanceAndCurrency: builder.query({
      query: (type) => ({
        url: `admin/getUnitsDistanceAndCurrency?type=${type}`,
        method: "GET",
        credentials: "include",
      }),
    }),

    getActivePolicies: builder.query({
      query: () => ({
        url: "admin/getActivePolicies",
        method: "GET",
        credentials: "include",
      }),
    }),

    addZone: builder.mutation({
      query: (body) => ({
        url: "admin/addZone",
        method: "POST",
        body,
      }),
    }),

    addZoneByPostcodes: builder.mutation({
      query: (body) => ({
        url: "admin/addZoneByPostcodes",
        method: "POST",
        body,
      }),
    }),

    editZoneByPostcodes: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/editZoneByPostcodes/${id}`,
        method: "PUT",
        body,
      }),
    }),

    deleteZone: builder.mutation({
      query: (zoneId) => ({
        url: `admin/delete-zone?zoneId=${zoneId}`,
        method: "DELETE",
      }),
    }),

    updateDriver: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateDriver/${id}`,
        method: "PATCH",
        body,
      }),
    }),

    addDriverByLaundryShop: builder.mutation({
      query: (body) => ({
        url: "admin/addDriverByLaundryShop",
        method: "POST",
        body,
      }),
    }),

    getAllDriverMiniDetails: builder.query({
      query: () => ({
        url: "admin/allDriverMiniDetails",
        method: "GET",
      }),
    }),

    getSpecificDriverDetail: builder.query({
      query: (driverId) => ({
        url: `admin/specificdriverDetail/${driverId}`,
        method: "GET",
      }),
    }),

    deleteDriver: builder.mutation({
      query: (id) => ({
        url: `admin/deleteDriver/${id}`,
        method: "DELETE",
      }),
    }),

    getOrderForEdit: builder.query({
      query: (orderId) => ({
        url: `admin/getOrderForEdit/${orderId}`,
        method: "GET",
      }),
    }),

    getServiceDetailWithBookingSelection: builder.query({
      query: (bookingId) => ({
        url: `admin/serviceDetailWithBookingSelection/${bookingId}`,
        method: "GET",
      }),
    }),

    getOrderItemsSheet: builder.query({
      query: (bookingId) => ({
        url: `admin/orderItemsSheet?bookingId=${bookingId}`,
        method: "GET",
      }),
    }),

    invoiceCreation: builder.query({
      query: (bookingId) => ({
        url: `admin/invoiceCreation/${bookingId}`,
        method: "GET",
      }),
    }),

    editOrder: builder.mutation({
      query: ({ orderId, body }) => ({
        url: `admin/editOrder/${orderId}`,
        method: "PATCH",
        body,
      }),
    }),

    deleteOrder: builder.mutation({
      query: (id) => ({
        url: `admin/deleteOrder/${id}`,
        method: "DELETE",
      }),
    }),

    getAllEmployeesWithShopInfo: builder.query({
      query: () => ({
        url: "admin/getAllEmployeesWithShopInfo",
        method: "GET",
      }),
    }),

    getAdminEmployees: builder.query({
      query: () => ({
        url: "admin/getAdminEmployess",
        method: "GET",
      }),
    }),

    getAllRoles: builder.query({
      query: (audience) => ({
        url: "admin/getAllRoles",
        method: "GET",
        params: audience ? { audience } : undefined,
      }),
    }),

    getFeatures: builder.query({
      query: () => ({
        url: "admin/getFeatures",
        method: "GET",
      }),
    }),

    addFeature: builder.mutation({
      query: (body) => ({
        url: "admin/addfeatures",
        method: "POST",
        body,
      }),
    }),

    addLaundryRole: builder.mutation({
      query: (body) => ({
        url: "admin/AddLaundryRoles",
        method: "POST",
        body,
      }),
    }),

    updateRole: builder.mutation({
      query: (body) => ({
        url: "admin/updateRoles",
        method: "PUT",
        body,
      }),
    }),

    reportsTopServices: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        if (params.zoneId) q.append("zoneId", params.zoneId);
        if (params.search) q.append("search", params.search);
        if (params.page) q.append("page", params.page);
        if (params.limit) q.append("limit", params.limit);
        const queryString = q.toString();
        return {
          url: queryString ? `admin/reports/top-services?${queryString}` : "admin/reports/top-services",
          method: "GET",
        };
      },
    }),

    reportsHourly: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        const queryString = q.toString();
        return {
          url: queryString ? `admin/reports/hourly?${queryString}` : "admin/reports/hourly",
          method: "GET",
        };
      },
    }),

    reportsOnHold: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        if (params.zoneId) q.append("zoneId", params.zoneId);
        if (params.search) q.append("search", params.search);
        if (params.page) q.append("page", params.page);
        if (params.limit) q.append("limit", params.limit);
        const queryString = q.toString();
        return {
          url: queryString ? `admin/reports/on-hold?${queryString}` : "admin/reports/on-hold",
          method: "GET",
        };
      },
    }),

    reportsServiceDemand: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        const queryString = q.toString();
        return {
          url: queryString ? `admin/reports/service-demand?${queryString}` : "admin/reports/service-demand",
          method: "GET",
        };
      },
    }),

    reportsTopShops: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        const queryString = q.toString();
        return {
          url: queryString ? `admin/reports/top-shops?${queryString}` : "admin/reports/top-shops",
          method: "GET",
        };
      },
    }),

    reportsDailyEarnings: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        if (params.zoneId) q.append("zoneId", params.zoneId);
        const queryString = q.toString();
        return {
          url: queryString ? `admin/reports/daily-earnings?${queryString}` : "admin/reports/daily-earnings",
          method: "GET",
        };
      },
    }),

    reportsDailyEarningsByZone: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        if (params.zoneId) q.append("zoneId", params.zoneId);
        const queryString = q.toString();
        return {
          url: queryString
            ? `admin/reports/daily-earnings/zone?${queryString}`
            : "admin/reports/daily-earnings/zone",
          method: "GET",
        };
      },
    }),

    reportsDailyEarningsByShop: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.period) q.append("period", params.period);
        if (params.period === "custom" && params.startDate) q.append("startDate", params.startDate);
        if (params.period === "custom" && params.endDate) q.append("endDate", params.endDate);
        if (params.zoneId) q.append("zoneId", params.zoneId);
        const queryString = q.toString();
        return {
          url: queryString
            ? `admin/reports/daily-earnings/shop?${queryString}`
            : "admin/reports/daily-earnings/shop",
          method: "GET",
        };
      },
    }),

    addAdminEmployee: builder.mutation({
      query: (body) => ({
        url: "admin/adinEmployeeAdd",
        method: "POST",
        body,
      }),
    }),

    addAgentEmployee: builder.mutation({
      query: (body) => ({
        url: "admin/addAgentEmployee",
        method: "POST",
        body,
      }),
    }),

    updateAgentEmployee: builder.mutation({
      query: (body) => ({
        url: "admin/updateAgentEmployee",
        method: "PATCH",
        body,
      }),
    }),

    deleteAgentEmployee: builder.mutation({
      query: (id) => ({
        url: `admin/deleteAgentEmployee/${id}`,
        method: "DELETE",
      }),
    }),

    updateAdminEmployee: builder.mutation({
      query: (body) => ({
        url: "admin/updateEmployee",
        method: "PATCH",
        body,
      }),
    }),

    updateAdminEmployeeStatus: builder.mutation({
      query: (body) => ({
        url: "admin/updateEmployeeStatus",
        method: "PATCH",
        body,
      }),
    }),

    deleteAdminEmployee: builder.mutation({
      query: (id) => ({
        url: `admin/deleteAdminEmployee/${id}`,
        method: "DELETE",
      }),
    }),

    addCancellationPolicy: builder.mutation({
      query: (body) => ({
        url: "admin/addCancellationPolicy",
        method: "POST",
        body,
      }),
    }),

    getCancellationPolicies: builder.query({
      query: (params = {}) => {
        const { isActive, isDefault, page, limit, zoneId } = params;
        const queryParams = new URLSearchParams();
        
        if (isActive !== undefined && isActive !== null && isActive !== "") {
          queryParams.append("isActive", isActive);
        }
        if (isDefault !== undefined && isDefault !== null && isDefault !== "") {
          queryParams.append("isDefault", isDefault);
        }
        if (zoneId !== undefined && zoneId !== null && zoneId !== "") {
          queryParams.append("zoneId", zoneId);
        }
        if (page !== undefined && page !== null && page !== "") {
          queryParams.append("page", page);
        }
        if (limit !== undefined && limit !== null && limit !== "") {
          queryParams.append("limit", limit);
        }
        
        const queryString = queryParams.toString();
        const url = queryString 
          ? `admin/getCancellationPolicies?${queryString}`
          : "admin/getCancellationPolicies";
        
        return {
          url,
          method: "GET",
        };
      },
    }),

    updateCancellationPolicy: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateCancellationPolicy/${id}`,
        method: "PUT",
        body,
      }),
    }),

    deleteCancellationPolicy: builder.mutation({
      query: (id) => ({
        url: `admin/deleteCancellationPolicy/${id}`,
        method: "DELETE",
      }),
    }),

    createReason: builder.mutation({
      query: (body) => ({
        url: "admin/createReason",
        method: "POST",
        body,
      }),
    }),

    getAllReasons: builder.query({
      query: () => ({
        url: "admin/getAllReasons",
        method: "GET",
      }),
    }),

    deleteReason: builder.mutation({
      query: (reasonId) => ({
        url: `admin/deleteReason/${reasonId}`,
        method: "DELETE",
      }),
    }),

    getAccountDeletionReasons: builder.query({
      query: () => ({
        url: "admin/getAccountDeletionReasons",
        method: "GET",
      }),
      providesTags: ["AccountDeletionReasons"],
    }),

    createAccountDeletionReason: builder.mutation({
      query: (body) => ({
        url: "admin/createAccountDeletionReason",
        method: "POST",
        body,
      }),
      invalidatesTags: ["AccountDeletionReasons"],
    }),

    updateAccountDeletionReason: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateAccountDeletionReason/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["AccountDeletionReasons"],
    }),

    deleteAccountDeletionReason: builder.mutation({
      query: (id) => ({
        url: `admin/deleteAccountDeletionReason/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["AccountDeletionReasons"],
    }),

    getReviewReasonCodes: builder.query({
      query: (params = {}) => ({
        url: "admin/getReviewReasonCodes",
        method: "GET",
        params,
      }),
      providesTags: ["ReviewReasonCodes"],
    }),

    createReviewReasonCode: builder.mutation({
      query: (body) => ({
        url: "admin/createReviewReasonCode",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ReviewReasonCodes"],
    }),

    updateReviewReasonCode: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateReviewReasonCode/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["ReviewReasonCodes"],
    }),

    deleteReviewReasonCode: builder.mutation({
      query: (id) => ({
        url: `admin/deleteReviewReasonCode/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ReviewReasonCodes"],
    }),

    getShopReviews: builder.query({
      query: (params = {}) => ({
        url: "admin/shopReviews",
        method: "GET",
        params,
      }),
      providesTags: ["ShopReviews"],
    }),

    hideShopReview: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/shopReviews/${id}/hide`,
        method: "PATCH",
        body: body || {},
      }),
      invalidatesTags: ["ShopReviews", "ShopRatingsReport"],
    }),

    unhideShopReview: builder.mutation({
      query: (id) => ({
        url: `admin/shopReviews/${id}/unhide`,
        method: "PATCH",
      }),
      invalidatesTags: ["ShopReviews", "ShopRatingsReport"],
    }),

    getShopRatingsReport: builder.query({
      query: (params = {}) => ({
        url: "admin/reports/shop-ratings",
        method: "GET",
        params,
      }),
      providesTags: ["ShopRatingsReport"],
    }),

    getReviewReasonInsights: builder.query({
      query: (params = {}) => ({
        url: "admin/reports/review-reason-insights",
        method: "GET",
        params,
      }),
      providesTags: ["ShopRatingsReport"],
    }),

    addNoShowPolicy: builder.mutation({
      query: (body) => ({
        url: "admin/addNoShowPolicy",
        method: "POST",
        body,
      }),
    }),

    getNoShowPolicies: builder.query({
      query: (params = {}) => {
        const { isActive, isDefault, page, limit, zoneId } = params;
        const queryParams = new URLSearchParams();
        
        if (isActive !== undefined && isActive !== null && isActive !== "") {
          queryParams.append("isActive", isActive);
        }
        if (isDefault !== undefined && isDefault !== null && isDefault !== "") {
          queryParams.append("isDefault", isDefault);
        }
        if (zoneId !== undefined && zoneId !== null && zoneId !== "") {
          queryParams.append("zoneId", zoneId);
        }
        if (page !== undefined && page !== null && page !== "") {
          queryParams.append("page", page);
        }
        if (limit !== undefined && limit !== null && limit !== "") {
          queryParams.append("limit", limit);
        }
        
        const queryString = queryParams.toString();
        const url = queryString 
          ? `admin/getNoShowPolicies?${queryString}`
          : "admin/getNoShowPolicies";
        
        return {
          url,
          method: "GET",
        };
      },
    }),

    updateNoShowPolicy: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateNoShowPolicy/${id}`,
        method: "PUT",
        body,
      }),
    }),

    deleteNoShowPolicy: builder.mutation({
      query: (id) => ({
        url: `admin/deleteNoShowPolicy/${id}`,
        method: "DELETE",
      }),
    }),

    addReschedulePolicy: builder.mutation({
      query: (body) => ({
        url: "admin/addReschedulePolicy",
        method: "POST",
        body,
      }),
    }),

    getReschedulePolicies: builder.query({
      query: (params = {}) => {
        const { isActive, isDefault, page, limit, zoneId } = params;
        const queryParams = new URLSearchParams();
        if (isActive !== undefined && isActive !== null && isActive !== "") {
          queryParams.append("isActive", isActive);
        }
        if (isDefault !== undefined && isDefault !== null && isDefault !== "") {
          queryParams.append("isDefault", isDefault);
        }
        if (zoneId !== undefined && zoneId !== null && zoneId !== "") {
          queryParams.append("zoneId", zoneId);
        }
        if (page !== undefined && page !== null && page !== "") {
          queryParams.append("page", page);
        }
        if (limit !== undefined && limit !== null && limit !== "") {
          queryParams.append("limit", limit);
        }
        const queryString = queryParams.toString();
        const url = queryString
          ? `admin/getReschedulePolicies?${queryString}`
          : "admin/getReschedulePolicies";
        return { url, method: "GET" };
      },
    }),

    getReschedulePolicyById: builder.query({
      query: (id) => ({
        url: `admin/getReschedulePolicy/${id}`,
        method: "GET",
      }),
    }),

    updateReschedulePolicy: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateReschedulePolicy/${id}`,
        method: "PATCH",
        body,
      }),
    }),

    deleteReschedulePolicy: builder.mutation({
      query: (id) => ({
        url: `admin/deleteReschedulePolicy/${id}`,
        method: "DELETE",
      }),
    }),

    getAllFAQs: builder.query({
      query: () => ({
        url: "admin/getAllFAQs",
        method: "GET",
      }),
    }),

    createFAQ: builder.mutation({
      query: (body) => ({
        url: "admin/createFAQ",
        method: "POST",
        body,
      }),
    }),

    updateFAQ: builder.mutation({
      query: ({ faqId, body }) => ({
        url: `admin/updateFAQ/${faqId}`,
        method: "PUT",
        body,
      }),
    }),

    deleteFAQ: builder.mutation({
      query: (faqId) => ({
        url: `admin/deleteFAQ/${faqId}`,
        method: "DELETE",
      }),
    }),

    getAllBlogs: builder.query({
      query: () => ({
        url: "admin/getAllBlogs",
        method: "GET",
      }),
    }),

    deleteBlog: builder.mutation({
      query: (blogId) => ({
        url: `admin/deleteBlog/${blogId}`,
        method: "DELETE",
      }),
    }),

    createBlog: builder.mutation({
      query: (body) => ({
        url: "admin/createBlog",
        method: "POST",
        body,
      }),
    }),

    updateBlog: builder.mutation({
      query: ({ blogId, body }) => ({
        url: `admin/updateBlog/${blogId}`,
        method: "PUT",
        body,
      }),
    }),

    updateSupportContact: builder.mutation({
      query: (body) => ({
        url: "admin/updateSupportContact",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["SupportContact"],
    }),

    getSupportContact: builder.query({
      query: () => ({
        url: "admin/getSupportContact",
        method: "GET",
      }),
      providesTags: ["SupportContact"],
    }),

    getPlatformOperationalHours: builder.query({
      query: (countryId) => ({
        url: `admin/platformOperationalHours?countryId=${countryId}`,
        method: "GET",
      }),
      providesTags: ["PlatformOperationalHours"],
    }),

    updatePlatformOperationalHours: builder.mutation({
      query: (body) => ({
        url: "admin/platformOperationalHours",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["PlatformOperationalHours"],
    }),

    getAllCoupons: builder.query({
      query: ({ page = 1, limit = 10, isActive = true } = {}) => ({
        url: `admin/getAllCoupons?page=${page}&limit=${limit}&isActive=${isActive}`,
        method: "GET",
      }),
      providesTags: ["Coupons"],
    }),

    addCoupon: builder.mutation({
      query: (body) => ({
        url: "admin/addCoupon",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Coupons"],
    }),

    // ─── Banners & Offers ───────────────────────────────────────────────────
    // body is always FormData (multipart) — browser sets Content-Type + boundary automatically
    createBanner: builder.mutation({
      query: (formData) => ({
        url: "admin/createBanner",
        method: "POST",
        body: formData,
        formData: true,
      }),
      invalidatesTags: ["Banners"],
    }),

    getAllBanners: builder.query({
      query: (params = {}) => {
        const q = new URLSearchParams();
        if (params.targetType) q.append("targetType", params.targetType);
        if (params.zoneId)     q.append("zoneId", params.zoneId);
        if (params.isActive !== undefined) q.append("isActive", params.isActive);
        if (params.page)       q.append("page", params.page);
        if (params.limit)      q.append("limit", params.limit);
        const qs = q.toString();
        return {
          url: qs ? `admin/getAllBanners?${qs}` : "admin/getAllBanners",
          method: "GET",
        };
      },
      providesTags: ["Banners"],
    }),

    updateBanner: builder.mutation({
      query: ({ id, body: formData }) => ({
        url: `admin/updateBanner/${id}`,
        method: "PATCH",
        body: formData,
        formData: true,
      }),
      invalidatesTags: ["Banners"],
    }),

    deleteBanner: builder.mutation({
      query: (id) => ({
        url: `admin/deleteBanner/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Banners"],
    }),
    };
  },
});

export const {
  useAdminLoginMutation,
  useZoneAdminLoginMutation,
  useGetAllServicesQuery,
  useGetAllAddOnServicesQuery,
  useGetAddOnServiceByIdQuery,
  useGetPreferencesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useAddServiceMutation,
  useCreateAddOnServiceMutation,
  useUpdateAddOnServiceMutation,
  useUpdateAddOnServicesSortOrderMutation,
  useDeleteAddOnServiceMutation,
  useGetAllAddOnCategoriesQuery,
  useGetAddOnCategoryByIdQuery,
  useCreateAddOnCategoryMutation,
  useUpdateAddOnCategoryMutation,
  useUpdateAddOnCategoriesSortOrderMutation,
  useDeleteAddOnCategoryMutation,
  useAddPreferenceMutation,
  useAddPreferenceValueMutation,
  useAddCategoryMutation,
  useEditCategoryMutation,
  useAddSubCategoryMutation,
  useDeleteServiceMutation,
  useUpdateServicesSortOrderMutation,
  useUpdateCategoriesSortOrderMutation,
  useUpdateSubCategoriesSortOrderMutation,
  useDeletePreferenceMutation,
  useDeleteCategoryMutation,
  useDeletePreferenceValueMutation,
  useEditPreferenceValueMutation,
  useDeleteSubCategoryMutation,
  useEditSubCategoryMutation,
  useEditServiceMutation,
  useEditPreferenceTypeMutation,
  useGetServiceWitPreferencesQuery,
  useAddServiceWithPreferencesMutation,
  useAddServiceWithCategoriesMutation,
  useUnAssignServiceFromCategoriesMutation,
  useUnAssignServiceFromPreferencesMutation,
  useGetAllCustomersQuery,
  useGetAllCustomersCountQuery,
  useGetCustomerByIdQuery,
  useDashboardDataQuery,
  useDeleteCustomerMutation,
  useEditCustomerMutation,
  useGetOrdersCountQuery,
  useGetAllOrderQuery,
  useGetPendingOrdersQuery,
  useGetAllCompleteOrdersQuery,
  useGetCancelledOrdersQuery,
  useGetOnHoldBookingsQuery,
  useGetPaymentFailuresQuery,
  useGetActionRequiredOrdersQuery,
  useResolvePaymentFailureMutation,
  useGetAllOrderStatusesQuery,
  useGetShopsDataQuery,
  useGetShopDetailsQuery,
  useAddShopMutation,
  useGetPendingAgentsQuery,
  useGetRejectedAgentsQuery,
  useUpdateAgentApprovalMutation,
  useGetAgentsCashDueQuery,
  useGetPendingRemittancesQuery,
  useGetAgentSettlementQuery,
  useGetNotifyLogsQuery,
  useLazySearchNotificationRecipientsQuery,
  usePreviewAdminNotificationMutation,
  useSendAdminNotificationMutation,
  useGetAdminNotificationPreferencesQuery,
  useUpdateAdminNotificationPreferencesMutation,
  useDemoAdminNotificationAlertMutation,
  useRegisterAdminFcmTokenMutation,
  useGetServiceComparisonQuery,
  useConfirmCashRemittanceMutation,
  useRejectCashRemittanceMutation,
  useRecordCashSettlementMutation,
  useRecordAgentPayoutMutation,
  useRecordSettlementAdjustmentMutation,
  useSyncAgentWalletsMutation,
  useRegisterAgentMutation,
  useAddAgentAddressMutation,
  useAddAgentBusinessInfoMutation,
  useGetBusinessInformationQuery,
  useEditShopMutation,
  useDeleteShopMutation,
  useGetAllEmployeesWithShopInfoQuery,
  useGetAdminEmployeesQuery,
  useGetAllRolesQuery,
  useGetFeaturesQuery,
  useAddFeatureMutation,
  useAddLaundryRoleMutation,
  useUpdateRoleMutation,
  useReportsTopServicesQuery,
  useReportsHourlyQuery,
  useReportsOnHoldQuery,
  useReportsServiceDemandQuery,
  useReportsTopShopsQuery,
  useReportsDailyEarningsQuery,
  useReportsDailyEarningsByZoneQuery,
  useReportsDailyEarningsByShopQuery,
  useAddAdminEmployeeMutation,
  useAddAgentEmployeeMutation,
  useUpdateAgentEmployeeMutation,
  useDeleteAgentEmployeeMutation,
  useUpdateAdminEmployeeMutation,
  useUpdateAdminEmployeeStatusMutation,
  useDeleteAdminEmployeeMutation,
  useGetAllZonesQuery,
  useGetZoneByIdQuery,
  useLazyGetZoneByIdQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetAllCitiesQuery,
  useAddCountryMutation,
  useEditCountryMutation,
  useDeleteCountryMutation,
  useAddCityMutation,
  useEditCityMutation,
  useDeleteCityMutation,
  useGetUnitsDistanceAndCurrencyQuery,
  useGetActivePoliciesQuery,
  useAddZoneMutation,
  useAddZoneByPostcodesMutation,
  useEditZoneByPostcodesMutation,
  useDeleteZoneMutation,
  useUpdateDriverMutation,
  useAddDriverByLaundryShopMutation,
  useGetAllDriverMiniDetailsQuery,
  useGetSpecificDriverDetailQuery,
  useDeleteDriverMutation,
  useGetOrderForEditQuery,
  useGetServiceDetailWithBookingSelectionQuery,
  useGetOrderItemsSheetQuery,
  useLazyInvoiceCreationQuery,
  useEditOrderMutation,
  useDeleteOrderMutation,
  useAddCancellationPolicyMutation,
  useGetCancellationPoliciesQuery,
  useLazyGetCancellationPoliciesQuery,
  useUpdateCancellationPolicyMutation,
  useDeleteCancellationPolicyMutation,
  useCreateReasonMutation,
  useGetAllReasonsQuery,
  useDeleteReasonMutation,
  useGetAccountDeletionReasonsQuery,
  useCreateAccountDeletionReasonMutation,
  useUpdateAccountDeletionReasonMutation,
  useDeleteAccountDeletionReasonMutation,
  useGetReviewReasonCodesQuery,
  useCreateReviewReasonCodeMutation,
  useUpdateReviewReasonCodeMutation,
  useDeleteReviewReasonCodeMutation,
  useGetShopReviewsQuery,
  useHideShopReviewMutation,
  useUnhideShopReviewMutation,
  useGetShopRatingsReportQuery,
  useGetReviewReasonInsightsQuery,
  useAddNoShowPolicyMutation,
  useGetNoShowPoliciesQuery,
  useLazyGetNoShowPoliciesQuery,
  useUpdateNoShowPolicyMutation,
  useDeleteNoShowPolicyMutation,
  useAddReschedulePolicyMutation,
  useGetReschedulePoliciesQuery,
  useLazyGetReschedulePoliciesQuery,
  useGetReschedulePolicyByIdQuery,
  useUpdateReschedulePolicyMutation,
  useDeleteReschedulePolicyMutation,
  useGetAllFAQsQuery,
  useCreateFAQMutation,
  useUpdateFAQMutation,
  useDeleteFAQMutation,
  useGetAllBlogsQuery,
  useDeleteBlogMutation,
  useCreateBlogMutation,
  useUpdateBlogMutation,
  useUpdateSupportContactMutation,
  useGetSupportContactQuery,
  useGetPlatformOperationalHoursQuery,
  useUpdatePlatformOperationalHoursMutation,
  useGetBookingAssignableShopsQuery,
  useAssignBookingToShopMutation,
  useGetAllCouponsQuery,
  useAddCouponMutation,
  useCreateBannerMutation,
  useGetAllBannersQuery,
  useUpdateBannerMutation,
  useDeleteBannerMutation,
} = api;
