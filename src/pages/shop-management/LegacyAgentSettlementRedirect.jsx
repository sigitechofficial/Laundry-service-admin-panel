import { Navigate, useParams } from "react-router-dom";
import { Button } from "../../design-system";
import { Delay } from "../../components/shared/Loaders";
import { useGetAgentSettlementDetailQuery } from "../../store/services/api";
import { getApiErrorMessage } from "../../store/services/apiErrors";
import { shopSettlementPath } from "../reports/reportUi";

export default function LegacyAgentSettlementRedirect() {
  const { agentId } = useParams();
  const { data, isLoading, isError, error, refetch } = useGetAgentSettlementDetailQuery(
    {
      agentId,
      ordersPage: 1,
      ordersLimit: 1,
      ledgerPage: 1,
      ledgerLimit: 1,
    },
    { skip: !agentId }
  );

  const shopId = data?.data?.identity?.shopId ?? data?.data?.shop?.id;
  const canonical = shopSettlementPath(shopId);

  if (canonical) {
    return <Navigate to={canonical} replace />;
  }

  if (isLoading) return <Delay />;

  return (
    <div style={{ textAlign: "center", padding: 28 }}>
      <p className="jd-lead" style={{ margin: "0 0 12px" }}>
        {isError
          ? getApiErrorMessage(error, "Could not resolve this settlement link.")
          : "This settlement link has no shop attached."}
      </p>
      <Button variant="secondary" onClick={() => refetch()}>
        Retry
      </Button>
    </div>
  );
}
