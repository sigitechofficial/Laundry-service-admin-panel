import { useCallback, useRef, useState } from "react";
import useToaster from "../components/ui/Toaster";
import { getApiErrorMessage } from "../store/services/apiErrors";
import { CSV_EXPORT_MAX_ROWS, csvFilename, downloadCsv } from "../utilities/csvExport";

/**
 * One export behaviour for every admin list.
 *
 * Two sources, pick one:
 *   rows      – the already-filtered client-side set (small reference lists).
 *   fetchAll  – async () => ({ rows, pagination }) hitting the list endpoint
 *               with `export: 1` so the CSV covers the whole filtered set,
 *               not the visible page. `pagination.truncated` triggers a warning.
 *
 * Usage:
 *   const csv = useCsvExport({
 *     filenameBase: "customers",
 *     columns: CUSTOMER_CSV_COLUMNS,
 *     fetchAll: () => fetchCustomers({ ...apiParams, export: 1 }).unwrap()
 *                        .then((res) => ({ rows: res.data.customers, pagination: res.data.pagination })),
 *     filenameFilters: { search, zone: zoneName },
 *   });
 *   <DirectoryExportButton onClick={csv.run} loading={csv.isExporting} />
 */
export function useCsvExport({
  filenameBase,
  columns,
  rows,
  fetchAll,
  filenameFilters,
  mapRow,
  emptyMessage = "Nothing to export for the current filters.",
}) {
  const { success, info, warning, error } = useToaster();
  const [isExporting, setExporting] = useState(false);
  const inFlight = useRef(false);

  const run = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setExporting(true);
    try {
      let source = Array.isArray(rows) ? rows : [];
      let pagination = null;
      if (typeof fetchAll === "function") {
        info("Preparing export…");
        const result = await fetchAll();
        source = Array.isArray(result) ? result : result?.rows || [];
        pagination = Array.isArray(result) ? null : result?.pagination || null;
      }
      const shaped = typeof mapRow === "function" ? source.map(mapRow) : source;
      if (!shaped.length) {
        info(emptyMessage);
        return 0;
      }
      const filename = csvFilename(filenameBase, filenameFilters);
      const count = downloadCsv(filename, columns, shaped);
      if (pagination?.truncated) {
        warning(
          `Export capped at ${CSV_EXPORT_MAX_ROWS.toLocaleString()} rows of ${Number(
            pagination.totalRecords || 0
          ).toLocaleString()}. Narrow the filters to export the rest.`
        );
      } else {
        success(`Exported ${count.toLocaleString()} ${count === 1 ? "row" : "rows"} · ${filename}`);
      }
      return count;
    } catch (err) {
      error(getApiErrorMessage(err, "Export failed. Please try again."));
      return 0;
    } finally {
      inFlight.current = false;
      setExporting(false);
    }
  }, [rows, fetchAll, mapRow, columns, filenameBase, filenameFilters, emptyMessage, info, success, warning, error]);

  return { run, isExporting };
}

export default useCsvExport;
