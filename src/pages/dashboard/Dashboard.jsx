import { useMemo, useState, useRef, useEffect } from "react";
import { Box, Typography, Chip } from "@mui/material";
import { useNavigate } from "react-router-dom";
import DashboardFilter from "./DashboardFilter";
import HomeCards from "../../components/ui/HomeCards";
import {
  IconMessenger,
  FaUsers,
  BsHandbagFill,
  AiFillFileText,
} from "../../shared/icons/index";
import HomeMiniCards from "../../components/ui/HomeMiniCards";
import FigureShimmer from "../../components/ui/FigureShimmer";
import OrderManagementChart from "./OrderManagementChart";
import AreaChart from "../../components/ui/AreaChart";
import {
  SalesMetricCard,
  SalesRankCard,
  SalesIcons,
  SalesBoard,
} from "./DashboardInsightCards";
import { useDashboardDataQuery } from "../../store/services/api";
import { getUserProfile } from "../../utilities/authStorage";

function formatMoney(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "£0.00";
  return `£${v.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatPct(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0%";
  return `${v}%`;
}

function welcomeName() {
  const p = getUserProfile();
  const name = [p?.firstName, p?.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (p?.email) return p.email.split("@")[0];
  return "Admin";
}

const DEFAULT_FILTERS = {
  zoneId: "",
  cityId: "",
  countryId: "",
  period: "all",
};

export default function Dashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const queryArgs = useMemo(() => {
    const q = { period: filters.period || "all" };
    if (filters.zoneId) q.zoneId = filters.zoneId;
    if (filters.cityId) q.cityId = filters.cityId;
    if (filters.countryId) q.countryId = filters.countryId;
    return q;
  }, [filters]);

  const { data: dashRes, isLoading, isFetching } = useDashboardDataQuery(queryArgs);

  // Keep last payload for layout continuity; figures shimmer while fetching
  const lastDataRef = useRef(null);
  useEffect(() => {
    if (dashRes?.data) lastDataRef.current = dashRes.data;
  }, [dashRes]);

  const dashboardData = dashRes?.data ?? lastDataRef.current;
  const insights = dashboardData?.insights || {};
  // Shimmer figures whenever a request is in flight (incl. first load)
  const figuresLoading = isFetching || (isLoading && !dashboardData);

  const revenueSeries = useMemo(() => {
    const rows = Array.isArray(dashboardData?.dailyRevenue)
      ? dashboardData.dailyRevenue
      : [];
    return {
      labels: rows.map((r) => {
        if (!r?.date) return "—";
        try {
          return new Date(r.date).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          });
        } catch {
          return String(r.date);
        }
      }),
      values: rows.map((r) => Number(r.adminRevenue ?? r.grossRevenue ?? 0) || 0),
    };
  }, [dashboardData?.dailyRevenue]);

  const pipeline = dashboardData?.orderPipeline || {
    pending: 0,
    inProgress: 0,
    outForDelivery: 0,
    completed: 0,
  };
  const attention = dashboardData?.attention || {};
  const emptyGeo = Boolean(dashboardData?.filtersApplied?.emptyGeo) && !figuresLoading;

  const attentionChips = [
    {
      key: "ar",
      label: `Action required · ${attention.actionRequiredCount ?? 0}`,
      color: "error",
      path: "/orders/action-required",
      show: true,
    },
    {
      key: "pay",
      label: `Payment holds · ${attention.paymentFailureCount ?? 0}`,
      color: "error",
      path: "/orders/payment-failures",
      show: true,
    },
    {
      key: "hold",
      label: `On hold · ${attention.onHoldCount ?? 0}`,
      color: "warning",
      path: "/orders/on-hold-orders",
      show: true,
    },
    {
      key: "new",
      label: `New orders · ${attention.newOrdersCount ?? 0}`,
      color: "info",
      path: "/orders/pending-orders",
      show: true,
    },
    {
      key: "assign",
      label: `Unassigned shop · ${attention.needsAssignmentCount ?? 0}`,
      color: "warning",
      path: "/orders/pending-orders",
      show: Number(attention.needsAssignmentCount) > 0,
    },
  ].filter((c) => c.show);

  const mtd = insights.mtdAdmin || {};
  const lastMonth = insights.lastMonthAdmin || {};
  const mtdShops = insights.mtdShops || {};

  return (
    <Box className="w-full relative before:absolute before:bg-textureGradient before:w-full before:h-52 before:bg-contain !pb-20">
      <div className="!px-8 2xl:!px-[60px] !pt-[22px] relative z-10">
        <Box className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h4 className="font-Inter font-semibold text-[32px] text-white">
              Welcome, {welcomeName()}
            </h4>
            <Typography variant="subtitle2" color="white" fontFamily="Inter">
              Monitor operations health and jump into what needs attention
            </Typography>
          </div>
          <div>
            <DashboardFilter value={filters} onChange={setFilters} />
          </div>
        </Box>

        <Box className="!space-y-7">
          {emptyGeo ? (
            <Box
              className="!mt-6 rounded-lg px-4 py-3"
              sx={{ bgcolor: "#FEF3C7", border: "1px solid #FCD34D" }}
            >
              <Typography fontFamily="Inter" fontWeight={600} color="#92400E">
                No zones match this country/city. Clear the geo filters or pick United
                Kingdom.
              </Typography>
            </Box>
          ) : null}

          <Box className="flex flex-wrap gap-2 !mt-6">
            {attentionChips.map((chip) => (
              <Chip
                key={chip.key}
                label={
                  figuresLoading ? (
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 1 }}>
                      <span>{chip.label.split("·")[0]}·</span>
                      <FigureShimmer width={28} height={12} radius={4} />
                    </Box>
                  ) : (
                    chip.label
                  )
                }
                onClick={() => navigate(chip.path)}
                sx={{
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                  bgcolor: "#FFFFFF",
                  color:
                    chip.color === "error"
                      ? "#B91C1C"
                      : chip.color === "warning"
                        ? "#B45309"
                        : chip.color === "info"
                          ? "#1D4ED8"
                          : "#0F172A",
                  border: "1px solid",
                  borderColor:
                    chip.color === "error"
                      ? "#FECACA"
                      : chip.color === "warning"
                        ? "#FDE68A"
                        : chip.color === "info"
                          ? "#BFDBFE"
                          : "#E2E8F0",
                  "&:hover": { bgcolor: "#F8FAFC" },
                }}
              />
            ))}
          </Box>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8 !mt-4">
            <HomeCards
              title="Platform revenue"
              description="Admin commission for selected filters"
              total={formatMoney(dashboardData?.adminRevenue)}
              Icon={AiFillFileText}
              iconBg="bg-white"
              loading={figuresLoading}
              onClick={() => navigate("/orders/all-orders")}
              style={{ cursor: "pointer" }}
            />
            <HomeCards
              title="Total orders"
              description="Bookings in selected period / zone"
              total={dashboardData?.totalBookings ?? 0}
              Icon={IconMessenger}
              iconBg="bg-white"
              loading={figuresLoading}
              onClick={() => navigate("/orders/all-orders")}
              style={{ cursor: "pointer" }}
            />
            <HomeCards
              title="Active customers"
              description="Platform-wide active customers"
              total={dashboardData?.totalCustomers ?? 0}
              Icon={FaUsers}
              iconBg="bg-white"
              loading={figuresLoading}
            />
            <HomeCards
              title="Shop assignment rate"
              description="Orders with a laundry shop assigned"
              total={formatPct(dashboardData?.agentAcceptanceRate)}
              Icon={BsHandbagFill}
              iconBg="bg-white"
              loading={figuresLoading}
            />
            <HomeMiniCards
              title="Avg. completion"
              total={`${dashboardData?.averageOrderCompletionTimeHours ?? 0} hrs`}
              loading={figuresLoading}
            />
            <HomeMiniCards
              title="Completed orders"
              total={
                dashboardData?.completedOrdersCount ??
                dashboardData?.orderCounts?.completed ??
                0
              }
              loading={figuresLoading}
              onClick={() => navigate("/orders/complete-orders")}
              style={{ cursor: "pointer" }}
            />
            <HomeMiniCards
              title="This month · shops"
              total={formatMoney(
                mtdShops.shopRevenue ?? dashboardData?.thisMonthShopRevenue
              )}
              loading={figuresLoading}
            />
            <HomeMiniCards
              title="This month · admin"
              total={formatMoney(
                mtd.adminRevenue ?? dashboardData?.thisMonthAdminRevenue
              )}
              loading={figuresLoading}
            />
          </div>

          <SalesBoard>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 2,
              }}
            >
              <SalesMetricCard
                title="Month-to-Date Sales"
                icon={SalesIcons.chart}
                total={mtd.adminRevenue ?? dashboardData?.thisMonthAdminRevenue}
                totalLabel="Admin Revenue"
                orders={mtd.ordersCompleted ?? dashboardData?.thisMonthOrders ?? 0}
                avgOrderValue={
                  mtd.avgOrderValue ?? dashboardData?.thisMonthAvgOrderValue ?? 0
                }
                showTrend
                trendPct={mtd.vsLastMonthMtdPct}
                loading={figuresLoading}
                onView={() => navigate("/reports/daily-earning")}
              />
              <SalesRankCard
                title="MTD Sales by Shop"
                icon={SalesIcons.person}
                rows={insights.topShopsMtd || []}
                nameKey="shopName"
                amountKey="shopRevenue"
                loading={figuresLoading}
                onView={() => navigate("/reports/top-performing-shops")}
              />
              <SalesMetricCard
                title="Last Month Sales"
                icon={SalesIcons.calendar}
                total={
                  lastMonth.adminRevenue ?? dashboardData?.lastMonthAdminRevenue
                }
                totalLabel="Admin Revenue"
                orders={
                  lastMonth.ordersCompleted ?? dashboardData?.lastMonthOrders ?? 0
                }
                avgOrderValue={
                  lastMonth.avgOrderValue ??
                  dashboardData?.lastMonthAvgOrderValue ??
                  0
                }
                statusLabel="Completed"
                loading={figuresLoading}
                onView={() => navigate("/reports/daily-earning")}
              />
              <SalesRankCard
                title="Last Month Sales by Shop"
                icon={SalesIcons.people}
                rows={insights.topShopsLastMonth || []}
                nameKey="shopName"
                amountKey="shopRevenue"
                loading={figuresLoading}
                onView={() => navigate("/reports/top-performing-shops")}
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 2,
                mt: 2,
              }}
            >
              <SalesRankCard
                title="MTD Sales by Shop"
                icon={SalesIcons.store}
                rows={insights.topShopsMtd || []}
                nameKey="shopName"
                amountKey="shopRevenue"
                metaKey="ordersCompleted"
                metaPrefix="Orders:"
                footerLabel="View All"
                loading={figuresLoading}
                onView={() => navigate("/reports/top-performing-shops")}
              />
              <SalesRankCard
                title="YTD Sales by Shop"
                icon={SalesIcons.chart}
                subtitle="Year to Date"
                rows={insights.topShopsYtd || []}
                nameKey="shopName"
                amountKey="shopRevenue"
                metaKey="ordersCompleted"
                metaPrefix="Orders:"
                footerLabel="View All"
                loading={figuresLoading}
                onView={() => navigate("/reports/top-performing-shops")}
                onSubtitleClick={() => navigate("/reports/top-performing-shops")}
              />
              <SalesRankCard
                title="MTD Sales by Service"
                icon={SalesIcons.chart}
                rows={insights.topServicesMtd || []}
                nameKey="name"
                amountKey="revenue"
                metaKey="qty"
                metaPrefix="Qty:"
                footerLabel="View All"
                loading={figuresLoading}
                onView={() => navigate("/reports/top-services")}
              />
              <SalesRankCard
                title="YTD Sales by Service"
                icon={SalesIcons.chart}
                subtitle="Year to Date"
                rows={insights.topServicesYtd || []}
                nameKey="name"
                amountKey="revenue"
                metaKey="qty"
                metaPrefix="Qty:"
                footerLabel="View All"
                loading={figuresLoading}
                onView={() => navigate("/reports/top-services")}
                onSubtitleClick={() => navigate("/reports/top-services")}
              />
            </Box>
          </SalesBoard>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="!space-y-5">
              <h4 className="font-Inter font-bold text-2xl text-center !pt-5 !pb-6">
                Orders pipeline
              </h4>
              {figuresLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                  <FigureShimmer width={220} height={220} radius={110} />
                </Box>
              ) : (
                <OrderManagementChart
                  pending={pipeline.pending}
                  inProgress={pipeline.inProgress}
                  outForDelivery={pipeline.outForDelivery}
                  completed={pipeline.completed}
                />
              )}
            </div>
            <div className="!space-y-5">
              <h4 className="font-Inter font-bold text-2xl text-center !pt-5 !pb-6">
                Admin revenue by collection day
              </h4>
              {figuresLoading ? (
                <Box sx={{ px: 2, py: 4, display: "flex", flexDirection: "column", gap: 2 }}>
                  <FigureShimmer width="100%" height={220} radius={12} />
                </Box>
              ) : revenueSeries.labels.length ? (
                <AreaChart
                  labels={revenueSeries.labels}
                  values={revenueSeries.values}
                />
              ) : (
                <Typography
                  align="center"
                  color="text.secondary"
                  fontFamily="Inter"
                  className="!py-16"
                >
                  No collected revenue in this period.
                </Typography>
              )}
            </div>
          </div>
        </Box>
      </div>
    </Box>
  );
}
