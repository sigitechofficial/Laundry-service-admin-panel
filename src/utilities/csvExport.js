/**
 * Shared CSV export for every admin list.
 *
 * Column contract:
 *   { key: "email", header: "Email" }                 → row.email
 *   { key: "name",  header: "Name", value: (row) => … } → custom accessor
 *
 * Output is RFC 4180: every cell quoted, quotes doubled, CRLF line endings,
 * UTF‑8 BOM so Excel opens non‑ASCII (£, names) correctly, and formula
 * injection is neutralised ("=", "+", "-", "@" prefixes are escaped).
 */

const CSV_MIME = "text/csv;charset=utf-8;";
const BOM = "\ufeff";
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export const CSV_EXPORT_MAX_ROWS = 5000;

export function csvCell(value) {
  if (value == null) return '""';
  let text;
  if (value instanceof Date) {
    text = Number.isNaN(value.getTime()) ? "" : value.toISOString();
  } else if (typeof value === "object") {
    text = Array.isArray(value) ? value.join("; ") : JSON.stringify(value);
  } else {
    text = String(value);
  }
  if (FORMULA_PREFIX.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) {
    text = `'${text}`;
  }
  return `"${text.replace(/"/g, '""')}"`;
}

export function readCsvColumn(column, row, index) {
  if (typeof column.value === "function") return column.value(row, index);
  if (typeof column.key === "string" && column.key.includes(".")) {
    return column.key.split(".").reduce((acc, part) => (acc == null ? undefined : acc[part]), row);
  }
  return row?.[column.key];
}

/**
 * @param {{key?: string, header: string, value?: (row: any, i: number) => unknown}[]} columns
 * @param {any[]} rows
 * @returns {string}
 */
export function buildCsv(columns, rows = []) {
  const head = columns.map((c) => csvCell(c.header ?? c.key)).join(",");
  const body = rows.map((row, i) =>
    columns.map((c) => csvCell(readCsvColumn(c, row, i))).join(",")
  );
  return [head, ...body].join("\r\n");
}

/** Filename-safe slug: "Customers – London" → "customers-london". */
export function slugForFilename(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

function stampNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

/**
 * `csvFilename("orders", { status: "Pending", zone: "London" })`
 *   → "orders_status-pending_zone-london_20260917-1105.csv"
 * Empty / null filter values are skipped so unfiltered exports stay short.
 */
export function csvFilename(base, filters = {}) {
  const parts = [slugForFilename(base) || "export"];
  Object.entries(filters || {}).forEach(([k, v]) => {
    if (v == null || v === "" || v === false) return;
    const slug = slugForFilename(v === true ? k : `${k}-${v}`);
    if (slug) parts.push(slug);
  });
  parts.push(stampNow());
  return `${parts.join("_")}.csv`;
}

export function downloadTextFile(filename, text, mime = CSV_MIME) {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Build + download in one call. Returns the number of data rows written.
 */
export function downloadCsv(filename, columns, rows = []) {
  downloadTextFile(filename, BOM + buildCsv(columns, rows));
  return rows.length;
}

/**
 * Standard formatters for CSV cells so every module exports the same shape.
 */
export const csvFormat = {
  date(value) {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  },
  dateTime(value) {
    if (!value) return "";
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  },
  money(value) {
    if (value == null || value === "") return "";
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "";
  },
  bool(value, yes = "Yes", no = "No") {
    return value ? yes : no;
  },
  list(value) {
    return Array.isArray(value) ? value.filter(Boolean).join("; ") : value ?? "";
  },
};
