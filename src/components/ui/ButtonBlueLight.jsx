import React from "react";
import { Button } from "@mui/material";

export default function ButtonBlueLight({
  children,
  variant = "contained",
  bgColor,
  color,
  startIcon,
  endIcon,
  onClick,
  sx = {},
  height = "40px",
  radius = "8px",
  ...rest
}) {
  return (
    <Button
      variant={variant}
      startIcon={startIcon}
      endIcon={endIcon}
      onClick={onClick}
      sx={{
        fontFamily: "Inter",
        backgroundColor: bgColor,
        color: color,
        height: height,
        borderRadius: radius,
        textTransform: "none",
        "&:hover": {
          backgroundColor: bgColor ? bgColor : undefined,
          opacity: bgColor ? 0.9 : undefined,
        },
        ...sx, // allow extra styles from parent
      }}
      {...rest}
    >
      {children}
    </Button>
  );
}
