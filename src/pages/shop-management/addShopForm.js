/** Add-shop form constants, validators, and API payload builders.
 *  Payload shapes must stay identical to the previous Add Shop page,
 *  except where a shape was actively corrupting data (machinery total,
 *  otherText) — see the notes on buildBusinessPayload.
 */

import { isValidCustomerPhone, PHONE_HINT } from "../../utilities/customerPhone";
import { validatePostalCodeForCountry } from "../../utilities/postalCodeValidation";

export const MACHINERY_COUNT_OPTIONS = ["0", "1-2", "3-5", "5+"];

/**
 * The shop "profile" is a fixed backend ENUM
 * (bussinessInformation.matchProfileOptions). These strings must match the
 * server enum BYTE-FOR-BYTE (note the missing space after each hyphen and the
 * exact casing) — a free-text value here is silently rejected/truncated by
 * MySQL and, combined with a stale otherText, triggers the backend
 * "You can Add this Field Only when Select Other Option" error. Keep in sync
 * with backend/models/bussinessinformation.js.
 */
export const SHOP_PROFILE_VALUES = {
  ALL_IN_HOUSE:
    "ALL IN HOUSE- Washing, Ironing and Dry cleaning all done by us",
  OUTSOURCE_DRY:
    "OUTSOURCE DRY CLEANING- Washing and Drying handled in house",
  OUTSOURCE_ALL:
    "OUTSOURCE ALL- We are just a shop front that outsources all of the processing",
  OTHER: "Other",
};

/** Options for the profile <Select> — value is sent verbatim to the backend. */
export const SHOP_PROFILE_OPTIONS = [
  { value: SHOP_PROFILE_VALUES.ALL_IN_HOUSE, label: "All in house — we wash, iron & dry clean everything" },
  { value: SHOP_PROFILE_VALUES.OUTSOURCE_DRY, label: "Outsource dry cleaning — wash & dry handled in house" },
  { value: SHOP_PROFILE_VALUES.OUTSOURCE_ALL, label: "Outsource all — shop front only, all processing outsourced" },
  { value: SHOP_PROFILE_VALUES.OTHER, label: "Other (describe below)" },
];

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
// Letters (incl. accents), spaces, apostrophes and hyphens — same class the
// customer forms use, so a name like "O'Brien-Smith" is allowed but junk
// like "dn54ikrpl;.l[p" is not.
const NAME_RE = /^[\p{L}][\p{L} '-]*$/u;
// International dialling code: '+' then 1–4 digits (e.g. +44, +1, +971).
const COUNTRY_CODE_RE = /^\+[1-9]\d{0,3}$/;

function trimmed(value) {
  return String(value ?? "").trim();
}

/** Minutes since midnight for an "HH:mm" / "HH:mm:ss" string, or null. */
export function timeToMinutes(value) {
  const s = trimmed(value).slice(0, 5);
  const m = /^(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function getAccountErrors(formData) {
  const errors = {};

  const firstName = trimmed(formData.firstName);
  if (!firstName) errors.firstName = "First name is required";
  else if (firstName.length < 2) errors.firstName = "Enter at least 2 characters";
  else if (!NAME_RE.test(firstName)) errors.firstName = "Letters, spaces, ' and - only";

  const lastName = trimmed(formData.lastName);
  if (!lastName) errors.lastName = "Last name is required";
  else if (lastName.length < 2) errors.lastName = "Enter at least 2 characters";
  else if (!NAME_RE.test(lastName)) errors.lastName = "Letters, spaces, ' and - only";

  const email = trimmed(formData.email);
  if (!email) errors.email = "Email is required";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email";
  else if (email.length > 100) errors.email = "Email is too long";

  if (!formData.password) errors.password = "Password is required";
  else if (String(formData.password).length < 6)
    errors.password = "Password must be at least 6 characters";

  const countryCode = trimmed(formData.countryCode);
  if (!countryCode) errors.countryCode = "Country code is required";
  else if (!COUNTRY_CODE_RE.test(countryCode))
    errors.countryCode = "Use a dialling code like +44";

  if (!trimmed(formData.phoneNum)) errors.phoneNum = "Phone is required";
  else if (!isValidCustomerPhone(formData.phoneNum)) errors.phoneNum = PHONE_HINT;

  if (!formData.countryId) errors.countryId = "Country is required";
  if (!formData.cityId) errors.cityId = "City is required";

  const emp = trimmed(formData.noOfEmployee);
  if (!emp) errors.noOfEmployee = "Employee count is required";
  else if (!/^\d+$/.test(emp) || Number(emp) < 1)
    errors.noOfEmployee = "Enter a whole number of 1 or more";

  if (!formData.zone) errors.zone = "Zone is required";
  if (!formData.currencyUnitId) errors.currencyUnitId = "Select a zone with a currency";
  return errors;
}

export function isAccountComplete(formData) {
  return Object.keys(getAccountErrors(formData)).length === 0;
}

/**
 * Location validation. `country` is the selected country object/name so the
 * postcode is checked against the right national format (reuses the shared
 * validatePostalCodeForCountry). Address must be geocoded (lat/lng present)
 * so the shop can be dispatched.
 */
export function getLocationErrors(formData, country) {
  const errors = {};
  const street = trimmed(formData.streetAddress);
  if (!street) errors.streetAddress = "Address is required";
  else if (!formData.lat || !formData.lng)
    errors.streetAddress = "Pick a result from the address search so the shop is geocoded";

  const postcode = trimmed(formData.postalcode);
  if (!postcode) {
    errors.postalcode = "Postal code is required";
  } else if (country) {
    const res = validatePostalCodeForCountry(postcode, country);
    if (!res.ok) errors.postalcode = res.message || "Enter a valid postal code";
  }
  return errors;
}

export function isLocationComplete(formData, country) {
  return Object.keys(getLocationErrors(formData, country)).length === 0;
}

const PROFILE_VALUE_SET = new Set(SHOP_PROFILE_OPTIONS.map((o) => o.value));

/** Operations step: shop name, profile, services, and working hours. */
export function getOperationsErrors(formData) {
  const errors = {};

  const shopName = trimmed(formData.shopName);
  // Backend column is NOT NULL — an empty shop name is a 500, not "optional".
  if (!shopName) errors.shopName = "Shop name is required";
  else if (shopName.length < 2) errors.shopName = "Enter at least 2 characters";

  const profile = trimmed(formData.matchProfileOptions);
  if (!profile) errors.matchProfileOptions = "Select a profile";
  else if (!PROFILE_VALUE_SET.has(profile))
    errors.matchProfileOptions = "Select a profile from the list";

  const otherText = trimmed(formData.otherText);
  if (profile === SHOP_PROFILE_VALUES.OTHER && !otherText) {
    errors.otherText = "Describe the shop's profile";
  }

  if (!Array.isArray(formData.services) || formData.services.length === 0) {
    errors.services = "Select at least one service";
  }

  const days = Array.isArray(formData.bussinessWorkingDays)
    ? formData.bussinessWorkingDays
    : [];
  const openDays = days.filter((d) => d.status);
  if (openDays.length === 0) {
    errors.workingDays = "Set opening hours for at least one day";
  } else {
    const bad = openDays.find((d) => {
      const o = timeToMinutes(d.openTime);
      const c = timeToMinutes(d.closeTime);
      return o == null || c == null || o >= c;
    });
    if (bad) {
      errors.workingDays = `${bad.dayOfWeek}: opening time must be before closing time`;
    }
  }
  return errors;
}

export function isOperationsComplete(formData) {
  return Object.keys(getOperationsErrors(formData)).length === 0;
}

/** POST admin/registerAgent — same keys as before. noOfEmployee stays UI-only. */
export function buildRegisterPayload(formData) {
  return {
    firstName: trimmed(formData.firstName),
    lastName: trimmed(formData.lastName),
    email: trimmed(formData.email),
    password: formData.password,
    phoneNum: trimmed(formData.phoneNum),
    countryCode: trimmed(formData.countryCode) || "+44",
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
    streetAddress: trimmed(formData.streetAddress),
    district: trimmed(formData.district) || undefined,
    province: trimmed(formData.province) || undefined,
    postalcode: trimmed(formData.postalcode) || undefined,
    lat: formData.lat || undefined,
    lng: formData.lng || undefined,
    coordinates: formData.coordinates || undefined,
    addressType: formData.addressType || "LaundaryShopAddress",
  };
}

/** POST admin/addAgentBusinessInfo/:userId. */
export function buildBusinessPayload(formData) {
  const machineryCount = Object.entries(formData.machineryCount || {})
    .filter(([, v]) => v != null && v !== "")
    // total is the ENUM bucket string ('0' | '1-2' | '3-5' | '5+') — the same
    // shape the agent app sends and the machineCount model stores. The old
    // code converted it to a number, which is NOT a member of the ENUM and
    // silently corrupted admin-created shops' machine counts.
    .map(([machineId, bucket]) => ({
      machineId: Number(machineId) || machineId,
      total: String(bucket),
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

  const profile = trimmed(formData.matchProfileOptions);
  return {
    shopName: trimmed(formData.shopName) || null,
    matchProfileOptions: profile || null,
    // otherText is only valid alongside the "Other" profile — sending it with
    // any other option triggers the backend "Select Other Option" error.
    otherText:
      profile === SHOP_PROFILE_VALUES.OTHER
        ? trimmed(formData.otherText) || null
        : null,
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

/** Label for a stored profile value, for the read-only Review step. */
export function profileLabel(value) {
  if (!value) return "—";
  return SHOP_PROFILE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
