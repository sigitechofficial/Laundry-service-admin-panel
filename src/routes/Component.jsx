import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Delay, DelayFull } from "../components/shared/Loaders";
import PrivateRoutes from "./PrivateRoutes";
import AuthRoutes from "./AuthRoutes";

const DsPlayground = lazy(() =>
  import("../design-system/playground/DsPlayground")
);

export default function Component() {
  let showLoader = false;
  return showLoader ? (
    <DelayFull />
  ) : (
    <Routes>
      <Route path="/login" element={<Navigate to="/auth/login" replace />} />
      <Route path="auth/*" element={<AuthRoutes />} />
      <Route
        path="ds/*"
        element={
          <Suspense fallback={<Delay />}>
            <DsPlayground />
          </Suspense>
        }
      />
      <Route path="/*" element={<PrivateRoutes />} />
    </Routes>
  );
}
