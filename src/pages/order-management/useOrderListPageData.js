import { useMemo } from "react";
import { getBackendTableTotal } from "../../shared/orderTablePagination";

/**
 * Prefer current arg result. While a new filter request is in flight and we
 * don't have that arg's payload yet, return undefined so the UI shows empty
 * (not the previous zone's rows).
 */
export function resolveOrderListResponse({ data, currentData, isFetching }) {
  if (currentData !== undefined) return currentData;
  if (isFetching) return undefined;
  return data;
}

/**
 * Normalizes RTK order list queries so filter changes never mix stale rows with new totals.
 * Empty API results (e.g. zone with zero bookings) stay empty in the table.
 */
export function useOrderListPageData(
  queryResult,
  { pickRows, totalCountField, listArrayField, isSearchPending = false }
) {
  const { data, currentData, isLoading, isFetching, refetch, isError } =
    queryResult;

  const responseBody = useMemo(
    () => resolveOrderListResponse({ data, currentData, isFetching }),
    [data, currentData, isFetching]
  );

  const isStaleListCache =
    isFetching && currentData === undefined && data !== undefined;

  const isTableLoading =
    isSearchPending ||
    isStaleListCache ||
    (isFetching && isLoading) ||
    (isFetching && responseBody == null);

  const rows = useMemo(() => {
    if (responseBody == null) return [];
    const raw = pickRows(responseBody);
    return Array.isArray(raw) ? raw : [];
  }, [responseBody, pickRows]);

  const totalRows = useMemo(() => {
    if (responseBody == null) return 0;
    return getBackendTableTotal(responseBody, totalCountField, listArrayField);
  }, [responseBody, totalCountField, listArrayField]);

  /** Embedded dashboard counts from list API when includeCounts=1 */
  const embeddedCounts = useMemo(() => {
    if (responseBody == null) return undefined;
    const counts = responseBody?.data?.counts;
    return counts && typeof counts === "object" ? counts : undefined;
  }, [responseBody]);

  return {
    rows,
    totalRows,
    isTableLoading,
    isLoading,
    refetch,
    isError: Boolean(isError),
    isStaleListCache,
    embeddedCounts,
  };
}
