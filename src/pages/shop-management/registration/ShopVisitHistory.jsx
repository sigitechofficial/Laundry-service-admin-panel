import { Link } from "react-router-dom";
import { Badge, Button } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { useGetShopVisitsQuery } from "../../../store/services/api";
import { Empty, Section, Stars, ToneBadge } from "./registrationUi";
import { RECOMMENDATION, visitPaths, whenText } from "./registrationFormat";

/**
 * Physical shop visits for one shop, newest first: when, who went, who
 * recorded it, rating, recommendation and what needs attention.
 * [from] is passed through to the visit pages so their back link returns here.
 */
export default function ShopVisitHistory({ agentId, from }) {
  const { data, isLoading, isError, refetch } = useGetShopVisitsQuery(agentId, { skip: !agentId });
  const visits = data?.data?.visits || [];

  return (
    <Section
      title={`Shop visit history${visits.length ? ` (${visits.length})` : ""}`}
      sub="Optional. A Just Dry Cleans team member checks the shop in person and records what they found."
      right={
        <Link to={visitPaths.create(agentId, from)}>
          <Button size="sm">Record visit</Button>
        </Link>
      }
    >
      {isLoading ? (
        <Delay />
      ) : isError ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Empty>Could not load visits.</Empty>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : !visits.length ? (
        <Empty>No visits recorded yet.</Empty>
      ) : (
        <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
          {visits.map((v) => (
            <li
              key={v.id}
              style={{
                border: "1px solid var(--line, #E5E7EB)",
                borderRadius: 12,
                padding: 14,
                display: "grid",
                gap: 8,
                background: "var(--canvas, #F8FAFC)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "var(--ink, #0F172A)" }}>
                    {whenText(v.visitedAt)}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted, #64748B)" }}>
                    Visited by <strong style={{ color: "var(--ink, #0F172A)" }}>{v.visitedBy}</strong>
                    {v.recordedBy ? ` · recorded by ${v.recordedBy}` : ""}
                    {v.recordedAt ? ` on ${whenText(v.recordedAt)}` : ""}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Stars value={v.overallRating} />
                  <ToneBadge map={RECOMMENDATION} value={v.recommendation} />
                </div>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {v.summary?.poor ? <Badge tone="danger">{v.summary.poor} poor</Badge> : null}
                {v.summary?.concerns - (v.summary?.poor || 0) > 0 ? (
                  <Badge tone="warning">{v.summary.concerns - v.summary.poor} need work</Badge>
                ) : null}
                {!v.summary?.concerns ? <Badge tone="success">All checks good</Badge> : null}
                {(v.summary?.servicesNotOffered || []).map((s) => (
                  <Badge key={`no-${s}`} tone="danger">Can't offer {s}</Badge>
                ))}
                {(v.summary?.servicesPartly || []).map((s) => (
                  <Badge key={`partly-${s}`} tone="warning">Partly {s}</Badge>
                ))}
              </div>
              {v.feedback ? (
                <p style={{ margin: 0, fontSize: 14, color: "var(--ink-2, #334155)", whiteSpace: "pre-wrap" }}>
                  {v.feedback.length > 220 ? `${v.feedback.slice(0, 220)}…` : v.feedback}
                </p>
              ) : null}
              <div>
                <Link to={visitPaths.report(agentId, v.id, from)} style={{ fontSize: 13, fontWeight: 600 }}>
                  View full report
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Section>
  );
}
