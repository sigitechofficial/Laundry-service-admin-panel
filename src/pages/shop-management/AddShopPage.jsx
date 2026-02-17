import { Box, Typography } from "@mui/material";
import { BsCardList } from "../../shared/icons/index";
import AddShop from "./AddShop";

export default function AddShopPage() {
  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
            Add Shop
          </Typography>
        </Box>
      </Box>
      <Box>
        <AddShop />
      </Box>
    </div>
  );
}

