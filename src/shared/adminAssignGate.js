/** Mirrors backend canAdminAssignOrReassignBooking for admin UI. */

const TERMINAL_BOOKING_STATUS_IDS = [17, 19, 21];

export function canAdminAssignOrReassignFromBooking(booking) {
  if (!booking) return false;
  if (booking.canAdminAssign != null) return Boolean(booking.canAdminAssign);
  if (booking.invoiceStatus === "finalized") return false;
  const statusId = Number(booking.bookingStatusId);
  if (TERMINAL_BOOKING_STATUS_IDS.includes(statusId)) return false;
  return true;
}

export function isReassignBooking(booking) {
  if (!booking) return false;
  if (booking.laundryShopId != null && booking.laundryShopId !== "") {
    return true;
  }
  if (booking.adminAssignedShopId != null && booking.adminAssignedShopId !== "") {
    return true;
  }
  const statusId = Number(booking.bookingStatusId);
  return statusId !== 1;
}

export function assignActionLabel(booking) {
  return isReassignBooking(booking) ? "Reassign" : "Assign";
}
