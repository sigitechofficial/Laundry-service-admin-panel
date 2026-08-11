import { useState } from "react";
import { Box, Button, Menu, Typography } from "@mui/material";
import FiltersButton from "../../components/ui/FiltersButton";
import SelectField from "../../components/ui/SelectField";
import { TbFilter } from "../../shared/icons/index";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export default function ShopFiltersPopover({
  statusId,
  onStatusChange,
  onClearFilters,
  hasActiveFilters = false,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

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
      <Menu
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
          Filter shops
        </Typography>

        <Box sx={{ mb: 2 }}>
          <SelectField
            title="Shop status"
            value={statusId || ""}
            onChange={(e) => onStatusChange?.(e.target.value)}
            options={STATUS_OPTIONS}
            placeholder="All statuses"
            bgcolor="#F9FAFB"
            height="44px"
            radius="8px"
          />
        </Box>

        <Typography
          variant="body2"
          sx={{ color: "text.secondary", mb: 2, fontSize: 13 }}
        >
          Narrow by zone and shop registration date. Use Clear all to reset.
        </Typography>

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
      </Menu>
    </>
  );
}
