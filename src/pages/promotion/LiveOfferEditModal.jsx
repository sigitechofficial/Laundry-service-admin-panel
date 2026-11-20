import { useEffect, useState } from "react";
import { Field, Input, Modal } from "../../design-system";
import useToaster from "../../components/ui/Toaster";
import { useUpdatePromotionMutation } from "../../store/services/api";
import TimeInput24, { TIME_24, dateWithTime } from "./TimeInput24";
import "./quickOffer.css";

/**
 * Change a live offer without pausing it: name, end date, limits and budget.
 * These never change what an order already booked gets (the API refuses anything else).
 *
 * initial: { id, name, endDate, globalUsageLimit, perCustomerLimit, budget, sharedBudgetName, taken }
 */
const blankToNull = (v) => (v === "" || v == null ? null : Number(v));

export default function LiveOfferEditModal({ offer, onClose }) {
  const toast = useToaster();
  const [f, setF] = useState(null);
  const [error, setError] = useState(null);
  const [updatePromotion, { isLoading }] = useUpdatePromotionMutation();

  useEffect(() => {
    if (offer) {
      setF({
        name: offer.name || "",
        endDate: offer.endDate || "",
        endTime: offer.endTime || "",
        globalUsageLimit: offer.globalUsageLimit ?? "",
        perCustomerLimit: offer.perCustomerLimit ?? "",
        budget: offer.budget ?? "",
      });
      setError(null);
    }
  }, [offer]);

  if (!offer || !f) return null;
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  const shared = Boolean(offer.sharedBudgetName);

  const save = async () => {
    if (!f.name.trim()) { setError("Give the offer a name"); return; }
    if (f.endTime && !TIME_24.test(f.endTime)) { setError("End time: use 24-hour time, e.g. 18:30"); return; }
    if (f.budget !== "" && !(Number(f.budget) > 0)) { setError("Budget must be more than £0, or left empty"); return; }
    const payload = {
      id: offer.id,
      name: f.name.trim(),
      endDate: dateWithTime(f.endDate, f.endTime),
      globalUsageLimit: blankToNull(f.globalUsageLimit),
      perCustomerLimit: blankToNull(f.perCustomerLimit),
      ...(shared ? {} : { budget: blankToNull(f.budget) }),
    };
    try {
      await updatePromotion(payload).unwrap();
      toast.success(`"${payload.name}" updated. It stayed live.`);
      onClose();
    } catch (e) {
      setError(e?.data?.message || "Could not save");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Edit live offer"
      description="It stays live while you change these. To change the discount, who gets it or what it's on, pause it first."
      primaryLabel={isLoading ? "Saving…" : "Save"}
      onPrimary={save}
      primaryDisabled={isLoading}
      secondaryLabel="Cancel"
      size="md"
      closeOnBackdrop={false}
    >
      <div className="qo">
        <Field label="Offer name">
          <Input value={f.name} onChange={set("name")} maxLength={200} />
        </Field>
        <div className="qo-row">
          <Field label="Ends (UK)" hint="Leave empty to run until you pause it">
            <Input type="date" value={f.endDate} onChange={set("endDate")} />
          </Field>
          <Field label="End time" hint="24-hour. Empty = 23:59">
            <TimeInput24 value={f.endTime} onChange={(v) => setF((p) => ({ ...p, endTime: v }))} aria-label="End time" disabled={!f.endDate} />
          </Field>
          <Field label="Budget (£)" hint={shared ? `Uses the shared budget "${offer.sharedBudgetName}"` : "Stops new orders when this much has been given away"}>
            <Input type="number" min="1" step="1" value={shared ? "" : f.budget} onChange={set("budget")} placeholder={shared ? "Shared" : "No limit"} disabled={shared} />
          </Field>
        </div>
        <div className="qo-row">
          <Field label="Total orders" hint={offer.taken ? `${offer.taken} already have it, so not lower than that` : "Stops after this many orders"}>
            <Input type="number" min={Math.max(1, offer.taken || 0)} step="1" value={f.globalUsageLimit} onChange={set("globalUsageLimit")} placeholder="No limit" />
          </Field>
          <Field label="Uses per customer">
            <Input type="number" min="1" step="1" value={f.perCustomerLimit} onChange={set("perCustomerLimit")} placeholder="No limit" />
          </Field>
        </div>
        <p className="qo-note">Orders already booked keep the discount they were shown.</p>
        {error ? <p className="qo-error" role="alert">{error}</p> : null}
      </div>
    </Modal>
  );
}
