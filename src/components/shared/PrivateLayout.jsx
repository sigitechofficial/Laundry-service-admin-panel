import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Layout from "./Layout";
import { Delay } from "./Loaders";

export default function PrivateLayout() {
  return (
    <Layout
      content={
        <Suspense
          fallback={
            <div className="min-h-[400px] flex items-center justify-center">
              <Delay />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      }
    />
  );
}
