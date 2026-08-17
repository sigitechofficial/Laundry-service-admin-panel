import { Box, keyframes } from "@mui/material";

const shimmerMove = keyframes`
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
`;

/** Inline figure placeholder — keeps layout stable while data loads */
export default function FigureShimmer({
  width = 96,
  height = 28,
  radius = 6,
  sx,
}) {
  return (
    <Box
      aria-hidden
      sx={{
        width,
        height,
        borderRadius: `${radius}px`,
        background:
          "linear-gradient(90deg, #E8EEF7 0%, #F4F7FF 40%, #E8EEF7 80%)",
        backgroundSize: "200% 100%",
        animation: `${shimmerMove} 1.1s ease-in-out infinite`,
        flexShrink: 0,
        ...sx,
      }}
    />
  );
}
