import { Tooltip, IconButton } from "@mui/material";
import { TbInfoCircle } from "react-icons/tb";

export default function InfoIcon({ tooltipText }) {
  if (!tooltipText) return null;

  return (
    <Tooltip
      title={tooltipText}
      arrow
      placement="top"
      slotProps={{
        popper: {
          modifiers: [
            {
              name: "offset",
              options: {
                offset: [0, 8],
              },
            },
          ],
        },
        tooltip: {
          sx: {
            bgcolor: "#1F2937",
            fontSize: "12px",
            padding: "8px 12px",
            maxWidth: "300px",
            fontFamily: "Switzer",
          },
        },
      }}
    >
      <IconButton
        size="small"
        sx={{
          padding: "2px",
          color: "#6B7280",
          "&:hover": {
            color: "#000099",
            backgroundColor: "transparent",
          },
        }}
      >
        <TbInfoCircle size={16} />
      </IconButton>
    </Tooltip>
  );
}

