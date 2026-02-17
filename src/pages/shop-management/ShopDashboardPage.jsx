import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../shared/icons/index";
import ShopDashboard from "./ShopDashboard";

export default function ShopDashboardPage() {
  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
            Shop Dashboard
          </Typography>
        </Box>
      </Box>
      <Box>
        <ShopDashboard />
      </Box>
    </div>
  );
}

