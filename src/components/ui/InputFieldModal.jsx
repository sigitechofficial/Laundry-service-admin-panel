import { TextField, Typography } from "@mui/material";
import React from "react";

export default function InputFieldModal({
  placeholder,
  value,
  onChange,
  type = "text",
  title = "",
  name,
  disabled,
}) {
  return (
    <div className="w-full">
      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}
      <input
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full h-[52px] outline-none bg-[#F4F7FF] rounded-lg !px-4 font-[Switzer] !font-normal !text-base"
      />
    </div>
  );
}
