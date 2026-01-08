import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { BsCardList } from "../../shared/icons/index";
import Shops from "./Shops";

export default function ShopsPage() {
  return (
    <Layout
      content={
        <div className="!space-y-11">
          <Box className="flex items-center gap-x-5 justify-between">
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Shops
              </Typography>
            </Box>
          </Box>
          <Box>
            <Shops />
          </Box>
        </div>
      }
    />
  );
}

