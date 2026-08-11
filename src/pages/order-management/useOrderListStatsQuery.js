import { useMemo, useCallback } from "react";
import { useGetOrdersCountQuery } from "../../store/services/api";
import { getOrderDashboardStats } from "../../shared/orderDashboardStats";
import { resolveOrderListResponse } from "./useOrderListPageData";

/**
 * Stat cards scoped to the same filters as the order table.
 * When the list API already returned `counts` (includeCounts=1), skip the
 * separate ordersCount round-trip — that alone was adding ~0.8s on stage.
 */
export function useOrderListStatsQuery(statsQueryParams, embeddedCounts) {
  const hasEmbedded = embeddedCounts != null && typeof embeddedCounts === "object";
  const query = useGetOrdersCountQuery(statsQueryParams, {
    skip: hasEmbedded,
  });

  const effectiveResponse = useMemo(() => {
    if (hasEmbedded) return { data: embeddedCounts };
    return resolveOrderListResponse(query);
  }, [
    hasEmbedded,
    embeddedCounts,
    query.data,
    query.currentData,
    query.isFetching,
  ]);

  const dashboardStats = useMemo(
    () => getOrderDashboardStats(effectiveResponse),
    [effectiveResponse]
  );

  const refetchCounts = useCallback(() => {
    if (hasEmbedded) return Promise.resolve();
    return query.refetch();
  }, [hasEmbedded, query]);

  return {
    dashboardStats,
    refetchCounts,
    isStatsLoading:
      !hasEmbedded &&
      query.isFetching &&
      effectiveResponse == null &&
      query.data !== undefined,
  };
}
