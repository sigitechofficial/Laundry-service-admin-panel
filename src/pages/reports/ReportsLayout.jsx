import { useState, useEffect } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";
import { BsCardList } from "../../shared/icons/index";
import TopServicesReport from "./TopServicesReport";
import HourlyReport from "./HourlyReport";
import OnHoldReport from "./OnHoldReport";
import ServiceDemandReport from "./ServiceDemandReport";
import TopPerformingShopsReport from "./TopPerformingShopsReport";
import DailyEarningReport from "./DailyEarningReport";

const REPORT_TABS = [
  { label: "Top Services Report", path: "/reports/top-services" },
  { label: "Hourly Report", path: "/reports/hourly" },
  { label: "On hold Report", path: "/reports/on-hold" },
  { label: "Service Demand Report", path: "/reports/service-demand" },
  { label: "Top Performing Shops", path: "/reports/top-performing-shops" },
  { label: "Daily Earning Report", path: "/reports/daily-earning" },
];

const REPORT_PANELS = [
  TopServicesReport,
  HourlyReport,
  OnHoldReport,
  ServiceDemandReport,
  TopPerformingShopsReport,
  DailyEarningReport,
];

export default function ReportsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const path = location.pathname.replace(/\/$/, "");
    if (path === "/reports") {
      navigate(REPORT_TABS[0].path, { replace: true });
      return;
    }
    const index = REPORT_TABS.findIndex((t) => location.pathname === t.path);
    if (index >= 0) setActiveTab(index);
  }, [location.pathname, navigate]);

  const handleTabChange = (_e, newValue) => {
    setActiveTab(newValue);
    navigate(REPORT_TABS[newValue].path, { replace: true });
  };

  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
            Reports
          </Typography>
        </Box>
      </Box>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          "& .MuiTab-root": { fontFamily: "Switzer", textTransform: "none" },
        }}
      >
        {REPORT_TABS.map((tab, index) => (
          <Tab key={tab.path} label={tab.label} id={`report-tab-${index}`} />
        ))}
      </Tabs>

      <Box>
        {REPORT_PANELS.map((Panel, index) => (
          <Box
            key={REPORT_TABS[index].path}
            sx={{ display: activeTab === index ? "block" : "none" }}
          >
            <Panel />
          </Box>
        ))}
      </Box>
    </div>
  );
}
