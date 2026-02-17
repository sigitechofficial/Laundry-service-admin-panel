import { Box, Typography } from "@mui/material";
import DashboardFilter from "./DashboardFilter";
import HomeCards from "../../components/ui/HomeCards";
import {
  IconMessenger,
  FaUsers,
  BsHandbagFill,
  IconBox,
  AiFillFileText,
} from "../../shared/icons/index";
import HomeMiniCards from "../../components/ui/HomeMiniCards";
import OrderManagementChart from "./OrderManagementChart";
import AreaChart from "../../components/ui/AreaChart";
import HorizontalBarChart from "../../components/ui/HorizontalBarChart";
import { useDashboardDataQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import { useSelector } from "react-redux";

export default function Dashboard() {
  const { isLoading } = useDashboardDataQuery();
  const dashboardData = useSelector((state) => state.apiData.dashboard);

  if (isLoading) return <Delay />;

  return (
    <Box className="w-full relative before:absolute before:bg-textureGradient before:w-full before:h-52 before:bg-contain !pb-20">
            <div className="!px-8 2xl:!px-[60px] !pt-[22px] relative z-10">
              <Box className="flex items-center justify-between">
                <div>
                  <h4 className="font-Inter font-semibold text-[32px] text-white">
                    Welcome, Zeeshan N.
                  </h4>

                  <Typography
                    variant="subtitle2"
                    color="white"
                    fontFamily={"Inter"}
                  >
                    Monitor your business analytics and statistics
                  </Typography>
                </div>

                <div>
                  <DashboardFilter />
                </div>
              </Box>

              <Box className="!space-y-7">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-5 gap-y-8 !mt-8">
                  <HomeCards
                    title="Revenue"
                    description="Upcoming bookings + completed bookings + Cancelled bookings"
                    total={dashboardData?.adminRevenue}
                    Icon={AiFillFileText}
                    iconBg="bg-white"
                  />

                  <HomeCards
                    title="Total Orders"
                    description="Upcoming bookings + completed bookings + Cancelled bookings"
                    total={dashboardData?.totalBookings}
                    Icon={IconMessenger}
                    iconBg="bg-white"
                  />

                  <HomeCards
                    title="Active User"
                    description="Upcoming bookings + completed bookings + Cancelled bookings"
                    total={dashboardData?.totalUsers}
                    Icon={FaUsers}
                    iconBg="bg-white"
                  />

                  <HomeCards
                    title="Customer Satisfaction"
                    description="Upcoming bookings + completed bookings + Cancelled bookings"
                    total={dashboardData?.customerSatisfaction || "00"}
                    Icon={BsHandbagFill}
                    iconBg="bg-white"
                  />

                  <HomeMiniCards
                    title="Total Customer"
                    total={dashboardData?.totalCustomers}
                    Icon={IconBox}
                  />

                  <HomeMiniCards
                    title="Total Agents"
                    total={dashboardData?.totalAgents}
                    Icon={IconBox}
                  />

                  <HomeMiniCards
                    title="Active Agents"
                    total={dashboardData?.totalAgentActive}
                    Icon={IconBox}
                  />
                  <div></div>
                  <HomeMiniCards
                    title="Avg. Completion Time"
                    total={`${dashboardData?.averageOrderCompletionTimeHours}Hrs`}
                  />

                  <HomeMiniCards
                    title="On-Time Delivery Rate"
                    total={"00Hrs"}
                  />

                  <HomeMiniCards
                    title="Agent Acceptance Rate"
                    total={"00Hrs"}
                  />
                </div>

                <div className="grid grid-cols-2 gap-10">
                  <div className="!space-y-5">
                    <h4 className="font-Inter font-bold text-2xl text-center !pt-5 !pb-6">
                      Orders Management
                    </h4>
                    <OrderManagementChart />
                  </div>
                  <div className="!space-y-5">
                    <h4 className="font-Inter font-bold text-2xl text-center !pt-5 !pb-6">
                      Top performing services
                    </h4>
                    <HorizontalBarChart />
                  </div>

                  <div className="!space-y-5 col-span-2">
                    <h4 className="font-Inter font-bold text-2xl text-center !pt-5 !pb-6">
                      Revenue Overview
                    </h4>
                    <AreaChart />
                  </div>
                </div>
              </Box>
            </div>
    </Box>
  );
}
