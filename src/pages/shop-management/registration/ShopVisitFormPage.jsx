import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Button, Field, Input, PageHeader, Textarea } from "../../../design-system";
import { Delay } from "../../../components/shared/Loaders";
import useToaster from "../../../components/ui/Toaster";
import {
  useCreateShopVisitMutation,
  useGetAgentRegistrationQuery,
  useGetShopVisitsQuery,
} from "../../../store/services/api";
import { Section } from "./registrationUi";
import useScrollTop from "./useScrollTop";
import { CHECK_RESULT, RECOMMENDATION, YES_PARTLY_NO, backPath, grid2, visitPaths } from "./registrationFormat";

/** "2026-11-26T14:05" for <input type="datetime-local"> in the viewer's clock. */
function localNow() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Buttons for one answer out of a few (Good / Needs work / …). */
function Choice({ name, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={name} style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
      {Object.entries(options).map(([key, o]) => {
        const on = value === key;
        const colors = {
          success: ["#DCFCE7", "#166534", "#86EFAC"],
          warning: ["#FEF3C7", "#92400E", "#FCD34D"],
          danger: ["#FEE2E2", "#991B1B", "#FCA5A5"],
          neutral: ["#F1F5F9", "#334155", "#CBD5E1"],
        }[o.tone] || ["#F1F5F9", "#334155", "#CBD5E1"];
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(key)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              border: `1.5px solid ${on ? colors[2] : "var(--line, #E2E8F0)"}`,
              background: on ? colors[0] : "var(--surface, #fff)",
              color: on ? colors[1] : "var(--muted, #475569)",
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

const itemStyle = {
  display: "grid",
  gap: 8,
  padding: "12px 0",
  borderTop: "1px solid var(--line-soft, #F1F5F9)",
};

/** Record a physical visit to a shop: checklist, machinery, services, rating and recommendation. */
export default function ShopVisitFormPage() {
  const { agentId } = useParams();
  useScrollTop(agentId);
  const [params] = useSearchParams();
  const from = params.get("from") || "onboarding";
  const navigate = useNavigate();
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError, refetch } = useGetShopVisitsQuery(agentId, { skip: !agentId });
  const { data: regData } = useGetAgentRegistrationQuery(agentId, { skip: !agentId });
  const [createVisit, { isLoading: saving }] = useCreateShopVisitMutation();
  const errorsRef = useRef(null);

  const checklist = useMemo(() => data?.data?.checklist || [], [data]);
  const registered = data?.data?.registered || { services: [], machinery: [] };
  const shopName = regData?.data?.shop?.name || regData?.data?.account?.name || "Shop";

  const [visitedAt, setVisitedAt] = useState(localNow);
  const [visitedBy, setVisitedBy] = useState("");
  const [checks, setChecks] = useState({});
  const [machines, setMachines] = useState({});
  const [services, setServices] = useState({});
  const [rating, setRating] = useState(0);
  const [recommendation, setRecommendation] = useState("");
  const [feedback, setFeedback] = useState("");
  const [errors, setErrors] = useState([]);

  const groups = useMemo(() => {
    const out = [];
    for (const q of checklist) {
      let g = out.find((x) => x.name === q.group);
      if (!g) out.push((g = { name: q.group, items: [] }));
      g.items.push(q);
    }
    return out;
  }, [checklist]);

  const setCheck = (key, patch) => setChecks((p) => ({ ...p, [key]: { ...p[key], ...patch } }));
  const setService = (id, patch) => setServices((p) => ({ ...p, [id]: { ...p[id], ...patch } }));
  const setMachine = (i, patch) => setMachines((p) => ({ ...p, [i]: { ...p[i], ...patch } }));

  const validate = () => {
    const list = [];
    const when = new Date(visitedAt);
    if (!visitedAt || Number.isNaN(when.getTime())) list.push("Enter the date and time of the visit.");
    else if (when.getTime() > Date.now() + 5 * 60 * 1000) list.push("The visit date can't be in the future.");
    if (!visitedBy.trim()) list.push("Enter who visited the shop.");
    for (const q of checklist) {
      const a = checks[q.key];
      if (!a?.result) list.push(`Answer: ${q.question}.`);
      else if ((a.result === "poor" || a.result === "needs_work") && !a.remark?.trim())
        list.push(`Add a remark for: ${q.question}.`);
    }
    for (const s of registered.services) {
      const a = services[s.serviceId];
      if (!a?.canProvide) list.push(`Say whether the shop can provide ${s.name}.`);
      else if (a.canProvide !== "yes" && !a.remark?.trim()) list.push(`Add a remark for ${s.name}.`);
    }
    if (!recommendation) list.push("Choose a recommendation.");
    else if (recommendation !== "approve" && !feedback.trim())
      list.push("Add overall feedback explaining the recommendation.");
    return list;
  };

  const submit = async (e) => {
    e.preventDefault();
    const list = validate();
    setErrors(list);
    if (list.length) {
      requestAnimationFrame(() => errorsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
      return;
    }
    try {
      const res = await createVisit({
        agentId,
        body: {
          visitedAt: new Date(visitedAt).toISOString(),
          visitedBy: visitedBy.trim(),
          checklist: checklist.map((q) => ({ key: q.key, result: checks[q.key]?.result, remark: checks[q.key]?.remark })),
          services: registered.services.map((s) => ({
            serviceId: s.serviceId,
            canProvide: services[s.serviceId]?.canProvide,
            remark: services[s.serviceId]?.remark,
          })),
          machinery: registered.machinery.map((_, i) => machines[i] || {}),
          overallRating: rating || null,
          recommendation,
          feedback: feedback.trim() || undefined,
        },
      }).unwrap();
      success("Shop visit saved");
      navigate(visitPaths.report(agentId, res?.data?.visit?.id, from), { replace: true });
    } catch (err) {
      const msg = err?.data?.message || "Could not save the visit";
      setErrors([msg]);
      showError(msg);
    }
  };

  const back = backPath(from, agentId);

  return (
    <div>
      <PageHeader
        title="Record shop visit"
        description={`${shopName} · in-person check by the Just Dry Cleans team`}
        actions={
          <Link to={back}>
            <Button variant="secondary">Cancel</Button>
          </Link>
        }
      />
      {isLoading ? (
        <Delay />
      ) : isError ? (
        <div style={{ textAlign: "center", padding: 28 }}>
          <p className="jd-lead" style={{ margin: "0 0 12px" }}>Could not load the visit form.</p>
          <Button variant="secondary" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate style={{ display: "grid", gap: 14, maxWidth: 980 }}>
          <div ref={errorsRef} />
          {errors.length ? (
            <div role="alert" style={{ border: "1px solid #FECACA", background: "#FEF2F2", borderRadius: 12, padding: 14 }}>
              <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#991B1B" }}>
                Fix {errors.length === 1 ? "this" : `these ${errors.length} things`} before saving
              </p>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#7F1D1D", fontSize: 14 }}>
                {errors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <Section title="Visit">
            <div style={grid2}>
              <Field label="Date and time of visit" htmlFor="visit-at">
                <Input
                  id="visit-at"
                  type="datetime-local"
                  value={visitedAt}
                  max={localNow()}
                  onChange={(e) => setVisitedAt(e.target.value)}
                />
              </Field>
              <Field label="Visited by" hint="Team member who went to the shop" htmlFor="visit-by">
                <Input
                  id="visit-by"
                  maxLength={120}
                  placeholder="Sarah Khan, field team"
                  value={visitedBy}
                  onChange={(e) => setVisitedBy(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          {groups.map((g) => (
            <Section key={g.name} title={g.name}>
              {g.items.map((q) => {
                const a = checks[q.key] || {};
                const needsRemark = a.result === "poor" || a.result === "needs_work";
                return (
                  <div key={q.key} style={itemStyle}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: "var(--ink, #0F172A)", minWidth: 0 }}>
                        {q.question}
                      </span>
                      <Choice name={q.question} options={CHECK_RESULT} value={a.result} onChange={(v) => setCheck(q.key, { result: v })} />
                    </div>
                    <Input
                      aria-label={`Remark: ${q.question}`}
                      maxLength={500}
                      placeholder={needsRemark ? "Remark (required): what did you see?" : "Remark (optional)"}
                      value={a.remark || ""}
                      onChange={(e) => setCheck(q.key, { remark: e.target.value })}
                    />
                  </div>
                );
              })}
            </Section>
          ))}

          <Section title="Machinery against registration">
            {registered.machinery.length ? (
              registered.machinery.map((m, i) => {
                const a = machines[i] || {};
                return (
                  <div key={`${m.name}-${i}`} style={itemStyle}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {m.name}
                        <span style={{ fontWeight: 400, color: "var(--muted, #64748B)" }}> · registered: {m.registered || "—"}</span>
                      </span>
                      <Choice name={`${m.name} matches`} options={YES_PARTLY_NO} value={a.matches} onChange={(v) => setMachine(i, { matches: v })} />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "140px minmax(0, 1fr)", gap: 8 }}>
                      <Input aria-label={`${m.name} seen`} maxLength={40} placeholder="Seen (e.g. 2)" value={a.seen || ""} onChange={(e) => setMachine(i, { seen: e.target.value })} />
                      <Input aria-label={`${m.name} remark`} maxLength={300} placeholder="Condition / remark" value={a.remark || ""} onChange={(e) => setMachine(i, { remark: e.target.value })} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted, #64748B)" }}>
                No machinery was given at registration. Use the "Machinery matches what was given at registration" check and its remark.
              </p>
            )}
          </Section>

          <Section title="Can the shop provide its services?">
            {registered.services.length ? (
              registered.services.map((s) => {
                const a = services[s.serviceId] || {};
                return (
                  <div key={s.serviceId} style={itemStyle}>
                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>
                        {s.name}
                        {s.turnaround ? <span style={{ fontWeight: 400, color: "var(--muted, #64748B)" }}> · TAT {s.turnaround}</span> : null}
                      </span>
                      <Choice name={`Can provide ${s.name}`} options={YES_PARTLY_NO} value={a.canProvide} onChange={(v) => setService(s.serviceId, { canProvide: v })} />
                    </div>
                    <Input
                      aria-label={`Remark: ${s.name}`}
                      maxLength={500}
                      placeholder={a.canProvide && a.canProvide !== "yes" ? "Remark (required): what's missing?" : "Remark (optional)"}
                      value={a.remark || ""}
                      onChange={(e) => setService(s.serviceId, { remark: e.target.value })}
                    />
                  </div>
                );
              })
            ) : (
              <p style={{ margin: 0, fontSize: 14, color: "var(--muted, #64748B)" }}>The shop hasn't chosen any services yet.</p>
            )}
          </Section>

          <Section title="Overall">
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>Overall rating (optional)</p>
                <div style={{ display: "flex", gap: 4 }} role="radiogroup" aria-label="Overall rating">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      onClick={() => setRating(rating === n ? 0 : n)}
                      style={{ border: 0, background: "none", cursor: "pointer", fontSize: 28, lineHeight: 1, color: n <= rating ? "#F59E0B" : "#E2E8F0", padding: 2 }}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600 }}>Recommendation</p>
                <Choice name="Recommendation" options={RECOMMENDATION} value={recommendation} onChange={setRecommendation} />
              </div>
              <Field
                label={recommendation && recommendation !== "approve" ? "Overall feedback (required)" : "Overall feedback"}
                htmlFor="visit-feedback"
              >
                <Textarea
                  id="visit-feedback"
                  rows={5}
                  maxLength={4000}
                  placeholder="What the team found, what the shop does well, and what must change before it goes live."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <Link to={back}>
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save visit report"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
