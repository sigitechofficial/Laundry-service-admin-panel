import React, { Suspense } from "react";
import { privateRoutes } from "../route/privateRoutes";
import { Route, Routes } from "react-router-dom";
import { Delay, DelayFull } from "../components/shared/Loaders";

export default function PrivateRoutes() {
  return (
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
  );
}
