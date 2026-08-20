import { PageHeader } from "../../design-system";
import PendingAgents from "./PendingAgents";

export default function PendingAgentsPage() {
  return (
    <div>
      <PageHeader
        title="Agent Approvals"
        description="Review pending shop-agent registrations and restore rejected agents"
      />
      <PendingAgents />
    </div>
  );
}
