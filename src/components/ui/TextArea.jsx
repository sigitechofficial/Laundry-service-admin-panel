import { TextField, Typography } from "@mui/material";

export default function TextareaField({
  placeholder,
  value,
  onChange,
  title = "",
  rows = 4, // default rows
  name,
}) {
  return (
    <div className="w-full">
      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}
      <TextField
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        name={name}
        multiline
        rows={rows}
        variant="outlined"
        fullWidth
        sx={{
          "& .MuiOutlinedInput-root": {
            borderRadius: "8px",
            backgroundColor: "#F4F7FF",
            fontFamily: "Switzer",
            fontSize: "16px",
            fontWeight: 400,
            padding: 0,
            "& fieldset": {
              border: "none",
            },
          },
          "& .MuiInputBase-input": {
            padding: "12px 16px",
          },
        }}
      />
    </div>
  );
}
