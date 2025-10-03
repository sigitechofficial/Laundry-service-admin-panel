import { Typography } from "@mui/material";
import { useState } from "react";
export default function InputFieldModal({
  placeholder,
  value,
  onChange,
  type = "text",
  title = "",
  name,
  disabled,
}) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";
  return (
    <div className="w-full">
      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}

      <div className="relative w-full">
        <input
          disabled={disabled}
          placeholder={placeholder}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          className="w-full h-[52px] outline-none bg-[#F4F7FF] rounded-lg !px-4 font-[Switzer] !font-normal !text-base"
        />

        {isPassword && (
          <IconButton
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="!absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {showPassword ? (
              <AiOutlineEyeInvisible size={20} />
            ) : (
              <AiOutlineEye size={20} />
            )}
          </IconButton>
        )}
      </div>
    </div>
  );
}
