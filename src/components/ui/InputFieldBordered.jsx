import { Typography, IconButton } from "@mui/material";
import { useState, forwardRef } from "react";
import { AiOutlineEye, AiOutlineEyeInvisible } from "../../shared/icons/index";

const InputFieldBordered = forwardRef(function InputFieldBordered({
  placeholder,
  value,
  onChange,
  onBlur,
  type = "text",
  title = "",
  name,
  disabled,
  textColor = "#000",
  fontFamily = "Switzer",
  ...rest
}, ref) {
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === "password";

  return (
    <div className="w-full">
      {title && (
        <Typography
          variant="body2"
          sx={{ mb: "8px", color: textColor, fontFamily: fontFamily }}
        >
          {title}
        </Typography>
      )}

      <div className="relative w-full">
        <input
          ref={ref}
          disabled={disabled}
          placeholder={placeholder}
          type={isPassword && showPassword ? "text" : type}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          className={`w-full h-[52px] outline-none bg-none border border-[#00000033] rounded-lg !px-4 font-[${fontFamily}] !font-normal !text-base pr-10`}
          {...rest}
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
});

export default InputFieldBordered;
