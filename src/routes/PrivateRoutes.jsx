import React, { Suspense } from "react";
import { privateRedirects, privateRoutes } from "../route/privateRoutes";
import { Route, Routes, Navigate, Outlet, useLocation } from "react-router-dom";
import { DelayFull } from "../components/shared/Loaders";
import { AuthCheck } from "../hooks/useAuth";
import PrivateLayout from "../components/shared/PrivateLayout";
import {
  canEmployeeReadPathname,
  firstAllowedEmployeePath,
} from "../utilities/employeeFeatureAccess";
import { isEmployeePermissionSession } from "../utilities/authStorage";
import {
  ShopManagementLayout,
  ShopDashboardPage,
  ShopsPage,
  AddShopPage,
  ShopEmployeesPage,
  ShopDetails,
  PendingAgentsPage,
  AgentSettlementPage,
  AgentSettlementDetailPage,
  LegacyAgentSettlementRedirectPage,
  ReportsLayout,
  NotFound,
} from "./AsyncComponent";

function EmployeeRouteGuard() {
  const location = useLocation();
  if (!isEmployeePermissionSession()) return <Outlet />;
  if (canEmployeeReadPathname(location.pathname)) return <Outlet />;
  const dest = firstAllowedEmployeePath();
  if (dest && dest !== location.pathname) {
    return <Navigate to={dest} replace />;
  }
  return (
    <div style={{ padding: 24, maxWidth: 520 }}>
      <h1 className="jd-h1" style={{ marginTop: 0 }}>
        No screens assigned
      </h1>
      <p style={{ color: "var(--muted)", margin: 0 }}>
        This staff account has no View access. Ask Super Admin to grant screens on Role and Permission.
      </p>
    </div>
  );
}

export default function PrivateRoutes() {
  return (
    <AuthCheck>
      <div className="!w-full">
        <Suspense fallback={<DelayFull />}>
          <Routes>
            <Route element={<PrivateLayout />}>
              <Route element={<EmployeeRouteGuard />}>
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
                  <Route path="agent-settlement/:agentId" element={<LegacyAgentSettlementRedirectPage />} />
                  <Route path="details/:id/settlement" element={<AgentSettlementDetailPage />} />
                  <Route path="details/:id" element={<ShopDetails />} />
                </Route>
                <Route path="/reports/*" element={<ReportsLayout />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </div>
    </AuthCheck>
  );
}
