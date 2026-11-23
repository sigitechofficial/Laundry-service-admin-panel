import { useState } from "react";
import { Button, Field, Input, Modal, Select } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { useSimulatePromotionMutation } from "../../store/services/api";
import { useServiceItemCatalog } from "./BulkDealsEditor";
import { useCurrencyUnits, useMasterCatalogMoney } from "../../hooks/useCurrency";
import { formatMoney, labelWithCurrency, zoneDisplayCurrency } from "../../utilities/formatters";

const INITIAL = () => ({ zoneId: "", subtotal: "", deliveryFee: "", couponCode: "", customerId: "", items: [{ itemId: "", qty: "1" }] });

/**
 * What-if simulator — POST /promotions/simulate. With items, the server prices them for the zone
 * exactly like checkout, so item / service / bulk promotions are tested too; without items it uses
 * a raw subtotal.
 * Shows which promotions would apply, which were rejected (and why), and coupon errors.
 */
export default function PromotionSimulateModal({ open, onClose, zones = [] }) {
  const toast = useToaster();
  const [form, setForm] = useState(INITIAL());
  const [result, setResult] = useState(null);
  const [simulate, { isLoading }] = useSimulatePromotionMutation();

  const setField = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));
  const { catalog } = useServiceItemCatalog(open);
  // Item prices are catalogue prices (no zone); the basket is in the chosen zone's currency.
  const catalogMoney = useMasterCatalogMoney();
  const { units: currencyUnits, symbolOf } = useCurrencyUnits();
  const zoneCurrency = zoneDisplayCurrency(
    zones.find((z) => String(z.id ?? z._id) === String(form.zoneId)),
    currencyUnits
  );
  // Results: the basket currency the server priced in, else the zone's.
  const resultSymbol = result?.currency ? symbolOf(result.currency) : zoneCurrency.symbol;
  const money = (n) => formatMoney(Number(n) || 0, resultSymbol);
  const itemOptions = catalog.item.map((o) => ({
    value: o.value,
    label: `${o.label}${o.serviceLabel ? ` · ${o.serviceLabel}` : ""}${Number(o.price) > 0 ? ` · ${catalogMoney(o.price)}` : ""}`,
  }));
  const setItem = (i, patch) => setForm((prev) => ({ ...prev, items: prev.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));
  const chosenItems = form.items.filter((it) => it.itemId);
  const zoneOptions = zones.map((z) => ({ value: String(z.id ?? z._id), label: z.name ?? z.zoneName ?? `Zone ${z.id}` }));

  const handleClose = () => { setResult(null); onClose(); };

  const run = async () => {
    if (!form.zoneId) return toast.error("Select a zone");
    const subtotal = Number(form.subtotal);
    if (!chosenItems.length && (form.subtotal === "" || !Number.isFinite(subtotal) || subtotal < 0)) {
      return toast.error("Add items, or enter a basket subtotal");
    }
    if (chosenItems.some((it) => !(Number.isInteger(Number(it.qty)) && Number(it.qty) >= 1))) return toast.error("Quantity must be 1 or more");
    const body = {
      zoneId: Number(form.zoneId),
      ...(form.customerId ? { customerId: Number(form.customerId) } : {}),
      // Items are priced by the server for this zone, like checkout; otherwise a raw subtotal.
      ...(chosenItems.length
        ? { items: chosenItems.map((it) => ({ subCategoryId: Number(it.itemId), qty: Number(it.qty) })) }
        : { basket: { subtotal, deliveryFee: form.deliveryFee === "" ? 0 : Number(form.deliveryFee), lineItems: [] } }),
      ...(form.couponCode.trim() ? { couponCodes: [form.couponCode.trim().toUpperCase()] } : {}),
    };
    try {
      const res = await simulate(body).unwrap();
      setResult(res?.data ?? res);
    } catch (err) {
      toast.error(err?.data?.message || "Simulation failed");
    }
  };

  const applied = result?.applied || [];
  const rejected = result?.rejected || [];
  const couponErrors = result?.couponErrors || [];

  return (
    <Modal open={open} onClose={handleClose} title="Simulate promotions" size="lg" hideFooter>
      <div className="space-y-4 p-4">
        <p className="text-xs text-gray-500">
          Add items to test item, service and bulk promotions with real prices for the zone. Without items, the
          basket subtotal is used and only whole-order promotions can match.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Zone *">
            <Select options={zoneOptions} value={form.zoneId} onChange={(v) => setField("zoneId", v)} placeholder="Select zone" />
          </Field>
          <Field label="Customer ID" hint="Optional — evaluates customer conditions & limits">
            <Input type="number" min="1" value={form.customerId} onChange={(e) => setField("customerId", e.target.value)} placeholder="e.g. 123" />
          </Field>
          <Field label={`${labelWithCurrency("Basket subtotal", zoneCurrency.symbol)} *`}>
            <Input type="number" min="0" step="0.01" value={form.subtotal} onChange={(e) => setField("subtotal", e.target.value)} placeholder="e.g. 45.00" />
          </Field>
          <Field label={labelWithCurrency("Delivery fee", zoneCurrency.symbol)}>
            <Input type="number" min="0" step="0.01" value={form.deliveryFee} onChange={(e) => setField("deliveryFee", e.target.value)} placeholder="e.g. 3.99" />
          </Field>
          <Field label="Coupon code">
            <Input value={form.couponCode} onChange={(e) => setField("couponCode", e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Items" hint="Optional. Pick items and how many; the subtotal above is then not needed">
          <div className="space-y-2">
            {form.items.map((it, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex-1">
                  <Select options={itemOptions} value={it.itemId} onChange={(v) => setItem(i, { itemId: v ?? "" })} placeholder="Choose an item" aria-label={`Item ${i + 1}`} />
                </div>
                <Input type="number" min="1" step="1" value={it.qty} onChange={(e) => setItem(i, { qty: e.target.value })} aria-label={`Quantity ${i + 1}`} style={{ width: 90 }} />
                {form.items.length > 1 ? (
                  <Button variant="secondary" onClick={() => setField("items", form.items.filter((_, j) => j !== i))} aria-label={`Remove item ${i + 1}`}>✕</Button>
                ) : null}
              </div>
            ))}
            <Button variant="secondary" onClick={() => setField("items", [...form.items, { itemId: "", qty: "1" }])}>+ Add item</Button>
          </div>
        </Field>
        <div className="flex justify-end gap-3">
          <Button onClick={run} disabled={isLoading}>{isLoading ? "Running…" : "Run simulation"}</Button>
        </div>

        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs">Subtotal</div><strong>{money(result.subtotal)}</strong></div>
              <div className="bg-green-50 rounded-lg p-3"><div className="text-gray-500 text-xs">Total saving</div><strong className="text-green-700">{money(result.totalSaving)}</strong></div>
              <div className="bg-gray-50 rounded-lg p-3"><div className="text-gray-500 text-xs">Final subtotal</div><strong>{money(result.finalSubtotal)}</strong></div>
            </div>
            {Number(result.cashbackAmount) > 0 && (
              <p className="text-sm text-gray-700">Cashback: <strong>{money(result.cashbackAmount)}</strong></p>
            )}

            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-1">Applied ({applied.length})</h4>
              {applied.length ? (
                <ul className="space-y-1 text-sm">
                  {applied.map((a) => (
                    <li key={a.promotionId} className="flex justify-between bg-green-50 rounded-md px-3 py-2">
                      <span>{a.promotionName}{a.couponCode ? ` (${a.couponCode})` : ""}</span>
                      <strong className="text-green-700">
                        -{money(a.totalSaving)}{Number(a.cashbackAmount) > 0 ? ` · ${money(a.cashbackAmount)} cashback` : ""}
                      </strong>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-xs text-gray-500">No promotions apply to this basket.</p>}
            </div>

            {rejected.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Rejected ({rejected.length})</h4>
                <ul className="space-y-1 text-sm">
                  {rejected.map((r) => (
                    <li key={r.promotionId} className="bg-gray-50 rounded-md px-3 py-2">
                      <div className="font-medium">{r.promotionName}</div>
                      <ul className="text-xs text-gray-600 list-disc ml-4">
                        {(r.reasons || []).map((reason, i) => (
                          <li key={i}>{reason.reason || reason.type}{reason.code ? ` (${reason.code})` : ""}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {couponErrors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Coupon errors</h4>
                <ul className="space-y-1 text-sm">
                  {couponErrors.map((c, i) => (
                    <li key={`${c.code}-${i}`} className="bg-red-50 text-red-700 rounded-md px-3 py-2">
                      <strong>{c.code}</strong>: {c.message || c.error}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
