import { useMemo } from "react";
import { useGetOrdersCountQuery } from "../../store/services/api";
import { getOrderDashboardStats } from "../../shared/orderDashboardStats";
import { resolveOrderListResponse } from "./useOrderListPageData";

/** Stat cards scoped to the same filters as the order table (RTK 2-safe). */
export function useOrderListStatsQuery(statsQueryParams) {
  const query = useGetOrdersCountQuery(statsQueryParams);

  const effectiveResponse = useMemo(
    () => resolveOrderListResponse(query),
    [query.data, query.currentData, query.isFetching]
  );

  const dashboardStats = useMemo(
    () => getOrderDashboardStats(effectiveResponse),
    [effectiveResponse]
  );

  return {
    dashboardStats,
    refetchCounts: query.refetch,
    isStatsLoading:
      query.isFetching &&
      effectiveResponse == null &&
      query.data !== undefined,
  };
}
