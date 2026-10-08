import { useState } from "react";
import dayjs from "dayjs";
import { Modal, Field, Textarea } from "../../../design-system";
import useToaster from "../../../components/ui/Toaster";
import { useGetOrderPromotionsQuery, useRemoveOrderPromotionMutation } from "../../../store/services/api";

const STATUS = {
  RESERVED: { label: "Holding", tone: "bg-blue-50 text-blue-700" },
  COMMITTED: { label: "Paid", tone: "bg-green-50 text-green-700" },
  RELEASED: { label: "Released", tone: "bg-gray-100 text-gray-600" },
  REVERSED: { label: "Refunded", tone: "bg-amber-50 text-amber-700" },
};

/**
 * Promotions on this order: the discount lines on the invoice and every hold/use in the
 * ledger. An admin can take a promotion off an order that is not paid yet.
 */
export default function OrderPromotionsCard({ bookingId, currencySymbol = "£", onChanged }) {
  const { error: showError, success } = useToaster();
  const { data, isLoading } = useGetOrderPromotionsQuery(bookingId, { skip: !bookingId });
  const [removePromotion, { isLoading: removing }] = useRemoveOrderPromotionMutation();
  const [target, setTarget] = useState(null);
  const [reason, setReason] = useState("");
  const promos = data?.data;
  const money = (n) => `${currencySymbol}${Number(n || 0).toFixed(2)}`;

  if (isLoading || !promos || (!promos.ledger.length && !promos.applied.length)) return null;

  const appliedById = new Map(promos.applied.map((a) => [a.promotionId, a]));
  // Latest ledger row per promotion is its current state on this order.
  const latest = new Map();
  for (const row of promos.ledger) latest.set(row.promotionId, row);

  const confirmRemove = async () => {
    try {
      await removePromotion({ bookingId, promotionId: target.promotionId, reason }).unwrap();
      success("Promotion removed from this order");
      setTarget(null);
      setReason("");
      onChanged?.();
    } catch (err) {
      showError(err?.data?.message || "Could not remove the promotion");
    }
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-gray-500 m-0">Promotions</p>
        {promos.total > 0 && <strong className="text-sm">−{money(promos.total)}</strong>}
      </div>
      <ul className="space-y-2 m-0 p-0 list-none">
        {[...latest.values()].map((row) => {
          const st = STATUS[row.status] || { label: row.status, tone: "bg-gray-100 text-gray-600" };
          const applied = appliedById.get(row.promotionId);
          return (
            <li key={row.promotionId} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="m-0 font-medium text-gray-900 truncate">{row.name || `Promotion #${row.promotionId}`}</p>
                <p className="m-0 text-xs text-gray-500">
                  {row.couponCode ? <span className="font-mono">{row.couponCode}</span> : "Automatic"}
                  {row.committedAt ? ` · paid ${dayjs(row.committedAt).format("DD MMM HH:mm")}` : ""}
                  {row.reason && row.status !== "COMMITTED" ? ` · ${row.reason}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${st.tone}`}>{st.label}</span>
                <span className="tabular-nums w-16 text-right">
                  {applied ? `−${money(applied.amount)}` : row.discount ? `−${money(row.discount)}` : "—"}
                </span>
                {row.status === "RESERVED" && (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline"
                    onClick={() => setTarget(row)}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-[11px] text-gray-500">
        Holding = booked, decided on the invoice. Promotions on a paid order can only be undone with a refund.
      </p>

      <Modal
        open={!!target}
        onClose={() => setTarget(null)}
        title="Remove promotion from this order?"
        primaryLabel={removing ? "Removing…" : "Remove"}
        onPrimary={confirmRemove}
        primaryDisabled={removing}
        danger
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-700 m-0">
            <strong>{target?.name}</strong> will no longer apply to this order and the invoice will be re-priced.
          </p>
          <Field label="Reason (saved in the audit log)">
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Customer not eligible" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
