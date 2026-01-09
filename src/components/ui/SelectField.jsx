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
  border = "none",
  labelColor = "#374151",
  disabled = false,
}) {
  // If width is specified, disable fullWidth to prevent extra spacing
  const isFullWidth = width ? false : fullWidth;
  
  return (
    <FormControl 
      fullWidth={isFullWidth} 
      size="small"
      sx={{
        width: width || "100%",
        m: 0,
        "& .MuiFormControl-root": {
          m: 0,
        },
      }}
    >
      {label && <InputLabel shrink>{label}</InputLabel>}

      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: labelColor }}>
          {title}
        </Typography>
      )}
      <Select
        value={value}
        onChange={onChange}
        displayEmpty
        disabled={disabled}
        IconComponent={CustomDropdownIcon}
        inputProps={{ "aria-label": placeholder || "Select field" }}
        sx={{
          width: width || "100%",
          height: height,
          fontFamily: "Switzer",
          fontWeight: 400,
          borderRadius: radius,
          border: border,
          outline: "none",
          bgcolor: bgcolor,
          "& fieldset": {
            border: "none",
          },
          "& .MuiSelect-select": {
            px: "16px",
            fontWeight: 400,
            backgroundColor: bgcolor,
          },
          "& .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            border: "none",
          },
          "&.Mui-focused": {
            bgcolor: bgcolor,
          },
          "&:hover": {
            bgcolor: bgcolor,
          },
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
