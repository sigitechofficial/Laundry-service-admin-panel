import { Button } from "@mui/material";
import { MiniLoader } from "../shared/Loaders";

export default function ButtonBlue({
  onClick,
  disabled,
  text,
  width,
  type,
  size = "large",
  isLoading,
  startIcon,
  children,
}) {
  const sizeStyles = {
    small: {
      height: "36px",
      fontSize: "14px",
      padding: "6px 16px",
    },
    medium: {
      height: "40px",
      fontSize: "14px",
      padding: "8px 24px",
    },
    large: {
      height: "52px",
      fontSize: "20px",
      padding: "10px 30px",
    },
  };

  return (
    <Button
      onClick={onClick}
      size={size}
      type={type}
      variant="contained"
      startIcon={startIcon}
      sx={{
        ...sizeStyles[size],
        borderRadius: "8px",
        bgcolor: "#000099",
        color: "#FFFFFF !important",
        fontFamily: "Switzer",
        fontWeight: 500,
        textTransform: "none",
        minWidth: "100px",
        width: width,
        boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
        "& .MuiButton-root": {
          color: "#FFFFFF !important",
        },
      }}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <MiniLoader
          size={size === "small" ? "20px" : size === "medium" ? "24px" : "30px"}
        />
      ) : (
        text || children
      )}
    </Button>
  );
}
