import { Button } from "@mui/material";
import { RiFilter3Line } from "../../shared/icons/index";
import React from "react";

export default function FiltersButton({
  text,
  Icon,
  bgColor = "white",
  border = "1px solid #D0D5DD",
  boxShadow = "0px 1px 2px rgba(16, 24, 40, 0.08)",
  onClick,
  variant = "default", // "default" or "blue"
}) {
  const isBlueVariant = variant === "blue";
  
  // Clone icon with white color for blue variant
  const iconElement = Icon 
    ? isBlueVariant 
      ? React.cloneElement(Icon, { color: "white" })
      : Icon
    : <RiFilter3Line size="20px" color={isBlueVariant ? "white" : "#667085"} />;
  
  return (
    <Button
      onClick={onClick}
      startIcon={iconElement}
      sx={{
        height: "44px",
        borderRadius: "8px",
        border: isBlueVariant ? "none" : border,
        color: isBlueVariant ? "white" : "#000",
        bgcolor: isBlueVariant ? "#000099" : bgColor,
        boxShadow: boxShadow,
        fontFamily: "Inter",
        textTransform: "none",
        fontWeight: 500,
        flexShrink: "0",
        padding: "10px 14px",
        "&:hover": {
          bgcolor: isBlueVariant ? "#0000cc" : "grey.50",
        },
      }}
    >
      {text || "Filters"}
    </Button>
  );
}
