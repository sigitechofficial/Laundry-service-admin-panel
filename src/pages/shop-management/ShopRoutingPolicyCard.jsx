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

const USAGE_BOX = {
  marginTop: 12,
  padding: "12px 14px",
  borderRadius: 12,
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
};

/** `2026-09-01T10:00:00.000Z` → `2026-09-01T10:00` for datetime-local. */
function toDateTimeLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = date.getTime() - date.getTimezoneOffset() * 60000;
  return new Date(offsetMs).toISOString().slice(0, 16);
}

/** "2026-10-22" → "Thu 22 Oct" (date only, no timezone shift). */
function formatSlotDay(day) {
  const [y, m, d] = String(day || "").split("-").map(Number);
  if (!y || !m || !d) return String(day || "");
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Slot capacity: per-slot limit and how full the shop's upcoming slots are. */
function SlotCapacityUsage({ capacity }) {
  const slot = capacity?.slotCapacity;
  if (!slot) {
    return (
      <div style={USAGE_BOX}>
        <strong style={{ fontSize: 13 }}>Slot capacity</strong>
        <p style={{ ...HINT, marginTop: 6 }}>Not available for this shop.</p>
      </div>
    );
  }
  const upcoming = Array.isArray(slot.upcoming) ? slot.upcoming : [];
  const fullCount = upcoming.filter((u) => u.full).length;
  return (
    <div
      style={{
        ...USAGE_BOX,
        background: fullCount ? "#fff7ed" : "#f8fafc",
        borderColor: fullCount ? "#fdba74" : "#e2e8f0",
      }}
    >
      <strong style={{ fontSize: 13 }}>Slot capacity</strong>
      <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.45 }}>
        {slot.limit === 0 ? (
          <strong>0 — no marketplace orders (admin can still assign)</strong>
        ) : slot.mode === "single" ? (
          <>
            <strong>1 order</strong> per pickup / delivery slot (capacity off)
          </>
        ) : (
          <>
            Up to <strong>{slot.limit}</strong> pickups + deliveries per slot
            {slot.source === "shop" ? " (this shop's own limit)" : " (all-shops setting)"}
          </>
        )}
      </p>
      {upcoming.length ? (
        <div style={{ marginTop: 10, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 12 }}>
                <th style={{ padding: "4px 6px" }}>Slot</th>
                <th style={{ padding: "4px 6px" }}>Pickups</th>
                <th style={{ padding: "4px 6px" }}>Deliveries</th>
                <th style={{ padding: "4px 6px", textAlign: "right" }}>Used</th>
              </tr>
            </thead>
            <tbody>
              {upcoming.map((u) => (
                <tr key={`${u.date}-${u.from}-${u.to}`} style={{ borderTop: "1px solid #eef0f4" }}>
                  <td style={{ padding: "4px 6px", whiteSpace: "nowrap" }}>
                    {formatSlotDay(u.date)} {u.from}–{u.to}
                  </td>
                  <td style={{ padding: "4px 6px" }}>{u.pickups}</td>
                  <td style={{ padding: "4px 6px" }}>{u.deliveries}</td>
                  <td
                    style={{
                      padding: "4px 6px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: u.full ? "#b45309" : undefined,
                    }}
                  >
                    {u.used} / {u.limit}
                    {u.full ? " · Full" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={HINT}>No pickups or deliveries booked from today.</p>
      )}
      <p style={HINT}>
        A full slot gets no new offers; the order goes to other shops (admin is
        alerted if every shop is full). Other slots and days are not affected.
      </p>
    </div>
  );
}

export default function ShopRoutingPolicyCard({ shopUserId }) {
  const { success, error: showError } = useToaster();
  const { data, isLoading, isError } = useGetShopAssignmentPolicyQuery(shopUserId, {
    skip: !shopUserId,
    pollingInterval: 15000,
  });
  const [updatePolicy, { isLoading: saving }] =
    useUpdateShopAssignmentPolicyMutation();

  const policy = data?.data ?? data;
  const acceptCapacity = policy?.acceptCapacity ?? null;

  const [preferredEligible, setPreferredEligible] = useState(true);
  const [marketplaceHold, setMarketplaceHold] = useState(false);
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [acceptCapOverride, setAcceptCapOverride] = useState(false);
  const [acceptMaxOrders, setAcceptMaxOrders] = useState("4");

  useEffect(() => {
    if (!policy) return;
    setPreferredEligible(policy.preferredEligible !== false);
    setMarketplaceHold(Boolean(policy.marketplaceHold));
    setReason(policy.reason || "");
    setExpiresAt(toDateTimeLocal(policy.expiresAt));
    setAcceptCapOverride(Boolean(policy.acceptCapOverride));
    setAcceptMaxOrders(
      String(policy.acceptMaxOrders != null ? policy.acceptMaxOrders : 4)
    );
    // Do not depend on acceptCapacity — it polls and must not wipe in-progress edits.
  }, [
    policy?.preferredEligible,
    policy?.marketplaceHold,
    policy?.reason,
    policy?.expiresAt,
    policy?.acceptCapOverride,
    policy?.acceptMaxOrders,
  ]);

  const restricted = !preferredEligible || marketplaceHold;

  const handleSave = async () => {
    if (restricted && !reason.trim()) {
      showError("Add a reason before restricting this shop");
      return;
    }

    const maxOrders = Number(acceptMaxOrders);
    if (acceptCapOverride && (!Number.isInteger(maxOrders) || maxOrders < 0 || maxOrders > 500)) {
      showError("Max orders per slot must be between 0 and 500 (0 = none)");
      return;
    }

    try {
      await updatePolicy({
        shopUserId,
        preferredEligible,
        marketplaceHold,
        reason: restricted ? reason.trim() : null,
        expiresAt: restricted && expiresAt ? new Date(expiresAt).toISOString() : null,
        acceptCapOverride,
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
          <SlotCapacityUsage capacity={acceptCapacity} />

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
              label="Custom slot capacity for this shop"
            />
            <p style={HINT}>
              Override the all-shops setting (Policies → Runtime checks) for
              this shop only. Example: 6 for a big shop, 2 for a small one, or 0
              (this shop skipped; others still get the offer). Leave off to
              inherit the all-shops setting.
            </p>
            {acceptCapOverride ? (
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 320px)",
                  gap: 12,
                }}
              >
                <Field
                  label="Max orders per slot"
                  htmlFor="shop-accept-max"
                  hint="Pickups + deliveries in one slot (e.g. 11:00–12:00). 0 = no marketplace orders."
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
