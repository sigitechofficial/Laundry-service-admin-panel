import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { TbFileDescription } from "../../shared/icons/index";

export default function Blogs() {
  return (
    <Layout
      content={
        <div className="!space-y-11">
          <Box className="flex items-center gap-x-5">
            <Typography color="blue.50">
              <TbFileDescription size="24px" color="blue.50" />
            </Typography>
            <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
              Blogs
            </Typography>
          </Box>
          <Box>
            <Typography color="grey.40">
              Manage and view your blogs here.
            </Typography>
          </Box>
        </div>
      }
    />
  );
}
