import { Link } from "react-router-dom";
import { Button } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { useGetAgentRegistrationQuery } from "../../../store/services/api";
import RegistrationDetails from "./RegistrationDetails";
import ShopVisitHistory from "./ShopVisitHistory";
import { visitPaths } from "./registrationFormat";

/** Shop Management → shop → Registration: what the shop registered with, and its visit history. */
export default function RegistrationTab({ agentId, shopId }) {
  const { data, isLoading, isError, refetch } = useGetAgentRegistrationQuery(agentId, { skip: !agentId });
  if (!agentId) {
    return <p className="jd-lead">This shop has no owner account linked.</p>;
  }
  return (
    <div style={{ display: "grid", gap: 14 }}>
      {isLoading ? (
        <Delay />
      ) : isError || !data?.data ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <p className="jd-lead" style={{ margin: 0 }}>Could not load the registration.</p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Link to={visitPaths.registration(agentId)} style={{ fontSize: 13, fontWeight: 600 }}>
              Open approval review
            </Link>
          </div>
          <RegistrationDetails r={data.data} />
        </>
      )}
      <ShopVisitHistory agentId={agentId} from={shopId ? `shop-${shopId}` : undefined} />
    </div>
  );
}
