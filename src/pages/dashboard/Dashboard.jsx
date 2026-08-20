import { useMemo, useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardFilter from "./DashboardFilter";
import { DashboardCard } from "./DashboardStatCards";
import FigureShimmer from "./FigureShimmer";
import {
  IconMessenger,
  FaUsers,
  BsHandbagFill,
  AiFillFileText,
} from "../../shared/icons/index";
import OrderManagementChart from "./OrderManagementChart";
import AreaChart from "./AreaChart";
import {
  SalesMetricCard,
  SalesRankCard,
  SalesBoard,
} from "./DashboardInsightCards";
import { SalesIcons } from "./salesIcons";
import { DashboardQueryState } from "./DashboardQueryState";
import { useDashboardDataQuery } from "../../store/services/api";
import { getUserProfile } from "../../utilities/authStorage";
import { formatDate, formatMoney, resolveCurrencySymbol } from "../../utilities/formatters";

function money(amount, source) {
  return formatMoney(
    amount,
    resolveCurrencySymbol(source),
    source?.currency ?? source?.currencyCode ?? source?.currency_code ?? source?.feeCurrency
  );
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
  startDate: "",
  endDate: "",
};

const ATTENTION_TILES = [
  {
    key: "ar",
    label: "Action required",
    field: "actionRequiredCount",
    path: "/orders/action-required",
    tone: "danger",
  },
  {
    key: "assign",
    label: "Unassigned shop",
    field: "needsAssignmentCount",
    path: "/orders/pending-orders",
    tone: "warning",
  },
  {
    key: "pay",
    label: "Payment holds",
    field: "paymentFailureCount",
    path: "/orders/payment-failures",
    tone: "danger",
  },
  {
    key: "hold",
    label: "On hold",
    field: "onHoldCount",
    path: "/orders/on-hold-orders",
    tone: "violet",
  },
];

const TILE_TONE = {
  danger:
    "before:bg-[var(--danger)] [--abg:var(--danger-bg)] [--a:var(--danger)]",
  warning:
    "before:bg-[var(--warning)] [--abg:var(--warning-bg)] [--a:var(--warning)]",
  violet: "before:bg-[#5f47c4] [--abg:#efeafe] [--a:#5f47c4]",
  info: "before:bg-[var(--info)] [--abg:var(--info-bg)] [--a:var(--info)]",
};

function ChartPanel({ title, subtitle, children }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-5 py-5 shadow-[0_1px_2px_rgba(16,21,31,0.04)] before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-[var(--accent)] before:content-['']">
      <h2 className="m-0 text-[15px] font-bold tracking-[-0.2px] text-[var(--ink)]">
        {title}
      </h2>
      {subtitle ? (
        <p className="mb-4 mt-1 text-[13px] text-[var(--muted)]">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const queryArgs = useMemo(() => {
    const q = { period: filters.period || "all" };
    if (filters.zoneId) q.zoneId = filters.zoneId;
    if (filters.cityId) q.cityId = filters.cityId;
    if (filters.countryId) q.countryId = filters.countryId;
    if (filters.period === "custom" && filters.startDate && filters.endDate) {
      q.startDate = filters.startDate;
      q.endDate = filters.endDate;
    }
    return q;
  }, [filters]);

  const {
    data: dashRes,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useDashboardDataQuery(queryArgs);

  const lastDataRef = useRef(null);
  useEffect(() => {
    if (dashRes?.data) lastDataRef.current = dashRes.data;
  }, [dashRes]);

  const dashboardData = dashRes?.data ?? lastDataRef.current;
  const insights = dashboardData?.insights || {};
  const figuresLoading = isFetching || (isLoading && !dashboardData);
  const showFatal = isError && !dashboardData;

  const revenueSeries = useMemo(() => {
    const rows = Array.isArray(dashboardData?.dailyRevenue)
      ? dashboardData.dailyRevenue
      : [];
    return {
      labels: rows.map((r) => formatDate(r?.date, "DD MMM")),
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

  const mtd = insights.mtdAdmin || {};
  const lastMonth = insights.lastMonthAdmin || {};
  const currencySource = dashboardData;
  const completedCount =
    dashboardData?.completedOrdersCount ?? dashboardData?.orderCounts?.completed ?? 0;

  return (
    <div className="font-[Inter,system-ui,sans-serif] tracking-[-0.006em]">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-[22px] font-bold tracking-[-0.4px] text-[var(--ink)]">
            Operations
          </h1>
          <p className="mt-1 mb-0 text-[13.5px] text-[var(--muted)]">
            Welcome, {welcomeName()}. Monitor revenue, assignment, and work that
            needs attention.
          </p>
        </div>
        <div className="lg:ml-auto">
          <DashboardFilter value={filters} onChange={setFilters} />
        </div>
      </header>

      {emptyGeo ? (
        <div
          role="status"
          className="mb-5 rounded-[10px] border border-[var(--warning-50)] bg-[var(--warning-bg)] px-4 py-3 text-sm font-semibold text-[var(--warning-700)]"
        >
          No zones match this country/city. Clear the geo filters or pick United
          Kingdom.
        </div>
      ) : null}

      {showFatal ? (
        <DashboardQueryState error={error} onRetry={() => refetch()} />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {ATTENTION_TILES.map((tile) => {
              const count = attention[tile.field] ?? 0;
              return (
                <button
                  key={tile.key}
                  type="button"
                  onClick={() => navigate(tile.path)}
                  className={[
                    "relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3.5 text-left shadow-[0_1px_2px_rgba(16,21,31,0.04)] transition-[box-shadow,transform] duration-150",
                    "before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-['']",
                    "hover:-translate-y-px hover:shadow-[0_10px_26px_-16px_rgba(16,21,31,0.35)]",
                    TILE_TONE[tile.tone],
                  ].join(" ")}
                >
                  <p className="m-0 text-[11px] font-bold uppercase tracking-[0.06em] text-[var(--muted)]">
                    {tile.label}
                  </p>
                  {figuresLoading ? (
                    <FigureShimmer width={36} height={26} radius={6} className="mt-1.5" />
                  ) : (
                    <p className="mt-1.5 mb-0 text-[22px] font-bold leading-none tracking-[-0.6px] text-[var(--ink)] [font-variant-numeric:tabular-nums]">
                      {count}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <DashboardCard
              title="Platform revenue"
              description="Admin commission for selected filters"
              hint={
                dashboardData?.grossRevenue != null
                  ? `Gross ${money(dashboardData.grossRevenue, currencySource)}`
                  : "Admin commission for selected filters"
              }
              total={money(dashboardData?.adminRevenue, currencySource)}
              Icon={AiFillFileText}
              tone="accent"
              loading={figuresLoading}
              onClick={() => navigate("/orders/all-orders")}
            />
            <DashboardCard
              title="Total orders"
              description="Bookings in selected period / zone"
              hint={`${completedCount} completed`}
              total={dashboardData?.totalBookings ?? 0}
              Icon={IconMessenger}
              tone="blue"
              loading={figuresLoading}
              onClick={() => navigate("/orders/all-orders")}
            />
            <DashboardCard
              title="Active customers"
              description="Platform-wide active customers"
              hint="Platform-wide active"
              total={dashboardData?.totalCustomers ?? 0}
              Icon={FaUsers}
              tone="green"
              loading={figuresLoading}
            />
            <DashboardCard
              title="Shop assignment rate"
              description="Orders with a laundry shop assigned"
              hint={
                attention.needsAssignmentCount != null
                  ? `${attention.needsAssignmentCount} unassigned`
                  : "Orders with a shop assigned"
              }
              total={formatPct(dashboardData?.agentAcceptanceRate)}
              Icon={BsHandbagFill}
              tone="violet"
              loading={figuresLoading}
            />
            <DashboardCard
              title="Avg. completion"
              description="Average hours from created to completed"
              hint={`${completedCount} completed orders`}
              total={`${dashboardData?.averageOrderCompletionTimeHours ?? 0} hrs`}
              tone="amber"
              loading={figuresLoading}
            />
            <DashboardCard
              title="Completed orders"
              description="Completed bookings in selected filters"
              hint={
                dashboardData?.thisMonthOrders != null
                  ? `${dashboardData.thisMonthOrders} this month`
                  : "Completed in selected period"
              }
              total={completedCount}
              tone="green"
              loading={figuresLoading}
              onClick={() => navigate("/orders/complete-orders")}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartPanel
              title="Orders pipeline"
              subtitle="Open and completed bookings in the selected period"
            >
              {figuresLoading ? (
                <div className="flex justify-center py-10">
                  <FigureShimmer width={220} height={220} radius={110} />
                </div>
              ) : (
                <OrderManagementChart
                  pending={pipeline.pending}
                  inProgress={pipeline.inProgress}
                  outForDelivery={pipeline.outForDelivery}
                  completed={pipeline.completed}
                />
              )}
            </ChartPanel>
            <ChartPanel
              title="Admin revenue by collection day"
              subtitle="Commission on collected orders"
            >
              {figuresLoading ? (
                <FigureShimmer width="100%" height={220} radius={12} />
              ) : revenueSeries.labels.length ? (
                <AreaChart
                  labels={revenueSeries.labels}
                  values={revenueSeries.values}
                />
              ) : (
                <p className="m-0 py-16 text-center text-[13.5px] text-[var(--muted)]">
                  No collected revenue in this period.
                </p>
              )}
            </ChartPanel>
          </div>

          <SalesBoard>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SalesMetricCard
                title="Month-to-date sales"
                icon={SalesIcons.chart}
                total={mtd.adminRevenue ?? dashboardData?.thisMonthAdminRevenue}
                totalLabel="Admin revenue"
                orders={mtd.ordersCompleted ?? dashboardData?.thisMonthOrders ?? 0}
                avgOrderValue={
                  mtd.avgOrderValue ?? dashboardData?.thisMonthAvgOrderValue ?? 0
                }
                showTrend
                trendPct={mtd.vsLastMonthMtdPct}
                currencySource={mtd.currencySymbol ? mtd : currencySource}
                loading={figuresLoading}
                onView={() => navigate("/reports/daily-earning")}
              />
              <SalesMetricCard
                title="Last month sales"
                icon={SalesIcons.calendar}
                total={
                  lastMonth.adminRevenue ?? dashboardData?.lastMonthAdminRevenue
                }
                totalLabel="Admin revenue"
                orders={
                  lastMonth.ordersCompleted ?? dashboardData?.lastMonthOrders ?? 0
                }
                avgOrderValue={
                  lastMonth.avgOrderValue ??
                  dashboardData?.lastMonthAvgOrderValue ??
                  0
                }
                statusLabel="Completed"
                currencySource={
                  lastMonth.currencySymbol ? lastMonth : currencySource
                }
                loading={figuresLoading}
                onView={() => navigate("/reports/daily-earning")}
              />
              <SalesRankCard
                title="MTD sales by shop"
                icon={SalesIcons.store}
                rows={insights.topShopsMtd || []}
                nameKey="shopName"
                amountKey="shopRevenue"
                metaKey="ordersCompleted"
                metaPrefix="Orders:"
                footerLabel="View all"
                loading={figuresLoading}
                currencySource={currencySource}
                onView={() => navigate("/reports/top-performing-shops")}
              />
              <SalesRankCard
                title="Last month sales by shop"
                icon={SalesIcons.people}
                rows={insights.topShopsLastMonth || []}
                nameKey="shopName"
                amountKey="shopRevenue"
                metaKey="ordersCompleted"
                metaPrefix="Orders:"
                loading={figuresLoading}
                currencySource={currencySource}
                onView={() => navigate("/reports/top-performing-shops")}
              />
              <SalesRankCard
                title="YTD sales by shop"
                icon={SalesIcons.chart}
                subtitle="Year to date"
                rows={insights.topShopsYtd || []}
                nameKey="shopName"
                amountKey="shopRevenue"
                metaKey="ordersCompleted"
                metaPrefix="Orders:"
                footerLabel="View all"
                loading={figuresLoading}
                currencySource={currencySource}
                onView={() => navigate("/reports/top-performing-shops")}
                onSubtitleClick={() => navigate("/reports/top-performing-shops")}
              />
              <SalesRankCard
                title="MTD sales by service"
                icon={SalesIcons.chart}
                rows={insights.topServicesMtd || []}
                nameKey="name"
                amountKey="revenue"
                metaKey="qty"
                metaPrefix="Qty:"
                footerLabel="View all"
                loading={figuresLoading}
                currencySource={currencySource}
                onView={() => navigate("/reports/top-services")}
              />
              <SalesRankCard
                title="YTD sales by service"
                icon={SalesIcons.chart}
                subtitle="Year to date"
                rows={insights.topServicesYtd || []}
                nameKey="name"
                amountKey="revenue"
                metaKey="qty"
                metaPrefix="Qty:"
                footerLabel="View all"
                loading={figuresLoading}
                currencySource={currencySource}
                onView={() => navigate("/reports/top-services")}
                onSubtitleClick={() => navigate("/reports/top-services")}
              />
            </div>
          </SalesBoard>
        </div>
      )}
    </div>
  );
}
