import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Button, Field, Input, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { useCreatePromotionMutation, usePublishPromotionMutation } from "../../store/services/api";
import CatalogMultiSelect from "./CatalogMultiSelect";
import BulkDealsEditor, { dealsSummary, useServiceItemCatalog } from "./BulkDealsEditor";
import TimeInput24, { TIME_24 } from "./TimeInput24";
import { INITIAL, num, quickOfferToPreset, toPayload, validate } from "./quickOfferRules.js";
import "./quickOffer.css";

export { quickOfferToPreset } from "./quickOfferRules.js";

/**
 * The easy way to make an offer: four questions on one screen.
 *   1. What do customers get?   2. Who gets it?   3. When?   4. Limits (optional)
 * Everything else uses safe defaults (all zones, one per customer, doesn't combine).
 * "More options" opens the full form with these answers filled in.
 */

const ON = [
  { value: "order", label: "Whole order" },
  { value: "service", label: "Specific services" },
  { value: "item", label: "Specific items" },
];
const WHAT = (on) => {
  if (on === "order") return [{ value: "percent", label: "% off" }, { value: "amount", label: "£ off the order" }];
  const each = [{ value: "percent", label: "% off" }, { value: "amount", label: "£ off each item" }];
  // Bulk price: every N pieces of the chosen items for one price (10 T-shirts for £30).
  return on === "item" ? [...each, { value: "bulk", label: "Bulk price (e.g. 10 for £30)" }] : each;
};
const WHO = [
  { value: "everyone", label: "Everyone" },
  { value: "code", label: "Customers with a code" },
  { value: "first", label: "New customers (first order)" },
];

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

const money = (n) => `£${Number(n).toFixed(2).replace(/\.00$/, "")}`;

/** Plain-words line of what the admin is making. */
function summaryOf(f, { targetNames, nameOf, priceOf, serviceNameOf }) {
  if (f.what === "bulk") {
    return dealsSummary(f.deals, { nameOf, priceOf, serviceNameOf }) || "Add your deals: services, items, how many pieces, and the price.";
  }
  if (!num(f.value)) return "Choose what customers get.";
  const names = targetNames.length > 3 ? `${targetNames.slice(0, 3).join(", ")} and ${targetNames.length - 3} more` : targetNames.join(", ");
  // e.g. "Shirt, Trousers" / "Dry Clean items"
  const target = f.on === "item" ? (names || "the chosen items")
    : f.on === "service" ? (names ? `${names} items` : "items in the chosen services") : "";
  const off = f.on === "order"
    ? (f.what === "percent" ? `${num(f.value)}% off the whole order` : `${money(f.value)} off the whole order`)
    : (f.what === "percent" ? `${num(f.value)}% off ${target}` : `${money(f.value)} off each piece of ${target}`);
  const cap = f.what === "percent" && num(f.maxOff) ? ` (up to ${money(f.maxOff)})` : "";
  const min = num(f.minOrder) ? ` when the laundry total is over ${money(f.minOrder)}` : "";
  const needNames = f.needItemIds.length
    ? f.needItemIds.map(nameOf).filter(Boolean).join(" or ")
    : f.needServiceIds.map(serviceNameOf).filter(Boolean).join(" or ");
  const needs = f.on === "order" && f.needs && needNames ? ` when it includes ${needNames}` : "";
  const who = f.who === "code" ? ` for customers who enter ${f.code.trim().toUpperCase() || "a code"}`
    : f.who === "first" ? " on a new customer's first order" : " for everyone";
  // e.g. ", 20 Nov 09:00 – 25 Nov 2026 18:00" (UK time)
  const at = (t) => (t && TIME_24.test(t) ? ` ${t}` : "");
  const when = f.endDate
    ? `, ${dayjs(f.startDate).format("D MMM")}${at(f.startTime)} – ${dayjs(f.endDate).format("D MMM YYYY")}${at(f.endTime)}`
    : f.startDate && (dayjs(f.startDate).isAfter(dayjs(), "day") || at(f.startTime))
      ? `, from ${dayjs(f.startDate).format("D MMM YYYY")}${at(f.startTime)}`
      : ", starting today";
  const stop = [
    num(f.budget) ? `stops when ${money(f.budget)} has been given` : null,
    num(f.totalUses) ? `stops after ${num(f.totalUses)} orders` : null,
  ].filter(Boolean).join(" or ");
  return `${off}${cap}${min}${needs}${who}${when}. ${num(f.perCustomer) ? `Each customer can use it ${num(f.perCustomer) === 1 ? "once" : `${num(f.perCustomer)} times`}.` : "No limit per customer."}${stop ? ` It ${stop}.` : ""}`;
}

export default function QuickOfferForm({ open, resume = false, onClose, onSaved, onMoreOptions }) {
  const toast = useToaster();
  const [f, setF] = useState(INITIAL);
  const [error, setError] = useState(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const openedRef = useRef("");
  const [createPromotion, { isLoading: creating }] = useCreatePromotionMutation();
  const [publishPromotion, { isLoading: publishing }] = usePublishPromotionMutation();
  const busy = creating || publishing;

  // A fresh open starts blank; coming back from "More options" keeps what was entered.
  useEffect(() => {
    if (open && !resume) {
      const start = INITIAL();
      openedRef.current = JSON.stringify(start);
      setF(start);
      setError(null);
      setConfirmDiscard(false);
    }
  }, [open]);

  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e?.target ? e.target.value : e }));
  // Items are picked for bulk deals and for "Only if the order includes…".
  const pickingItems = f.what === "bulk" || (f.on === "order" && f.needs);
  const dealsApi = useServiceItemCatalog(open && (f.on !== "order" || pickingItems));
  const { catalog, itemsInServices, nameOf, priceOf, serviceNameOf } = dealsApi;
  const targetNames = useMemo(() => {
    const opts = catalog[f.on] || [];
    return f.targetIds.map((id) => opts.find((o) => o.value === String(id))?.label).filter(Boolean);
  }, [catalog, f.on, f.targetIds]);
  const summary = useMemo(
    () => summaryOf(f, { targetNames, nameOf, priceOf, serviceNameOf }),
    [f, targetNames, nameOf, priceOf, serviceNameOf]
  );
  /**
   * Bulk deals are for every order, so they start with no per-customer limit; other offers
   * start at once per customer. Only the untouched default switches, never a typed value.
   */
  const perCustomerFor = (what, prev) => {
    if (what === "bulk" && prev.perCustomer === "1") return "";
    if (what !== "bulk" && prev.what === "bulk" && prev.perCustomer === "") return "1";
    return prev.perCustomer;
  };
  const setWhat = (what) => setF((prev) => ({ ...prev, what, perCustomer: perCustomerFor(what, prev) }));
  // Bulk price is for chosen items only: switching away from items drops it.
  const setOn = (on) => setF((prev) => {
    const what = prev.what === "bulk" && on !== "item" ? "percent" : prev.what;
    return { ...prev, on, targetIds: [], what, perCustomer: perCustomerFor(what, prev) };
  });

  const save = async (goLive) => {
    const err = validate(f, priceOf);
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
      setError(e?.data?.message || "Could not save the promotion");
    }
  };

  // Escape, the close button and Cancel all come here: typed work is never lost by accident.
  const requestClose = () => {
    if (JSON.stringify(f) !== openedRef.current) setConfirmDiscard(true);
    else onClose?.();
  };

  return (
    <>
    <Modal
      open={confirmDiscard}
      onClose={() => setConfirmDiscard(false)}
      title="Discard this promotion?"
      description="What you've entered will be lost."
      secondaryLabel="Keep editing"
      primaryLabel="Discard"
      danger
      onPrimary={() => { setConfirmDiscard(false); onClose?.(); }}
    />
    <Modal open={open && !confirmDiscard} onClose={requestClose} title="Create promotion" size="lg" hideFooter closeOnBackdrop={false}>
      <div className="qo">
        <Field label="Promotion name" hint="Customers see this on their order, e.g. “10% off this week”">
          <Input value={f.name} onChange={set("name")} placeholder="10% off this week" maxLength={200} />
        </Field>

        <Section n="1" title="What do customers get?">
          <Field label="On what?">
            <Choice label="On what" options={ON} value={f.on} onChange={setOn} />
          </Field>
          {f.on !== "order" && f.what !== "bulk" ? (
            <Field
              label={f.on === "item" ? "Items" : "Services"}
              hint={f.on === "item" ? "The discount applies to every piece of these items" : "The discount applies to every item in these services. Add-ons are not included"}
            >
              <CatalogMultiSelect
                options={catalog[f.on]}
                selectedIds={f.targetIds}
                onChange={(ids) => setF((prev) => ({ ...prev, targetIds: ids }))}
                placeholder={f.on === "item" ? "Search items, e.g. Shirt…" : "Choose services…"}
              />
            </Field>
          ) : null}
          <Choice label="Discount type" options={WHAT(f.on)} value={f.what} onChange={setWhat} />
          {f.what === "bulk" ? (
            <BulkDealsEditor deals={f.deals} onChange={(deals) => setF((p) => ({ ...p, deals }))} api={dealsApi} />
          ) : (
          <div className="qo-row">
            <Field label={f.what === "percent" ? "% off" : f.on === "order" ? "£ off" : "£ off each item"}>
              <Input type="number" min="0" step={f.what === "percent" ? "1" : "0.5"} value={f.value} onChange={set("value")} placeholder={f.what === "percent" ? "10" : "5"} />
            </Field>
            {f.what === "percent" ? (
              <Field label="Up to (£)" hint="Optional. Most it can take off one order">
                <Input type="number" min="0" step="0.5" value={f.maxOff} onChange={set("maxOff")} placeholder="No limit" />
              </Field>
            ) : null}
            <Field label="Laundry total over (£)" hint="Optional. Service fee not included">
              <Input type="number" min="0" step="0.5" value={f.minOrder} onChange={set("minOrder")} placeholder="Any order" />
            </Field>
          </div>
          )}
          {f.on === "order" ? (
            <div className="qo-needs">
              <label className="qo-check">
                <input
                  type="checkbox"
                  checked={f.needs}
                  onChange={(e) => setF((p) => ({ ...p, needs: e.target.checked, needServiceIds: [], needItemIds: [] }))}
                />
                Only if the order includes…
              </label>
              {f.needs ? (
                <div className="qo-deal__row qo-deal__row--what">
                  <Field label="Service">
                    <CatalogMultiSelect
                      options={catalog.service}
                      selectedIds={f.needServiceIds}
                      onChange={(ids) => setF((p) => {
                        const keep = new Set(ids.map(String));
                        return {
                          ...p,
                          needServiceIds: ids,
                          needItemIds: p.needItemIds.filter((id) => keep.has(catalog.item.find((o) => o.value === String(id))?.serviceId)),
                        };
                      })}
                      placeholder="Choose services…"
                    />
                  </Field>
                  <Field label="Items" hint={f.needServiceIds.length ? "Optional. Empty = anything from these services" : "Choose a service first"}>
                    {f.needServiceIds.length ? (
                      <CatalogMultiSelect
                        options={itemsInServices(f.needServiceIds)}
                        selectedIds={f.needItemIds}
                        onChange={(ids) => setF((p) => ({ ...p, needItemIds: ids }))}
                        placeholder="Search items, e.g. Duvet…"
                        emptyText="No items in these services yet. Add them in Service Management."
                      />
                    ) : (
                      <Input disabled placeholder="Choose a service first" aria-label="Items" />
                    )}
                  </Field>
                </div>
              ) : null}
            </div>
          ) : null}
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

        <Section n="3" title="When? (UK time, 24-hour)">
          <div className="qo-when">
            <Field label="Starts">
              <Input type="date" value={f.startDate} onChange={set("startDate")} />
            </Field>
            <Field label="Start time" hint="Optional. Empty = 00:00">
              <TimeInput24 value={f.startTime} onChange={(v) => setF((p) => ({ ...p, startTime: v }))} aria-label="Start time" />
            </Field>
            <Field label="Ends" hint="Optional. Empty = runs until you pause it">
              <Input type="date" value={f.endDate} min={f.startDate || undefined} onChange={set("endDate")} />
            </Field>
            <Field label="End time" hint="Optional. Empty = 23:59">
              <TimeInput24 value={f.endTime} onChange={(v) => setF((p) => ({ ...p, endTime: v }))} aria-label="End time" disabled={!f.endDate} />
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
          <p className="qo-note">Orders booked while the promotion is on always get the full discount.</p>
        </Section>

        <div className="qo-summary" aria-live="polite">{summary}</div>
        {error ? <p className="qo-error" role="alert">{error}</p> : null}

        <div className="qo-foot">
          <Button
            variant="ghost"
            onClick={() => onMoreOptions?.(quickOfferToPreset(f))}
            disabled={busy}
          >
            More options…
          </Button>
          <span className="qo-foot__sp" />
          <Button variant="secondary" onClick={() => save(false)} disabled={busy}>Save as draft</Button>
          <Button onClick={() => save(true)} disabled={busy}>{busy ? "Saving…" : "Save & go live"}</Button>
        </div>
      </div>
    </Modal>
    </>
  );
}
