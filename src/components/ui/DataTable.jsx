import React, { useState, memo, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Select,
  MenuItem,
  FormControl,
  Pagination,
  Stack,
  CircularProgress,
} from "@mui/material";
import Search from "./Search";
import FiltersButton from "./FiltersButton";
import DateRangeSelector from "./DateRangeSelector";
import {
  TbSearch,
  TbFilter,
  TbFileDownload,
  IoIosArrowRoundUp,
  IoIosArrowRoundDown,
  TbArrowsSort,
} from "../../shared/icons/index";

const DataTable = ({
  data = [],
  columns = [],
  searchPlaceholder = "Search...",
  showFilters = true,
  showDateRange = true,
  showDownload = true,
  height = 600,
  searchValue,
  onSearchChange,
  dateRangeValue,
  onDateRangeChange,
  onDownload,
  // Server-side pagination props
  serverSidePagination = false,
  totalRows = 0,
  currentPage = 1,
  pageSize: externalPageSize = 25,
  onPageChange,
  onPageSizeChange,
  // Filter click handler
  onFiltersClick,
  /** Extra controls rendered before Filters / date range (e.g. zone dropdown) */
  toolbarExtra,
  /** Replaces the default Filters button (e.g. order status menu) */
  filtersSlot,
  /** Field names (e.g. `sl`, `zoneName`) that stay pinned on the left when scrolling horizontally */
  stickyLeftFields,
  /** Field names (e.g. `OrderStatus`, `actions`) that stay pinned on the right when scrolling horizontally */
  stickyRightFields,
  /** Show overlay while refetching (server-side lists) */
  isLoading = false,
  /** Shown when there are no rows (e.g. zone filter with zero bookings) */
  emptyMessage = "No data found",
}) => {
  const tableRef = React.useRef(null);
  /** Measured `<th>` width per sticky column field (includes padding); avoids overlap when layout is wider than `minWidth`. */
  const [stickyColumnWidths, setStickyColumnWidths] = useState({});

  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(currentPage);
  const [pageSize, setPageSize] = useState(externalPageSize);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    sortField: null,
    direction: "asc",
  });

  // Sync external page and pageSize
  React.useEffect(() => {
    setPage(currentPage);
  }, [currentPage]);

  React.useEffect(() => {
    setPageSize(externalPageSize);
  }, [externalPageSize]);

  React.useEffect(() => {
    if (searchValue !== undefined) {
      setSearchTerm(searchValue);
    }
  }, [searchValue]);

  React.useEffect(() => {
    if (dateRangeValue !== undefined) {
      setDateRange(dateRangeValue);
    }
  }, [dateRangeValue]);

  const fallbackStickyColumnWidthPx = (col) => {
    const pad = 40; // pl + pr from "& .MuiTableCell-root"
    const w = col?.minWidth;
    const num =
      typeof w === "number" ? w : parseInt(String(w ?? "80"), 10) || 80;
    return num + pad;
  };

  const measureStickyHeaderWidths = React.useCallback(() => {
    if (!stickyLeftFields?.length && !stickyRightFields?.length) return;
    if (!tableRef.current) return;
    const theadTh = tableRef.current.querySelectorAll("thead tr th");
    if (!theadTh.length) return;
    setStickyColumnWidths((prev) => {
      const merged = { ...prev };
      let updated = false;
      columns.forEach((col, i) => {
        const isSticky =
          stickyLeftFields?.includes(col.field) ||
          stickyRightFields?.includes(col.field);
        if (!isSticky) return;
        const cell = theadTh[i];
        const w = cell ? Math.round(cell.getBoundingClientRect().width) : 0;
        if (w > 0 && merged[col.field] !== w) {
          merged[col.field] = w;
          updated = true;
        }
      });
      return updated ? merged : prev;
    });
  }, [columns, stickyLeftFields, stickyRightFields]);

  React.useLayoutEffect(() => {
    if (!stickyLeftFields?.length && !stickyRightFields?.length) return;
    const table = tableRef.current;
    if (!table) return;
    measureStickyHeaderWidths();
    const ro = new ResizeObserver(() => measureStickyHeaderWidths());
    ro.observe(table);
    return () => ro.disconnect();
  }, [measureStickyHeaderWidths, sortConfig.field, sortConfig.direction]);

  // filtering
  const rowSearchBlob = (row) => {
    const parts = [];
    for (const [key, value] of Object.entries(row)) {
      if (key === "_booking") continue;
      if (key === "_export" && value && typeof value === "object") {
        parts.push(...Object.values(value).map((v) => String(v ?? "")));
        continue;
      }
      parts.push(String(value ?? ""));
    }
    return parts.join(" ").toLowerCase();
  };

  const filteredData = useMemo(() => {
    if (serverSidePagination) return data;
    if (!searchTerm) return data;

    const q = searchTerm.toLowerCase();
    return data.filter((row) => rowSearchBlob(row).includes(q));
  }, [data, searchTerm, serverSidePagination]);

  // 🔹 Sorting logic (supports col.sortField for stacked/composite columns)
  const sortedData = React.useMemo(() => {
    if (!sortConfig.field) return filteredData;

    const sortKey = sortConfig.sortField || sortConfig.field;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortKey];
      let bVal = b[sortKey];

      if (aVal == null || aVal === "") return 1;
      if (bVal == null || bVal === "") return -1;

      const aNum = typeof aVal === "number" ? aVal : Number(aVal);
      const bNum = typeof bVal === "number" ? bVal : Number(bVal);
      const bothNumeric =
        typeof aVal === "number" ||
        typeof bVal === "number" ||
        (aVal !== "" &&
          bVal !== "" &&
          !Number.isNaN(aNum) &&
          !Number.isNaN(bNum) &&
          String(aVal).trim() !== "" &&
          /^-?\d+(\.\d+)?$/.test(String(aVal).trim()) &&
          /^-?\d+(\.\d+)?$/.test(String(bVal).trim()));

      if (bothNumeric && !Number.isNaN(aNum) && !Number.isNaN(bNum)) {
        return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
      }

      if (typeof aVal === "boolean" && typeof bVal === "boolean") {
        return sortConfig.direction === "asc"
          ? Number(aVal) - Number(bVal)
          : Number(bVal) - Number(aVal);
      }

      const cmp = String(aVal).localeCompare(String(bVal), undefined, {
        numeric: true,
        sensitivity: "base",
      });
      return sortConfig.direction === "asc" ? cmp : -cmp;
    });
  }, [filteredData, sortConfig]);

  // pagination
  const displayTotalRows = serverSidePagination ? totalRows : sortedData.length;
  const totalPages = Math.ceil(displayTotalRows / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = serverSidePagination 
    ? Math.min(startIndex + pageSize, displayTotalRows)
    : Math.min(startIndex + pageSize, sortedData.length);
  const paginatedData = serverSidePagination ? sortedData : sortedData.slice(startIndex, endIndex);

  // 🔹 Handle sorting toggle
  const handleSort = (col) => {
    if (!col || col.sortable === false) return;
    const field = col.field;
    const sortField = col.sortField || col.field;
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          sortField,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { field, sortField, direction: "asc" };
    });
  };

  /** Left offset for a sticky column: sum **rendered** widths of previous sticky columns (from measured `<th>`, else fallback). */
  const stickyLeftOffsetPx = (colIndex) => {
    if (!stickyLeftFields?.length) return 0;
    let left = 0;
    for (let i = 0; i < colIndex; i++) {
      if (!stickyLeftFields.includes(columns[i]?.field)) continue;
      const field = columns[i].field;
      const measured = stickyColumnWidths[field];
      left +=
        typeof measured === "number" && measured > 0
          ? measured
          : fallbackStickyColumnWidthPx(columns[i]);
    }
    return left;
  };

  const stickyRank = (field) => {
    if (!stickyLeftFields?.length) return -1;
    return stickyLeftFields.indexOf(field);
  };

  /** Right offset for a sticky-right column: sum rendered widths of columns to the RIGHT that are also sticky-right */
  const stickyRightOffsetPx = (colIndex) => {
    if (!stickyRightFields?.length) return 0;
    let right = 0;
    for (let i = columns.length - 1; i > colIndex; i--) {
      if (!stickyRightFields.includes(columns[i]?.field)) continue;
      const field = columns[i].field;
      const measured = stickyColumnWidths[field];
      right +=
        typeof measured === "number" && measured > 0
          ? measured
          : fallbackStickyColumnWidthPx(columns[i]);
    }
    return right;
  };

  const stickyRightRank = (field) => {
    if (!stickyRightFields?.length) return -1;
    return stickyRightFields.indexOf(field);
  };

  const lastStickyLeftField = useMemo(() => {
    if (!stickyLeftFields?.length) return null;
    let last = null;
    for (const col of columns) {
      if (stickyLeftFields.includes(col.field)) last = col.field;
    }
    return last;
  }, [columns, stickyLeftFields]);

  const stickyLeftEdgeShadow =
    "inset -1px 0 0 #E5E7EB, 4px 0 6px -2px rgba(0, 0, 0, 0.08)";

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflow: "visible" }}>
      <Paper
        sx={{
          width: "100%",
          borderRadius: "0 0 12px 12px",
          overflow: "visible",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {/* Header Section */}
        <Box className="!px-8 !pt-5 !pb-7 flex items-center justify-between gap-4 flex-wrap">
          <Box className="flex-1 max-w-md min-w-0">
            <Search
              bgColor="grey.60"
              border="none"
              boxShadow="none"
              placeholder={searchPlaceholder}
              value={searchValue !== undefined ? searchValue : searchTerm}
              onChange={(e) => {
                const next = e.target.value;
                if (searchValue === undefined) {
                  setSearchTerm(next);
                }
                if (onSearchChange) {
                  onSearchChange(next);
                } else if (searchValue === undefined) {
                  setSearchTerm(next);
                }
              }}
              startAdornment={<TbSearch size="20px" color="#9CA3AF" />}
            />
          </Box>

          <Box className="flex items-center gap-3 flex-wrap">
            {toolbarExtra}
            {filtersSlot}
            {!filtersSlot && showFilters && (
              <FiltersButton
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                text="Filters"
                Icon={<TbFilter size="20px" color="#9CA3AF" />}
                onClick={onFiltersClick}
              />
            )}
            {showDateRange && (
              <DateRangeSelector
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                value={dateRange}
                onChange={(nextRange) => {
                  setDateRange(nextRange);
                  if (onDateRangeChange) onDateRangeChange(nextRange);
                }}
                placeholder="Select Range"
              />
            )}
            {showDownload && (
              <FiltersButton
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                text="Download"
                Icon={<TbFileDownload size="20px" color="#9CA3AF" />}
                onClick={() => {
                  if (onDownload) onDownload(data);
                }}
              />
            )}
          </Box>
        </Box>

        {/* Table */}
        <Box 
          sx={{ 
            position: "relative",
            height: height - 150, 
            overflowY: "auto", 
            overflowX: "auto", 
            width: "100%",
            backgroundColor: "#fff",
            "&::-webkit-scrollbar": {
              height: "8px",
              width: "8px",
            },
            "&::-webkit-scrollbar-track": {
              background: "#f1f1f1",
            },
            "&::-webkit-scrollbar-thumb": {
              background: "#888",
              borderRadius: "4px",
            },
            "&::-webkit-scrollbar-thumb:hover": {
              background: "#555",
            },
          }}
        >
          {isLoading ? (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                zIndex: 200,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "rgba(255, 255, 255, 0.72)",
                pointerEvents: "none",
              }}
            >
              <CircularProgress size={36} sx={{ color: "#000099" }} />
            </Box>
          ) : null}
          <Table
            ref={tableRef}
            stickyHeader
            sx={{
              minWidth: "max-content",
              width: "100%",
              "& .MuiTableCell-root": {
                py: "8px", // Applies to all cells
                pl: "20px",
                pr: "20px",
                whiteSpace: "nowrap",
              },
              "& .MuiTableRow-root": {
                height: "auto",
                minHeight: 60,
              },
              "& .MuiTableCell-head": {
                height: 56, // Specifically for header
                position: "sticky",
                top: 0,
                zIndex: 120,
                backgroundColor: "#FAFAFA",
              },
              "& .MuiTableCell-stickyHeader": {
                top: 0,
                backgroundColor: "#FAFAFA",
              },
            }}
          >
            <TableHead>
              <TableRow>
                {columns.map((col, colIndex) => {
                  const isSorted = sortConfig.field === col.field;
                  const isSortable = col.sortable !== false; // default true
                  const rank = stickyRank(col.field);
                  const isStickyLeft = rank >= 0;
                  const rightRank = stickyRightRank(col.field);
                  const isStickyRight = rightRank >= 0;

                  return (
                    <TableCell
                      key={col.field}
                      {...(isStickyLeft
                        ? { style: { zIndex: 130 + rank } }
                        : isStickyRight
                        ? { style: { zIndex: 130 + rightRank } }
                        : {})}
                      onClick={() => handleSort(col)}
                      align={col.align || "left"}
                      sx={{
                        ":hover": {
                          backgroundColor: isSortable ? "#F3F4F6" : "#FAFAFA",
                        },
                        cursor: isSortable ? "pointer" : "default",
                        width: col.width || "auto",
                        minWidth: col.minWidth || "auto",
                        backgroundColor: "#FAFAFA",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily: "Inter, sans-serif",
                        color: "#000",
                        borderBottom: "none",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        userSelect: "none",
                        ...(isStickyLeft && {
                          position: "sticky",
                          left: stickyLeftOffsetPx(colIndex),
                          top: 0,
                          ...(col.field === lastStickyLeftField && {
                            boxShadow: stickyLeftEdgeShadow,
                          }),
                        }),
                        ...(isStickyRight && {
                          position: "sticky",
                          right: stickyRightOffsetPx(colIndex),
                          top: 0,
                        }),
                      }}
                    >
                      <Box 
                        display={"flex"} 
                        alignItems={"center"} 
                        gap={"6px"}
                        justifyContent={col.align === "center" ? "center" : col.align === "right" ? "flex-end" : "flex-start"}
                      >
                        {col.headerName}{" "}
                        {isSortable &&
                          (isSorted ? (
                            sortConfig.direction === "asc" ? (
                              <IoIosArrowRoundUp size={"16px"} color="blue" />
                            ) : (
                              <IoIosArrowRoundDown size={"16px"} color="blue" />
                            )
                          ) : (
                            <TbArrowsSort size={"16px"} color="gray" />
                          ))}
                      </Box>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {!isLoading && paginatedData.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={Math.max(columns.length, 1)}
                    align="center"
                    sx={{
                      py: 8,
                      fontFamily: "Inter, sans-serif",
                      fontSize: "14px",
                      color: "#6B7280",
                      borderBottom: "none",
                      backgroundColor: "#fff",
                    }}
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedData.map((row, idx) => (
                  <TableRow
                    key={row.id != null ? `order-${row.id}` : `row-${idx}`}
                    sx={{
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                    }}
                  >
                    {columns.map((col, colIndex) => {
                      const rank = stickyRank(col.field);
                      const isStickyLeft = rank >= 0;
                      const rightRank = stickyRightRank(col.field);
                      const isStickyRight = rightRank >= 0;
                      const rowBg = idx % 2 === 0 ? "#fff" : "#FAFAFA";

                      return (
                        <TableCell
                          key={col.field}
                          align={col.align || "left"}
                          sx={{
                            fontFamily: "Inter, sans-serif",
                            fontSize: "14px",
                            borderBottom: "none",
                            whiteSpace:
                              col.wrap || col.renderCell ? "normal" : "nowrap",
                            overflow:
                              col.wrap || col.renderCell ? "visible" : "hidden",
                            textOverflow:
                              col.wrap || col.renderCell ? "unset" : "ellipsis",
                            verticalAlign:
                              col.wrap || col.renderCell ? "top" : "middle",
                            backgroundColor: rowBg,
                            ...(isStickyLeft && {
                              position: "sticky",
                              left: stickyLeftOffsetPx(colIndex),
                              zIndex: 110 + rank,
                              ...(col.field === lastStickyLeftField && {
                                boxShadow: stickyLeftEdgeShadow,
                              }),
                            }),
                            ...(isStickyRight && {
                              position: "sticky",
                              right: stickyRightOffsetPx(colIndex),
                              zIndex: 100 + rightRank,
                            }),
                          }}
                        >
                          {col.renderCell
                            ? col.renderCell(row)
                            : row[col.field]}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>

        {/* Pagination */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
            py: 2,
            borderTop: "1px solid #E5E7EB",
          }}
        >
          <Typography sx={{ fontSize: "14px", color: "#6B7280" }}>
            {displayTotalRows === 0 ? 0 : startIndex + 1} - {endIndex} of {displayTotalRows}
          </Typography>

          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, val) => {
                setPage(val);
                if (serverSidePagination && onPageChange) {
                  onPageChange(val);
                }
              }}
              size="small"
              showFirstButton
              showLastButton
            />
          </Stack>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography sx={{ fontSize: "14px", color: "#6B7280" }}>
              Results per page
            </Typography>
            <FormControl size="small">
              <Select
                value={pageSize}
                onChange={(e) => {
                  const newPageSize = e.target.value;
                  setPageSize(newPageSize);
                  setPage(1);
                  if (serverSidePagination && onPageSizeChange) {
                    onPageSizeChange(newPageSize);
                  }
                }}
              >
                {[10, 25, 50, 100].map((n) => (
                  <MenuItem key={n} value={n}>
                    {n}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default memo(DataTable);
