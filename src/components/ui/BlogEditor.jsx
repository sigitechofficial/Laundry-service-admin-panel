import { Box, Typography, TextField } from "@mui/material";

export default function BlogEditor({
  value,
  onChange,
  placeholder = "Enter blog description...",
  title = "",
  minHeight = 120,
}) {
  // Convert HTML to plain text (preserve line breaks from <p> tags)
  const htmlToPlain = (html) => {
    if (!html || typeof html !== "string") return "";
    return html
      .replace(/<p[^>]*>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim();
  };

  const plainValue = htmlToPlain(value || "");

  const handleChange = (e) => {
    const text = e.target.value;
    // Store as simple HTML paragraphs for backend compatibility
    const html = text
      ? text.split("\n").map((line) => `<p>${line || "<br>"}</p>`).join("")
      : "";
    onChange(html);
  };

  return (
    <div className="w-full">
      {title && (
        <Typography variant="body2" sx={{ mb: "8px", color: "#374151" }}>
          {title}
        </Typography>
      )}
      <Box
        sx={{
          width: "100%",
          border: "1px solid #D1D5DB",
          borderRadius: "8px",
          backgroundColor: "#F4F7FF",
          overflow: "hidden",
        }}
      >
        <TextField
          multiline
          fullWidth
          placeholder={placeholder}
          value={plainValue}
          onChange={handleChange}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              backgroundColor: "#F4F7FF",
              fontFamily: "Switzer, sans-serif",
              fontSize: "16px",
              minHeight: `${minHeight}px`,
              alignItems: "flex-start",
              "& fieldset": {
                border: "none",
              },
            },
            "& .MuiInputBase-input": {
              py: 1.5,
              px: 2,
              minHeight: `${minHeight}px`,
            },
          }}
        />
      </Box>
    </div>
  );
}
