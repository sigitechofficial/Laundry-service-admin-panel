import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "../../design-system";
import { ReportTabs } from "./ReportToolbar";
import TopServicesReport from "./TopServicesReport";
import HourlyReport from "./HourlyReport";
import OnHoldReport from "./OnHoldReport";
import ServiceDemandReport from "./ServiceDemandReport";
import TopPerformingShopsReport from "./TopPerformingShopsReport";
import DailyEarningReport from "./DailyEarningReport";
import ShopRatingsReport from "../shop-ratings-report/ShopRatingsReport";
import PaymentsReport from "./PaymentsReport";
import CancellationsReport from "./CancellationsReport";
import CustomersReport from "./CustomersReport";
import DriversReport from "./DriversReport";
import OverdueReport from "./OverdueReport";

const REPORT_TABS = [
  { label: "Daily Earnings", path: "/reports/daily-earning" },
  { label: "Top Services", path: "/reports/top-services" },
  { label: "Service Demand", path: "/reports/service-demand" },
  { label: "Top Shops", path: "/reports/top-performing-shops" },
  { label: "Payments", path: "/reports/payments" },
  { label: "Cancellations", path: "/reports/cancellations" },
  { label: "Customers", path: "/reports/customers" },
  { label: "Drivers", path: "/reports/drivers" },
  { label: "Hourly", path: "/reports/hourly" },
  { label: "On hold", path: "/reports/on-hold" },
  { label: "Overdue", path: "/reports/overdue" },
  { label: "Shop Ratings", path: "/reports/shop-ratings" },
];

const REPORT_PANELS = {
  "/reports/daily-earning": DailyEarningReport,
  "/reports/top-services": TopServicesReport,
  "/reports/service-demand": ServiceDemandReport,
  "/reports/top-performing-shops": TopPerformingShopsReport,
  "/reports/payments": PaymentsReport,
  "/reports/cancellations": CancellationsReport,
  "/reports/customers": CustomersReport,
  "/reports/drivers": DriversReport,
  "/reports/hourly": HourlyReport,
  "/reports/on-hold": OnHoldReport,
  "/reports/overdue": OverdueReport,
  "/reports/shop-ratings": ShopRatingsReport,
};

export default function ReportsLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, "");

  useEffect(() => {
    if (path === "/reports") {
      navigate(REPORT_TABS[0].path, { replace: true });
    }
  }, [path, navigate]);

  const ActivePanel = REPORT_PANELS[path] || null;

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Live operational and earnings reports. Each report states what it measures and which filters actually apply."
      />
      <ReportTabs
        tabs={REPORT_TABS}
        value={path}
        onChange={(tab) => navigate(tab.path, { replace: true })}
      />
      {ActivePanel ? <ActivePanel /> : null}
    </div>
  );
}
