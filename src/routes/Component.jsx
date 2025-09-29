import { Box } from "@mui/material";
import { Route, Routes } from "react-router-dom";
import { Delay } from "../components/shared/Loaders";
import PrivateRoutes from "./PrivateRoutes";
import AuthRoutes from "./AuthRoutes";

export default function Component() {
  let showLoader = false;
  return showLoader ? (
    <Box className="flex items-center justify-center !w-screen !h-screen">
      <Delay />
    </Box>
  ) : (
    <Routes>
      <Route path="auth/*" element={<AuthRoutes />} />
      <Route path="/*" element={<PrivateRoutes />} />
      {/* <Route path="profile-edit" element={<Profile />} /> */}
      {/* <Route path="error" element={<ErrorPage />} /> */}
      {/* <Route path="*" element={<NotFound />} /> */}
    </Routes>
  );
}
