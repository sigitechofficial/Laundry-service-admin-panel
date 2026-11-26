import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button, PageHeader } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import { useGetAgentRegistrationQuery, useGetShopVisitQuery } from "../../../store/services/api";
import { Empty, Row, Section, Stars, ToneBadge } from "./registrationUi";
import useScrollTop from "./useScrollTop";
import { CHECK_RESULT, RECOMMENDATION, YES_PARTLY_NO, backPath, grid2, whenText } from "./registrationFormat";

const lineStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 10,
  padding: "10px 0",
  borderTop: "1px solid var(--line-soft, #F1F5F9)",
  alignItems: "start",
};

function Remark({ text }) {
  return text ? (
    <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--ink-2, #334155)", whiteSpace: "pre-wrap" }}>{text}</p>
  ) : null;
}

/** One physical shop visit, in full. */
export default function ShopVisitReportPage() {
  const { agentId, visitId } = useParams();
  useScrollTop(visitId);
  const [params] = useSearchParams();
  const from = params.get("from") || "onboarding";
  const { data, isLoading, isError, refetch } = useGetShopVisitQuery({ agentId, visitId }, { skip: !agentId || !visitId });
  const { data: regData } = useGetAgentRegistrationQuery(agentId, { skip: !agentId });
  const v = data?.data?.visit;
  const shopName = regData?.data?.shop?.name || regData?.data?.account?.name || "Shop";

  const groups = [];
  for (const c of v?.checklist || []) {
    let g = groups.find((x) => x.name === (c.group || "Checks"));
    if (!g) groups.push((g = { name: c.group || "Checks", items: [] }));
    g.items.push(c);
  }

  return (
    <div>
      <PageHeader
        title="Shop visit report"
        description={v ? `${shopName} · ${whenText(v.visitedAt)}` : shopName}
        actions={
          <Link to={backPath(from, agentId)}>
            <Button variant="secondary">Back</Button>
          </Link>
        }
      />
      {isLoading ? (
        <Delay />
      ) : isError || !v ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>Could not load this visit.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
          <div style={grid2}>
            <Section title="Visit">
              <Row label="Date and time" value={whenText(v.visitedAt)} />
              <Row label="Visited by" value={v.visitedBy} />
              <Row label="Recorded by" value={v.recordedBy} />
              <Row label="Recorded on" value={whenText(v.recordedAt)} />
            </Section>
            <Section title="Result">
              <div style={{ display: "grid", gap: 10, paddingTop: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <ToneBadge map={RECOMMENDATION} value={v.recommendation} />
                  <Stars value={v.overallRating} />
                </div>
                <p style={{ margin: 0, fontSize: 14, color: "var(--muted, #64748B)" }}>
                  {v.summary?.concerns
                    ? `${v.summary.concerns} check${v.summary.concerns > 1 ? "s" : ""} need attention${v.summary.poor ? ` (${v.summary.poor} poor)` : ""}.`
                    : "All checks were good."}
                  {v.summary?.servicesNotOffered?.length ? ` Can't offer: ${v.summary.servicesNotOffered.join(", ")}.` : ""}
                  {v.summary?.servicesPartly?.length ? ` Partly: ${v.summary.servicesPartly.join(", ")}.` : ""}
                </p>
              </div>
            </Section>
          </div>

          {v.feedback ? (
            <Section title="Overall feedback">
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{v.feedback}</p>
            </Section>
          ) : null}

          {groups.map((g) => (
            <Section key={g.name} title={g.name}>
              {g.items.map((c) => (
                <div key={c.key} style={lineStyle}>
                  <div style={{ minWidth: 0 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{c.question}</span>
                    <Remark text={c.remark} />
                  </div>
                  <ToneBadge map={CHECK_RESULT} value={c.result} />
                </div>
              ))}
            </Section>
          ))}

          <div style={grid2}>
            <Section title="Machinery against registration">
              {v.machinery?.length ? (
                v.machinery.map((m, i) => (
                  <div key={`${m.name}-${i}`} style={lineStyle}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{m.name}</span>
                      <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--muted, #64748B)" }}>
                        Registered: {m.registered || "—"} · Seen: {m.seen || "—"}
                      </p>
                      <Remark text={m.remark} />
                    </div>
                    {m.matches ? <ToneBadge map={YES_PARTLY_NO} value={m.matches} /> : null}
                  </div>
                ))
              ) : (
                <Empty>No machinery was given at registration.</Empty>
              )}
            </Section>

            <Section title="Services">
              {v.services?.length ? (
                v.services.map((s) => (
                  <div key={s.serviceId} style={lineStyle}>
                    <div style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                      <Remark text={s.remark} />
                    </div>
                    <ToneBadge map={YES_PARTLY_NO} value={s.canProvide} />
                  </div>
                ))
              ) : (
                <Empty>No services were checked.</Empty>
              )}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
