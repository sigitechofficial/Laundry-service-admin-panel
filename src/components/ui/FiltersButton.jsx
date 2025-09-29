import { Button } from "@mui/material";
import { RiFilter3Line } from "../../shared/icons/index";

export default function FiltersButton({
  text,
  Icon,
  bgColor = "white",
  border = "1px solid #D0D5DD",
  boxShadow = "0px 1px 2px rgba(16, 24, 40, 0.08)",
}) {
  return (
    <Button
      startIcon={Icon || <RiFilter3Line size="20px" color="#667085" />}
      sx={{
        height: "44px",
        borderRadius: "8px",
        border: border,
        color: "#000",
        bgcolor: bgColor,
        boxShadow: boxShadow,
        fontFamily: "Inter",
        textTransform: "none",
        fontWeight: 500,
        padding: "10px 14px",
        "&:hover": {
          bgcolor: "grey.50",
        },
      }}
    >
      {text || "Filters"}
    </Button>
  );
}
