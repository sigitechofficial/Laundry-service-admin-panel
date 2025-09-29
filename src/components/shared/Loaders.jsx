import { Box, CircularProgress } from "@mui/material";

export const Delay = ({ size = "5vw", width = "100%", height = "100%" }) => (
  <Box
    minHeight={width}
    maxHeight={height}
    display="flex"
    justifyContent="center"
    alignItems="center"
  >
    <CircularProgress size={size} />
  </Box>
);

export const DelayFull = () => (
  <Box
    minHeight="100vh"
    maxHeight="100vh"
    display="flex"
    justifyContent="center"
    alignItems="center"
  >
    <Delay />
  </Box>
);
export const MiniLoader = ({ size = "50px" }) => (
  <Box display="flex" justifyContent="center" alignItems="center">
    <Delay size={size} />
  </Box>
);
