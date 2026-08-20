import React, { Suspense } from "react";
import { privateRedirects, privateRoutes } from "../route/privateRoutes";
import { Route, Routes, Navigate } from "react-router-dom";
import { DelayFull } from "../components/shared/Loaders";
import { AuthCheck } from "../hooks/useAuth";
import PrivateLayout from "../components/shared/PrivateLayout";
import {
  ShopManagementLayout,
  ShopDashboardPage,
  ShopsPage,
  AddShopPage,
  ShopEmployeesPage,
  ShopDetails,
  PendingAgentsPage,
  AgentSettlementPage,
  ReportsLayout,
  NotFound,
} from "./AsyncComponent";

export default function PrivateRoutes() {
  return (
    <AuthCheck>
      <div className="!w-full">
        <Suspense fallback={<DelayFull />}>
          <Routes>
            <Route element={<PrivateLayout />}>
              {privateRoutes.map(({ path, element: Component }) => (
                <Route key={path} path={path} element={<Component />} />
              ))}
              {privateRedirects.map(({ path, to }) => (
                <Route key={path} path={path} element={<Navigate to={to} replace />} />
              ))}
              <Route path="/shop-management" element={<ShopManagementLayout />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<ShopDashboardPage />} />
                <Route path="shops" element={<ShopsPage />} />
                <Route path="add-shop" element={<AddShopPage />} />
                <Route path="employees" element={<ShopEmployeesPage />} />
                <Route path="pending-agents" element={<PendingAgentsPage />} />
                <Route path="agent-settlement" element={<AgentSettlementPage />} />
                <Route path="details/:id" element={<ShopDetails />} />
              </Route>
              <Route path="/reports/*" element={<ReportsLayout />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Suspense>
      </div>
    </AuthCheck>
  );
}
