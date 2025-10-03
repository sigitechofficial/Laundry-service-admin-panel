import { Typography } from "@mui/material";
import InputFieldBordered from "./InputFieldBordered";

export default function FormInputField({
  title,
  name,
  register,
  error,
  ...props
}) {
  return (
    <div>
      <InputFieldBordered
        title={title}
        name={name}
        {...register(name)}
        {...props}
      />
      {error && (
        <Typography
          variant="caption"
          color="error"
          sx={{ mt: 0.5, display: "block" }}
        >
          {error.message}
        </Typography>
      )}
    </div>
  );
}
