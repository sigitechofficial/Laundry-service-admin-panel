import { useMemo, useState } from "react";
import { Box, Button, Popover, Typography } from "@mui/material";
import FiltersButton from "../../components/ui/FiltersButton";
import SelectField from "../../components/ui/SelectField";
import { TbFilter } from "../../shared/icons/index";

/**
 * Zone list filters (city / payment / assignment).
 * Popover (not Menu) so nested SelectField works reliably.
 */
export default function ZoneFiltersPopover({
  city,
  onCityChange,
  paymentMethod,
  onPaymentMethodChange,
  assignment,
  onAssignmentChange,
  cityOptions = [],
  paymentOptions = [],
  onClearFilters,
  hasActiveFilters = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const cities = useMemo(
    () =>
      (cityOptions || [])
        .map((c) => ({
          value: String(c.value ?? c),
          label: String(c.label ?? c.value ?? c),
        }))
        .filter((o) => o.value && o.value !== "—"),
    [cityOptions]
  );

  const payments = useMemo(
    () =>
      (paymentOptions || [])
        .map((p) => ({
          value: String(p.value ?? p),
          label: String(p.label ?? p.value ?? p),
        }))
        .filter((o) => o.value && o.value !== "N/A"),
    [paymentOptions]
  );

  const assignmentOptions = [
    { value: "assigned", label: "Assigned" },
    { value: "unassigned", label: "Unassigned" },
  ];

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
          Filter zones
        </Typography>

        <Box sx={{ mb: 2 }} onMouseDown={(e) => e.stopPropagation()}>
          <SelectField
            title="City"
            value={city || ""}
            onChange={(e) => onCityChange?.(e.target.value)}
            options={cities}
            placeholder="All cities"
            bgcolor="#F9FAFB"
            height="44px"
            radius="8px"
          />
        </Box>

        <Box sx={{ mb: 2 }} onMouseDown={(e) => e.stopPropagation()}>
          <SelectField
            title="Payment method"
            value={paymentMethod || ""}
            onChange={(e) => onPaymentMethodChange?.(e.target.value)}
            options={payments}
            placeholder="All payment methods"
            bgcolor="#F9FAFB"
            height="44px"
            radius="8px"
          />
        </Box>

        <Box sx={{ mb: 2 }} onMouseDown={(e) => e.stopPropagation()}>
          <SelectField
            title="Zone assign"
            value={assignment || ""}
            onChange={(e) => onAssignmentChange?.(e.target.value)}
            options={assignmentOptions}
            placeholder="All"
            bgcolor="#F9FAFB"
            height="44px"
            radius="8px"
          />
        </Box>

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
