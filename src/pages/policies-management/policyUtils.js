import {
  DATE_TIME_FORMAT,
  formatDate,
  formatMoney,
  resolveCurrencySymbol,
} from "../../utilities/formatters";

export { formatMoney as formatPolicyMoney, formatDate as formatPolicyDate };

/** Symbol of the policy's zone currency, else of its ISO code; '' when neither is known. */
export function resolvePolicyCurrencySymbol({ zone, code, currencyUnits = [] } = {}) {
  return resolveCurrencySymbol(zone, currencyUnits) || resolveCurrencySymbol(code, currencyUnits);
}

export function formatPolicyDateTime(value) {
  return formatDate(value, DATE_TIME_FORMAT);
}

export function formatPolicyBool(value) {
  return value ? "Yes" : "No";
}
