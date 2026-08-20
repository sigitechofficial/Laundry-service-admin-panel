import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { PageHeader } from "../../design-system";
import { TabBar } from "../misc-kit";
import OverallPolicies from "./OverallPolicies";

const TABS = [
  { value: "/policies-management/overall-policies", label: "Overall" },
  { value: "/policies-management/cancellation-policy", label: "Cancellation" },
  { value: "/policies-management/no-show-policy", label: "No Show" },
  { value: "/policies-management/reschedule-policy", label: "Reschedule" },
];

export default function PoliciesManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const path = location.pathname.replace(/\/$/, "");

  useEffect(() => {
    if (path === "/policies-management") {
      navigate("/policies-management/overall-policies", { replace: true });
    }
  }, [path, navigate]);

  const active = TABS.some((t) => t.value === path) ? path : TABS[0].value;

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader title="Policies Management" description="Operational policies applied per zone." />
      <TabBar value={active} tabs={TABS} onChange={(next) => navigate(next)} />
      {active === TABS[0].value ? <OverallPolicies /> : null}
    </div>
  );
}
