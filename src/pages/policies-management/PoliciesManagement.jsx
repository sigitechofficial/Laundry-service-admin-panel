import { useState, useEffect } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { BsCardList } from "../../shared/icons/index";
import DataTable from "../../components/ui/DataTable";
import StatCard from "../../components/ui/StatCard";
import DateRangeSelector from "../../components/ui/DateRangeSelector";
import SelectField from "../../components/ui/SelectField";
import { useSelector } from "react-redux";
import { useGetAllZonesQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import CancellationPolicyContent from "./CancellationPolicyContent";
import NoShowPolicyContent from "./NoShowPolicyContent";
import ReschedulePolicyContent from "./ReschedulePolicyContent";

export default function PoliciesManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0); // 0 = Overall, 1 = Cancellation
  const [dateRange, setDateRange] = useState(null);
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  // Set active tab based on route
  useEffect(() => {
    if (location.pathname.includes("cancellation-policy")) {
      setActiveTab(1);
    } else if (location.pathname.includes("no-show-policy")) {
      setActiveTab(2);
    } else if (location.pathname.includes("reschedule-policy")) {
      setActiveTab(3);
    } else {
      setActiveTab(0);
    }
  }, [location.pathname]);

  // Get data from Redux
  const zones = useSelector((state) => state?.apiData?.zones?.zones || []);
  const countries = useSelector((state) => state?.apiData?.countries || []);
  const cities = useSelector((state) => state?.apiData?.cities || []);

  const { isLoading } = useGetAllZonesQuery();

  // Prepare zones data for table
  const policiesData = zones?.map((zone, index) => {
    return {
      id: zone.id,
      sl: index + 1,
      zoneId: `#${zone.id}`,
      zoneName: zone.name || "N/A",
      deliveryFee: `$${zone.serviceCharge || 0}`,
      refundMethod: "Refund to source", // This would come from API
      services: "washing, iron", // This would come from API
      totalEarnings: `$${(Math.random() * 2000 + 1000).toFixed(2)}`, // Mock data
    };
  }) || [];

  // Table columns
  const columns = [
    {
      field: "sl",
      headerName: "SL",
      flex: 0.1,
      minWidth: 80,
      sortable: true,
    },
    {
      field: "zoneId",
      headerName: "ZONE ID",
      flex: 0.15,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "zoneName",
      headerName: "ZONE NAME",
      flex: 0.15,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "deliveryFee",
      headerName: "DELIVERY FEE",
      flex: 0.15,
      minWidth: 120,
      sortable: true,
    },
    {
      field: "refundMethod",
      headerName: "REFUND METHOD",
      flex: 0.2,
      minWidth: 150,
      sortable: true,
    },
    {
      field: "services",
      headerName: "Services",
      flex: 0.15,
      minWidth: 120,
      sortable: false,
    },
    {
      field: "totalEarnings",
      headerName: "Total earnings",
      flex: 0.15,
      minWidth: 120,
      sortable: true,
    },
  ];

  // Fee summary data (mock data - would come from API)
  const feeSummary = {
    averageDeliveryFee: 5,
    refundFee: 20,
    platformFee: 5,
    noShowFee: null,
    cancellationFee: null,
  };

  const handleDateChange = (selectedRange) => {
    setDateRange(selectedRange);
    console.log("Selected Date Range:", selectedRange);
  };

  const handleFilter = () => {
    console.log("Filter button clicked");
  };

  const handleDownload = () => {
    console.log("Download policies data");
  };


  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Filter options
  const zoneOptions = zones?.map((zone) => ({
    value: zone.id,
    label: zone.name,
  })) || [];

  const countryOptions = countries?.map((country) => ({
    value: country.id,
    label: country.name,
  })) || [];

  const cityOptions = cities?.map((city) => ({
    value: city.id,
    label: city.name,
  })) || [];

  if (isLoading) return <Delay />;

  return (
    <Box>
            {/* Header Section */}
            <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>
                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Polices Management
                </Typography>
              </Box>
            </Box>

            {/* Global Filters */}
            <Box
              className="flex items-center gap-x-3 mb-6"
              sx={{
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Box sx={{ minWidth: "150px" }}>
                <SelectField
                  title=""
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  options={zoneOptions}
                  placeholder="Zone"
                  fullWidth
                  bgcolor="white"
                />
              </Box>
              <Box sx={{ minWidth: "150px" }}>
                <SelectField
                  title=""
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  options={cityOptions}
                  placeholder="City"
                  fullWidth
                  bgcolor="white"
                />
              </Box>
              <Box sx={{ minWidth: "150px" }}>
                <SelectField
                  title=""
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  options={countryOptions}
                  placeholder="Country"
                  fullWidth
                  bgcolor="white"
                />
              </Box>
              <Box sx={{ minWidth: "200px" }}>
                <DateRangeSelector
                  value={dateRange}
                  onChange={handleDateChange}
                  placeholder="All Time"
                />
              </Box>
            </Box>

            {/* Tabs */}
            <Box sx={{ position: "relative", mb: 4 }}>
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  sx={{
                    "& .MuiTab-root": {
                      textTransform: "none",
                      fontFamily: "Switzer",
                      fontSize: "16px",
                      fontWeight: 500,
                      color: "#6B7280",
                      borderRadius: "8px 8px 0 0",
                      "&.Mui-selected": {
                        color: "#0000A0",
                        fontWeight: 600,
                        backgroundColor: "white",
                      },
                    },
                    "& .MuiTabs-indicator": {
                      display: "none",
                    },
                  }}
                >
                  <Tab label="Overall" />
                  <Tab label="Cancellation" />
                  <Tab label="No Show" />
                  <Tab label="Reschedule" />
                </Tabs>
              </Box>
            </Box>

            {/* Tab Content */}
            {activeTab === 0 ? (
              <>
                {/* Fee Summary Cards - Only show in Overall tab */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "repeat(2, 1fr)",
                      md: "repeat(3, 1fr)",
                      lg: "repeat(5, 1fr)",
                    },
                    gap: 3,
                    mb: 4,
                  }}
                >
                  <StatCard
                    title="AVERAGE DELIVERY FEE"
                    value={feeSummary.averageDeliveryFee ? `$${feeSummary.averageDeliveryFee}` : "-"}
                    bgColor="bg-purple-100"
                    titleColor="#9333EA"
                  />
                  <StatCard
                    title="REFUND FEE"
                    value={feeSummary.refundFee ? `$${feeSummary.refundFee}` : "-"}
                    bgColor="bg-red-100"
                    titleColor="#DC2626"
                  />
                  <StatCard
                    title="PLATFORM FEE"
                    value={feeSummary.platformFee ? `$${feeSummary.platformFee}` : "-"}
                    bgColor="bg-cyan-100"
                    titleColor="#0891B2"
                  />
                  <StatCard
                    title="NO-SHOW FEE"
                    value={feeSummary.noShowFee ? `$${feeSummary.noShowFee}` : "-"}
                    bgColor="bg-purple-100"
                    titleColor="#9333EA"
                  />
                  <StatCard
                    title="CANCELLATION FEE"
                    value={feeSummary.cancellationFee ? `$${feeSummary.cancellationFee}` : "-"}
                    bgColor="bg-purple-100"
                    titleColor="#9333EA"
                  />
                </Box>

                {/* Data Table - Overall tab */}
                <Box sx={{ width: "100%", overflow: "auto" }}>
                  <DataTable
                    data={policiesData}
                    columns={columns}
                    searchPlaceholder="Search by ID, product, or others..."
                    onFiltersClick={handleFilter}
                    onDateRangeChange={handleDateChange}
                    onDownload={handleDownload}
                    height={600}
                  />
                </Box>
              </>
            ) : activeTab === 1 ? (
              <CancellationPolicyContent />
            ) : activeTab === 2 ? (
              <NoShowPolicyContent />
            ) : (
              <ReschedulePolicyContent />
            )}
          </Box>
  );
}

