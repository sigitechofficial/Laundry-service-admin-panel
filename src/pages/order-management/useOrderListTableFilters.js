import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOrderListApiParams,
  orderListHasActiveFilters,
} from "./orderListQuery";

const SEARCH_DEBOUNCE_MS = 400;

export function useOrderListTableFilters(initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [zoneId, setZoneIdState] = useState("");
  const [statusId, setStatusIdState] = useState("");
  const [dateRange, setDateRangeState] = useState(null);
  const [searchInput, setSearchInputState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const resetPage = useCallback(() => setPage(1), []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const setZoneId = useCallback(
    (value) => {
      setZoneIdState(value);
      resetPage();
    },
    [resetPage]
  );

  const setStatusId = useCallback(
    (value) => {
      setStatusIdState(value);
      resetPage();
    },
    [resetPage]
  );

  const setDateRange = useCallback(
    (value) => {
      setDateRangeState(value);
      resetPage();
    },
    [resetPage]
  );

  const setSearchInput = useCallback((value) => {
    setSearchInputState(value);
  }, []);

  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setZoneIdState("");
    setStatusIdState("");
    setDateRangeState(null);
    setSearchInputState("");
    setDebouncedSearch("");
    setPage(1);
  }, []);

  const apiParams = useMemo(
    () =>
      buildOrderListApiParams({
        page,
        limit: pageSize,
        zoneId,
        statusId,
        dateRange,
        search: debouncedSearch,
      }),
    [page, pageSize, zoneId, statusId, dateRange, debouncedSearch]
  );

  const hasActiveFilters = useMemo(
    () =>
      orderListHasActiveFilters({
        zoneId,
        statusId,
        dateRange,
        search: debouncedSearch || searchInput,
      }),
    [zoneId, statusId, dateRange, debouncedSearch, searchInput]
  );

  const isSearchPending =
    searchInput.trim() !== debouncedSearch.trim();

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    zoneId,
    setZoneId,
    statusId,
    setStatusId,
    dateRange,
    setDateRange,
    searchInput,
    setSearchInput,
    debouncedSearch,
    isSearchPending,
    apiParams,
    clearFilters,
    hasActiveFilters,
  };
}
