import { Box, Typography } from "@mui/material";
import Layout from "../../components/shared/Layout";
import { TbDeviceIpadHorizontalCog } from "../../shared/icons/index";
import ConfigureService from "./ConfigureService";
import { useState } from "react";

export default function ConfigureServicesPage() {
  const [triggerConfigure, setTriggerConfigure] = useState(0);

  const handleConfigureClick = () => {
    setTriggerConfigure((prev) => prev + 1);
  };

  return (
    <Layout
      content={
        <div className="!space-y-11">
          <Box className="flex items-center gap-x-5 justify-between">
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <TbDeviceIpadHorizontalCog size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Configure Services
              </Typography>
            </Box>
            <button
              onClick={handleConfigureClick}
              className="bg-blue100 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center min-w-[140px] h-[40px]"
            >
              Configure Service
            </button>
          </Box>
          <Box>
            <ConfigureService triggerConfigure={triggerConfigure} />
          </Box>
        </div>
      }
    />
  );
}

