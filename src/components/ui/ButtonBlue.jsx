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
}) {
  const sizeStyles = {
    small: {
      height: "36px",
      fontSize: "14px",
      padding: "6px 16px",
    },
    medium: {
      height: "46px",
      fontSize: "16px",
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
      sx={{
        height: "52px",
        borderRadius: "8px",
        bgcolor: "#000099",
        color: "white",
        fontFamily: "Switzer",
        fontWeight: 500,
        fontSize: "20px",
        textTransform: "none",
        padding: "10px 30px",
        minWidth: "100px",
        width: width,
        boxShadow: "0px 1px 2px rgba(16, 24, 40, 0.05)",
        ...sizeStyles[size],
      }}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <MiniLoader
          size={size === "small" ? "20px" : size === "medium" ? "24px" : "30px"}
        />
      ) : (
        text
      )}
    </Button>
  );
}
