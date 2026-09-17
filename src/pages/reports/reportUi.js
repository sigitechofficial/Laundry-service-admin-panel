import { formatAmount } from "../../utilities/formatters";
import { downloadCsv } from "../../utilities/csvExport";

export function unwrapReport(response) {
  const payload = response?.data || {};
  return {
    rows: Array.isArray(payload.data) ? payload.data : [],
    extra: payload.data && !Array.isArray(payload.data) ? payload.data : payload,
    total: Number(payload.total || 0),
    page: Number(payload.page || 1),
    limit: Number(payload.limit || 20),
    summary: payload.summary || {},
    currency: payload.currency || {},
    failures: Array.isArray(payload.failures) ? payload.failures : [],
    filters: payload.filters || {},
  };
}

export function reportMoney(amount, currencyOrRow) {
  return formatAmount(amount, currencyOrRow, { applyDefault: true });
}

/** Honest share from already-loaded counts. Returns "—" when either value is unusable. */
export function reportShare(part, whole, digits = 1) {
  const numerator = Number(part);
  const denominator = Number(whole);
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return "—";
  }
  return `${((numerator / denominator) * 100).toFixed(digits)}%`;
}

/** Same column contract as utilities/csvExport ({ header, key | value(row) }). */
export function downloadReportCsv(filename, columns, rows) {
  return downloadCsv(filename, columns, rows || []);
}

export function reportDetailPath(base, id) {
  if (id == null || id === "") return null;
  const value = String(id).trim();
  if (!value || value === "undefined" || value === "null") return null;
  return `${base}/${value}`;
}

export function shopDetailPath(shopId) {
  return reportDetailPath("/shop-management/details", shopId);
}

export function shopSettlementPath(shopId) {
  const base = shopDetailPath(shopId);
  return base ? `${base}/settlement` : null;
}

export function customerDetailPath(customerId) {
  return reportDetailPath("/customer-management/details", customerId);
}

export function driverDetailPath(driverId) {
  return reportDetailPath("/driver-management/details", driverId);
}

export {
  ReportQueryState,
  ReportInfo,
  ReportEntityLink,
  ReportQueueLink,
  RatingHistogram,
} from "./reportUi.jsx";
