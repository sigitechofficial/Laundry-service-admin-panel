import { useMemo, useCallback } from "react";
import { buildOrderStatsQueryParams } from "./orderListQuery";
import { useOrderListPageData } from "./useOrderListPageData";

/** Shared stats + list query wiring for order tabs. */
export function useOrderListPageQueries({
  tableFilters,
  useListQuery,
  pickRows,
  totalCountField,
}) {
  const statsQueryParams = useMemo(
    () =>
      buildOrderStatsQueryParams({
        zoneId: tableFilters.zoneId,
        statusId: tableFilters.statusId,
        dateRange: tableFilters.dateRange,
        search: tableFilters.debouncedSearch,
      }),
    [
      tableFilters.zoneId,
      tableFilters.statusId,
      tableFilters.dateRange,
      tableFilters.debouncedSearch,
    ]
  );

  const listQuery = useListQuery(tableFilters.apiParams);

  const pageData = useOrderListPageData(listQuery, {
    pickRows,
    totalCountField,
    isSearchPending: tableFilters.isSearchPending,
  });

  const tableFilterKey = useMemo(
    () =>
      [
        tableFilters.zoneId,
        tableFilters.statusId,
        tableFilters.debouncedSearch,
        tableFilters.dateRange?.startDate?.valueOf?.() ??
          tableFilters.dateRange?.startDate,
        tableFilters.dateRange?.endDate?.valueOf?.() ??
          tableFilters.dateRange?.endDate,
      ].join("|"),
    [
      tableFilters.zoneId,
      tableFilters.statusId,
      tableFilters.debouncedSearch,
      tableFilters.dateRange,
    ]
  );

  return { statsQueryParams, ...pageData, tableFilterKey };
}

export function usePickOrderListRows(field) {
  return useCallback((res) => res?.data?.[field], [field]);
}
