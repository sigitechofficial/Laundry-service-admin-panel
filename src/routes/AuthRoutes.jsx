import React, { Suspense } from "react";
import { publicRoutes } from "../route/privateRoutes";
import { Route, Routes } from "react-router-dom";
import { DelayFull } from "../components/shared/Loaders";

export default function AuthRoutes() {
  return (
    <div className="!w-full">
      <Suspense fallback={<DelayFull />}>
        <Routes>
          {/* eslint-disable-next-line no-unused-vars */}
          {publicRoutes.map(({ path, element: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </Suspense>
    </div>
  );
}
