import React from "react";
import { Box, Typography, Select, MenuItem } from "@mui/material";
import { TbChevronDown } from "../../shared/icons/index";

// Common country codes with flags (UK first — platform default)
const countryCodes = [
  { code: "+44", flag: "🇬🇧", country: "United Kingdom" },
  { code: "+1", flag: "🇺🇸", country: "United States" },
  { code: "+92", flag: "🇵🇰", country: "Pakistan" },
  { code: "+91", flag: "🇮🇳", country: "India" },
  { code: "+971", flag: "🇦🇪", country: "UAE" },
  { code: "+966", flag: "🇸🇦", country: "Saudi Arabia" },
];

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

export default function PhoneNumberInput({
  title,
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  errors = {},
}) {
  return (
    <Box className="w-full">
      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}

      <Box className="flex gap-2">
        {/* Country Code Selector */}
        <Select
          value={countryCode || "+44"}
          onChange={(e) => onCountryCodeChange(e.target.value)}
          IconComponent={CustomDropdownIcon}
          sx={{
            height: "52px",
            fontFamily: "Switzer",
            fontWeight: 400,
            borderRadius: "8px",
            border: "none",
            outline: "none",
            bgcolor: "#F4F7FF",
            minWidth: "120px",
            "& fieldset": {
              border: "none",
            },
            "& .MuiSelect-select": {
              px: "12px",
              fontWeight: 400,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            },
          }}
        >
          {countryCodes.map((country) => (
            <MenuItem key={country.code} value={country.code}>
              <Box className="flex items-center gap-2">
                <span>{country.flag}</span>
                <span>{country.code}</span>
              </Box>
            </MenuItem>
          ))}
        </Select>

        {/* Phone Number Input */}
        <input
          type="tel"
          placeholder="Enter phone number"
          value={phoneNumber || ""}
          onChange={(e) => onPhoneNumberChange(e.target.value)}
          className="flex-1 h-[52px] outline-none bg-[#F4F7FF] rounded-lg !px-4 font-[Switzer] !font-normal !text-base"
        />
      </Box>

      {errors.phoneNumber && (
        <Typography
          variant="caption"
          sx={{ color: "error.main", mt: 1, display: "block" }}
        >
          {errors.phoneNumber.message}
        </Typography>
      )}
    </Box>
  );
}
