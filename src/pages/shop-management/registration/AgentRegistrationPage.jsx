import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, PageHeader } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { DATE_TIME_FORMAT, formatDate } from "../../../utilities/formatters";
import { useGetAgentRegistrationQuery } from "../../../store/services/api";
import RegistrationDetails from "./RegistrationDetails";
import ShopVisitHistory from "./ShopVisitHistory";
import RejectAgentDialog from "./RejectAgentDialog";
import useAgentApprovalActions from "./useAgentApprovalActions";
import useScrollTop from "./useScrollTop";

/** Full review of a shop's registration (from Agent Approvals): details, visits, approve / reject. */
export default function AgentRegistrationPage() {
  const { agentId } = useParams();
  useScrollTop(agentId);
  const { data, isLoading, isError, refetch } = useGetAgentRegistrationQuery(agentId, { skip: !agentId });
  const { approve, reject, busy } = useAgentApprovalActions();
  const [rejecting, setRejecting] = useState(false);
  const r = data?.data;
  const status = r?.account?.approvalStatus;
  const title = r?.shop?.name || r?.account?.name || "Shop registration";

  const actions = r ? (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <Link to="/shop-management/pending-agents">
        <Button variant="secondary">Back to Agent Approvals</Button>
      </Link>
      {status === "pending" ? (
        <Button variant="danger" disabled={busy} onClick={() => setRejecting(true)}>
          Reject
        </Button>
      ) : null}
      {status !== "approved" ? (
        <Button disabled={busy} onClick={() => approve(agentId, status === "rejected")}>
          {status === "rejected" ? "Restore & approve" : "Approve"}
        </Button>
      ) : null}
    </div>
  ) : null;

  return (
    <div>
      <PageHeader
        title={title}
        description={
          r?.account
            ? `Registered by ${r.account.name || "—"}${
                r.account.registeredAt ? ` on ${formatDate(r.account.registeredAt, DATE_TIME_FORMAT)}` : ""
              }`
            : "Shop registration"
        }
        actions={actions}
      />
      {isLoading ? (
        <Delay />
      ) : isError || !r ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>Could not load this registration.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14 }}>
          <RegistrationDetails r={r} />
          <ShopVisitHistory agentId={agentId} from="onboarding" />
        </div>
      )}
      <RejectAgentDialog
        open={rejecting}
        agentName={title}
        busy={busy}
        onClose={() => setRejecting(false)}
        onConfirm={async (payload) => {
          if (await reject(agentId, payload)) setRejecting(false);
        }}
      />
    </div>
  );
}
