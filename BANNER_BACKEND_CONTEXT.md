# Banner & Offers — Backend API Context

> **Base URL:** `https://prodlaundry.sigisolutions.net/`  
> **Auth:** `Authorization: Bearer <token>` on all routes  
> **Content-Type:** `application/json`

---

## Database Schema

```sql
CREATE TABLE banners (
  id               SERIAL PRIMARY KEY,
  title            VARCHAR(200)   NOT NULL,
  description      TEXT,
  banner_image     VARCHAR(500),             -- S3/CDN image URL
  offer_type       VARCHAR(30)    NOT NULL,  -- 'percentage' | 'flat' | 'free_delivery'
  discount_value   DECIMAL(10,2),            -- NULL when offer_type = 'free_delivery'
  max_discount_cap DECIMAL(10,2),            -- Only used when offer_type = 'percentage'
  target_type      VARCHAR(30)    NOT NULL,  -- 'global' | 'service' | 'category' | 'sub_category'
  target_id        INTEGER,                  -- FK → services.id / categories.id / sub_categories.id
  zone_ids         INTEGER[],                -- NULL or [] = all zones
  start_date       DATE,
  end_date         DATE,
  display_order    INTEGER        NOT NULL DEFAULT 1,
  show_on_home     BOOLEAN        NOT NULL DEFAULT TRUE,
  is_active        BOOLEAN        NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMP      NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMP      NOT NULL DEFAULT NOW()
);
```

---

## 1. Create Banner

**POST** `/admin/createBanner`

### Request Body
```json
{
  "title": "Eid Special Offer",
  "description": "20% off on all Dry Cleaning this Eid",
  "bannerImage": "https://cdn.example.com/banners/eid.jpg",
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

### All Fields
| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | YES | Max 200 chars |
| `description` | string | NO | Optional short text |
| `bannerImage` | string | NO | Image URL after upload |
| `offerType` | string | YES | `"percentage"` \| `"flat"` \| `"free_delivery"` |
| `discountValue` | number | YES* | Required unless `offerType = "free_delivery"` |
| `maxDiscountCap` | number | NO | Only for `"percentage"` type — max £ discount |
| `targetType` | string | YES | `"global"` \| `"service"` \| `"category"` \| `"sub_category"` |
| `targetId` | integer | NO | Required when targetType ≠ `"global"` |
| `zoneIds` | integer[] | NO | `null` or `[]` = apply to all zones |
| `startDate` | string | NO | Format: `YYYY-MM-DD` |
| `endDate` | string | NO | Format: `YYYY-MM-DD`, must be ≥ startDate |
| `displayOrder` | integer | NO | Slider sort order, default `1` |
| `showOnHome` | boolean | NO | Show in customer app home slider, default `true` |
| `isActive` | boolean | NO | Default `true` |

### Validation Rules
- `title` → required, non-empty
- `offerType` → must be exactly one of: `percentage`, `flat`, `free_delivery`
- `discountValue` → required when offerType ≠ `free_delivery`; must be > 0; if `percentage` then ≤ 100
- `targetId` → required when targetType is `service`, `category`, or `sub_category`; must exist in DB
- `endDate` → if both startDate and endDate are given, endDate must be ≥ startDate
- `zoneIds` → each ID must be a valid existing zone

### Response `201`
```json
{
  "status": true,
  "message": "Banner created successfully",
  "data": {
    "id": 1,
    "title": "Eid Special Offer",
    "description": "20% off on all Dry Cleaning this Eid",
    "bannerImage": "https://cdn.example.com/banners/eid.jpg",
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

## 2. Get All Banners

**GET** `/admin/getAllBanners`

### Query Params
| Param | Type | Description |
|---|---|---|
| `page` | integer | Page number (default: 1) |
| `limit` | integer | Per page (default: 10) |
| `isActive` | boolean | Filter active/inactive |
| `targetType` | string | Filter by `global` / `service` / `category` / `sub_category` |
| `zoneId` | integer | Return banners that apply to this zone |

**Example:** `GET /admin/getAllBanners?page=1&limit=10&isActive=true`

### Response `200`
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
        "bannerImage": "https://cdn.example.com/banners/eid.jpg",
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

## 3. Update Banner

**PATCH** `/admin/updateBanner/:id`

### Request Body (all fields optional — send only what changes)
```json
{
  "title": "Updated Eid Offer",
  "discountValue": 25,
  "endDate": "2026-07-15",
  "isActive": false
}
```

### Response `200`
```json
{
  "status": true,
  "message": "Banner updated successfully",
  "data": {
    "id": 1,
    "title": "Updated Eid Offer",
    "discountValue": 25,
    "endDate": "2026-07-15",
    "isActive": false,
    "updatedAt": "2026-05-15T11:00:00Z"
  }
}
```

---

## 4. Delete Banner

**DELETE** `/admin/deleteBanner/:id`

### Response `200`
```json
{
  "status": true,
  "message": "Banner deleted successfully"
}
```

### Response `404`
```json
{
  "status": false,
  "message": "Banner with id 99 not found"
}
```

---

## 5. Banner Image Upload (Optional Separate Endpoint)

If image upload is handled separately before form submit:

**POST** `/admin/uploadBannerImage`  
**Content-Type:** `multipart/form-data`

| Field | Type | Constraint |
|---|---|---|
| `image` | File | Max 5MB, formats: jpg/png/webp |

### Response `200`
```json
{
  "status": true,
  "data": {
    "url": "https://s3.amazonaws.com/bucket/banners/1715765400-eid.jpg"
  }
}
```

---

## 6. Discount Application Logic (Order Flow)

When a customer places an order, apply banner discount like this:

```
1. Get customer zone from their delivery address

2. Find the best matching active banner:
   WHERE:
     is_active = true
     AND (start_date IS NULL OR start_date <= TODAY)
     AND (end_date IS NULL OR end_date >= TODAY)
     AND (
           target_type = 'global'
           OR (target_type = 'service'      AND target_id = order.serviceId)
           OR (target_type = 'category'     AND target_id IN order.categoryIds)
           OR (target_type = 'sub_category' AND target_id IN order.subCategoryIds)
         )
     AND (
           zone_ids IS NULL
           OR zone_ids = '{}'
           OR customerZoneId = ANY(zone_ids)
         )
   ORDER BY display_order ASC
   LIMIT 1

3. Calculate discount:
   - percentage  → discount = subtotal × (discountValue / 100)
                   if maxDiscountCap set → discount = MIN(discount, maxDiscountCap)
   - flat        → discount = MIN(discountValue, subtotal)
   - free_delivery → discount = deliveryFee

4. finalAmount = subtotal + deliveryFee - discount

5. Save banner_id on the order record for reporting
```

---

## Standard Error Responses

```json
// 400 Validation Error
{
  "status": false,
  "message": "Validation failed",
  "errors": {
    "title": "Title is required",
    "discountValue": "Must be greater than 0"
  }
}

// 401 Unauthorized
{ "status": false, "message": "Unauthorized. Please login again." }

// 404 Not Found
{ "status": false, "message": "Banner with id 99 not found" }

// 500 Server Error
{ "status": false, "message": "Internal server error" }
```
