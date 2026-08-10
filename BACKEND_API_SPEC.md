# Laundry Service Admin Panel — Backend API Specification

> **Base URL:** `https://prodlaundry.sigisolutions.net/`  
> **All routes are prefixed with** `/admin/`  
> **Content-Type:** `application/json` (except image uploads which use `multipart/form-data`)  
> **Auth:** Bearer token via `Authorization: Bearer <token>` header  
> **Zone Employee Header:** `featureid: <id>` (sent by frontend automatically for zone-admin sessions)

---

## Table of Contents

1. [Standard Response Format](#1-standard-response-format)
2. [Authentication](#2-authentication)
3. [Services Management](#3-services-management)
4. [Categories & Sub-Categories](#4-categories--sub-categories)
5. [Add-On Services](#5-add-on-services)
6. [Preferences](#6-preferences)
7. [Configure Services](#7-configure-services)
8. [Zone Management](#8-zone-management)
9. [Countries & Cities](#9-countries--cities)
10. [Shop Management](#10-shop-management)
11. [Order Management](#11-order-management)
12. [Customer Management](#12-customer-management)
13. [Driver Management](#13-driver-management)
14. [Employee Management](#14-employee-management)
15. [Role & Permission](#15-role--permission)
16. [Policies Management](#16-policies-management)
17. [Reports](#17-reports)
18. [Promotions — Coupons](#18-promotions--coupons)
19. [Promotions — Banners & Offers ⭐ NEW](#19-promotions--banners--offers-new)
20. [Blogs](#20-blogs)
21. [FAQ](#21-faq)
22. [Customer Support](#22-customer-support)
23. [Dashboard](#23-dashboard)

---

## 1. Standard Response Format

Every API response **must** follow this structure:

```json
// Success
{
  "status": true,
  "message": "Operation successful",
  "data": { ... }  // or []  or null
}

// With pagination
{
  "status": true,
  "message": "Fetched successfully",
  "data": {
    "rows": [ ... ],
    "meta": {
      "pagination": {
        "total": 100,
        "page": 1,
        "limit": 10,
        "totalPages": 10
      }
    }
  }
}

// Error
{
  "status": false,
  "message": "Descriptive error message",
  "error": "Optional technical detail"
}
```

**HTTP Status Codes:**
| Code | Meaning |
|---|---|
| `200` | Success (GET, PATCH, PUT, DELETE) |
| `201` | Created (POST) |
| `400` | Bad Request (validation error) |
| `401` | Unauthorized (invalid/expired token) |
| `403` | Forbidden (insufficient permissions) |
| `404` | Resource not found |
| `409` | Conflict (duplicate entry) |
| `500` | Internal server error |

---

## 2. Authentication

### POST `/admin/adminSignIn`
Super admin login.

**Request Body:**
```json
{
  "email": "admin@laundry.com",
  "password": "SecurePass123"
}
```

**Response `200`:**
```json
{
  "status": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "admin": {
      "id": 1,
      "name": "Super Admin",
      "email": "admin@laundry.com",
      "role": "superAdmin"
    }
  }
}
```

---

### POST `/admin/zoneAdminSignIn`
Zone admin login.

**Request Body:**
```json
{
  "email": "zone@laundry.com",
  "password": "ZonePass123"
}
```

**Response `200`:**
```json
{
  "status": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "featureIds": [1, 3, 5],
    "admin": {
      "id": 5,
      "name": "Zone Admin London",
      "email": "zone@laundry.com",
      "role": "zoneAdmin",
      "zoneId": 2
    }
  }
}
```

---

## 3. Services Management

### GET `/admin/getServices`
Get all laundry services.

**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Dry Cleaning",
      "description": "Professional dry cleaning service",
      "icon": "https://cdn.../icon.png",
      "sortOrder": 1,
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/admin/AddServices`
**Request Body:**
```json
{
  "name": "Dry Cleaning",
  "description": "Professional dry cleaning",
  "icon": "base64_or_url",
  "sortOrder": 1,
  "isActive": true
}
```

---

### PATCH `/admin/editServices/:id`
**Request Body (partial update):**
```json
{
  "name": "Updated Name",
  "sortOrder": 2,
  "isActive": false
}
```

---

### DELETE `/admin/deleteServices/:id`
**Response `200`:**
```json
{ "status": true, "message": "Service deleted successfully" }
```

---

### PATCH `/admin/updateServicesSortOrder`
**Request Body:**
```json
{
  "services": [
    { "id": 1, "sortOrder": 2 },
    { "id": 2, "sortOrder": 1 }
  ]
}
```

---

## 4. Categories & Sub-Categories

### GET `/admin/getcategories`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Men's Wear",
      "description": "Men's clothing items",
      "image": "https://cdn.../cat.png",
      "isActive": true,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### POST `/admin/addCategory`
**Request Body:**
```json
{
  "name": "Men's Wear",
  "description": "Men's clothing items",
  "image": "base64_or_url",
  "isActive": true
}
```

---

### PATCH `/admin/editCategories/:categoryId`
**Request Body:**
```json
{
  "name": "Updated Category Name",
  "isActive": false
}
```

---

### DELETE `/admin/deleteCategories/:deletedId`

---

### GET `/admin/getSubcategories`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Shirts",
      "categoryId": 1,
      "category": { "id": 1, "name": "Men's Wear" },
      "isActive": true
    }
  ]
}
```

---

### POST `/admin/addSubCategories`
**Request Body:**
```json
{
  "name": "Shirts",
  "categoryId": 1,
  "image": "base64_or_url",
  "isActive": true
}
```

---

### PATCH `/admin/editSubCategories/:subCatId`
**Request Body:**
```json
{
  "name": "Dress Shirts",
  "isActive": true
}
```

---

### DELETE `/admin/deleteSubCategories/:deletedId`

---

## 5. Add-On Services

### GET `/admin/getAllAddOnServices`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Express Delivery",
      "description": "Same day delivery",
      "price": 5.99,
      "isActive": true
    }
  ]
}
```

---

### GET `/admin/getAddOnServiceById/:addOnServiceId`

### POST `/admin/createAddOnService`
**Request Body:**
```json
{
  "name": "Express Delivery",
  "description": "Same day delivery",
  "price": 5.99,
  "isActive": true
}
```

### PATCH `/admin/updateAddOnService/:addOnServiceId`
### DELETE `/admin/deleteAddOnService/:addOnServiceId`

---

## 6. Preferences

### GET `/admin/getPreferenceTypes`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Fragrance",
      "parentPreferenceTypeId": null,
      "values": [
        { "id": 1, "value": "No Fragrance" },
        { "id": 2, "value": "Lavender" }
      ]
    }
  ]
}
```

---

### POST `/admin/createPreferenceType`
**Request Body:**
```json
{
  "name": "Fragrance",
  "parentPreferenceTypeId": null
}
```

### PATCH `/admin/editPreferenceType/:id`
**Request Body:**
```json
{
  "name": "Updated Name",
  "parentPreferenceTypeId": null
}
```

### DELETE `/admin/deletePreferenceType/:id`

### POST `/admin/addPreferenceValues`
**Request Body:**
```json
{
  "preferenceTypeId": 1,
  "value": "Lavender"
}
```

### PATCH `/admin/editPreferenceValues/:id`
**Request Body:**
```json
{ "value": "Rose" }
```

### DELETE `/admin/deletePreferenceValues/:id`

---

## 7. Configure Services

### GET `/admin/servicesAndPreferencesData/:serviceId`
Returns service with its assigned categories and preferences.

**Response `200`:**
```json
{
  "status": true,
  "data": {
    "service": { "id": 1, "name": "Dry Cleaning" },
    "categories": [
      { "id": 1, "name": "Men's Wear" }
    ],
    "preferences": [
      { "id": 1, "name": "Fragrance" }
    ]
  }
}
```

---

### POST `/admin/serviceCategoriesAssign`
Assign categories to a service.

**Request Body:**
```json
{
  "serviceId": 1,
  "categoryIds": [1, 2, 3]
}
```

---

### DELETE `/admin/unassignServiceFromCategories/:serviceId`
**Request Body:**
```json
{ "categoryIds": [1, 2] }
```

---

### POST `/admin/addServiceWithPreferences`
**Request Body:**
```json
{
  "serviceId": 1,
  "preferenceTypeIds": [1, 2]
}
```

---

### DELETE `/admin/unAssignServiceFromPreferences/:serviceId`

---

## 8. Zone Management

### GET `/admin/getZones`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "London North",
      "description": "North London coverage area",
      "isActive": true,
      "coordinates": [ [51.5, -0.1], [51.6, -0.2] ],
      "postcodes": ["N1", "N2", "N3"],
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET `/admin/getZoneById/:id`

### POST `/admin/addZone`
**Request Body:**
```json
{
  "name": "London North",
  "description": "North London area",
  "coordinates": [ [51.5, -0.1], [51.6, -0.2] ],
  "isActive": true
}
```

---

### POST `/admin/addZoneByPostcodes`
**Request Body:**
```json
{
  "name": "London North",
  "description": "North London area",
  "postcodes": ["N1", "N2", "N3"]
}
```

---

### PUT `/admin/editZoneByPostcodes/:id`
**Request Body:**
```json
{
  "name": "Updated Zone Name",
  "postcodes": ["N1", "N2", "N4"]
}
```

---

### DELETE `/admin/delete-zone?zoneId=:zoneId`

---

## 9. Countries & Cities

### GET `/admin/getCountries`
**Response:**
```json
{
  "status": true,
  "data": [
    { "id": 1, "name": "United Kingdom", "code": "GB", "flag": "🇬🇧" }
  ]
}
```

### POST `/admin/addCountries`
**Request Body:**
```json
{ "name": "United Kingdom", "code": "GB" }
```

### PUT `/admin/updateCountry/:id`
### DELETE `/admin/deleteCountry/:id`

### GET `/admin/getCities`
### GET `/admin/getCitiesByCountryId/:countryId`

### POST `/admin/addCities`
**Request Body:**
```json
{ "name": "London", "countryId": 1 }
```

### PUT `/admin/updateCity/:id`
### DELETE `/admin/deleteCity/:id`

---

## 10. Shop Management

### GET `/admin/getShopsData`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "shopName": "Clean & Fresh Laundry",
      "address": "123 High Street, London",
      "phone": "+44 20 1234 5678",
      "email": "shop@cleanfresh.com",
      "zoneId": 1,
      "zone": { "id": 1, "name": "London North" },
      "isActive": true,
      "openingHours": {
        "monday": { "open": "09:00", "close": "18:00" },
        "tuesday": { "open": "09:00", "close": "18:00" }
      },
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET `/admin/singleShopData/:id`

### POST `/admin/addLaundryShop`
**Request Body:**
```json
{
  "shopName": "Clean & Fresh Laundry",
  "address": "123 High Street, London",
  "phone": "+44 20 1234 5678",
  "email": "shop@cleanfresh.com",
  "zoneId": 1,
  "isActive": true,
  "openingHours": {
    "monday": { "open": "09:00", "close": "18:00" }
  }
}
```

---

### PATCH `/admin/updateLaundryShop/:id`
**Request Body (partial):**
```json
{
  "shopName": "Updated Shop Name",
  "isActive": false
}
```

### DELETE `/admin/deleteShop/:id`

---

### POST `/admin/registerAgent`
Step 1 of agent registration.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "agent@shop.com",
  "phone": "+44 7700 900000",
  "password": "AgentPass123"
}
```

**Response `201`:**
```json
{
  "status": true,
  "data": { "userId": 10 }
}
```

---

### POST `/admin/addAgentAddress/:userId`
Step 2.

**Request Body:**
```json
{
  "street": "123 High Street",
  "city": "London",
  "postcode": "SW1A 1AA",
  "countryId": 1
}
```

---

### POST `/admin/addAgentBusinessInfo/:userId`
Step 3.

**Request Body:**
```json
{
  "businessName": "Clean & Fresh Ltd",
  "registrationNumber": "12345678",
  "vatNumber": "GB123456789",
  "bankAccountName": "Clean & Fresh Ltd",
  "bankAccountNumber": "12345678",
  "sortCode": "12-34-56"
}
```

---

### GET `/agent/getBussinessInforMation/:userId`

---

## 11. Order Management

### GET `/admin/allOrderDetails`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "bookingId": "BK-2026-001",
      "customerId": 5,
      "customer": { "id": 5, "name": "Alice Smith", "phone": "+44 7700 900001" },
      "shopId": 1,
      "shop": { "id": 1, "shopName": "Clean & Fresh" },
      "serviceId": 1,
      "service": { "id": 1, "name": "Dry Cleaning" },
      "status": "pending",
      "totalAmount": 45.00,
      "discountAmount": 0,
      "finalAmount": 45.00,
      "pickupDate": "2026-05-20",
      "deliveryDate": "2026-05-22",
      "createdAt": "2026-05-15T10:00:00Z"
    }
  ]
}
```

---

### GET `/admin/completeOrders`
### GET `/admin/getOnHoldBookings`
### GET `/admin/ordersCount`

**Response `200`:**
```json
{
  "status": true,
  "data": {
    "allOrderCount": 250,
    "completedOrders": 180,
    "pendingOrders": 40,
    "newOrders": 12,
    "activeOrders": 28,
    "repeatOrders": 95,
    "cancelledOrders": 20,
    "onHoldOrders": 10
  }
}
```

---

### GET `/admin/allOrderStatuses`

### GET `/admin/getOrderForEdit/:orderId`

### GET `/admin/serviceDetailWithBookingSelection/:bookingId`

### GET `/admin/orderItemsSheet?bookingId=:bookingId`

### GET `/admin/invoiceCreation/:bookingId`

### PATCH `/admin/editOrder/:orderId`
**Request Body:**
```json
{
  "status": "in_progress",
  "items": [
    { "itemId": 1, "quantity": 2, "price": 10.00 }
  ],
  "notes": "Handle with care"
}
```

### DELETE `/admin/deleteOrder/:id`

---

## 12. Customer Management

### GET `/admin/getAllCustomers`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Alice Smith",
      "email": "alice@email.com",
      "phone": "+44 7700 900001",
      "address": "10 Downing St, London",
      "totalOrders": 12,
      "totalSpent": 540.00,
      "isActive": true,
      "createdAt": "2026-01-15T00:00:00Z"
    }
  ]
}
```

---

### GET `/admin/customerCount`
**Response:**
```json
{
  "status": true,
  "data": {
    "total": 1250,
    "activeThisMonth": 340,
    "newThisWeek": 25
  }
}
```

---

### GET `/admin/specificCustomerDetails/:id`

### PATCH `/admin/updateCustomer/:id`
**Request Body:**
```json
{
  "name": "Alice Johnson",
  "phone": "+44 7700 900002",
  "address": "20 Baker Street, London"
}
```

### DELETE `/admin/deleteCustomer/:id`

---

## 13. Driver Management

### GET `/admin/allDriverMiniDetails`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Bob Driver",
      "phone": "+44 7700 900010",
      "shopId": 1,
      "shop": { "id": 1, "shopName": "Clean & Fresh" },
      "isActive": true,
      "licenseNumber": "DRIVER123456",
      "vehicleNumber": "LDN-1234"
    }
  ]
}
```

---

### GET `/admin/specificdriverDetail/:driverId`

### POST `/admin/addDriverByLaundryShop`
**Request Body:**
```json
{
  "name": "Bob Driver",
  "email": "bob@driver.com",
  "phone": "+44 7700 900010",
  "password": "DriverPass123",
  "shopId": 1,
  "licenseNumber": "DRIVER123456",
  "vehicleNumber": "LDN-1234",
  "vehicleType": "van"
}
```

---

### PATCH `/admin/updateDriver/:id`
**Request Body:**
```json
{
  "phone": "+44 7700 900099",
  "isActive": false
}
```

### DELETE `/admin/deleteDriver/:id`

---

## 14. Employee Management

### GET `/admin/getAllEmployeesWithShopInfo`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Jane Employee",
      "email": "jane@laundry.com",
      "phone": "+44 7700 900020",
      "role": { "id": 2, "name": "Shop Manager" },
      "shop": { "id": 1, "shopName": "Clean & Fresh" },
      "isActive": true
    }
  ]
}
```

---

### GET `/admin/getAdminEmployess`

### POST `/admin/adinEmployeeAdd`
**Request Body:**
```json
{
  "name": "Jane Employee",
  "email": "jane@laundry.com",
  "phone": "+44 7700 900020",
  "password": "EmpPass123",
  "roleId": 2,
  "isActive": true
}
```

---

### POST `/admin/addAgentEmployee`
**Request Body:**
```json
{
  "name": "Shop Staff",
  "email": "staff@shop.com",
  "phone": "+44 7700 900030",
  "password": "StaffPass123",
  "shopId": 1,
  "roleId": 3
}
```

---

### PATCH `/admin/updateEmployee`
### PATCH `/admin/updateAgentEmployee`
### PATCH `/admin/updateEmployeeStatus`
**Request Body:**
```json
{ "employeeId": 5, "isActive": false }
```

### DELETE `/admin/deleteAdminEmployee/:id`
### DELETE `/admin/deleteAgentEmployee/:id`

---

## 15. Role & Permission

### GET `/admin/getAllRoles`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "name": "Super Admin",
      "features": [
        { "id": 1, "name": "Dashboard", "featureKey": "dashboard" }
      ]
    }
  ]
}
```

---

### GET `/admin/getFeatures`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    { "id": 1, "name": "Dashboard", "featureKey": "dashboard" },
    { "id": 2, "name": "Order Management", "featureKey": "orderManagement" }
  ]
}
```

---

### POST `/admin/addfeatures`
**Request Body:**
```json
{ "name": "Banners & Offers", "featureKey": "bannersOffers" }
```

### POST `/admin/AddLaundryRoles`
**Request Body:**
```json
{
  "name": "Zone Manager",
  "featureIds": [1, 2, 3, 4]
}
```

### PUT `/admin/updateRoles`
**Request Body:**
```json
{
  "roleId": 2,
  "name": "Updated Role",
  "featureIds": [1, 2, 5]
}
```

---

## 16. Policies Management

### GET `/admin/getActivePolicies`
Returns summary of all active policies.

### Cancellation Policy

#### GET `/admin/getCancellationPolicies`
**Query params:** `isActive`, `isDefault`, `zoneId`, `page`, `limit`

**Response `200`:**
```json
{
  "status": true,
  "data": {
    "rows": [
      {
        "id": 1,
        "title": "Standard Cancellation",
        "description": "Full refund if cancelled 24hrs before",
        "hoursBeforePickup": 24,
        "refundPercentage": 100,
        "zoneId": null,
        "isDefault": true,
        "isActive": true
      }
    ],
    "meta": { "pagination": { "total": 5, "page": 1, "limit": 10 } }
  }
}
```

#### POST `/admin/addCancellationPolicy`
**Request Body:**
```json
{
  "title": "Standard Cancellation",
  "description": "Full refund if cancelled 24hrs before",
  "hoursBeforePickup": 24,
  "refundPercentage": 100,
  "zoneId": null,
  "isDefault": false,
  "isActive": true
}
```

#### PUT `/admin/updateCancellationPolicy/:id`
#### DELETE `/admin/deleteCancellationPolicy/:id`

---

### No Show Policy

#### GET `/admin/getNoShowPolicies`
**Query params:** `isActive`, `isDefault`, `zoneId`, `page`, `limit`

#### POST `/admin/addNoShowPolicy`
**Request Body:**
```json
{
  "title": "Standard No Show",
  "description": "£10 charge if customer no-shows",
  "chargeAmount": 10.00,
  "chargeType": "flat",
  "zoneId": null,
  "isDefault": true,
  "isActive": true
}
```

#### PUT `/admin/updateNoShowPolicy/:id`
#### DELETE `/admin/deleteNoShowPolicy/:id`

---

### Reschedule Policy

#### GET `/admin/getReschedulePolicies`
**Query params:** `isActive`, `isDefault`, `zoneId`, `page`, `limit`

#### GET `/admin/getReschedulePolicy/:id`

#### POST `/admin/addReschedulePolicy`
**Request Body:**
```json
{
  "title": "Free Reschedule",
  "description": "Free rescheduling up to 12hrs before",
  "hoursBeforePickup": 12,
  "feeAmount": 0,
  "maxReschedules": 2,
  "zoneId": null,
  "isDefault": true,
  "isActive": true
}
```

#### PATCH `/admin/updateReschedulePolicy/:id`
#### DELETE `/admin/deleteReschedulePolicy/:id`

---

### Cancellation Reasons

#### GET `/admin/getAllReasons`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    { "id": 1, "reason": "Changed my mind", "isActive": true }
  ]
}
```

#### POST `/admin/createReason`
**Request Body:**
```json
{ "reason": "Changed my mind" }
```

#### DELETE `/admin/deleteReason/:reasonId`

---

## 17. Reports

All report endpoints accept these common **query params:**
| Param | Values | Description |
|---|---|---|
| `period` | `today`, `this_week`, `this_month`, `all`, `custom` | Time period |
| `startDate` | `YYYY-MM-DD` | Required when period=custom |
| `endDate` | `YYYY-MM-DD` | Required when period=custom |
| `zoneId` | number | Filter by zone |
| `page` | number | Pagination |
| `limit` | number | Per page |

---

### GET `/admin/reports/top-services`
**Response `200`:**
```json
{
  "status": true,
  "data": {
    "rows": [
      { "serviceId": 1, "serviceName": "Dry Cleaning", "orderCount": 120, "revenue": 5400.00 }
    ],
    "meta": { "pagination": { "total": 10 } }
  }
}
```

### GET `/admin/reports/hourly`
**Response:**
```json
{
  "status": true,
  "data": [
    { "hour": "09:00", "orderCount": 12, "revenue": 540.00 }
  ]
}
```

### GET `/admin/reports/on-hold`
### GET `/admin/reports/service-demand`
### GET `/admin/reports/top-shops`

### GET `/admin/reports/daily-earnings`
**Response:**
```json
{
  "status": true,
  "data": [
    { "date": "2026-05-15", "totalRevenue": 1200.00, "orderCount": 30 }
  ]
}
```

### GET `/admin/reports/daily-earnings/zone`
### GET `/admin/reports/daily-earnings/shop`

---

## 18. Promotions — Coupons

### GET `/admin/getAllCoupons`
**Query params:** `page`, `limit`, `isActive`

**Response `200`:**
```json
{
  "status": true,
  "data": {
    "coupons": [
      {
        "id": 1,
        "code": "SUMMER20",
        "description": "20% off summer sale",
        "discountType": "percentage",
        "discountValue": 20,
        "minOrderAmount": 30.00,
        "maxDiscountCap": 15.00,
        "usageLimit": 100,
        "usedCount": 45,
        "perUserLimit": 1,
        "startDate": "2026-06-01",
        "expiryDate": "2026-08-31",
        "isActive": true,
        "createdAt": "2026-05-01T00:00:00Z"
      }
    ],
    "meta": {
      "pagination": { "total": 25, "page": 1, "limit": 10, "totalPages": 3 }
    }
  }
}
```

---

### POST `/admin/addCoupon`
**Request Body:**
```json
{
  "code": "SUMMER20",
  "description": "20% off summer sale",
  "discountType": "percentage",
  "discountValue": 20,
  "minOrderAmount": 30.00,
  "maxDiscountCap": 15.00,
  "usageLimit": 100,
  "usedCount": 0,
  "perUserLimit": 1,
  "startDate": "2026-06-01",
  "expiryDate": "2026-08-31",
  "isActive": true
}
```

**Validation Rules:**
- `code` — required, unique, alphanumeric + hyphens, uppercase
- `discountType` — required, enum: `"percentage"` | `"flat"`
- `discountValue` — required, number > 0; if percentage then ≤ 100
- `minOrderAmount` — optional, number ≥ 0
- `maxDiscountCap` — optional, only relevant for percentage type
- `usageLimit` — optional, integer ≥ 1 (null = unlimited)
- `perUserLimit` — optional, integer ≥ 1, default 1
- `expiryDate` — optional, must be ≥ startDate if both provided

**Response `201`:**
```json
{
  "status": true,
  "message": "Coupon created successfully",
  "data": { "id": 26, "code": "SUMMER20" }
}
```

---

## 19. Promotions — Banners & Offers ⭐ NEW

### Database Schema

```sql
CREATE TABLE banners (
  id              SERIAL PRIMARY KEY,
  title           VARCHAR(200)    NOT NULL,
  description     TEXT,
  banner_image    VARCHAR(500),          -- S3/CDN URL of the image
  offer_type      VARCHAR(30)     NOT NULL DEFAULT 'percentage',
                                         -- ENUM: 'percentage' | 'flat' | 'free_delivery'
  discount_value  DECIMAL(10,2),         -- NULL when offer_type = 'free_delivery'
  max_discount_cap DECIMAL(10,2),        -- Only for percentage type
  target_type     VARCHAR(30)     NOT NULL DEFAULT 'global',
                                         -- ENUM: 'global' | 'service' | 'category' | 'sub_category'
  target_id       INTEGER,               -- FK to services/categories/sub_categories (nullable for global)
  zone_ids        INTEGER[],             -- Array of zone IDs; NULL = all zones
  start_date      DATE,
  end_date        DATE,
  display_order   INTEGER         NOT NULL DEFAULT 1,
  show_on_home    BOOLEAN         NOT NULL DEFAULT TRUE,
  is_active       BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMP       NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP       NOT NULL DEFAULT NOW()
);
```

---

### POST `/admin/createBanner`

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "title": "Eid Special Offer",
  "description": "Celebrate Eid with 20% off on all Dry Cleaning",
  "bannerImage": "https://s3.amazonaws.com/bucket/banners/eid.jpg",
  "offerType": "percentage",
  "discountValue": 20,
  "maxDiscountCap": 15.00,
  "targetType": "service",
  "targetId": 1,
  "zoneIds": [1, 3],
  "startDate": "2026-06-01",
  "endDate": "2026-06-30",
  "displayOrder": 1,
  "showOnHome": true,
  "isActive": true
}
```

**Field Reference:**
| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | YES | Banner title (max 200 chars) |
| `description` | string | NO | Short description |
| `bannerImage` | string (URL) | NO | Image URL after upload |
| `offerType` | enum | YES | `"percentage"` \| `"flat"` \| `"free_delivery"` |
| `discountValue` | number | YES* | Required unless `offerType="free_delivery"` |
| `maxDiscountCap` | number | NO | Only for `offerType="percentage"` |
| `targetType` | enum | YES | `"global"` \| `"service"` \| `"category"` \| `"sub_category"` |
| `targetId` | integer | NO | Required when targetType ≠ `"global"` |
| `zoneIds` | integer[] | NO | `null` or `[]` = all zones |
| `startDate` | string (YYYY-MM-DD) | NO | Banner visibility start |
| `endDate` | string (YYYY-MM-DD) | NO | Banner visibility end; must be ≥ startDate |
| `displayOrder` | integer | NO | Sort order in banner slider (default: 1) |
| `showOnHome` | boolean | NO | Show on customer app home screen (default: true) |
| `isActive` | boolean | NO | Banner active toggle (default: true) |

**Validation Rules:**
- `title` — required, not empty
- `offerType` — required, must be one of the three allowed values
- `discountValue` — required when offerType ≠ `"free_delivery"`, must be > 0, if percentage then ≤ 100
- `targetId` — required when targetType is `"service"`, `"category"`, or `"sub_category"`; must be a valid existing ID
- `endDate` — if provided, must be ≥ `startDate`
- `zoneIds` — if provided, each ID must be a valid existing zone

**Response `201`:**
```json
{
  "status": true,
  "message": "Banner created successfully",
  "data": {
    "id": 1,
    "title": "Eid Special Offer",
    "description": "Celebrate Eid with 20% off on all Dry Cleaning",
    "bannerImage": "https://s3.amazonaws.com/bucket/banners/eid.jpg",
    "offerType": "percentage",
    "discountValue": 20,
    "maxDiscountCap": 15.00,
    "targetType": "service",
    "targetId": 1,
    "zoneIds": [1, 3],
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "displayOrder": 1,
    "showOnHome": true,
    "isActive": true,
    "createdAt": "2026-05-15T10:00:00Z",
    "updatedAt": "2026-05-15T10:00:00Z"
  }
}
```

---

### GET `/admin/getAllBanners`

**Query Params:**
| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Results per page (default: 10) |
| `isActive` | boolean | Filter by active/inactive |
| `targetType` | string | Filter by `"global"` \| `"service"` \| `"category"` \| `"sub_category"` |
| `zoneId` | integer | Filter banners that apply to a specific zone |

**Example:** `GET /admin/getAllBanners?page=1&limit=10&isActive=true&targetType=service`

**Response `200`:**
```json
{
  "status": true,
  "message": "Banners fetched successfully",
  "data": {
    "banners": [
      {
        "id": 1,
        "title": "Eid Special Offer",
        "description": "20% off on all Dry Cleaning",
        "bannerImage": "https://s3.amazonaws.com/bucket/banners/eid.jpg",
        "offerType": "percentage",
        "discountValue": 20,
        "maxDiscountCap": 15.00,
        "targetType": "service",
        "targetId": 1,
        "target": {
          "id": 1,
          "name": "Dry Cleaning"
        },
        "zoneIds": [1, 3],
        "zones": [
          { "id": 1, "name": "London North" },
          { "id": 3, "name": "London South" }
        ],
        "startDate": "2026-06-01",
        "endDate": "2026-06-30",
        "displayOrder": 1,
        "showOnHome": true,
        "isActive": true,
        "createdAt": "2026-05-15T10:00:00Z"
      }
    ],
    "meta": {
      "pagination": {
        "total": 15,
        "page": 1,
        "limit": 10,
        "totalPages": 2
      }
    }
  }
}
```

---

### GET `/admin/getBannerById/:id`

**Response `200`:**
```json
{
  "status": true,
  "data": {
    "id": 1,
    "title": "Eid Special Offer",
    "offerType": "percentage",
    "discountValue": 20,
    "targetType": "service",
    "targetId": 1,
    "target": { "id": 1, "name": "Dry Cleaning" },
    "zoneIds": [1, 3],
    "zones": [
      { "id": 1, "name": "London North" },
      { "id": 3, "name": "London South" }
    ],
    "startDate": "2026-06-01",
    "endDate": "2026-06-30",
    "isActive": true
  }
}
```

---

### PATCH `/admin/updateBanner/:id`

**Request Body (all fields optional — send only what changes):**
```json
{
  "title": "Updated Eid Offer",
  "discountValue": 25,
  "endDate": "2026-07-15",
  "isActive": true
}
```

**Response `200`:**
```json
{
  "status": true,
  "message": "Banner updated successfully",
  "data": { "id": 1, "title": "Updated Eid Offer" }
}
```

---

### DELETE `/admin/deleteBanner/:id`

**Response `200`:**
```json
{
  "status": true,
  "message": "Banner deleted successfully"
}
```

---

### Banner Image Upload (Multipart)

If you want to support image upload directly instead of URL, add this endpoint:

### POST `/admin/uploadBannerImage`

**Content-Type:** `multipart/form-data`

**Form Fields:**
| Field | Type | Required |
|---|---|---|
| `image` | File | YES |

**Constraints:**
- Max file size: 5 MB
- Accepted formats: `jpg`, `jpeg`, `png`, `webp`
- Recommended dimensions: 1200 × 400 px

**Response `200`:**
```json
{
  "status": true,
  "data": {
    "url": "https://s3.amazonaws.com/bucket/banners/1715765400-eid.jpg"
  }
}
```

---

### Banner Discount Application Logic (Order Flow)

When a customer places an order, the backend must check for applicable banners:

```
FUNCTION applyBannerDiscount(order):
  1. Get customer's zone from their delivery address
  2. Query active banners WHERE:
       isActive = true
       AND (startDate IS NULL OR startDate <= TODAY)
       AND (endDate IS NULL OR endDate >= TODAY)
       AND (
         targetType = 'global'
         OR (targetType = 'service'      AND targetId = order.serviceId)
         OR (targetType = 'category'     AND targetId IN order.categoryIds)
         OR (targetType = 'sub_category' AND targetId IN order.subCategoryIds)
       )
       AND (
         zoneIds IS NULL
         OR zoneIds = '{}'
         OR customerZoneId = ANY(zoneIds)
       )
     ORDER BY displayOrder ASC
     LIMIT 1  -- apply the highest priority (lowest displayOrder) banner

  3. If banner found:
       IF offerType = 'percentage':
         discount = order.subtotal * (discountValue / 100)
         IF maxDiscountCap IS NOT NULL:
           discount = MIN(discount, maxDiscountCap)
       IF offerType = 'flat':
         discount = MIN(discountValue, order.subtotal)
       IF offerType = 'free_delivery':
         discount = order.deliveryFee

  4. Apply discount to order total
  5. Store banner_id on the order for tracking
```

---

### Customer App Endpoints (for reference)

These endpoints should also be available for the customer mobile app:

```
GET /customer/getActiveBanners?zoneId=1&page=1&limit=10
```

Returns banners where `showOnHome=true` filtered by customer's zone.

**Response:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "title": "Eid Special Offer",
      "bannerImage": "https://cdn.../eid.jpg",
      "offerType": "percentage",
      "discountValue": 20,
      "targetType": "service",
      "targetId": 1
    }
  ]
}
```

---

## 20. Blogs

### GET `/admin/getAllBlogs`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "title": "How We Clean Your Clothes",
      "content": "<p>Full HTML content...</p>",
      "coverImage": "https://cdn.../blog.jpg",
      "author": "Admin",
      "isPublished": true,
      "publishedAt": "2026-05-01T00:00:00Z",
      "createdAt": "2026-05-01T00:00:00Z"
    }
  ]
}
```

### POST `/admin/createBlog`
**Request Body:**
```json
{
  "title": "How We Clean Your Clothes",
  "content": "<p>Full HTML content...</p>",
  "coverImage": "https://cdn.../blog.jpg",
  "author": "Admin",
  "isPublished": true
}
```

### PUT `/admin/updateBlog/:blogId`
### DELETE `/admin/deleteBlog/:blogId`

---

## 21. FAQ

### GET `/admin/getAllFAQs`
**Response `200`:**
```json
{
  "status": true,
  "data": [
    {
      "id": 1,
      "question": "How long does dry cleaning take?",
      "answer": "Standard service takes 2-3 business days.",
      "category": "Service",
      "sortOrder": 1,
      "isActive": true
    }
  ]
}
```

### POST `/admin/createFAQ`
**Request Body:**
```json
{
  "question": "How long does dry cleaning take?",
  "answer": "Standard service takes 2-3 business days.",
  "category": "Service",
  "sortOrder": 1,
  "isActive": true
}
```

### PUT `/admin/updateFAQ/:faqId`
### DELETE `/admin/deleteFAQ/:faqId`

---

## 22. Customer Support

### GET `/admin/getSupportContact`
**Response `200`:**
```json
{
  "status": true,
  "data": {
    "phone": "+44 20 1234 5678",
    "email": "support@laundry.com",
    "whatsapp": "+44 7700 900000",
    "workingHours": "Mon–Fri 9am–6pm"
  }
}
```

### PATCH `/admin/updateSupportContact`
**Request Body:**
```json
{
  "phone": "+44 20 9999 9999",
  "email": "newsupport@laundry.com",
  "whatsapp": "+44 7700 999999",
  "workingHours": "Mon–Sat 8am–8pm"
}
```

---

## 23. Dashboard

### GET `/admin/adminDashboard`
**Response `200`:**
```json
{
  "status": true,
  "data": {
    "totalOrders": 1250,
    "totalRevenue": 56800.00,
    "totalCustomers": 840,
    "totalShops": 12,
    "recentOrders": [
      {
        "id": 1,
        "bookingId": "BK-2026-001",
        "customer": "Alice Smith",
        "status": "pending",
        "amount": 45.00,
        "createdAt": "2026-05-15T10:00:00Z"
      }
    ],
    "revenueByMonth": [
      { "month": "Jan", "revenue": 4200.00 },
      { "month": "Feb", "revenue": 4800.00 }
    ],
    "ordersByStatus": {
      "pending": 40,
      "inProgress": 30,
      "completed": 180,
      "cancelled": 20,
      "onHold": 10
    }
  }
}
```

---

## Miscellaneous

### GET `/admin/getUnitsDistanceAndCurrency`
**Query params:** `type` (e.g. `"currency"` or `"distance"`)

**Response:**
```json
{
  "status": true,
  "data": [
    { "id": 1, "label": "GBP (£)", "value": "GBP", "symbol": "£" },
    { "id": 2, "label": "USD ($)", "value": "USD", "symbol": "$" }
  ]
}
```

---

## Auth Header Reference

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
featureid: 3
```

- `Authorization` — Required on all protected routes
- `featureid` — Required only for zone-admin sessions to restrict access to allowed features

---

## Error Response Examples

```json
// 400 — Validation Error
{
  "status": false,
  "message": "Validation failed",
  "errors": {
    "title": "Title is required",
    "discountValue": "Discount value must be greater than 0"
  }
}

// 401 — Unauthorized
{
  "status": false,
  "message": "Unauthorized. Please login again."
}

// 404 — Not Found
{
  "status": false,
  "message": "Banner with id 99 not found"
}

// 409 — Conflict
{
  "status": false,
  "message": "Coupon code 'SUMMER20' already exists"
}

// 500 — Internal Server Error
{
  "status": false,
  "message": "Internal server error. Please try again later."
}
```

---

*Generated for Laundry Service Admin Panel — Frontend: React + Redux Toolkit + RTK Query*  
*Last updated: 2026-05-15*
