import React, { Suspense } from "react";
import { publicRoutes } from "../route/privateRoutes";
import { Navigate, Route, Routes } from "react-router-dom";
import { DelayFull } from "../components/shared/Loaders";

export default function AuthRoutes() {
  return (
    <div className="!w-full">
      <Suspense fallback={<DelayFull />}>
        <Routes>
          <Route index element={<Navigate to="/auth/login" replace />} />
          {publicRoutes.map(({ path, element: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
          <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
