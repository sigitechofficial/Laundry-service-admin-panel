import React, { Suspense } from "react";
import { privateRoutes } from "../route/privateRoutes";
import { Route, Routes } from "react-router-dom";
import { DelayFull } from "../components/shared/Loaders";
import { AuthCheck } from "../hooks/useAuth";

export default function PrivateRoutes() {
  return (
    <AuthCheck>
      <div className="!w-full">
        <Suspense fallback={<DelayFull />}>
          <Routes>
            {/* eslint-disable-next-line no-unused-vars */}
            {privateRoutes.map(({ path, element: Component }) => (
              <Route key={path} path={path} element={<Component />} />
            ))}
          </Routes>
        </Suspense>
      </div>
    </AuthCheck>
  );
}
