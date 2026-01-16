# Cancellation Policy Documentation

## Overview

The Cancellation Policy system manages how customers can cancel their bookings and what charges (if any) apply based on various conditions. This document provides comprehensive information for implementing cancellation checks and booking management on the customer side.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [Policy Structure](#policy-structure)
3. [Policy Fields](#policy-fields)
4. [Business Logic](#business-logic)
5. [Cancellation Flow](#cancellation-flow)
6. [Charge Calculation](#charge-calculation)
7. [Implementation Guide](#implementation-guide)

---

## API Endpoints

### Get Cancellation Policies

**Endpoint:** `GET /admin/getCancellationPolicies`

**Query Parameters:**
- `isActive` (optional): Filter by active status (1 = active, 0 = inactive)
- `isDefault` (optional): Filter by default status (1 = default, 0 = not default)
- `page` (optional): Page number for pagination
- `limit` (optional): Number of records per page

**Response:**
```json
{
  "data": {
    "policies": [
      {
        "id": 1,
        "name": "Standard Cancellation Policy",
        "description": "Standard policy for order cancellations",
        "isActive": true,
        "isDefault": true,
        "createdAt": "2026-01-15T00:00:00Z",
        "expiry_date": "2027-01-15",
        "cancellationConfig": {
          "prePickupAbsoluteCurrency": "USD",
          "prePickupAbsoluteAmount": 10.00,
          "prePickupPercentage": null,
          "prePickupFreeChargeWindowMinutes": 30,
          "prePickupFirstCancellationLeniency": true,
          "unprocessedAbsoluteCurrency": "USD",
          "unprocessedAbsoluteAmount": 15.00,
          "unprocessedPercentage": null,
          "unprocessedAfterPickupMinutes": 60,
          "unprocessedOrderValuePercentage": 20.00,
          "allowCancelUnprocessed": true,
          "courtesyWindowDays": 7,
          "courtesyCapAmount": 50.00,
          "courtesyCount": 2,
          "customerLeniencyEnabled": true
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 1,
      "pages": 1
    }
  }
}
```

### Get Default/Active Policy

To get the active default policy for customer-side checks:

**Recommended Approach:**
```javascript
// Get the default active policy
GET /admin/getCancellationPolicies?isActive=1&isDefault=1&limit=1
```

This will return the policy that should be applied to customer cancellations.

---

## Policy Structure

### Basic Information

- **name**: Policy identifier/name
- **description**: Policy description
- **isActive**: Whether the policy is currently active (always `true` in current implementation)
- **isDefault**: Whether this is the default policy (always `true` in current implementation)
- **createdAt**: Policy creation timestamp
- **expiry_date**: Policy expiration date (format: YYYY-MM-DD)

### Cancellation Configuration (`cancellationConfig`)

The policy contains a `cancellationConfig` object with all the cancellation rules and charges.

---

## Policy Fields

### Pre-Pickup Charges

Charges applied when a customer cancels before the order is picked up.

| Field | Type | Description |
|-------|------|-------------|
| `prePickupAbsoluteCurrency` | String | Currency code (e.g., "USD", "EUR", "GBP") |
| `prePickupAbsoluteAmount` | Number | Fixed cancellation fee amount (flat fee) |
| `prePickupPercentage` | Number/null | Percentage-based fee (e.g., 5.00 for 5% of order value) |
| `prePickupFreeChargeWindowMinutes` | Number | Minutes after order placement where cancellations are free |
| `prePickupFirstCancellationLeniency` | Boolean | If true, first cancellation is automatically forgiven |

**Note:** Either `prePickupAbsoluteAmount` OR `prePickupPercentage` should be used, not both.

### Unprocessed Order Charges

Charges applied when a customer cancels an unprocessed order (after pickup but before processing).

| Field | Type | Description |
|-------|------|-------------|
| `unprocessedAbsoluteCurrency` | String | Currency code for unprocessed charges |
| `unprocessedAbsoluteAmount` | Number | Fixed cancellation fee for unprocessed orders |
| `unprocessedPercentage` | Number/null | Percentage-based fee for unprocessed orders |
| `unprocessedAfterPickupMinutes` | Number | Minutes after pickup when unprocessed cancellation charges apply |
| `unprocessedOrderValuePercentage` | Number | Percentage of order value used for calculation (if percentage-based) |
| `allowCancelUnprocessed` | Boolean | Whether customers can cancel unprocessed orders |

**Note:** Either `unprocessedAbsoluteAmount` OR `unprocessedPercentage` should be used, not both.

### Customer Leniency Settings

Settings that provide leniency to customers for cancellations.

| Field | Type | Description |
|-------|------|-------------|
| `customerLeniencyEnabled` | Boolean | Master switch for customer leniency features |
| `courtesyWindowDays` | Number | Days within which courtesy cancellations are tracked |
| `courtesyCapAmount` | Number | Maximum total amount that can be waived in courtesy window |
| `courtesyCount` | Number | Maximum number of courtesy cancellations allowed in window |

---

## Business Logic

### Policy Selection

1. **Always use the default active policy** (`isActive=true` AND `isDefault=true`)
2. **Check policy expiry**: Ensure `expiry_date` is in the future or null
3. **If no default policy exists**, handle gracefully (no charges or use fallback logic)

### Order Status Determination

To determine which cancellation charges apply, check the order status:

1. **Pre-Pickup**: Order not yet picked up
   - Use `prePickup*` fields
   
2. **Unprocessed**: Order picked up but not yet processed
   - Use `unprocessed*` fields
   - Only if `allowCancelUnprocessed` is `true`

3. **Processed**: Order already processed
   - Cancellation may not be allowed (check business rules)

---

## Cancellation Flow

### Step 1: Validate Cancellation Eligibility

```javascript
function canCancelOrder(order, policy) {
  // Check if order can be cancelled
  if (order.status === 'processed') {
    return { canCancel: false, reason: 'Order already processed' };
  }
  
  // Check unprocessed cancellation allowance
  if (order.status === 'unprocessed' && !policy.cancellationConfig.allowCancelUnprocessed) {
    return { canCancel: false, reason: 'Unprocessed orders cannot be cancelled' };
  }
  
  // Check policy expiry
  if (policy.expiry_date) {
    const expiryDate = new Date(policy.expiry_date);
    if (expiryDate < new Date()) {
      return { canCancel: false, reason: 'Policy expired' };
    }
  }
  
  return { canCancel: true };
}
```

### Step 2: Determine Order Stage

```javascript
function getOrderStage(order) {
  if (!order.pickupDate || order.pickupDate > new Date()) {
    return 'prePickup';
  }
  
  if (order.status === 'unprocessed' || order.status === 'picked_up') {
    return 'unprocessed';
  }
  
  return 'processed';
}
```

### Step 3: Check Free Cancellation Window

```javascript
function isWithinFreeWindow(order, policy, stage) {
  if (stage === 'prePickup') {
    const freeWindowMinutes = policy.cancellationConfig.prePickupFreeChargeWindowMinutes || 0;
    if (freeWindowMinutes === 0) return false;
    
    const orderTime = new Date(order.createdAt);
    const now = new Date();
    const minutesSinceOrder = (now - orderTime) / (1000 * 60);
    
    return minutesSinceOrder <= freeWindowMinutes;
  }
  
  return false;
}
```

### Step 4: Check First Cancellation Leniency

```javascript
async function checkFirstCancellationLeniency(customerId, policy) {
  if (!policy.cancellationConfig.prePickupFirstCancellationLeniency) {
    return false;
  }
  
  // Check if this is customer's first cancellation
  // You need to implement this based on your order history
  const previousCancellations = await getCustomerCancellations(customerId);
  return previousCancellations.length === 0;
}
```

### Step 5: Check Courtesy Window

```javascript
function checkCourtesyWindow(customerId, cancellationAmount, policy) {
  if (!policy.cancellationConfig.customerLeniencyEnabled) {
    return { eligible: false, reason: 'Customer leniency disabled' };
  }
  
  const windowDays = policy.cancellationConfig.courtesyWindowDays || 0;
  const capAmount = policy.cancellationConfig.courtesyCapAmount || 0;
  const maxCount = policy.cancellationConfig.courtesyCount || 0;
  
  if (windowDays === 0 || capAmount === 0 || maxCount === 0) {
    return { eligible: false, reason: 'Courtesy window not configured' };
  }
  
  // Get cancellations within window
  const windowStart = new Date();
  windowStart.setDate(windowStart.getDate() - windowDays);
  
  const recentCancellations = await getCustomerCancellationsInWindow(
    customerId, 
    windowStart
  );
  
  const totalWaived = recentCancellations.reduce((sum, c) => sum + c.waivedAmount, 0);
  const cancellationCount = recentCancellations.length;
  
  if (cancellationCount >= maxCount) {
    return { eligible: false, reason: 'Maximum courtesy cancellations reached' };
  }
  
  if (totalWaived + cancellationAmount > capAmount) {
    return { eligible: false, reason: 'Courtesy cap amount exceeded' };
  }
  
  return { 
    eligible: true, 
    remainingCount: maxCount - cancellationCount,
    remainingAmount: capAmount - totalWaived
  };
}
```

---

## Charge Calculation

### Pre-Pickup Cancellation Charge

```javascript
function calculatePrePickupCharge(order, policy) {
  const config = policy.cancellationConfig;
  const orderValue = order.totalAmount;
  
  // Check if within free window
  if (isWithinFreeWindow(order, policy, 'prePickup')) {
    return { charge: 0, reason: 'Within free cancellation window' };
  }
  
  // Check first cancellation leniency
  if (await checkFirstCancellationLeniency(order.customerId, policy)) {
    return { charge: 0, reason: 'First cancellation leniency' };
  }
  
  // Calculate charge
  let charge = 0;
  
  if (config.prePickupAbsoluteAmount && config.prePickupAbsoluteAmount > 0) {
    charge = config.prePickupAbsoluteAmount;
  } else if (config.prePickupPercentage && config.prePickupPercentage > 0) {
    charge = (orderValue * config.prePickupPercentage) / 100;
  }
  
  // Check courtesy window
  const courtesyCheck = await checkCourtesyWindow(
    order.customerId, 
    charge, 
    policy
  );
  
  if (courtesyCheck.eligible) {
    return { 
      charge: 0, 
      reason: 'Courtesy window waiver',
      waivedAmount: charge,
      courtesyInfo: courtesyCheck
    };
  }
  
  return { 
    charge: charge,
    currency: config.prePickupAbsoluteCurrency,
    reason: 'Standard cancellation charge'
  };
}
```

### Unprocessed Order Cancellation Charge

```javascript
function calculateUnprocessedCharge(order, policy) {
  const config = policy.cancellationConfig;
  
  if (!config.allowCancelUnprocessed) {
    return { charge: null, reason: 'Unprocessed cancellations not allowed' };
  }
  
  // Check if enough time has passed since pickup
  const pickupTime = new Date(order.pickupDate);
  const now = new Date();
  const minutesSincePickup = (now - pickupTime) / (1000 * 60);
  
  if (minutesSincePickup < config.unprocessedAfterPickupMinutes) {
    return { charge: 0, reason: 'Within grace period after pickup' };
  }
  
  // Calculate charge
  let charge = 0;
  const orderValue = order.totalAmount;
  
  if (config.unprocessedAbsoluteAmount && config.unprocessedAbsoluteAmount > 0) {
    charge = config.unprocessedAbsoluteAmount;
  } else if (config.unprocessedPercentage && config.unprocessedPercentage > 0) {
    // Use order value percentage if specified
    const percentageBase = config.unprocessedOrderValuePercentage 
      ? (orderValue * config.unprocessedOrderValuePercentage / 100)
      : orderValue;
    charge = (percentageBase * config.unprocessedPercentage) / 100;
  }
  
  return { 
    charge: charge,
    currency: config.unprocessedAbsoluteCurrency,
    reason: 'Unprocessed order cancellation charge'
  };
}
```

### Complete Cancellation Charge Calculation

```javascript
async function calculateCancellationCharge(order, policy) {
  // Validate cancellation eligibility
  const eligibility = canCancelOrder(order, policy);
  if (!eligibility.canCancel) {
    return { error: eligibility.reason };
  }
  
  // Determine order stage
  const stage = getOrderStage(order);
  
  if (stage === 'processed') {
    return { error: 'Cannot cancel processed orders' };
  }
  
  // Calculate charge based on stage
  if (stage === 'prePickup') {
    return await calculatePrePickupCharge(order, policy);
  } else if (stage === 'unprocessed') {
    return calculateUnprocessedCharge(order, policy);
  }
  
  return { error: 'Unknown order stage' };
}
```

---

## Implementation Guide

### 1. Fetch Active Policy

```javascript
async function getActiveCancellationPolicy() {
  try {
    const response = await fetch(
      '/admin/getCancellationPolicies?isActive=1&isDefault=1&limit=1',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Add authentication headers as needed
        }
      }
    );
    
    const data = await response.json();
    
    if (data.data.policies && data.data.policies.length > 0) {
      return data.data.policies[0];
    }
    
    return null; // No active policy found
  } catch (error) {
    console.error('Error fetching cancellation policy:', error);
    return null;
  }
}
```

### 2. Display Cancellation Information to Customer

```javascript
async function displayCancellationInfo(orderId) {
  const order = await getOrder(orderId);
  const policy = await getActiveCancellationPolicy();
  
  if (!policy) {
    // Handle no policy case
    return { canCancel: true, charge: 0, message: 'Cancellation available' };
  }
  
  const chargeInfo = await calculateCancellationCharge(order, policy);
  
  if (chargeInfo.error) {
    return {
      canCancel: false,
      message: chargeInfo.error
    };
  }
  
  return {
    canCancel: true,
    charge: chargeInfo.charge,
    currency: chargeInfo.currency,
    reason: chargeInfo.reason,
    waivedAmount: chargeInfo.waivedAmount || 0
  };
}
```

### 3. Process Cancellation Request

```javascript
async function processCancellation(orderId, customerId) {
  // Get order and policy
  const order = await getOrder(orderId);
  const policy = await getActiveCancellationPolicy();
  
  if (!policy) {
    // Handle cancellation without policy
    await cancelOrder(orderId);
    return { success: true, charge: 0 };
  }
  
  // Calculate charge
  const chargeInfo = await calculateCancellationCharge(order, policy);
  
  if (chargeInfo.error) {
    return { success: false, error: chargeInfo.error };
  }
  
  // If charge is 0, cancel immediately
  if (chargeInfo.charge === 0) {
    await cancelOrder(orderId);
    
    // Track waived amount if applicable
    if (chargeInfo.waivedAmount) {
      await trackCourtesyWaiver(customerId, chargeInfo.waivedAmount);
    }
    
    return { 
      success: true, 
      charge: 0,
      reason: chargeInfo.reason
    };
  }
  
  // If charge > 0, show confirmation to customer
  return {
    success: false, // Requires customer confirmation
    requiresConfirmation: true,
    charge: chargeInfo.charge,
    currency: chargeInfo.currency,
    message: `Cancellation will incur a charge of ${chargeInfo.currency} ${chargeInfo.charge}`
  };
}
```

### 4. Confirm Cancellation with Charge

```javascript
async function confirmCancellationWithCharge(orderId, customerId, paymentMethodId) {
  const order = await getOrder(orderId);
  const policy = await getActiveCancellationPolicy();
  const chargeInfo = await calculateCancellationCharge(order, policy);
  
  // Process payment for cancellation charge
  const paymentResult = await processPayment({
    amount: chargeInfo.charge,
    currency: chargeInfo.currency,
    orderId: orderId,
    customerId: customerId,
    paymentMethodId: paymentMethodId,
    type: 'cancellation_fee'
  });
  
  if (!paymentResult.success) {
    return { success: false, error: 'Payment processing failed' };
  }
  
  // Cancel the order
  await cancelOrder(orderId);
  
  // Record cancellation with charge
  await recordCancellation({
    orderId: orderId,
    customerId: customerId,
    charge: chargeInfo.charge,
    currency: chargeInfo.currency,
    reason: chargeInfo.reason,
    paymentId: paymentResult.paymentId
  });
  
  return { 
    success: true, 
    charge: chargeInfo.charge,
    paymentId: paymentResult.paymentId
  };
}
```

---

## Important Notes

1. **Policy Priority**: Always use the default active policy. If multiple policies exist, the one with `isDefault=true` and `isActive=true` should be used.

2. **Policy Expiry**: Always check `expiry_date` before applying a policy. Expired policies should not be used.

3. **Charge Calculation Priority**:
   - First check free cancellation window
   - Then check first cancellation leniency
   - Then check courtesy window
   - Finally calculate standard charge

4. **Currency Handling**: Always use the currency specified in the policy (`prePickupAbsoluteCurrency` or `unprocessedAbsoluteCurrency`).

5. **Percentage vs Absolute**: Policies use either percentage-based OR absolute amount charges, not both. Check which one is set (non-null/non-zero).

6. **Customer Leniency**: Track customer cancellation history to properly implement first cancellation leniency and courtesy windows.

7. **Order Status**: Accurately determine order status (pre-pickup, unprocessed, processed) to apply the correct cancellation rules.

---

## Error Handling

```javascript
// Example error handling
try {
  const chargeInfo = await calculateCancellationCharge(order, policy);
  // Process cancellation
} catch (error) {
  // Handle errors gracefully
  if (error.type === 'POLICY_NOT_FOUND') {
    // Fallback: allow cancellation with no charge
  } else if (error.type === 'POLICY_EXPIRED') {
    // Use fallback policy or deny cancellation
  } else {
    // Log error and show user-friendly message
  }
}
```

---

## Testing Checklist

- [ ] Test cancellation within free window (should be free)
- [ ] Test first cancellation leniency (should be free)
- [ ] Test second cancellation (should charge)
- [ ] Test cancellation after free window (should charge)
- [ ] Test unprocessed order cancellation (if allowed)
- [ ] Test processed order cancellation (should be denied)
- [ ] Test courtesy window limits (count and amount)
- [ ] Test percentage-based charges
- [ ] Test absolute amount charges
- [ ] Test policy expiry handling
- [ ] Test missing policy handling
- [ ] Test currency formatting

---

## Support

For questions or issues regarding cancellation policy implementation, please refer to the admin panel or contact the development team.


