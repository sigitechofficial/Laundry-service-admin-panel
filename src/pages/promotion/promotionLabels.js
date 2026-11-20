/** Promotion labels shared by the Promotions page and the Promotions report. */

// buy_x_get_y is rejected by the backend for now — not offered. "bundle" is Bulk Price (10 for £25).
export const BENEFIT_TYPES = [
  { value: "percentage_discount", label: "Percentage Discount" },
  { value: "fixed_amount_discount", label: "Fixed Amount Discount" },
  { value: "free_delivery", label: "Free Delivery" },
  { value: "delivery_discount", label: "Delivery Discount" },
  { value: "basket_discount", label: "Whole Order Discount" },
  { value: "item_discount", label: "Item Discount" },
  { value: "category_discount", label: "Category Discount" },
  { value: "service_discount", label: "Service Discount" },
  { value: "bundle", label: "Bulk Price" },
  { value: "first_order_discount", label: "First Order Discount" },
  { value: "first_x_orders_discount", label: "First X Orders Discount" },
  { value: "cashback", label: "Cashback" },
  { value: "fixed_price", label: "Fixed Price Offer" },
];

/** One line on what each benefit type does, shown under the Benefit Type field. */
export const BENEFIT_HELP = {
  percentage_discount: "Older type: % off the laundry total. Use Whole Order Discount for new promotions.",
  fixed_amount_discount: "Older type: £ off the laundry total. Use Whole Order Discount for new promotions.",
  free_delivery: "Delivery is already free, so this saves nothing today.",
  delivery_discount: "£ off delivery. Delivery is already free, so this saves nothing today.",
  basket_discount: "% or £ off the whole laundry total (all services and add-ons; the service fee is not included).",
  item_discount: "% or £ off each chosen item, every piece of it.",
  category_discount: "% or £ off each item in the chosen categories. Add-ons not included.",
  service_discount: "% or £ off each item in the chosen services. Add-ons not included.",
  bundle: "A set number of pieces for one price, e.g. 10 shirts for £25.",
  first_order_discount: "% off a customer's very first order, once.",
  first_x_orders_discount: "% off each of a customer's first N orders.",
  cashback: "Nothing off now: the customer gets credit for a later order after this one is completed.",
  fixed_price: "The whole laundry basket for one set price, up to a basket limit you choose.",
};

export const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "draft", label: "Draft" },
  { value: "pending_approval", label: "Pending approval" },
  { value: "approved", label: "Approved" },
  { value: "scheduled", label: "Scheduled" },
  { value: "active", label: "Live" },
  { value: "paused", label: "Paused" },
  { value: "expired", label: "Ended" },
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
