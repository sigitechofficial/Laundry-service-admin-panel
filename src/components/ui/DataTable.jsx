import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Chip,
  Switch,
  IconButton,
  Paper,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import {
  TbSearch,
  TbFilter,
  TbFileDownload,
  TbEye,
  TbEdit,
  TbTrash,
} from "../../shared/icons/index";
import Search from "./Search";
import FiltersButton from "./FiltersButton";
import DateRangeSelector from "./DateRangeSelector";

const sampleData = [
  {
    id: 1,
    customerId: "#123456",
    name: "Afnan",
    email: "@gmail.com",
    phoneNumber: "+923545458454",
    totalOrders: 10,
    lastOrderDate: "03-12-2025",
    amountSpent: "$1200.56",
    status: "Active",
    changeStatus: true,
  },
  {
    id: 2,
    customerId: "#123456",
    name: "Ali",
    email: "@gmail.com",
    phoneNumber: "+923545458454",
    totalOrders: 12,
    lastOrderDate: "03-12-2025",
    amountSpent: "$1320.56",
    status: "Active",
    changeStatus: true,
  },
  {
    id: 3,
    customerId: "#123456",
    name: "Hamza",
    email: "@gmail.com",
    phoneNumber: "+923545458454",
    totalOrders: 5,
    lastOrderDate: "03-12-2025",
    amountSpent: "$1596.25",
    status: "Block",
    changeStatus: false,
  },
  {
    id: 4,
    customerId: "#123456",
    name: "Sohail",
    email: "@gmail.com",
    phoneNumber: "+923545458454",
    totalOrders: 8,
    lastOrderDate: "03-12-2025",
    amountSpent: "$1985.65",
    status: "Active",
    changeStatus: true,
  },
  {
    id: 5,
    customerId: "#123456",
    name: "Fatih",
    email: "@gmail.com",
    phoneNumber: "+923545458454",
    totalOrders: 13,
    lastOrderDate: "03-12-2025",
    amountSpent: "$2000.92",
    status: "Active",
    changeStatus: true,
  },
  {
    id: 6,
    customerId: "#123456",
    name: "Ahmed",
    email: "@gmail.com",
    phoneNumber: "+923545458454",
    totalOrders: 20,
    lastOrderDate: "03-12-2025",
    amountSpent: "$1480.95",
    status: "Block",
    changeStatus: false,
  },
];

export default function DataTable({
  data = sampleData,
  searchPlaceholder = "Search by ID, product, or others...",
  showFilters = true,
  showDateRange = true,
  showDownload = true,
  height = 600,
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRange, setDateRange] = useState(null);
  const [filteredData, setFilteredData] = useState(data);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Filter data based on search term
    const filtered = data.filter((row) =>
      Object.values(row).some((field) =>
        String(field).toLowerCase().includes(value.toLowerCase())
      )
    );
    setFilteredData(filtered);
  };

  const handleDateChange = (selectedRange) => {
    console.log("Date Range Selected:", selectedRange);
    setDateRange(selectedRange);
    // Implement date filtering logic here
  };

  const handleStatusToggle = (id) => {
    const updatedData = filteredData.map((row) =>
      row.id === id
        ? {
            ...row,
            changeStatus: !row.changeStatus,
            status: row.changeStatus ? "Block" : "Active",
          }
        : row
    );
    setFilteredData(updatedData);
  };

  const columns = [
    {
      field: "customerId",
      headerName: "Customer ID",
      width: 120,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "name",
      headerName: "Name",
      width: 130,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "email",
      headerName: "Email",
      width: 150,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "phoneNumber",
      headerName: "Phone number",
      width: 120,
      minWidth: 100,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "totalOrders",
      headerName: "Total Orders",
      width: 120,
      type: "number",
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "lastOrderDate",
      headerName: "Last Order date",
      width: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "amountSpent",
      headerName: "T.Amount spent",
      width: 140,
      renderCell: (params) => (
        <Typography
          variant="body2"
          sx={{
            fontFamily: "Inter, sans-serif",
            fontSize: "14px",
            color: "#374151",
            fontWeight: 500,
          }}
        >
          {params.value}
        </Typography>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 100,
      renderCell: (params) => (
        <Chip
          label={params.value}
          size="small"
          sx={{
            backgroundColor: params.value === "Active" ? "#FEF3C7" : "#FCE7F3",
            color: params.value === "Active" ? "#D97706" : "#BE185D",
            fontFamily: "Inter, sans-serif",
            fontSize: "12px",
            fontWeight: 500,
            border: "none",
          }}
        />
      ),
    },
    {
      field: "changeStatus",
      headerName: "Change Status",
      width: 130,
      renderCell: (params) => (
        <Switch
          checked={params.value}
          onChange={() => handleStatusToggle(params.row.id)}
          size="small"
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked": {
              color: "#10B981",
            },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
              backgroundColor: "#10B981",
            },
          }}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Action",
      width: 120,
      sortable: false,
      renderCell: () => (
        <Box className="flex items-center gap-1">
          <IconButton
            size="small"
            sx={{
              backgroundColor: "#FEF3C7",
              color: "#D97706",
              width: 28,
              height: 28,
              "&:hover": {
                backgroundColor: "#FDE68A",
              },
            }}
          >
            <TbEye size="14px" />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              backgroundColor: "#DBEAFE",
              color: "#3B82F6",
              width: 28,
              height: 28,
              "&:hover": {
                backgroundColor: "#BFDBFE",
              },
            }}
          >
            <TbEdit size="14px" />
          </IconButton>
          <IconButton
            size="small"
            sx={{
              backgroundColor: "#FEE2E2",
              color: "#FAFAFA",
              width: 28,
              height: 28,
              "&:hover": {
                backgroundColor: "#FECACA",
              },
            }}
          >
            <TbTrash size="14px" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ width: "100%", maxWidth: "100%", overflow: "hidden" }}>
      <Paper
        sx={{
          width: "100%",
          maxWidth: "100%",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.05)",
        }}
    >
      {/* Header Section */}
      <Box className="!px-8 !py-5">
        <Box className="flex items-center justify-between gap-4 flex-wrap">
          {/* Search */}
          <Box className="flex-1 max-w-md min-w-0">
            <Search
              bgColor="grey.60"
              border="none"
              placeholder={searchPlaceholder}
              boxShadow="none"
              value={searchTerm}
              onChange={handleSearchChange}
              startAdornment={<TbSearch size="20px" color="#9CA3AF" />}
            />
          </Box>

          {/* Action Buttons */}
          <Box className="flex items-center gap-3 flex-wrap">
            {showFilters && (
              <FiltersButton
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                text="Filters"
                Icon={<TbFilter size="20px" color="#6B7280" />}
              />
            )}

            {showDateRange && (
              <DateRangeSelector
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                value={dateRange}
                onChange={handleDateChange}
                placeholder="April 11 - April 24"
                className="w-fit"
              />
            )}

            {showDownload && (
              <FiltersButton
                text="Download"
                bgColor="grey.60"
                border="none"
                boxShadow="none"
                Icon={<TbFileDownload size="20px" color="#6B7280" />}
              />
            )}
          </Box>
        </Box>
      </Box>

      {/* Data Table */}
      <Box
        sx={{
          height: height - 100,
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={filteredData}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[5, 10, 25]}
          disableSelectionOnClick
          disableColumnMenu
          sx={{
            border: "none",
            width: "100%",
            maxWidth: "100%",
            minWidth: 0, // Allow shrinking below content width
            "& .MuiDataGrid-main": {
              overflow: "hidden",
            },
            "& .MuiDataGrid-virtualScroller": {
              overflowX: "auto", // Only this container should scroll horizontally
              overflowY: "auto", // And vertically
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#FAFAFA !important",
              px: "22px",
              borderBottom: "none",
              "& .MuiDataGrid-columnHeader": {
                px: "16px",
                borderBottom: "none",
                backgroundColor: "#FAFAFA !important",
              },
              "& .MuiDataGrid-columnHeader--sorted": {
                backgroundColor: "#FAFAFA !important",
              },
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontFamily: "Inter, sans-serif",
              fontSize: "14px",
              fontWeight: 600,
              color: "#374151",
            },
            "& .MuiDataGrid-cell": {
              px: "32px",
              display: "flex",
              alignItems: "center",
              border: "none",
              "&:focus": {
                outline: "none",
              },
            },
            "& .MuiDataGrid-row": {
              minHeight: "52px !important",
              "&:nth-of-type(even)": {
                backgroundColor: "#FAFAFA",
              },
              "&:hover": {
                backgroundColor: "#F3F4F6 !important",
              },
            },
            "& .MuiDataGrid-footerContainer": {
              minHeight: "52px",
              border: "none",
              "& .MuiTablePagination-root": {
                fontFamily: "Inter, sans-serif",
              },
            },
          }}
        />
      </Box>
    </Paper>
    </Box>
  );
}
