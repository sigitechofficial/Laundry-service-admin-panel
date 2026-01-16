import { Box, Typography } from "@mui/material";
import InfoIcon from "./InfoIcon";

export default function LabelWithTooltip({ label, tooltipText }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
      <Typography variant="body2">{label}</Typography>
      {tooltipText && <InfoIcon tooltipText={tooltipText} />}
    </Box>
  );
}

