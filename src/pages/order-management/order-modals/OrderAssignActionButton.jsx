import { Button } from "@mui/material";
import {
  assignActionLabel,
  canAdminAssignOrReassignFromBooking,
} from "../../../shared/adminAssignGate";

export default function OrderAssignActionButton({
  booking,
  onClick,
  size = "small",
}) {
  if (!canAdminAssignOrReassignFromBooking(booking)) return null;

  const label = assignActionLabel(booking);
  const isMedium = size === "medium";

  return (
    <Button
      size={size}
      variant="contained"
      sx={{
        minWidth: isMedium ? 88 : 72,
        minHeight: isMedium ? 40 : undefined,
        bgcolor: "#000099",
        textTransform: "none",
        fontSize: isMedium ? 13 : 12,
        fontWeight: isMedium ? 600 : 400,
        px: isMedium ? 2 : undefined,
        "&:hover": { bgcolor: "#00007A" },
      }}
      onClick={onClick}
    >
      {label}
    </Button>
  );
}
