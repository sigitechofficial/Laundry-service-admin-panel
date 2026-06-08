import { Box, Typography } from "@mui/material";
import { LuUsersRound } from "../../shared/icons/index";
import PendingAgents from "./PendingAgents";

export default function PendingAgentsPage() {
  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <LuUsersRound size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            Agent Approvals
          </Typography>
        </Box>
      </Box>
      <Box>
        <PendingAgents />
      </Box>
    </div>
  );
}
