import { useCallback, useEffect, useMemo } from "react";
import { Button, Field, Input } from "../../design-system";
import { useGetAllServicesQuery, useGetCategoriesQuery, useGetSubCategoriesQuery } from "../../store/services/api";
import CatalogMultiSelect from "./CatalogMultiSelect";
import "./quickOffer.css";

/**
 * Bulk deals ("10 T-shirts for £30"), shared by Create promotion and the full form, so a deal
 * is made and saved the same way in both: services first, then that service's items, how many
 * pieces, and the price. Stored as benefitConfig.deals = [{ itemIds, serviceIds, quantity, price }].
 */

/** One deal row in a form (strings while typing). */
export const newDeal = () => ({ itemIds: [], serviceIds: [], qty: "10", price: "" });

const num = (v) => (v === "" || v == null ? null : Number(v));
const money = (n) => `£${Number(n).toFixed(2).replace(/\.00$/, "")}`;

function listOf(response, ...keys) {
  const root = response?.data ?? response;
  for (const k of keys) if (Array.isArray(root?.[k])) return root[k];
  return Array.isArray(root) ? root : [];
}

/** Services and items, each item tagged with the service it is cleaned in (item → category → service). */
export function useServiceItemCatalog(enabled = true) {
  const skip = !enabled;
  const { data: servicesResp } = useGetAllServicesQuery(undefined, { skip });
  const { data: itemsResp } = useGetSubCategoriesQuery(undefined, { skip });
  const { data: categoriesResp } = useGetCategoriesQuery(undefined, { skip });
  const catalog = useMemo(() => {
    const opt = (list) => list.map((x) => ({
      value: String(x.id ?? x._id),
      label: x.name ?? x.serviceName ?? x.subCategoryName ?? x.title ?? `#${x.id}`,
      price: x.price,
      categoryId: x.categoryId ?? x.category?.id ?? null,
    }));
    const serviceOfCategory = new Map(
      listOf(categoriesResp, "categories", "data").map((c) => [String(c.id), String(c.serviceId ?? c.service?.id ?? "")])
    );
    const service = opt(listOf(servicesResp, "services", "data"));
    const serviceName = new Map(service.map((s) => [s.value, s.label]));
    const item = opt(listOf(itemsResp, "subCategories", "subCat", "data")).map((o) => {
      const serviceId = serviceOfCategory.get(String(o.categoryId)) || null;
      return { ...o, serviceId, serviceLabel: serviceId ? serviceName.get(serviceId) : null };
    });
    return { service, item, ready: Boolean(itemsResp && categoriesResp) };
  }, [servicesResp, itemsResp, categoriesResp]);

  const itemById = useMemo(() => new Map(catalog.item.map((o) => [o.value, o])), [catalog]);
  /** Items cleaned in these services, named with their service when several are chosen. */
  const itemsInServices = useCallback((serviceIds) => {
    const ids = new Set(serviceIds.map(String));
    return catalog.item
      .filter((o) => o.serviceId && ids.has(o.serviceId))
      .map((o) => (ids.size > 1 && o.serviceLabel ? { ...o, label: `${o.label} · ${o.serviceLabel}` } : o));
  }, [catalog]);
  const nameOf = useCallback((id) => itemById.get(String(id))?.label, [itemById]);
  const priceOf = useCallback((id) => Number(itemById.get(String(id))?.price), [itemById]);
  const serviceOf = useCallback((id) => itemById.get(String(id))?.serviceId || null, [itemById]);
  const serviceNameOf = useCallback((id) => catalog.service.find((o) => o.value === String(id))?.label, [catalog]);
  return { catalog, itemsInServices, nameOf, priceOf, serviceOf, serviceNameOf };
}

/** What a deal's pieces normally cost (cheapest chosen item, as the deal groups the cheapest first). */
export function dealNormal(deal, priceOf) {
  const prices = deal.itemIds.map(priceOf).filter((p) => p > 0);
  const q = num(deal.qty);
  return prices.length && q ? Math.min(...prices) * q : null;
}

/** First problem with the deals, or null. */
export function validateDeals(deals, priceOf) {
  if (!deals.length) return "Add a deal";
  for (const [i, d] of deals.entries()) {
    const n = deals.length > 1 ? `Deal ${i + 1}: ` : "";
    if (!d.serviceIds.length) return `${n}choose a service`;
    if (!d.itemIds.length) return `${n}choose at least one item`;
    const q = num(d.qty);
    if (!Number.isInteger(q) || q < 2 || q > 1000) return `${n}pieces must be a whole number from 2 to 1000`;
    if (!(num(d.price) > 0)) return `${n}enter the price for these pieces`;
    // A deal must be cheaper than buying the pieces normally.
    const normal = priceOf ? dealNormal(d, priceOf) : null;
    if (normal != null && num(d.price) >= normal) return `${n}the price must be less than the normal ${money(normal)}`;
  }
  return null;
}

/** Form rows → what the API stores. */
export const dealsToConfig = (deals) => deals.map((d) => ({
  itemIds: d.itemIds.map(Number), serviceIds: d.serviceIds.map(Number), quantity: num(d.qty), price: num(d.price),
}));

/**
 * A saved promotion → form rows. Older bulk offers kept one deal in the main fields
 * (items in targetIds, pieces in bundleQuantity, price in discountValue): they become one row.
 */
export function dealsFromPromotion(p, config) {
  if (Array.isArray(config?.deals) && config.deals.length) {
    return config.deals.map((d) => ({
      itemIds: (d.itemIds || []).map(String),
      serviceIds: (d.serviceIds || []).map(String),
      qty: d.quantity != null ? String(d.quantity) : "",
      price: d.price != null ? String(Number(d.price)) : "",
    }));
  }
  const items = p.targetType === "subCategory" ? (Array.isArray(p.targetIds) ? p.targetIds : []) : [];
  return [{
    itemIds: items.map(String),
    serviceIds: (config?.onlyServiceIds || []).map(String),
    qty: config?.bundleQuantity != null ? String(config.bundleQuantity) : "10",
    price: p.discountValue != null && p.discountValue !== "" ? String(Number(p.discountValue)) : "",
  }];
}

/** "10 T-Shirt for £30 (normally £45); 5 Trousers (Dry Clean) for £25" */
export function dealsSummary(deals, { nameOf, priceOf, serviceNameOf }) {
  const ready = deals.filter((d) => d.itemIds.length && num(d.price));
  if (!ready.length) return null;
  const parts = ready.map((d) => {
    const names = d.itemIds.map(nameOf).filter(Boolean).join(" or ") || `${d.itemIds.length} items`;
    const services = d.serviceIds.map(serviceNameOf).filter(Boolean).join(" or ");
    const normal = dealNormal(d, priceOf);
    return `${num(d.qty) || "N"} ${names}${services ? ` (${services})` : ""} for ${money(d.price)}${normal != null ? ` (normally ${money(normal)})` : ""}`;
  });
  const own = ready.length > 1 ? " Each deal counts only its own items." : "";
  return `${parts.join("; ")}. Extra pieces are at the normal price.${own}`;
}

export default function BulkDealsEditor({ deals, onChange, api }) {
  const { catalog, itemsInServices, priceOf, serviceOf } = api;
  const setDeal = (i, patch) => onChange(deals.map((d, j) => (j === i ? { ...d, ...patch } : d)));
  // Changing a deal's services drops items that aren't in them any more.
  const setDealServices = (i, serviceIds) => {
    const ids = new Set(serviceIds.map(String));
    setDeal(i, { serviceIds, itemIds: deals[i].itemIds.filter((id) => ids.has(serviceOf(id))) });
  };

  // Older deals saved without a service: fill it in from their items once the catalog is here.
  useEffect(() => {
    if (!catalog.ready || !deals.some((d) => !d.serviceIds.length && d.itemIds.length)) return;
    onChange(deals.map((d) => (d.serviceIds.length || !d.itemIds.length
      ? d
      : { ...d, serviceIds: [...new Set(d.itemIds.map(serviceOf).filter(Boolean))] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.ready]);

  return (
    <div className="qo-deals">
      {deals.map((d, i) => {
        // An item can be in one deal only: other deals' items are not offered here.
        const taken = new Set(deals.flatMap((x, j) => (j === i ? [] : x.itemIds.map(String))));
        const normal = dealNormal(d, priceOf);
        return (
          <div className="qo-deal" key={i}>
            <div className="qo-deal__h">
              <span className="qo-deal__n">Deal {i + 1}</span>
              {deals.length > 1 ? (
                <button type="button" className="qo-deal__rm" onClick={() => onChange(deals.filter((_, j) => j !== i))} aria-label={`Remove deal ${i + 1}`}>
                  Remove
                </button>
              ) : null}
            </div>
            <div className="qo-deal__row qo-deal__row--what">
              {/* Service first: the items list then shows only that service's items. */}
              <Field label="Services">
                <CatalogMultiSelect
                  options={catalog.service}
                  selectedIds={d.serviceIds}
                  onChange={(ids) => setDealServices(i, ids)}
                  placeholder="Choose services…"
                />
              </Field>
              <Field label="Items" hint={d.serviceIds.length ? undefined : "Choose a service first"}>
                {d.serviceIds.length ? (
                  <CatalogMultiSelect
                    options={itemsInServices(d.serviceIds).filter((o) => !taken.has(o.value))}
                    selectedIds={d.itemIds}
                    onChange={(ids) => setDeal(i, { itemIds: ids })}
                    placeholder="Search items, e.g. T-Shirt…"
                    emptyText="No items in these services yet. Add them in Service Management."
                  />
                ) : (
                  <Input disabled placeholder="Choose a service first" aria-label="Items" />
                )}
              </Field>
            </div>
            <div className="qo-deal__row qo-deal__row--price">
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
        <Button variant="secondary" onClick={() => onChange([...deals, newDeal()])} disabled={deals.length >= 20}>+ Add another deal</Button>
      </div>
    </div>
  );
}
