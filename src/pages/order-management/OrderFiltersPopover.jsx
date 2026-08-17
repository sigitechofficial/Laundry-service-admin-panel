import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Popover,
  Typography,
} from "@mui/material";
import FiltersButton from "../../components/ui/FiltersButton";
import SelectField from "../../components/ui/SelectField";
import { TbFilter } from "../../shared/icons/index";

/**
 * Shared Filters control for order tables (All / Pending / Complete / … / Action Required).
 * Uses Popover (not Menu) so nested SelectField status dropdown works reliably.
 */
export default function OrderFiltersPopover({
  statusId,
  onStatusChange,
  orderStatuses = [],
  showStatusFilter = true,
  onClearFilters,
  hasActiveFilters = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const statusOptions = useMemo(
    () =>
      orderStatuses
        .map((s) => ({
          value: String(s.id ?? s.statusId ?? ""),
          label: s.title ?? s.name ?? s.status ?? String(s.id ?? ""),
        }))
        .filter((opt) => opt.value !== ""),
    [orderStatuses]
  );

  const handleClose = () => setAnchorEl(null);

  return (
    <>
      <FiltersButton
        bgColor="grey.60"
        border="none"
        boxShadow="none"
        text={hasActiveFilters ? "Filters •" : "Filters"}
        Icon={<TbFilter size="20px" color="#9CA3AF" />}
        onClick={(e) => setAnchorEl(e.currentTarget)}
      />
      <Popover
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 1,
              minWidth: 280,
              borderRadius: "8px",
              p: 2,
              boxShadow: "0px 4px 16px rgba(0, 0, 0, 0.1)",
            },
          },
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{ fontFamily: "Inter", fontWeight: 600, mb: 1.5 }}
        >
          Filter orders
        </Typography>

        {showStatusFilter ? (
          <Box sx={{ mb: 2 }} onMouseDown={(e) => e.stopPropagation()}>
            <SelectField
              title="Order status"
              value={statusId || ""}
              onChange={(e) => onStatusChange?.(e.target.value)}
              options={statusOptions}
              placeholder="All statuses"
              bgcolor="#F9FAFB"
              height="44px"
              radius="8px"
            />
            {statusOptions.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>
                Loading statuses…
              </Typography>
            ) : null}
          </Box>
        ) : (
          <Typography
            variant="body2"
            sx={{ color: "text.secondary", mb: 2, fontSize: 13 }}
          >
            Narrow by zone and order placed date. Use Clear all to reset.
          </Typography>
        )}

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button
            size="small"
            onClick={() => {
              onClearFilters?.();
              handleClose();
            }}
            sx={{ textTransform: "none" }}
          >
            Clear all
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={handleClose}
            sx={{
              textTransform: "none",
              bgcolor: "#000099",
              "&:hover": { bgcolor: "#0000cc" },
            }}
          >
            Done
          </Button>
        </Box>
      </Popover>
    </>
  );
}
