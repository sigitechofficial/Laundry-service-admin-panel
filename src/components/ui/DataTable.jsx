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
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortConfig, setSortConfig] = useState({
    field: null,
    direction: "asc",
  });

  // filtering
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;

    return data.filter((row) =>
      Object.values(row).some((field) =>
        String(field).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [data, searchTerm]);

  // 🔹 Sorting logic
  const sortedData = React.useMemo(() => {
    if (!sortConfig.field) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.field];
      const bVal = b[sortConfig.field];

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
      }

      return sortConfig.direction === "asc"
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredData, sortConfig]);

  // pagination
  const totalRows = sortedData.length;
  const totalPages = Math.ceil(totalRows / pageSize);
  const startIndex = (page - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalRows);
  const paginatedData = sortedData.slice(startIndex, endIndex);

  // 🔹 Handle sorting toggle
  const handleSort = (field) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        // toggle direction
        return {
          field,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { field, direction: "asc" };
    });
  };

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <Paper
        sx={{
          width: "100%",
          borderRadius: "12px",
          overflow: "hidden",
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
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              startAdornment={<TbSearch size="20px" color="#9CA3AF" />}
            />
          </Box>

          <Box className="flex items-center gap-3 flex-wrap">
            {showFilters && (
              <FiltersButton
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                text="Filters"
                Icon={<TbFilter size="20px" color="#9CA3AF" />}
              />
            )}
            {showDateRange && (
              <DateRangeSelector
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                value={dateRange}
                onChange={setDateRange}
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
              />
            )}
          </Box>
        </Box>

        {/* Table */}
        <Box sx={{ height: height - 150, overflowY: "auto" }}>
          <Table
            stickyHeader
            sx={{
              "& .MuiTableCell-root": {
                py: "8px", // Applies to all cells
                pl: "40px",
              },
              "& .MuiTableRow-root": {
                height: 60, // Applies to all rows
              },
              "& .MuiTableCell-head": {
                height: 56, // Specifically for header
              },
            }}
          >
            <TableHead>
              <TableRow>
                {columns.map((col) => {
                  const isSorted = sortConfig.field === col.field;
                  const isSortable = col.sortable !== false; // default true

                  return (
                    <TableCell
                      key={col.field}
                      onClick={() => handleSort(col.field)}
                      sx={{
                        ":hover": {
                          backgroundColor: "#F3F4F6",
                        },
                        cursor: "pointer",
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
                      }}
                    >
                      <Box display={"flex"} alignItems={"center"} gap={"6px"}>
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
              {paginatedData.map((row, idx) => (
                <TableRow
                  key={row.id || idx}
                  sx={{
                    backgroundColor: idx % 2 === 0 ? "#fff" : "#FAFAFA",
                    // "&:hover": { backgroundColor: "#fff !important" },
                  }}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.field}
                      sx={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "14px",
                        borderBottom: "none",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {/* {row[col.field]} */}

                      {col.renderCell ? col.renderCell(row) : row[col.field]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
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
            {startIndex + 1} - {endIndex} of {totalRows}
          </Typography>

          <Stack spacing={2}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(e, val) => setPage(val)}
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
                  setPageSize(e.target.value);
                  setPage(1);
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
