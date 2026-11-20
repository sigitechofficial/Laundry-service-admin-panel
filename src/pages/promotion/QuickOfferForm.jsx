import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Button, Field, Input, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { useCreatePromotionMutation, usePublishPromotionMutation } from "../../store/services/api";
import "./quickOffer.css";

/**
 * The easy way to make an offer: four questions on one screen.
 *   1. What do customers get?   2. Who gets it?   3. When?   4. Limits (optional)
 * Everything else uses safe defaults (all zones, one per customer, doesn't combine).
 * "More options" opens the full form with these answers filled in.
 */

const WHAT = [
  { value: "percent", label: "% off the order" },
  { value: "amount", label: "£ off the order" },
];
const WHO = [
  { value: "everyone", label: "Everyone" },
  { value: "code", label: "Customers with a code" },
  { value: "first", label: "New customers (first order)" },
];

const INITIAL = () => ({
  name: "",
  what: "percent",
  value: "",
  maxOff: "",
  minOrder: "",
  who: "everyone",
  code: "",
  startDate: dayjs().format("YYYY-MM-DD"),
  endDate: "",
  perCustomer: "1",
  totalUses: "",
  budget: "",
});

function Choice({ label, options, value, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="qo-choice">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`qo-choice__btn${value === o.value ? " is-on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <section className="qo-sec">
      <h4 className="qo-sec__t"><span className="qo-sec__n">{n}</span>{title}</h4>
      {children}
    </section>
  );
}

const num = (v) => (v === "" || v == null ? null : Number(v));
const money = (n) => `£${Number(n).toFixed(2).replace(/\.00$/, "")}`;

/** Plain-words line of what the admin is making. */
function summaryOf(f) {
  if (!num(f.value)) return "Choose what customers get.";
  const off = f.what === "percent" ? `${num(f.value)}% off` : `${money(f.value)} off`;
  const cap = f.what === "percent" && num(f.maxOff) ? ` (up to ${money(f.maxOff)})` : "";
  const min = num(f.minOrder) ? ` on orders over ${money(f.minOrder)}` : "";
  const who = f.who === "code" ? ` for customers who enter ${f.code.trim().toUpperCase() || "a code"}`
    : f.who === "first" ? " on a new customer's first order" : " for everyone";
  const when = f.endDate ? `, ${dayjs(f.startDate).format("D MMM")} – ${dayjs(f.endDate).format("D MMM YYYY")}` : f.startDate && dayjs(f.startDate).isAfter(dayjs(), "day") ? `, from ${dayjs(f.startDate).format("D MMM YYYY")}` : ", starting today";
  const stop = [
    num(f.budget) ? `stops when ${money(f.budget)} has been given` : null,
    num(f.totalUses) ? `stops after ${num(f.totalUses)} orders` : null,
  ].filter(Boolean).join(" or ");
  return `${off}${cap}${min}${who}${when}. ${num(f.perCustomer) ? `Each customer can use it ${num(f.perCustomer) === 1 ? "once" : `${num(f.perCustomer)} times`}.` : "No limit per customer."}${stop ? ` It ${stop}.` : ""}`;
}

function validate(f) {
  if (!f.name.trim()) return "Give the offer a name";
  const v = num(f.value);
  if (!v || v <= 0) return f.what === "percent" ? "Enter the % off" : "Enter the £ off";
  if (f.what === "percent" && v > 100) return "% off can't be more than 100";
  if (f.who === "code" && !/^[A-Z0-9_-]{3,30}$/i.test(f.code.trim())) return "Enter a code: 3–30 letters or numbers";
  if (f.endDate && f.startDate && f.endDate < f.startDate) return "The end date is before the start date";
  if (num(f.budget) != null && num(f.budget) <= 0) return "Budget must be more than £0, or left empty";
  if (num(f.totalUses) != null && !(Number.isInteger(num(f.totalUses)) && num(f.totalUses) >= 1)) return "Total orders must be a whole number";
  if (num(f.perCustomer) != null && !(Number.isInteger(num(f.perCustomer)) && num(f.perCustomer) >= 1)) return "Uses per customer must be a whole number";
  return null;
}

/** Quick answers → the full promotion payload (and the full form's preset for "More options"). */
export function quickOfferToPreset(f) {
  return {
    name: f.name.trim(),
    benefitType: "basket_discount",
    discountMode: f.what,
    discountValue: f.value,
    maxDiscountCap: f.what === "percent" ? f.maxOff : "",
    minSubtotal: f.minOrder,
    activationType: f.who === "code" ? "coupon_required" : "automatic",
    visibility: f.who === "code" ? "private_code" : "public",
    couponCodes: f.who === "code" && f.code.trim() ? [{ code: f.code.trim().toUpperCase(), codeType: "shared" }] : [],
    conditions: f.who === "first" ? [{ conditionType: "FIRST_ORDER", operator: "equals", value: true, logicGroup: "ALL" }] : [],
    startDate: f.startDate,
    endDate: f.endDate,
    perCustomerLimit: f.perCustomer,
    globalUsageLimit: f.totalUses,
    budget: f.budget,
  };
}

function toPayload(f) {
  const p = quickOfferToPreset(f);
  return {
    ...p,
    discountValue: num(p.discountValue),
    maxDiscountCap: num(p.maxDiscountCap),
    minSubtotal: num(p.minSubtotal),
    targetType: "basket",
    zoneScopeMode: "all",
    stackable: false,
    priority: 50,
    repricingPolicy: "recalculate",
    perCustomerLimit: num(p.perCustomerLimit),
    globalUsageLimit: num(p.globalUsageLimit),
    startDate: p.startDate || null,
    endDate: p.endDate || null,
    budget: num(p.budget),
  };
}

export default function QuickOfferForm({ open, onClose, onSaved, onMoreOptions }) {
  const toast = useToaster();
  const [f, setF] = useState(INITIAL);
  const [error, setError] = useState(null);
  const [createPromotion, { isLoading: creating }] = useCreatePromotionMutation();
  const [publishPromotion, { isLoading: publishing }] = usePublishPromotionMutation();
  const busy = creating || publishing;

  useEffect(() => {
    if (open) { setF(INITIAL()); setError(null); }
  }, [open]);

  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e?.target ? e.target.value : e }));
  const summary = useMemo(() => summaryOf(f), [f]);

  const save = async (goLive) => {
    const err = validate(f);
    setError(err);
    if (err) return;
    try {
      const res = await createPromotion(toPayload(f)).unwrap();
      const id = (res?.data ?? res)?.id;
      if (goLive && id) {
        const pub = await publishPromotion({ id }).unwrap();
        const scheduled = (pub?.data ?? pub)?.status === "scheduled";
        toast.success(scheduled ? `"${f.name.trim()}" is scheduled` : `"${f.name.trim()}" is live`);
        onSaved?.(scheduled ? "scheduled" : "active");
      } else {
        toast.success(`"${f.name.trim()}" saved as a draft`);
        onSaved?.("draft");
      }
    } catch (e) {
      setError(e?.data?.message || "Could not save the offer");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Create offer" size="lg" hideFooter closeOnBackdrop={false}>
      <div className="qo">
        <Field label="Offer name" hint="Customers see this on their order, e.g. “10% off this week”">
          <Input value={f.name} onChange={set("name")} placeholder="10% off this week" maxLength={200} />
        </Field>

        <Section n="1" title="What do customers get?">
          <Choice label="Discount type" options={WHAT} value={f.what} onChange={set("what")} />
          <div className="qo-row">
            <Field label={f.what === "percent" ? "% off" : "£ off"}>
              <Input type="number" min="0" step={f.what === "percent" ? "1" : "0.5"} value={f.value} onChange={set("value")} placeholder={f.what === "percent" ? "10" : "5"} />
            </Field>
            {f.what === "percent" ? (
              <Field label="Up to (£)" hint="Optional. Most it can take off one order">
                <Input type="number" min="0" step="0.5" value={f.maxOff} onChange={set("maxOff")} placeholder="No limit" />
              </Field>
            ) : null}
            <Field label="Orders over (£)" hint="Optional">
              <Input type="number" min="0" step="0.5" value={f.minOrder} onChange={set("minOrder")} placeholder="Any order" />
            </Field>
          </div>
        </Section>

        <Section n="2" title="Who gets it?">
          <Choice label="Who gets it" options={WHO} value={f.who} onChange={set("who")} />
          {f.who === "code" ? (
            <div className="qo-row">
              <Field label="Code" hint="Customers type this at checkout">
                <Input value={f.code} onChange={(e) => setF((p) => ({ ...p, code: e.target.value.toUpperCase().replace(/\s/g, "") }))} placeholder="SAVE10" maxLength={30} />
              </Field>
            </div>
          ) : null}
        </Section>

        <Section n="3" title="When?">
          <div className="qo-row">
            <Field label="Starts">
              <Input type="date" value={f.startDate} onChange={set("startDate")} />
            </Field>
            <Field label="Ends" hint="Optional. Leave empty to run until you pause it">
              <Input type="date" value={f.endDate} min={f.startDate || undefined} onChange={set("endDate")} />
            </Field>
          </div>
        </Section>

        <Section n="4" title="Limits (optional)">
          <div className="qo-row">
            <Field label="Uses per customer">
              <Input type="number" min="1" step="1" value={f.perCustomer} onChange={set("perCustomer")} placeholder="No limit" />
            </Field>
            <Field label="Total orders" hint="Stops after this many orders">
              <Input type="number" min="1" step="1" value={f.totalUses} onChange={set("totalUses")} placeholder="No limit" />
            </Field>
            <Field label="Budget (£)" hint="Stops when this much has been given away">
              <Input type="number" min="0" step="1" value={f.budget} onChange={set("budget")} placeholder="No limit" />
            </Field>
          </div>
          <p className="qo-note">Orders booked while the offer is on always get the full discount.</p>
        </Section>

        <div className="qo-summary" aria-live="polite">{summary}</div>
        {error ? <p className="qo-error" role="alert">{error}</p> : null}

        <div className="qo-foot">
          <Button variant="ghost" onClick={() => onMoreOptions?.(quickOfferToPreset(f))} disabled={busy}>More options…</Button>
          <span className="qo-foot__sp" />
          <Button variant="secondary" onClick={() => save(false)} disabled={busy}>Save as draft</Button>
          <Button onClick={() => save(true)} disabled={busy}>{busy ? "Saving…" : "Save & go live"}</Button>
        </div>
      </div>
    </Modal>
  );
}
