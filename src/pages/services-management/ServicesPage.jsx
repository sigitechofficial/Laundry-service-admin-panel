import { Box, Typography } from "@mui/material";
import { PiHeadsetBold } from "../../shared/icons/index";
import ServicesCard from "./ServicesCard";
import { useState } from "react";

export default function ServicesPage() {
  const [triggerAdd, setTriggerAdd] = useState(0);

  const handleAddClick = () => {
    setTriggerAdd((prev) => prev + 1);
  };

  return (
    <div className="!space-y-11">
          <Box className="flex items-center gap-x-5 justify-between">
            <Box className="flex items-center gap-x-5">
              <Typography color="blue.50">
                <PiHeadsetBold size="24px" color="blue.50" />
              </Typography>
              <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
                Services
              </Typography>
            </Box>
            <button
              onClick={handleAddClick}
              className="bg-blue100 hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 shadow-sm hover:shadow-md flex items-center justify-center min-w-[120px] h-[40px]"
            >
              Add Service
            </button>
          </Box>
          <Box>
            <ServicesCard triggerAdd={triggerAdd} />
          </Box>
        </div>
  );
}

