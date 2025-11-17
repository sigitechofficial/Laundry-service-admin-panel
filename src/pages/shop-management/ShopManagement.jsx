import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { BsCardList } from "../../shared/icons/index";
import { useGetAllCustomersQuery } from "../../store/services/api";
import { Delay } from "../../components/shared/Loaders";
import CustomTabs from "../../components/ui/TabPanel";
import ShopDashboard from "./ShopDashboard";
import { lazy } from "react";
const Shops = lazy(() => import("./Shops"));
const AddShop = lazy(() => import("./AddShop"));
const ShopEmployee = lazy(() => import("./ShopEmployee"));

export default function ShopManagement() {
  const { isLoading } = useGetAllCustomersQuery();

  return (
    <Layout
      content={
        isLoading ? (
          <Delay />
        ) : (
          <div className="!space-y-11">
            <Box className="flex items-center gap-x-5 justify-between">
              <Box className="flex items-center gap-x-5">
                <Typography color="blue.50">
                  <BsCardList size="24px" color="blue.50" />
                </Typography>

                <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                  Shop Management
                </Typography>
              </Box>
            </Box>

            <Box>
              <CustomTabs
                tabWidth="600px"
                tabs={[
                  {
                    label: "Shop Dashboard",
                    content: <ShopDashboard />,
                  },
                  { label: "Shops", content: <Shops /> },
                  {
                    label: "Add Shop Profile",
                    content: <AddShop />,
                  },
                  // {
                  //   label: "Shop Employees",
                  //   content: <ShopEmployee />,
                  // },
                ]}
                defaultValue={0}
                variant="fullWidth"
              />
            </Box>
          </div>
        )
      }
    />
  );
}
