import {
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
} from "@mui/material";
import { TbChevronDown } from "../../shared/icons/index";

function CustomDropdownIcon(props) {
  return (
    <TbChevronDown
      {...props}
      size={"22px"}
      color="#000"
      style={{ marginRight: "8px" }}
    />
  );
}

export default function SelectField({
  title,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select...",
  fullWidth = true,
  bgcolor = "#F4F7FF",
  width,
  height = "52px",
  radius = "8px",
}) {
  return (
    <FormControl fullWidth={fullWidth} size="small">
      {label && <InputLabel shrink>{label}</InputLabel>}

      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}
      <Select
        value={value}
        onChange={onChange}
        displayEmpty
        IconComponent={CustomDropdownIcon}
        inputProps={{ "aria-label": placeholder || "Select field" }}
        sx={{
          width: width,
          height: height,
          fontFamily: "Switzer",
          borderRadius: radius,
          border: "none",
          outline: "none",
          bgcolor: bgcolor,
          "& fieldset": {
            border: "none",
          },
          "& .MuiSelect-select": {
            px: "16px",
          },
          // "& .MuiSelect-icon": {
          //   right: "0px", // 👈 move icon a bit inward
          // },
        }}
      >
        {placeholder && <MenuItem value="">{placeholder}</MenuItem>}
        {options.map((opt) => (
          <MenuItem key={opt.value} value={opt.value}>
            {opt.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
