import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { BsCardList } from "../../shared/icons/index";
import NoShowPolicyContent from "./NoShowPolicyContent";

export default function NoShowPolicy() {
  return (
    <Layout
      content={
        <Box>
          {/* Header Section */}
          <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <BsCardList size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                No Show Policy
              </Typography>
            </Box>
          </Box>

          <NoShowPolicyContent />
        </Box>
      }
    />
  );
}
