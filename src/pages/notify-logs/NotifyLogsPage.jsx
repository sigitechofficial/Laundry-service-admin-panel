import { Box, Typography } from "@mui/material";
import { MdOutlinePhone } from "../../shared/icons/index";
import NotifyLogs from "./NotifyLogs";

export default function NotifyLogsPage() {
  return (
    <div className="!space-y-11">
      <Box className="flex items-center gap-x-5 justify-between">
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <MdOutlinePhone size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily="Switzer" color="grey.20">
            Notify / Call Logs
          </Typography>
        </Box>
      </Box>
      <Box>
        <NotifyLogs />
      </Box>
    </div>
  );
}
