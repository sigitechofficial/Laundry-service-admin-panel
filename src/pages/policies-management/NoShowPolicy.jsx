import { Box, Typography } from "@mui/material";
import { BsCardList, TbPlus } from "../../shared/icons/index";
import NoShowPolicyContent from "./NoShowPolicyContent";
import ButtonBlueLight from "../../components/ui/ButtonBlueLight";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

export default function NoShowPolicy() {
  const addButtonHandlerRef = useRef(null);
  const navigate = useNavigate();

  return (
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
            <Box className="flex items-center gap-3">
              <ButtonBlueLight
                variant="outlined"
                bgColor="#10b981"
                color="white"
                radius="8px"
                onClick={() => navigate("/policies-management/no-show-policy/test-cases")}
              >
                Test Cases
              </ButtonBlueLight>
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
                Add No Show Policy
              </ButtonBlueLight>
            </Box>
          </Box>

          <NoShowPolicyContent onAddButtonRef={addButtonHandlerRef} />
        </Box>
  );
}
