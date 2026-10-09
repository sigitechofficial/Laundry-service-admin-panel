/** Promotion labels shared by the Promotions page and the Promotions report. */

// buy_x_get_y and bundle are rejected by the backend for now — not offered.
export const BENEFIT_TYPES = [
  { value: "percentage_discount", label: "Percentage Discount" },
  { value: "fixed_amount_discount", label: "Fixed Amount Discount" },
  { value: "free_delivery", label: "Free Delivery" },
  { value: "delivery_discount", label: "Delivery Discount" },
  { value: "basket_discount", label: "Basket Discount" },
  { value: "item_discount", label: "Item Discount" },
  { value: "category_discount", label: "Category Discount" },
  { value: "service_discount", label: "Service Discount" },
  { value: "first_order_discount", label: "First Order Discount" },
  { value: "first_x_orders_discount", label: "First X Orders Discount" },
  { value: "cashback", label: "Cashback" },
  { value: "fixed_price", label: "Fixed Price Offer" },
];

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Expired" },
  { value: "archived", label: "Archived" },
];

export const STATUS_TONES = {
  active: "success",
  scheduled: "teal",
  draft: "created",
  pending_approval: "warning",
  approved: "info",
  paused: "warning",
  expired: "danger",
  archived: "neutral",
};

export const statusLabel = (s) => STATUS_OPTIONS.find((o) => o.value === s)?.label || s;
export const benefitLabel = (type) => BENEFIT_TYPES.find((b) => b.value === type)?.label || type;
