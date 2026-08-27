import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildOrderListApiParams,
  DEFAULT_ORDER_LIST_SORT_BY,
  DEFAULT_ORDER_LIST_SORT_DIR,
  normalizeOrderListSortBy,
  normalizeOrderListSortDir,
  orderListHasActiveFilters,
} from "./orderListQuery";

const SEARCH_DEBOUNCE_MS = 400;

export function useOrderListTableFilters(initialPageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [zoneId, setZoneIdState] = useState("");
  const [statusId, setStatusIdState] = useState("");
  const [recurringType, setRecurringTypeState] = useState("");
  const [dateRange, setDateRangeState] = useState(null);
  const [searchInput, setSearchInputState] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortByState] = useState(DEFAULT_ORDER_LIST_SORT_BY);
  const [sortDir, setSortDirState] = useState(DEFAULT_ORDER_LIST_SORT_DIR);

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

  const setRecurringType = useCallback(
    (value) => {
      setRecurringTypeState(value);
      resetPage();
    },
    [resetPage]
  );

  const setPageSize = useCallback((size) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const setSortBy = useCallback((value) => {
    setSortByState(normalizeOrderListSortBy(value));
    setPage(1);
  }, []);

  const setSortDir = useCallback((value) => {
    setSortDirState(normalizeOrderListSortDir(value));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setZoneIdState("");
    setStatusIdState("");
    setRecurringTypeState("");
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
        recurringType,
        dateRange,
        search: debouncedSearch,
        sortBy,
        sortDir,
      }),
    [page, pageSize, zoneId, statusId, recurringType, dateRange, debouncedSearch, sortBy, sortDir]
  );

  const hasActiveFilters = useMemo(
    () =>
      orderListHasActiveFilters({
        zoneId,
        statusId,
        recurringType,
        dateRange,
        search: debouncedSearch || searchInput,
      }),
    [zoneId, statusId, recurringType, dateRange, debouncedSearch, searchInput]
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
    recurringType,
    setRecurringType,
    dateRange,
    setDateRange,
    searchInput,
    setSearchInput,
    sortBy,
    setSortBy,
    sortDir,
    setSortDir,
    debouncedSearch,
    isSearchPending,
    apiParams,
    clearFilters,
    hasActiveFilters,
  };
}
