import { Box, Typography } from "@mui/material";
import { TbReportSearch } from "../../shared/icons/index";
import AgentSettlement from "./AgentSettlement";

export default function AgentSettlementPage() {
  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <TbReportSearch size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            Agent Cash Settlement
          </Typography>
        </Box>
      </Box>
      <Box>
        <AgentSettlement />
      </Box>
    </div>
  );
}
