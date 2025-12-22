import { createApi } from "@reduxjs/toolkit/query/react";
import baseQueryWithReauth from "./baseQueryWithReauth";

export const api = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,

  endpoints: (builder) => ({
    adminLogin: builder.mutation({
      query: (body) => ({
        url: "admin/adminSignIn",
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
      query: ({ id, name }) => ({
        url: `admin/editPreferenceType/${id}`,
        method: "PATCH",
        body: { name },
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
      query: () => ({
        url: `admin/getcategories`,
        method: "GET",
      }),
    }),

    addCategory: builder.mutation({
      query: (body) => ({
        url: "admin/addCategory",
        method: "POST",
        body,
      }),
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
    }),

    addServiceWithCategories: builder.mutation({
      query: (body) => ({
        url: "admin/serviceCategoriesAssign",
        method: "POST",
        body,
      }),
    }),

    unAssignServiceFromPreferences: builder.mutation({
      query: (serviceId) => ({
        url: `admin/unAssignServiceFromPreferences/${serviceId}`,
        method: "DELETE",
      }),
    }),

    getServiceWitPreferences: builder.query({
      query: (id) => ({
        url: `admin/servicesAndPreferencesData/${id}`,
        method: "GET",
      }),
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
      query: () => ({
        url: "admin/ordersCount",
        method: "GET",
      }),
    }),

    getAllOrder: builder.query({
      query: () => ({
        url: "admin/allOrderDetails",
        method: "GET",
      }),
    }),

    getAllCompleteOrders: builder.query({
      query: () => ({
        url: "admin/completeOrders",
        method: "GET",
      }),
    }),

    getOnHoldBookings: builder.query({
      query: () => ({
        url: "admin/getOnHoldBookings",
        method: "GET",
      }),
    }),

    getShopsData: builder.query({
      query: () => ({
        url: "admin/getShopsData",
        method: "GET",
      }),
    }),
    getAllZones: builder.query({
      query: () => ({
        url: "admin/getZones",
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

    getUnitsDistanceAndCurrency: builder.query({
      query: (type) => ({
        url: `admin/getUnitsDistanceAndCurrency?type=${type}`,
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

    getOrderItemsSheet: builder.query({
      query: (bookingId) => ({
        url: `admin/orderItemsSheet?bookingId=${bookingId}`,
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
  }),
});

export const {
  useAdminLoginMutation,
  useGetAllServicesQuery,
  useGetPreferencesQuery,
  useGetCategoriesQuery,
  useGetSubCategoriesQuery,
  useAddServiceMutation,
  useAddPreferenceMutation,
  useAddPreferenceValueMutation,
  useAddCategoryMutation,
  useAddSubCategoryMutation,
  useDeleteServiceMutation,
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
  useUnAssignServiceFromPreferencesMutation,
  useGetAllCustomersQuery,
  useGetAllCustomersCountQuery,
  useGetCustomerByIdQuery,
  useDashboardDataQuery,
  useDeleteCustomerMutation,
  useEditCustomerMutation,
  useGetOrdersCountQuery,
  useGetAllOrderQuery,
  useGetAllCompleteOrdersQuery,
  useGetOnHoldBookingsQuery,
  useGetShopsDataQuery,
  useGetAllZonesQuery,
  useGetAllCountriesQuery,
  useGetCitiesByCountryIdQuery,
  useGetUnitsDistanceAndCurrencyQuery,
  useAddZoneMutation,
  useUpdateDriverMutation,
  useAddDriverByLaundryShopMutation,
  useGetAllDriverMiniDetailsQuery,
  useGetSpecificDriverDetailQuery,
  useDeleteDriverMutation,
  useGetOrderForEditQuery,
  useGetOrderItemsSheetQuery,
  useEditOrderMutation
} = api;
