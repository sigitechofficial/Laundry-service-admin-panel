import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Button, Field, Input, Modal, Select } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import {
  useCreatePromotionMutation, usePublishPromotionMutation, useGetAllServicesQuery, useGetSubCategoriesQuery,
} from "../../store/services/api";
import CatalogMultiSelect from "./CatalogMultiSelect";
import "./quickOffer.css";

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
// "On what?" → promotion type and what it targets.
const ON_TYPE = {
  order: { benefitType: "basket_discount", targetType: "basket" },
  service: { benefitType: "service_discount", targetType: "service" },
  item: { benefitType: "item_discount", targetType: "subCategory" },
};

/** Catalog API responses come in a few shapes. */
function listOf(response, ...keys) {
  const root = response?.data ?? response;
  for (const k of keys) if (Array.isArray(root?.[k])) return root[k];
  return Array.isArray(root) ? root : [];
}
const WHO = [
  { value: "everyone", label: "Everyone" },
  { value: "code", label: "Customers with a code" },
  { value: "first", label: "New customers (first order)" },
];

/** One bulk deal row: these items, this many pieces, for this price. */
const newDeal = () => ({ itemIds: [], qty: "10", price: "" });

const INITIAL = () => ({
  name: "",
  on: "order",
  targetIds: [],
  what: "percent",
  value: "",
  deals: [newDeal()],
  onlyService: "",
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

/** What a deal's pieces normally cost (cheapest chosen item, as the deal groups the cheapest first). */
function dealNormal(deal, priceOf) {
  const prices = deal.itemIds.map(priceOf).filter((p) => p > 0);
  const q = num(deal.qty);
  return prices.length && q ? Math.min(...prices) * q : null;
}

/** Plain-words line of what the admin is making. */
function summaryOf(f, { targetNames, nameOf, priceOf, serviceName }) {
  if (f.what === "bulk") {
    const ready = f.deals.filter((d) => d.itemIds.length && num(d.price));
    if (!ready.length) return "Add your deals: items, how many pieces, and the price.";
    const parts = ready.map((d) => {
      const names = d.itemIds.map(nameOf).filter(Boolean).join(" or ");
      const normal = dealNormal(d, priceOf);
      return `${num(d.qty) || "N"} ${names} for ${money(d.price)}${normal != null ? ` (normally ${money(normal)})` : ""}`;
    });
    const where = serviceName ? ` in ${serviceName}` : "";
    const own = ready.length > 1 ? " Each deal counts only its own items." : "";
    return `${parts.join("; ")}${where}. Extra pieces are at the normal price.${own}`;
  }
  if (!num(f.value)) return "Choose what customers get.";
  const names = targetNames.length > 3 ? `${targetNames.slice(0, 3).join(", ")} and ${targetNames.length - 3} more` : targetNames.join(", ");
  // e.g. "Shirt, Trousers" / "Dry Clean items"
  const target = f.on === "item" ? (names || "the chosen items")
    : f.on === "service" ? (names ? `${names} items` : "items in the chosen services") : "";
  const off = f.on === "order"
    ? (f.what === "percent" ? `${num(f.value)}% off the order` : `${money(f.value)} off the order`)
    : (f.what === "percent" ? `${num(f.value)}% off ${target}` : `${money(f.value)} off each piece of ${target}`);
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
  if (f.what === "bulk") {
    for (const [i, d] of f.deals.entries()) {
      const n = f.deals.length > 1 ? `Deal ${i + 1}: ` : "";
      if (!d.itemIds.length) return `${n}choose at least one item`;
      const q = num(d.qty);
      if (!Number.isInteger(q) || q < 2 || q > 1000) return `${n}pieces must be a whole number from 2 to 1000`;
      if (!(num(d.price) > 0)) return `${n}enter the price for these pieces`;
    }
  } else {
    if (f.on !== "order" && !f.targetIds.length) return f.on === "item" ? "Choose at least one item" : "Choose at least one service";
    const v = num(f.value);
    if (!v || v <= 0) return f.what === "percent" ? "Enter the % off" : "Enter the £ off";
    if (f.what === "percent" && v > 100) return "% off can't be more than 100";
  }
  if (f.who === "code" && !/^[A-Z0-9_-]{3,30}$/i.test(f.code.trim())) return "Enter a code: 3–30 letters or numbers";
  if (f.endDate && f.startDate && f.endDate < f.startDate) return "The end date is before the start date";
  if (num(f.budget) != null && num(f.budget) <= 0) return "Budget must be more than £0, or left empty";
  if (num(f.totalUses) != null && !(Number.isInteger(num(f.totalUses)) && num(f.totalUses) >= 1)) return "Total orders must be a whole number";
  if (num(f.perCustomer) != null && !(Number.isInteger(num(f.perCustomer)) && num(f.perCustomer) >= 1)) return "Uses per customer must be a whole number";
  return null;
}

/** Quick answers → the full promotion payload (and the full form's preset for "More options"). */
export function quickOfferToPreset(f) {
  const bulk = f.what === "bulk";
  const first = f.deals[0] || newDeal();
  return {
    name: f.name.trim(),
    ...ON_TYPE[f.on],
    // Bulk: the offer's items are every deal's items; the first deal fills the single-deal fields.
    ...(bulk ? { benefitType: "bundle", bundleQuantity: first.qty } : {}),
    targetIds: f.on === "order" ? [] : bulk ? [...new Set(f.deals.flatMap((d) => d.itemIds))] : f.targetIds,
    discountMode: bulk ? "amount" : f.what,
    discountValue: bulk ? first.price : f.value,
    maxDiscountCap: f.what === "percent" ? f.maxOff : "",
    minSubtotal: bulk ? "" : f.minOrder,
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
  const { bundleQuantity, ...rest } = p;
  return {
    ...rest,
    benefitConfig: f.what === "bulk"
      ? {
        bundleQuantity: num(bundleQuantity),
        deals: f.deals.map((d) => ({ itemIds: d.itemIds.map(Number), quantity: num(d.qty), price: num(d.price) })),
        ...(f.onlyService ? { onlyServiceIds: [Number(f.onlyService)] } : {}),
      }
      : null,
    discountValue: num(p.discountValue),
    maxDiscountCap: num(p.maxDiscountCap),
    minSubtotal: num(p.minSubtotal),
    targetIds: p.targetIds.length ? p.targetIds.map(Number) : null,
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
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const openedRef = useRef("");
  const [createPromotion, { isLoading: creating }] = useCreatePromotionMutation();
  const [publishPromotion, { isLoading: publishing }] = usePublishPromotionMutation();
  const busy = creating || publishing;

  useEffect(() => {
    if (open) {
      const start = INITIAL();
      openedRef.current = JSON.stringify(start);
      setF(start);
      setError(null);
      setConfirmDiscard(false);
    }
  }, [open]);

  const set = (k) => (e) => setF((prev) => ({ ...prev, [k]: e?.target ? e.target.value : e }));
  const { data: servicesResp } = useGetAllServicesQuery(undefined, { skip: !open || (f.on !== "service" && f.what !== "bulk") });
  const { data: itemsResp } = useGetSubCategoriesQuery(undefined, { skip: !open || f.on !== "item" });
  const catalog = useMemo(() => {
    const opt = (list) => list.map((x) => ({
      value: String(x.id ?? x._id),
      label: x.name ?? x.serviceName ?? x.subCategoryName ?? x.title ?? `#${x.id}`,
      price: x.price,
    }));
    return {
      service: opt(listOf(servicesResp, "services", "data")),
      item: opt(listOf(itemsResp, "subCategories", "subCat", "data")),
    };
  }, [servicesResp, itemsResp]);
  const targetNames = useMemo(() => {
    const opts = catalog[f.on] || [];
    return f.targetIds.map((id) => opts.find((o) => o.value === String(id))?.label).filter(Boolean);
  }, [catalog, f.on, f.targetIds]);
  const itemById = useMemo(() => new Map(catalog.item.map((o) => [o.value, o])), [catalog]);
  const nameOf = useCallback((id) => itemById.get(String(id))?.label, [itemById]);
  const priceOf = useCallback((id) => Number(itemById.get(String(id))?.price), [itemById]);
  const serviceName = f.onlyService ? catalog.service.find((o) => o.value === String(f.onlyService))?.label : null;
  const summary = useMemo(
    () => summaryOf(f, { targetNames, nameOf, priceOf, serviceName }),
    [f, targetNames, nameOf, priceOf, serviceName]
  );
  // Bulk price is for chosen items only: switching away from items drops it.
  const setOn = (on) => setF((prev) => ({
    ...prev, on, targetIds: [], what: prev.what === "bulk" && on !== "item" ? "percent" : prev.what,
  }));
  const setDeal = (i, patch) => setF((prev) => ({ ...prev, deals: prev.deals.map((d, j) => (j === i ? { ...d, ...patch } : d)) }));
  const addDeal = () => setF((prev) => ({ ...prev, deals: [...prev.deals, newDeal()] }));
  const removeDeal = (i) => setF((prev) => ({ ...prev, deals: prev.deals.filter((_, j) => j !== i) }));

  const save = async (goLive) => {
    let err = validate(f);
    if (!err && f.what === "bulk") {
      // A deal must be cheaper than buying the pieces normally.
      f.deals.some((d, i) => {
        const normal = dealNormal(d, priceOf);
        if (normal == null || num(d.price) < normal) return false;
        err = `${f.deals.length > 1 ? `Deal ${i + 1}: ` : ""}the price must be less than the normal ${money(normal)}`;
        return true;
      });
    }
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
      title="Discard this offer?"
      description="What you've entered will be lost."
      secondaryLabel="Keep editing"
      primaryLabel="Discard"
      danger
      onPrimary={() => { setConfirmDiscard(false); onClose?.(); }}
    />
    <Modal open={open && !confirmDiscard} onClose={requestClose} title="Create offer" size="lg" hideFooter closeOnBackdrop={false}>
      <div className="qo">
        <Field label="Offer name" hint="Customers see this on their order, e.g. “10% off this week”">
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
          <Choice label="Discount type" options={WHAT(f.on)} value={f.what} onChange={set("what")} />
          {f.what === "bulk" ? (
            <div className="qo-deals">
              {f.deals.map((d, i) => {
                // An item can be in one deal only: other deals' items are not offered here.
                const taken = new Set(f.deals.flatMap((x, j) => (j === i ? [] : x.itemIds.map(String))));
                const normal = dealNormal(d, priceOf);
                return (
                  <div className="qo-deal" key={i}>
                    <div className="qo-deal__h">
                      <span className="qo-deal__n">Deal {i + 1}</span>
                      {f.deals.length > 1 ? (
                        <button type="button" className="qo-deal__rm" onClick={() => removeDeal(i)} aria-label={`Remove deal ${i + 1}`}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                    <div className="qo-deal__row">
                      <Field label="Items">
                        <CatalogMultiSelect
                          options={catalog.item.filter((o) => !taken.has(o.value))}
                          selectedIds={d.itemIds}
                          onChange={(ids) => setDeal(i, { itemIds: ids })}
                          placeholder="Search items, e.g. T-Shirt…"
                        />
                      </Field>
                      <Field label="Pieces">
                        <Input type="number" min="2" step="1" value={d.qty} onChange={(e) => setDeal(i, { qty: e.target.value })} placeholder="10" />
                      </Field>
                      <Field
                        label="For (£)"
                        hint={normal != null ? `Normally ${money(normal)}${num(d.price) ? ` · saves ${money(normal - num(d.price))}` : ""}` : undefined}
                      >
                        <Input type="number" min="0" step="0.5" value={d.price} onChange={(e) => setDeal(i, { price: e.target.value })} placeholder="30" />
                      </Field>
                    </div>
                  </div>
                );
              })}
              <div>
                <Button variant="secondary" onClick={addDeal} disabled={f.deals.length >= 20}>+ Add another deal</Button>
              </div>
              <div className="qo-row">
                <Field label="In which service?" hint="Optional. Any = pieces count in every service">
                  <Select
                    value={f.onlyService}
                    onChange={(v) => setF((p) => ({ ...p, onlyService: v ?? "" }))}
                    options={[{ value: "", label: "Any service" }, ...catalog.service]}
                  />
                </Field>
              </div>
            </div>
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
            <Field label="Orders over (£)" hint="Optional">
              <Input type="number" min="0" step="0.5" value={f.minOrder} onChange={set("minOrder")} placeholder="Any order" />
            </Field>
          </div>
          )}
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
          <Button
            variant="ghost"
            onClick={() => onMoreOptions?.(quickOfferToPreset(f))}
            disabled={busy || (f.what === "bulk" && f.deals.length > 1)}
            title={f.what === "bulk" && f.deals.length > 1 ? "Offers with several deals are made here" : undefined}
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
