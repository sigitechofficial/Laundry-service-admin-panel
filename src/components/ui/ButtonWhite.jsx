import { Button } from "@mui/material";
import React from "react";

export default function ButtonWhite({ onClick, disabled, text, width }) {
  return (
    <Button
      onClick={onClick}
      variant="outlined"
      sx={{
        height: "52px",
        borderRadius: "8px",
        border: "1px solid #2B2D42",
        color: "#344054",
        bgcolor: "white",
        fontFamily: "Switzer",
        fontWeight: 500,
        fontSize: "20px",
        textTransform: "none",
        padding: "10px 16px",
        width: width,
        minWidth: "80px",
        "&:hover": {
          bgcolor: "#F9FAFB",
          border: "1px solid #2B2D42",
        },
      }}
      disabled={disabled}
    >
      {text}
    </Button>
  );
}
