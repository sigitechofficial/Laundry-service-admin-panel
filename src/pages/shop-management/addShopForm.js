/** Add-shop form constants, validators, and API payload builders.
 *  Payload shapes must stay identical to the previous Add Shop page.
 */

export const MACHINERY_COUNT_OPTIONS = ["0", "1-2", "3-5", "5+"];
export const MACHINERY_COUNT_TO_NUMBER = { "0": 0, "1-2": 2, "3-5": 5, "5+": 6 };

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DEFAULT_WORKING_DAYS = DAYS_OF_WEEK.map((dayOfWeek) =>
  dayOfWeek === "Sunday"
    ? { dayOfWeek, openTime: null, closeTime: null, status: false }
    : { dayOfWeek, openTime: "09:00:00", closeTime: "18:00:00", status: true }
);

export const WIZARD_STEPS = [
  { id: "account", label: "Account", hint: "Owner & coverage" },
  { id: "location", label: "Location", hint: "Shop address" },
  { id: "operations", label: "Operations", hint: "Hours & services" },
  { id: "review", label: "Review", hint: "Confirm & create" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function getAccountErrors(formData) {
  const errors = {};
  if (!formData.firstName?.trim()) errors.firstName = "First name is required";
  if (!formData.lastName?.trim()) errors.lastName = "Last name is required";
  if (!formData.email?.trim()) errors.email = "Email is required";
  else if (!EMAIL_RE.test(formData.email)) errors.email = "Enter a valid email";
  if (!formData.password) errors.password = "Password is required";
  if (!formData.phoneNum?.trim()) errors.phoneNum = "Phone is required";
  if (!formData.countryCode?.trim()) errors.countryCode = "Country code is required";
  if (!formData.countryId) errors.countryId = "Country is required";
  if (!formData.cityId) errors.cityId = "City is required";
  if (!formData.noOfEmployee) errors.noOfEmployee = "Employee count is required";
  if (!formData.zone) errors.zone = "Zone is required";
  if (!formData.currencyUnitId) errors.currencyUnitId = "Select a zone with a currency";
  return errors;
}

export function isAccountComplete(formData) {
  return Object.keys(getAccountErrors(formData)).length === 0;
}

export function isLocationComplete(formData) {
  return !!formData.streetAddress?.trim();
}

/** POST admin/registerAgent — same keys as before. noOfEmployee stays UI-only. */
export function buildRegisterPayload(formData) {
  return {
    firstName: formData.firstName,
    lastName: formData.lastName,
    email: formData.email,
    password: formData.password,
    phoneNum: formData.phoneNum,
    countryCode: formData.countryCode || "+44",
    countryId: Number(formData.countryId) || formData.countryId,
    cityId: Number(formData.cityId) || formData.cityId,
    zoneId: formData.zone ? Number(formData.zone) : undefined,
    currencyUnitId: formData.currencyUnitId
      ? Number(formData.currencyUnitId)
      : undefined,
  };
}

/** POST admin/addAgentAddress/:userId — same keys as before. */
export function buildAddressPayload(formData) {
  return {
    streetAddress: formData.streetAddress,
    district: formData.district || undefined,
    province: formData.province || undefined,
    postalcode: formData.postalcode || undefined,
    lat: formData.lat || undefined,
    lng: formData.lng || undefined,
    coordinates: formData.coordinates || undefined,
    addressType: formData.addressType || "LaundaryShopAddress",
  };
}

/** POST admin/addAgentBusinessInfo/:userId — same keys as before. */
export function buildBusinessPayload(formData) {
  const machineryCount = Object.entries(formData.machineryCount)
    .filter(([, v]) => v != null && v !== "")
    .map(([machineId, radioValue]) => ({
      machineId: Number(machineId) || machineId,
      total: MACHINERY_COUNT_TO_NUMBER[radioValue] ?? 0,
    }));

  const servicesPayload = (formData.services || []).map((id) => ({
    serviceId: Number(id) || id,
  }));

  const serviceTimes = (formData.services || [])
    .map((serviceId) => {
      const hours = formData.serviceTimes?.[serviceId];
      if (hours == null || hours === "") return null;
      return {
        serviceId: Number(serviceId) || serviceId,
        serviceTimeRequired: Number(hours) || 0,
      };
    })
    .filter(Boolean);

  const bussinessWorkingDays = (formData.bussinessWorkingDays || []).map((day) => ({
    dayOfWeek: day.dayOfWeek,
    openTime: day.status ? day.openTime : null,
    closeTime: day.status ? day.closeTime : null,
    status: !!day.status,
  }));

  return {
    shopName: formData.shopName || null,
    matchProfileOptions: formData.matchProfileOptions || null,
    otherText: formData.otherText || null,
    machineryCount: machineryCount.length ? machineryCount : [],
    services: servicesPayload,
    serviceTimes,
    bussinessWorkingDays,
  };
}

export function formatClock(value) {
  if (!value) return "—";
  return String(value).slice(0, 5);
}

export function formatHoursSummary(days = []) {
  return days.map((day) =>
    day.status
      ? `${day.dayOfWeek.slice(0, 3)} ${formatClock(day.openTime)}–${formatClock(day.closeTime)}`
      : `${day.dayOfWeek.slice(0, 3)} Closed`
  );
}
