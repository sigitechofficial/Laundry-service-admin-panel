/**
 * Admin controls for how new work reaches a shop.
 *
 * Kept separate from Block / Delete: blocking stops login, these switches
 * only change what the assignment engine offers the shop.
 */
import { useEffect, useState } from "react";
import { Button, Field, Input, Textarea } from "../../design-system";
import { Toggle } from "../misc-kit";
import useToaster from "../../components/ui/Toaster";
import {
  useGetShopAssignmentPolicyQuery,
  useUpdateShopAssignmentPolicyMutation,
} from "../../store/services/api";

const CARD = {
  padding: 16,
  border: "1px solid #e6e9f0",
  borderRadius: 16,
  background: "#fff",
  boxShadow: "0 1px 2px rgba(16, 21, 31, 0.04)",
};

const HINT = {
  margin: "4px 0 0",
  fontSize: 13,
  color: "var(--muted)",
  lineHeight: 1.5,
};

/** `2026-09-01T10:00:00.000Z` → `2026-09-01T10:00` for datetime-local. */
function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTime() - date.getTimezoneOffset() * 60000;
  return new Date(offsetMs).toISOString().slice(0, 16);
}

export default function ShopRoutingPolicyCard({ shopUserId }) {
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError } = useGetShopAssignmentPolicyQuery(shopUserId, {
    skip: !shopUserId,
  });
  const [updatePolicy, { isLoading: saving }] =
    useUpdateShopAssignmentPolicyMutation();

  const policy = data?.data ?? data;

  const [preferredEligible, setPreferredEligible] = useState(true);
  const [marketplaceHold, setMarketplaceHold] = useState(false);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [acceptCapOverride, setAcceptCapOverride] = useState(false);
  const [acceptWindowMinutes, setAcceptWindowMinutes] = useState("60");
  const [acceptMaxOrders, setAcceptMaxOrders] = useState("4");

  useEffect(() => {
    if (!policy) return;
    setPreferredEligible(policy.preferredEligible !== false);
    setMarketplaceHold(Boolean(policy.marketplaceHold));
    setReason(policy.reason || "");
    setExpiresAt(toDateTimeLocal(policy.expiresAt));
    setAcceptCapOverride(Boolean(policy.acceptCapOverride));
    setAcceptWindowMinutes(
      String(policy.acceptWindowMinutes != null ? policy.acceptWindowMinutes : 60)
    );
    setAcceptMaxOrders(
      String(policy.acceptMaxOrders != null ? policy.acceptMaxOrders : 4)
    );
  }, [policy]);

  const restricted = !preferredEligible || marketplaceHold;

  const handleSave = async () => {
    if (restricted && !reason.trim()) {
      showError("Add a reason before restricting this shop");
      return;
    }

    let windowMins = Number(acceptWindowMinutes);
    let maxOrders = Number(acceptMaxOrders);
    if (acceptCapOverride) {
      if (!Number.isInteger(windowMins) || windowMins < 1 || windowMins > 1440) {
        showError("Accept window must be between 1 and 1440 minutes");
        return;
      }
      if (!Number.isInteger(maxOrders) || maxOrders < 0 || maxOrders > 500) {
        showError("Max accepts must be between 0 and 500 (0 = none)");
        return;
      }
    }

    try {
      await updatePolicy({
        shopUserId,
        preferredEligible,
        marketplaceHold,
        reason: restricted ? reason.trim() : null,
        expiresAt: restricted && expiresAt ? new Date(expiresAt).toISOString() : null,
        acceptCapOverride,
        acceptWindowMinutes: acceptCapOverride ? windowMins : null,
        acceptMaxOrders: acceptCapOverride ? maxOrders : null,
      }).unwrap();
      success("Order routing updated");
    } catch (err) {
      showError(err?.data?.message || "Could not update order routing");
    }
  };

  if (!shopUserId) return null;

  return (
    <div style={CARD}>
      <strong>Order routing</strong>
      <p style={HINT}>
        Controls what the assignment engine offers this shop. Blocking the
        account is separate and stops login entirely.
      </p>

      {isLoading ? (
        <p style={HINT}>Loading…</p>
      ) : isError ? (
        <p style={{ ...HINT, color: "var(--danger)" }}>
          Could not load routing settings for this shop.
        </p>
      ) : (
        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <Toggle
              checked={preferredEligible}
              onChange={(e) => setPreferredEligible(e.target.checked)}
              label="Eligible for preferred routing"
            />
            <p style={HINT}>
              When off, returning customers who last used this shop are offered
              their previous shop instead. It can still pick up broadcast orders.
            </p>
          </div>

          <div>
            <Toggle
              checked={!marketplaceHold}
              onChange={(e) => setMarketplaceHold(!e.target.checked)}
              label="Receive new marketplace offers"
            />
            <p style={HINT}>
              When off, this shop gets no new orders at all. Orders already
              accepted continue, and an admin can still assign manually.
            </p>
          </div>

          <div
            style={{
              paddingTop: 8,
              borderTop: "1px solid var(--line, #e6e9f0)",
            }}
          >
            <Toggle
              checked={acceptCapOverride}
              onChange={(e) => setAcceptCapOverride(e.target.checked)}
              label="Custom accept capacity for this shop"
            />
            <p style={HINT}>
              Override the global Runtime checks limit. Example: only 1 order
              per hour, or 0 (this shop skipped; others still get the offer).
              Leave off to inherit the all-shops setting.
            </p>
            {acceptCapOverride ? (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <Field
                  label="Window (minutes)"
                  htmlFor="shop-accept-window"
                  hint="Rolling lookback, e.g. 60 = last hour."
                >
                  <Input
                    id="shop-accept-window"
                    type="number"
                    min={1}
                    max={1440}
                    value={acceptWindowMinutes}
                    onChange={(e) => setAcceptWindowMinutes(e.target.value)}
                  />
                </Field>
                <Field
                  label="Max accepts"
                  htmlFor="shop-accept-max"
                  hint="0 = cannot accept via marketplace."
                >
                  <Input
                    id="shop-accept-max"
                    type="number"
                    min={0}
                    max={500}
                    value={acceptMaxOrders}
                    onChange={(e) => setAcceptMaxOrders(e.target.value)}
                  />
                </Field>
              </div>
            ) : null}
          </div>

          {restricted && (
            <>
              <Field
                label="Reason"
                htmlFor="shop-routing-reason"
                hint="Required. Shown in the audit trail so ops know why this shop was restricted."
              >
                <Textarea
                  id="shop-routing-reason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. repeated late pickups reported by customers"
                />
              </Field>

              <Field
                label="Expires at (optional)"
                htmlFor="shop-routing-expiry"
                hint="Leave empty to keep the restriction until it is cleared manually."
              >
                <Input
                  id="shop-routing-expiry"
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  style={{ maxWidth: 260 }}
                />
              </Field>
            </>
          )}

          <div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save routing settings"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
