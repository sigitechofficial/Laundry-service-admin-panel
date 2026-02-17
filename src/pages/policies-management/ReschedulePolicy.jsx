import { Box, Typography } from "@mui/material";
import { BsCardList, TbPlus } from "../../shared/icons/index";
import ReschedulePolicyContent from "./ReschedulePolicyContent";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import { useRef } from "react";

export default function ReschedulePolicy() {
  const addButtonHandlerRef = useRef(null);

  return (
    <Box>
      {/* Header Section */}
      <Box className="flex items-center gap-x-5 justify-between" sx={{ mb: "44px" }}>
        <Box className="flex items-center gap-x-5">
          <Typography color="blue.50">
            <BsCardList size="24px" color="blue.50" />
          </Typography>
          <Typography variant="h4" fontFamily={"Switzer"} color="grey.20">
            Reschedule Policy
          </Typography>
        </Box>
        <ButtonBlueLight
          variant="outlined"
          bgColor="blue.200"
          color="white"
          radius="8px"
          startIcon={<TbPlus size={"24px"} />}
          onClick={() => {
            if (addButtonHandlerRef.current) {
              addButtonHandlerRef.current();
            }
          }}
        >
          Add Reschedule Policy
        </ButtonBlueLight>
      </Box>

      <ReschedulePolicyContent onAddButtonRef={addButtonHandlerRef} />
    </Box>
  );
}
