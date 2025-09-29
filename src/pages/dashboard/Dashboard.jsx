import Layout from "../../components/shared/Layout";
import { Box, Typography } from "@mui/material";
import DashboardFilter from "./DashboardFilter";
import HomeCards from "../../components/ui/HomeCards";
import {
  TbFileDescription,
  IconMessenger,
  FaUsers,
  BsHandbagFill,
  IconBox,
} from "../../shared/icons/index";
import HomeMiniCards from "../../components/ui/HomeMiniCards";
import OrderManagementChart from "./OrderManagementChart";
import AreaChart from "../../components/ui/AreaChart";
import HorizontalBarChart from "../../components/ui/HorizontalBarChart";

export default function Dashboard() {
  return (
    <Layout
      content={
        <Box className="w-full px-[60px] relative before:absolute before:bg-textureGradient before:w-full before:h-52 before:bg-contain !pb-20">
          <div className="!px-[60px] !pt-[22px] relative z-10">
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
                  total={"$100.00"}
                  Icon={TbFileDescription}
                  // bgColor="#fff"
                  iconBg="bg-white"
                  // data-testid="dashboard-total-countries-card"
                />
                <HomeCards
                  title="Total Orders"
                  description="Upcoming bookings + completed bookings + Cancelled bookings"
                  total={"$100.00"}
                  Icon={IconMessenger}
                  // bgColor="#fff"
                  iconBg="bg-white"
                  // data-testid="dashboard-total-countries-card"
                />
                <HomeCards
                  title="Active User"
                  description="Upcoming bookings + completed bookings + Cancelled bookings"
                  total={"130"}
                  Icon={FaUsers}
                  // bgColor="#fff"
                  iconBg="bg-white"
                  // data-testid="dashboard-total-countries-card"
                />
                <HomeCards
                  title="Customer Satisfaction"
                  description="Upcoming bookings + completed bookings + Cancelled bookings"
                  total={"4.8/5"}
                  Icon={BsHandbagFill}
                  // bgColor="#fff"
                  iconBg="bg-white"
                  // data-testid="dashboard-total-countries-card"
                />

                <HomeMiniCards
                  title="Total Customer"
                  total={250}
                  Icon={IconBox}
                />
                <HomeMiniCards title="Total Agents" total={20} Icon={IconBox} />
                <HomeMiniCards title="Total Agents" total={20} Icon={IconBox} />
                <div></div>
                <HomeMiniCards title="Avg. Completion Time" total={"20Hrs"} />
                <HomeMiniCards title="On-Time Delivery Rate" total={"20Hrs"} />
                <HomeMiniCards title="Agent Acceptance Rate" total={"20Hrs"} />
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
      }
    />
  );
}
