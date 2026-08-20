import { formatAmount } from "../../utilities/formatters";

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

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

export function downloadReportCsv(filename, columns, rows) {
  const head = columns.map((c) => csvEscape(c.header));
  const lines = [head.join(",")];
  rows.forEach((row) => {
    lines.push(columns.map((c) => csvEscape(c.value ? c.value(row) : row[c.key])).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
