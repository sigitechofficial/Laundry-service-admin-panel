/** Mirrors backend canAdminAssignOrReassignBooking / assignBookingToShop isReassign. */

const TERMINAL_BOOKING_STATUS_IDS = [17, 19, 21];
/** Status 4 = Driver Out for PickUp */
const DRIVER_OUT_FOR_PICKUP_STATUS_ID = 4;
/** Status 1 = Order Created — shop has not accepted yet. */
const ORDER_CREATED_STATUS_ID = 1;

function bookingStatusId(booking) {
  const raw =
    booking?.bookingStatusId ??
    booking?.bookingStatus?.id ??
    booking?.statusId;
  const id = Number(raw);
  return Number.isFinite(id) ? id : null;
}

export function canAdminAssignOrReassignFromBooking(booking) {
  if (!booking) return false;
  if (booking.canAdminAssign != null) return Boolean(booking.canAdminAssign);
  if (booking.invoiceStatus === "finalized") return false;
  const statusId = bookingStatusId(booking);
  if (statusId == null) return false;
  if (TERMINAL_BOOKING_STATUS_IDS.includes(statusId)) return false;
  if (statusId >= DRIVER_OUT_FOR_PICKUP_STATUS_ID) return false;
  return true;
}

/**
 * Reassign = a shop already accepted (or admin forced-assign, which sets status 3).
 * A brand-new order can still have laundryShopId from broadcast routing —
 * that is not accept, so the button stays Assign.
 */
export function isReassignBooking(booking) {
  if (!booking) return false;
  const statusId = bookingStatusId(booking);
  return statusId != null && statusId !== ORDER_CREATED_STATUS_ID;
}

export function assignActionLabel(booking) {
  return isReassignBooking(booking) ? "Reassign" : "Assign";
}

