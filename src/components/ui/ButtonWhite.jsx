import { Button } from "@mui/material";
import React from "react";

const sizeStyles = {
  small: { height: "36px", fontSize: "14px", padding: "6px 16px" },
  medium: { height: "40px", fontSize: "14px", padding: "8px 16px" },
  large: { height: "52px", fontSize: "20px", padding: "10px 16px" },
};

export default function ButtonWhite({
  onClick,
  disabled,
  text,
  width,
  children,
  size = "large",
  type = "button",
}) {
  return (
    <Button
      type={type}
      onClick={onClick}
      variant="outlined"
      sx={{
        height: sizeStyles[size].height,
        borderRadius: "8px",
        border: "1px solid #2B2D42",
        color: "#2B2D42 !important",
        bgcolor: "white",
        fontFamily: "Switzer",
        fontWeight: 500,
        fontSize: sizeStyles[size].fontSize,
        textTransform: "none",
        padding: sizeStyles[size].padding,
        width: width,
        minWidth: "80px",
        "&:hover": {
          bgcolor: "#F9FAFB",
          border: "1px solid #2B2D42",
          color: "#2B2D42 !important",
        },
      }}
      disabled={disabled}
    >
      {text || children}
    </Button>
  );
}
