import { useCallback, useMemo } from "react";
import { useCsvExport } from "../../hooks/useCsvExport";
import { csvFormat } from "../../utilities/csvExport";
import {
  useGetAllZonesQuery,
  useGetShopsDataQuery,
} from "../../store/services/api";
import { ORDER_LIST_CSV_COLUMNS, mapBookingToOrderListRow } from "./orderListUtils";

function normalizeZones(data) {
  const raw = Array.isArray(data) ? data : data?.zones ?? data?.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

function hasValue(value) {
  return value != null && String(value).trim() !== "";
}

/**
 * Whole-filtered-set CSV for every order tab (All / Pending / Complete /
 * Cancelled / On hold). Re-runs the tab's list endpoint with `export: true`
 * so the server returns the entire filtered set (capped) instead of one page.
 *
 *   const csv = useOrderListCsvExport({
 *     tableFilters,
 *     fetchList,            // trigger from useLazyGet…Query
 *     pickRows,             // same picker the page uses for the table
 *     filenameBase: "orders-pending",
 *     orderStatuses,
 *   });
 *   <OrderListDataTable onDownload={csv.run} downloading={csv.isExporting} />
 */
export function useOrderListCsvExport({
  tableFilters,
  fetchList,
  pickRows,
  filenameBase = "orders",
  orderStatuses = [],
  columns = ORDER_LIST_CSV_COLUMNS,
  mapRow = mapBookingToOrderListRow,
}) {
  // Same cache entries OrderListFilters already subscribes to — no extra requests.
  const { data: zonesRes } = useGetAllZonesQuery(undefined, {
    skip: !hasValue(tableFilters?.zoneId),
  });
  const { data: shopsRes } = useGetShopsDataQuery(undefined, {
    skip: !hasValue(tableFilters?.shopId),
  });

  const zoneLabel = useMemo(() => {
    const id = tableFilters?.zoneId;
    if (!hasValue(id)) return "";
    const zone = normalizeZones(zonesRes?.data).find(
      (z) => String(z.id ?? z.zoneId ?? "") === String(id)
    );
    return zone?.name ?? zone?.zoneName ?? String(id);
  }, [tableFilters?.zoneId, zonesRes?.data]);

  const shopLabel = useMemo(() => {
    const id = tableFilters?.shopId;
    if (!hasValue(id)) return "";
    const shop = (shopsRes?.data?.AllShopsData || []).find(
      (s) => String(s.shopAddressId ?? "") === String(id)
    );
    return shop?.shopName ?? String(id);
  }, [tableFilters?.shopId, shopsRes?.data?.AllShopsData]);

  const statusLabel = useMemo(() => {
    const id = tableFilters?.statusId;
    if (!hasValue(id)) return "";
    const status = (orderStatuses || []).find(
      (s) => String(s.id ?? s.statusId ?? "") === String(id)
    );
    return status?.title ?? status?.name ?? status?.status ?? String(id);
  }, [tableFilters?.statusId, orderStatuses]);

  const filenameFilters = useMemo(
    () => ({
      search: tableFilters?.debouncedSearch || "",
      zone: zoneLabel,
      shop: shopLabel,
      status: statusLabel,
      from: csvFormat.date(tableFilters?.dateRange?.startDate),
      to: csvFormat.date(tableFilters?.dateRange?.endDate),
    }),
    [
      tableFilters?.debouncedSearch,
      tableFilters?.dateRange?.startDate,
      tableFilters?.dateRange?.endDate,
      zoneLabel,
      shopLabel,
      statusLabel,
    ]
  );

  const apiParams = tableFilters?.apiParams;
  const fetchAll = useCallback(async () => {
    // `false` → never serve the export from a cached page response.
    const res = await fetchList({ ...apiParams, export: true }, false).unwrap();
    const raw = pickRows(res);
    return {
      rows: Array.isArray(raw) ? raw : [],
      pagination: res?.data?.pagination || res?.data?.data?.pagination || null,
    };
  }, [fetchList, apiParams, pickRows]);

  return useCsvExport({
    filenameBase,
    columns,
    fetchAll,
    filenameFilters,
    mapRow,
  });
}

export default useOrderListCsvExport;
