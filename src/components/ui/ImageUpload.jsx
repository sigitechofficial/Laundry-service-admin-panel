import React, { useRef } from "react";
import { Typography, Box, Button } from "@mui/material";

export default function ImageUpload({
  title = "",
  onChange,
  value, // image URL or File object
  placeholder = "Upload image",
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && onChange) {
      onChange(file);
    }
  };

  return (
    <div className="w-full">
      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}

      <Box
        onClick={() => fileInputRef.current.click()}
        sx={{
          cursor: "pointer",
          borderRadius: "8px",
          backgroundColor: "#F4F7FF",
          border: "2px dashed #D1D5DB",
          padding: "16px",
          textAlign: "center",
          fontFamily: "Switzer",
          fontSize: "16px",
          color: "#6B7280",
          "&:hover": { backgroundColor: "#EDF1FF" },
        }}
      >
        {value ? (
          <img
            src={typeof value === "string" ? value : URL.createObjectURL(value)}
            alt="Uploaded Preview"
            style={{
              maxHeight: "150px",
              maxWidth: "100%",
              borderRadius: "8px",
              objectFit: "cover",
              margin: "0 auto",
            }}
          />
        ) : (
          <Typography variant="body2">{placeholder}</Typography>
        )}
      </Box>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChange}
      />

      {value && (
        <Box mt={1} textAlign="center">
          <Button
            variant="outlined"
            size="small"
            color="error"
            onClick={() => onChange(null)}
          >
            Remove
          </Button>
        </Box>
      )}
    </div>
  );
}
