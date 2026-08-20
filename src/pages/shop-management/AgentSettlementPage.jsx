import { PageHeader } from "../../design-system";
import AgentSettlement from "./AgentSettlement";

export default function AgentSettlementPage() {
  return (
    <div>
      <PageHeader
        title="Agent Cash Settlement"
        description="Record cash collected from agents and confirm remittances"
      />
      <AgentSettlement />
    </div>
  );
}
