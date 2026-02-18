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
      query: () => ({
        url: "admin/getAllRoles",
        method: "GET",
      }),
    }),

    addAdminEmployee: builder.mutation({
      query: (body) => ({
        url: "admin/adinEmployeeAdd",
        method: "POST",
        body,
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
        url: `admin/deleteEmployee/${id}`,
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
        const { isActive, isDefault, page, limit } = params;
        const queryParams = new URLSearchParams();
        
        if (isActive !== undefined && isActive !== null && isActive !== "") {
          queryParams.append("isActive", isActive);
        }
        if (isDefault !== undefined && isDefault !== null && isDefault !== "") {
          queryParams.append("isDefault", isDefault);
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

    addNoShowPolicy: builder.mutation({
      query: (body) => ({
        url: "admin/addNoShowPolicy",
        method: "POST",
        body,
      }),
    }),

    getNoShowPolicies: builder.query({
      query: (params = {}) => {
        const { isActive, isDefault, page, limit } = params;
        const queryParams = new URLSearchParams();
        
        if (isActive !== undefined && isActive !== null && isActive !== "") {
          queryParams.append("isActive", isActive);
        }
        if (isDefault !== undefined && isDefault !== null && isDefault !== "") {
          queryParams.append("isDefault", isDefault);
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
        const { isActive, isDefault, page, limit } = params;
        const queryParams = new URLSearchParams();
        if (isActive !== undefined && isActive !== null && isActive !== "") {
          queryParams.append("isActive", isActive);
        }
        if (isDefault !== undefined && isDefault !== null && isDefault !== "") {
          queryParams.append("isDefault", isDefault);
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

    updateReschedulePolicy: builder.mutation({
      query: ({ id, body }) => ({
        url: `admin/updateReschedulePolicy/${id}`,
        method: "PUT",
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
  useGetShopDetailsQuery,
  useAddShopMutation,
  useEditShopMutation,
  useDeleteShopMutation,
  useGetAllEmployeesWithShopInfoQuery,
  useGetAdminEmployeesQuery,
  useGetAllRolesQuery,
  useAddAdminEmployeeMutation,
  useUpdateAdminEmployeeMutation,
  useUpdateAdminEmployeeStatusMutation,
  useDeleteAdminEmployeeMutation,
  useGetAllZonesQuery,
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
  useAddZoneMutation,
  useAddZoneByPostcodesMutation,
  useUpdateDriverMutation,
  useAddDriverByLaundryShopMutation,
  useGetAllDriverMiniDetailsQuery,
  useGetSpecificDriverDetailQuery,
  useDeleteDriverMutation,
  useGetOrderForEditQuery,
  useGetOrderItemsSheetQuery,
  useEditOrderMutation,
  useDeleteOrderMutation,
  useAddCancellationPolicyMutation,
  useGetCancellationPoliciesQuery,
  useUpdateCancellationPolicyMutation,
  useDeleteCancellationPolicyMutation,
  useCreateReasonMutation,
  useGetAllReasonsQuery,
  useDeleteReasonMutation,
  useAddNoShowPolicyMutation,
  useGetNoShowPoliciesQuery,
  useUpdateNoShowPolicyMutation,
  useDeleteNoShowPolicyMutation,
  useAddReschedulePolicyMutation,
  useGetReschedulePoliciesQuery,
  useUpdateReschedulePolicyMutation,
  useDeleteReschedulePolicyMutation,
  useGetAllFAQsQuery,
  useCreateFAQMutation,
  useUpdateFAQMutation,
  useDeleteFAQMutation,
  useGetAllBlogsQuery,
  useDeleteBlogMutation,
  useCreateBlogMutation,
  useUpdateBlogMutation
} = api;
